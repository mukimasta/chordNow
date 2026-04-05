import { describe, expect, it } from "vitest";
import { codeToDegree, getActiveDegree } from "./keymap";

describe("keymap", () => {
  it("KeyA and KeyK both map to degree I", () => {
    expect(codeToDegree("KeyA")).toBe(1);
    expect(codeToDegree("KeyK")).toBe(1);
  });

  it("getActiveDegree picks later-pressed key when A and K both held", () => {
    const keysDown = new Set<string>(["KeyA", "KeyK"]);
    const order = new Map<string, number>([
      ["KeyA", 1],
      ["KeyK", 2],
    ]);
    expect(getActiveDegree(keysDown, order)).toBe(1);
    expect(order.get("KeyK")).toBeGreaterThan(order.get("KeyA")!);
  });
});
