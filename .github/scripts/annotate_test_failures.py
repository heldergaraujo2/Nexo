#!/usr/bin/env python3
"""Emit GitHub Actions error annotations for flutter test failures.

Actions log/artifact downloads are unreachable from some environments;
annotations travel through the Checks API instead, so failures stay
inspectable via `gh api .../check-runs/<id>/annotations`.
"""
import re
import sys


def main() -> None:
    path = sys.argv[1]
    try:
        with open(path, encoding='utf-8', errors='replace') as fh:
            lines = fh.read().splitlines()
    except OSError as exc:
        print(f'::error title=flutter test::could not read output: {exc}')
        return

    def emit(message: str) -> None:
        message = message.replace('%', '%%').replace('\r', '%0D').replace('\n', '%0A')
        print(f'::error title=flutter test::{message[:1800]}')

    failures = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if '[E]' in line or 'Failed to load' in line or 'EXCEPTION CAUGHT' in line:
            block = [line.strip()]
            j = i + 1
            while j < len(lines) and len(block) < 6:
                nxt = lines[j]
                if re.match(r'^\d+:\d+ ', nxt):
                    break
                if nxt.strip():
                    block.append(nxt.strip())
                j += 1
            failures.append(' | '.join(block))
            i = j
        else:
            i += 1

    if not failures:
        tail = [ln.strip() for ln in lines if ln.strip()][-12:]
        failures = tail or ['flutter test failed with no captured output']

    for entry in failures[:10]:
        emit(entry)


if __name__ == '__main__':
    main()
