const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf-8");

const dom = new JSDOM(html, {
    url: "http://localhost:8081/",
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
});

dom.window.console.error = console.error;
dom.window.console.log = console.log;
dom.window.console.warn = console.warn;

dom.window.addEventListener("error", (event) => {
    console.error("JSDOM Page Error:", event.error ? event.error : event.message);
});

dom.window.addEventListener("unhandledrejection", (event) => {
    console.error("JSDOM Unhandled Rejection:", event.reason);
});

setTimeout(() => {
    console.log("JSDOM finished waiting.");
    process.exit();
}, 2000);
