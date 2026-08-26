import type { ValueDataContract } from '@/shared/contracts';

export interface LocalAccessState {
  label: 'Local UI only';
  mode: 'local-demo';
  protection: 'not-enforced';
}

export interface AdminAccessDataContract extends ValueDataContract<LocalAccessState> {}
