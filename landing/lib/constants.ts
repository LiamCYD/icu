export const GITHUB_REPO = "https://github.com/your-org/i-see-u";

export const RISK_LEVELS = ["critical", "high", "medium", "low", "clean"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  clean: "#22c55e",
};

export const RISK_BG_CLASSES: Record<RiskLevel, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  clean: "bg-green-500/10 text-green-400 border-green-500/20",
};

export const CATEGORIES = [
  "prompt_injection",
  "data_exfiltration",
  "obfuscation",
  "suspicious_commands",
  "network_suspicious",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  prompt_injection: "Prompt Injection",
  data_exfiltration: "Data Exfiltration",
  obfuscation: "Obfuscation",
  suspicious_commands: "Suspicious Commands",
  network_suspicious: "Network Suspicious",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  prompt_injection: "#a855f7",
  data_exfiltration: "#ef4444",
  obfuscation: "#eab308",
  suspicious_commands: "#f97316",
  network_suspicious: "#3b82f6",
};

export const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/threats", label: "Threats" },
  { href: "/authors", label: "Authors" },
  { href: "/trends", label: "Trends" },
  { href: "/marketplaces", label: "Marketplaces" },
  { href: "/about", label: "About" },
  { href: "/api-docs", label: "API" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
