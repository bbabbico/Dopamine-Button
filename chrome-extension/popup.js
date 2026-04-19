document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('blastBtn');
    const stopBtn = document.getElementById('stopBtn');
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

        if (!bgmAudio) {
            bgmAudio = new Audio(chrome.runtime.getURL('assets/WING.mp3'));
            bgmAudio.loop = true;
        }
        bgmAudio.currentTime = 35;
        bgmAudio.play().catch(e => console.error("Audio playback error:", e));

        document.body.classList.add('blasting');
        statusDisp.textContent = "OVERRIDE IN PROGRESS...";
        statusDisp.style.color = "#ffffff";
        
        chrome.runtime.sendMessage({
            action: 'START_BLAST',
            tabId: currentTabId,
            url: currentUrl
        }, (res) => {
             // We can handle immediate sync response if needed
        });
        
        stopBtn.style.display = 'block';
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'STOP_BLAST' });
        if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
        }
        document.body.classList.remove('blasting');
        stopBtn.style.display = 'none';
        statusDisp.textContent = "OPERATION ABORTED. READY.";
        statusDisp.style.color = "#ff5555";
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'BLAST_UPDATE') {
            statusDisp.textContent = msg.status;
        }
        if (msg.action === 'BLAST_SUCCESS') {
            if (bgmAudio) {
                bgmAudio.pause();
                bgmAudio.currentTime = 0;
            }
            document.body.classList.remove('blasting');
            stopBtn.style.display = 'none';
            statusDisp.textContent = "EXECUTION COMPLETE: " + msg.functionName;
            statusDisp.style.color = "#55ff55";
        }
    });
});
