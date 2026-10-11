/** Closed controller-side phases; never pass command arguments or output here. */
export const COMMAND_DIAGNOSTIC_PHASES = [
  "chunk_queued", "global_admitted", "global_released", "upload_queued", "upload_admitted", "upload_released",
  "owner_guard_start", "owner_guard_complete", "ssh_auth_prepare", "ssh_auth_ready",
  "ssh_spawned", "ssh_stdin_flushed", "ssh_stdin_error", "ssh_timeout", "ssh_kill",
  "ssh_exit", "ssh_close", "ssh_spawn_error", "ssh_auth_cleanup", "ssh_auth_cleaned",
  "command_completed", "command_timed_out", "command_failed", "command_rejected",
  "chunk_completed", "chunk_failed",
] as const;
export type CommandDiagnosticPhase = (typeof COMMAND_DIAGNOSTIC_PHASES)[number];
export type CommandDiagnosticObserver = (phase: CommandDiagnosticPhase) => void | Promise<void>;

/** Diagnostics cannot grant authority, delay work, or change its outcome. */
export function reportCommandPhase(observer: CommandDiagnosticObserver | undefined, phase: CommandDiagnosticPhase): void {
  if (!observer || !COMMAND_DIAGNOSTIC_PHASES.includes(phase)) return;
  try { void Promise.resolve(observer(phase)).catch(() => undefined); }
  catch { /* An observer is never part of command settlement. */ }
}
