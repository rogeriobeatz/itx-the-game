import { BALANCE } from "../config/balance";

/** Pure collision-feedback decision: rate-limit notices while a player stays blocked. */
export function obstructionFeedback(args: {
  attempted: number;
  travelled: number;
  heldSeconds: number;
  frameSeconds: number;
  gameSeconds: number;
  lastNoticeSeconds: number;
}): { heldSeconds: number; notify: boolean } {
  const { attempted, travelled, frameSeconds, gameSeconds, lastNoticeSeconds } = args;
  if (!(attempted > 0.15) || !Number.isFinite(travelled) || travelled > 0.0001) {
    return { heldSeconds: 0, notify: false };
  }
  const heldSeconds = args.heldSeconds + Math.max(0, frameSeconds);
  const notify = heldSeconds >= BALANCE.blockedFeedbackSeconds &&
    gameSeconds - lastNoticeSeconds >= BALANCE.blockedFeedbackCooldownSeconds;
  return { heldSeconds, notify };
}
