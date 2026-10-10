#!/usr/bin/env python3
"""Emit one GitHub Actions notice annotation per flutter test, from the teed output.

Makes individual test results inspectable through the Checks API
(`gh api repos/heldergaraujo2/Nexo/check-runs/<id>/annotations`) even where
Actions log and artifact downloads are blocked by network policy.

Parses `flutter test --reporter expanded` output; tolerates ANSI colors and
CR-separated updates.
"""
import re
import sys

ANSI = re.compile(r'\x1b\[[0-9;]*m')
LINE = re.compile(r'(\d+:\d+) \+(\d+)(?: -(\d+))?: (.+)')
SKIP = re.compile(r'^(loading|compiling|All tests passed|building|Downloading)')


def main() -> None:
    path = sys.argv[1]
    try:
        with open(path, encoding='utf-8', errors='replace') as fh:
            raw = fh.read()
    except OSError as exc:
        print(f'::notice title=flutter test::could not read output: {exc}')
        return

    results = {}
    for chunk in re.split(r'[\r\n]+', ANSI.sub('', raw)):
        m = LINE.search(chunk.strip())
        if not m:
            continue
        name = m.group(4).strip()
        if SKIP.match(name):
            continue
        failed = '[E]' in name
        if failed:
            name = name.replace(' [E]', '').strip()
        results[name] = 'FAIL' if failed else 'PASS'

    for name, status in results.items():
        msg = f'{status} :: {name}'.replace('%', '%%')
        level = 'notice' if status == 'PASS' else 'error'
        print(f'::{level} title=flutter test::{msg[:1500]}')
    passed = sum(1 for s in results.values() if s == 'PASS')
    failed = sum(1 for s in results.values() if s == 'FAIL')
    print(f'::notice title=flutter test::per-test summary: {passed} pass, {failed} fail, {len(results)} total')


if __name__ == '__main__':
    main()
