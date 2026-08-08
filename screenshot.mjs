import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // let matrix rain draw a bit
await page.screenshot({ path: "/tmp/screenshot.png" });
await browser.close();
console.log("done");
