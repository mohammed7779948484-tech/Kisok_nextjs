import { assertLocalApiUrl, LOCAL_AUTH_USERS, seedLocalAuthUser } from './lib/local-auth-seed';

import { execSync } from 'node:child_process';

function readSupabaseStatusEnv(): { apiUrl: string; serviceKey: string } {
  const output = execSync('pnpm supabase status -o env', { encoding: 'utf8' });
  const vars = new Map<string, string>();
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) vars.set(match[1], match[2]);
  }
  const apiUrl = vars.get('API_URL');
  const serviceKey = vars.get('SERVICE_ROLE_KEY');
  if (!(apiUrl && serviceKey)) {
    throw new Error(
      "Local API_URL or SERVICE_ROLE_KEY was not returned by 'supabase status -o env'.",
    );
  }
  return { apiUrl, serviceKey };
}

async function main() {
  const { apiUrl, serviceKey } = readSupabaseStatusEnv();
  assertLocalApiUrl(apiUrl);

  for (const spec of LOCAL_AUTH_USERS) {
    const { created } = await seedLocalAuthUser(fetch, apiUrl, serviceKey, spec);
    console.log(
      `${created ? 'Created' : 'Reset password for existing'} local Auth user: ${spec.email}`,
    );
  }

  console.log('\nLocal development logins:');
  for (const spec of LOCAL_AUTH_USERS) {
    console.log(`  ${spec.role.padEnd(11)} ${spec.email} / ${spec.password}`);
  }
  console.log('\nThese credentials are LOCAL DEVELOPMENT ONLY.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
