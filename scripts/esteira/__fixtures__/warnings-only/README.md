# Warnings-Only Fixture

This fixture has only a README and one Pascal source file at the root. Every optional rule
(changelog, examples, installing, images, license) is expected to warn. The validator must
return `verdict: 'approved_with_warnings'` with five `warn` outcomes and no `fail`.

The README is intentionally longer than 200 bytes so the README rule passes deterministically
on any operating system. No other artifacts are committed inside this fixture directory.
