import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  getTrustedAdminSession: vi.fn(),
}));

vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: testContext.getTrustedAdminSession,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: 'demo-key',
    CLOUDINARY_API_SECRET: 'demo-secret',
  },
}));

import { getMediaUploadSignature } from './actions';

describe('getMediaUploadSignature', () => {
  it('requires an active Admin session', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(null);

    await expect(getMediaUploadSignature()).rejects.toThrow('An active Admin session is required.');
  });

  it('returns a signed upload payload without ever exposing the API secret', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue({ userId: 'admin-1' });

    const result = await getMediaUploadSignature();

    expect(result).toEqual({
      timestamp: expect.any(Number),
      signature: expect.any(String),
      apiKey: 'demo-key',
      cloudName: 'demo-cloud',
    });
    expect(JSON.stringify(result)).not.toContain('demo-secret');
  });
});
