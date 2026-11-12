import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {FaGithub} from "react-icons/fa6";

import {GITHUB_REPO_URL, SITE_NAME} from "@/utils/seo";

export default function Navbar() {
  return (
    <header className="bg-[#0b1220] text-white">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 border-b border-white/10 px-5">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <Image src="/icon.svg" alt="" width={30} height={30} priority />
          {SITE_NAME}
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={`${SITE_NAME} source code on GitHub`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <FaGithub className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          <Link
            href="/editor"
            className="flex items-center gap-1.5 rounded-md bg-teal-300 px-3.5 py-2 font-semibold text-slate-950 hover:bg-teal-200"
          >
            Create <ArrowUpRight size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
