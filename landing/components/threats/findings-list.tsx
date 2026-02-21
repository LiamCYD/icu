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
          <div className="border-b border-border px-4 py-2">
            <code className="text-sm text-white/50 break-all">{filePath}</code>
          </div>
          <div className="divide-y divide-border">
            {fileFindings.map((f) => {
              const tier = f.confidence != null ? getConfidenceTier(f.confidence) : null;
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
                    className="inline-block text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
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
