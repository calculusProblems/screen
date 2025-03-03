const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");
const puppeteer = require("puppeteer");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));

let browser, page;
const serverWidth = 1920, serverHeight = 1080;

(async () => {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();
    await page.setViewport({ width: serverWidth, height: serverHeight });
    await page.goto("https://google.com");
})();

async function sendScreenshot(ws) {
    const screenshotBuffer = await page.screenshot({ quality: 50, type: "jpeg" });
    ws.send(screenshotBuffer);
}

wss.on("connection", async (ws) => {
    console.log("Client connected");
    sendScreenshot(ws);

    ws.on("message", async (message) => {
        const data = JSON.parse(message);
        console.log("Received:", data);

        try {
            if (data.type === "mousemove") {
                await page.mouse.move(data.x, data.y, { steps: 5 });
            } else if (data.type === "click") {
                await page.mouse.click(data.x, data.y, { delay: Math.random() * 50 });
            } else if (data.type === "type") {
                await page.keyboard.type(data.text); // Handles @, !, $, etc.
            } else if (data.type === "key") {
                await page.keyboard.press(data.code);
            } else if (data.type === "scroll") {
                await page.evaluate((deltaY) => window.scrollBy(0, deltaY), data.deltaY);
            } else if (data.type === "navigate") {
                await page.goto(data.url);
            }
            sendScreenshot(ws);
        } catch (e) {
            console.error("Error processing event:", message, e);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
