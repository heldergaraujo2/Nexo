#!/usr/bin/env python3
"""Emit GitHub Actions annotations with per-test flutter results, from the teed output.

Makes individual test results inspectable through the Checks API
(`gh api repos/heldergaraujo2/Nexo/check-runs/<id>/annotations`) even where
Actions log and artifact downloads are blocked by network policy.

GitHub stores at most 10 annotations per step (the first 10 emitted), so the
COMPLETE per-test list is emitted first in a single annotation; individual
per-test notices follow as best-effort extras.
"""
import re
import sys

ANSI = re.compile(r'\x1b\[[0-9;]*m')
LINE = re.compile(r'(\d+:\d+) \+(\d+)(?: -(\d+))?: (.+)')
SKIP = re.compile(r'^(loading|compiling|All tests passed|building|Downloading)')
WS_PREFIX = re.compile(r'^.*/mobile/')


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
        name = WS_PREFIX.sub('mobile/', m.group(4).strip())
        if SKIP.match(name) or name.endswith('.dart'):
            continue
        failed = '[E]' in name
        if failed:
            name = name.replace(' [E]', '').strip()
        results[name] = 'FAIL' if failed else 'PASS'

    passed = sum(1 for s in results.values() if s == 'PASS')
    failed = sum(1 for s in results.values() if s == 'FAIL')

    # 1) FIRST: one annotation with the complete per-test list (survives the
    #    10-annotations-per-step cap, since the first 10 are the ones kept).
    complete = ' // '.join(f'{status} {name}' for name, status in results.items())
    print(f'::notice title=flutter test complete results::{passed} pass, {failed} fail, {len(results)} total // {complete}'[:6500])

    # 2) Then individual per-test notices (best-effort; some may exceed the cap).
    for name, status in results.items():
        msg = f'{status} :: {name}'.replace('%', '%%')
        level = 'notice' if status == 'PASS' else 'error'
        print(f'::{level} title=flutter test::{msg[:1500]}')


if __name__ == '__main__':
    main()
