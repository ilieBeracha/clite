export class RingBuffer<T> {
  readonly limit: number;
  #items: T[] = [];

  constructor(limit: number) {
    this.limit = Math.max(1, Math.floor(limit));
  }

  push(item: T): void {
    this.#items.push(item);
    if (this.#items.length > this.limit) {
      this.#items.splice(0, this.#items.length - this.limit);
    }
  }

  update(predicate: (item: T) => boolean, patch: Partial<T>): boolean {
    const item = this.#items.find(predicate);
    if (!item) {
      return false;
    }

    Object.assign(item as Record<string, unknown>, patch);
    return true;
  }

  clear(): void {
    this.#items = [];
  }

  toArray(): T[] {
    return [...this.#items];
  }

  get length(): number {
    return this.#items.length;
  }
}
