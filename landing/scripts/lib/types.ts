/** ICU scanner JSON output types */
export interface IcuFileResult {
  file: string;
  risk_level: string;
  findings: IcuFinding[];
}

export interface IcuFinding {
  rule_id: string;
  severity: string;
  description: string;
  line: number;
  matched_text: string;
  context: string;
}

export interface IcuScanSummary {
  total_files: number;
  risk_level: string;
  scan_duration: number;
}

export interface IcuScanOutput {
  summary: IcuScanSummary;
  results: IcuFileResult[];
}

/** Scraper internal types */
export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  sourceUrl?: string;
  authorName?: string;
  authorSlug?: string;
  authorProfileUrl?: string;
}

export interface DownloadResult {
  packageInfo: PackageInfo;
  extractedPath: string;
}

export interface ScrapeResult {
  packageName: string;
  status: "scanned" | "skipped" | "failed";
  findingsCount?: number;
  error?: string;
}

export interface MarketplaceDef {
  name: string;
  url: string;
  description: string;
}

export type MarketplaceName = "npm" | "PyPI" | "Smithery" | "Glama" | "MCP Registry" | "SkillsMP" | "PulseMCP";
