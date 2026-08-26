import type { AdminAccessDataContract, LocalAccessState } from '../types';

const localAccessState: Readonly<LocalAccessState> = {
  label: 'Local UI only',
  mode: 'local-demo',
  protection: 'not-enforced',
};

export const localAccessContract: AdminAccessDataContract = {
  get: () => localAccessState,
};
