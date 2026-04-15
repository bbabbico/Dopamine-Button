const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/parse', async (req, res) => {
    const targetUrl = req.body.url;
    if (!targetUrl) return res.status(400).json({ error: 'url required' });

    console.log(`Parsing triggered for: ${targetUrl}`);
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for dynamic content
        await page.waitForTimeout(2000);

        const extracted = await page.evaluate(() => {
            const results = [];
            
            // 1. window functions
            try {
                for (let b in window) {
                    try {
                        let prop = window[b];
                        if (typeof prop === 'function') {
                            const str = prop.toString();
                            if (!str.includes('[native code]') && b.length > 2) {
                                results.push({ name: b, type: 'function', source: 'window' });
                            }
                        }
                    } catch(e) {}
                }
            } catch(e) {}
            
            // 2. Extracted elements that might have listeners (generic extraction)
            const interactables = document.querySelectorAll('[onclick], [data-action], button, a');
            Array.from(interactables).slice(0, 15).forEach((el, index) => { // limit to avoid huge payload
                let attr = el.getAttribute('onclick') || el.getAttribute('data-action') || 'unknown';
                let tagInfo = el.tagName.toLowerCase();
                if (el.id) tagInfo += '#' + el.id;
                if (el.className && typeof el.className === 'string') {
                    tagInfo += '.' + el.className.split(' ').join('.');
                }
                results.push({
                    name: 'element action',
                    type: 'element_click',
                    selector: tagInfo,
                    desc: attr
                });
            });
            
            return results;
        });

        res.json({ url: targetUrl, functions: extracted.slice(0, 50) });

    } catch (error) {
         console.error('Playwright error:', error);
         res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.post('/api/log', (req, res) => {
    const executedFx = req.body.function;
    if (executedFx) {
        console.log('\n================================');
        console.log(' [💥 EVENT BLASTED 💥]');
        console.log(` Type: ${executedFx.type}`);
        console.log(` Target: ${executedFx.name || executedFx.selector}`);
        if (executedFx.desc && executedFx.desc !== 'unknown') {
            console.log(` Info: ${executedFx.desc}`);
        }
        console.log('================================\n');
    }
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('Backend listening on port 3000');
});
