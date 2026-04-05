import { describe, expect, it } from "vitest";
import {
  chordToMidi,
  registerPenalty,
  resolveVoicingNearest,
  rootPcToMidi,
  voiceLeadingCost,
} from "./pitches";

describe("pitches", () => {
  it("rootPcToMidi maps C3 (default range lower than C4)", () => {
    expect(rootPcToMidi(0)).toBe(48);
    expect(rootPcToMidi(11)).toBe(59);
  });

  it("chordToMidi major triad on C (C3 register)", () => {
    expect(chordToMidi(0, "majorTriad")).toEqual([48, 52, 55]);
  });

  it("chordToMidi minor triad on D", () => {
    expect(chordToMidi(2, "minorTriad")).toEqual([50, 53, 57]);
  });

  it("chordToMidi dominant7 on G", () => {
    expect(chordToMidi(7, "dominant7")).toEqual([55, 59, 62, 65]);
  });

  it("chordToMidi major7 on C", () => {
    expect(chordToMidi(0, "major7")).toEqual([48, 52, 55, 59]);
  });

  it("chordToMidi minor7 on C", () => {
    expect(chordToMidi(0, "minor7")).toEqual([48, 51, 55, 58]);
  });

  it("chordToMidi half-diminished on B", () => {
    expect(chordToMidi(11, "halfDiminished7")).toEqual([59, 62, 65, 69]);
  });

  it("registerPenalty is zero at reference bass", () => {
    expect(registerPenalty([50, 60, 64])).toBe(0);
  });

  it("resolveVoicingNearest without previous matches chordToMidi", () => {
    expect(resolveVoicingNearest(null, 0, "majorTriad")).toEqual(
      chordToMidi(0, "majorTriad"),
    );
  });

  it("resolveVoicingNearest prefers small motion from C major to Dm", () => {
    const prev = chordToMidi(0, "majorTriad");
    const next = resolveVoicingNearest(prev, 2, "minorTriad");
    expect(next).toEqual([50, 53, 57]);
    expect(voiceLeadingCost(prev, next)).toBeLessThan(12);
  });

  it("voiceLeadingCost sorts by pitch before comparing", () => {
    expect(voiceLeadingCost([55, 48, 52], [50, 53, 57])).toBe(
      voiceLeadingCost([48, 52, 55], [50, 53, 57]),
    );
  });
});
