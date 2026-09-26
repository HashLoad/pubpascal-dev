# Approved Fixture

This is a minimal Pascal package layout used by the Esteira fixture harness to assert the
"approved" verdict. It contains the eight artifacts expected by the locked rule set: a
substantial README, a CHANGELOG, an `examples/` directory, an `INSTALL.md` file, an image
placeholder under `images/`, a Pascal source file, and a LICENSE file. None of the contents
are executed — the validator only inspects file paths and sizes.

The README intentionally exceeds the 200-byte minimum threshold so the `has_readme` rule
passes deterministically across operating systems and locales.
