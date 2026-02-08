import { Shield } from "lucide-react";
import { GITHUB_REPO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>ICU &mdash; AI Supply Chain Firewall</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Open Source
          </a>
          <span className="text-border">|</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
