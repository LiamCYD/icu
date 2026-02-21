import { RiskBadge } from "@/components/shared/risk-badge";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type Category } from "@/lib/constants";

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
            <code className="text-sm text-white/50">{filePath}</code>
          </div>
          <div className="divide-y divide-border">
            {fileFindings.map((f) => (
              <div key={f.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={f.severity} />
                  <Badge variant="outline" className="text-xs font-mono">
                    {f.ruleId}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[f.category as Category] || f.category}
                  </Badge>
                  <span className="text-xs text-white/50">
                    Line {f.lineNumber}
                  </span>
                </div>
                <p className="text-sm">{f.description}</p>
                {f.context && (
                  <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 text-xs">
                    <code className="text-[#e05252]">{f.context}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
