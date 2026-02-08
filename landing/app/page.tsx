const GITHUB_REPO = "https://github.com/your-org/i-see-u";

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="page">
      <div className="container">
        <header className="hero">
          <h1>I See You</h1>
          <p className="tagline">
            AI supply chain firewall — scan files for prompt injection, data
            exfiltration, and obfuscated payloads.
          </p>
          <p className="sub">Install it. Forget it. It sees everything.</p>

          <div className="cta">
            <a
              href={GITHUB_REPO}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon />
              View on GitHub
            </a>
            <a
              href={`${GITHUB_REPO}#readme`}
              className="btn btn-glass"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get started
            </a>
            <a
              href={`${GITHUB_REPO}/releases`}
              className="btn btn-glass"
              target="_blank"
              rel="noopener noreferrer"
            >
              Releases
            </a>
          </div>
        </header>

        <section className="readme-section" aria-label="About and how to use">
          <div className="readme-head">About I See You</div>
          <div className="readme-body">
            <h2>What is this?</h2>
            <p>
              I See You (<code>icu</code>) is an open-source AI supply chain
              firewall and runtime guardian. It protects developers using AI
              coding tools (Claude Code, Cursor, Copilot, custom agents) from
              malicious MCP servers, skill files, agent plugins, prompt injection
              attacks, and data exfiltration — with near-zero perceptible
              latency when things are safe.
            </p>
            <p>
              It is designed to be{" "}
              <strong>invisible when things are safe</strong> and{" "}
              <strong>unmistakable when they&apos;re not</strong>.
            </p>

            <h2>How to get access</h2>
            <p>
              The project is open source (Apache 2.0). Clone or download the
              repository from GitHub. You can also install from source for the
              latest development version.
            </p>
            <ul>
              <li>
                <strong>GitHub repo:</strong> Use the &ldquo;View on
                GitHub&rdquo; or &ldquo;Get started&rdquo; button above to open
                the repository.
              </li>
              <li>
                <strong>Releases:</strong> Check the &ldquo;Releases&rdquo; page
                for stable versions and release notes.
              </li>
            </ul>

            <h2>How to use it</h2>
            <p>
              Install from the project directory (recommended for latest code):
            </p>
            <pre>
              <code>pip install -e &quot;.[dev]&quot;</code>
            </pre>
            <p>Scan a file or directory from the command line:</p>
            <pre>
              <code>icu scan ./path/to/file</code>
            </pre>
            <p>
              You can run <code>icu</code> on individual files, folders, or
              integrate it into your CI. For more options and configuration,
              see the README and documentation in the GitHub repository.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
