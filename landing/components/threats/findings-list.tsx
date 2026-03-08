import { RiskBadge } from "@/components/shared/risk-badge";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  CONFIDENCE_TIER_CLASSES,
  CONFIDENCE_TIER_LABELS,
  GITHUB_REPO,
  getConfidenceTier,
  type Category,
} from "@/lib/constants";
import { Flag } from "lucide-react";

/** Short human-readable explainer for each rule prefix. */
const RULE_EXPLAINERS: Record<string, string> = {
  "PI-": "This rule detects text that attempts to override or hijack AI system instructions.",
  "DE-": "This rule detects code that accesses sensitive files or credentials, which could be used to steal secrets.",
  "OB-": "This rule detects obfuscated or encoded content that may be hiding malicious payloads.",
  "SC-": "This rule detects dynamic code execution patterns (eval, exec, subprocess) that can run arbitrary commands.",
  "NS-": "This rule detects network calls that could be used to phone home or exfiltrate data.",
  "DO-": "This rule found suspicious content hidden inside encoded data (base64, hex, etc.).",
  "EN-": "This rule detected a high-entropy string that may be an encoded payload or hardcoded secret.",
  "DB-": "This file matches a known malicious signature in the threat database.",
};

function getRuleExplainer(ruleId: string): string | null {
  for (const [prefix, explainer] of Object.entries(RULE_EXPLAINERS)) {
    if (ruleId.startsWith(prefix)) return explainer;
  }
  return null;
}

function falsePositiveUrl(finding: Finding): string {
  const title = encodeURIComponent(
    `[False Positive] ${finding.ruleId} in ${finding.filePath}`,
  );
  const body = encodeURIComponent(
    `**Finding ID:** ${finding.id}\n` +
    `**Rule:** ${finding.ruleId}\n` +
    `**File:** ${finding.filePath}:${finding.lineNumber}\n` +
    `**Severity:** ${finding.severity}\n` +
    `**Description:** ${finding.description}\n\n` +
    `**Why this is a false positive:**\n\n<!-- Please explain why this finding is incorrect -->`,
  );
  return `${GITHUB_REPO}/issues/new?labels=false-positive&title=${title}&body=${body}`;
}

interface Finding {
  id: string;
  ruleId: string;
  category: string;
  severity: string;
  description: string;
  filePath: string;
  lineNumber: number;
  matchedText: string;
  context: string;
  confidence: number | null;
  disclaimer: string | null;
}

interface FindingsListProps {
  findings: Finding[];
}

export function FindingsList({ findings }: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="py-8 text-center text-white/50">
        No findings detected — this package appears clean.
      </div>
    );
  }

  // Group by file
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const existing = byFile.get(f.filePath) || [];
    existing.push(f);
    byFile.set(f.filePath, existing);
  }

  return (
    <div className="space-y-4">
      {Array.from(byFile.entries()).map(([filePath, fileFindings]) => (
        <div key={filePath} className="overflow-hidden rounded-[22px] border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <code className="text-sm text-white/50 break-all">{filePath}</code>
            <span className="ml-2 shrink-0 text-xs text-white/30">
              {fileFindings.length} finding{fileFindings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-border">
            {fileFindings.map((f) => {
              const tier = f.confidence != null ? getConfidenceTier(f.confidence) : null;
              const explainer = getRuleExplainer(f.ruleId);
              return (
                <div key={f.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={f.severity} />
                    <Badge variant="outline" className="text-xs font-mono">
                      {f.ruleId}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[f.category as Category] || f.category}
                    </Badge>
                    {tier && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${CONFIDENCE_TIER_CLASSES[tier]}`}
                      >
                        {CONFIDENCE_TIER_LABELS[tier]}
                      </Badge>
                    )}
                    <span className="text-xs text-white/50">
                      Line {f.lineNumber}
                    </span>
                  </div>
                  <p className="text-sm">{f.description}</p>
                  {explainer && (
                    <p className="text-xs text-white/35">{explainer}</p>
                  )}
                  {f.disclaimer && (
                    <p className="text-xs text-white/40 italic">{f.disclaimer}</p>
                  )}
                  {f.context && (
                    <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 text-xs">
                      <code className="text-[#e05252]">{f.context}</code>
                    </pre>
                  )}
                  <a
                    href={falsePositiveUrl(f)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-[#3a8a8c] transition-colors"
                  >
                    <Flag className="h-3 w-3" />
                    Report false positive
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
