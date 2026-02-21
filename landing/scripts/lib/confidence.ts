import type { IcuFinding } from "./types";

interface ConfidenceResult {
  score: number;
  disclaimer: string;
}

const BASE_SCORES: Record<string, number> = {
  pattern_match: 0.7,
  entropy: 0.4,
  deobfuscation: 0.6,
  known_bad_hash: 0.95,
};

function getBaseScore(ruleId: string): number {
  if (ruleId.startsWith("OB-")) return BASE_SCORES.deobfuscation;
  return BASE_SCORES.pattern_match;
}

function isTestFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes("test") ||
    lower.includes("spec") ||
    lower.includes("__tests__") ||
    lower.includes("__mocks__")
  );
}

function isDocsFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".rst") ||
    lower.endsWith(".txt") ||
    lower.includes("/docs/") ||
    lower.includes("/doc/")
  );
}

export function scoreConfidence(
  finding: IcuFinding,
  filePath: string,
  allFindings: IcuFinding[],
): ConfidenceResult {
  let score = getBaseScore(finding.rule_id);

  // Severity modifier
  if (finding.severity === "critical") score += 0.1;

  // File-type modifiers
  if (isTestFile(filePath)) score -= 0.3;
  if (isDocsFile(filePath)) score -= 0.2;

  // Comment context modifier
  if (finding.context && /^\s*(\/\/|#|\/\*|\*|<!--)/.test(finding.context)) {
    score -= 0.1;
  }

  // Corroborating findings modifier
  const corroborating = allFindings.filter(
    (f) => f.rule_id !== finding.rule_id && f.line !== finding.line,
  );
  if (corroborating.length > 0) score += 0.1;

  score = Math.max(0, Math.min(1, score));

  const tier = confidenceTier(score);
  const disclaimer =
    `Detected by automated pattern matching (rule ${finding.rule_id}) ` +
    `with ${tier.toLowerCase()} confidence. May be a false positive.`;

  return { score: Math.round(score * 100) / 100, disclaimer };
}

export function confidenceTier(score: number): string {
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  if (score >= 0.2) return "Low";
  return "Informational";
}
