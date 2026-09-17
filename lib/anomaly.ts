import type { AnomalyResult } from "./types";

/**
 * Detects cost spikes using a rolling z-score: if the current sample deviates
 * from the historical mean by more than `stdDevThreshold` standard deviations,
 * we flag it as an anomaly. Works on hourly buckets by default.
 */
export function detectAnomaly(
  current: number,
  history: number[],
  options: { stdDevThreshold?: number; minSamples?: number } = {}
): AnomalyResult {
  const stdDevThreshold = options.stdDevThreshold ?? 2.5;
  const minSamples = options.minSamples ?? 6;

  if (current < 0) {
    return {
      isAnomaly: false,
      zScore: 0,
      current,
      mean: 0,
      stdDev: 0,
      message: "Current spend is negative (credits applied); skipped anomaly check.",
    };
  }

  if (history.length < minSamples) {
    return {
      isAnomaly: false,
      zScore: 0,
      current,
      mean: mean(history),
      stdDev: stdDev(history),
      message: `Not enough history (${history.length}/${minSamples} samples) to compute an anomaly score.`,
    };
  }

  const meanVal = mean(history);
  const stdVal = stdDev(history);

  // A constant (zero-variance) series can never spike.
  if (stdVal <= 1e-9) {
    return {
      isAnomaly: false,
      zScore: 0,
      current,
      mean: meanVal,
      stdDev: stdVal,
      message: "History shows no variance; no spike detected.",
    };
  }

  const z = (current - meanVal) / stdVal;

  return {
    isAnomaly: z > stdDevThreshold,
    zScore: z,
    current,
    mean: meanVal,
    stdDev: stdVal,
    message:
      z > stdDevThreshold
        ? `Spend spike detected: $${current.toFixed(2)} is ${z.toFixed(1)}σ above the historical mean of $${meanVal.toFixed(2)}.`
        : `Spend is within the normal band (z = ${z.toFixed(2)}).`,
  };
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}