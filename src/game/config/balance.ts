// Central tuning for every stat rule. Change numbers here, not in systems.
export const BALANCE = {
  /** Game minutes that pass per real second. */
  minutesPerSecond: 1,
  workStart: 9 * 60,
  workEnd: 18 * 60,
  /** Every N game minutes: Fé drains and Burnout grows. */
  drainEvery: 10,
  feDrain: 1,
  burnoutGain: 1,
  salary: 150,
  dayEndBurnoutRelief: 20,
  aquariumSeconds: 60,
  aquariumRadius: 2.6,
  autosaveSeconds: 15,
  sickLeave: { vida: 70, burnout: 35, limpoPenalty: 100 },
  startPos: { x: 11.75, y: 20.2 },
  playerSpeed: 3.4,
  interactRadius: 1.5,
  pitch: { secondsPerSlide: 8, baseBurnout: 4, wrongBurnout: 14, timeoutBurnout: 18 },
} as const;
