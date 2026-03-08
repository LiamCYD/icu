"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function PackageSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/threats?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-[600px] mt-4">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Check a package — search by name..."
        className="w-full rounded-full border border-white/20 bg-white/5 py-3.5 pl-12 pr-28 text-base text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-[#3a8a8c] focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#3a8a8c] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3a8a8c]/80"
      >
        Search
      </button>
    </form>
  );
}
