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
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

interface ThreatFiltersProps {
  marketplaces: string[];
}

export function ThreatFilters({ marketplaces }: ThreatFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={handleSearch} className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-secondary/50 border-border/50"
        />
      </form>

      <Select
        defaultValue={searchParams.get("risk") || "all"}
        onValueChange={(v) => updateParam("risk", v)}
      >
        <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
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
        <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50">
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
        <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
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
    </div>
  );
}
