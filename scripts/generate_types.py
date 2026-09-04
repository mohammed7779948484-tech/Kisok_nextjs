from __future__ import annotations

import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src/infrastructure/supabase/database.types.ts'


def main() -> None:
    database_url = os.environ.get('KIOSK_SUPABASE_POOLER_URL')
    if not database_url:
        raise SystemExit('KIOSK_SUPABASE_POOLER_URL is required.')

    result = subprocess.run(
        [
            'sg',
            'docker',
            '-c',
            'pnpm --silent dlx supabase gen types typescript --db-url "$KIOSK_SUPABASE_POOLER_URL" --schema public',
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, 'KIOSK_SUPABASE_POOLER_URL': database_url},
    )
    if result.returncode != 0:
        raise SystemExit('Hosted Supabase type generation failed.')

    marker = 'export type Json ='
    start = result.stdout.find(marker)
    if start < 0:
        raise SystemExit('Generated Supabase types were not found in CLI output.')

    generated = result.stdout[start:]
    if any(secret_marker in generated.lower() for secret_marker in ('postgresql://', 'service_role', 'eyj')):
        raise SystemExit('Generated output contained unexpected credential-like content.')

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(generated, encoding='utf-8')
    print(f'Generated {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
