"use client";

import Image from "next/image";
import { useState } from "react";
import ExampleButton, { type ExampleId } from "./ExampleButton";
import launchPreview from "../../../public/examples/launch.webp";
import comparisonPreview from "../../../public/examples/comparison.webp";

const examples: { id: ExampleId; title: string; category: string }[] = [
  { id: "launch", title: "Ship it with style.", category: "PRODUCT UPDATE" },
  { id: "code", title: "Give your code a frame.", category: "DEVELOPER POSTS" },
  { id: "comparison", title: "Before and after, side by side.", category: "BEFORE & AFTER" },
];

export default function LiveExamples() {
  const [after, setAfter] = useState(true);
  return <>
    <section id="examples" className="bg-[#111010] px-5 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs text-white/50">START FROM A TEMPLATE</p><h2 className="text-3xl font-medium tracking-normal sm:text-4xl">Pick one, make it yours.</h2></div><p className="max-w-xs text-sm leading-6 text-white/50">Each example opens in the editor, ready to change.</p></div>
        <div className="grid gap-10 md:grid-cols-3">
          {examples.map((example) => <article key={example.id} className="min-w-0">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-white/15 bg-neutral-900">
              {example.id === "comparison" ? (
                <ExampleButton example="comparison" showArrow={false} className="absolute inset-0 w-full overflow-hidden">
                  <Image src={comparisonPreview} alt="Light and dark dashboards on a violet gradient" fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover" />
                </ExampleButton>
              ) : <Image src={example.id === "launch" ? launchPreview : `/examples/${example.id}.webp`} alt={example.title} fill sizes="(max-width: 768px) 100vw, 380px" className="object-contain" />}
            </div>
            <p className="mt-5 text-[10px] text-white/40">{example.category}</p><h3 className="mt-2 text-lg font-medium">{example.title}</h3><ExampleButton example={example.id} className="mt-4 border-b border-white/25 pb-1 text-sm text-white hover:border-white hover:text-white/70" />
          </article>)}
        </div>
      </div>
    </section>
    <section className="border-y border-white/10 bg-[#171817] px-5 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-5xl text-center"><p className="text-xs text-white/50">FROM RAW TO POLISHED</p><h2 className="mt-4 text-3xl font-medium sm:text-4xl">One screenshot, two very different results.</h2>
        <div className="mx-auto mb-7 mt-6 flex w-fit gap-1 rounded-md border border-white/20 p-1">{[false, true].map((value) => <button type="button" key={String(value)} aria-pressed={after === value} onClick={() => setAfter(value)} className={`h-9 w-24 rounded text-sm ${after === value ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>{value ? "After" : "Before"}</button>)}</div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg"><Image src={after ? launchPreview : "/examples/product.webp"} alt={after ? "Dashboard framed on a mesh gradient background" : "Original, unstyled dashboard screenshot"} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" /></div>
        <ExampleButton example="launch" className="mt-7 text-sm text-white hover:text-white/70">Start from this layout</ExampleButton>
      </div>
    </section>
  </>;
}
