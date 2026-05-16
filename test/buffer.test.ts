import { describe, expect, it } from "vitest";
import { RingBuffer } from "../src/buffer";

describe("RingBuffer", () => {
  it("keeps the newest items", () => {
    const buffer = new RingBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);

    expect(buffer.toArray()).toEqual([2, 3, 4]);
  });

  it("updates matching items in place", () => {
    const buffer = new RingBuffer<{ id: string; value: number }>(2);
    buffer.push({ id: "a", value: 1 });

    expect(buffer.update((item) => item.id === "a", { value: 2 })).toBe(true);
    expect(buffer.toArray()).toEqual([{ id: "a", value: 2 }]);
  });
});
