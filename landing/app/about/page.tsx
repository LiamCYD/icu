import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GITHUB_REPO, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { Shield, Eye, Zap, Lock, ChevronRight } from "lucide-react";

const DETECTION_RULES = [
  { id: "PI-001", category: "prompt_injection", severity: "critical", description: "System prompt override / instruction hijacking" },
  { id: "PI-002", category: "prompt_injection", severity: "high", description: "Hidden instructions in tool descriptions" },
  { id: "PI-003", category: "prompt_injection", severity: "high", description: "Invisible Unicode instruction injection" },
  { id: "PI-004", category: "prompt_injection", severity: "medium", description: "User input passed directly to system prompt" },
  { id: "DE-001", category: "data_exfiltration", severity: "critical", description: "SSH key / credential file reading" },
  { id: "DE-002", category: "data_exfiltration", severity: "critical", description: "Environment variable exfiltration via HTTP" },
  { id: "DE-003", category: "data_exfiltration", severity: "critical", description: "API key / secret harvesting and transmission" },
  { id: "DE-004", category: "data_exfiltration", severity: "critical", description: "Workspace file upload to external server" },
  { id: "DE-005", category: "data_exfiltration", severity: "high", description: "Sensitive file glob patterns (.env, .pem, .key)" },
  { id: "OB-001", category: "obfuscation", severity: "high", description: "Base64-encoded payload concealing URLs or code" },
  { id: "OB-002", category: "obfuscation", severity: "medium", description: "Hex-encoded strings concealing data" },
  { id: "OB-003", category: "obfuscation", severity: "high", description: "Dynamic import / require with encoded module names" },
  { id: "SC-001", category: "suspicious_commands", severity: "critical", description: "Arbitrary shell command execution (shell=True)" },
  { id: "SC-002", category: "suspicious_commands", severity: "critical", description: "SQL injection via unsanitized query interpolation" },
  { id: "SC-003", category: "suspicious_commands", severity: "medium", description: "eval() / exec() on user-provided strings" },
  { id: "SC-004", category: "suspicious_commands", severity: "high", description: "Unsandboxed code execution in host namespace" },
  { id: "NS-001", category: "network_suspicious", severity: "high", description: "Requests to raw IP addresses" },
  { id: "NS-002", category: "network_suspicious", severity: "high", description: "Traffic proxied through unknown intermediary" },
  { id: "NS-003", category: "network_suspicious", severity: "low", description: "Phone-home / update check on import" },
];

const FAQ = [
  {
    q: "What is ICU?",
    a: "ICU (I See You) is an open-source AI supply chain firewall. It scans files and packages for prompt injection, data exfiltration, obfuscation, and other malicious patterns targeting AI development tools.",
  },
  {
    q: "How does the scanning work?",
    a: "ICU uses a tiered detection pipeline: fast hash-based reputation checks, heuristic pattern matching with 37 detection rules, and deep analysis including entropy measurement and deobfuscation.",
  },
  {
    q: "What marketplaces are scanned?",
    a: "Currently we scan npm, PyPI, Smithery (MCP servers), and Glama (AI agents). More marketplaces are planned as the project grows.",
  },
  {
    q: "How often is data updated?",
    a: "The scraper pipeline runs every 6 hours via GitHub Actions, scanning new and updated packages across all monitored marketplaces.",
  },
  {
    q: "Is this open source?",
    a: "Yes. Both the ICU scanner and this website are open source under the Apache 2.0 license. Contributions are welcome.",
  },
  {
    q: "How can I protect my project?",
    a: "Install ICU locally with `pip install icu`, then run `icu scan` on any files before using them. You can also set up git hooks with `icu hook install` for automatic scanning.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">About ICU</h1>
          <p className="text-sm text-muted-foreground">
            Methodology, detection rules, and frequently asked questions
          </p>
        </div>
      </div>

      {/* Mission */}
      <Card className="glass-card border-border/50">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Mission</h2>
          <p className="text-muted-foreground">
            AI development tools are increasingly targeted by supply chain
            attacks. Malicious MCP servers, poisoned agent plugins, and
            trojanized npm/PyPI packages can exfiltrate secrets, inject
            prompts, and execute arbitrary code — all while appearing
            legitimate.
          </p>
          <p className="text-muted-foreground">
            ICU exists to make these threats visible. We continuously scan AI
            marketplaces, detect malicious patterns, and publish our findings
            as a transparency report — naming and shaming bad actors to
            protect the community.
          </p>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Eye,
            title: "Scan",
            desc: "Automated scraping of AI package marketplaces every 6 hours",
          },
          {
            icon: Zap,
            title: "Detect",
            desc: "37 detection rules across 5 categories with tiered analysis",
          },
          {
            icon: Lock,
            title: "Report",
            desc: "Public threat database with full findings and code context",
          },
        ].map((step) => (
          <Card key={step.title} className="glass-card border-border/50">
            <CardContent className="space-y-2 p-6 text-center">
              <step.icon className="mx-auto h-8 w-8 text-primary" />
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detection rules */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle>Detection Rules ({DETECTION_RULES.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[80px]">Rule</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead className="hidden sm:table-cell w-[150px]">
                  Category
                </TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DETECTION_RULES.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="border-border/50 hover:bg-secondary/50"
                >
                  <TableCell className="font-mono text-xs">
                    {rule.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        rule.severity === "critical"
                          ? "border-red-500/20 bg-red-500/10 text-red-400"
                          : rule.severity === "high"
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                            : rule.severity === "medium"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                              : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {CATEGORY_LABELS[rule.category as Category]}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <Card key={item.q} className="glass-card border-border/50">
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 font-medium">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  {item.q}
                </h3>
                <p className="mt-2 pl-6 text-sm text-muted-foreground">
                  {item.a}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="text-center text-sm text-muted-foreground">
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary transition-colors hover:text-primary/80"
        >
          View on GitHub
        </a>
        {" "}&middot;{" "}
        <span>Apache 2.0 License</span>
        {" "}&middot;{" "}
        <span>Open Source</span>
      </div>
    </div>
  );
}
