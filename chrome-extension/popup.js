document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('blastBtn');
    const urlDisplay = document.getElementById('urlDisplay');
    const statusDisp = document.getElementById('status');

    let currentTabId = null;
    let currentUrl = null;
    let bgmAudio = null;

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            currentTabId = tabs[0].id;
            currentUrl = tabs[0].url;
            urlDisplay.textContent = currentUrl;
        }
    } catch (e) {
        urlDisplay.textContent = "Error: " + e.message;
    }

    btn.addEventListener('click', () => {
        if (!currentTabId || !currentUrl) return;

        // BGM Playback from 35 seconds (in the popup, as tabs are redirecting and reloading)
        if (!bgmAudio) {
            bgmAudio = new Audio(chrome.runtime.getURL('assets/WING.mp3'));
            bgmAudio.loop = true;
        }
        bgmAudio.currentTime = 35;
        bgmAudio.play().catch(e => console.error("Audio playback error:", e));

        statusDisp.textContent = "BLASTING IN PROGRESS!!!!!!!!!!!!!";
        statusDisp.style.animation = "shake 0.1s infinite";
        
        chrome.runtime.sendMessage({
            action: 'START_BLAST',
            tabId: currentTabId,
            url: currentUrl
        }, (res) => {
             // We can handle immediate sync response if needed
        });
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'BLAST_UPDATE') {
            statusDisp.textContent = msg.status;
        }
        if (msg.action === 'BLAST_SUCCESS') {
            // STOP the BGM on BOOM event
            if (bgmAudio) {
                bgmAudio.pause();
                bgmAudio.currentTime = 0;
            }
            statusDisp.textContent = "BOOOOOOM!!! RAN: " + msg.functionName;
            statusDisp.style.animation = "shake 0.5s infinite";
            statusDisp.style.color = "#00ff00";
        }
    });
});
