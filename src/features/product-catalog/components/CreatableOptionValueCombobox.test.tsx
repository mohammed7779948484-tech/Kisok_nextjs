import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateOptionValue = vi.fn();

vi.mock('@/features/catalog-taxonomy/repositories', () => ({
  catalogTaxonomyRepository: {
    createOptionValue: (...args: unknown[]) => mockCreateOptionValue(...args),
  },
}));

import { CreatableOptionValueCombobox } from './CreatableOptionValueCombobox';

const mockOptionType = {
  id: 'type-flavor',
  name: 'Flavor',
  isActive: true,
  displayOrder: 0,
  values: [
    { id: 'val-berry', value: 'Berry', isActive: true, displayOrder: 0 },
    { id: 'val-blue-raspberry', value: 'Blue Raspberry', isActive: true, displayOrder: 1 },
    { id: 'val-cherry', value: 'Cherry', isActive: true, displayOrder: 2 },
    { id: 'val-retired', value: 'Old Flavor', isActive: false, displayOrder: 3 },
  ],
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  };
}

describe('CreatableOptionValueCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters active Option Values case-insensitively on typing', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreatableOptionValueCombobox
        onValueChange={vi.fn()}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'bl');

    expect(screen.getByText('Blue Raspberry')).toBeInTheDocument();
    expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Flavor')).not.toBeInTheDocument();
  });

  it('does not offer create action when input exactly matches an existing value (case-insensitive)', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreatableOptionValueCombobox
        onValueChange={vi.fn()}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'berry');

    expect(screen.getByText('Berry')).toBeInTheDocument();
    expect(screen.queryByText(/create/i)).not.toBeInTheDocument();
  });

  it('shows create action when input is not found in existing active values', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreatableOptionValueCombobox
        onValueChange={vi.fn()}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'Mango');

    expect(screen.getByText('+ Create "Mango"')).toBeInTheDocument();
  });

  it('creates new Option Value via repository, auto-selects it, and invalidates references query cache', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onCreated = vi.fn();

    const createdRecord = {
      id: 'val-mango-123',
      value: 'Mango',
      isActive: true,
      displayOrder: 4,
      optionTypeId: 'type-flavor',
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
    };
    mockCreateOptionValue.mockResolvedValueOnce(createdRecord);

    const { queryClient } = renderWithQueryClient(
      <CreatableOptionValueCombobox
        onCreated={onCreated}
        onValueChange={onValueChange}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'Mango');

    const createButton = screen.getByText('+ Create "Mango"');
    await user.click(createButton);

    expect(mockCreateOptionValue).toHaveBeenCalledWith({
      optionTypeId: 'type-flavor',
      value: 'Mango',
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith('val-mango-123');
      expect(onCreated).toHaveBeenCalledWith(createdRecord);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['product-editor', 'references'],
      });
    });
  });

  it('handles creation failure gracefully by preserving text and showing retry', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    mockCreateOptionValue.mockRejectedValueOnce(new Error('Network error creating value'));

    renderWithQueryClient(
      <CreatableOptionValueCombobox
        onValueChange={onValueChange}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'Dragonfruit');

    const createButton = screen.getByText('+ Create "Dragonfruit"');
    await user.click(createButton);

    expect(await screen.findByText(/Could not create "Dragonfruit"/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('Dragonfruit');
  });

  it('supports keyboard navigation and Escape closes the popup without propagating', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderWithQueryClient(
      <CreatableOptionValueCombobox
        onValueChange={onValueChange}
        optionType={mockOptionType}
        value={null}
      />,
    );

    const input = screen.getByRole('combobox', { name: /option value/i });
    await user.click(input);
    await user.type(input, 'ch');

    // Currently highlighted index is 0 (Cherry). Press Enter to select it.
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('val-cherry');

    // Re-open and test Escape
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
