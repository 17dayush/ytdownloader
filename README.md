# YouTube Video & Playlist Downloader

A modern, responsive web application for downloading YouTube videos and playlists with quality selection. Built with Python Flask and responsive HTML/CSS/JavaScript.

## Features

✨ **Video & Playlist Support**
- Download individual YouTube videos
- Download entire playlists
- View playlist preview before downloading

🎬 **Quality Selection**
- Choose from multiple video qualities (1080p, 720p, 480p, 360p, etc.)
- Audio-only download option (MP3)
- Real-time quality information

📱 **Fully Responsive Design**
- Works seamlessly on desktop, tablet, and mobile devices
- Adaptive layouts for all screen sizes
- Touch-friendly interface

⚡ **User-Friendly Interface**
- Clean and modern UI
- Real-time download progress
- Error handling and validation
- Intuitive workflow

## Requirements

- Python 3.8 or higher
- pip (Python package manager)
- FFmpeg (required by yt-dlp for audio conversion)

## Installation

### 1. Install FFmpeg

**Windows:**
- Download from: https://ffmpeg.org/download.html
- Add to your system PATH

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

**Linux (Fedora):**
```bash
sudo dnf install ffmpeg
```

### 2. Clone or Download the Project

```bash
git clone <repository-url>
cd youtube-downloader
```

Or extract the ZIP file and navigate to the directory.

### 3. Create Virtual Environment (Optional but Recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

## Project Structure

```
youtube-downloader/
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── style.css         # Responsive CSS styling
│   └── script.js         # Frontend JavaScript logic
└── downloads/            # Downloaded files will be saved here
```

## Usage

### Starting the Application

**Windows:**
```bash
python app.py
```

**macOS/Linux:**
```bash
python3 app.py
```

The application will start on `http://localhost:5000`

### How to Use

1. **Open the Application**
   - Open your web browser
   - Navigate to `http://localhost:5000`

2. **Paste YouTube URL**
   - Paste a YouTube video or playlist URL in the input field
   - Supported formats:
     - https://www.youtube.com/watch?v=dQw4w9WgXcQ
     - https://www.youtube.com/playlist?list=PLxxxx

3. **Get Video Info**
   - Click the "Get Info" button
   - The app will fetch available qualities and video information
   - You'll see:
     - Video thumbnail
     - Video title
     - Available quality options
     - For playlists: preview of all videos

4. **Select Quality**
   - Click on your preferred quality option
   - Available options:
     - **1080p (Full HD)** - Best quality
     - **720p (HD)** - Good balance of quality and size
     - **480p (SD)** - Smaller file size
     - **360p (Low)** - Minimal file size
     - **Audio Only** - MP3 audio file

5. **Download**
   - Click "Start Download"
   - Monitor the progress bar
   - Once complete, you'll see a success message with the download location

6. **Access Your Downloads**
   - Videos are saved in the `downloads/` folder
   - For playlists, each video is saved in a dedicated folder

## Configuration

### Change Download Location

Edit `app.py` and modify:
```python
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), 'downloads')
```

### Change Server Port

Edit the last line of `app.py`:
```python
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)  # Change 5000 to your desired port
```

### Increase File Size Limit

Edit `app.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # Increase this value
```

## Troubleshooting

### "FFmpeg not found"
- Ensure FFmpeg is installed and added to your system PATH
- Restart your terminal/command prompt after installation
- Verify installation: `ffmpeg -version`

### "Permission denied" on downloads
- Ensure the `downloads/` folder has write permissions
- Linux/macOS: `chmod 755 downloads/`

### "Module not found" error
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Verify you're using the correct Python version (3.8+)

### Video not downloading
- Check if the URL is correct and publicly available
- YouTube may have changed the video availability
- Try a different video URL
- Check the browser console (F12) for error messages

### Slow downloads
- This depends on your internet connection and YouTube's server speed
- Downloading lower quality will be faster
- Multiple simultaneous downloads may slow down your connection

## Features Explanation

### Quality Selection
- **Video Quality**: The app displays available resolutions based on the video
- **Frame Rate**: Higher quality videos often have 60fps option
- **File Size**: Shows approximate file size for each quality
- **Audio**: Separate audio track option for best quality

### Playlist Support
- Downloads all videos in the playlist
- Creates a folder for each playlist
- Preserves video order and titles
- Shows preview of all videos before downloading

### Responsive Design Breakpoints
- **Desktop**: Full width layout (1000px)
- **Tablet**: Optimized for 768px screens
- **Mobile**: Optimized for 480px screens

## API Endpoints

### GET /
Returns the main HTML interface

### POST /api/get-info
**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response:**
```json
{
  "success": true,
  "type": "video|playlist",
  "title": "Video Title",
  "formats": {
    "1080p": {...},
    "720p": {...}
  }
}
```

### POST /api/download
**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "quality": "1080p",
  "type": "video|playlist"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Download started successfully!",
  "title": "Video Title"
}
```

### GET /api/download-folder
Returns the download folder path

## Performance Tips

1. **Clear Old Downloads**: Regularly clean up the `downloads/` folder to free space
2. **Batch Downloads**: Download one at a time for better performance
3. **Lower Quality**: Use lower quality for faster downloads
4. **Check Connection**: Ensure stable internet connection
5. **FFmpeg**: Update FFmpeg regularly for compatibility

## Security Considerations

- Only download videos/content you have rights to
- Respect copyright and intellectual property
- Use responsibly and legally
- Some content may be restricted by region or copyright

## Known Limitations

- YouTube occasionally changes their API, which may affect functionality
- Some videos may have restrictions or require authentication
- Age-restricted videos cannot be downloaded
- Private/unlisted videos cannot be downloaded
- The `yt-dlp` library may need updates as YouTube updates their systems

## Updates

To update `yt-dlp` (which frequently receives updates for YouTube compatibility):

```bash
pip install --upgrade yt-dlp
```

## License

This project is provided as-is for educational purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify FFmpeg is properly installed
3. Ensure all dependencies are up to date
4. Check browser console for error messages (F12)

## Credits

- Built with Python Flask
- Uses yt-dlp for YouTube downloading
- Responsive design with HTML5/CSS3
- Modern UI with Font Awesome icons

---

**Enjoy downloading!** 🎉

Remember to respect copyright and YouTube's Terms of Service when downloading content.
