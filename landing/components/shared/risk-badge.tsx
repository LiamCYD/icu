import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RISK_BG_CLASSES, type RiskLevel } from "@/lib/constants";

export function RiskBadge({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  const colors = RISK_BG_CLASSES[level as RiskLevel] || RISK_BG_CLASSES.clean;

  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-xs uppercase", colors, className)}
    >
      {level}
    </Badge>
  );
}
