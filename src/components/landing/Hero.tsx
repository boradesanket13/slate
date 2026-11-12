"use client";

import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight} from "lucide-react";

import ExampleButton from "./ExampleButton";
import screenshotPreview from "../../../public/preview/editor-screenshot.webp";
import codePreview from "../../../public/preview/editor-code.webp";

export default function Hero() {
  const [previewMode, setPreviewMode] = useState<"screenshot" | "code">("screenshot");

  return (
    <section id="hero" className="relative isolate overflow-hidden bg-[#0b1220] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(45,212,191,0.18),transparent)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-10 text-center">
        <p className="mb-5 text-xs font-medium uppercase tracking-wider text-teal-200/80">
          Free · No account · Runs in your browser
        </p>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Turn code and screenshots<br className="hidden sm:block" /> into images worth sharing.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/65">
          Slate is a free image studio for developers. Style a code snippet or a screen capture, then export it in seconds.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={`/editor?mode=${previewMode}`}
            className="inline-flex h-11 items-center gap-3 rounded-md bg-teal-300 px-5 text-sm font-semibold text-slate-950 hover:bg-teal-200"
          >
            Open the editor <ArrowRight size={17} />
          </Link>
          <ExampleButton example="launch" className="h-11 rounded-md border border-white/20 px-5 text-sm text-white hover:bg-white/10">
            Try an example
          </ExampleButton>
        </div>
        <p className="mt-4 text-xs text-white/45">No sign-up. No watermark. Your work stays in your browser.</p>
      </div>
      <div role="group" aria-label="Editor preview mode" className="mx-auto mt-8 flex w-fit items-center rounded-md border border-white/15 bg-white/5 p-1">
        {(["screenshot", "code"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={previewMode === mode}
            onClick={() => setPreviewMode(mode)}
            className={`h-9 min-w-28 rounded px-4 text-sm font-medium transition-colors ${previewMode === mode ? "bg-teal-300 text-slate-950" : "text-white/60 hover:text-white"}`}
          >
            {mode === "screenshot" ? "Screenshot" : "Code"}
          </button>
        ))}
      </div>
      <div className="relative mx-auto mt-4 aspect-1920/990 w-[calc(100%-40px)] max-w-6xl overflow-hidden rounded-lg border border-white/10 shadow-2xl shadow-black/50">
        <Image
          src={previewMode === "screenshot" ? screenshotPreview : codePreview}
          alt={previewMode === "screenshot" ? "Slate screenshot editor preview" : "Slate code image editor preview"}
          fill
          sizes="(max-width: 1200px) calc(100vw - 40px), 1152px"
          priority
          className="object-contain"
        />
      </div>
    </section>
  );
}
