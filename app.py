import os
import uuid
import threading
import tempfile
import shutil
import zipfile
from flask import Flask, render_template, request, jsonify, send_file, after_this_request
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

# Temporary download root.
# Render Free storage is temporary, so we clean files after delivery.
DOWNLOAD_ROOT = os.path.join(tempfile.gettempdir(), "ytdownloader")
os.makedirs(DOWNLOAD_ROOT, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024 * 1024

# {download_id: {...}}
downloads = {}
downloads_lock = threading.Lock()


# ---------------------------------------------------------
# HOME
# ---------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------
# GET VIDEO / PLAYLIST INFO
# ---------------------------------------------------------

@app.route("/api/get-info", methods=["POST"])
def get_info():
    try:
        data = request.get_json(silent=True) or {}
        url = (data.get("url") or "").strip()

        if not url:
            return jsonify({"error": "No URL provided"}), 400

        ydl_opts = {
    "quiet": False,
    "no_warnings": False,
    "noplaylist": False,
}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        is_playlist = "entries" in info

        if is_playlist:
            videos = []

            for v in info.get("entries", []) or []:
                if not v:
                    continue

                videos.append({
                    "id": v.get("id"),
                    "title": v.get("title", "Unknown"),
                    "duration": v.get("duration", 0),
                    "thumbnail": v.get("thumbnail"),
                    "formats": extract_formats(v),
                })

            return jsonify({
                "success": True,
                "type": "playlist",
                "title": info.get("title", "Playlist"),
                "count": len(videos),
                "videos": videos,
                "formats": extract_playlist_formats(videos),
            })

        return jsonify({
            "success": True,
            "type": "video",
            "id": info.get("id"),
            "title": info.get("title"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail"),
            "formats": extract_formats(info),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------
# START DOWNLOAD
# ---------------------------------------------------------

@app.route("/api/download", methods=["POST"])
def download():
    try:
        data = request.get_json(silent=True) or {}

        url = (data.get("url") or "").strip()
        quality = data.get("quality", "best")
        download_type = data.get("type", "video")

        if not url:
            return jsonify({"error": "No URL provided"}), 400

        download_id = str(uuid.uuid4())

        job_dir = os.path.join(DOWNLOAD_ROOT, download_id)
        os.makedirs(job_dir, exist_ok=True)

        with downloads_lock:
            downloads[download_id] = {
                "status": "starting",
                "percent": 0,
                "downloaded_bytes": 0,
                "total_bytes": 0,
                "speed": 0,
                "eta": 0,
                "title": "",
                "file_path": None,
                "download_type": download_type,
            }

        thread = threading.Thread(
            target=run_download,
            args=(download_id, url, quality, download_type, job_dir),
            daemon=True,
        )

        thread.start()

        return jsonify({
            "success": True,
            "download_id": download_id
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------------
# PROGRESS
# ---------------------------------------------------------

@app.route("/api/progress/<download_id>", methods=["GET"])
def get_progress(download_id):
    with downloads_lock:
        entry = downloads.get(download_id)

    if not entry:
        return jsonify({
            "status": "unknown",
            "error": "Unknown download id"
        }), 404

    # Don't expose internal server paths to the browser.
    response = dict(entry)
    response.pop("file_path", None)

    return jsonify(response)


# ---------------------------------------------------------
# DOWNLOAD COMPLETED FILE
# ---------------------------------------------------------

@app.route("/api/download-file/<download_id>", methods=["GET"])
def download_file(download_id):

    with downloads_lock:
        entry = downloads.get(download_id)

    if not entry:
        return jsonify({"error": "Download not found"}), 404

    if entry.get("status") != "finished":
        return jsonify({"error": "Download is not finished yet"}), 409

    file_path = entry.get("file_path")

    if not file_path or not os.path.isfile(file_path):
        return jsonify({
            "error": "Downloaded file is no longer available"
        }), 404

    filename = entry.get("filename") or os.path.basename(file_path)

    @after_this_request
    def cleanup(response):
        # Cleanup temporary download directory after the response.
        try:
            job_dir = os.path.join(DOWNLOAD_ROOT, download_id)

            if os.path.exists(job_dir):
                shutil.rmtree(job_dir, ignore_errors=True)

        except Exception:
            pass

        with downloads_lock:
            downloads.pop(download_id, None)

        return response

    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        conditional=True,
    )


# ---------------------------------------------------------
# BACKGROUND DOWNLOAD
# ---------------------------------------------------------

def run_download(download_id, url, quality, download_type, job_dir):

    try:
        format_string = get_format_string(quality)

        if download_type == "playlist":

            outtmpl = os.path.join(
                job_dir,
                "%(playlist_index)03d - %(title)s.%(ext)s"
            )

        else:

            outtmpl = os.path.join(
                job_dir,
                "%(title)s.%(ext)s"
            )

        ydl_opts = {
            "format": format_string,
    "outtmpl": outtmpl,

    "quiet": False,
    "no_warnings": False,

            "progress_hooks": [
                make_progress_hook(download_id)
            ],

            # Helps prevent partially completed files being
            # mistaken for finished files.
            "continuedl": True,
        }

        # Convert audio to MP3.
        if quality == "audio":
            ydl_opts["postprocessors"] = [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        # -------------------------------------------------
        # Find completed files
        # -------------------------------------------------

        files = find_media_files(job_dir)

        if not files:
            raise RuntimeError(
                "Download finished but no media file was found."
            )

        title = info.get("title", "Download")

        # -------------------------------------------------
        # PLAYLIST → ZIP
        # -------------------------------------------------

        if download_type == "playlist":

            zip_name = safe_filename(title) + ".zip"
            zip_path = os.path.join(job_dir, zip_name)

            with zipfile.ZipFile(
                zip_path,
                "w",
                compression=zipfile.ZIP_DEFLATED
            ) as zip_file:

                for file_path in files:

                    if os.path.abspath(file_path) == os.path.abspath(zip_path):
                        continue

                    arcname = os.path.basename(file_path)

                    zip_file.write(
                        file_path,
                        arcname=arcname
                    )

            final_path = zip_path

        # -------------------------------------------------
        # SINGLE VIDEO / AUDIO
        # -------------------------------------------------

        else:

            # Usually only one media file exists.
            final_path = files[0]

        filename = os.path.basename(final_path)

        with downloads_lock:
            downloads[download_id].update({
                "status": "finished",
                "percent": 100,
                "title": title,
                "file_path": final_path,
                "filename": filename,
            })

    except Exception as e:

        with downloads_lock:
            downloads[download_id] = {
                "status": "error",
                "error": str(e),
            }

        # Clean failed job
        try:
            if os.path.exists(job_dir):
                shutil.rmtree(job_dir, ignore_errors=True)
        except Exception:
            pass


# ---------------------------------------------------------
# PROGRESS HOOK
# ---------------------------------------------------------

def make_progress_hook(download_id):

    def hook(d):

        with downloads_lock:

            entry = downloads.setdefault(
                download_id,
                {}
            )

            if d["status"] == "downloading":

                downloaded = d.get(
                    "downloaded_bytes",
                    0
                ) or 0

                total = (
                    d.get("total_bytes")
                    or d.get("total_bytes_estimate")
                    or 0
                )

                percent = (
                    round(
                        (downloaded / total) * 100,
                        1
                    )
                    if total
                    else 0
                )

                entry.update({
                    "status": "downloading",
                    "downloaded_bytes": downloaded,
                    "total_bytes": total,
                    "percent": percent,
                    "speed": d.get("speed") or 0,
                    "eta": d.get("eta") or 0,
                    "filename": os.path.basename(
                        d.get("filename", "") or ""
                    ),
                })

            elif d["status"] == "finished":

                entry.update({
                    "status": "processing",
                    "percent": 100,
                })

    return hook


# ---------------------------------------------------------
# FORMAT EXTRACTION
# ---------------------------------------------------------

def extract_formats(info):

    formats = {}

    try:

        all_formats = info.get(
            "formats",
            []
        ) or []

        audio_candidates = [
            f
            for f in all_formats
            if f.get("vcodec") == "none"
            and f.get("acodec") != "none"
        ]

        best_audio = None

        if audio_candidates:
            best_audio = max(
                audio_candidates,
                key=lambda f: (
                    f.get("abr") or 0
                )
            )

        audio_size = 0

        if best_audio:
            audio_size = (
                best_audio.get("filesize")
                or best_audio.get("filesize_approx")
                or 0
            )

        for fmt in all_formats:

            if (
                fmt.get("height")
                and fmt.get("ext") == "mp4"
            ):

                height = fmt.get("height")

                quality_label = f"{height}p"

                video_size = (
                    fmt.get("filesize")
                    or fmt.get("filesize_approx")
                    or 0
                )

                total_size = (
                    video_size + audio_size
                    if (
                        video_size
                        and fmt.get("acodec") == "none"
                    )
                    else video_size
                )

                existing = formats.get(
                    quality_label
                )

                if (
                    not existing
                    or (
                        total_size
                        and total_size >
                        existing.get(
                            "filesize",
                            0
                        )
                    )
                ):

                    formats[quality_label] = {
                        "label": quality_label,
                        "height": height,
                        "fps": fmt.get("fps", 30),
                        "format_id": fmt.get("format_id"),
                        "filesize": total_size,
                    }

        sorted_formats = dict(
            sorted(
                formats.items(),
                key=lambda x: x[1]["height"],
                reverse=True
            )
        )

        if not sorted_formats:
            sorted_formats = get_default_formats()

        if best_audio:

            sorted_formats["audio"] = {
                "label": "Audio Only",
                "height": 0,
                "fps": None,
                "format_id": best_audio.get(
                    "format_id"
                ),
                "filesize": audio_size,
            }

        return sorted_formats

    except Exception:
        return get_default_formats()


def extract_playlist_formats(videos):

    # Use the first available video's qualities.
    for video in videos:

        formats = video.get("formats")

        if formats:
            return formats

    return get_default_formats()


# ---------------------------------------------------------
# DEFAULT FORMATS
# ---------------------------------------------------------

def get_default_formats():

    return {
        "1080p": {
            "label": "1080p (Full HD)",
            "value": "1080p",
            "filesize": 0,
        },
        "720p": {
            "label": "720p (HD)",
            "value": "720p",
            "filesize": 0,
        },
        "480p": {
            "label": "480p (SD)",
            "value": "480p",
            "filesize": 0,
        },
        "360p": {
            "label": "360p (Low)",
            "value": "360p",
            "filesize": 0,
        },
        "audio": {
            "label": "Audio Only",
            "value": "audio",
            "filesize": 0,
        },
    }


# ---------------------------------------------------------
# QUALITY → YT-DLP FORMAT
# ---------------------------------------------------------

def get_format_string(quality):

    quality_map = {

        "best":
            "best[ext=mp4]/best",

        "1080p":
            "bestvideo[height<=1080][ext=mp4]"
            "+bestaudio[ext=m4a]"
            "/best[ext=mp4]",

        "720p":
            "bestvideo[height<=720][ext=mp4]"
            "+bestaudio[ext=m4a]"
            "/best[ext=mp4]",

        "480p":
            "bestvideo[height<=480][ext=mp4]"
            "+bestaudio[ext=m4a]"
            "/best[ext=mp4]",

        "360p":
            "bestvideo[height<=360][ext=mp4]"
            "+bestaudio[ext=m4a]"
            "/best[ext=mp4]",

        "audio":
            "bestaudio/best",
    }

    return quality_map.get(
        quality,
        "best[ext=mp4]/best"
    )


# ---------------------------------------------------------
# FIND MEDIA FILES
# ---------------------------------------------------------

def find_media_files(directory):

    media_extensions = {
        ".mp4",
        ".mkv",
        ".webm",
        ".m4a",
        ".mp3",
        ".aac",
        ".opus",
        ".flac",
        ".mov",
    }

    result = []

    for root, _, files in os.walk(directory):

        for filename in files:

            if filename.endswith(
                (".part", ".ytdl", ".temp")
            ):
                continue

            path = os.path.join(
                root,
                filename
            )

            ext = os.path.splitext(
                filename
            )[1].lower()

            if ext in media_extensions:
                result.append(path)

    return sorted(result)


# ---------------------------------------------------------
# SAFE FILENAMES
# ---------------------------------------------------------

def safe_filename(name):

    invalid = '<>:"/\\|?*'

    result = "".join(
        "_" if c in invalid else c
        for c in (name or "download")
    )

    result = result.strip()

    return result[:180] or "download"


# ---------------------------------------------------------
# ERROR HANDLERS
# ---------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not found"
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        "error": "Server error"
    }), 500


# ---------------------------------------------------------
# LOCAL DEVELOPMENT
# ---------------------------------------------------------

if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=9000
    )