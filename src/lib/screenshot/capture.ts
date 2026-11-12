import type {Browser, HTTPRequest} from "puppeteer-core";

import {screenshotConfig} from "./config";
import {startEgressProxy, type EgressProxyOptions} from "./egress-proxy";
import {ScreenshotError} from "./url-guard";

export type CaptureOptions = {
  /** Test seam only. */
  proxy?: EgressProxyOptions;
};

const ALLOWED_REQUEST_SCHEMES = /^(https?|data|blob|about):/i;

async function launchBrowser(proxyPort: number): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const localChrome = process.env.CHROME_EXECUTABLE_PATH;

  const networkLockdown = [
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    // Chromium bypasses proxies for loopback by default; force it through ours.
    "--proxy-bypass-list=<-loopback>",
    // Stop WebRTC from opening UDP sockets that would skip the proxy.
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--disable-background-networking",
    "--hide-scrollbars",
  ];

  if (localChrome) {
    return puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      args: [
        ...networkLockdown,
        ...(process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      ],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: "shell",
    args: [...chromium.args, ...networkLockdown],
  });
}

function toScreenshotError(error: unknown): ScreenshotError {
  if (error instanceof ScreenshotError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  if (name === "TimeoutError" || message.includes("Timeout")) {
    return new ScreenshotError(
      "The website took too long to load. Try again or use another URL.",
      504,
    );
  }
  if (message.includes("ERR_NAME_NOT_RESOLVED")) {
    return new ScreenshotError("That website couldn't be found.", 502);
  }
  if (
    message.includes("ERR_TUNNEL_CONNECTION_FAILED") ||
    message.includes("ERR_PROXY_CONNECTION_FAILED") ||
    message.includes("ERR_CONNECTION_")
  ) {
    return new ScreenshotError(
      "That website couldn't be reached or isn't allowed.",
      502,
    );
  }
  return new ScreenshotError(
    "Could not capture this website. Try another URL.",
    502,
  );
}

/**
 * Captures the top of a public web page as a PNG (desktop viewport, light mode).
 *
 * Isolation layers: forced egress proxy (public IPs only), fresh browser process
 * per capture, request scheme allow-list, dialogs dismissed, media blocked, hard kill timer.
 */
export async function captureWebsite(
  target: URL,
  options: CaptureOptions = {},
): Promise<Buffer> {
  const {navigationTimeoutMs, hardTimeoutMs, maxImageBytes, viewport} =
    screenshotConfig;

  const proxy = await startEgressProxy(options.proxy);
  let browser: Browser | undefined;
  const killTimer = setTimeout(() => {
    browser?.process()?.kill("SIGKILL");
  }, hardTimeoutMs);

  try {
    browser = await launchBrowser(proxy.port);
    // One fresh browser process per capture, so the process is the isolation
    // boundary (and `--single-process`, used on serverless, can't do contexts).
    const page = await browser.newPage();

    await page.setViewport({...viewport, deviceScaleFactor: 1});
    page.setDefaultNavigationTimeout(navigationTimeoutMs);
    page.setDefaultTimeout(navigationTimeoutMs);

    const userAgent = (await browser.userAgent()).replace(
      "HeadlessChrome",
      "Chrome",
    );
    await page.setUserAgent({userAgent});
    await page.emulateMediaFeatures([
      {name: "prefers-color-scheme", value: "light"},
    ]);

    page.on("dialog", (dialog) => {
      dialog.dismiss().catch(() => undefined);
    });

    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) return;
      if (
        request.resourceType() === "media" ||
        !ALLOWED_REQUEST_SCHEMES.test(request.url())
      ) {
        request.abort("blockedbyclient").catch(() => undefined);
        return;
      }
      request.continue().catch(() => undefined);
    });

    const response = await page.goto(target.href, {waitUntil: "domcontentloaded"});
    if (response && response.status() >= 400) {
      throw new ScreenshotError(
        `The website responded with an error (HTTP ${response.status()}).`,
        502,
      );
    }

    // Let late-loading content (images, fonts, hydration) settle, but don't
    // wait forever on pages that keep polling.
    await page
      .waitForNetworkIdle({idleTime: 700, timeout: 6_000})
      .catch(() => undefined);

    const image = Buffer.from(await page.screenshot({type: "png"}));
    if (image.length === 0 || image.length > maxImageBytes) {
      throw new ScreenshotError(
        "The captured image was empty or too large.",
        502,
      );
    }
    return image;
  } catch (error) {
    throw toScreenshotError(error);
  } finally {
    clearTimeout(killTimer);
    if (browser) {
      await browser.close().catch(() => browser?.process()?.kill("SIGKILL"));
    }
    await proxy.close();
  }
}
