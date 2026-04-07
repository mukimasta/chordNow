/** 与 {@link ChordVoice#setTimbre} 对应的音色 id */
export type TimbreId = "triangle" | "sine" | "warm" | "sawPad" | "piano";

export interface TimbreOption {
  readonly id: TimbreId;
  readonly label: string;
  /** 简短说明，用于 UI 或 title */
  readonly description: string;
}

/** 内置音色：含加法合成「钢琴感」补丁（仍为振荡器合成，无采样） */
export const TIMBRE_OPTIONS: readonly TimbreOption[] = [
  {
    id: "piano",
    label: "合成钢琴",
    description:
      "多路正弦分音 + 轻微非谐和 + 音头包络与低通，偏原声钢琴，仍为合成。",
  },
  {
    id: "triangle",
    label: "清澈三角",
    description: "单三角波，干净、贴耳。",
  },
  {
    id: "sine",
    label: "纯正弦波",
    description: "单正弦波，无谐波分量，最柔、最「纯」。",
  },
  {
    id: "warm",
    label: "柔和弦乐",
    description: "三角与正弦双音、轻微失谐，声部略厚、偏暖。",
  },
  {
    id: "sawPad",
    label: "铺底锯波",
    description: "锯齿波经低通滤波，谐波更满、适合铺底。",
  },
];

export function isTimbreId(s: string): s is TimbreId {
  return (
    s === "triangle" ||
    s === "sine" ||
    s === "warm" ||
    s === "sawPad" ||
    s === "piano"
  );
}
