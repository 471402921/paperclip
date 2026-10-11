/** Closed progress only. Wire IDs are correlated in memory and never reported. */
export type AcpxTurnAdmissionStage =
  | "turn_prepare" | "turn_spawn" | "turn_spawned"
  | "turn_initialize" | "turn_initialized"
  | "turn_session_load" | "turn_session_loaded"
  | "turn_session_resume" | "turn_session_resumed"
  | "turn_session_new" | "turn_session_created"
  | "turn_prompt_submitted" | "turn_ownership" | "turn_ownership_verified";

type WireStage = readonly [AcpxTurnAdmissionStage, AcpxTurnAdmissionStage];
const WIRE_STAGES: Readonly<Record<string, WireStage>> = {
  initialize: ["turn_initialize", "turn_initialized"],
  "session/load": ["turn_session_load", "turn_session_loaded"],
  "session/resume": ["turn_session_resume", "turn_session_resumed"],
  "session/new": ["turn_session_new", "turn_session_created"],
};

export function createTurnAdmissionDiagnostics(
  observe?: (stage: AcpxTurnAdmissionStage) => void,
) {
  let active: symbol | null = null;
  const pending = new Map<string | number, WireStage>();
  const report = (stage: AcpxTurnAdmissionStage): void => {
    if (!active) return;
    try {
      void Promise.resolve(observe?.(stage)).catch(() => undefined);
    } catch { /* Progress observers cannot change provider authority. */ }
  };
  return {
    begin() {
      const token = Symbol();
      active = token;
      pending.clear();
      report("turn_prepare");
      return {
        report(stage: AcpxTurnAdmissionStage) {
          if (active === token) report(stage);
        },
        end() {
          if (active !== token) return;
          active = null;
          pending.clear();
        },
      };
    },
    report,
    onAcpMessage(direction: "inbound" | "outbound", value: unknown) {
      if (!active || !value || typeof value !== "object" || Array.isArray(value)) return;
      const message = value as Record<string, unknown>;
      const id = message.id;
      if (!(typeof id === "string" && id.length <= 128)
        && !(typeof id === "number" && Number.isSafeInteger(id))) return;
      if (direction === "outbound") {
        const method = message.method;
        const stages = typeof method === "string" && Object.hasOwn(WIRE_STAGES, method)
          ? WIRE_STAGES[method] : undefined;
        if (!stages || pending.size >= 16) return;
        pending.set(id, stages);
        report(stages[0]);
      } else {
        const stages = pending.get(id);
        if (!stages || Object.hasOwn(message, "method")) return;
        pending.delete(id);
        // This marks a successful wire response, not later auth/replay/checkpoint work.
        // A rejected response is not evidence that initialize/load completed.
        if (Object.hasOwn(message, "result") && !Object.hasOwn(message, "error")) report(stages[1]);
      }
    },
  };
}
