export interface ListDataContract<T> {
  list(): readonly T[];
}

export interface ValueDataContract<T> {
  get(): Readonly<T>;
}
