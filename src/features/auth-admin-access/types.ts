export interface LocalAccessState {
  label: 'Local UI only';
  mode: 'local-demo';
  protection: 'not-enforced';
}

export interface AdminAccessDataContract {
  get(): Readonly<LocalAccessState>;
}
