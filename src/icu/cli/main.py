from __future__ import annotations

import click

from icu import __version__


@click.group()
@click.version_option(version=__version__, prog_name="icu")
def cli() -> None:
    """I See You — AI supply chain firewall.

    Scan files and directories for prompt injection, data exfiltration,
    obfuscation, and other threats targeting AI coding tools.
    """


# Register subcommands
from icu.cli.scan import scan  # noqa: E402

cli.add_command(scan)

from icu.cli.policy import policy  # noqa: E402

cli.add_command(policy)
