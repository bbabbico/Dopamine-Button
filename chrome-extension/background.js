// 배포된 서버 주소로 변경하세요.
// 로컬 테스트 시에는 'http://localhost:3000' 을 유지하세요.
// const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://bbabbico8908-c1ba13qe.apn.leapcell.dev';

let redirectInterval = null;
let currentLinks = [];
let isBlastAborted = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_BLAST') {
        startBlastFlow(request.tabId, request.url);
        sendResponse({ ok: true });
    }
    if (request.action === 'STOP_BLAST') {
        isBlastAborted = true;
        if (redirectInterval) {
            clearInterval(redirectInterval);
            redirectInterval = null;
        }
        sendResponse({ ok: true });
    }
});

async function startBlastFlow(tabId, initialUrl) {
    isBlastAborted = false;
    if (redirectInterval) {
        clearInterval(redirectInterval);
        redirectInterval = null;
    }

    chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'EXTRACTING LINKS...' });

    // 1. Get links from the current tab
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const urlObj = new URL(window.location.href);
                const currentOrigin = urlObj.origin;
                const links = Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => {
                        try {
                            // Only same origin to keep session/context, format valid
                            return href.startsWith('http') && new URL(href).origin === currentOrigin;
                        } catch (e) { return false; }
                    });
                return [...new Set(links)]; // unique
            }
        });

        if (results && results[0] && results[0].result) {
            currentLinks = results[0].result;
        }
    } catch (e) {
        console.error("Failed to extract links:", e);
    }

    if (currentLinks.length === 0) {
        currentLinks = [initialUrl];
    }

    // 2. Start the rapid redirect loop for faster visual chaos
    redirectInterval = setInterval(() => {
        const randIdx = Math.floor(Math.random() * currentLinks.length);
        const nextUrl = currentLinks[randIdx];
        try {
            chrome.tabs.update(tabId, { url: nextUrl });
        } catch (e) {
            console.error("Tab mapping error", e);
        }
    }, 100);

    // 3. Send request to backend
    chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'FETCHING PARSER...' });

    try {
        const blastStartTime = Date.now();
        const response = await fetch(`${SERVER_URL}/api/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: initialUrl })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server status ${response.status}. Response: ${errorText.substring(0, 50)}...`);
        }

        const data = await response.json();
        const functions = data.functions || [];

        // 최소 5초(5000ms) 리디렉션 유지
        const elapsedTime = Date.now() - blastStartTime;
        if (!isBlastAborted && elapsedTime < 7000) {
            const sleepTime = 7000 - elapsedTime;
            const steps = Math.ceil(sleepTime / 100);
            for (let i = 0; i < steps; i++) {
                if (isBlastAborted) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // 4. Stop redirect loop
        if (redirectInterval) {
            clearInterval(redirectInterval);
            redirectInterval = null;
        }

        if (isBlastAborted) {
            // Restore initial page immediately
            chrome.tabs.update(tabId, { url: initialUrl });
            return;
        }

        if (functions.length === 0) {
            chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'NO FUNCTIONS FOUND!' });
            return;
        }

        const pickedFx = functions[Math.floor(Math.random() * functions.length)];

        // 마지막으로 타겟 함수가 존재하는 원래 페이지(initialUrl)로 되돌아가서 로딩 대기
        chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'LOADING FINAL PAGE...' });
        chrome.tabs.update(tabId, { url: initialUrl });

        await new Promise(resolve => {
            const listener = (tId, changeInfo) => {
                if (tId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            // 만약 complete 이벤트가 안 오더라도 3초 뒤엔 강제 진행
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 3000);
        });

        chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'INJECTING EXECUTION...' });

        const tntUrl = chrome.runtime.getURL('assets/tnt.mp3');

        // Execute in MAIN world to bypass CSP & isolated scope
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: "MAIN",
            func: (fx, tntSoundUrl) => {
                // First, visual feedback (BOOM)
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.backgroundColor = 'white';
                overlay.style.zIndex = '2147483647';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                overlay.style.fontSize = '80px';
                overlay.style.fontFamily = 'Impact, sans-serif';
                overlay.style.color = 'red';
                overlay.style.textShadow = '4px 4px 0 black';
                overlay.style.flexDirection = 'column';

                const explosion = document.createElement('div');
                explosion.innerText = '💥 BOOOOOM!!! 💥';
                const fxNameDisplay = document.createElement('div');
                fxNameDisplay.innerText = fx.name || fx.selector;
                fxNameDisplay.style.fontSize = '40px';
                fxNameDisplay.style.color = 'yellow';

                overlay.appendChild(explosion);
                overlay.appendChild(fxNameDisplay);
                document.body.appendChild(overlay);

                // Audio sound
                try {
                    const audio = new Audio(tntSoundUrl);
                    audio.play();
                } catch (e) { }

                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.2s';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 200);

                    // Execution
                    try {
                        if (fx.type === 'element_click') {
                            const el = document.querySelector(fx.selector.split('#')[0] + (fx.selector.includes('#') ? '#' + fx.selector.split('#')[1].split('.')[0] : ''));
                            if (el) el.click();
                        } else if (fx.type === 'function') {
                            if (typeof window[fx.name] === 'function') {
                                window[fx.name]();
                            } else {
                                eval(fx.name + '()');
                            }
                        }
                    } catch (e) {
                        console.error('Blaster Execution Error:', e);
                    }
                }, 500);
            },
            args: [pickedFx, tntUrl]
        });

        chrome.runtime.sendMessage({ action: 'BLAST_SUCCESS', functionName: pickedFx.name || pickedFx.selector });

        // Send the log to the server
        try {
            await fetch(`${SERVER_URL}/api/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ function: pickedFx })
            });
        } catch (logErr) {
            console.error("Failed to log to server:", logErr);
        }

    } catch (e) {
        if (redirectInterval) {
            clearInterval(redirectInterval);
        }
        chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'API ERROR: ' + e.message });
    }
}
