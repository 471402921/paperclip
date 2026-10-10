import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { museAgentBindings as bindings, museMailboxItems as mailbox, museReceiverContactBuckets as buckets, type Db } from "@paperclipai/db";
import type { AgentConnectionSubject } from "@paperclipai/shared";
const PERSISTENCE_LAG_MS=30_000;
const instances=new WeakMap<Db,ReturnType<typeof createReceiver>>();
export function museReceiver(db:Db) {let receiver=instances.get(db);if(!receiver){receiver=createReceiver(db);instances.set(db,receiver);}return receiver;}
function createReceiver(db:Db) {
  const replicaId=randomUUID();
  const pending=new Map<string,{companyId:string;bindingId:string;bindingGeneration:number;bucketAt:Date;firstAt:Date;lastAt:Date;contacts:number;gapsAtMostSevenSeconds:number;maxGapMs:number;timestamps:string[];incomplete:boolean}>();
  const previous=new Map<string,number>();
  let flushPromise:Promise<void>|undefined;
  async function flush() {
    if(flushPromise)return flushPromise;
    flushPromise=(async()=>{
      const batch=[...pending.entries()];pending.clear();
      for(const [key,bucket]of batch) {
        try {
          await db.transaction(async tx=>{
            await tx.insert(buckets).values({...bucket,replicaId}).onConflictDoUpdate({target:[buckets.bindingId,buckets.bindingGeneration,buckets.replicaId,buckets.bucketAt],set:{lastAt:bucket.lastAt,contacts:sql`${buckets.contacts}+${bucket.contacts}`,gapsAtMostSevenSeconds:sql`${buckets.gapsAtMostSevenSeconds}+${bucket.gapsAtMostSevenSeconds}`,maxGapMs:sql`greatest(${buckets.maxGapMs},${bucket.maxGapMs})`,timestamps:sql`${buckets.timestamps} || ${JSON.stringify(bucket.timestamps)}::jsonb`,incomplete:sql`${buckets.incomplete} or ${bucket.incomplete}`}});
            await tx.update(bindings).set({receiverContactAt:sql`greatest(${bindings.receiverContactAt},${bucket.lastAt})`}).where(and(eq(bindings.id,bucket.bindingId),eq(bindings.generation,bucket.bindingGeneration)));
          });
        } catch {
          const newer=pending.get(key);
          if(newer){newer.firstAt=bucket.firstAt;newer.contacts+=bucket.contacts;newer.timestamps=[...bucket.timestamps,...newer.timestamps].slice(0,60);newer.incomplete=true;}
          else pending.set(key,{...bucket,incomplete:true});
        }
      }
    })().finally(()=>{flushPromise=undefined;});return flushPromise;
  }
  async function signal(s:AgentConnectionSubject) {
    const now=Date.now(),key=`${s.bindingId}:${s.generation}:${Math.floor(now/PERSISTENCE_LAG_MS)}`;
    const gap=previous.has(s.bindingId)?now-previous.get(s.bindingId)!:0;previous.set(s.bindingId,now);
    let bucket=pending.get(key);
    if(!bucket){bucket={companyId:s.companyId,bindingId:s.bindingId,bindingGeneration:s.generation,bucketAt:new Date(Math.floor(now/PERSISTENCE_LAG_MS)*PERSISTENCE_LAG_MS),firstAt:new Date(now),lastAt:new Date(now),contacts:0,gapsAtMostSevenSeconds:0,maxGapMs:0,timestamps:[],incomplete:false};pending.set(key,bucket);}
    bucket.contacts++;bucket.lastAt=new Date(now);if(gap>0&&gap<=7000)bucket.gapsAtMostSevenSeconds++;bucket.maxGapMs=Math.max(bucket.maxGapMs,gap);
    if(bucket.timestamps.length<60)bucket.timestamps.push(new Date(now).toISOString());else bucket.incomplete=true;
    const [b]=await db.select().from(bindings).where(and(eq(bindings.id,s.bindingId),eq(bindings.generation,s.generation),isNull(bindings.revokedAt)));
    if(!b)return {version:1 as const,signal:null};
    const [item]=await db.select({id:mailbox.id}).from(mailbox).where(and(eq(mailbox.bindingId,b.id),eq(mailbox.bindingGeneration,b.generation),gt(mailbox.id,b.workerCursor))).orderBy(asc(mailbox.id)).limit(1);
    return {version:1 as const,signal:item?{reference:`${b.id}:${b.generation}:${item.id}`}:null};
  }
  let timer:NodeJS.Timeout|undefined;
  function start() {if(timer)return;timer=setInterval(()=>void flush().catch(()=>{}),PERSISTENCE_LAG_MS);timer.unref();}
  async function stop() {if(timer)clearInterval(timer);timer=undefined;await flush();}
  return {signal,flush,start,stop,persistenceLagMs:PERSISTENCE_LAG_MS};
}
