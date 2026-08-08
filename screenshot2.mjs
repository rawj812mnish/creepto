import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
// dismiss welcome modal
const gotIt = page.locator("text=Got it");
if (await gotIt.isVisible().catch(() => false)) {
  await gotIt.click();
}
await page.waitForTimeout(2000); // let matrix rain draw
await page.screenshot({ path: "/tmp/screenshot2.png" });
await browser.close();
console.log("done");
