# I See You (icu)

AI supply chain firewall — scan files for prompt injection, data exfiltration, and obfuscated payloads before they reach your AI coding tools.

## Features

- **37 detection rules** across 5 categories: prompt injection, data exfiltration, obfuscation, suspicious commands, network abuse
- **Tiered scanning pipeline**: hash lookup, fast heuristic scan, deep analysis (entropy + deobfuscation)
- **Real-time watch mode**: monitor directories for threats as files change
- **Git pre-commit hooks**: block malicious code before it enters version control
- **MCP server**: integrate with AI coding assistants via Model Context Protocol
- **Policy engine**: define custom allow/block rules per project
- **Reputation database**: SQLite-backed hash tracking with known-good/known-bad lists
- **Multiple output formats**: Rich tables, JSON, SARIF

## Installation

```bash
pip install -e ".[dev]"
```

## Quick Start

```bash
# Scan a file
icu scan ./path/to/file.py

# Scan a directory
icu scan ./project/

# Initialize a project (creates policy file + git hook)
icu init
```

## Commands

### `icu scan <target>`

Scan a file or directory for threats.

```bash
icu scan src/ --depth deep --format json
icu scan file.py --max-size 2097152 --exclude "*.log" --exclude "vendor/*"
```

Options:
- `--depth [fast|deep|auto]` — Scan depth (default: `auto`, escalates if suspicious)
- `--format [table|json|sarif]` — Output format (default: `table`)
- `--max-size BYTES` — Max file size in bytes (default: 1 MB)
- `--exclude PATTERN` — Glob pattern to exclude (repeatable)
- `--workers N` — Max worker threads for directory scanning
- `--policy FILE` — Policy YAML file to evaluate results against
- `--no-db` — Disable reputation database

Exit codes: `0` clean, `1` medium risk, `2` high/critical risk.

### `icu watch <directory>`

Watch a directory and scan files in real time as they change.

```bash
icu watch ./src --depth fast --exclude "*.tmp"
```

Options:
- `--depth [fast|deep|auto]` — Scan depth
- `--policy FILE` — Policy YAML to evaluate results against
- `--max-size BYTES` — Max file size in bytes (default: 1 MB)
- `--exclude PATTERN` — Glob pattern to exclude (repeatable)
- `--no-db` — Disable reputation database

### `icu hook install|uninstall`

Manage git pre-commit hooks.

```bash
icu hook install     # Install ICU pre-commit hook
icu hook uninstall   # Remove ICU pre-commit hook
```

### `icu init`

Set up a project with a policy file and git hook in one command.

```bash
cd my-project && icu init
```

### `icu rules`

List and filter detection rules.

```bash
icu rules
icu rules --category prompt_injection --severity critical
icu rules --search "ssh"
```

### `icu policy check <file> <policy>`

Evaluate a scan result against a policy file.

```bash
icu policy check ./file.py .icu-policy.yml
```

### `icu reputation`

Manage the reputation database.

```bash
icu reputation stats
icu lookup <sha256>
```

## Configuration

ICU loads configuration from (highest to lowest priority):

1. **CLI flags** — always win
2. **Project config** — `.icu.yml` or `.icu.yaml` (walks up from cwd)
3. **Global config** — `~/.icu/config.yml`

Example `.icu.yml`:

```yaml
depth: auto
max_file_size: 2097152
exclude:
  - "*.log"
  - "vendor/*"
  - "node_modules/*"
no_db: false
```

### Environment Variables

ICU also reads configuration from environment variables (between YAML config and CLI flags in precedence):

| Variable | Description | Example |
|----------|-------------|---------|
| `ICU_DEPTH` | Default scan depth | `fast`, `deep`, `auto` |
| `ICU_MAX_SIZE` | Max file size in bytes | `2097152` |
| `ICU_NO_DB` | Disable reputation DB | `1`, `true`, `yes` |
| `ICU_POLICY` | Path to policy YAML | `/path/to/policy.yml` |

### `.icuignore`

Create a `.icuignore` file (gitignore-style) to exclude patterns:

```
# Ignore logs and vendor
*.log
vendor/*
build/*
```

## MCP Server

ICU ships an MCP server for AI assistant integration:

```bash
icu-mcp
```

Available tools: `scan_file`, `scan_directory`, `check_content`, `check_policy`, `lookup_hash`, `list_rules`.

## Pre-commit Framework

Add to your `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/i-see-you/icu
    rev: v0.1.0
    hooks:
      - id: icu-scan
```

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest --cov=icu -q

# Lint
ruff check src/ tests/

# Type check
mypy src/icu/
```

## License

MIT
