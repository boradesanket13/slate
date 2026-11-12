import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import Navbar from "@/components/landing/Navbar";
import LandingFooter from "@/components/landing/Footer";

import LiveExamples from "@/components/landing/LiveExamples";
import {
  DEFAULT_OG_IMAGE,
  GITHUB_REPO_URL,
  OG_IMAGE_SIZE,
  SITE_CREATOR,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  coreKeywords,
} from "@/utils/seo";

export const metadata: Metadata = {
  title: {absolute: "Slate: screenshot & code image studio"},
  description:
    "Slate is a free, browser-based studio for turning code snippets and screenshots into clean images you can share.",
  keywords: coreKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Slate - Free Code Snippet Generator & Screenshot Editor",
    description:
      "Slate is a free, browser-based studio for turning code snippets and screenshots into clean images you can share.",
    url: SITE_URL,
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        ...OG_IMAGE_SIZE,
        alt: "Slate - Free Code Snippet Generator & Screenshot Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slate - Free Code Snippet Generator & Screenshot Editor",
    description:
      "Slate is a free, browser-based studio for turning code snippets and screenshots into clean images you can share.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  image: absoluteUrl(DEFAULT_OG_IMAGE),
  author: {
    "@type": "Person",
    name: SITE_CREATOR,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Code snippet generator",
    "Multi-screenshot canvas with markup tools",
    "Screenshot editor with frames and shadows",
    "Syntax highlighting for 17 languages",
    "Theme, gradient, layout, and export controls",
  ],
  sameAs: [GITHUB_REPO_URL],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Slate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Slate is a free online code snippet generator and screenshot editor for creating shareable developer visuals.",
      },
    },
    {
      "@type": "Question",
      name: "Can I generate code screenshots with syntax highlighting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Slate supports syntax-highlighted code snippets with themes, backgrounds, window styles, and export controls.",
      },
    },
    {
      "@type": "Question",
      name: "Can I edit screenshots in Slate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The screenshot editor lets you upload or capture screenshots, apply gradients, frames, shadows, blur, aspect ratios, and export polished images.",
      },
    },
  ],
};

function SeoFeatureSection() {
  const features = [
    {
      title: "Let your code take the stage.",
      description:
        "Paste code, pick a language and theme, and export a clean image for docs, blog posts, READMEs and social posts.",
    },
    {
      title: "Combine several screenshots.",
      description:
        "Arrange several screenshots on one background and give each its own position, frame and shadow.",
    },
    {
      title: "Call out what matters.",
      description:
        "Crop out the noise, add arrows, highlights, numbered steps and text, or redact anything private before you share.",
    },
  ];
  const faqs = [
    {
      question: "What is Slate?",
      answer:
        "Slate is a free, browser-based studio for turning code snippets and screenshots into clean images you can share.",
    },
    {
      question: "Can I generate code screenshots with syntax highlighting?",
      answer:
        "Yes. Slate supports syntax-highlighted code snippets with themes, backgrounds, window styles, and export controls.",
    },
    {
      question: "Can I edit screenshots in Slate?",
      answer:
        "Yes. The screenshot editor lets you upload or capture screenshots, apply gradients, frames, shadows, blur, aspect ratios, and export polished images.",
    },
  ];

  return (
    <section className="bg-[#111010] py-14 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10">
          <div>
            <p className="text-xs font-semibold uppercase text-white/60">
              WHAT YOU CAN DO
            </p>
            <h2 className="mt-3 text-3xl font-medium text-white sm:text-4xl">
              Everything you need to finish the picture.
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="border-t border-white/15 pt-5"
              >
                <h3 className="text-lg font-medium text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-3">
          {faqs.map((faq) => (
            <article key={faq.question}>
              <h3 className="text-base font-medium text-white">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#111010]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([softwareSchema, faqSchema]),
        }}
      />
      <Navbar />
      <main className="flex min-h-screen flex-col pb-0">
        <Hero />
        <LiveExamples />
        <SeoFeatureSection />
        <LandingFooter />
      </main>
    </div>
  );
}
