
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "preview");
mkdirSync(out, {recursive: true});

chromium.setGraphicsMode = false;
const local = process.env.CHROME_EXECUTABLE_PATH;
const browser = await puppeteer.launch({
  executablePath: local || (await chromium.executablePath()),
  headless: local ? true : "shell",
  args: local ? [] : chromium.args,
});

async function shoot(exampleLabel, waitFor, file) {
  const page = await browser.newPage();
  await page.setViewport({width: 1920, height: 990, deviceScaleFactor: 1});
  await page.goto(BASE, {waitUntil: "networkidle2"});
  await page.click(`button[aria-label="${exampleLabel}"]`);
  await page.waitForFunction(() => location.pathname === "/editor", {timeout: 20000});
  await page.waitForSelector(waitFor, {timeout: 30000});
  if (process.env.PREVIEW_FONT) {
    await page.addStyleTag({
      content: `body *:not(.monaco-editor):not(.monaco-editor *){font-family:${process.env.PREVIEW_FONT} !important}`,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 2500)); // let images/fonts settle
  const buffer = await page.screenshot({type: "webp", quality: 85});
  writeFileSync(join(out, file), buffer);
  console.log(`${file}  ${(buffer.length / 1024).toFixed(0)} KB`);
  await page.close();
}

try {
  await shoot("Open launch example", "main", "editor-screenshot.webp");
  await shoot("Open code example", ".monaco-editor .view-line", "editor-code.webp");
} finally {
  await browser.close();
}
