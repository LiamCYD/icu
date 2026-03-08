"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RISK_LEVELS, CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";

interface ThreatFiltersProps {
  marketplaces: string[];
}

export function ThreatFilters({ marketplaces }: ThreatFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = !!(
    searchParams.get("risk") ||
    searchParams.get("category") ||
    searchParams.get("marketplace")
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/threats?${params.toString()}`);
    },
    [router, searchParams]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", query);
  }

  const filterSelects = (
    <>
      <Select
        defaultValue={searchParams.get("risk") || "all"}
        onValueChange={(v) => updateParam("risk", v)}
      >
        <SelectTrigger className="w-full bg-transparent border-border sm:w-[140px]">
          <SelectValue placeholder="Risk level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All risks</SelectItem>
          {RISK_LEVELS.filter((r) => r !== "clean").map((level) => (
            <SelectItem key={level} value={level} className="capitalize">
              {level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("category") || "all"}
        onValueChange={(v) => updateParam("category", v)}
      >
        <SelectTrigger className="w-full bg-transparent border-border sm:w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {CATEGORY_LABELS[cat as Category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("marketplace") || "all"}
        onValueChange={(v) => updateParam("marketplace", v)}
      >
        <SelectTrigger className="w-full bg-transparent border-border sm:w-[140px]">
          <SelectValue placeholder="Marketplace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {marketplaces.map((mp) => (
            <SelectItem key={mp} value={mp}>
              {mp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Search by name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-transparent border-border"
          />
        </form>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-md border px-3 text-sm transition-colors sm:hidden ${
            hasActiveFilters
              ? "border-[#3a8a8c] text-[#3a8a8c]"
              : "border-border text-white/50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Desktop: always visible */}
      <div className="hidden sm:flex sm:items-center sm:gap-3">
        {filterSelects}
      </div>

      {/* Mobile: collapsible */}
      {filtersOpen && (
        <div className="flex flex-col gap-3 sm:hidden">
          {filterSelects}
        </div>
      )}
    </div>
  );
}
