export const GITHUB_REPO = "https://github.com/LiamCYD/icu";

export const RISK_LEVELS = ["critical", "high", "medium", "low", "clean"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "#e05252",
  high: "#5bb8d4",
  medium: "#6b8a7a",
  low: "#6b8a7a",
  clean: "#3a8a8c",
};

export const RISK_BG_CLASSES: Record<RiskLevel, string> = {
  critical: "bg-[#e05252]/10 text-[#e05252] border-[#e05252]/20",
  high: "bg-[#5bb8d4]/10 text-[#5bb8d4] border-[#5bb8d4]/20",
  medium: "bg-[#d4a853]/10 text-[#d4a853] border-[#d4a853]/20",
  low: "bg-[#6b8a7a]/10 text-[#6b8a7a] border-[#6b8a7a]/20",
  clean: "bg-[#3a8a8c]/10 text-[#3a8a8c] border-[#3a8a8c]/20",
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
  prompt_injection: "#3a8a8c",
  data_exfiltration: "#e05252",
  obfuscation: "#d4a853",
  suspicious_commands: "#e08a4a",
  network_suspicious: "#5ba3c9",
};

export const NAV_LINKS = [
  { href: "/cli", label: "CLI" },
  { href: "/threats", label: "Threats" },
  { href: "/authors", label: "Authors" },
  { href: "/trends", label: "Trends" },
  { href: "/marketplaces", label: "Marketplaces" },
  { href: "/about", label: "About" },
  { href: "/api-docs", label: "API" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
