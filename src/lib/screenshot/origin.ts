/**
 * Allows website capture only from this site's own pages. This stops other
 * websites from embedding the endpoint (e.g. as an <img src>) and spending your
 * free-tier quota. It is a guard against casual hotlinking and cross-site
 * requests, not authentication: non-browser clients can forge these headers,
 * which is why rate limits and budgets still apply.
 */
export function isTrustedRequestOrigin(headers: {get(name: string): string | null}) {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  // Older browsers without Fetch Metadata: compare Origin/Referer with Host.
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const source = headers.get("origin") ?? headers.get("referer");
  if (!host || !source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}
