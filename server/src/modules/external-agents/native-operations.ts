import type { ExternalProviderOperation } from "../../vendor/paperclip-runner/index.js";
/** Closed provider stores retain their existing journals; this shared lane owns the receipt lifecycle and current-authority replay boundary. */
export interface ExternalOperationReceipt { id: string; status: string; outcome: Record<string, unknown> | null }
export async function submitExternalOperation<R extends ExternalOperationReceipt>(input: {
  command: ExternalProviderOperation;
  reserve: (command: ExternalProviderOperation) => Promise<R>;
  forward: (receipt: R) => Promise<void>;
  inspect: (id: string) => Promise<R | undefined>;
  authorizeReceipt: () => Promise<void>;
  afterReceipt?: (receipt: R) => Promise<void>;
  replayableStates: readonly string[];
  assignmentId: string;
}): Promise<Record<string, unknown>> {
  const reserved=await input.reserve(input.command);
  // The closed provider policy decides whether a reserved/admitted command can
  // be sent again. Unknown effects never become a dispatch opportunity.
  if(input.replayableStates.includes(reserved.status)) void input.forward(reserved).catch(()=>{});
  const deadline=Date.now()+1500;
  while(Date.now()<deadline) {
    const receipt=await input.inspect(reserved.id);
    if(receipt?.outcome) {
      await input.authorizeReceipt();
      await input.afterReceipt?.(receipt);
      return receipt.outcome;
    }
    if(receipt?.status==="unknown") { await input.authorizeReceipt(); return {status:"unknown",assignmentId:input.assignmentId,requestId:input.command.requestId,canReplay:false}; }
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  return {status:"pending",assignmentId:input.assignmentId,requestId:input.command.requestId,message:"Read the durable receipt or retry with the same request ID and identical arguments."};
}
