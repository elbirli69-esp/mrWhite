/** Instrumentación ligera del pipeline Snake Oil (dev + diagnóstico). */

export type PipelineMarks = {
  speakStartMs: number | null;
  firstChunkMs: number | null;
  firstWhisperResultMs: number | null;
  speakEndMs: number | null;
  liveFlushDoneMs: number | null;
  finalWhisperStartMs: number | null;
  finalWhisperDoneMs: number | null;
  deepseekStartMs: number | null;
  deepseekDoneMs: number | null;
  uiResultMs: number | null;
  audioSec: number | null;
  liveWindows: number;
  usedFinalPass: boolean;
  normalizedHits: number;
};

export type PipelineReport = {
  audioTotalSec: number | null;
  whisperFirstResultSec: number | null;
  whisperLiveTotalSec: number | null;
  whisperFinalSec: number | null;
  deepseekSec: number | null;
  afterSpeakToResultSec: number | null;
  usedFinalPass: boolean;
  liveWindows: number;
  normalizedHits: number;
  summary: string;
};

function sec(from: number | null, to: number | null): number | null {
  if (from == null || to == null) return null;
  return Math.max(0, (to - from) / 1000);
}

export function createPipelineTracker(): {
  marks: PipelineMarks;
  mark: (key: keyof Omit<PipelineMarks, 'liveWindows' | 'usedFinalPass' | 'normalizedHits' | 'audioSec'>, at?: number) => void;
  setMeta: (patch: Partial<Pick<PipelineMarks, 'audioSec' | 'liveWindows' | 'usedFinalPass' | 'normalizedHits'>>) => void;
  report: () => PipelineReport;
} {
  const marks: PipelineMarks = {
    speakStartMs: null,
    firstChunkMs: null,
    firstWhisperResultMs: null,
    speakEndMs: null,
    liveFlushDoneMs: null,
    finalWhisperStartMs: null,
    finalWhisperDoneMs: null,
    deepseekStartMs: null,
    deepseekDoneMs: null,
    uiResultMs: null,
    audioSec: null,
    liveWindows: 0,
    usedFinalPass: false,
    normalizedHits: 0,
  };

  return {
    marks,
    mark(key, at = performance.now()) {
      if (marks[key] == null) marks[key] = at;
    },
    setMeta(patch) {
      Object.assign(marks, patch);
    },
    report() {
      const whisperFirst = sec(marks.speakStartMs, marks.firstWhisperResultMs);
      const liveTotal = sec(marks.speakStartMs, marks.liveFlushDoneMs);
      const finalSec = sec(marks.finalWhisperStartMs, marks.finalWhisperDoneMs);
      const deepseekSec = sec(marks.deepseekStartMs, marks.deepseekDoneMs);
      const afterSpeak = sec(marks.speakEndMs, marks.uiResultMs);
      const lines = [
        `Audio total: ${marks.audioSec != null ? `${marks.audioSec.toFixed(1)} s` : '—'}`,
        `Whisper:`,
        `  - primer resultado: ${whisperFirst != null ? `${whisperFirst.toFixed(1)} s` : '—'}`,
        `  - live total: ${liveTotal != null ? `${liveTotal.toFixed(1)} s` : '—'}`,
        `  - pase final: ${finalSec != null ? `${finalSec.toFixed(1)} s` : marks.usedFinalPass ? '…' : 'omitido'}`,
        `DeepSeek:`,
        `  - respuesta: ${deepseekSec != null ? `${deepseekSec.toFixed(1)} s` : '—'}`,
        `Desde "he terminado" hasta resultado: ${afterSpeak != null ? `${afterSpeak.toFixed(1)} s` : '—'}`,
        `Ventanas live: ${marks.liveWindows} · normalizaciones: ${marks.normalizedHits}`,
      ];
      return {
        audioTotalSec: marks.audioSec,
        whisperFirstResultSec: whisperFirst,
        whisperLiveTotalSec: liveTotal,
        whisperFinalSec: finalSec,
        deepseekSec,
        afterSpeakToResultSec: afterSpeak,
        usedFinalPass: marks.usedFinalPass,
        liveWindows: marks.liveWindows,
        normalizedHits: marks.normalizedHits,
        summary: lines.join('\n'),
      };
    },
  };
}

export type PipelineTracker = ReturnType<typeof createPipelineTracker>;

export function isAsrDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('asr') === '1') return true;
    return localStorage.getItem('snakeoil-asr-debug') === '1';
  } catch {
    return false;
  }
}
