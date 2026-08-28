export type LocalAuthUserSpec = {
  email: string;
  password: string;
  displayName: string;
  role: 'admin' | 'preparation' | 'customer';
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

type ExistingUser = { id: string; email: string };

export const LOCAL_AUTH_USERS: LocalAuthUserSpec[] = [
  {
    email: 'admin@kiosk.local',
    password: 'KioskLocalAdmin123!',
    displayName: 'Admin',
    role: 'admin',
  },
  {
    email: 'preparation@kiosk.local',
    password: 'KioskLocalPreparation123!',
    displayName: 'Preparation Staff',
    role: 'preparation',
  },
  {
    email: 'customer@kiosk.local',
    password: 'KioskLocalCustomer123!',
    displayName: 'Customer',
    role: 'customer',
  },
];

export function assertLocalApiUrl(apiUrl: string): void {
  const { hostname } = new URL(apiUrl);
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(`Refusing to seed Auth because API_URL is not local: ${apiUrl}`);
  }
}

function authHeaders(serviceKey: string): Record<string, string> {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

async function findExistingUser(
  fetchImpl: FetchLike,
  apiUrl: string,
  serviceKey: string,
  email: string,
): Promise<ExistingUser | null> {
  const response = await fetchImpl(`${apiUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: authHeaders(serviceKey),
  });
  if (!response.ok) {
    throw new Error(`Failed to list Auth users (${response.status}).`);
  }
  const body = (await response.json()) as { users?: ExistingUser[] };
  return (body.users ?? []).find((user) => user.email === email) ?? null;
}

async function createUser(
  fetchImpl: FetchLike,
  apiUrl: string,
  serviceKey: string,
  spec: LocalAuthUserSpec,
): Promise<string> {
  const response = await fetchImpl(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...authHeaders(serviceKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: spec.email, password: spec.password, email_confirm: true }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create Auth user ${spec.email} (${response.status}).`);
  }
  const body = (await response.json()) as { id: string };
  return body.id;
}

/**
 * The core reproducibility fix: `supabase/seed.sql` inserts `auth.users`
 * rows with `encrypted_password = ''` purely to satisfy the profiles(id) FK
 * during `supabase db reset`. A prior version of this script treated an
 * already-existing user as "done" and never actually set a real password —
 * so the printed credentials looked valid but could not log in. Every run
 * must (re)assert the password on an existing user, not just reuse its id.
 */
async function resetPassword(
  fetchImpl: FetchLike,
  apiUrl: string,
  serviceKey: string,
  userId: string,
  password: string,
): Promise<void> {
  const response = await fetchImpl(`${apiUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { ...authHeaders(serviceKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!response.ok) {
    throw new Error(`Failed to reset password for Auth user ${userId} (${response.status}).`);
  }
}

async function upsertProfile(
  fetchImpl: FetchLike,
  apiUrl: string,
  serviceKey: string,
  userId: string,
  spec: LocalAuthUserSpec,
): Promise<void> {
  const response = await fetchImpl(`${apiUrl}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...authHeaders(serviceKey),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: userId,
      display_name: spec.displayName,
      role: spec.role,
      is_active: true,
      email: spec.email,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to upsert profile for ${spec.email} (${response.status}).`);
  }
}

export async function seedLocalAuthUser(
  fetchImpl: FetchLike,
  apiUrl: string,
  serviceKey: string,
  spec: LocalAuthUserSpec,
): Promise<{ userId: string; created: boolean }> {
  const existing = await findExistingUser(fetchImpl, apiUrl, serviceKey, spec.email);

  let userId: string;
  let created: boolean;
  if (existing) {
    userId = existing.id;
    created = false;
    await resetPassword(fetchImpl, apiUrl, serviceKey, userId, spec.password);
  } else {
    userId = await createUser(fetchImpl, apiUrl, serviceKey, spec);
    created = true;
  }

  await upsertProfile(fetchImpl, apiUrl, serviceKey, userId, spec);
  return { userId, created };
}
