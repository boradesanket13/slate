import {Metadata} from "next";
import {
  DEFAULT_OG_IMAGE,
  OG_IMAGE_SIZE,
  SCREENSHOT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  coreKeywords,
  defaultRobots,
} from "@/utils/seo";

export function generateEditorMetadata(): Metadata {
  return {
    title: "Code Snippet Generator, Keyboard for Code & Screenshot Editor",
    description:
      "Use Slate's free editor to generate code snippet images, create syntax-highlighted code images, and polish screenshots with gradients, frames, shadows, and export controls.",
    keywords: [
      ...coreKeywords,
      "code snippet editor",
      "code editor",
      "screenshot generator",
      "online screenshot editor",
      "code visualization",
    ],
    alternates: {
      canonical: "/editor",
    },
    openGraph: {
      type: "website",
      title: `Code Snippet Generator & Screenshot Editor - ${SITE_NAME}`,
      description:
        "Create polished code snippet images and screenshots with syntax highlighting, themes, background gradients, frame controls, and one-click exports.",
      url: absoluteUrl("/editor"),
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          ...OG_IMAGE_SIZE,
          alt: "Slate code snippet generator editor preview",
        },
        {
          url: absoluteUrl(SCREENSHOT_OG_IMAGE),
          ...OG_IMAGE_SIZE,
          alt: "Slate screenshot editor preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Code Snippet Generator & Screenshot Editor - Slate",
      description:
        "Generate shareable code screenshots and edit screenshots with Slate's free online editor.",
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: defaultRobots,
  };
}
