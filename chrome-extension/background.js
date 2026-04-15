let redirectInterval = null;
let currentLinks = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_BLAST') {
        startBlastFlow(request.tabId, request.url);
        sendResponse({ ok: true });
    }
});

async function startBlastFlow(tabId, initialUrl) {
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
                        } catch(e) { return false; }
                    });
                return [...new Set(links)]; // unique
            }
        });
        
        if (results && results[0] && results[0].result) {
            currentLinks = results[0].result;
        }
    } catch(e) {
        console.error("Failed to extract links:", e);
    }

    if (currentLinks.length === 0) {
        currentLinks = [initialUrl]; 
    }

    // 2. Start the 1-second redirect loop
    redirectInterval = setInterval(() => {
        const randIdx = Math.floor(Math.random() * currentLinks.length);
        const nextUrl = currentLinks[randIdx];
        try {
            chrome.tabs.update(tabId, { url: nextUrl });
        } catch(e) {
            console.error("Tab mapping error", e);
        }
    }, 1000);

    // 3. Send request to backend
    chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'FETCHING PARSER...' });

    try {
        const response = await fetch('http://localhost:3000/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: initialUrl })
        });
        
        const data = await response.json();
        const functions = data.functions || [];

        // 4. Random execution time!
        if (redirectInterval) {
            clearInterval(redirectInterval);
            redirectInterval = null;
        }

        if (functions.length === 0) {
            chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'NO FUNCTIONS FOUND!' });
            return;
        }

        const pickedFx = functions[Math.floor(Math.random() * functions.length)];
        
        chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'INJECTING EXECUTION...' });

        // Execute in MAIN world to bypass CSP & isolated scope
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: "MAIN",
            func: (fx) => {
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

                // Audio Context sound
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    gain.gain.setValueAtTime(1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                } catch(e) {}

                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.2s';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 200);

                    // Execution
                    try {
                        if (fx.type === 'element_click') {
                            const el = document.querySelector(fx.selector.split('#')[0] + (fx.selector.includes('#') ? '#'+fx.selector.split('#')[1].split('.')[0] : ''));
                            if (el) el.click();
                        } else if (fx.type === 'function') {
                            if (typeof window[fx.name] === 'function') {
                                window[fx.name]();
                            } else {
                                eval(fx.name + '()');
                            }
                        }
                    } catch(e) {
                        console.error('Blaster Execution Error:', e);
                    }
                }, 500);
            },
            args: [pickedFx]
        });

        chrome.runtime.sendMessage({ action: 'BLAST_SUCCESS', functionName: pickedFx.name || pickedFx.selector });

        // Send the log to the server
        try {
            await fetch('http://localhost:3000/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ function: pickedFx })
            });
        } catch (logErr) {
            console.error("Failed to log to server:", logErr);
        }

    } catch (e) {        if (redirectInterval) {
            clearInterval(redirectInterval);
        }
        chrome.runtime.sendMessage({ action: 'BLAST_UPDATE', status: 'API ERROR: ' + e.message });
    }
}
