import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOT_UPPER_REGISTER,
  extractUpperFromChord,
  resolveRootUpperOpen,
} from "./rootUpperResolve";

describe("extractUpperFromChord", () => {
  it("drops lowest as bass; triad has three upper notes", () => {
    expect(extractUpperFromChord([48, 60, 64, 67])).toEqual([60, 64, 67]);
  });

  it("returns null for single note", () => {
    expect(extractUpperFromChord([60])).toBeNull();
  });
});

describe("resolveRootUpperOpen", () => {
  it("places bass in D2–A3 and upper in B3–C5 (triad: 1 bass + 3 upper)", () => {
    const midis = resolveRootUpperOpen(null, 0, "majorTriad");
    expect(midis.length).toBe(4);
    const [bass, ...upper] = midis;
    expect(bass).toBeGreaterThanOrEqual(DEFAULT_ROOT_UPPER_REGISTER.bass.minMidi);
    expect(bass).toBeLessThanOrEqual(DEFAULT_ROOT_UPPER_REGISTER.bass.maxMidi);
    for (const m of upper) {
      expect(m).toBeGreaterThanOrEqual(DEFAULT_ROOT_UPPER_REGISTER.upper.minMidi);
      expect(m).toBeLessThanOrEqual(DEFAULT_ROOT_UPPER_REGISTER.upper.maxMidi);
      expect(m).toBeGreaterThan(bass);
    }
  });

  it("keeps upper span within upperMaxSpan", () => {
    const midis = resolveRootUpperOpen(null, 0, "major7");
    const upper = [...midis].sort((a, b) => a - b).slice(1);
    const span = upper[upper.length - 1]! - upper[0]!;
    expect(span).toBeLessThanOrEqual(DEFAULT_ROOT_UPPER_REGISTER.upperMaxSpan);
  });

  it("chains upper voice leading without coupling bass to previous bass", () => {
    const first = resolveRootUpperOpen(null, 0, "majorTriad");
    const second = resolveRootUpperOpen(first, 2, "minorTriad");
    expect(second[0]).toBeGreaterThanOrEqual(
      DEFAULT_ROOT_UPPER_REGISTER.bass.minMidi,
    );
    expect(second[0]).toBeLessThanOrEqual(
      DEFAULT_ROOT_UPPER_REGISTER.bass.maxMidi,
    );
    expect(second.length).toBe(4);
  });
});
