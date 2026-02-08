from __future__ import annotations

from icu.policy.models import (
    AlertsConfig,
    FileAccessPolicy,
    NetworkPolicy,
    Policy,
    PolicyDefaults,
)


def default_policy() -> Policy:
    """Return a Policy with safe defaults."""
    return Policy(
        defaults=PolicyDefaults(
            action="block",
            allow_network=False,
            allow_shell=False,
            max_risk_level="medium",
            deep_scan=True,
        ),
        file_access=FileAccessPolicy(
            deny=(
                "~/.ssh/*",
                "~/.aws/*",
                "~/.gnupg/*",
                "~/.config/gcloud/*",
                "**/.env",
                "**/.env.*",
                "**/credentials.json",
                "**/secrets.yml",
                "**/secrets.yaml",
            ),
            allow=(),
        ),
        network=NetworkPolicy(
            allow=(),
            deny=(
                "*.onion",
                "*.i2p",
            ),
        ),
        alerts=AlertsConfig(
            console=True,
            log_file=None,
        ),
        tool_overrides=(),
    )


def default_policy_yaml() -> str:
    """Return a commented YAML string for ``icu policy init``."""
    return """\
# ICU Policy Configuration
# https://github.com/i-see-you/icu
version: "1.0"

# Default settings applied to all scans
defaults:
  # Action when policy is violated: block | warn | log
  action: block

  # Whether to allow network-related findings
  allow_network: false

  # Whether to allow shell command findings
  allow_shell: false

  # Maximum acceptable risk level: clean | low | medium | high | critical
  max_risk_level: medium

  # Enable deep scanning (entropy + deobfuscation)
  deep_scan: true

# File access policy — deny-first, allow overrides deny
file_access:
  deny:
    - "~/.ssh/*"
    - "~/.aws/*"
    - "~/.gnupg/*"
    - "~/.config/gcloud/*"
    - "**/.env"
    - "**/.env.*"
    - "**/credentials.json"
    - "**/secrets.yml"
    - "**/secrets.yaml"
  allow: []

# Network policy
network:
  allow: []
  deny:
    - "*.onion"
    - "*.i2p"

# Alert configuration
alerts:
  console: true
  # log_file: /var/log/icu/alerts.log

# Per-tool overrides (inherit from defaults if omitted)
# tool_overrides:
#   - name: cursor
#     allow_network: true
#     max_risk_level: low
#   - name: copilot
#     action: warn
"""
