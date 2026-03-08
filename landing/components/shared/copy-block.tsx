"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`group relative ${className || ""}`}>
      <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 pr-10 text-xs">
        <code className="text-[#3a8a8c]">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md border border-border bg-[#0d1b20] p-1.5 text-white/40 opacity-0 transition-all hover:text-white group-hover:opacity-100"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[#3a8a8c]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
