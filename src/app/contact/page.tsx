import type {Metadata} from "next";
import {ArrowUpRight} from "lucide-react";

import InfoPage from "@/components/InfoPage";
import {
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  SITE_CREATOR,
  SITE_CREATOR_URL,
  SITE_NAME,
} from "@/utils/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: `Report a bug, ask a question, or suggest a feature for ${SITE_NAME}.`,
  alternates: {canonical: "/contact"},
};

const linkClass =
  "inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2.5 text-sm font-medium hover:bg-white/10";

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="Questions, feedback and bug reports are welcome. The best place for all of them is GitHub."
    >
      <section>
        <h2 className="text-xl font-semibold">Bugs and feature requests</h2>
        <p className="mt-3 leading-7 text-white/65">
          Open a GitHub issue describing what happened and, if useful, the steps to reproduce it. Issues are public, so leave out private information.
        </p>
        <a href={`${GITHUB_ISSUES_URL}/new`} target="_blank" rel="noreferrer" className={`mt-5 ${linkClass}`}>
          Open an issue <ArrowUpRight size={16} />
        </a>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Everything else</h2>
        <p className="mt-3 leading-7 text-white/65">
          {SITE_NAME} is built and maintained by {SITE_CREATOR}. You can browse the source code or visit the GitHub profile.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>
            Source code <ArrowUpRight size={16} />
          </a>
          <a href={SITE_CREATOR_URL} target="_blank" rel="noreferrer" className={linkClass}>
            {SITE_CREATOR} on GitHub <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </InfoPage>
  );
}
