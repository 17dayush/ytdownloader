// DOM Elements
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const downloadBtn = document.getElementById('downloadBtn');

const loadingSection = document.getElementById('loadingSection');
const typeIndicator = document.getElementById('typeIndicator');
const contentType = document.getElementById('contentType');
const infoSection = document.getElementById('infoSection');
const progressSection = document.getElementById('progressSection');
const successSection = document.getElementById('successSection');

const title = document.getElementById('title');
const thumbnail = document.getElementById('thumbnail');
const infoText = document.getElementById('info-text');
const qualityContainer = document.getElementById('qualityContainer');
const playlistPreview = document.getElementById('playlistPreview');
const videosList = document.getElementById('videosList');
const videoCount = document.getElementById('videoCount');

const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressTitle = document.getElementById('progressTitle');
const downloadedSize = document.getElementById('downloadedSize');
const remainingSize = document.getElementById('remainingSize');
const downloadSpeed = document.getElementById('downloadSpeed');
const downloadEta = document.getElementById('downloadEta');
const statusText = document.getElementById('statusText');
const urlError = document.getElementById('urlError');
const errorDisplay = document.getElementById('errorDisplay');


// State
let currentData = null;
let selectedQuality = 'best';
let pollTimer = null;


// Event Listeners
fetchBtn.addEventListener('click', fetchVideoInfo);

downloadBtn.addEventListener(
    'click',
    startDownload
);

urlInput.addEventListener(
    'keypress',
    (e) => {
        if (e.key === 'Enter') {
            fetchVideoInfo();
        }
    }
);


// ---------------------------------------------------------
// FETCH INFO
// ---------------------------------------------------------

async function fetchVideoInfo() {

    const url = urlInput.value.trim();

    if (!url) {
        showError(
            urlError,
            'Please enter a YouTube URL'
        );
        return;
    }

    fetchBtn.disabled = true;

    hideError(urlError);

    hideAllSections();

    loadingSection.classList.remove(
        'hidden'
    );

    try {

        const response = await fetch(
            '/api/get-info',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    url
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            showError(
                urlError,
                data.error ||
                'Failed to fetch video info'
            );

            return;
        }

        currentData = data;

        displayVideoInfo(data);

    } catch (error) {

        showError(
            urlError,
            'Error: ' + error.message
        );

    } finally {

        fetchBtn.disabled = false;

        loadingSection.classList.add(
            'hidden'
        );
    }
}


// ---------------------------------------------------------
// DISPLAY INFO
// ---------------------------------------------------------

function displayVideoInfo(data) {

    loadingSection.classList.add(
        'hidden'
    );

    const typeText =
        data.type === 'playlist'
            ? '📋 Playlist'
            : '🎬 Video';

    contentType.textContent = typeText;

    typeIndicator.classList.remove(
        'hidden'
    );

    title.textContent =
        data.title || 'Untitled';

    if (data.type === 'playlist') {

        infoText.textContent =
            `${data.count || 0} videos`;

    } else {

        infoText.textContent =
            formatDuration(
                data.duration
            );
    }


    // Thumbnail
    if (data.thumbnail) {

        thumbnail.innerHTML =
            `<img src="${escapeHtml(data.thumbnail)}"
                  alt="Thumbnail">`;

    } else {

        thumbnail.innerHTML = '';
    }


    // Qualities
    displayQualities(
        data.formats || {}
    );


    // Playlist
    if (data.type === 'playlist') {

        displayPlaylistPreview(
            data.videos || []
        );

    } else {

        playlistPreview.classList.add(
            'hidden'
        );
    }


    infoSection.classList.remove(
        'hidden'
    );


    const qualities =
        Object.keys(
            data.formats || {}
        );

    selectedQuality =
        qualities[0] || 'best';

    selectQuality(
        selectedQuality
    );
}


// ---------------------------------------------------------
// QUALITIES
// ---------------------------------------------------------

function displayQualities(formats) {

    qualityContainer.innerHTML = '';

    Object.entries(formats).forEach(
        ([key, format]) => {

            const option =
                document.createElement('div');

            option.className =
                'quality-option';

            option.dataset.quality = key;

            let label = '';
            let info = '';


            if (
                format.label &&
                format.label.includes('p')
            ) {

                label = format.label;

                if (format.fps) {
                    info =
                        `${format.fps}fps`;
                }

            } else if (
                key === 'audio'
            ) {

                label = 'Audio Only';
                info = 'MP3';

            } else {

                label = key;
            }


            if (format.filesize) {

                info +=
                    (info ? ' • ' : '') +
                    formatFileSize(
                        format.filesize
                    );
            }


            option.innerHTML = `
                <div class="quality-label">
                    ${escapeHtml(label)}
                </div>
                ${
                    info
                        ? `<div class="quality-info">
                            ${escapeHtml(info)}
                           </div>`
                        : ''
                }
            `;


            option.addEventListener(
                'click',
                () => selectQuality(key)
            );


            qualityContainer.appendChild(
                option
            );
        }
    );
}


function selectQuality(quality) {

    selectedQuality = quality;

    document
        .querySelectorAll(
            '.quality-option'
        )
        .forEach(
            opt =>
                opt.classList.remove(
                    'selected'
                )
        );

    document
        .querySelector(
            `[data-quality="${CSS.escape(quality)}"]`
        )
        ?.classList.add(
            'selected'
        );
}


// ---------------------------------------------------------
// PLAYLIST PREVIEW
// ---------------------------------------------------------

function displayPlaylistPreview(
    videos
) {

    videoCount.textContent =
        videos.length;

    videosList.innerHTML = '';

    videos.forEach(
        (video, index) => {

            const item =
                document.createElement('div');

            item.className =
                'video-item';

            item.textContent =
                `${index + 1}. ${
                    video.title || 'Unknown'
                } (${
                    formatDuration(
                        video.duration
                    )
                })`;

            videosList.appendChild(
                item
            );
        }
    );

    playlistPreview.classList.remove(
        'hidden'
    );
}


// ---------------------------------------------------------
// START DOWNLOAD
// ---------------------------------------------------------

async function startDownload() {

    if (!currentData) {

        showError(
            errorDisplay,
            'No video selected'
        );

        return;
    }


    downloadBtn.disabled = true;

    hideAllSections();

    resetProgressUI();

    progressSection.classList.remove(
        'hidden'
    );

    hideError(errorDisplay);


    try {

        const response = await fetch(
            '/api/download',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({

                    url:
                        urlInput.value.trim(),

                    quality:
                        selectedQuality,

                    type:
                        currentData.type
                })
            }
        );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.download_id
        ) {

            showError(
                errorDisplay,
                data.error ||
                'Download failed to start'
            );

            progressSection.classList.add(
                'hidden'
            );

            downloadBtn.disabled =
                false;

            return;
        }


        pollProgress(
            data.download_id
        );


    } catch (error) {

        showError(
            errorDisplay,
            'Error: ' + error.message
        );

        progressSection.classList.add(
            'hidden'
        );

        downloadBtn.disabled =
            false;
    }
}


// ---------------------------------------------------------
// POLL PROGRESS
// ---------------------------------------------------------

function pollProgress(
    downloadId
) {

    if (pollTimer) {
        clearInterval(
            pollTimer
        );
    }


    pollTimer = setInterval(
        async () => {

            try {

                const response =
                    await fetch(
                        `/api/progress/${downloadId}`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    clearInterval(
                        pollTimer
                    );

                    showError(
                        errorDisplay,
                        data.error ||
                        'Lost track of download'
                    );

                    progressSection.classList.add(
                        'hidden'
                    );

                    downloadBtn.disabled =
                        false;

                    return;
                }


                updateProgressUI(data);


                if (
                    data.status ===
                    'finished'
                ) {

                    clearInterval(
                        pollTimer
                    );

                    showSuccess(
                        data.title,
                        downloadId,
                        currentData.type
                    );


                } else if (
                    data.status === 'error'
                ) {

                    clearInterval(
                        pollTimer
                    );

                    showError(
                        errorDisplay,
                        data.error ||
                        'Download failed'
                    );

                    progressSection.classList.add(
                        'hidden'
                    );

                    downloadBtn.disabled =
                        false;
                }


            } catch (error) {

                clearInterval(
                    pollTimer
                );

                showError(
                    errorDisplay,
                    'Error: ' +
                    error.message
                );

                progressSection.classList.add(
                    'hidden'
                );

                downloadBtn.disabled =
                    false;
            }

        },
        700
    );
}


// ---------------------------------------------------------
// AUTOMATIC BROWSER DOWNLOAD
// ---------------------------------------------------------

function showSuccess(
    titleText,
    downloadId,
    downloadType
) {

    progressSection.classList.add(
        'hidden'
    );

    successSection.classList.remove(
        'hidden'
    );


    document.getElementById(
        'successMessage'
    ).textContent =
        downloadType === 'playlist'
            ? `Playlist "${titleText}" is ready.`
            : `Successfully downloaded "${titleText}"`;


    document.getElementById(
        'downloadPath'
    ).textContent =
        downloadType === 'playlist'
            ? 'Your browser Downloads folder — playlist ZIP'
            : 'Your browser Downloads folder';


    // Trigger browser download
    const link =
        document.createElement('a');

    link.href =
        `/api/download-file/${downloadId}`;

    link.style.display =
        'none';

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    downloadBtn.disabled =
        false;
}


// ---------------------------------------------------------
// PROGRESS UI
// ---------------------------------------------------------

function resetProgressUI() {

    progressBar.style.width =
        '0%';

    progressPercent.textContent =
        '0%';

    progressTitle.textContent =
        'Downloading…';

    downloadedSize.textContent =
        '0 MB';

    remainingSize.textContent =
        '—';

    downloadSpeed.textContent =
        '—';

    downloadEta.textContent =
        '—';

    statusText.textContent =
        'Starting download…';
}


function updateProgressUI(data) {

    const percent =
        data.percent || 0;

    progressBar.style.width =
        percent + '%';

    progressPercent.textContent =
        Math.round(percent) + '%';


    const downloaded =
        data.downloaded_bytes || 0;

    const total =
        data.total_bytes || 0;

    const remaining =
        total > downloaded
            ? total - downloaded
            : 0;


    downloadedSize.textContent =
        total
            ? `${formatFileSize(downloaded)}
               / ${formatFileSize(total)}`
            : formatFileSize(
                downloaded
            );


    remainingSize.textContent =
        total
            ? formatFileSize(
                remaining
            )
            : '—';


    downloadSpeed.textContent =
        data.speed
            ? formatFileSize(
                data.speed
            ) + '/s'
            : '—';


    downloadEta.textContent =
        data.eta
            ? formatEta(
                data.eta
            )
            : '—';


    if (
        data.status ===
        'starting'
    ) {

        progressTitle.textContent =
            'Starting download…';

        statusText.textContent =
            '⏳ Preparing…';


    } else if (
        data.status ===
        'downloading'
    ) {

        progressTitle.textContent =
            'Downloading…';

        statusText.textContent =
            '⬇️ Downloading' +
            (
                data.filename
                    ? `: ${data.filename}`
                    : ''
            );


    } else if (
        data.status ===
        'processing'
    ) {

        progressTitle.textContent =
            'Processing…';

        statusText.textContent =
            '⚙️ Merging & finalizing…';
    }
}


// ---------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------

function hideAllSections() {

    loadingSection.classList.add(
        'hidden'
    );

    infoSection.classList.add(
        'hidden'
    );

    progressSection.classList.add(
        'hidden'
    );

    successSection.classList.add(
        'hidden'
    );

    typeIndicator.classList.add(
        'hidden'
    );
}


function showError(
    element,
    message
) {

    element.textContent =
        message;

    element.classList.add(
        'show'
    );
}


function hideError(element) {

    element.classList.remove(
        'show'
    );

    element.textContent =
        '';
}


// ---------------------------------------------------------
// FORMATTERS
// ---------------------------------------------------------

function formatDuration(
    seconds
) {

    if (!seconds) {
        return 'Unknown duration';
    }

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;


    if (hours > 0) {

        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${secs}s`;
}


function formatFileSize(
    bytes
) {

    if (!bytes) {
        return '0 MB';
    }

    const units = [
        'B',
        'KB',
        'MB',
        'GB'
    ];

    let size = bytes;

    let unitIndex = 0;


    while (
        size >= 1024 &&
        unitIndex <
            units.length - 1
    ) {

        size /= 1024;
        unitIndex++;
    }


    return (
        size.toFixed(1) +
        ' ' +
        units[unitIndex]
    );
}


function formatEta(
    seconds
) {

    if (!seconds) {
        return '—';
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    const secs =
        Math.round(
            seconds % 60
        );


    if (minutes > 0) {

        return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
}


// Prevent HTML injection in thumbnails/text
function escapeHtml(value) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


// ---------------------------------------------------------
// INITIALIZE
// ---------------------------------------------------------

document.addEventListener(
    'DOMContentLoaded',
    () => {
        console.log(
            'YouTube Downloader Ready!'
        );
    }
);