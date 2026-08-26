import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ listAssets: vi.fn() }));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: { listAssets: testContext.listAssets },
}));

import { MediaLibraryPanel } from './MediaLibraryPanel';

describe('MediaLibraryPanel', () => {
  it('renders hosted media metadata instead of local role fixtures', async () => {
    testContext.listAssets.mockResolvedValue([
      {
        id: 'media-1',
        publicId: 'kisok/test/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
        format: 'webp',
        width: 640,
        height: 480,
        bytes: 1234,
        createdAt: '2026-08-26T00:00:00Z',
      },
    ]);

    render(<MediaLibraryPanel />);

    expect(await screen.findByText('kisok/test/asset')).toBeInTheDocument();
    expect(screen.getByText('webp · 640×480')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });
});
