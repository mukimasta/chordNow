import type { VoicingEngine } from "../core/contracts";
import type { ResolvedChord } from "../harmony";
import {
  DEFAULT_ROOT_UPPER_REGISTER,
  DEFAULT_ROOT_UPPER_WEIGHTS,
  type RootUpperOpenWeights,
  type RootUpperRegisterConfig,
  resolveRootUpperOpen,
} from "./rootUpperResolve";

export function createRootUpperOpenVoicingEngine(
  register?: Partial<RootUpperRegisterConfig>,
  weights?: Partial<RootUpperOpenWeights>,
): VoicingEngine {
  const reg = {
    ...DEFAULT_ROOT_UPPER_REGISTER,
    ...register,
    bass: { ...DEFAULT_ROOT_UPPER_REGISTER.bass, ...register?.bass },
    upper: { ...DEFAULT_ROOT_UPPER_REGISTER.upper, ...register?.upper },
  };
  const w = { ...DEFAULT_ROOT_UPPER_WEIGHTS, ...weights };

  return {
    id: "root-upper-open",
    label: "根音+上层开放/就近",
    resolve(prevMidis: number[] | null, chord: ResolvedChord): number[] {
      return resolveRootUpperOpen(
        prevMidis,
        chord.rootPc,
        chord.kind,
        chord.inversion,
        reg,
        w,
      );
    },
  };
}

/** 默认参数下的单例（与 createRootUpperOpenVoicingEngine() 等价） */
export const rootUpperOpenVoicingEngine: VoicingEngine =
  createRootUpperOpenVoicingEngine();
