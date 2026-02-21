# CLAUDE.md — Security-First Project Instructions

## What This Project Does

ICU (I See You) is a security scanner that downloads packages from untrusted AI/MCP marketplaces, scans them for threats, and displays results on a public website. **This means we routinely handle adversarial inputs** — malicious packages, crafted metadata, poisoned tarballs. Every line of code must assume hostile input.

## Architecture

- **Scanner**: Python CLI (`src/icu/`) — scans files for prompt injection, data exfiltration, obfuscation, etc.
- **Scraper pipeline**: TypeScript (`landing/scripts/`) — downloads packages, runs scanner, stores results in PostgreSQL
- **Website**: Next.js + Prisma (`landing/`) — displays scan results publicly
- **CI**: GitHub Actions (`.github/workflows/`) — daily scraper cron + PR checks

## Security Rules — NEVER Violate These

### Secrets
- **NEVER** log, print, or include secrets in error messages (DATABASE_URL, API keys, tokens)
- **NEVER** commit `.env` files — they are gitignored at root and `landing/` level
- **NEVER** interpolate secrets into shell commands — use environment variables
- Always verify `.env` is in `.gitignore` before creating one

### Shell Execution
- **ALWAYS** use `execFile` (not `exec`) to prevent shell injection — arguments are passed as arrays, not concatenated strings
- **NEVER** interpolate untrusted data (package names, URLs, file paths) into shell command strings
- Set `GIT_TERMINAL_PROMPT=0` on all git operations to prevent credential prompts from hanging CI
- Set timeouts on all child processes (scanner: 120s, git clone: 60s)

### Downloading Untrusted Code
- **ALWAYS** validate repository URLs before `git clone` — use `safeShallowClone()` from `scripts/lib/safe-clone.ts`
- Only allow HTTPS URLs from `github.com`, `gitlab.com`, `bitbucket.org`
- Reject `file://`, `ssh://`, `git://` schemes and URLs with embedded credentials
- **ALWAYS** use `safeExtractTarball()` from `scripts/lib/safe-extract.ts` for tar extraction
- Check `Content-Length` before downloading (100MB max) — use `safeFetch()`
- Post-extraction: validate no symlinks exist and no paths escape the temp directory
- Clean up temp directories in `finally` blocks — never leave downloaded code on disk

### Database
- Use Prisma query builder for all queries — never use `$queryRawUnsafe`
- `$queryRaw` with tagged template literals (no interpolation) is safe
- Validate sort fields against allowlists before passing to `orderBy`
- Validate `order` parameter is exactly `"asc"` or `"desc"` — never use `as` type assertions on user input
- Truncate user-controlled text before storage (e.g., `matchedText` to 500 chars)
- Default nullable scanner fields (line numbers, matched text) to safe values

### Frontend
- React auto-escapes JSX text content — **NEVER** use `dangerouslySetInnerHTML`
- Validate URLs start with `https://` before rendering as `<a href>` — malicious packages can set `sourceUrl` to `javascript:` URIs
- All user-controlled data displayed on the site comes from the DB (package names, descriptions, finding text) — treat it as potentially adversarial
- Use `encodeURIComponent()` when constructing URLs with dynamic parameters

### GitHub Actions
- Set `permissions: contents: read` (least privilege) on all workflows
- **NEVER** interpolate `${{ }}` expressions into `run:` scripts — use env vars instead
- Secrets go in `env:` blocks, not command arguments
- Log artifacts may contain error messages — ensure errors don't leak credentials
- Branch protection: PRs required for non-admins, admin bypass for owner only

## Scraper Pipeline Conventions

- Each marketplace gets its own downloader in `scripts/downloaders/`
- Downloaders are async generators yielding `DownloadResult` one at a time
- Per-package `try/catch` — one bad package never crashes the run
- Scanner exit codes 1/2 mean findings detected (not errors)
- Severity mapping: `critical`→`critical`, `danger`→`high`, `warning`→`medium`, `info`→`low`
- Category from rule_id prefix: `PI-`→`prompt_injection`, `DE-`→`data_exfiltration`, etc.
- Idempotency: skip packages scanned within last 24 hours
- Downloaders that need API keys skip gracefully with a warning when keys are absent

## Common Commands

```bash
# Run scraper locally (test)
cd landing && MARKETPLACE=npm MAX_PACKAGES=5 npx tsx scripts/scrape.ts

# Type check
cd landing && npx tsc --noEmit

# Generate Prisma client after schema changes
cd landing && npx prisma generate

# Push schema to DB
cd landing && npx prisma db push

# Trigger scraper in CI
gh workflow run scrape.yml -f marketplace="MCP Registry" -f max_packages=10

# View workflow logs
gh run view <run-id> --log
```

## File Structure (key paths)

```
landing/scripts/
  scrape.ts                     # Main orchestrator
  lib/
    safe-clone.ts               # URL validation + symlink-checked git clone
    safe-extract.ts             # Size-limited download + hardened tar extraction
    scanner.ts                  # Shells out to icu scan
    confidence.ts               # Confidence scoring per finding
    rule-category-map.ts        # Severity/category normalization
    config.ts                   # Marketplace defs, rate limits, search queries
    rate-limiter.ts             # Token-bucket rate limiter
    stats.ts                    # Recomputes ScanStats singleton
    types.ts                    # TypeScript interfaces
  downloaders/
    npm.ts                      # npm registry
    pypi.ts                     # PyPI (curated list)
    smithery.ts                 # Smithery API
    glama.ts                    # Glama scrape + API
    mcp-registry.ts             # Official MCP Registry
    skillsmp.ts                 # SkillsMP (needs SKILLSMP_API_KEY)
    pulsemcp.ts                 # PulseMCP (needs PULSEMCP_API_KEY)
```
