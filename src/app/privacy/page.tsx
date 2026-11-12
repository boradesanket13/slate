import type {Metadata} from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Slate handles editor data, website captures, hosting logs, and external services.",
  alternates: {canonical: "/privacy"},
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="This page explains what happens to your data when you use Slate. Last updated October 29, 2026."
    >
      <section>
        <h2 className="text-xl font-semibold">Your work in the editor</h2>
        <p className="mt-3 leading-7 text-white/65">
          Code, uploaded images, and editor settings are processed in your browser. Slate saves editor state in your browser&apos;s local storage so you can return to your work. Exports are generated in your browser. Clearing this site&apos;s stored data removes the saved editor state from that browser.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Website screenshot capture</h2>
        <p className="mt-3 leading-7 text-white/65">
          If you choose to capture a website, the URL you enter is sent to Slate&apos;s server, which opens the page in a temporary headless browser, takes a screenshot, and returns it to your browser. Slate does not send the URL to a separate screenshot provider and does not store the URL or the image. To limit abuse, the server temporarily keeps your IP address in memory to count requests, and it may write errors to server logs. The website you capture will see a request coming from Slate&apos;s servers. Do not use this feature with private or sensitive URLs.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Hosting and logs</h2>
        <p className="mt-3 leading-7 text-white/65">
          Slate does not use analytics, advertising or tracking cookies. The site is served by a hosting provider, which may process ordinary request information such as IP addresses to deliver and secure it. The server writes short operational logs (for example, whether a website capture succeeded or was rate limited). These logs contain a one-way hash of your IP address and the hostname of a captured site, not the full URL or the image.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">External services and links</h2>
        <p className="mt-3 leading-7 text-white/65">
          Slate loads its own scripts, fonts, editor and images from the same site. It does not load third-party widgets, badges or analytics. Links to other sites, such as GitHub, are governed by those sites&apos; own policies.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Your choices and questions</h2>
        <p className="mt-3 leading-7 text-white/65">
          You can clear saved work through your browser&apos;s site data settings. For questions about this policy or your data, use the options on the <Link href="/contact" className="text-white underline underline-offset-4">Contact page</Link>. We may update this page when the service changes.
        </p>
      </section>
    </InfoPage>
  );
}
