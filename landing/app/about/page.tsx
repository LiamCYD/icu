"use client";

import { useState } from "react";
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
import { Eye, Zap, Lock, ChevronRight, ChevronDown } from "lucide-react";

const DETECTION_RULES = [
  { id: "PI-001", category: "prompt_injection", severity: "critical", description: "System prompt override / instruction hijacking" },
  { id: "PI-002", category: "prompt_injection", severity: "critical", description: "Instruction override: ignore above instructions" },
  { id: "PI-003", category: "prompt_injection", severity: "critical", description: "Instruction override: disregard prior instructions" },
  { id: "PI-004", category: "prompt_injection", severity: "high", description: "Role reassignment attempt" },
  { id: "PI-005", category: "prompt_injection", severity: "high", description: "New instruction injection" },
  { id: "PI-006", category: "prompt_injection", severity: "high", description: "Fake system prompt injection" },
  { id: "PI-007", category: "prompt_injection", severity: "critical", description: "XML system tag injection" },
  { id: "PI-008", category: "prompt_injection", severity: "critical", description: "Directive to ignore safety rules" },
  { id: "DE-001", category: "data_exfiltration", severity: "critical", description: "SSH directory access in code" },
  { id: "DE-002", category: "data_exfiltration", severity: "high", description: "Environment file access (.env) in code" },
  { id: "DE-003", category: "data_exfiltration", severity: "critical", description: "AWS credentials file access" },
  { id: "DE-004", category: "data_exfiltration", severity: "high", description: "Git config access" },
  { id: "DE-005", category: "data_exfiltration", severity: "critical", description: "SSH private key (id_rsa) access" },
  { id: "DE-006", category: "data_exfiltration", severity: "critical", description: "GPG keyring access" },
  { id: "DE-007", category: "data_exfiltration", severity: "medium", description: "Keychain access in code" },
  { id: "DE-008", category: "data_exfiltration", severity: "high", description: "NPM config access (.npmrc)" },
  { id: "DE-009", category: "data_exfiltration", severity: "high", description: "PyPI config access (.pypirc)" },
  { id: "DE-010", category: "data_exfiltration", severity: "critical", description: "Curl POST with variable interpolation" },
  { id: "DE-011", category: "data_exfiltration", severity: "critical", description: "Wget POST request (data exfiltration)" },
  { id: "DE-012", category: "data_exfiltration", severity: "critical", description: "Netcat connection (reverse shell/exfiltration)" },
  { id: "OB-001", category: "obfuscation", severity: "medium", description: "Possible base64-encoded payload" },
  { id: "OB-002", category: "obfuscation", severity: "high", description: "Hex-encoded byte sequence" },
  { id: "OB-003", category: "obfuscation", severity: "high", description: "Unicode escape sequence chain" },
  { id: "OB-004", category: "obfuscation", severity: "critical", description: "Multiple zero-width characters (hidden content)" },
  { id: "SC-001", category: "suspicious_commands", severity: "medium", description: "Python subprocess execution" },
  { id: "SC-002", category: "suspicious_commands", severity: "high", description: "OS system command execution" },
  { id: "SC-003", category: "suspicious_commands", severity: "high", description: "Dynamic code execution via exec()" },
  { id: "SC-004", category: "suspicious_commands", severity: "high", description: "Dynamic code evaluation via eval()" },
  { id: "SC-005", category: "suspicious_commands", severity: "medium", description: "Node.js child process spawning" },
  { id: "SC-006", category: "suspicious_commands", severity: "high", description: "Java runtime command execution" },
  { id: "NS-001", category: "network_suspicious", severity: "medium", description: "Python HTTP requests library call" },
  { id: "NS-002", category: "network_suspicious", severity: "medium", description: "Python urllib network request" },
  { id: "NS-003", category: "network_suspicious", severity: "medium", description: "JavaScript fetch() call" },
  { id: "NS-004", category: "network_suspicious", severity: "medium", description: "XMLHttpRequest usage" },
  { id: "NS-005", category: "network_suspicious", severity: "medium", description: "Socket/database connection to literal address" },
  { id: "NS-006", category: "network_suspicious", severity: "high", description: "DNS resolution (potential DNS exfiltration)" },
  { id: "NS-007", category: "network_suspicious", severity: "medium", description: "Socket address resolution" },
];

const FAQ = [
  {
    q: "What is ICU?",
    a: "ICU (I See You) is an open-source scanner that monitors AI package marketplaces for malicious code. It detects prompt injection, credential theft, obfuscated payloads, and suspicious command execution — then publishes the results here as a public transparency report.",
  },
  {
    q: "How does the scanning work?",
    a: "ICU uses a three-stage pipeline: (1) Hash-based reputation check against known malicious files, (2) Pattern matching with 37 detection rules that look for specific malicious patterns in source code, and (3) Deep analysis including entropy measurement and deobfuscation to find hidden payloads. Rules only fire on executable code files — not READMEs or config files — to minimize false positives.",
  },
  {
    q: "What marketplaces are scanned?",
    a: "Currently: npm, PyPI, Smithery, Glama, MCP Registry, SkillsMP, and PulseMCP. These cover the main registries where MCP servers, AI agents, and LLM tools are distributed.",
  },
  {
    q: "How often is data updated?",
    a: "The scraper runs daily via GitHub Actions. Each run scans new and updated packages across all monitored marketplaces. The timestamp on the dashboard shows when data was last refreshed.",
  },
  {
    q: "What do the confidence levels mean?",
    a: "Each finding has a confidence score from 0 to 1. High confidence (0.8+) means the pattern is very likely malicious. Medium (0.5-0.8) means it's suspicious but could be legitimate. Low (0.2-0.5) means it's probably benign. Findings in test files, documentation, or config files get lower confidence automatically.",
  },
  {
    q: "Is this open source?",
    a: "Yes. Both the ICU scanner CLI and this website are open source under the Apache 2.0 license. Contributions are welcome — especially new detection rules and false positive reports.",
  },
  {
    q: "How can I protect my project?",
    a: "Install ICU locally with `pip install icu`, then run `icu scan` on any package before using it. You can also set up git hooks with `icu hook install` for automatic scanning on every commit.",
  },
  {
    q: "I think a finding is wrong. What do I do?",
    a: "Click 'Report false positive' on any finding to open a pre-filled GitHub issue. We review every report and use them to improve our detection rules. Getting it right matters to us.",
  },
];

const SEVERITY_CLASSES: Record<string, string> = {
  critical: "border-[#e05252]/20 bg-[#e05252]/10 text-[#e05252]",
  high: "border-[#5bb8d4]/20 bg-[#5bb8d4]/10 text-[#5bb8d4]",
  medium: "border-[#d4a853]/20 bg-[#d4a853]/10 text-[#d4a853]",
  low: "border-[#6b8a7a]/20 bg-[#6b8a7a]/10 text-[#6b8a7a]",
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full rounded-[22px] border border-border p-4 text-left transition-colors hover:border-white/20"
    >
      <h3 className="flex items-center gap-2 font-medium">
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#3a8a8c]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[#3a8a8c]" />
        )}
        {q}
      </h3>
      {open && (
        <p className="mt-2 pl-6 text-sm text-white/55">{a}</p>
      )}
    </button>
  );
}

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
            desc: "Automated daily scanning of 7 AI package marketplaces",
          },
          {
            icon: Zap,
            title: "Detect",
            desc: "37 detection rules across 5 categories with confidence scoring",
          },
          {
            icon: Lock,
            title: "Report",
            desc: "Public threat database with full findings, code context, and verdicts",
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
      <div className="overflow-x-auto rounded-[22px] border border-border">
        <div className="px-6 py-4">
          <h2 className="display-heading text-xl">Detection Rules ({DETECTION_RULES.length})</h2>
          <p className="text-sm text-white/40 mt-1">
            Data exfiltration rules (DE-*) only fire on executable code files — not READMEs, .gitignore, or config files.
          </p>
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
            <FaqItem key={item.q} q={item.q} a={item.a} />
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
