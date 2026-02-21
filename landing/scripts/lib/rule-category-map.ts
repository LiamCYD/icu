const RULE_PREFIX_TO_CATEGORY: Record<string, string> = {
  "PI-": "prompt_injection",
  "DE-": "data_exfiltration",
  "OB-": "obfuscation",
  "SC-": "suspicious_commands",
  "NS-": "network_suspicious",
};

export function categoryFromRuleId(ruleId: string): string {
  for (const [prefix, category] of Object.entries(RULE_PREFIX_TO_CATEGORY)) {
    if (ruleId.startsWith(prefix)) return category;
  }
  return "unknown";
}

const SEVERITY_MAP: Record<string, string> = {
  critical: "critical",
  danger: "high",
  warning: "medium",
  info: "low",
};

export function normalizeSeverity(scannerSeverity: string): string {
  return SEVERITY_MAP[scannerSeverity.toLowerCase()] ?? "low";
}

const RISK_ORDER = ["clean", "low", "medium", "high", "critical"];

export function worstRisk(levels: string[]): string {
  let worst = 0;
  for (const level of levels) {
    const idx = RISK_ORDER.indexOf(level);
    if (idx > worst) worst = idx;
  }
  return RISK_ORDER[worst];
}
