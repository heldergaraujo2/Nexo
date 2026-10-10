#!/usr/bin/env python3
"""Emit one GitHub Actions notice annotation per flutter test, from the teed output.

Makes individual test results inspectable through the Checks API
(`gh api .../check-runs/<id>/annotations`) even where Actions log and
artifact downloads are blocked by network policy.
"""
import re
import sys

LINE = re.compile(r'^\d+:\d+ \+\d+(?: -\d+)?: (.+?)\s*$')


def main() -> None:
    path = sys.argv[1]
    try:
        with open(path, encoding='utf-8', errors='replace') as fh:
            lines = fh.read().splitlines()
    except OSError as exc:
        print(f'::notice title=flutter test::could not read output: {exc}')
        return

    results = {}
    for ln in lines:
        m = LINE.match(ln)
        if not m:
            continue
        name = m.group(1)
        if name.startswith('All tests passed'):
            continue
        failed = '[E]' in ln
        if failed:
            name = name.replace(' [E]', '')
        results[name] = 'FAIL' if failed else 'PASS'

    for name, status in results.items():
        msg = f'{status} :: {name}'.replace('%', '%%')
        level = 'notice' if status == 'PASS' else 'error'
        print(f'::{level} title=flutter test::{msg[:1500]}')
    print(f'::notice title=flutter test::per-test summary: {sum(1 for s in results.values() if s == "PASS")} pass, '
          f'{sum(1 for s in results.values() if s == "FAIL")} fail, {len(results)} total')


if __name__ == '__main__':
    main()
