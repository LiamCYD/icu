import { GITHUB_REPO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-10">
      <div className="mx-auto flex max-w-[1920px] flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between md:px-20">
        <div className="flex items-center gap-2.5 text-sm text-white/50">
          <img src="/images/ICU logo.svg" alt="ICU" className="h-5 w-7 opacity-50" />
          <span>ICU &mdash; AI Supply Chain Firewall</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/50">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            Open Source
          </a>
          <span className="text-border/50">|</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
