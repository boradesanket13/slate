import {lookup} from "node:dns/promises";
import {isIP} from "node:net";

import {isPublicIp} from "./ip";

export class ScreenshotError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ScreenshotError";
    this.status = status;
  }
}

export const ALLOWED_PORTS: readonly number[] = [80, 443];
const MAX_URL_LENGTH = 2048;
const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home.arpa",
  ".localdomain",
];

const NOT_ALLOWED = "That address can't be captured.";

export type HostResolver = (hostname: string) => Promise<string[]>;

export const defaultResolver: HostResolver = async (hostname) => {
  const results = await lookup(hostname, {all: true, verbatim: true});
  return results.map((entry) => entry.address);
};

/** Strips IPv6 brackets and any trailing root dot from a URL hostname. */
export function normalizeHostname(hostname: string) {
  const unwrapped =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  return unwrapped.toLowerCase().replace(/\.$/, "");
}

/** Cheap, synchronous checks on the hostname text. */
export function assertAllowedHostname(rawHostname: string) {
  const hostname = normalizeHostname(rawHostname);

  if (!hostname) throw new ScreenshotError(NOT_ALLOWED);
  if (isIP(hostname)) return hostname;

  if (
    hostname === "localhost" ||
    !hostname.includes(".") ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new ScreenshotError(NOT_ALLOWED);
  }
  return hostname;
}

export function assertAllowedPort(port: number) {
  if (!ALLOWED_PORTS.includes(port)) {
    throw new ScreenshotError("Only standard web ports (80 and 443) are supported.");
  }
}

/** Validates user input and returns a normalized http(s) URL. */
export function parseTargetUrl(raw: string | null | undefined): URL {
  if (!raw || raw.length > MAX_URL_LENGTH) {
    throw new ScreenshotError("Enter a valid website URL.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScreenshotError("Enter a valid website URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScreenshotError("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new ScreenshotError("URLs with embedded credentials are not supported.");
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  assertAllowedPort(port);
  assertAllowedHostname(url.hostname);
  url.hash = "";
  return url;
}

/**
 * Resolves a hostname and requires EVERY answer to be public. A single private
 * record is enough to reject, because the attacker controls DNS answers.
 */
export async function resolvePublicAddresses(
  rawHostname: string,
  resolver: HostResolver = defaultResolver,
  isAllowed: (address: string) => boolean = isPublicIp,
): Promise<string[]> {
  const hostname = assertAllowedHostname(rawHostname);

  if (isIP(hostname)) {
    if (!isAllowed(hostname)) throw new ScreenshotError(NOT_ALLOWED);
    return [hostname];
  }

  let addresses: string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new ScreenshotError("That website couldn't be found.", 502);
  }

  if (addresses.length === 0) {
    throw new ScreenshotError("That website couldn't be found.", 502);
  }
  if (!addresses.every((address) => isAllowed(address))) {
    throw new ScreenshotError(NOT_ALLOWED);
  }
  return addresses;
}
