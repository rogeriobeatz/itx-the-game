import { describe, expect, it } from "vitest";
import { BALANCE } from "../config/balance";
import { obstructionFeedback } from "./movementFeedback";

describe("feedback de colisão (core puro)", () => {
  const params = { attempted: 1, travelled: 0, heldSeconds: 0,
    frameSeconds: 0.2, gameSeconds: 10, lastNoticeSeconds: -Infinity };
  it("não exibe aviso em colisões rápidas", () => {
    expect(obstructionFeedback(params)).toEqual({heldSeconds: 0.2, notify: false});
  });
  it("exibe um aviso ao segurar a direção contra um obstáculo", () => {
    const response = obstructionFeedback({...params,heldSeconds:BALANCE.blockedFeedbackSeconds - 0.1});
    expect(response.notify).toBe(true);
  });
  it("limita frequência das notificações", () => {
    const state = obstructionFeedback({...params, heldSeconds:1, lastNoticeSeconds:9});
    expect(state.notify).toBe(false);
    expect(obstructionFeedback({...params, heldSeconds:1, lastNoticeSeconds:4}).notify).toBe(true);
  });
  it("reinicia ao soltar a tecla ou voltar a andar", () => {
    expect(obstructionFeedback({...params,attempted:0,heldSeconds:4}).heldSeconds).toBe(0);
    expect(obstructionFeedback({...params,travelled:0.1,heldSeconds:4}).heldSeconds).toBe(0);
  });
});
