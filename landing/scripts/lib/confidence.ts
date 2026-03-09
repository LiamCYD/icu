import type { IcuFinding } from "./types";

interface ConfidenceResult {
  score: number;
  disclaimer: string;
}

const BASE_SCORES: Record<string, number> = {
  pattern_match: 0.7,
  entropy: 0.25,
  deobfuscation: 0.3,
  known_bad_hash: 0.95,
};

/**
 * Noise-heavy rule prefixes that generate high volumes of false positives
 * in legitimate code (base64 assets, minified JS, hashes, etc.).
 * These get low base confidence so they don't inflate package risk levels,
 * but still appear in findings for transparency.
 */
function getBaseScore(ruleId: string): number {
  if (ruleId.startsWith("DO-")) return BASE_SCORES.deobfuscation;
  if (ruleId.startsWith("EN-")) return BASE_SCORES.entropy;
  if (ruleId === "OB-001") return BASE_SCORES.deobfuscation; // base64 strings
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

const CONFIG_FILENAMES = new Set([
  ".gitignore", ".dockerignore", ".npmignore", ".eslintignore",
  "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "tsconfig.json", "jsconfig.json", "pyproject.toml", "setup.cfg",
  "cargo.toml", "cargo.lock", "go.sum", "go.mod",
  "gemfile.lock", "composer.lock", "requirements.txt",
  "pipfile.lock", ".env.example", ".env.sample",
  "makefile", "dockerfile",
]);

function isConfigFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const basename = lower.split("/").pop() ?? lower;
  if (CONFIG_FILENAMES.has(basename)) return true;
  return (
    lower.endsWith(".json") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".toml") ||
    lower.endsWith(".ini") ||
    lower.endsWith(".cfg") ||
    lower.endsWith(".lock") ||
    lower.endsWith(".xml")
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
  if (isConfigFile(filePath)) score -= 0.25;

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
