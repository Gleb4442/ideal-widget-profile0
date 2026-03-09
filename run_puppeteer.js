const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        page.on('requestfailed', request =>
          console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
        );

        await page.goto('http://localhost:8081/index.html', { waitUntil: 'networkidle0' });
        console.log("Page loaded. Clicking chat widget button to check for logic errors...");
        await page.click('#chat-widget-button');
        await new Promise(r => setTimeout(r, 500));
        console.log("Evaluation complete");
    } catch (e) {
        console.log("Puppeteer Error:", e.message);
    } finally {
        if (browser) await browser.close();
    }
})();
