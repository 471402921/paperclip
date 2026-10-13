import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { agents, companies, companyMemberships, authUsers, mcpOauthGrants, mcpOauthTokens, museAgentBindings as bindings, museCredentials as credentials, type Db } from "@paperclipai/db";
import { MUSE_ACCESS_TTL_MS, MUSE_REFRESH_INACTIVITY_MS, MUSE_RESOURCE_PATH, type AgentConnectionSubject, type MuseCredentials } from "@paperclipai/shared";
import { instanceSettingsService } from "./instance-settings.js";
import { musePublicOrigin } from "./muse-setup.js";
import { unauthorized, forbidden } from "../errors.js";
import { withExternalAdmissionGuard, type ExternalAdmissionTransaction } from "../modules/external-agents/index.js";
import { canConfigureAgentConnection } from "../modules/agent-lifecycle/index.js";
export const museCredentialHash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
export type MuseCredentialKind = typeof credentials.$inferSelect.kind;
export type MuseIdentityDatabase = Db | ExternalAdmissionTransaction;
export async function assertMuseCurrentAuthority(db: MuseIdentityDatabase, b: typeof bindings.$inferSelect, allowSetup = false, allowPaused = false) {
  const [agent] = await db.select().from(agents).where(and(eq(agents.id,b.agentId),eq(agents.companyId,b.companyId)));
  const [company] = await db.select().from(companies).where(eq(companies.id,b.companyId));
  const [user] = await db.select({id:authUsers.id}).from(authUsers).where(eq(authUsers.id,b.operatorId));
  const [member] = await db.select().from(companyMemberships).where(and(eq(companyMemberships.companyId,b.companyId),eq(companyMemberships.principalType,"user"),eq(companyMemberships.principalId,b.operatorId),eq(companyMemberships.status,"active")));
  const [agentMember] = await db.select({id:companyMemberships.id}).from(companyMemberships).where(and(eq(companyMemberships.companyId,b.companyId),eq(companyMemberships.principalType,"agent"),eq(companyMemberships.principalId,b.agentId),eq(companyMemberships.status,"active")));
  if (b.qualificationExpiresAt && b.qualificationExpiresAt<=new Date())throw forbidden("Muse qualification deadline elapsed; native effects are fenced.");
  if (!user || !agentMember || !member || member.membershipRole==="viewer" || !agent || company?.status!=="active"
    || agent.adapterType!=="paperclip_runner" || agent.adapterConfig.provider!=="muse" || agent.adapterConfig.museBindingId!==b.id
    || ["terminated","pending_approval"].includes(agent.status)
    || (!allowPaused && (allowSetup ? !canConfigureAgentConnection(agent) : agent.status==="paused"))
    || (!allowSetup && b.status!=="ready")) throw forbidden("Muse connection authority is unavailable.");
  return agent;
}

function expectedMuseResource(value?:string) {
  try {
    const resource=value??musePublicOrigin()+MUSE_RESOURCE_PATH;
    const url=new URL(resource);
    return resource===musePublicOrigin(url.origin)+MUSE_RESOURCE_PATH?resource:null;
  }catch{return null;}
}

/** Revalidate an issued subject without exposing either credential table to callers. */
export async function assertMuseSubjectCredential(db: MuseIdentityDatabase, s: AgentConnectionSubject, expectedResource?:string) {
  const [b] = await db.select().from(bindings).where(and(eq(bindings.id,s.bindingId),eq(bindings.companyId,s.companyId),
    eq(bindings.agentId,s.agentId),eq(bindings.generation,s.generation),eq(bindings.operatorId,s.authorizingUserId),isNull(bindings.revokedAt)));
  if (!b || (b.qualificationExpiresAt && b.qualificationExpiresAt <= new Date())) throw unauthorized("Muse authority was fenced.");
  if (s.credentialSource === "oauth") {
    const [row] = await db.select({grant:mcpOauthGrants}).from(mcpOauthTokens).innerJoin(mcpOauthGrants,eq(mcpOauthGrants.id,mcpOauthTokens.grantId))
      .where(and(eq(mcpOauthTokens.id,s.credentialId),eq(mcpOauthTokens.grantId,s.grantId),eq(mcpOauthTokens.kind,"access"),
        isNull(mcpOauthTokens.usedAt),gt(mcpOauthTokens.expiresAt,new Date()),isNull(mcpOauthGrants.revokedAt),
        eq(mcpOauthGrants.purpose,"agent"),eq(mcpOauthGrants.companyId,s.companyId),eq(mcpOauthGrants.agentId,s.agentId),eq(mcpOauthGrants.userId,s.authorizingUserId)));
    if (!row || b.grantId !== s.grantId || !row.grant.scopes.includes("paperclip:agent")
        || !row.grant.scopes.includes("offline_access") || row.grant.resource !== expectedMuseResource(expectedResource)) throw unauthorized("Muse OAuth authority was fenced.");
  } else {
    const [c] = await db.select({id:credentials.id}).from(credentials).where(and(eq(credentials.id,s.credentialId),
      eq(credentials.companyId,s.companyId),eq(credentials.bindingId,s.bindingId),eq(credentials.bindingGeneration,s.generation),
      eq(credentials.kind,"access"),isNull(credentials.revokedAt),isNull(credentials.consumedAt),gt(credentials.expiresAt,new Date())));
    if (!c || b.grantId) throw unauthorized("Muse test credential is unavailable.");
  }
  return b;
}
/** Strict OAuth revocation never inherits the legacy cleanup exception. */
export async function revokeMuseOAuthGrant(db: Db, grant: typeof mcpOauthGrants.$inferSelect) {
  if (grant.purpose !== "agent" || !grant.agentId) return;
  const {museRunnerBroker}=await import("./muse-runner-broker.js");
  await museRunnerBroker(db).revokeOAuthGrant({grantId:grant.id,companyId:grant.companyId,agentId:grant.agentId,authorizingUserId:grant.userId});
}
/** Safe lifecycle facts shared by public polling and board status; no token values. */
export async function inspectMuseConnectionCredential(db:MuseIdentityDatabase,b:typeof bindings.$inferSelect,expectedResource?:string):Promise<{state:"pending"|"active"|"expired"|"revoked";refreshExpiresAt:string|null}> {
  const now=new Date(),result=(state:"pending"|"active"|"expired"|"revoked",refreshExpiresAt:Date|null=null)=>({state,refreshExpiresAt:refreshExpiresAt?.toISOString()??null});
  if(b.revokedAt)return result("revoked");
  if(!b.pairedAt)return result(b.ticketExpiresAt&&b.ticketExpiresAt>now?"pending":"expired");
  if(!b.workerActivityAt||b.workerActivityAt.getTime()+MUSE_REFRESH_INACTIVITY_MS<=now.getTime())return result("expired");
  if(b.grantId){
    const [grant]=await db.select().from(mcpOauthGrants).where(and(eq(mcpOauthGrants.id,b.grantId),eq(mcpOauthGrants.companyId,b.companyId),
      eq(mcpOauthGrants.agentId,b.agentId),eq(mcpOauthGrants.userId,b.operatorId),eq(mcpOauthGrants.purpose,"agent")));
    if(!grant||grant.revokedAt||!grant.scopes.includes("paperclip:agent")||!grant.scopes.includes("offline_access")||grant.resource!==expectedMuseResource(expectedResource))return result("revoked");
    const [refresh]=await db.select({expiresAt:mcpOauthTokens.expiresAt}).from(mcpOauthTokens).where(and(eq(mcpOauthTokens.grantId,grant.id),
      eq(mcpOauthTokens.kind,"refresh"),isNull(mcpOauthTokens.usedAt),gt(mcpOauthTokens.expiresAt,now))).limit(1);
    if(refresh)return result("active",refresh.expiresAt);
    const {mcpOauthRequests}=await import("@paperclipai/db");
    const [code]=await db.select({id:mcpOauthRequests.id}).from(mcpOauthRequests).where(and(eq(mcpOauthRequests.grantId,grant.id),
      eq(mcpOauthRequests.resource,grant.resource),isNotNull(mcpOauthRequests.codeHash),isNotNull(mcpOauthRequests.decidedAt),isNull(mcpOauthRequests.consumedAt),gt(mcpOauthRequests.expiresAt,now))).limit(1);
    return result(code?"pending":"expired");
  }
  const [refresh]=await db.select({expiresAt:credentials.expiresAt}).from(credentials).where(and(eq(credentials.companyId,b.companyId),eq(credentials.bindingId,b.id),
    eq(credentials.bindingGeneration,b.generation),eq(credentials.kind,"refresh"),isNull(credentials.revokedAt),isNull(credentials.consumedAt),gt(credentials.expiresAt,now))).limit(1);
  return result(refresh?"active":"expired",refresh?.expiresAt??null);
}
/** Public polling uses persisted identity policy, never a fabricated worker subject. */
export async function assertMuseReceiverAuthority(db:MuseIdentityDatabase,b:typeof bindings.$inferSelect,expectedResource?:string) {
  const credential=await inspectMuseConnectionCredential(db,b,expectedResource);
  if(credential.state!=="active")throw unauthorized("Muse receiver credential authority is unavailable; reconnect Muse.");
  return assertMuseCurrentAuthority(db,b,true,true);
}

export function museIdentity(db: Db) {
  async function enabled() { const s=await instanceSettingsService(db).getExperimental(); return s.enableMuse && s.enableNativeRunner; }
  async function issue(tx: ExternalAdmissionTransaction, b: typeof bindings.$inferSelect, familyId: string=randomUUID()): Promise<MuseCredentials> {
    const accessToken=token(), refreshToken=token(), cleanupToken=token(), detectorCleanupToken=token();
    const accessExpiresAt=new Date(Date.now()+MUSE_ACCESS_TTL_MS), refreshExpiresAt=new Date(Date.now()+MUSE_REFRESH_INACTIVITY_MS);
    await tx.insert(credentials).values(([['access',accessToken,accessExpiresAt],['refresh',refreshToken,refreshExpiresAt],['cleanup',cleanupToken,refreshExpiresAt],['detector_cleanup',detectorCleanupToken,refreshExpiresAt]] as const).map(([kind,value,expiresAt])=>({companyId:b.companyId,bindingId:b.id,bindingGeneration:b.generation,kind,familyId,tokenHash:museCredentialHash(value),expiresAt})));
    return {version:1,bindingId:b.id,generation:b.generation,companyId:b.companyId,agentId:b.agentId,accessToken,accessExpiresAt:accessExpiresAt.toISOString(),refreshToken,refreshExpiresAt:refreshExpiresAt.toISOString(),cleanupToken,detectorCleanupToken};
  }
  async function expireQualification(b: typeof bindings.$inferSelect) {
    if (b.qualificationExpiresAt && b.qualificationExpiresAt<=new Date()) {
      const { museRunnerBroker }=await import("./muse-runner-broker.js");
      await museRunnerBroker(db).endQualification({companyId:b.companyId,agentId:b.agentId,bindingId:b.id,qualificationId:b.qualificationId!,operatorId:b.operatorId});
      throw unauthorized("Muse qualification deadline elapsed; normal authority was fenced.");
    }
  }
  return {
    enabled,
    async authenticateOAuthAccess(value:string,publicOrigin?:string):Promise<AgentConnectionSubject> {
      const {museOAuth}=await import("./muse-oauth.js");
      const principal=await museOAuth(db,publicOrigin).authenticateAccess(value);
      const [b]=await db.select().from(bindings).where(and(eq(bindings.grantId,principal.grant.id),eq(bindings.companyId,principal.grant.companyId),
        eq(bindings.agentId,principal.grant.agentId!),eq(bindings.operatorId,principal.grant.userId),isNull(bindings.revokedAt)));
      if(!b)throw unauthorized("Muse OAuth binding is unavailable.");
      await expireQualification(b);
      const subject:AgentConnectionSubject={provider:"muse",credentialSource:"oauth",grantId:principal.grant.id,companyId:b.companyId,
        agentId:b.agentId,bindingId:b.id,generation:b.generation,authorizingUserId:b.operatorId,credentialId:principal.accessTokenId};
      const expectedResource=musePublicOrigin(publicOrigin)+MUSE_RESOURCE_PATH;
      await assertMuseSubjectCredential(db,subject,expectedResource);await assertMuseReceiverAuthority(db,b,expectedResource);
      await db.update(bindings).set({workerActivityAt:new Date()}).where(and(eq(bindings.id,b.id),eq(bindings.grantId,principal.grant.id),isNull(bindings.revokedAt)));
      await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()+MUSE_REFRESH_INACTIVITY_MS)}).where(and(eq(mcpOauthTokens.grantId,principal.grant.id),
        eq(mcpOauthTokens.kind,"refresh"),isNull(mcpOauthTokens.usedAt),gt(mcpOauthTokens.expiresAt,new Date())));
      return subject;
    },
    async pair(ticket: string, clientVersion: string): Promise<MuseCredentials> {
      if (!await enabled()) throw forbidden("Muse is disabled for new connections.");
      const [candidate]=await db.select().from(bindings).where(eq(bindings.ticketHash,museCredentialHash(ticket)));
      if (!candidate) throw unauthorized("Pairing ticket expired or was consumed.");
      return db.transaction(tx=>withExternalAdmissionGuard(tx,candidate.companyId,candidate.agentId,async()=>{
        const [b]=await tx.select().from(bindings).where(and(eq(bindings.id,candidate.id),eq(bindings.ticketHash,museCredentialHash(ticket)),eq(bindings.status,"pairing"),isNull(bindings.revokedAt),gt(bindings.ticketExpiresAt,new Date()))).for("update");
        if (!b) throw unauthorized("Pairing ticket expired or was consumed.");
        await assertMuseCurrentAuthority(tx,b,true);
        const [paired]=await tx.update(bindings).set({status:"connected",ticketHash:null,ticketExpiresAt:null,pairedAt:new Date(),workerActivityAt:new Date(),clientVersion,revision:b.revision+1,updatedAt:new Date()}).where(eq(bindings.id,b.id)).returning();
        return issue(tx,paired!);
      }));
    },
    async refresh(value: string): Promise<MuseCredentials> {
      if (!await enabled()) throw forbidden("Muse normal credentials are disabled.");
      const [candidate]=await db.select().from(credentials).where(and(eq(credentials.tokenHash,museCredentialHash(value)),eq(credentials.kind,"refresh")));
      if (!candidate) throw unauthorized("Refresh credential is unavailable; reconnect Muse.");
      const [b]=await db.select().from(bindings).where(eq(bindings.id,candidate.bindingId));
      if (!b) throw unauthorized();
      await expireQualification(b);
      // Replay revocation must commit even though the request is then rejected.
      const result=await db.transaction(tx=>withExternalAdmissionGuard(tx,b.companyId,b.agentId,async()=>{
        const [binding]=await tx.select().from(bindings).where(eq(bindings.id,b.id)).for("update");
        const [old]=await tx.select().from(credentials).where(eq(credentials.id,candidate.id)).for("update");
        if (old?.consumedAt) {
          await tx.update(credentials).set({revokedAt:new Date()}).where(and(eq(credentials.familyId,old.familyId),inArray(credentials.kind,["access","refresh","signal"])));
          return null;
        }
        if (!binding || binding.revokedAt || binding.generation!==old?.bindingGeneration || old.revokedAt || old.expiresAt<=new Date()) return null;
        await assertMuseCurrentAuthority(tx,binding,true,true);
        await tx.update(credentials).set({consumedAt:new Date()}).where(eq(credentials.id,old.id));
        await tx.update(credentials).set({revokedAt:new Date()}).where(and(eq(credentials.familyId,old.familyId),eq(credentials.bindingId,binding.id),inArray(credentials.kind,["access","signal"])));
        await tx.update(bindings).set({workerActivityAt:new Date(),updatedAt:new Date()}).where(eq(bindings.id,binding.id));
        return issue(tx,binding,old.familyId);
      }));
      if (!result) throw unauthorized("Refresh replay, expiry, or lost rotation requires reconnect.");
      return result;
    },
    async authenticate(value: string, kind: MuseCredentialKind="access"): Promise<AgentConnectionSubject> {
      if (kind === "signal") throw unauthorized("Signal credentials are no longer supported.");
      const [c]=await db.select().from(credentials).where(and(eq(credentials.tokenHash,museCredentialHash(value)),eq(credentials.kind,kind),isNull(credentials.revokedAt),isNull(credentials.consumedAt),gt(credentials.expiresAt,new Date())));
      const [b]=c?await db.select().from(bindings).where(and(eq(bindings.id,c.bindingId),eq(bindings.companyId,c.companyId))):[];
      if (!c || !b) throw unauthorized("Muse credential is unavailable.");
      const cleanup=kind==="cleanup" || kind==="detector_cleanup";
      if (cleanup) {
        if (!b.revokedAt || !b.cleanupExpiresAt || b.cleanupExpiresAt<=new Date() || c.bindingGeneration!==b.generation) throw unauthorized("Cleanup authority expired.");
      } else {
        await expireQualification(b);
        if (!await enabled() || b.revokedAt || c.bindingGeneration!==b.generation) throw unauthorized("Muse authority was fenced.");
        await assertMuseCurrentAuthority(db,b,true,true);
        if (kind==="access") {
          await db.update(bindings).set({workerActivityAt:new Date()}).where(and(eq(bindings.id,b.id),eq(bindings.generation,b.generation),isNull(bindings.revokedAt)));
          await db.update(credentials).set({expiresAt:new Date(Date.now()+MUSE_REFRESH_INACTIVITY_MS)}).where(and(eq(credentials.bindingId,b.id),eq(credentials.bindingGeneration,b.generation),eq(credentials.familyId,c.familyId),eq(credentials.kind,"refresh"),isNull(credentials.consumedAt),isNull(credentials.revokedAt)));
        }
      }
      return {provider:"muse",credentialSource:"legacy",companyId:b.companyId,agentId:b.agentId,bindingId:b.id,generation:c.bindingGeneration,authorizingUserId:b.operatorId,credentialId:c.id};
    },
  };
}
