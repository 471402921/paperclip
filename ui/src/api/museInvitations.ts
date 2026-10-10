import { api } from "./client";
import type {
  MuseInvitation, MuseInvitationInput, MuseConnection, MusePairing, MusePairingInput,
  MuseVerifyInput, MuseVerifyResult, MuseRevokeInput, MuseAttestStopInput,
} from "@paperclipai/shared";

const path = (companyId: string, agentId: string) => `/companies/${companyId}/agents/${agentId}/muse-binding`;
export const museInvitationsApi = {
  resume: (companyId: string, signal?: AbortSignal) => api.get<MuseInvitation | null>(`/companies/${companyId}/muse-invitations`, { signal }),
  create: (companyId: string, input: MuseInvitationInput) => api.post<MuseInvitation>(`/companies/${companyId}/muse-invitations`, input),
  connection: (companyId: string, agentId: string, signal?: AbortSignal) => api.get<MuseConnection>(path(companyId, agentId), { signal }),
  pair: (companyId: string, agentId: string, input: MusePairingInput) => api.post<MusePairing>(path(companyId, agentId), input),
  verify: (companyId: string, agentId: string, input: MuseVerifyInput) => api.post<MuseVerifyResult>(path(companyId, agentId) + "/verify", input),
  revoke: (companyId: string, agentId: string, input: MuseRevokeInput) => api.post<void>(path(companyId, agentId) + "/revoke", input),
  attestStop: (companyId: string, agentId: string, input: MuseAttestStopInput) => api.post<void>(path(companyId, agentId) + "/attest-stop", input),
};
