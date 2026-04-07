import { describe, expect, it } from "vitest";
import { codeToDegree, getActiveDegree } from "./keymap";

describe("keymap", () => {
  it("Digit1 and Digit8 both map to degree I", () => {
    expect(codeToDegree("Digit1")).toBe(1);
    expect(codeToDegree("Digit8")).toBe(1);
  });

  it("getActiveDegree picks later-pressed key when 1 and 8 both held", () => {
    const keysDown = new Set<string>(["Digit1", "Digit8"]);
    const order = new Map<string, number>([
      ["Digit1", 1],
      ["Digit8", 2],
    ]);
    expect(getActiveDegree(keysDown, order)).toBe(1);
    expect(order.get("Digit8")).toBeGreaterThan(order.get("Digit1")!);
  });
});
