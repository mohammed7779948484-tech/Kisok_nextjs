import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listOptionTypes: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listOptionTypes: testContext.listOptionTypes,
  },
}));

import { OptionLibraryPanel } from './OptionLibraryPanel';

describe('OptionLibraryPanel', () => {
  it('renders hosted Option Types and Values instead of local fixtures', async () => {
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'option-type-1',
        name: 'Roast profile',
        isActive: true,
        displayOrder: 0,
        values: [{ id: 'option-value-1', value: 'Light', isActive: true, displayOrder: 0 }],
      },
    ]);

    render(<OptionLibraryPanel />);

    expect(await screen.findByRole('heading', { name: 'Roast profile' })).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.queryByText('Flavor')).not.toBeInTheDocument();
  });
});
