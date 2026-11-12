import type {Metadata} from "next";

/**
 * Site identity. The public URL comes from the environment so the app works on
 * any free hostname (e.g. https://slate-xyz.vercel.app) without code changes.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Slate";
export const SITE_TAGLINE = "Screenshot & code image studio";
export const SITE_CREATOR = "Sanket Borade";
export const SITE_CREATOR_URL = "https://github.com/boradesanket13";
export const GITHUB_REPO_URL = "https://github.com/boradesanket13/slate";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const DEFAULT_OG_IMAGE = "/og.png";
export const SCREENSHOT_OG_IMAGE = "/og.png";
export const OG_IMAGE_SIZE = {width: 1200, height: 630, type: "image/png"} as const;

export const coreKeywords = [
  "code snippet generator",
  "code screenshot generator",
  "code image generator",
  "screenshot editor",
  "screenshot tool",
  "syntax highlighter",
  "code editor online",
  "developer screenshot tool",
  "code beautifier",
  "share code snippets",
  "social media code snippets",
];

export const defaultRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
