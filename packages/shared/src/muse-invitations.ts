import type { AgentLifecycleState } from "./types/agent-lifecycle.js";
import type { MuseStopBoundary } from "./muse-protocol.js";

/** Only transient pairing responses contain the ticket/setup instruction. */
export interface MuseBinding {
  id: string; generation: number; revision: number;
  status: "pairing" | "connected" | "ready" | "revoked";
  paired: boolean; receiverDetected: boolean; backgroundReplyVerified: boolean;
  pairingExpiresAt: string | null; challengeExpiresAt: string | null;
  lastReceiverContactAt: string | null; lastWorkerActivityAt: string | null; lastVerifiedReplyAt: string | null;
  contactPersistenceLagMs: number; clientVersion: string | null;
  qualification: { id: string; expiresAt: string } | null;
  liveAssignments: number; uncertainOperations: number; pendingInputs: number;
  cleanup: { pending: boolean; detectorRemoved: boolean; workerQuiescenceReported: boolean; expiresAt: string | null };
  stop: { status: "none" | "cannot_confirm" | "worker_reported" | "operator_attested"; nativeEffectsUnknown: boolean; boundary: MuseStopBoundary | null };
}
export interface MuseInvitation { agent: { id: string; name: string; status: string }; approvalId: string | null; binding: MuseBinding | null }
export interface MuseConnection {
  enabled: boolean; publicOrigin: string | null; agentStatus: string; agentLifecycleState: AgentLifecycleState;
  canConfigureConnection: boolean; binding: MuseBinding | null; usage: null; cost: null;
}
export interface MusePairing {
  bindingId: string; generation: number; revision: number; ticket: string; expiresAt: string;
  setupInstruction: string; assetVersion: 1;
}
export interface MuseVerifyResult { bindingId: string; generation: number; revision: number; expiresAt: string; status: "pending" }
export interface MuseInvitationInput { name: string; role: string }
export interface MusePairingInput { replaceBindingId?: string; expectedRevision?: number }
export interface MuseVerifyInput { bindingId: string; generation: number; expectedRevision: number }
export interface MuseRevokeInput extends MuseVerifyInput {}
export interface MuseAttestStopInput { boundary: MuseStopBoundary; expectedRevision: number; workerStopped: true }
