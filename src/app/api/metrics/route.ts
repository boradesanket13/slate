import {timingSafeEqual} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";

import {metricsSnapshot} from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}


export function GET(request: NextRequest) {
  const expected = process.env.METRICS_TOKEN;
  if (!expected) return new NextResponse(null, {status: 404});

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401, headers: {"WWW-Authenticate": "Bearer"}});
  }
  return NextResponse.json(metricsSnapshot(), {headers: {"Cache-Control": "no-store"}});
}
