import { describe, expect, it } from "vitest";
import { resolveChord, type HarmonyModifiers } from "./harmony";

const base: HarmonyModifiers = {
  quote: false,
  semicolon: false,
  slash: false,
};

describe("resolveChord", () => {
  const C = 0;

  it("C major diatonic I is C major", () => {
    const r = resolveChord(C, 1, { ...base });
    expect(r.kind).toBe("majorTriad");
    expect(r.rootPc).toBe(0);
    expect(r.label).toContain("C");
  });

  it("C major diatonic ii is Dm", () => {
    const r = resolveChord(C, 2, { ...base });
    expect(r.kind).toBe("minorTriad");
    expect(r.label).toContain("Dm");
  });

  it("I + slash is Cmaj7 (大七 when diatonic major)", () => {
    const r = resolveChord(C, 1, { ...base, slash: true });
    expect(r.kind).toBe("major7");
    expect(r.label).toContain("Cmaj7");
  });

  it("ii + slash is Dm7 (小七 when diatonic minor)", () => {
    const r = resolveChord(C, 2, { ...base, slash: true });
    expect(r.kind).toBe("minor7");
    expect(r.label).toContain("Dm7");
  });

  it("vii + slash is B half-diminished (ø)", () => {
    const r = resolveChord(C, 7, { ...base, slash: true });
    expect(r.kind).toBe("halfDiminished7");
    expect(r.label).toContain("Bø");
  });

  it("I + comma + slash is Cm7 (flip to minor then m7)", () => {
    const r = resolveChord(C, 1, { ...base, semicolon: true, slash: true });
    expect(r.kind).toBe("minor7");
    expect(r.label).toContain("Cm7");
  });

  it("ii + comma + slash is Dmaj7 (flip to major then maj7)", () => {
    const r = resolveChord(C, 2, { ...base, semicolon: true, slash: true });
    expect(r.kind).toBe("major7");
    expect(r.label).toContain("Dmaj7");
  });

  it("C major ii + comma only is D major triad", () => {
    const r = resolveChord(C, 2, { ...base, semicolon: true });
    expect(r.kind).toBe("majorTriad");
    expect(r.label).toContain("D");
    expect(r.label).not.toContain("m");
  });

  it("C major V + period is G7", () => {
    const r = resolveChord(C, 5, { ...base, quote: true });
    expect(r.kind).toBe("dominant7");
    expect(r.label).toContain("G7");
  });

  it(". wins over / and comma", () => {
    const r = resolveChord(C, 1, {
      ...base,
      quote: true,
      slash: true,
      semicolon: true,
    });
    expect(r.kind).toBe("dominant7");
    expect(r.label).toContain("C7");
  });

  it("C major vii + comma is B major triad", () => {
    const r = resolveChord(C, 7, { ...base, semicolon: true });
    expect(r.kind).toBe("majorTriad");
    expect(r.label).toContain("B");
  });
});
