import {NextResponse} from "next/server";

import {screenshotConfig} from "@/lib/screenshot/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const startedAt = Date.now();


export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "slate",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      region: process.env.VERCEL_REGION ?? null,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
      capture: {enabled: screenshotConfig.enabled},
    },
    {headers: {"Cache-Control": "no-store"}},
  );
}
