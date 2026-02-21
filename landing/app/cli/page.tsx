import { Badge } from "@/components/ui/badge";
import { GITHUB_REPO } from "@/lib/constants";
import { Terminal, Shield, Eye, Zap, GitBranch, FileSearch, Database, Settings } from "lucide-react";

const COMMANDS = [
  {
    name: "icu scan",
    usage: "icu scan <file-or-directory>",
    description: "Scan files or directories for malicious patterns. Uses a tiered pipeline: hash reputation lookup, heuristic pattern matching, and deep analysis with entropy measurement and deobfuscation.",
    flags: [
      { flag: "--depth [fast|deep|auto]", desc: "Scan depth — auto escalates if suspicious (default: auto)" },
      { flag: "--format [table|json|sarif]", desc: "Output format (default: table)" },
      { flag: "--max-size BYTES", desc: "Max file size to scan (default: 1 MB)" },
      { flag: "--exclude PATTERN", desc: "Glob pattern to exclude (repeatable)" },
      { flag: "--workers N", desc: "Max worker threads for parallel scanning" },
      { flag: "--policy FILE", desc: "Policy YAML file to evaluate results against" },
      { flag: "--no-db", desc: "Disable reputation database lookup" },
    ],
    examples: [
      "icu scan ./server.py",
      "icu scan ./project/ --depth deep --format json",
      "icu scan ./src --exclude '*.test.py' --exclude 'vendor/*'",
    ],
    exitCodes: "0 = clean, 1 = medium risk, 2 = high/critical risk",
  },
  {
    name: "icu watch",
    usage: "icu watch <directory>",
    description: "Monitor a directory in real-time. Scans files as they change and prints results only when findings are detected. Ctrl+C to stop.",
    flags: [
      { flag: "--depth [fast|deep|auto]", desc: "Scan depth (default: auto)" },
      { flag: "--policy FILE", desc: "Policy YAML file to evaluate against" },
      { flag: "--max-size BYTES", desc: "Max file size (default: 1 MB)" },
      { flag: "--exclude PATTERN", desc: "Glob pattern to exclude (repeatable)" },
      { flag: "--no-db", desc: "Disable reputation database" },
    ],
    examples: [
      "icu watch ./src",
      "icu watch ./project --depth fast --exclude '*.log'",
    ],
  },
  {
    name: "icu hook",
    usage: "icu hook install | uninstall",
    description: "Manage git pre-commit hooks. When installed, ICU automatically scans staged files before each commit and blocks commits that contain high-risk findings.",
    flags: [],
    examples: [
      "icu hook install",
      "icu hook uninstall",
    ],
  },
  {
    name: "icu init",
    usage: "icu init [options]",
    description: "Bootstrap a project with a default policy file and pre-commit hook in one step.",
    flags: [
      { flag: "--no-hook", desc: "Skip git pre-commit hook installation" },
      { flag: "--policy-path FILE", desc: "Output path for policy file (default: .icu-policy.yml)" },
    ],
    examples: [
      "icu init",
      "icu init --no-hook --policy-path ./custom-policy.yml",
    ],
  },
  {
    name: "icu rules",
    usage: "icu rules [options]",
    description: "List and filter the 37 built-in detection rules across 5 threat categories.",
    flags: [
      { flag: "--category NAME", desc: "Filter by category" },
      { flag: "--severity LEVEL", desc: "Filter by severity (info, warning, danger, critical)" },
      { flag: "--search PATTERN", desc: "Regex search against rule ID and description" },
    ],
    examples: [
      "icu rules",
      "icu rules --category prompt_injection --severity critical",
      "icu rules --search 'ssh'",
    ],
  },
  {
    name: "icu policy",
    usage: "icu policy init | check | test",
    description: "Manage security policies. Define custom allow/block/warn rules per project with severity overrides by tool.",
    flags: [],
    examples: [
      "icu policy init",
      "icu policy check",
      "icu policy test ./src --tool claude --format json",
    ],
  },
  {
    name: "icu lookup",
    usage: "icu lookup <file-or-hash>",
    description: "Look up a file or SHA256 hash in the reputation database. Shows signature info and scan history.",
    flags: [
      { flag: "--format [table|json]", desc: "Output format (default: table)" },
      { flag: "--db-path PATH", desc: "Path to reputation database" },
    ],
    examples: [
      "icu lookup suspicious-file.py",
      "icu lookup abc123def456...",
    ],
  },
  {
    name: "icu reputation",
    usage: "icu reputation stats | list | add | remove | import | export",
    description: "Manage the threat signature reputation database. Add custom signatures, import/export YAML, and view statistics.",
    flags: [],
    examples: [
      "icu reputation stats",
      "icu reputation list --category prompt_injection",
      "icu reputation add --name 'custom_rule' --category suspicious_commands --pattern 'exec\\(' --severity critical",
      "icu reputation export --format yaml > signatures.yml",
      "icu reputation import signatures.yml",
    ],
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "37 Detection Rules",
    desc: "Prompt injection, data exfiltration, obfuscation, suspicious commands, and network threats",
  },
  {
    icon: Zap,
    title: "Tiered Analysis",
    desc: "Fast hash lookup, heuristic matching, and deep analysis with entropy and deobfuscation",
  },
  {
    icon: Eye,
    title: "Watch Mode",
    desc: "Real-time file monitoring that scans changes as you work",
  },
  {
    icon: GitBranch,
    title: "Git Hooks",
    desc: "Pre-commit integration to block malicious code before it enters your repo",
  },
  {
    icon: FileSearch,
    title: "Policy Engine",
    desc: "Custom allow/block/warn rules per project with tool-specific overrides",
  },
  {
    icon: Database,
    title: "Reputation DB",
    desc: "SQLite-backed hash tracking with known-good and known-bad lists",
  },
  {
    icon: Settings,
    title: "MCP Server",
    desc: "Expose scanning tools to AI assistants via Model Context Protocol",
  },
  {
    icon: Terminal,
    title: "Multiple Formats",
    desc: "Output as table, JSON, or SARIF for CI/CD integration",
  },
];

export default function CliPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-12 px-6 py-12 md:px-20">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="display-heading text-4xl sm:text-5xl">ICU CLI</h1>
        <p className="light-text max-w-2xl text-xl opacity-70">
          A command-line AI supply chain firewall. Scan files and packages for
          prompt injection, data exfiltration, obfuscation, and other malicious
          patterns targeting AI development tools.
        </p>
      </div>

      {/* Quick start */}
      <div className="space-y-4">
        <h2 className="display-heading text-2xl">Quick Start</h2>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[22px] border border-border">
            <div className="border-b border-border px-6 py-3">
              <span className="text-sm text-white/50">Install</span>
            </div>
            <pre className="overflow-x-auto p-6 text-sm">
              <code className="text-[#3a8a8c]">pip install icu</code>
            </pre>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border">
            <div className="border-b border-border px-6 py-3">
              <span className="text-sm text-white/50">Scan a file</span>
            </div>
            <pre className="overflow-x-auto p-6 text-sm">
              <code className="text-[#3a8a8c]">icu scan ./suspicious-package/</code>
            </pre>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border">
            <div className="border-b border-border px-6 py-3">
              <span className="text-sm text-white/50">Set up a project with policy + git hook</span>
            </div>
            <pre className="overflow-x-auto p-6 text-sm">
              <code className="text-[#3a8a8c]">icu init</code>
            </pre>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border">
            <div className="border-b border-border px-6 py-3">
              <span className="text-sm text-white/50">Watch for changes in real-time</span>
            </div>
            <pre className="overflow-x-auto p-6 text-sm">
              <code className="text-[#3a8a8c]">icu watch ./src</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="space-y-4">
        <h2 className="display-heading text-2xl">Features</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[22px] border border-border p-5 space-y-2">
              <f.icon className="h-5 w-5 text-[#3a8a8c]" />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-xs text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Command reference */}
      <div className="space-y-6">
        <h2 className="display-heading text-2xl">Command Reference</h2>

        {COMMANDS.map((cmd) => (
          <div key={cmd.name} className="overflow-hidden rounded-[22px] border border-border">
            {/* Command header */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-lg font-semibold">{cmd.name}</code>
              </div>
              <p className="mt-1 text-sm text-white/55">{cmd.description}</p>
            </div>

            <div className="space-y-4 p-6">
              {/* Usage */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-white/40">Usage</h4>
                <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 text-sm">
                  <code className="text-[#3a8a8c]">{cmd.usage}</code>
                </pre>
              </div>

              {/* Flags */}
              {cmd.flags.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase text-white/40">Options</h4>
                  <div className="space-y-2">
                    {cmd.flags.map((f) => (
                      <div key={f.flag} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:gap-3">
                        <code className="shrink-0 rounded bg-border/30 px-1.5 py-0.5 text-xs text-white">
                          {f.flag}
                        </code>
                        <span className="text-white/55">{f.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-white/40">Examples</h4>
                <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 text-sm space-y-1">
                  {cmd.examples.map((ex, i) => (
                    <code key={i} className="block text-[#3a8a8c]">
                      $ {ex}
                    </code>
                  ))}
                </pre>
              </div>

              {/* Exit codes */}
              {cmd.exitCodes && (
                <p className="text-xs text-white/40">
                  Exit codes: {cmd.exitCodes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h2 className="display-heading text-2xl">Configuration</h2>
        <p className="text-white/55">
          ICU loads configuration with the following precedence (highest to lowest):
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-border p-5 space-y-2">
            <Badge variant="outline" className="text-xs">1. CLI flags</Badge>
            <p className="text-sm text-white/55">Command-line arguments always take priority</p>
          </div>
          <div className="rounded-[22px] border border-border p-5 space-y-2">
            <Badge variant="outline" className="text-xs">2. Environment variables</Badge>
            <p className="text-sm text-white/55">ICU_DEPTH, ICU_MAX_SIZE, ICU_NO_DB, ICU_POLICY</p>
          </div>
          <div className="rounded-[22px] border border-border p-5 space-y-2">
            <Badge variant="outline" className="text-xs">3. Project config</Badge>
            <p className="text-sm text-white/55">.icu.yml or .icu.yaml in the project directory</p>
          </div>
          <div className="rounded-[22px] border border-border p-5 space-y-2">
            <Badge variant="outline" className="text-xs">4. Global config</Badge>
            <p className="text-sm text-white/55">~/.icu/config.yml for user-wide defaults</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-border">
          <div className="border-b border-border px-6 py-3">
            <span className="text-sm text-white/50">Example .icu.yml</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm">
            <code className="text-[#3a8a8c]">{`depth: auto
max_file_size: 2097152
exclude:
  - "*.log"
  - "vendor/*"
  - "node_modules/*"
no_db: false`}</code>
          </pre>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-border">
          <div className="border-b border-border px-6 py-3">
            <span className="text-sm text-white/50">Example .icuignore</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm">
            <code className="text-[#3a8a8c]">{`*.log
vendor/*
build/*
test_data/*
node_modules/*`}</code>
          </pre>
        </div>
      </div>

      {/* Pre-commit framework */}
      <div className="space-y-4">
        <h2 className="display-heading text-2xl">Pre-commit Framework</h2>
        <p className="text-white/55">
          ICU can also be used as a{" "}
          <a href="https://pre-commit.com" target="_blank" rel="noopener noreferrer" className="text-[#3a8a8c] hover:text-[#3a8a8c]/70">
            pre-commit
          </a>{" "}
          hook in any project:
        </p>
        <div className="overflow-hidden rounded-[22px] border border-border">
          <div className="border-b border-border px-6 py-3">
            <span className="text-sm text-white/50">.pre-commit-config.yaml</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm">
            <code className="text-[#3a8a8c]">{`repos:
  - repo: https://github.com/LiamCYD/icu
    rev: v0.1.0
    hooks:
      - id: icu-scan`}</code>
          </pre>
        </div>
      </div>

      {/* Footer link */}
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
        <span>Python 3.11+</span>
      </div>
    </div>
  );
}
