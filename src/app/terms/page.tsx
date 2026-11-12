import type {Metadata} from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import {GITHUB_REPO_URL} from "@/utils/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Slate's screenshot editor and code snippet generator.",
  alternates: {canonical: "/terms"},
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="These terms describe how you may use Slate. Last updated October 29, 2026."
    >
      <section>
        <h2 className="text-xl font-semibold">Using Slate</h2>
        <p className="mt-3 leading-7 text-white/65">
          Slate provides browser-based tools for creating code images and editing screenshots. You may use the tools and your exports for personal or commercial projects. You are responsible for the code, images, URLs, and other material you provide, and for making sure you have the rights needed to use and share them.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Acceptable use</h2>
        <p className="mt-3 leading-7 text-white/65">
          Do not use Slate to violate laws or others&apos; rights, interfere with the service, or send harmful requests. Only capture websites you are authorized to access. You are responsible for reviewing exports before publishing them, including removing private information you do not intend to share.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Your content and exports</h2>
        <p className="mt-3 leading-7 text-white/65">
          You keep your rights to the material you add to the editor and the images you create, subject to rights in any third-party material you use. Slate does not claim ownership of your uploads or exports. Browser storage is local to your device and may be cleared by your browser, so keep copies of work you need.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Availability and third parties</h2>
        <p className="mt-3 leading-7 text-white/65">
          Features may change or become unavailable. Website capture runs on Slate&apos;s own servers, is rate limited to prevent abuse, and may be unavailable when busy. External links and services have their own terms. Slate is provided as available, without a guarantee that it will be uninterrupted or that an export will meet every use case.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Open-source code and contact</h2>
        <p className="mt-3 leading-7 text-white/65">
          The Slate source code is available under the <a href={`${GITHUB_REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">Apache License 2.0</a>. That license applies to the source code; these terms cover use of the hosted site. For questions, visit the <Link href="/contact" className="text-white underline underline-offset-4">Contact page</Link>. We may update these terms as the service changes.
        </p>
      </section>
    </InfoPage>
  );
}
