# Quick Start Guide

## 5-Minute Setup

### Step 1: Install FFmpeg (First time only)

**Windows:**
- Download from: https://ffmpeg.org/download.html
- Extract and add to PATH

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Run the App

```bash
python app.py
```

### Step 4: Open Browser

Navigate to: **http://localhost:5000**

---

## Using the App

1. **Paste YouTube URL** in the input field
2. **Click "Get Info"** to load available qualities
3. **Select your preferred quality**
4. **Click "Start Download"**
5. **Files saved to:** `./downloads/`

---

## Common Commands

| Action | Command |
|--------|---------|
| Start app | `python app.py` |
| Stop app | Press `Ctrl+C` |
| Update yt-dlp | `pip install --upgrade yt-dlp` |
| Clean downloads | `rm -rf downloads/*` (Linux/Mac) or delete the folder (Windows) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Fetch video info (when in URL field) |
| `Ctrl+A` | Select all text |

---

## File Locations

After starting the app:
- **Application runs on:** http://localhost:5000
- **Downloads saved to:** `./downloads/`
- **Main code:** `app.py`
- **Frontend files:** `templates/` and `static/`

---

## Supported Formats

| Type | Supported |
|------|-----------|
| Video URLs | ✅ Yes |
| Playlist URLs | ✅ Yes |
| Channel URLs | ⚠️ Limited |
| Private videos | ❌ No |
| Age-restricted | ⚠️ May not work |

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| "FFmpeg not found" | Reinstall FFmpeg and restart terminal |
| "Port already in use" | Change port in `app.py` line: `port=5000` |
| "No module named Flask" | Run: `pip install -r requirements.txt` |
| Page won't load | Make sure app is running (check terminal) |

---

## Tips

- ✅ Use lower quality for faster downloads
- ✅ Download one at a time for best performance
- ✅ Keep FFmpeg updated: `pip install --upgrade yt-dlp`
- ✅ Clear old downloads to save space
- ✅ Works on mobile and desktop!

---

Need help? Check **README.md** for detailed documentation.

Happy downloading! 🚀
