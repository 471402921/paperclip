import express from "express";
import { activityLog, documents, issueDocuments } from "@paperclipai/db";
import request from "supertest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { agents, agentWakeupRequests, authUsers, companies, companyMemberships, createDb, closeRegisteredClients, applyPendingMigrations, externalAgentHolds, heartbeatRuns, issueAccessGrants, issueComments, issues, projects, principalPermissionGrants, mcpOauthGrants, mcpOauthRequests, mcpOauthTokens, dotAgentBindings, dotRunnerAssignments, dotRunnerOperations, museIdleReceipts, museAgentBindings as bindings, museCredentials, museInputDeliveries, museReceiverContactBuckets, museMailboxItems as mailbox, museRunnerAssignments as assignments, museRunnerOperations as operations, nativeRunFinalizations } from "@paperclipai/db";
import { heartbeatService } from "../services/heartbeat.js";
import { startAgentLifecycle } from "../services/agent-lifecycle.js";
import { agentHarnessVerificationService } from "../services/agent-harness-verification.js";
import type { PluginWorkerManager } from "../services/plugin-worker-manager.js";
import { MUSE_PUBLIC_ROUTES, MUSE_CLIENT_VERSION, type MuseCredentials } from "@paperclipai/shared";
import { startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { museOAuth } from "../services/muse-oauth.js";
import { createPublicMcpOAuth, hashMcpSecret } from "../services/public-mcp/oauth.js";
import { dotRunnerBroker } from "../services/dot-runner-broker.js";
import { inspectMuseConnectionCredential, assertMuseSubjectCredential } from "../services/muse-identity.js";
import { sql } from "drizzle-orm";
import { museIdentity, museCredentialHash } from "../services/muse-identity.js";
import * as museIdentityModule from "../services/muse-identity.js";
import { museTransportRoutes } from "../routes/muse.js";
import { errorHandler } from "../middleware/error-handler.js";
import { museRunnerBroker } from "../services/muse-runner-broker.js";
import { museReceiver } from "../services/muse-receiver.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { assertNoExternalOverlap, withExternalAdmissionGuard } from "../modules/external-agents/index.js";
import { digestPaperclipSemanticContent, externalOperationDigest, type ExternalProviderOperation } from "../vendor/paperclip-runner/index.js";

/** Real database/transport authority tests; synthetic provider receipts do not
 * count as live Muse/native qualification evidence. */
describe("personal Muse control plane",()=>{
  let temporary:Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>|undefined,db:ReturnType<typeof createDb>,externalDatabaseUrl:string|undefined;
  beforeAll(async()=>{
    externalDatabaseUrl=process.env.PAPERCLIP_MUSE_CONTROL_TEST_DATABASE_URL?.trim();
    if(externalDatabaseUrl){await applyPendingMigrations(externalDatabaseUrl);db=createDb(externalDatabaseUrl);}
    else {temporary=await startEmbeddedPostgresTestDatabase("muse-control-");db=createDb(temporary.connectionString);}
    await instanceSettingsService(db).updateExperimental({enableNativeRunner:true,enableMuse:true});
  },30000);
  afterAll(async()=>{vi.unstubAllEnvs();await museReceiver(db).stop();if(externalDatabaseUrl)await closeRegisteredClients(externalDatabaseUrl);await temporary?.cleanup();});
  async function fixture(ready=true) {
    const operatorId=randomUUID();await db.insert(authUsers).values({id:operatorId,name:"Muse authorizer",email:operatorId+"@example.test",createdAt:new Date(),updatedAt:new Date()});
    const [company]=await db.insert(companies).values({name:"Muse control",issuePrefix:"MU"+randomBytes(3).toString("hex")}).returning();
    const [agent]=await db.insert(agents).values({companyId:company.id,name:"Muse",role:"engineer",status:"active",adapterType:"paperclip_runner",adapterConfig:{provider:"muse",allowUnmeteredProvider:true,lifecycle:"per_turn"},permissions:{canCreateTasks:true}}).returning();
    await db.insert(companyMemberships).values([{companyId:company.id,principalType:"user",principalId:operatorId,membershipRole:"owner",status:"active"},{companyId:company.id,principalType:"agent",principalId:agent.id,membershipRole:"member",status:"active"}]);
    const ticket=randomBytes(32).toString("base64url");const [binding]=await db.insert(bindings).values({companyId:company.id,agentId:agent.id,operatorId,ticketHash:museCredentialHash(ticket),ticketExpiresAt:new Date(Date.now()+600000)}).returning();
    await db.update(agents).set({adapterConfig:{...agent.adapterConfig,museBindingId:binding.id}}).where(eq(agents.id,agent.id));
    const identity=museIdentity(db),credentials=await identity.pair(ticket,"2"),broker=museRunnerBroker(db,{publicOrigin:"https://paperclip.example",heartbeat:{wakeup:vi.fn().mockResolvedValue(null),cancelRun:vi.fn()}});
    if(ready)await db.update(bindings).set({status:"ready",receiverContactAt:new Date(),verifiedReplyAt:new Date()}).where(eq(bindings.id,binding.id));
    return {company,agent,operatorId,binding,ticket,identity,credentials,broker,subject:await identity.authenticate(credentials.accessToken)};
  }
  function transport(allowLegacyCredentials=false) { const app=express();app.use(museTransportRoutes(db,"https://paperclip.example",{allowLegacyCredentials}));app.use(errorHandler);return app; }
  const oauthOrigin="https://paperclip.example",oauthResource=oauthOrigin+"/api/muse/v1",oauthCallback="https://authd.example/callback";
  async function oauthFixture(ready=false,authorize=true) {
    const f=await fixture(false),ticket=randomBytes(32).toString("base64url");
    // This fixture starts the production OAuth journey from an unredeemed binding.
    await db.delete(museCredentials).where(eq(museCredentials.bindingId,f.binding.id));
    await db.update(bindings).set({status:"pairing",pairedAt:null,workerActivityAt:null,ticketHash:museCredentialHash(ticket),ticketExpiresAt:new Date(Date.now()+600000)}).where(eq(bindings.id,f.binding.id));
    const oauth=museOAuth(db,oauthOrigin),client=await oauth.register({client_name:"Muse authd",redirect_uris:[oauthCallback],token_endpoint_auth_method:"none",grant_types:["authorization_code","refresh_token"]},randomUUID());
    const verifier=randomBytes(32).toString("base64url"),input={client_id:client.client_id,redirect_uri:oauthCallback,response_type:"code",scope:"paperclip:agent offline_access",state:"opaque-state+/☂",code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256",pairing_ticket:ticket};
    const authorizationUrl=authorize?await oauth.authorize(input):undefined;
    const tokenInput=()=>({grant_type:"authorization_code",client_id:client.client_id,redirect_uri:oauthCallback,code:new URL(authorizationUrl!).searchParams.get("code")!,code_verifier:verifier});
    const tokens=ready?await oauth.token(tokenInput()):undefined;
    const subject=tokens?await f.identity.authenticateOAuthAccess(tokens.access_token,oauthOrigin):f.subject;
    if(ready)await db.update(bindings).set({status:"ready",receiverContactAt:new Date(),verifiedReplyAt:new Date()}).where(eq(bindings.id,f.binding.id));
    const [binding]=await db.select().from(bindings).where(eq(bindings.id,f.binding.id));
    return {...f,binding,ticket,oauth,client,verifier,input,authorizationUrl,tokenInput,tokens,subject};
  }
  async function active(provided?:Awaited<ReturnType<typeof fixture>>,afterSettle?: (command:ExternalProviderOperation)=>Promise<void>) {
    const f=provided??await fixture(),runId=randomUUID(),session=randomUUID(),turnId="turn_"+randomUUID();
    const [issue]=await db.insert(issues).values({companyId:f.company.id,title:"Muse task",status:"in_progress",assigneeAgentId:f.agent.id,responsibleUserId:f.operatorId}).returning();
    await db.insert(heartbeatRuns).values({id:runId,companyId:f.company.id,agentId:f.agent.id,status:"running",runtimeMode:"native",driverKind:"muse_external",nativeIssueId:issue.id,nativeSessionId:session,nativePhase:"turn_running",responsibleUserId:f.operatorId});
    await db.update(issues).set({checkoutRunId:runId,executionRunId:runId}).where(eq(issues.id,issue.id));
    await db.insert(nativeRunFinalizations).values({runId,companyId:f.company.id,issueId:issue.id,phase:"running",controllerGeneration:1,leaseExpiresAt:new Date(Date.now()+600000)});
    const execution={binding:{companyId:f.company.id,agentId:f.agent.id,runId},provider:{binding:await f.broker.snapshot(f.company.id,f.agent.id,f.binding.id)}};
    const port=f.broker.port(execution),sent:ExternalProviderOperation[]=[];
    const detach=await port.attach(async command=>{sent.push(command);await port.settle({sourceEventId:"settle_"+command.requestId,payload:{binding:ref,requestId:command.requestId,outcome:command.action==="consume_input"?{status:"consumed",requestId:command.input.requestId,inputDigest:command.input.inputDigest}:{status:command.action==="accept"?"accepted":"completed"}}});await afterSettle?.(command);});
    const ref={...execution.provider.binding,runId,normalizedSessionId:session,turnId,assignmentRevision:1};
    await port.dispatch({sourceEventId:"offer_"+randomUUID(),payload:{kind:"assignment",binding:ref,tools:[],acceptByUnixMs:Date.now()+600000,expiresAtUnixMs:Date.now()+3600000}});
    const [assignment]=await db.select().from(assignments).where(eq(assignments.runId,runId));
    return {...f,runId,issue,port,ref,assignment,sent,detach};
  }
  it("consumes a ten-minute ticket once and separates credential lanes",async()=>{
    const f=await fixture(false);await expect(f.identity.pair(f.ticket,"2")).rejects.toThrow("consumed");
    expect(f.credentials).not.toHaveProperty("signalToken");
    await expect(f.identity.authenticate(f.credentials.cleanupToken)).rejects.toThrow();
    await expect(f.identity.authenticate(f.credentials.accessToken,"signal")).rejects.toThrow();
    const legacySignal=randomBytes(32).toString("base64url");await db.insert(museCredentials).values({companyId:f.company.id,bindingId:f.binding.id,bindingGeneration:1,kind:"signal",familyId:randomUUID(),tokenHash:museCredentialHash(legacySignal),expiresAt:new Date(Date.now()+600000)});
    await expect(f.identity.authenticate(legacySignal,"signal")).rejects.toThrow("no longer supported");
    await db.delete(museCredentials).where(eq(museCredentials.tokenHash,museCredentialHash(legacySignal)));
    const rows=await db.select().from(museCredentials).where(eq(museCredentials.bindingId,f.binding.id));
    expect(rows).toHaveLength(4);expect(rows.some(r=>r.kind==="signal")).toBe(false);expect(rows.some(r=>r.tokenHash===f.credentials.accessToken)).toBe(false);
    expect(new Date(f.credentials.accessExpiresAt).getTime()-Date.now()).toBeLessThanOrEqual(15*60000);
  });
  it("rotates refresh once and commits family revocation on consumed-token replay",async()=>{
    const f=await fixture(),rotated=await f.identity.refresh(f.credentials.refreshToken);
    await expect(f.identity.authenticate(f.credentials.accessToken)).rejects.toThrow();
    await expect(f.identity.refresh(f.credentials.refreshToken)).rejects.toThrow("replay");
    await expect(f.identity.authenticate(rotated.accessToken)).rejects.toThrow();
    await expect(museReceiver(db).signal(f.binding.id)).rejects.toMatchObject({status:410});
  });
  it("polling does not extend refresh inactivity and independent contact creates the first challenge",async()=>{
    const f=await fixture(false);
    const [before]=await db.select().from(museCredentials).where(and(eq(museCredentials.bindingId,f.binding.id),eq(museCredentials.kind,"refresh")));
    expect((await museReceiver(db).signal(f.binding.id)).signal).toBeNull();await museReceiver(db).flush();
    expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))?.backgroundReplyVerified).toBe(false);
    const [after]=await db.select().from(museCredentials).where(eq(museCredentials.id,before.id));expect(after.expiresAt).toEqual(before.expiresAt);
    const items=await f.broker.inspect(f.subject,{version:1,query:"mailbox",after:0}) as {items:Array<{references:{nonce:string}}>};expect(items.items).toHaveLength(1);
    const requestId = randomUUID(), nonce = items.items[0].references.nonce;
    await f.broker.act(f.subject,{version:1,command:"challenge.confirm",nonce,requestId});
    expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))?.backgroundReplyVerified).toBe(true);
    const logs = await db.select().from(activityLog).where(and(eq(activityLog.companyId,f.company.id),eq(activityLog.action,"muse.background_reply_verified")));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({actorType:"agent",actorId:f.agent.id,agentId:f.agent.id,responsibleUserId:f.operatorId,details:{bindingId:f.binding.id,generation:1,authorizingUserId:f.operatorId,requestId}});
    expect(JSON.stringify(logs)).not.toContain(nonce);
  });
  it("retains a mailbox batch until its prior durable cursor is acknowledged",async()=>{
    const f=await fixture();await db.insert(mailbox).values({companyId:f.company.id,bindingId:f.binding.id,bindingGeneration:1,kind:"follow_up",sourceEventId:randomUUID(),references:{}});
    const batch=await f.broker.inspect(f.subject,{version:1,query:"mailbox",after:0}) as {nextCursor:number};
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].workerCursor).toBe(0);
    await f.broker.inspect(f.subject,{version:1,query:"mailbox",after:batch.nextCursor});
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].workerCursor).toBe(batch.nextCursor);
  });
  it("filters current idle task visibility even with global privacy disabled",async()=>{
    vi.stubEnv("PAPERCLIP_ISSUE_PRIVACY_MODE","off");const f=await fixture();
    const other=randomUUID();await db.insert(authUsers).values({id:other,name:"other",email:other+"@example.test",createdAt:new Date(),updatedAt:new Date()});
    const [issue]=await db.insert(issues).values({companyId:f.company.id,title:"secret",visibility:"private",responsibleUserId:other,assigneeAgentId:f.agent.id}).returning();
    expect((await f.broker.inspect(f.subject,{version:1,query:"task.list"}) as {tasks:unknown[]}).tasks).toEqual([]);
    await db.insert(issueAccessGrants).values({issueId:issue.id,subjectType:"user",subjectId:f.operatorId,source:"explicit"});
    expect((await f.broker.inspect(f.subject,{version:1,query:"task.list"}) as {tasks:unknown[]}).tasks).toHaveLength(1);
    await db.update(companyMemberships).set({status:"inactive"}).where(and(eq(companyMemberships.companyId,f.company.id),eq(companyMemberships.principalId,f.operatorId)));
    await expect(f.broker.inspect(f.subject,{version:1,query:"task.read",issueId:issue.id})).rejects.toThrow();vi.unstubAllEnvs();
  });
  async function idleReadFixture() {
    const f=await oauthFixture(true);
    const [allowedProject,outsideProject]=await db.insert(projects).values([
      {companyId:f.company.id,name:"Allowed project"},{companyId:f.company.id,name:"Outside project"},
    ]).returning();
    await db.update(agents).set({permissions:{trustPreset:"low_trust_review",authorizationPolicy:{trustBoundary:{mode:"low_trust_review",companyId:f.company.id,projectIds:[allowedProject.id]}}}}).where(eq(agents.id,f.agent.id));
    const [allowed,outside]=await db.insert(issues).values([
      {companyId:f.company.id,projectId:allowedProject.id,title:"idle-scope allowed",description:"allowed task content"},
      {companyId:f.company.id,projectId:outsideProject.id,title:"idle-scope forbidden",description:"outside task content"},
    ]).returning();
    for(const issue of [allowed,outside]) {
      await db.insert(issueComments).values({companyId:f.company.id,issueId:issue.id,authorType:"user",authorUserId:f.operatorId,body:issue.title+" history"});
      const [document]=await db.insert(documents).values({companyId:f.company.id,title:issue.title,latestBody:issue.title+" document"}).returning();
      await db.insert(issueDocuments).values({companyId:f.company.id,issueId:issue.id,documentId:document.id,key:"plan"});
    }
    return {...f,allowedProject,outsideProject,allowed,outside};
  }
  it.each(["task.read","task.history","task.document.read"] as const)("enforces ordinary low-trust authorization for idle %s",async(query)=>{
    const f=await idleReadFixture();
    const request=(issueId:string)=>query==="task.document.read"?{version:1 as const,query,issueId,key:"plan"}:{version:1 as const,query,issueId};
    await expect(f.broker.inspect(f.subject,request(f.outside.id))).rejects.toThrow("unavailable");
    expect(JSON.stringify(await f.broker.inspect(f.subject,request(f.allowed.id)))).toContain("idle-scope allowed");
    await db.update(agents).set({permissions:{trustPreset:"low_trust_review",authorizationPolicy:{trustBoundary:{mode:"low_trust_review",companyId:f.company.id,projectIds:[f.outsideProject.id]}}}}).where(eq(agents.id,f.agent.id));
    await expect(f.broker.inspect(f.subject,request(f.allowed.id))).rejects.toThrow("unavailable");
    expect(JSON.stringify(await f.broker.inspect(f.subject,request(f.outside.id)))).toContain("idle-scope forbidden");
  });
  it.each(["task.list","task.search"] as const)("filters idle %s with ordinary authorization without exposing restricted cursors",async(query)=>{
    const f=await idleReadFixture();
    const request=query==="task.search"?{version:1 as const,query,text:"idle-scope"}:{version:1 as const,query};
    const page=await f.broker.inspect(f.subject,request) as {tasks:Array<{id:string;title:string}>,nextCursor:string|null};
    expect(page.tasks.map(task=>task.id)).toEqual([f.allowed.id]);expect(page.nextCursor).toBe(f.allowed.id);
    expect(JSON.stringify(page)).not.toContain(f.outside.id);expect(JSON.stringify(page)).not.toContain(f.outside.title);
  });
  it.each(["task.list","task.search"] as const)("fills bounded authorized pages after rejected idle %s candidates",async(query)=>{
    const f=await idleReadFixture();await db.delete(issues).where(eq(issues.companyId,f.company.id));
    const ids=(high:boolean)=>Array.from({length:51},()=>`${high?"f0000000":"00000000"}-${randomBytes(2).toString("hex")}-4${randomBytes(2).toString("hex").slice(1)}-8${randomBytes(2).toString("hex").slice(1)}-${randomBytes(6).toString("hex")}`).sort();
    const denied=ids(false),allowed=ids(true);
    await db.insert(issues).values([...denied.map(id=>({id,companyId:f.company.id,projectId:f.outsideProject.id,title:"pagination-forbidden"})),...allowed.map(id=>({id,companyId:f.company.id,projectId:f.allowedProject.id,title:"pagination-allowed"}))]);
    const request=query==="task.search"?{version:1 as const,query,text:"pagination"}:{version:1 as const,query};
    const first=await f.broker.inspect(f.subject,request) as {tasks:Array<{id:string}>,nextCursor:string};
    expect(first.tasks.map(task=>task.id)).toEqual(allowed.slice(0,50));expect(first.nextCursor).toBe(allowed[49]);
    const last=await f.broker.inspect(f.subject,{...request,after:first.nextCursor}) as {tasks:Array<{id:string}>,nextCursor:string};
    expect(last.tasks.map(task=>task.id)).toEqual(allowed.slice(50));expect(last.nextCursor).toBe(allowed[50]);
    expect((await f.broker.inspect(f.subject,{...request,after:last.nextCursor}) as {tasks:unknown[]}).tasks).toEqual([]);
    for(const id of denied)expect(JSON.stringify([first,last])).not.toContain(id);
  });
  it.each(["task.list","task.search"] as const)("fails closed at the authorized scan limit for idle %s and accepts narrower search",async(query)=>{
    const f=await idleReadFixture();await db.delete(issues).where(eq(issues.companyId,f.company.id));
    const denied=Array.from({length:201},()=>`00000000-${randomBytes(2).toString("hex")}-4${randomBytes(2).toString("hex").slice(1)}-8${randomBytes(2).toString("hex").slice(1)}-${randomBytes(6).toString("hex")}`);
    const allowedId=`f0000000-${randomBytes(2).toString("hex")}-4${randomBytes(2).toString("hex").slice(1)}-8${randomBytes(2).toString("hex").slice(1)}-${randomBytes(6).toString("hex")}`;
    await db.insert(issues).values([...denied.map(id=>({id,companyId:f.company.id,projectId:f.outsideProject.id,title:"bounded-collection forbidden"})),{id:allowedId,companyId:f.company.id,projectId:f.allowedProject.id,title:"bounded-collection narrow-match"}]);
    const request=query==="task.search"?{version:1 as const,query,text:"bounded-collection"}:{version:1 as const,query};
    await expect(f.broker.inspect(f.subject,request)).rejects.toMatchObject({status:422,message:"Task collection exceeds its read limit. Use task.search with a narrower query."});
    const narrow=await f.broker.inspect(f.subject,{version:1,query:"task.search",text:"narrow-match"}) as {tasks:Array<{id:string}>,nextCursor:string};
    expect(narrow.tasks.map(task=>task.id)).toEqual([allowedId]);expect(narrow.nextCursor).toBe(allowedId);
  },30000);
  it("uses only the current server-derived human-directed run context for native assignment reads",async()=>{
    const f=await active(await oauthFixture(true));try {
      const [project]=await db.insert(projects).values({companyId:f.company.id,name:"Unrelated allowed project"}).returning();
      await db.update(agents).set({permissions:{trustPreset:"low_trust_review",authorizationPolicy:{trustBoundary:{mode:"low_trust_review",companyId:f.company.id,projectIds:[project.id]}}}}).where(eq(agents.id,f.agent.id));
      await db.update(issues).set({visibility:"private"}).where(eq(issues.id,f.issue.id));
      await db.update(heartbeatRuns).set({contextSnapshot:{issueId:f.issue.id}}).where(eq(heartbeatRuns.id,f.runId));
      const [wake]=await db.insert(agentWakeupRequests).values({companyId:f.company.id,agentId:f.agent.id,runId:f.runId,source:"assignment",status:"claimed",requestedByActorType:"user",requestedByActorId:f.operatorId,payload:{issueId:f.issue.id,_paperclipWakeContext:{source:"issue.update"}}}).returning();
      const idleRequest={version:1 as const,query:"task.read" as const,issueId:f.issue.id,runId:f.runId};
      await expect(f.broker.inspect(f.subject,idleRequest)).rejects.toThrow("unavailable");
      expect(await f.broker.inspect(f.subject,{version:1,query:"assignment.read",assignmentId:f.assignment.id})).toMatchObject({assignmentId:f.assignment.id,status:"offered"});
      await db.update(agentWakeupRequests).set({status:"cancelled"}).where(eq(agentWakeupRequests.id,wake.id));
      await expect(f.broker.inspect(f.subject,{version:1,query:"assignment.read",assignmentId:f.assignment.id})).rejects.toThrow("unavailable");
    }finally{await f.detach();}
  });
  it("rechecks current authorizer grants for every idle task read surface",async()=>{
    const f=await idleReadFixture(),other=randomUUID();
    await db.insert(authUsers).values({id:other,name:"Other author",email:other+"@example.test",createdAt:new Date(),updatedAt:new Date()});
    await db.update(issues).set({visibility:"private",responsibleUserId:other,assigneeAgentId:f.agent.id}).where(eq(issues.id,f.allowed.id));
    const reads=[{version:1 as const,query:"task.read" as const,issueId:f.allowed.id},{version:1 as const,query:"task.history" as const,issueId:f.allowed.id},{version:1 as const,query:"task.document.read" as const,issueId:f.allowed.id,key:"plan"}];
    for(const request of reads)await expect(f.broker.inspect(f.subject,request)).rejects.toThrow();
    const [grant]=await db.insert(issueAccessGrants).values({issueId:f.allowed.id,subjectType:"user",subjectId:f.operatorId,source:"explicit"}).returning();
    for(const request of reads)expect(JSON.stringify(await f.broker.inspect(f.subject,request))).toContain("idle-scope allowed");
    await db.delete(issueAccessGrants).where(eq(issueAccessGrants.id,grant.id));
    for(const request of reads)await expect(f.broker.inspect(f.subject,request)).rejects.toThrow();
    expect((await f.broker.inspect(f.subject,{version:1,query:"task.list"}) as {tasks:unknown[]}).tasks).toEqual([]);
  });
  it("creates visible idle tasks with supported creation authority and a stable mutation receipt",async()=>{
    const f=await fixture(),command={version:1 as const,command:"task.create" as const,requestId:randomUUID(),title:"Idle intake",description:"Ordinary task intake"};
    const result=await f.broker.act(f.subject,command);
    expect(result.status).toBe("created");expect(await f.broker.act(f.subject,command)).toEqual(result);
    const [issue]=await db.select().from(issues).where(eq(issues.id,String(result.issueId)));
    expect(issue.createdByAgentId).toBe(f.agent.id);expect(issue.responsibleUserId).toBe(f.operatorId);expect(issue.status).toBe("todo");
    await expect(f.broker.act(f.subject,{...command,title:"Changed intake"})).rejects.toThrow("changed input");
  });
  it("comments on an idle task using its complete current permission resource",async()=>{
    const f=await fixture();const [issue]=await db.insert(issues).values({companyId:f.company.id,title:"Idle comment",status:"todo",assigneeAgentId:f.agent.id,responsibleUserId:f.operatorId}).returning();
    const command={version:1 as const,command:"task.comment" as const,requestId:randomUUID(),issueId:issue.id,body:"Idle coordination"};
    const result=await f.broker.act(f.subject,command);expect(result.status).toBe("commented");expect(await f.broker.act(f.subject,command)).toEqual(result);
    const rows=await db.select().from(issueComments).where(eq(issueComments.issueId,issue.id));
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({authorAgentId:f.agent.id,authorUserId:null,onBehalfOfUserId:f.operatorId,body:command.body});
    await db.update(companyMemberships).set({membershipRole:"viewer"}).where(and(eq(companyMemberships.companyId,f.company.id),eq(companyMemberships.principalId,f.operatorId)));
    await expect(f.broker.act(f.subject,{...command,requestId:randomUUID()})).rejects.toThrow("authority");
    expect(await db.select().from(issueComments).where(eq(issueComments.issueId,issue.id))).toHaveLength(1);
  });
  it("applies idle creation grants to the actual inherited parent project",async()=>{
    const f=await fixture();const [project]=await db.insert(projects).values({companyId:f.company.id,name:"Protected intake",executionWorkspacePolicy:{authorizationPolicy:{assignmentPolicy:{mode:"protected"}}}}).returning();
    const [parent]=await db.insert(issues).values({companyId:f.company.id,title:"Intake parent",projectId:project.id,status:"todo",assigneeAgentId:f.agent.id,responsibleUserId:f.operatorId}).returning();
    const command={version:1 as const,command:"task.create" as const,requestId:randomUUID(),title:"Scoped child",parentId:parent.id};
    await expect(f.broker.act(f.subject,command)).rejects.toThrow("protected");
    await db.insert(principalPermissionGrants).values({companyId:f.company.id,principalType:"agent",principalId:f.agent.id,permissionKey:"tasks:assign_scope",scope:{projectIds:[randomUUID()]}});
    await expect(f.broker.act(f.subject,command)).rejects.toThrow();
    await db.update(principalPermissionGrants).set({scope:{projectIds:[project.id]}}).where(and(eq(principalPermissionGrants.companyId,f.company.id),eq(principalPermissionGrants.principalId,f.agent.id)));
    await expect(f.broker.act(f.subject,command)).rejects.toThrow("Authorizing user");
    await db.insert(principalPermissionGrants).values({companyId:f.company.id,principalType:"user",principalId:f.operatorId,permissionKey:"tasks:assign_scope",scope:{projectIds:[randomUUID()]}});
    await expect(f.broker.act(f.subject,command)).rejects.toThrow();
    await db.update(principalPermissionGrants).set({scope:{projectIds:[project.id]}}).where(and(eq(principalPermissionGrants.companyId,f.company.id),eq(principalPermissionGrants.principalId,f.operatorId)));
    const result=await f.broker.act(f.subject,command);expect(result.status).toBe("created");
    const [child]=await db.select().from(issues).where(eq(issues.id,String(result.issueId)));expect(child.parentId).toBe(parent.id);expect(child.projectId).toBe(project.id);
  });
  it("creates an assigned turn intake atomically before requesting ordinary admission",async()=>{
    const f=await fixture(),wakeup=vi.fn().mockImplementation(async(agentId,options)=>{
      const [issue]=await db.select().from(issues).where(eq(issues.id,options.payload.issueId));
      expect(agentId).toBe(f.agent.id);expect(issue.assigneeAgentId).toBe(f.agent.id);expect(issue.responsibleUserId).toBe(f.operatorId);return null;
    });
    museRunnerBroker(db,{heartbeat:{wakeup,cancelRun:vi.fn()}});
    const command={version:1 as const,command:"turn.request" as const,requestId:randomUUID(),prompt:"Research ordinary intake"};
    expect((await f.broker.act(f.subject,command)).status).toBe("requested");expect(wakeup).toHaveBeenCalledTimes(1);
    await expect(f.broker.act(f.subject,{...command,prompt:"Changed intake"})).rejects.toThrow("changed input");
    expect(await db.select().from(issues).where(eq(issues.companyId,f.company.id))).toHaveLength(1);
  });
  it("atomically reserves a work identity across competing issue locks and replays its original run",async()=>{
    // This fixture exercises ordinary admission independently of a managed worktree env.
    const f=await active(),heartbeat=heartbeatService(db,{runtimeEnv:{}}),wakeup=vi.fn(heartbeat.wakeup);
    museRunnerBroker(db,{heartbeat:{wakeup,cancelRun:heartbeat.cancelRun}});
    await db.update(companies).set({defaultResponsibleUserId:f.operatorId}).where(eq(companies.id,f.company.id));
    await db.update(agents).set({runtimeConfig:{heartbeat:{maxConcurrentRuns:20,wakeOnDemand:true}}}).where(eq(agents.id,f.agent.id));
    const task=async(title:string)=>(await db.insert(issues).values({companyId:f.company.id,title,status:"todo",assigneeAgentId:f.agent.id,responsibleUserId:f.operatorId}).returning())[0]!;
    const first=await task("First request"),second=await task("Changed request"),requestId=randomUUID();
    const commands=[first,second].map(issue=>({version:1 as const,command:"work.request" as const,requestId,issueId:issue.id}));
    try {
      const race=await Promise.allSettled(commands.map(command=>f.broker.act(f.subject,command)));
      expect(race.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(race.filter(r=>r.status==="rejected")).toHaveLength(1);
      const receipts=await db.select().from(agentWakeupRequests).where(and(eq(agentWakeupRequests.agentId,f.agent.id),eq(agentWakeupRequests.idempotencyKey,`muse-work:${f.binding.id}:1:${requestId}`)));
      expect(receipts).toHaveLength(1);const receipt=receipts[0],command=commands.find(c=>c.issueId===receipt.payload?.issueId)!;
      expect(receipt.payload?.museRequestDigest).toBe(externalOperationDigest("tool",{command}));expect(receipt.runId).toBeTruthy();
      const [run]=await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id,receipt.runId!));expect(run.contextSnapshot?.issueId).toBe(command.issueId);expect(run.status).toBe("queued");
      const response=(race.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<Record<string,unknown>>).value;
      wakeup.mockClear();
      expect(await Promise.all(Array.from({length:3},()=>f.broker.act(f.subject,command)))).toEqual([response,response,response]);
      await db.update(heartbeatRuns).set({status:"succeeded",finishedAt:new Date()}).where(eq(heartbeatRuns.id,run.id));
      await db.update(issues).set({status:"done"}).where(eq(issues.id,command.issueId));
      expect(await f.broker.act(f.subject,command)).toEqual(response);expect(wakeup).not.toHaveBeenCalled();
      await expect(f.broker.act(f.subject,commands.find(c=>c.issueId!==command.issueId)!)).rejects.toThrow("changed input");
      expect(await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.agentId,f.agent.id))).toHaveLength(2);
    }finally{await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.agentId,f.agent.id));await f.detach();}
  },30000);
  it("keeps concurrent turn retries on one assigned intake and one durable wake",async()=>{
    // This fixture exercises ordinary admission independently of a managed worktree env.
    const f=await active(),heartbeat=heartbeatService(db,{runtimeEnv:{}}),wakeup=vi.fn(heartbeat.wakeup);
    museRunnerBroker(db,{heartbeat:{wakeup,cancelRun:heartbeat.cancelRun}});
    await db.update(companies).set({defaultResponsibleUserId:f.operatorId}).where(eq(companies.id,f.company.id));
    await db.update(agents).set({runtimeConfig:{heartbeat:{maxConcurrentRuns:20,wakeOnDemand:true}}}).where(eq(agents.id,f.agent.id));
    const command={version:1 as const,command:"turn.request" as const,requestId:randomUUID(),prompt:"One ordinary turn intake"};
    try {
      const responses=await Promise.all(Array.from({length:3},()=>f.broker.act(f.subject,command)));
      expect(responses).toEqual([responses[0],responses[0],responses[0]]);
      const intake=await db.select().from(issues).where(and(eq(issues.companyId,f.company.id),eq(issues.title,command.prompt)));
      expect(intake).toHaveLength(1);expect(intake[0].assigneeAgentId).toBe(f.agent.id);
      const rows=await db.select().from(agentWakeupRequests).where(and(eq(agentWakeupRequests.agentId,f.agent.id),eq(agentWakeupRequests.idempotencyKey,`muse-work:${f.binding.id}:1:${command.requestId}`)));
      expect(rows).toHaveLength(1);expect(rows[0].payload?.museRequestDigest).toBe(externalOperationDigest("tool",{command}));expect(rows[0].runId).toBe(responses[0].runId);
      wakeup.mockClear();expect(await f.broker.act(f.subject,command)).toEqual(responses[0]);expect(wakeup).not.toHaveBeenCalled();
      await expect(f.broker.act(f.subject,{version:1,command:"work.request",issueId:intake[0].id,requestId:command.requestId})).rejects.toThrow("changed input");
      await expect(f.broker.act(f.subject,{...command,prompt:"Changed turn prompt"})).rejects.toThrow("changed input");expect(wakeup).not.toHaveBeenCalled();
      expect(await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.agentId,f.agent.id))).toHaveLength(2);
    }finally{await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.agentId,f.agent.id));await f.detach();}
  },30000);
  it("does not enqueue a replacement for an older receipt without an exact payload digest",async()=>{
    const f=await fixture(),wakeup=vi.fn();museRunnerBroker(db,{heartbeat:{wakeup,cancelRun:vi.fn()}});
    const [issue]=await db.insert(issues).values({companyId:f.company.id,title:"Old receipt",status:"todo",assigneeAgentId:f.agent.id,responsibleUserId:f.operatorId}).returning();
    const command={version:1 as const,command:"work.request" as const,issueId:issue.id,requestId:randomUUID()};
    await db.insert(agentWakeupRequests).values({companyId:f.company.id,agentId:f.agent.id,source:"assignment",requestedByActorType:"agent",requestedByActorId:f.agent.id,idempotencyKey:`muse-work:${f.binding.id}:1:${command.requestId}`,payload:{issueId:issue.id,museRequestId:command.requestId}});
    await expect(f.broker.act(f.subject,command)).rejects.toThrow("changed input");expect(wakeup).not.toHaveBeenCalled();
    expect(await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.agentId,f.agent.id))).toHaveLength(1);
  });
  it("admits one authenticated claim and keeps claimed/native accepted times distinct",async()=>{
    const f=await active();try {
      const requestId=randomUUID(),claim={version:1 as const,command:"accept" as const,assignmentId:f.assignment.id,requestId};
      expect((await f.broker.act(f.subject,claim)).status).toBe("accepted");expect(f.sent).toHaveLength(1);
      expect((await f.broker.act(f.subject,claim)).status).toBe("accepted");expect(f.sent).toHaveLength(1);
      await expect(f.broker.act(f.subject,{...claim,requestId:randomUUID()})).rejects.toThrow("claimed");
      const [a]=await db.select().from(assignments).where(eq(assignments.id,f.assignment.id));expect(a.claimedAt).toBeInstanceOf(Date);expect(a.nativeAcceptedAt).toBeInstanceOf(Date);
      await expect(db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)))).rejects.toMatchObject({details:{code:"external_agent_overlap"}});
    }finally{await f.detach();}
  });

  it.each([
    ["oauth","accept"],["oauth","tool"],["legacy","accept"],["legacy","tool"],
  ] as const)("rechecks exact %s access after native %s waits for admission",async(source,action)=>{
    const oauth=source==="oauth"?await oauthFixture(true):undefined;
    const f=await active(oauth??await fixture());
    try {
      if(action==="tool")await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const requestId=randomUUID();
      const command=action==="accept"
        ? {version:1 as const,command:"accept" as const,assignmentId:f.assignment.id,requestId}
        : {version:1 as const,command:"tool" as const,assignmentId:f.assignment.id,requestId,name:"get_task_history",arguments:{}};
      const [before]=await db.select().from(assignments).where(eq(assignments.id,f.assignment.id));
      const heldBefore=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const sentBefore=f.sent.length;
      let outcome:Promise<{value?:unknown;error?:unknown}>|undefined;
      await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,async()=>{
        await tx.select().from(bindings).where(eq(bindings.id,f.binding.id)).for("update");
        outcome=f.broker.act(f.subject,command).then(value=>({value}),error=>({error}));
        // The caller passed the initial exact-token check and now really waits
        // on the production admission lock. Only its presented access expires.
        await expect.poll(async()=>{const rows=await db.execute(sql`select count(*)::int as count from pg_stat_activity where datname=current_database() and lower(wait_event)='advisory'`);return Number(rows[0]?.count??0);},{timeout:5000,interval:25}).toBeGreaterThan(0);
        if(source==="oauth")await tx.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthTokens.id,f.subject.credentialId));
        else await tx.update(museCredentials).set({expiresAt:new Date(Date.now()-1)}).where(eq(museCredentials.id,f.subject.credentialId));
      }));
      expect((await outcome!).error).toBeDefined();
      expect(await db.select().from(operations).where(eq(operations.requestId,requestId))).toHaveLength(0);
      expect((await db.select().from(assignments).where(eq(assignments.id,f.assignment.id)))[0]).toEqual(before);
      expect(await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id))).toEqual(heldBefore);
      expect(f.sent).toHaveLength(sentBefore);
      const [binding]=await db.select().from(bindings).where(eq(bindings.id,f.binding.id));
      expect((await inspectMuseConnectionCredential(db,binding,source==="oauth"?oauthResource:undefined)).state).toBe("active");
      // A normal refresh can retry the same still-unreserved command exactly
      // once; the access check must not turn into a refresh-family denial.
      const fresh=oauth
        ? await f.identity.authenticateOAuthAccess((await oauth.oauth.token({grant_type:"refresh_token",client_id:oauth.client.client_id,refresh_token:oauth.tokens!.refresh_token})).access_token,oauthOrigin)
        : await f.identity.authenticate((await f.identity.refresh(f.credentials.refreshToken)).accessToken);
      expect(await f.broker.act(fresh,command)).toMatchObject({status:action==="accept"?"accepted":"completed"});
      expect(await db.select().from(operations).where(eq(operations.requestId,requestId))).toHaveLength(1);
      expect(f.sent).toHaveLength(sentBefore+1);
    }finally{await f.detach();}
  });
  it("recovers a durably admitted command after normal OAuth access rotation",async()=>{
    const oauth=await oauthFixture(true),f=await active(oauth),requestId=randomUUID();
    await f.detach();let detach:()=>Promise<void>|void=()=>{};
    try {
      expect(await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId})).toMatchObject({status:"pending"});
      const [reserved]=await db.select().from(operations).where(eq(operations.requestId,requestId));expect(reserved.status).toBe("reserved");expect(f.sent).toHaveLength(0);
      const rotated=await oauth.oauth.token({grant_type:"refresh_token",client_id:oauth.client.client_id,refresh_token:oauth.tokens!.refresh_token});
      const fresh=await f.identity.authenticateOAuthAccess(rotated.access_token,oauthOrigin);
      // Refresh rotates its own family member; an older access can remain
      // valid until its TTL. Model that TTL elapsing after durable admission.
      await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthTokens.id,f.subject.credentialId));
      await expect(assertMuseSubjectCredential(db,f.subject,oauthResource)).rejects.toThrow();
      detach=await f.port.attach(async command=>{f.sent.push(command);await f.port.settle({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId:command.requestId,outcome:{status:"accepted"}}});},undefined,true);
      await expect.poll(async()=>(await db.select().from(operations).where(eq(operations.id,reserved.id)))[0].status).toBe("settled");
      expect(f.sent).toHaveLength(1);
      expect(await f.broker.inspect(fresh,{version:1,query:"operation.receipt",assignmentId:f.assignment.id,requestId})).toMatchObject({status:"accepted"});
      const [claimed]=await db.select().from(assignments).where(eq(assignments.id,f.assignment.id));expect(claimed.claimedAt).toBeInstanceOf(Date);expect(claimed.nativeAcceptedAt).toBeInstanceOf(Date);
    }finally{await detach();}
  });
  it.each([false,true])("excludes fenced historical answers from pending health while retaining stop barriers:effects=%s",async(nativeEffectsUnknown)=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const requestId="cancelled_question",response={schema:"paperclip.question_response.v1",answers:[]},inputDigest=digestPaperclipSemanticContent({requestId,turnId:f.ref.turnId,response});
      await f.port.inputAvailable({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,turnId:f.ref.turnId,inputDigest,response}});
      const [answer]=await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.assignmentId,f.assignment.id));
      expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))!.pendingInputs).toBe(1);
      if(nativeEffectsUnknown)await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"pending",command:{action:"tool"},status:"pending"});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      const stopped=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      expect(stopped.pendingInputs).toBe(0);expect(stopped.stop.nativeEffectsUnknown).toBe(nativeEffectsUnknown);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0].workerUnknown).toBe(true);
      await expect(f.broker.act(f.subject,{version:1,command:"consume_input",assignmentId:f.assignment.id,requestId:randomUUID(),nativeRequestId:requestId,inputDigest,continuationReceiptId:randomUUID(),continuationPersisted:true})).rejects.toThrow();
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:stopped.stop.boundary!,expectedRevision:stopped.stop.bindingRevision!,workerStopped:true});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(hold.workerUnknown).toBe(false);expect(hold.nativeEffectsUnknown).toBe(nativeEffectsUnknown);
      const admission=db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)));
      if(nativeEffectsUnknown){expect(hold.releasedAt).toBeNull();await expect(admission).rejects.toMatchObject({details:{code:"external_agent_overlap"}});}
      else {expect(hold.releasedAt).toBeInstanceOf(Date);await expect(admission).resolves.toBeUndefined();}
      expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))!.pendingInputs).toBe(0);
      expect((await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.id,answer.id)))[0]).toEqual(answer);expect(answer.consumedAt).toBeNull();
    }finally{await f.detach();}
  });

  it("persists canonical input before ACK and separates client proof from exact native input",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const requestId="native_question",response={schema:"paperclip.question_response.v1",answers:[]},inputDigest=digestPaperclipSemanticContent({requestId,turnId:f.ref.turnId,response});
      await f.port.inputAvailable({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,turnId:f.ref.turnId,inputDigest,response}});
      expect(await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.assignmentId,f.assignment.id))).toHaveLength(1);
      await expect(f.broker.act(f.subject,{version:1,command:"finish",assignmentId:f.assignment.id,requestId:randomUUID(),result:{}})).rejects.toThrow("input");
      const proof=randomUUID();await f.broker.act(f.subject,{version:1,command:"consume_input",assignmentId:f.assignment.id,requestId:randomUUID(),nativeRequestId:requestId,inputDigest,continuationReceiptId:proof,continuationPersisted:true});
      expect(f.sent.at(-1)?.input).toEqual({requestId,inputDigest});expect((await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.assignmentId,f.assignment.id)))[0].continuationReceiptId).toBe(proof);
    }finally{await f.detach();}
  });
  it("accepts exact connected OAuth cleanup and rejects revoked OAuth replay",async()=>{
    const oauth=await oauthFixture(true),f=await active(oauth);try {
      expect(await db.select().from(museCredentials).where(eq(museCredentials.bindingId,f.binding.id))).toEqual([]);
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"oauth-cleanup-pending",command:{action:"tool"},status:"pending"});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [before]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const inspect=await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,command:"control.inspect"});
      expect(inspect.status).toBe(200);expect(inspect.body).toMatchObject({boundaries:[{boundary:before.stopBoundary,nativeEffectsUnknown:true}],externalStopConfirmed:false});
      const report={version:1,command:"worker.quiescent",boundary:before.stopBoundary,requestId:randomUUID()};
      const response=await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send(report);
      expect(response.status).toBe(200);expect(response.body).toMatchObject({status:"worker_reported",externalStopConfirmed:false,nativeEffectsUnknown:true});
      const [after]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,before.id));
      expect(after.workerReportedAt).toBeInstanceOf(Date);expect(after).toMatchObject({workerUnknown:true,nativeEffectsUnknown:true,releasedAt:null});
      await oauth.oauth.revokeToken(oauth.tokens!.refresh_token,oauth.client.client_id);
      expect((await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send(report)).status).toBe(401);
      await expect(f.broker.cleanup(f.subject,{command:"worker.quiescent",boundary:before.stopBoundary!,requestId:report.requestId})).rejects.toThrow();
    }finally{await f.detach();}
  });
  it.each(["expired older hold","released older hold","Dot older hold","live older assignment"])("scopes connected OAuth cleanup to its current boundary despite %s",async(kind)=>{
    const oauth=await oauthFixture(true),f=await active(oauth);try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [current]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const [olderAssignment]=await db.insert(assignments).values({...f.assignment,id:randomUUID(),turnId:"older_"+randomUUID(),status:kind==="live older assignment"?"accepted":"fenced"}).returning();
      const boundary={...current.stopBoundary!,assignmentId:olderAssignment.id,turnId:olderAssignment.turnId,stopNonce:randomUUID()};
      const [older]=await db.insert(externalAgentHolds).values({companyId:f.company.id,agentId:f.agent.id,provider:kind==="Dot older hold"?"openai_dot":"muse",bindingId:f.binding.id,bindingGeneration:1,assignmentId:olderAssignment.id,runId:f.runId,stopBoundary:boundary,releasedAt:kind==="released older hold"?new Date():null}).returning();
      await db.insert(mailbox).values({companyId:f.company.id,bindingId:f.binding.id,bindingGeneration:1,assignmentId:olderAssignment.id,kind:"authority_revoked",sourceEventId:randomUUID(),references:{boundary},createdAt:kind==="expired older hold"?new Date(Date.now()-25*60*60_000):new Date()});
      const inspect=await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,command:"control.inspect"});
      expect(inspect.status).toBe(200);expect(inspect.body).toMatchObject({boundaries:[{boundary:current.stopBoundary}],externalStopConfirmed:false});
      const report=await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,command:"worker.quiescent",boundary,requestId:randomUUID()});
      expect(report.status).toBe(409);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,older.id)))[0]).toEqual(older);
    }finally{await f.detach();}
  });
  it("bounds connected OAuth cleanup by the earliest exact fence receipt without sliding its deadline",async()=>{
    const oauth=await oauthFixture(true),f=await active(oauth);try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [receipt]=await db.select().from(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"authority_revoked")));
      await db.update(mailbox).set({createdAt:new Date(Date.now()-25*60*60_000)}).where(eq(mailbox.id,receipt.id));
      await db.update(externalAgentHolds).set({updatedAt:new Date()}).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      await db.update(assignments).set({lastActivityAt:new Date()}).where(eq(assignments.id,f.assignment.id));
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      expect(await db.select().from(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"authority_revoked")))).toHaveLength(2);
      const response=await request(transport()).post("/api/muse/v1/cleanup").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,command:"control.inspect"});
      expect(response.status).toBe(403);
      expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))!.credentialState).toBe("active");
    }finally{await f.detach();}
  });
  it.each(["expired access","used access","revoked grant","expired refresh family","wrong resource","binding generation","operator changed"])("revalidates connected OAuth cleanup before stale-subject effects: %s",async(reason)=>{
    const oauth=await oauthFixture(true),f=await active(oauth);try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      if(reason==="expired access")await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthTokens.id,f.subject.credentialId));
      if(reason==="used access")await db.update(mcpOauthTokens).set({usedAt:new Date()}).where(eq(mcpOauthTokens.id,f.subject.credentialId));
      if(reason==="revoked grant")await db.update(mcpOauthGrants).set({revokedAt:new Date()}).where(eq(mcpOauthGrants.id,f.subject.grantId!));
      if(reason==="expired refresh family")await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(and(eq(mcpOauthTokens.grantId,f.subject.grantId!),eq(mcpOauthTokens.kind,"refresh")));
      if(reason==="wrong resource")await db.update(mcpOauthGrants).set({resource:oauthOrigin+"/api/mcp"}).where(eq(mcpOauthGrants.id,f.subject.grantId!));
      if(reason==="binding generation")await db.update(bindings).set({generation:2}).where(eq(bindings.id,f.binding.id));
      if(reason==="operator changed")await db.update(bindings).set({operatorId:randomUUID()}).where(eq(bindings.id,f.binding.id));
      await expect(f.broker.cleanup(f.subject,{command:"control.inspect"})).rejects.toThrow();
      await expect(f.broker.cleanup(f.subject,{command:"worker.quiescent",boundary:hold.stopBoundary!,requestId:randomUUID()})).rejects.toThrow();
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,hold.id)))[0]).toEqual(hold);
    }finally{await f.detach();}
  });

  it("allows connected legacy fenced cleanup without granting normal or detector authority",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      // Acceptance precedes the fence: the hold's creation time is not its cleanup deadline.
      await db.update(externalAgentHolds).set({createdAt:new Date(Date.now()-48*60*60_000)}).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"cleanup-pending",command:{action:"tool"},status:"pending"});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [binding]=await db.select().from(bindings).where(eq(bindings.id,f.binding.id));
      expect(binding.revokedAt).toBeNull();
      const [before]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const subject=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      await expect(f.identity.authenticate(f.credentials.cleanupToken)).rejects.toThrow();
      await expect(f.broker.inspect(subject,{version:1,query:"task.list"})).rejects.toMatchObject({status:401,message:"Muse test credential is unavailable."});
      await expect(f.identity.authenticate(f.credentials.detectorCleanupToken,"detector_cleanup")).rejects.toThrow();
      const inspection=await f.broker.cleanup(subject,{command:"control.inspect"});
      expect(inspection.externalStopConfirmed).toBe(false);
      expect(inspection).toMatchObject({boundaries:[{boundary:before.stopBoundary,nativeEffectsUnknown:true}]});
      await expect(f.broker.cleanup(subject,{command:"worker.quiescent",boundary:{...before.stopBoundary!,stopNonce:randomUUID()},requestId:randomUUID()})).rejects.toThrow("boundary");
      const report=await f.broker.cleanup(subject,{command:"worker.quiescent",boundary:before.stopBoundary!,requestId:randomUUID()});
      expect(report).toMatchObject({status:"worker_reported",externalStopConfirmed:false,nativeEffectsUnknown:true});
      const [after]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(after.workerReportedAt).toBeInstanceOf(Date);expect(after.workerUnknown).toBe(true);
      expect(after.nativeEffectsUnknown).toBe(true);expect(after.releasedAt).toBeNull();
      await expect(f.broker.act(subject,{version:1,command:"tool",assignmentId:f.assignment.id,requestId:randomUUID(),name:"paperclip_task_read",arguments:{}})).rejects.toThrow();
    }finally{await f.detach();}
  });

  it.each(["expired older hold","released older hold","Dot older hold","live older assignment"])("scopes connected legacy cleanup to its current boundary despite %s",async(kind)=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [current]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const [olderAssignment]=await db.insert(assignments).values({...f.assignment,id:randomUUID(),turnId:"older_"+randomUUID(),status:kind==="live older assignment"?"accepted":"fenced"}).returning();
      const boundary={...current.stopBoundary!,assignmentId:olderAssignment.id,turnId:olderAssignment.turnId,stopNonce:randomUUID()};
      const [older]=await db.insert(externalAgentHolds).values({companyId:f.company.id,agentId:f.agent.id,provider:kind==="Dot older hold"?"openai_dot":"muse",bindingId:f.binding.id,bindingGeneration:1,assignmentId:olderAssignment.id,runId:f.runId,stopBoundary:boundary,releasedAt:kind==="released older hold"?new Date():null}).returning();
      await db.insert(mailbox).values({companyId:f.company.id,bindingId:f.binding.id,bindingGeneration:1,assignmentId:olderAssignment.id,kind:"authority_revoked",sourceEventId:randomUUID(),references:{boundary},createdAt:kind==="expired older hold"?new Date(Date.now()-25*60*60_000):new Date()});
      const cleanup=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      expect(await f.broker.cleanup(cleanup,{command:"control.inspect"})).toMatchObject({boundaries:[{boundary:current.stopBoundary}],externalStopConfirmed:false});
      await expect(f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary,requestId:randomUUID()})).rejects.toThrow("boundary");
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,older.id)))[0]).toEqual(older);
      expect(await f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary:current.stopBoundary!,requestId:randomUUID()})).toMatchObject({status:"worker_reported",externalStopConfirmed:false});
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,current.id)))[0]).toMatchObject({workerUnknown:true,releasedAt:null});
    }finally{await f.detach();}
  });
  it("replays an identical legacy revoked historical cleanup report without mutating or accepting a new report",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!,boundary=state.stop.boundary!,requestId=randomUUID();
      const command={command:"worker.quiescent" as const,boundary,requestId};
      const connected=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      const report=await f.broker.cleanup(connected,command);
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary,expectedRevision:state.stop.bindingRevision!,workerStopped:true});
      const attested=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:attested.revision});
      const revoked=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      const [before]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));expect(before.releasedAt).toBeInstanceOf(Date);
      const logsBefore=await db.select().from(activityLog).where(and(eq(activityLog.companyId,f.company.id),eq(activityLog.action,"muse.worker_quiescence_reported")));
      expect(await f.broker.cleanup(revoked,command)).toEqual(report);
      await expect(f.broker.cleanup(revoked,{...command,requestId:randomUUID()})).rejects.toThrow("boundary");
      expect(await f.broker.cleanup(revoked,{command:"control.inspect"})).toEqual({boundaries:[],externalStopConfirmed:false});
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(before);
      expect(await db.select().from(activityLog).where(and(eq(activityLog.companyId,f.company.id),eq(activityLog.action,"muse.worker_quiescence_reported")))).toEqual(logsBefore);
    }finally{await f.detach();}
  });

  it("does not renew connected cleanup from mutable holds or later revocation receipts",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const [original]=await db.select().from(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"authority_revoked")));
      await db.update(mailbox).set({createdAt:new Date(Date.now()-24*60*60_000-60_000)}).where(eq(mailbox.id,original.id));
      await db.update(externalAgentHolds).set({updatedAt:new Date()}).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      await db.update(assignments).set({lastActivityAt:new Date()}).where(eq(assignments.id,f.assignment.id));
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const receipts=await db.select().from(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"authority_revoked")));
      expect(receipts).toHaveLength(2);expect(receipts.some(row=>row.createdAt.getTime()>Date.now()-60_000)).toBe(true);
      await expect(f.identity.authenticate(f.credentials.cleanupToken,"cleanup")).rejects.toThrow("Cleanup authority");
    }finally{await f.detach();}
  });

  it.each(["no hold","released hold","other provider","hold company","hold agent","hold binding","hold generation","binding generation","assignment company","assignment agent","assignment binding","assignment generation","live assignment","missing boundary","boundary binding","boundary generation","boundary run","boundary turn","boundary revision","missing fence receipt","expired credential","revoked credential","consumed credential"])(
    "denies connected cleanup with %s",async(reason)=>{
      const f=await active();try {
        await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
        await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
        const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
        const other=reason.endsWith("company")||reason.endsWith("agent")||reason.endsWith("binding")?await fixture():null;
        const holdChanges:Partial<typeof externalAgentHolds.$inferInsert>={
          ...(reason==="released hold"?{releasedAt:new Date()}:{}),
          ...(reason==="other provider"?{provider:"openai_dot"}:{}),
          ...(reason==="hold company"?{companyId:other!.company.id}:{}),
          ...(reason==="hold agent"?{agentId:other!.agent.id}:{}),
          ...(reason==="hold binding"?{bindingId:other!.binding.id}:{}),
          ...(reason==="hold generation"?{bindingGeneration:2}:{}),
          ...(reason==="missing boundary"?{stopBoundary:null}:{}),
        };
        if(reason.startsWith("boundary "))holdChanges.stopBoundary={...hold.stopBoundary!,
          ...(reason==="boundary binding"?{bindingId:other!.binding.id}:{}),
          ...(reason==="boundary generation"?{generation:2}:{}),
          ...(reason==="boundary run"?{runId:randomUUID()}:{}),
          ...(reason==="boundary turn"?{turnId:"different-turn"}:{}),
          ...(reason==="boundary revision"?{assignmentRevision:99}:{}),
        };
        if(reason==="no hold")await db.delete(externalAgentHolds).where(eq(externalAgentHolds.id,hold.id));
        else if(Object.keys(holdChanges).length)await db.update(externalAgentHolds).set(holdChanges).where(eq(externalAgentHolds.id,hold.id));
        const assignmentChanges:Partial<typeof assignments.$inferInsert>={
          ...(reason==="assignment company"?{companyId:other!.company.id}:{}),
          ...(reason==="assignment agent"?{agentId:other!.agent.id}:{}),
          ...(reason==="assignment binding"?{bindingId:other!.binding.id}:{}),
          ...(reason==="assignment generation"?{bindingGeneration:2}:{}),
          ...(reason==="live assignment"?{status:"accepted"}:{}),
        };
        if(Object.keys(assignmentChanges).length)await db.update(assignments).set(assignmentChanges).where(eq(assignments.id,f.assignment.id));
        if(reason==="binding generation")await db.update(bindings).set({generation:2}).where(eq(bindings.id,f.binding.id));
        if(reason==="missing fence receipt")await db.delete(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"authority_revoked")));
        if(reason.endsWith("credential"))await db.update(museCredentials).set({
          ...(reason==="expired credential"?{expiresAt:new Date(Date.now()-1)}:{}),
          ...(reason==="revoked credential"?{revokedAt:new Date()}:{}),
          ...(reason==="consumed credential"?{consumedAt:new Date()}:{}),
        }).where(eq(museCredentials.tokenHash,museCredentialHash(f.credentials.cleanupToken)));
        await expect(f.identity.authenticate(f.credentials.cleanupToken,"cleanup")).rejects.toThrow();
      }finally{await f.detach();}
    },
  );

  it("keeps revoked cleanup bounded to its existing deadline and current generation",async()=>{
    const f=await fixture();const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
    await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:state.revision});
    await expect(f.identity.authenticate(f.credentials.cleanupToken,"cleanup")).resolves.toMatchObject({bindingId:f.binding.id,generation:1});
    await db.update(bindings).set({generation:2}).where(eq(bindings.id,f.binding.id));
    await expect(f.identity.authenticate(f.credentials.cleanupToken,"cleanup")).rejects.toThrow();
    await db.update(bindings).set({generation:1,cleanupExpiresAt:new Date(Date.now()-1)}).where(eq(bindings.id,f.binding.id));
    await expect(f.identity.authenticate(f.credentials.cleanupToken,"cleanup")).rejects.toThrow();
    await expect(f.identity.authenticate(f.credentials.detectorCleanupToken,"detector_cleanup")).rejects.toThrow();
  });

  it("fences without fabricating private stop and retains unknown native effects across operator attestation",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await db.update(externalAgentHolds).set({nativeEffectsUnknown:true}).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:state.revision});
      const stopped=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!,boundary=stopped.stop.boundary!;expect(stopped.stop.status).toBe("cannot_confirm");
      await instanceSettingsService(db).updateExperimental({enableMuse:false});
      const cleanup=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup"), requestId=randomUUID();
      expect((await f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary,requestId})).externalStopConfirmed).toBe(false);
      await f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary,requestId});
      const logs=await db.select().from(activityLog).where(and(eq(activityLog.companyId,f.company.id),eq(activityLog.action,"muse.worker_quiescence_reported")));
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({actorType:"agent",actorId:f.agent.id,responsibleUserId:f.operatorId,details:{authorizingUserId:f.operatorId,bindingId:f.binding.id,generation:1,boundary,nativeEffectsUnknown:true,externalStopConfirmed:false,requestId}});
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary,expectedRevision:stopped.revision,workerStopped:true});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));expect(hold.workerUnknown).toBe(false);expect(hold.nativeEffectsUnknown).toBe(true);expect(hold.releasedAt).toBeNull();
      await expect(f.identity.authenticate(f.credentials.accessToken)).rejects.toThrow();
    }finally{await instanceSettingsService(db).updateExperimental({enableMuse:true});await f.detach();}
  });
  it("audits detector cleanup once per observation and preserves exact agent attribution",async()=>{
    const f=await fixture();
    const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
    await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:state.revision});
    const subject=await f.identity.authenticate(f.credentials.detectorCleanupToken,"detector_cleanup");
    for (const removed of [false,false,true,true]) expect((await f.broker.detectorCleanup(subject,removed)).externalStopConfirmed).toBe(false);
    const logs=await db.select().from(activityLog).where(and(eq(activityLog.companyId,f.company.id),sql`${activityLog.action} like 'muse.detector_removal_%'`));
    expect(logs.map(row=>row.action).sort()).toEqual(["muse.detector_removal_reported","muse.detector_removal_requested"]);
    for (const log of logs) expect(log).toMatchObject({actorType:"agent",actorId:f.agent.id,agentId:f.agent.id,responsibleUserId:f.operatorId,details:{bindingId:f.binding.id,generation:1,authorizingUserId:f.operatorId,externalStopConfirmed:false}});
    await expect(f.broker.detectorCleanup({...subject,agentId:randomUUID()},true)).rejects.toThrow("binding changed");
  });
  it("reports the exact old stop revision after repair and cancels only the fenced native run",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const cancelRun=vi.fn().mockResolvedValue(null);
      museRunnerBroker(db,{heartbeat:{wakeup:vi.fn().mockResolvedValue(null),cancelRun}});
      const before=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      const pairing=await f.broker.createPairing({companyId:f.company.id,agentId:f.agent.id,operatorId:f.operatorId,replaceBindingId:f.binding.id,expectedRevision:before.revision});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      expect(state.id).toBe(pairing.bindingId);expect(state.stop.boundary?.bindingId).toBe(f.binding.id);
      expect(state.stop.bindingRevision).toBe(before.revision+1);expect(state.revision).not.toBe(state.stop.bindingRevision);
      expect(cancelRun).toHaveBeenCalledWith(f.runId,"Muse connection replaced");
      const boundary=state.stop.boundary!;
      await expect(f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary,expectedRevision:state.revision,workerStopped:true})).rejects.toThrow("Stop boundary changed");
      await db.update(bindings).set({revision:state.revision+10}).where(eq(bindings.id,state.id));
      const refreshed=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      expect(refreshed.stop.bindingRevision).toBe(state.stop.bindingRevision);expect(refreshed.stop.boundary).toEqual(boundary);
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary,expectedRevision:refreshed.stop.bindingRevision!,workerStopped:true});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(hold.workerUnknown).toBe(false);expect(hold.operatorAttestedAt).toBeInstanceOf(Date);
      await expect(f.identity.authenticate(f.credentials.accessToken)).rejects.toThrow();
    }finally{await f.detach();}
  });

  it.each(["prior_window","overlapping_window","unreleased_effect_hold"] as const)("retains historical pending-input qualification periods without blocking later proven idle:%s",async(kind)=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const requestId="historical_question",response={schema:"paperclip.question_response.v1",answers:[]},inputDigest=digestPaperclipSemanticContent({requestId,turnId:f.ref.turnId,response});
      await f.port.inputAvailable({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,turnId:f.ref.turnId,inputDigest,response}});
      if(kind==="unreleased_effect_hold")await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"pending",command:{action:"tool"},status:"pending"});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      const stop=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!.stop;
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:stop.boundary!,expectedRevision:stop.bindingRevision!,workerStopped:true});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      // Reconstruct exact historical fixture times in this disposable database.
      // The retained answer was never consumed; only native terminal evidence
      // ends its active-input period, and private/effect holds end separately.
      const start=new Date(Date.now()-90000),at=(ms:number)=>new Date(start.getTime()+ms),overlap=kind==="overlapping_window";
      const workStart=at(overlap?10000:-60000),nativeEnd=at(overlap?30000:-40000),privateEnd=at(overlap?50000:-30000),qualificationId=randomUUID();
      await db.update(assignments).set({createdAt:workStart,offeredAt:workStart,claimedAt:workStart,nativeAcceptedAt:workStart,finalizedAt:null}).where(eq(assignments.id,f.assignment.id));
      await db.update(heartbeatRuns).set({startedAt:workStart,finishedAt:nativeEnd}).where(eq(heartbeatRuns.id,f.runId));
      await db.update(museInputDeliveries).set({createdAt:workStart}).where(eq(museInputDeliveries.assignmentId,f.assignment.id));
      await db.update(externalAgentHolds).set({createdAt:workStart,releasedAt:kind==="unreleased_effect_hold"?null:privateEnd}).where(eq(externalAgentHolds.id,hold.id));
      await db.update(bindings).set({qualificationId,qualificationStartedAt:start,qualificationExpiresAt:at(86400000)}).where(eq(bindings.id,f.binding.id));
      const before=(await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.assignmentId,f.assignment.id)))[0];
      const buckets=new Map<number,string[]>(),replicaId=randomUUID();
      for(let ms=0;ms<=80000;ms+=5000){const time=at(ms),bucket=Math.floor(time.getTime()/30000)*30000;const stamps=buckets.get(bucket)??[];stamps.push(time.toISOString());buckets.set(bucket,stamps);}
      await db.insert(museReceiverContactBuckets).values([...buckets].map(([bucketAt,timestamps])=>({companyId:f.company.id,bindingId:f.binding.id,bindingGeneration:1,replicaId,bucketAt:new Date(bucketAt),firstAt:new Date(timestamps[0]),lastAt:new Date(timestamps.at(-1)!),timestamps,contacts:timestamps.length,gapsAtMostSevenSeconds:timestamps.length-1,maxGapMs:5000})));
      const evidence=await f.broker.readQualificationEvidence(f.company.id,f.agent.id,f.binding.id,qualificationId);
      const expected=kind==="unreleased_effect_hold"?[]:overlap
        ? [{startedAt:start.toISOString(),endedAt:at(10000).toISOString()},{startedAt:at(50000).toISOString(),endedAt:at(80000).toISOString()}]
        : [{startedAt:start.toISOString(),endedAt:at(80000).toISOString()}];
      expect(evidence.idleWindows).toEqual(expected);
      expect((await db.select().from(museInputDeliveries).where(eq(museInputDeliveries.id,before.id)))[0]).toEqual(before);expect(before.consumedAt).toBeNull();
      const [after]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,hold.id));
      expect(after.workerUnknown).toBe(false);expect(after.nativeEffectsUnknown).toBe(kind==="unreleased_effect_hold");
      expect(after.releasedAt).toEqual(kind==="unreleased_effect_hold"?null:privateEnd);
    }finally{await f.detach();}
  });

  it("preserves a persisted qualification deadline on retry and enforces it without a watcher",async()=>{
    const f=await fixture(),state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!,qualificationId=randomUUID(),input={companyId:f.company.id,agentId:f.agent.id,bindingId:f.binding.id,generation:1,expectedRevision:state.revision,operatorId:f.operatorId,qualificationId,expiresAt:new Date(Date.now()+86400000)};
    const start=await f.broker.beginQualification(input),retry=await f.broker.beginQualification({...input,expiresAt:new Date(Date.now()+86400000)});expect(retry.expiresAt).toEqual(start.expiresAt);expect(Date.parse(start.expiresAt)-Date.parse(start.startedAt)).toBe(86400000);
    await db.update(bindings).set({qualificationExpiresAt:new Date(Date.now()-1)}).where(eq(bindings.id,f.binding.id));
    await expect(f.identity.authenticate(f.credentials.accessToken)).rejects.toThrow("deadline");
    const [ended]=await db.select().from(bindings).where(eq(bindings.id,f.binding.id));expect(ended.revokedAt).toBeInstanceOf(Date);expect(ended.deadlineEnforcedAt).toBeInstanceOf(Date);
  });
  it("rejects a claim when reassignment commits while its exact issue lock is held",async()=>{
    const f=await active();let unlock!:()=>void,held!:()=>void;
    const gate=new Promise<void>(resolve=>{unlock=resolve;}),locked=new Promise<void>(resolve=>{held=resolve;});
    const reassignment=db.transaction(async tx=>{await tx.select({id:issues.id}).from(issues).where(eq(issues.id,f.issue.id)).for("update");held();await gate;await tx.update(issues).set({assigneeAgentId:null,checkoutRunId:null,executionRunId:null}).where(eq(issues.id,f.issue.id));});
    await locked;let settled=false;
    const claim=f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()}).finally(()=>{settled=true;});
    try {await new Promise(resolve=>setTimeout(resolve,50));expect(settled).toBe(false);unlock();await reassignment;await expect(claim).rejects.toThrow("task");expect(f.sent).toEqual([]);expect((await db.select().from(assignments).where(eq(assignments.id,f.assignment.id)))[0].claimedAt).toBeNull();}finally{unlock();await f.detach();}
  });
  it("reconciles pending sends to an independent unknown barrier on controller recovery",async()=>{
    const f=await active();await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});await f.detach();
    const requestId=randomUUID(),input={name:"write_document",arguments:{}},command={requestId,bindingId:f.binding.id,bindingGeneration:1,runId:f.runId,normalizedSessionId:f.assignment.normalizedSessionId,turnId:f.assignment.turnId,assignmentRevision:1,action:"tool",input,digest:externalOperationDigest("tool",input)};
    await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId,digest:command.digest,command,status:"pending"});
    const send=vi.fn(),detach=await f.port.attach(send,undefined,true);
    try {expect((await db.select().from(operations).where(eq(operations.requestId,requestId)))[0].status).toBe("unknown");expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0].nativeEffectsUnknown).toBe(true);expect((await f.broker.act(f.subject,{version:1,command:"tool",assignmentId:f.assignment.id,requestId,name:input.name,arguments:{}})).status).toBe("unknown");expect(send).not.toHaveBeenCalled();}finally{await detach();}
  });
  it("does not restore native uncertainty when a saved result precedes a lost command acknowledgement",async()=>{
    let releaseFailure!:()=>void;
    const failAfterResult=new Promise<void>(resolve=>{releaseFailure=resolve;});
    const f=await active(undefined,async command=>{if(command.action==="accept"){await failAfterResult;throw new Error("Command acknowledgement lost after result");}});
    let transaction:ReturnType<typeof vi.spyOn>|undefined;
    try {
      const requestId=randomUUID();
      expect(await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId})).toMatchObject({status:"accepted"});
      await f.broker.act(f.subject,{version:1,command:"finish",assignmentId:f.assignment.id,requestId:randomUUID(),result:{}});
      const [saved]=await db.select().from(operations).where(eq(operations.requestId,requestId));
      // Observe completion of the real failure transaction, without timing the
      // negative hold assertion or replacing the database implementation.
      transaction=vi.spyOn(db,"transaction");
      releaseFailure();
      await expect.poll(()=>transaction!.mock.results.length).toBeGreaterThan(0);
      await transaction.mock.results[0].value;
      transaction.mockRestore();transaction=undefined;
      expect((await db.select().from(operations).where(eq(operations.id,saved.id)))[0]).toEqual(saved);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0].nativeEffectsUnknown).toBe(false);
      await db.update(heartbeatRuns).set({status:"succeeded",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      await f.broker.reconcileTerminalAssignments(f.company.id,f.agent.id,f.binding.id);
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(hold.workerUnknown).toBe(false);expect(hold.nativeEffectsUnknown).toBe(false);expect(hold.releasedAt).toBeInstanceOf(Date);
      await expect(db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)))).resolves.toBeUndefined();
    }finally{releaseFailure();transaction?.mockRestore();await f.detach();}
  });

  it("retains native uncertainty for an unconfirmed failed send until its actual result arrives",async()=>{
    const f=await active();await f.detach();
    const detach=await f.port.attach(async()=>{throw new Error("No command acknowledgement or result");},undefined,true);
    try {
      const requestId=randomUUID();
      expect(await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId})).toMatchObject({status:"unknown",canReplay:false});
      const [pending]=await db.select().from(operations).where(eq(operations.requestId,requestId));expect(pending.status).toBe("unknown");expect(pending.outcome).toBeNull();
      const [held]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));expect(held.workerUnknown).toBe(true);expect(held.nativeEffectsUnknown).toBe(true);expect(held.releasedAt).toBeNull();
      await f.port.settle({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,outcome:{status:"accepted"}}});
      const [resolved]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,held.id));expect(resolved.workerUnknown).toBe(true);expect(resolved.nativeEffectsUnknown).toBe(false);expect(resolved.releasedAt).toBeNull();
    }finally{await detach();}
  });

  it("makes identical native result replay idempotent after finish and finalization",async()=>{
    const f=await active();try {
      const acceptId=randomUUID(),finishId=randomUUID();
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:acceptId});
      await f.broker.act(f.subject,{version:1,command:"finish",assignmentId:f.assignment.id,requestId:finishId,result:{}});
      const [finished]=await db.select().from(assignments).where(eq(assignments.id,f.assignment.id));expect(finished.status).toBe("settled");
      const receipts=await db.select().from(operations).where(eq(operations.assignmentId,f.assignment.id));
      const replay=(requestId:string,status:string)=>f.port.settle({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,outcome:{status}}});
      await Promise.all([replay(acceptId,"accepted"),replay(acceptId,"accepted"),replay(finishId,"completed")]);
      expect((await db.select().from(assignments).where(eq(assignments.id,f.assignment.id)))[0]).toEqual(finished);
      expect(await db.select().from(operations).where(eq(operations.assignmentId,f.assignment.id)).orderBy(operations.id)).toEqual([...receipts].sort((a,b)=>a.id.localeCompare(b.id)));
      await db.update(heartbeatRuns).set({status:"succeeded",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      await f.broker.reconcileTerminalAssignments(f.company.id,f.agent.id,f.binding.id);
      const [finalized]=await db.select().from(assignments).where(eq(assignments.id,f.assignment.id));
      const [released]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));expect(released.releasedAt).toBeInstanceOf(Date);
      await Promise.all([replay(acceptId,"accepted"),replay(finishId,"completed")]);
      await expect(replay(acceptId,"completed")).rejects.toThrow("conflicts");
      expect((await db.select().from(assignments).where(eq(assignments.id,f.assignment.id)))[0]).toEqual(finalized);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.id,released.id)))[0]).toEqual(released);
      await expect(db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)))).resolves.toBeUndefined();
    }finally{await f.detach();}
  });

  it("keeps historical Dot result replay idempotent after provider replacement",async()=>{
    const f=await fixture(),runId=randomUUID(),session=randomUUID(),turnId="dot_"+randomUUID();
    // A retained Dot journal can settle after its agent switches provider. It
    // grants no fresh work authority and does not require a live connection.
    const [binding]=await db.insert(dotAgentBindings).values({companyId:f.company.id,agentId:f.agent.id,operatorId:f.operatorId,status:"revoked",revokedAt:new Date()}).returning();
    await db.insert(heartbeatRuns).values({id:runId,companyId:f.company.id,agentId:f.agent.id,status:"succeeded",runtimeMode:"native",driverKind:"openai_dot_mcp",nativeSessionId:session});
    const [assignment]=await db.insert(dotRunnerAssignments).values({companyId:f.company.id,agentId:f.agent.id,bindingId:binding.id,bindingGeneration:1,runId,normalizedSessionId:session,turnId,controllerGeneration:1,catalogDigest:"dot",status:"offered",projection:{},acceptBy:new Date(),expiresAt:new Date(Date.now()+60000)}).returning();
    const acceptId=randomUUID(),finishId=randomUUID();
    await db.insert(dotRunnerOperations).values([{companyId:f.company.id,assignmentId:assignment.id,requestId:acceptId,digest:"accept",command:{action:"accept"},status:"admitted"},{companyId:f.company.id,assignmentId:assignment.id,requestId:finishId,digest:"finish",command:{action:"finish"},status:"admitted"}]);
    const ref={bindingId:binding.id,bindingGeneration:1,companyId:f.company.id,agentId:f.agent.id,acceptByUnixMs:Date.now(),expiresAtUnixMs:Date.now()+60000,runId,normalizedSessionId:session,turnId,assignmentRevision:1};
    const port=dotRunnerBroker(db).port({binding:{companyId:f.company.id,agentId:f.agent.id,runId},provider:{binding:ref}});
    const settle=(requestId:string,status:string)=>port.settle({sourceEventId:randomUUID(),payload:{binding:ref,requestId,outcome:{status}}});
    await settle(acceptId,"accepted");await settle(finishId,"completed");
    const [finished]=await db.select().from(dotRunnerAssignments).where(eq(dotRunnerAssignments.id,assignment.id));expect(finished.status).toBe("settled");
    const receipts=await db.select().from(dotRunnerOperations).where(eq(dotRunnerOperations.assignmentId,assignment.id)).orderBy(dotRunnerOperations.id);
    await Promise.all([settle(acceptId,"accepted"),settle(finishId,"completed")]);
    await expect(settle(acceptId,"completed")).rejects.toThrow("conflicts");
    expect((await db.select().from(dotRunnerAssignments).where(eq(dotRunnerAssignments.id,assignment.id)))[0]).toEqual(finished);
    expect(await db.select().from(dotRunnerOperations).where(eq(dotRunnerOperations.assignmentId,assignment.id)).orderBy(dotRunnerOperations.id)).toEqual(receipts);
  });

  it("rearms an unclaimed offer after a lost wake but never restarts a claimed assignment",async()=>{
    const f=await active();try {
      const first=await museReceiver(db).signal(f.binding.id);
      await db.update(mailbox).set({signalNotifiedAt:new Date(Date.now()-31000)}).where(eq(mailbox.assignmentId,f.assignment.id));
      const retry=await museReceiver(db).signal(f.binding.id);expect(retry.signal?.reference).not.toEqual(first.signal?.reference);
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});expect((await museReceiver(db).signal(f.binding.id)).signal).toBeNull();
    }finally{await f.detach();}
  });
  it("rejects missing public origin before replacing a durable connection",async()=>{
    const f=await fixture(),state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
    // A broker instance keeps its configured public origin; use a fresh DB
    // wrapper to exercise the same persisted binding with a bad setup origin.
    const bad=museRunnerBroker(createDb(externalDatabaseUrl??temporary!.connectionString),{publicOrigin:"http://invalid.example"});
    await expect(bad.createPairing({companyId:f.company.id,agentId:f.agent.id,operatorId:f.operatorId,replaceBindingId:f.binding.id,expectedRevision:state.revision})).rejects.toThrow("HTTPS");
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].revokedAt).toBeNull();
  });

  it("denies an existing subject after its same-provider configured binding changes",async()=>{
    const f=await fixture();await db.update(agents).set({adapterConfig:{provider:"muse",museBindingId:randomUUID(),allowUnmeteredProvider:true}}).where(eq(agents.id,f.agent.id));
    await expect(f.broker.inspect(f.subject,{version:1,query:"task.list"})).rejects.toThrow("authority");
    await expect(f.identity.authenticate(f.credentials.accessToken)).rejects.toThrow("authority");
  });

  it("gives a settled result an exact stop boundary when native finalization fails",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await db.update(assignments).set({status:"settled",acceptedResultAt:new Date()}).where(eq(assignments.id,f.assignment.id));
      await db.update(heartbeatRuns).set({status:"failed",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      await f.broker.reconcileTerminalAssignments(f.company.id,f.agent.id,f.binding.id);
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;expect(state.stop.status).toBe("cannot_confirm");expect(state.stop.boundary?.assignmentId).toBe(f.assignment.id);
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:state.stop.boundary!,expectedRevision:state.revision,workerStopped:true});
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0].releasedAt).toBeInstanceOf(Date);
    }finally{await f.detach();}
  });

  it("keeps the native-effect barrier when a Runner fence precedes worker attestation",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"pending",command:{action:"tool"},status:"pending"});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;expect(state.stop.nativeEffectsUnknown).toBe(true);
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:state.stop.boundary!,expectedRevision:state.revision,workerStopped:true});
      const [hold]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));expect(hold.releasedAt).toBeNull();expect(hold.nativeEffectsUnknown).toBe(true);
    }finally{await f.detach();}
  });

  it("preserves the original stop receipt across concurrent Runner replays and worker reporting",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const event={sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}};
      await f.port.dispatch(event);
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!,boundary=state.stop.boundary!;
      const [before]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      await Promise.all([f.port.dispatch(event),f.port.dispatch(event)]);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(before);
      await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:state.revision});
      const cleanup=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      await f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary,requestId:randomUUID()});
      const [reported]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(reported.workerReportedAt).toBeInstanceOf(Date);
      await f.port.dispatch(event);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(reported);
      const receipts=await db.select().from(mailbox).where(and(eq(mailbox.bindingId,f.binding.id),eq(mailbox.sourceEventId,event.sourceEventId)));
      expect(receipts).toHaveLength(1);expect(receipts[0].references.boundary).toEqual(boundary);
    }finally{await f.detach();}
  });

  it("does not revive an attested and released hold when its Runner stop event replays",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const event={sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}};
      await f.port.dispatch(event);
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:state.stop.boundary!,expectedRevision:state.stop.bindingRevision!,workerStopped:true});
      await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      const [attested]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(attested.workerUnknown).toBe(false);expect(attested.releasedAt).toBeInstanceOf(Date);
      await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)));
      await f.port.dispatch(event);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(attested);
      await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)));
    }finally{await f.detach();}
  });

  it("preserves reported worker stop and independent native uncertainty on Runner replay",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"pending",command:{action:"tool"},status:"pending"});
      const event={sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}};
      await f.port.dispatch(event);
      const before=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:before.revision});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      const cleanup=await f.identity.authenticate(f.credentials.cleanupToken,"cleanup");
      await f.broker.cleanup(cleanup,{command:"worker.quiescent",boundary:state.stop.boundary!,requestId:randomUUID()});
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:state.stop.boundary!,expectedRevision:state.stop.bindingRevision!,workerStopped:true});
      const [attested]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(attested.workerUnknown).toBe(false);expect(attested.nativeEffectsUnknown).toBe(true);expect(attested.releasedAt).toBeNull();
      expect(attested.workerReportedAt).toBeInstanceOf(Date);expect(attested.operatorAttestedAt).toBeInstanceOf(Date);
      await f.port.dispatch(event);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(attested);
      await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      await expect(db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)))).rejects.toThrow("unresolved");
    }finally{await f.detach();}
  });

  it("retains an attested server fence when its distinct late Runner stop fact arrives",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const before=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.revoke(f.company.id,f.agent.id,f.operatorId,{bindingId:f.binding.id,generation:1,expectedRevision:before.revision});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!,boundary=state.stop.boundary!;
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary,expectedRevision:state.stop.bindingRevision!,workerStopped:true});
      const [attested]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      const event={sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}};
      await f.port.dispatch(event);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(attested);
      const [receipt]=await db.select().from(mailbox).where(and(eq(mailbox.bindingId,f.binding.id),eq(mailbox.sourceEventId,event.sourceEventId)));
      expect(receipt.references.boundary).toEqual(boundary);
    }finally{await f.detach();}
  });

  it("holds newly unresolved native effects without erasing an attested worker stop",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
      await f.broker.attestStop(f.company.id,f.agent.id,f.operatorId,{boundary:state.stop.boundary!,expectedRevision:state.stop.bindingRevision!,workerStopped:true});
      await db.update(heartbeatRuns).set({status:"cancelled",finishedAt:new Date()}).where(eq(heartbeatRuns.id,f.runId));
      const [attested]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(attested.releasedAt).toBeInstanceOf(Date);
      await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)));
      await db.insert(operations).values({companyId:f.company.id,assignmentId:f.assignment.id,requestId:randomUUID(),digest:"recovered-pending",command:{action:"tool"},status:"pending"});
      const event={sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}};
      await f.port.dispatch(event);
      const [held]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      expect(held.stopBoundary).toEqual(attested.stopBoundary);expect(held.operatorAttestedAt).toEqual(attested.operatorAttestedAt);
      expect(held.workerReportedAt).toEqual(attested.workerReportedAt);expect(held.workerUnknown).toBe(false);
      expect(held.nativeEffectsUnknown).toBe(true);expect(held.releasedAt).toBeNull();
      await expect(db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,()=>assertNoExternalOverlap(tx,f.company.id,f.agent.id)))).rejects.toThrow("unresolved");
      await f.port.dispatch(event);
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(held);
    }finally{await f.detach();}
  });

  it("rejects a conflicting Runner source event before changing assignment or stop state",async()=>{
    const f=await active();try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      const [offer]=await db.select().from(mailbox).where(and(eq(mailbox.assignmentId,f.assignment.id),eq(mailbox.kind,"assignment")));
      const [before]=await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id));
      await expect(f.port.dispatch({sourceEventId:offer.sourceEventId,payload:{kind:"authority_revoked",binding:f.ref}})).rejects.toThrow("event identity");
      expect((await db.select().from(assignments).where(eq(assignments.id,f.assignment.id)))[0].status).toBe("accepted");
      expect((await db.select().from(externalAgentHolds).where(eq(externalAgentHolds.assignmentId,f.assignment.id)))[0]).toEqual(before);
    }finally{await f.detach();}
  });

  it("denies already-dispatched native authority immediately at the qualification deadline",async()=>{
    const f=await active();try {
      await db.update(bindings).set({qualificationId:randomUUID(),qualificationExpiresAt:new Date(Date.now()-1)}).where(eq(bindings.id,f.binding.id));
      await expect(f.broker.assertRunAuthority({binding:{companyId:f.company.id,agentId:f.agent.id,runId:f.runId},provider:{binding:f.ref}})).rejects.toThrow("deadline");
      await expect(f.broker.authorizingUserIdForBinding(f.ref)).rejects.toThrow("deadline");
      expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].revokedAt).toBeNull();
    }finally{await f.detach();}
  });

  it("promotes a verifying Muse hire through the ordinary lifecycle after authenticated background confirmation",async()=>{
    const f=await fixture(false);
    await db.update(agents).set({status:"paused",lifecycleState:"verifying",lifecycleOperation:{id:randomUUID(),hostComplete:false,completedPluginIds:[],attempts:0,responsibleUserId:f.operatorId},lifecycleRequiredPluginIds:[]}).where(eq(agents.id,f.agent.id));
    const harness=agentHarnessVerificationService(db,{} as PluginWorkerManager),onReady=vi.fn();
    const lifecycle=startAgentLifecycle(db,{requiredPluginIds:async()=>[],runPlugin:async()=>"complete",runHost:snapshot=>harness.verify(snapshot),onReady},()=>true);
    try {
      await lifecycle.sweep();expect((await db.select().from(agents).where(eq(agents.id,f.agent.id)))[0].lifecycleState).toBe("verifying");
      await museReceiver(db).signal(f.binding.id);await museReceiver(db).flush();
      const items=await f.broker.inspect(f.subject,{version:1,query:"mailbox",after:0}) as {items:Array<{references:{nonce:string}}>};
      await f.broker.act(f.subject,{version:1,command:"challenge.confirm",nonce:items.items[0].references.nonce,requestId:randomUUID()});
      await expect.poll(async()=> (await db.select().from(agents).where(eq(agents.id,f.agent.id)))[0].lifecycleState,{timeout:8000,interval:100}).toBe("ready");
      expect((await db.select().from(agents).where(eq(agents.id,f.agent.id)))[0].status).toBe("idle");expect(onReady).toHaveBeenCalledOnce();
    }finally{await lifecycle.stop();}
  });

  it("serves opaque public wake digests while worker and cleanup APIs still require private bearer authority",async()=>{
    const f=await active();try {
      const app=transport(),reply=await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id);
      expect(reply.status).toBe(200);expect(Object.keys(reply.body)).toEqual(["version","signal"]);expect(Object.keys(reply.body.signal)).toEqual(["reference"]);
      const [item]=await db.select().from(mailbox).where(eq(mailbox.assignmentId,f.assignment.id));
      expect(reply.body.signal.reference).toBe("sha256:"+createHash("sha256").update(`${f.binding.id}:1:${item.sourceEventId}:${item.signalAttempt}`).digest("hex"));
      expect(JSON.stringify(reply.body)).not.toContain(f.assignment.id);expect(JSON.stringify(reply.body)).not.toContain(f.issue.title);
      expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).body).toEqual(reply.body);
      expect((await request(app).get("/api/muse/v1/signal")).status).toBe(400);
      expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding","invalid")).status).toBe(400);
      expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",randomUUID())).status).toBe(410);
      expect((await request(app).get("/api/muse/v1/signal?binding="+f.binding.id)).status).toBe(404);
      expect((await request(app).post("/api/muse/v1/commands").set("X-Paperclip-Muse-Binding",f.binding.id).send({version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()})).status).toBe(401);
      expect((await request(app).post("/api/muse/v1/detector-cleanup").set("X-Paperclip-Muse-Binding",f.binding.id).send({version:1,bindingId:f.binding.id,generation:1,requestId:randomUUID(),detectorRemoved:true})).status).toBe(401);
      expect((await request(app).post("/api/muse/v1/queries").set("X-Paperclip-Muse-Binding",f.binding.id).send({version:1,query:"identify"})).status).toBe(401);
      expect((await request(app).post("/api/muse/v1/cleanup").set("X-Paperclip-Muse-Binding",f.binding.id).send({version:1,command:"control.inspect"})).status).toBe(401);
    }finally{await f.detach();}
  });
  it.each(["input", "challenge"] as const)("signals pending stop control while paused and keeps ordinary %s quiet",async(kind)=>{
    const oauth=await oauthFixture(true),f=await active(oauth);try {
      await f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      if(kind==="input") {
        const requestId="paused_question",response={schema:"paperclip.question_response.v1",answers:[]},inputDigest=digestPaperclipSemanticContent({requestId,turnId:f.ref.turnId,response});
        await f.port.inputAvailable({sourceEventId:randomUUID(),payload:{binding:f.ref,requestId,turnId:f.ref.turnId,inputDigest,response}});
      } else {
        const state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
        await f.broker.verify(f.company.id,f.agent.id,{bindingId:f.binding.id,generation:1,expectedRevision:state.revision});
      }
      await f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"authority_revoked",binding:f.ref}});
      await db.update(agents).set({status:"paused"}).where(eq(agents.id,f.agent.id));
      const app=transport(),poll=()=>request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id);
      const first=await poll();expect(first.status).toBe(200);expect(first.body.signal?.reference).toMatch(/^sha256:/);
      const [stop]=await db.select().from(mailbox).where(and(eq(mailbox.bindingId,f.binding.id),eq(mailbox.kind,"authority_revoked")));
      expect(stop.signalAttempt).toBe(1);expect(stop.signalNotifiedAt).toBeInstanceOf(Date);
      const ordinary=await db.select().from(mailbox).where(eq(mailbox.bindingId,f.binding.id));
      expect(ordinary.filter(item=>item.kind!=="authority_revoked").every(item=>item.signalNotifiedAt===null)).toBe(true);
      const inbox=await request(app).post("/api/muse/v1/queries").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,query:"mailbox",after:0});
      expect(inbox.status).toBe(200);expect(inbox.body).toMatchObject({items:expect.arrayContaining([expect.objectContaining({kind:"authority_revoked",references:stop.references})])});
      const ack=await request(app).post("/api/muse/v1/queries").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,query:"mailbox",after:stop.id});
      expect(ack.status).toBe(200);expect((await poll()).body).toEqual({version:1,signal:null});
      const accept=await request(app).post("/api/muse/v1/commands").set("Authorization","Bearer "+oauth.tokens!.access_token).send({version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()});
      expect(accept.status).toBe(403);expect(f.sent).toHaveLength(1);
      expect((await f.broker.bindingForAgent(f.company.id,f.agent.id))!.stop.status).toBe("cannot_confirm");
    }finally{await f.detach();}
  });

  it("keeps paused and feature-disabled public receivers idle, resumes them, and fences lost current authority",async()=>{
    const f=await active();try {
      const app=transport(),poll=()=>request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id);
      await db.update(agents).set({status:"paused"}).where(eq(agents.id,f.agent.id));expect((await poll()).body).toEqual({version:1,signal:null});
      await db.update(agents).set({status:"active"}).where(eq(agents.id,f.agent.id));expect((await poll()).body.signal.reference).toMatch(/^sha256:/);
      await instanceSettingsService(db).updateExperimental({enableMuse:false});expect((await poll()).body).toEqual({version:1,signal:null});
      await instanceSettingsService(db).updateExperimental({enableMuse:true});expect((await poll()).body.signal.reference).toMatch(/^sha256:/);
      await db.update(companyMemberships).set({status:"inactive"}).where(and(eq(companyMemberships.companyId,f.company.id),eq(companyMemberships.principalId,f.operatorId)));expect((await poll()).status).toBe(410);
    }finally{await instanceSettingsService(db).updateExperimental({enableMuse:true});await f.detach();}
  });
  it("returns410 for expired refresh authority and thirty days of authenticated inactivity",async()=>{
    const expired=await fixture(false),inactive=await fixture(false),app=transport();
    await db.update(museCredentials).set({expiresAt:new Date(Date.now()-1)}).where(and(eq(museCredentials.bindingId,expired.binding.id),eq(museCredentials.kind,"refresh")));
    expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",expired.binding.id)).status).toBe(410);
    await db.update(bindings).set({workerActivityAt:new Date(Date.now()-30*86400000)}).where(eq(bindings.id,inactive.binding.id));
    expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",inactive.binding.id)).status).toBe(410);
  });
  it("keeps transient authority-check failures retryable and records no failed public contact",async()=>{
    const f=await fixture(false),app=transport(),check=vi.spyOn(museIdentityModule,"assertMuseReceiverAuthority").mockRejectedValueOnce(new Error("Synthetic database transport failure"));
    try {
      expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).status).toBe(500);
      await museReceiver(db).flush();expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].receiverContactAt).toBeNull();
      expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).status).toBe(200);
    }finally{check.mockRestore();}
  });
  it("retains immutable asset1 through asset5 bytes and advertises finite asset6 routes",async()=>{
    const app=transport(),manifests=await Promise.all([1,2,3,4,5,6].map(version=>request(app).get(`/api/muse/v1/assets/${version}/manifest.json`)));
    expect(manifests[0].body.assets).toEqual({"client.py":{sha256:"8926534cce48e11d5ea157dfd4deb435c9f8d7d8ea58d3d8a5424b45ab31d1f7"},"detector.sh":{sha256:"09981df12ebce8c50b68e5da64edfe5ab5350d56bf6392ec52023c4990ca658d"},"instructions.md":{sha256:"d347f4d0e7a03bb0397dd4b2ddf38350c8b73ee3c0a91b50cd6c3cd84458a45f"}});
    expect(manifests[1].body.assets).toEqual({"client.py":{sha256:"a89a90cf6ca6ae76be1662a9efda83f69dba3bccdd4c37cfe1935563b1f7330f"},"detector.sh":{sha256:"8e9f5de4f7dc18cbca7121fff6bcab4039dc66056441396826460d7f396c3b41"},"instructions.md":{sha256:"6770734ec4494a5d0403e5cc56ac69613faab96b66a96cf56108cec8dcda07a0"}});
    expect(manifests[2].body.assets).toEqual({"client.py":{sha256:"ed171e60dac5d1ea92b5cce40323ad10d5c87448a926678e9e32aacdd5feca0f"},"detector.sh":{sha256:"8e9f5de4f7dc18cbca7121fff6bcab4039dc66056441396826460d7f396c3b41"},"instructions.md":{sha256:"2e7a4677b1b55ca391b62c7530736441c51e9f7ec9354ed50c776bc786bfa901"}});
    expect(manifests[3].body.assets).toEqual({"client.py":{sha256:"42d9a1a9d795da54393bc9616e9e3ae6e9d9f6735d7728148e6080608aafdfc7"},"detector.sh":{sha256:"8e9f5de4f7dc18cbca7121fff6bcab4039dc66056441396826460d7f396c3b41"},"instructions.md":{sha256:"d57f1c43c0d3c7a76f9ed99e73a5a5cdb46c2b7e470efd451519bc3cc3d7d8f3"}});
    expect(manifests[4].body.assets).toEqual({"client.py":{sha256:"55001af1ac3f5e2e904af1254180d4852025e41ed5c424c0814831a9537e50ca"},"detector.sh":{sha256:"1cbd1dd379987c7dadebbc466af312d72065e322d19c1ac2d8931ae2779885d7"},"instructions.md":{sha256:"46488fc1f50520e5f0a53e2a1cd4f944fcf4bd5cacad57de1d68d41d10904041"}});
    for(const version of [1,2,3,4,5,6]){
      const manifest=manifests[version-1];expect(manifest.status).toBe(200);expect(manifest.body.assetVersion).toBe(version);expect(manifest.body.clientVersion).toBe(String(version));expect(manifest.headers["cache-control"]).toContain("immutable");
      for(const name of ["client.py","detector.sh","instructions.md"]){const response=await request(app).get(`/api/muse/v1/assets/${version}/${name}`);expect(response.status).toBe(200);expect(response.headers["cache-control"]).toContain("immutable");expect(createHash("sha256").update(response.text).digest("hex")).toBe(manifest.body.assets[name].sha256);}
    }
    expect(MUSE_PUBLIC_ROUTES).toHaveLength(36);
    for(const path of ["/api/muse/v1/assets/7/client.py","/api/muse/v1/assets/6/extra.py","/api/muse/v1/assets/6/client.py?version=6"]){expect((await request(app).get(path)).status).toBe(404);}
    expect((await request(app).post("/api/muse/v1/assets/4/client.py")).status).toBe(404);
    expect((await request(transport(true)).post("/api/muse/v1/pair").send({version:1,ticket:"synthetic-unused-ticket",clientVersion:"1"})).status).toBe(400);
  });
  it("creates setup standing delegation from the actual scoped pairing company and agent",async()=>{
    const f=await fixture(false),state=(await f.broker.bindingForAgent(f.company.id,f.agent.id))!;
    const pairing=await f.broker.createPairing({companyId:f.company.id,agentId:f.agent.id,operatorId:f.operatorId,replaceBindingId:f.binding.id,expectedRevision:state.revision});
    expect(pairing.setupInstruction).toContain(JSON.stringify({companyId:f.company.id,companyName:f.company.name,agentId:f.agent.id,agentName:f.agent.name,bindingId:pairing.bindingId}));
    expect(pairing.setupInstruction).toContain("standing authorization");expect(pairing.setupInstruction).toContain("autonomously accept");expect(pairing.setupInstruction).toContain("native accepted lease before any task effect");
    expect(pairing.setupInstruction).toContain(`--company-id '${f.company.id}' --company-name '${f.company.name}' --agent-id '${f.agent.id}' --agent-name '${f.agent.name}'`);
    expect(pairing.setupInstruction).toContain(`/paperclip-muse-${pairing.bindingId}/SKILL.md`);
  });

  it("redeems Muse PKCE ticket into its exact agent/operator grant and keeps pre-token polling pending",async()=>{
    const f=await oauthFixture(),redirect=new URL(f.authorizationUrl!);expect(redirect.origin+redirect.pathname).toBe(oauthCallback);expect(redirect.searchParams.get("state")).toBe(f.input.state);expect(redirect.searchParams.get("iss")).toBe(oauthOrigin+"/api/muse/v1/oauth");
    const [grant]=await db.select().from(mcpOauthGrants).where(eq(mcpOauthGrants.id,f.binding.grantId!));expect(grant).toMatchObject({companyId:f.company.id,agentId:f.agent.id,userId:f.operatorId,purpose:"agent",resource:oauthResource,scopes:["paperclip:agent","offline_access"]});
    expect(f.binding.ticketHash).toBeNull();expect(f.binding.pairedAt).toBeInstanceOf(Date);expect(await db.select().from(museCredentials).where(eq(museCredentials.bindingId,f.binding.id))).toHaveLength(0);
    expect(await inspectMuseConnectionCredential(db,f.binding,oauthResource)).toEqual({state:"pending",refreshExpiresAt:null});
    expect((await request(transport()).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).body).toEqual({version:1,signal:null});
    const tokens=await f.oauth.token(f.tokenInput()),subject=await f.identity.authenticateOAuthAccess(tokens.access_token,oauthOrigin);
    expect(subject).toMatchObject({credentialSource:"oauth",grantId:grant.id,provider:"muse",agentId:f.agent.id,authorizingUserId:f.operatorId});
    const [stored]=await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.tokenHash,hashMcpSecret(tokens.access_token)));expect(subject.credentialId).toBe(stored.id);
    expect((await inspectMuseConnectionCredential(db,(await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0],oauthResource)).state).toBe("active");
    expect((await request(transport()).post("/api/muse/v1/queries").set("Authorization","Bearer "+tokens.access_token).send({version:1,query:"identify"})).body).toMatchObject({bindingId:f.binding.id,agentId:f.agent.id});
    await expect(f.oauth.authorize(f.input)).rejects.toThrow();await expect(f.oauth.token(f.tokenInput())).rejects.toThrow();
  });
  it("enforces registered redirects,S256,current authority and ticket expiry before Muse redemption",async()=>{
    const f=await oauthFixture(false,false);
    for(const extra of [{redirect_uri:"https://attacker.example/callback"},{code_challenge_method:"plain"},{resource:oauthOrigin+"/mcp/paperclip"},{scope:"paperclip:agent"},{company_id:randomUUID()}])await expect(f.oauth.authorize({...f.input,...extra})).rejects.toThrow();
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].ticketHash).not.toBeNull();
    await db.update(companyMemberships).set({status:"inactive"}).where(and(eq(companyMemberships.companyId,f.company.id),eq(companyMemberships.principalId,f.operatorId)));await expect(f.oauth.authorize(f.input)).rejects.toThrow();
    await db.update(companyMemberships).set({status:"active"}).where(and(eq(companyMemberships.companyId,f.company.id),eq(companyMemberships.principalId,f.operatorId)));
    await db.update(bindings).set({ticketExpiresAt:new Date(Date.now()-1)}).where(eq(bindings.id,f.binding.id));await expect(f.oauth.authorize(f.input)).rejects.toThrow();
  });
  it("keeps only one Muse OAuth grant when ticket authorization races and rejects expired PKCE codes",async()=>{
    const f=await oauthFixture(false,false),results=await Promise.allSettled([f.oauth.authorize(f.input),f.oauth.authorize(f.input)]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    const [binding]=await db.select().from(bindings).where(eq(bindings.id,f.binding.id));expect(await db.select().from(mcpOauthGrants).where(eq(mcpOauthGrants.agentId,f.agent.id))).toHaveLength(1);
    await db.update(mcpOauthRequests).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthRequests.grantId,binding.grantId!));
    expect((await request(transport()).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).status).toBe(410);
  });
  it("rotates finite Muse OAuth refresh,defaults absent resource only here,and fences replay without cleanup exception",async()=>{
    const f=await oauthFixture(true),original=f.tokens!;
    const [before]=await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.tokenHash,hashMcpSecret(original.refresh_token!)));expect(before.expiresAt).toBeInstanceOf(Date);expect(before.expiresAt!.getTime()-Date.now()).toBeLessThanOrEqual(30*86400000);
    const rotated=await f.oauth.token({grant_type:"refresh_token",client_id:f.client.client_id,refresh_token:original.refresh_token});expect(rotated.refresh_token).not.toBe(original.refresh_token);
    await expect(f.oauth.token({grant_type:"refresh_token",client_id:f.client.client_id,refresh_token:rotated.refresh_token,resource:oauthOrigin+"/mcp/runner"})).rejects.toThrow();
    await expect(f.oauth.token({grant_type:"refresh_token",client_id:f.client.client_id,refresh_token:original.refresh_token})).rejects.toThrow();
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].revokedAt).toBeInstanceOf(Date);
    for(const path of ["queries","cleanup","detector-cleanup"]){const body=path==="queries"?{version:1,query:"identify"}:path==="cleanup"?{version:1,command:"control.inspect"}:{version:1,requestId:randomUUID(),bindingId:f.binding.id,generation:1,detectorRemoved:true};expect((await request(transport()).post("/api/muse/v1/"+path).set("Authorization","Bearer "+rotated.access_token).send(body)).status).toBe(401);}
  });
  it("keeps public OAuth contact from extending authenticated inactivity and denies wrong resource/offline scope",async()=>{
    const f=await oauthFixture(true),[refresh]=await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.tokenHash,hashMcpSecret(f.tokens!.refresh_token!)));
    await museReceiver(db).signal(f.binding.id,oauthResource);await museReceiver(db).flush();expect((await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.id,refresh.id)))[0].expiresAt).toEqual(refresh.expiresAt);
    await db.update(mcpOauthGrants).set({resource:"https://another.example/api/muse/v1"}).where(eq(mcpOauthGrants.id,f.binding.grantId!));
    expect((await inspectMuseConnectionCredential(db,f.binding,oauthResource)).state).toBe("revoked");await expect(assertMuseSubjectCredential(db,f.subject,oauthResource)).rejects.toThrow();
    await db.update(mcpOauthGrants).set({resource:oauthResource,scopes:["paperclip:agent"]}).where(eq(mcpOauthGrants.id,f.binding.grantId!));expect((await inspectMuseConnectionCredential(db,f.binding,oauthResource)).state).toBe("revoked");
    await db.update(mcpOauthGrants).set({scopes:["paperclip:agent","offline_access"]}).where(eq(mcpOauthGrants.id,f.binding.grantId!));
    await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthTokens.id,refresh.id));expect((await inspectMuseConnectionCredential(db,f.binding,oauthResource)).state).toBe("expired");
    expect((await request(transport()).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).status).toBe(410);
  });
  it("serves PKCE OAuth ingress and disables raw HTTPlegacy pairing by default",async()=>{
    const f=await oauthFixture(false,false),app=transport();
    expect((await request(app).get("/api/muse/v1/oauth/metadata")).body).toMatchObject({issuer:oauthOrigin+"/api/muse/v1/oauth",token_endpoint_auth_methods_supported:["none"],code_challenge_methods_supported:["S256"]});
    expect((await request(app).post("/api/muse/v1/pair").send({version:1,ticket:f.ticket,clientVersion:"2"})).status).toBe(404);
    expect((await request(app).post("/api/muse/v1/refresh").send({version:1,refreshToken:f.credentials.refreshToken})).status).toBe(404);
    const reply=await request(app).get("/api/muse/v1/oauth/authorize").query(f.input);expect(reply.status).toBe(303);expect(reply.headers["referrer-policy"]).toBe("no-referrer");
    const code=new URL(reply.headers.location).searchParams.get("code")!;
    const exchange=await request(app).post("/api/muse/v1/oauth/token").type("form").send({grant_type:"authorization_code",client_id:f.client.client_id,redirect_uri:oauthCallback,code,code_verifier:f.verifier});expect(exchange.status).toBe(200);expect(exchange.body.token_type).toBe("Bearer");
    expect((await request(app).post("/api/muse/v1/oauth/revoke").type("form").send({client_id:f.client.client_id,token:exchange.body.access_token})).status).toBe(200);
    expect((await request(app).get("/api/muse/v1/signal").set("X-Paperclip-Muse-Binding",f.binding.id)).status).toBe(410);
  });
  it.each(["access_expired","grant_revoked"])("rechecks idle OAuth authority after waiting for its transaction lock:%s",async(reason)=>{
    const f=await oauthFixture(true),requestId=randomUUID(),title="Must not create "+randomUUID();let outcome:Promise<{value?:unknown;error?:unknown}>|undefined;
    await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,async()=>{
      await tx.select().from(bindings).where(eq(bindings.id,f.binding.id)).for("update");
      outcome=f.broker.act(f.subject,{version:1,command:"task.create",requestId,title}).then(value=>({value}),error=>({error}));
      await expect.poll(async()=>{const result=await db.execute(sql`select count(*)::int as count from pg_stat_activity where datname=current_database() and lower(wait_event)='advisory'`);return Number(result[0]?.count??0);},{timeout:5000,interval:25}).toBeGreaterThan(0);
      if(reason==="access_expired")await tx.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(eq(mcpOauthTokens.id,f.subject.credentialId));
      else await tx.update(mcpOauthGrants).set({revokedAt:new Date()}).where(eq(mcpOauthGrants.id,f.binding.grantId!));
    }));
    expect((await outcome!).error).toBeDefined();expect(await db.select().from(issues).where(eq(issues.title,title))).toHaveLength(0);expect(await db.select().from(museIdleReceipts).where(eq(museIdleReceipts.requestId,requestId))).toHaveLength(0);
  });
  it.each(["code","refresh","revoke"])("serializes Muse OAuth%s behind the broker admission/binding prefix without grant/token lock inversion",async(kind)=>{
    const f=await oauthFixture(kind!=="code");let operation:Promise<{value?:unknown;error?:unknown}>|undefined;
    await db.transaction(tx=>withExternalAdmissionGuard(tx,f.company.id,f.agent.id,async()=>{
      await tx.select().from(bindings).where(eq(bindings.id,f.binding.id)).for("update");
      operation=(kind==="code"?f.oauth.token(f.tokenInput()):kind==="refresh"?f.oauth.token({grant_type:"refresh_token",client_id:f.client.client_id,refresh_token:f.tokens!.refresh_token}):f.oauth.revokeToken(f.tokens!.access_token,f.client.client_id)).then(value=>({value}),error=>({error}));
      await expect.poll(async()=>{const result=await db.execute(sql`select count(*)::int as count from pg_stat_activity where datname=current_database() and lower(wait_event)='advisory'`);return Number(result[0]?.count??0);},{timeout:5000,interval:25}).toBeGreaterThan(0);
      // Before the repair,token/code acquired this grant before waiting on binding.
      await tx.execute(sql`set local lock_timeout='1s'`);await tx.select().from(mcpOauthGrants).where(eq(mcpOauthGrants.id,f.binding.grantId!)).for("update");
      await tx.update(mcpOauthGrants).set({revokedAt:new Date()}).where(eq(mcpOauthGrants.id,f.binding.grantId!));
    }));
    const result=await operation!;if(kind!=="revoke")expect(result.error).toBeDefined();else expect(result.error).toBeUndefined();
  });
  it("withholds fresh native dispatch when OAuthgrant is revoked before the binding fence or its refresh family expires",async()=>{
    const base=await oauthFixture(true),f=await active(base);try {
      await db.update(mcpOauthGrants).set({revokedAt:new Date()}).where(eq(mcpOauthGrants.id,base.binding.grantId!));
      expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].revokedAt).toBeNull();
      await expect(f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()})).rejects.toThrow();expect(f.sent).toHaveLength(0);
      await expect(f.port.dispatch({sourceEventId:randomUUID(),payload:{kind:"assignment",binding:f.ref,tools:[],acceptByUnixMs:Date.now()+600000,expiresAtUnixMs:Date.now()+3600000}})).rejects.toThrow();
      await db.update(mcpOauthGrants).set({revokedAt:null}).where(eq(mcpOauthGrants.id,base.binding.grantId!));await db.update(mcpOauthTokens).set({expiresAt:new Date(Date.now()-1)}).where(and(eq(mcpOauthTokens.grantId,base.binding.grantId!),eq(mcpOauthTokens.kind,"refresh")));
      await expect(f.broker.act(f.subject,{version:1,command:"accept",assignmentId:f.assignment.id,requestId:randomUUID()})).rejects.toThrow();expect(f.sent).toHaveLength(0);
    }finally{await f.detach();}
  });
  it("revokes a persisted Muse grant through generic connection management after a public-origin change",async()=>{
    const f=await oauthFixture(true),otherOrigin="https://new.paperclip.example",management=createPublicMcpOAuth(db,{origin:otherOrigin,resource:otherOrigin+"/mcp/paperclip"});
    await instanceSettingsService(db).updateExperimental({enablePublicMcp:true});
    await management.revokeConnection(f.binding.grantId!,f.operatorId);
    expect((await db.select().from(mcpOauthGrants).where(eq(mcpOauthGrants.id,f.binding.grantId!)))[0].revokedAt).toBeInstanceOf(Date);
    expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].revokedAt).toBeInstanceOf(Date);
    expect(await db.select().from(dotAgentBindings).where(eq(dotAgentBindings.agentId,f.agent.id))).toHaveLength(0);
  });
  it("reports installed client version only after a currently authenticated identify declaration",async()=>{
    const f=await oauthFixture();expect(f.binding.clientVersion).toBeNull();const tokens=await f.oauth.token(f.tokenInput()),app=transport();
    const identify=(clientVersion?:string)=>request(app).post("/api/muse/v1/queries").set("Authorization","Bearer "+tokens.access_token).send({version:1,query:"identify",...(clientVersion?{clientVersion}:{})});
    expect((await identify("3")).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("3");
    expect((await identify()).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("3");
    expect((await identify("4")).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("4");
    expect((await identify()).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("4");
    expect((await identify("5")).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("5");
    expect((await identify(MUSE_CLIENT_VERSION)).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe(MUSE_CLIENT_VERSION);
    expect((await identify()).status).toBe(200);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe(MUSE_CLIENT_VERSION);
    expect((await identify(String(Number(MUSE_CLIENT_VERSION)+1))).status).toBe(400);
    await db.update(bindings).set({clientVersion:"2"}).where(eq(bindings.id,f.binding.id));await db.update(mcpOauthGrants).set({revokedAt:new Date()}).where(eq(mcpOauthGrants.id,f.binding.grantId!));
    expect((await identify("4")).status).toBe(401);expect((await db.select().from(bindings).where(eq(bindings.id,f.binding.id)))[0].clientVersion).toBe("2");
    expect((await request(app).post("/api/muse/v1/queries").send({version:1,query:"identify",clientVersion:"3"})).status).toBe(401);
  });
  it("preserves personal and Dot default OAuth resources and their deployed refresh policy",async()=>{
    await instanceSettingsService(db).updateExperimental({enablePublicMcp:true,enableOpenAiDot:true});const f=await fixture();
    const personal=createPublicMcpOAuth(db,{origin:oauthOrigin,resource:oauthOrigin+"/mcp/paperclip"}),client=await personal.register({client_name:"Personal",redirect_uris:[oauthCallback]},randomUUID()),verifier=randomBytes(32).toString("base64url"),challenge=createHash("sha256").update(verifier).digest("base64url");
    await expect(personal.authorize({client_id:client.client_id,redirect_uri:oauthCallback,response_type:"code",code_challenge:challenge,code_challenge_method:"S256"})).rejects.toThrow();
    const personalId=(await personal.authorize({client_id:client.client_id,redirect_uri:oauthCallback,response_type:"code",resource:personal.config.resource,scope:"paperclip:read offline_access",code_challenge:challenge,code_challenge_method:"S256"})).split("/").at(-1)!;
    const consent=await personal.consent(personalId,{type:"board",source:"session",userId:f.operatorId},{decision:"approve",companyId:f.company.id,allowWrites:false}),tokens=await personal.token({grant_type:"authorization_code",client_id:client.client_id,redirect_uri:oauthCallback,resource:personal.config.resource,code:new URL(consent.redirectUrl).searchParams.get("code")!,code_verifier:verifier});
    expect((await personal.authenticate(tokens.access_token)).actor).toMatchObject({type:"board",userId:f.operatorId,isInstanceAdmin:false});
    const [personalRefresh]=await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.tokenHash,hashMcpSecret(tokens.refresh_token!)));expect(personalRefresh.expiresAt).toBeInstanceOf(Date);
    const [agent]=await db.insert(agents).values({companyId:f.company.id,name:"Dot",status:"active",adapterType:"paperclip_runner",adapterConfig:{provider:"openai_dot"}}).returning();const dot=createPublicMcpOAuth(db,{origin:oauthOrigin,resource:oauthOrigin+"/mcp/runner"}),dotClient=await dot.register({client_name:"Dot",redirect_uris:[oauthCallback]},randomUUID()),pairing=await dotRunnerBroker(db).createPairing({companyId:f.company.id,agentId:agent.id,operatorId:f.operatorId});
    const dotId=(await dot.authorize({client_id:dotClient.client_id,redirect_uri:oauthCallback,response_type:"code",resource:dot.config.resource,scope:"paperclip:agent offline_access",code_challenge:challenge,code_challenge_method:"S256"})).split("/").at(-1)!;
    const linked=await dot.consentDotPairing(dotId,pairing.pairingCode),dotTokens=await dot.token({grant_type:"authorization_code",client_id:dotClient.client_id,redirect_uri:oauthCallback,resource:dot.config.resource,code:new URL(linked.redirectUrl).searchParams.get("code")!,code_verifier:verifier});
    expect((await dot.authenticate(dotTokens.access_token)).actor).toMatchObject({type:"agent",agentId:agent.id});const [dotRefresh]=await db.select().from(mcpOauthTokens).where(eq(mcpOauthTokens.tokenHash,hashMcpSecret(dotTokens.refresh_token!)));expect(dotRefresh.expiresAt).toBeNull();
  });

});
