import Link from "next/link";

import {
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  SITE_CREATOR,
  SITE_CREATOR_URL,
  SITE_NAME,
} from "@/utils/seo";

const footerLinks = [
  {label: "Privacy", href: "/privacy"},
  {label: "Terms", href: "/terms"},
  {label: "Contact", href: "/contact"},
  {label: "Source code", href: GITHUB_REPO_URL},
  {label: "Report an issue", href: GITHUB_ISSUES_URL},
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080d18]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-gray-100">{SITE_NAME}</span> © {new Date().getFullYear()}
          </div>
          <nav aria-label="Footer links" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            {footerLinks.map((link) => {
              const isExternal = link.href.startsWith("http");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className="text-gray-300 underline-offset-4 transition hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="text-xs text-gray-400">
            Built by{" "}
            <Link href={SITE_CREATOR_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-gray-200 hover:underline">
              {SITE_CREATOR}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
