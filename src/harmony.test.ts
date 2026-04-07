import { describe, expect, it } from "vitest";
import {
  blackKeyRomanLabel,
  resolveChord,
  resolveChordAtRoot,
  type HarmonyModifiers,
} from "./harmony";

const base: HarmonyModifiers = {
  shift: false,
  period: false,
  slash: false,
  comma: false,
  digit9: false,
  sus4: false,
  sus2: false,
  dim: false,
  aug: false,
  inversion: 0,
};

describe("resolveChord", () => {
  const C = 0;

  it("I is C major", () => {
    const r = resolveChord(C, 1, { ...base });
    expect(r.kind).toBe("majorTriad");
    expect(r.rootPc).toBe(0);
    expect(r.label).toContain("C");
  });

  it("ii is Dm", () => {
    const r = resolveChord(C, 2, { ...base });
    expect(r.kind).toBe("minorTriad");
    expect(r.label).toContain("Dm");
  });

  it(". on I is Cmaj7", () => {
    const r = resolveChord(C, 1, { ...base, period: true });
    expect(r.kind).toBe("major7");
    expect(r.label).toContain("Cmaj7");
  });

  it(". on V is G7 (dominant)", () => {
    const r = resolveChord(C, 5, { ...base, period: true });
    expect(r.kind).toBe("dominant7");
    expect(r.label).toContain("G7");
  });

  it(". on ii is Dm7", () => {
    const r = resolveChord(C, 2, { ...base, period: true });
    expect(r.kind).toBe("minor7");
    expect(r.label).toContain("Dm7");
  });

  it("vii + . is Bø", () => {
    const r = resolveChord(C, 7, { ...base, period: true });
    expect(r.kind).toBe("halfDiminished7");
    expect(r.label).toContain("Bø");
  });

  it(", on I is C6", () => {
    const r = resolveChord(C, 1, { ...base, comma: true });
    expect(r.kind).toBe("major6");
    expect(r.label).toContain("C6");
  });

  it("Shift + / on V is Gm7", () => {
    const r = resolveChord(C, 5, { ...base, shift: true, slash: true });
    expect(r.kind).toBe("minor7");
    expect(r.label).toContain("Gm7");
  });

  it("n + / is diminished seventh", () => {
    const r = resolveChord(C, 1, { ...base, dim: true, slash: true });
    expect(r.kind).toBe("diminished7");
    expect(r.label).toContain("dim7");
  });

  it("n alone is diminished triad", () => {
    const r = resolveChord(C, 1, { ...base, dim: true });
    expect(r.kind).toBe("diminishedTriad");
    expect(r.label).toContain("°");
  });

  it("m alone is augmented", () => {
    const r = resolveChord(C, 1, { ...base, aug: true });
    expect(r.kind).toBe("augmentedTriad");
    expect(r.label).toContain("+");
  });

  it("9 is add9 on major", () => {
    const r = resolveChord(C, 1, { ...base, digit9: true });
    expect(r.kind).toBe("majorAdd9");
    expect(r.label).toContain("add9");
  });

  it("' is sus4", () => {
    const r = resolveChord(C, 1, { ...base, sus4: true });
    expect(r.kind).toBe("sus4Triad");
    expect(r.label).toContain("sus4");
  });

  it("; is sus2", () => {
    const r = resolveChord(C, 1, { ...base, sus2: true });
    expect(r.kind).toBe("sus2Triad");
    expect(r.label).toContain("sus2");
  });

  it("Shift flips I to minor triad", () => {
    const r = resolveChord(C, 1, { ...base, shift: true });
    expect(r.kind).toBe("minorTriad");
    expect(r.label).toContain("Cm");
  });

  it("slash alone is dominant seventh on degree root", () => {
    const r = resolveChord(C, 1, { ...base, slash: true });
    expect(r.kind).toBe("dominant7");
    expect(r.label).toContain("C7");
  });
});

describe("blackKeyRomanLabel", () => {
  it("maps semitone offsets to dual Roman numerals", () => {
    expect(blackKeyRomanLabel(1)).toBe("#I / bII");
    expect(blackKeyRomanLabel(3)).toBe("#II / bIII");
    expect(blackKeyRomanLabel(6)).toBe("#IV / bV");
    expect(blackKeyRomanLabel(8)).toBe("#V / bVI");
    expect(blackKeyRomanLabel(10)).toBe("#VI / bVII");
  });
});

describe("resolveChordAtRoot (black keys)", () => {
  const C = 0;

  it("+1 semitone: Roman #I/bII + C# major", () => {
    const r = resolveChordAtRoot(C, 1, { ...base }, 1);
    expect(r.rootPc).toBe(1);
    expect(r.kind).toBe("majorTriad");
    expect(r.label).toContain("#I / bII");
    expect(r.label).toContain("C#");
  });

  it("+3 semitone (w): #II / bIII + D# major", () => {
    const r = resolveChordAtRoot(C, 3, { ...base }, 3);
    expect(r.rootPc).toBe(3);
    expect(r.kind).toBe("majorTriad");
    expect(r.label).toContain("#II / bIII");
    expect(r.label).toContain("D#");
  });

  it("Shift + / on V root (G) is Gm7", () => {
    const gPc = 7;
    const r = resolveChordAtRoot(C, gPc, { ...base, shift: true, slash: true }, 8);
    expect(r.kind).toBe("minor7");
    expect(r.label).toContain("#V / bVI");
    expect(r.label).toContain("Gm7");
  });

  it("n + / is diminished seventh on chromatic root", () => {
    const r = resolveChordAtRoot(C, 1, { ...base, dim: true, slash: true }, 1);
    expect(r.kind).toBe("diminished7");
    expect(r.label).toContain("dim7");
  });

  it("/ alone is maj7 on major triad (not V7)", () => {
    const r = resolveChordAtRoot(C, 1, { ...base, period: true }, 1);
    expect(r.kind).toBe("major7");
    expect(r.label).toContain("#I / bII");
    expect(r.label).toContain("C#maj7");
  });
});
