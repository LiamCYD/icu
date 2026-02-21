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
import { Eye, Zap, Lock, ChevronRight } from "lucide-react";

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

const SEVERITY_CLASSES: Record<string, string> = {
  critical: "border-[#e05252]/20 bg-[#e05252]/10 text-[#e05252]",
  high: "border-[#5bb8d4]/20 bg-[#5bb8d4]/10 text-[#5bb8d4]",
  medium: "border-[#d4a853]/20 bg-[#d4a853]/10 text-[#d4a853]",
  low: "border-[#6b8a7a]/20 bg-[#6b8a7a]/10 text-[#6b8a7a]",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-12 md:px-20">
      <div>
        <h1 className="display-heading text-3xl">About ICU</h1>
        <p className="light-text mt-1 text-lg opacity-55">
          Methodology, detection rules, and frequently asked questions
        </p>
      </div>

      {/* Mission */}
      <div className="rounded-[22px] border border-border p-6 space-y-4">
        <h2 className="display-heading text-xl">Mission</h2>
        <p className="text-white/55">
          AI development tools are increasingly targeted by supply chain
          attacks. Malicious MCP servers, poisoned agent plugins, and
          trojanized npm/PyPI packages can exfiltrate secrets, inject
          prompts, and execute arbitrary code — all while appearing
          legitimate.
        </p>
        <p className="text-white/55">
          ICU exists to make these threats visible. We continuously scan AI
          marketplaces, detect malicious patterns, and publish our findings
          as a transparency report — naming and shaming bad actors to
          protect the community.
        </p>
      </div>

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
          <div key={step.title} className="rounded-[22px] border border-border p-6 text-center space-y-2">
            <step.icon className="mx-auto h-8 w-8 text-[#3a8a8c]" />
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-white/55">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Detection rules */}
      <div className="overflow-hidden rounded-[22px] border border-border">
        <div className="px-6 py-4">
          <h2 className="display-heading text-xl">Detection Rules ({DETECTION_RULES.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
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
                className="border-border hover:bg-secondary/30"
              >
                <TableCell className="font-mono text-xs">
                  {rule.id}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${SEVERITY_CLASSES[rule.severity] || ""}`}
                  >
                    {rule.severity}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-white/50 sm:table-cell">
                  {CATEGORY_LABELS[rule.category as Category]}
                </TableCell>
                <TableCell className="text-sm">
                  {rule.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="display-heading mb-4 text-xl">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-[22px] border border-border p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <ChevronRight className="h-4 w-4 text-[#3a8a8c]" />
                {item.q}
              </h3>
              <p className="mt-2 pl-6 text-sm text-white/55">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="text-center text-sm text-white/50">
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3a8a8c] transition-colors hover:text-[#3a8a8c]/70"
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
