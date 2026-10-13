import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { unprocessable } from "../errors.js";
/** Asset1 is immutable historical source; new installations use asset2. */
export async function museReceiverAssets(assetVersion: 1 | 2 = 2) {
  const prefix = assetVersion === 1 ? "./scripts/v1/" : "./scripts/muse-";
  const readAsset = (name: string) => readFile(fileURLToPath(new URL(prefix + name, import.meta.url)), "utf8");
  const [client, detector, instructions] = await Promise.all([readAsset("client.py"), readAsset("detector.sh"), readAsset("instructions.md")]);
  return { client, detector, instructions, manifest: { version: 1, assetVersion,
    clientVersion: String(assetVersion), assets: {
      "client.py": { sha256: createHash("sha256").update(client).digest("hex") },
      "detector.sh": { sha256: createHash("sha256").update(detector).digest("hex") },
      "instructions.md": { sha256: createHash("sha256").update(instructions).digest("hex") },
    } } };
}
export function musePublicOrigin(value?:string) {
  const origin=value??process.env.PAPERCLIP_PUBLIC_URL??process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL??process.env.PAPERCLIP_MANAGED_RUNTIME_PUBLIC_URL;
  try {const parsed=new URL(origin??"");if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)throw new Error();return parsed.origin;}
  catch {throw unprocessable("Configure a stable public HTTPS Paperclip hostname before connecting Muse.");}
}
export async function buildMuseSetupInstruction(origin:string|undefined,ticket:string,bindingId:string) {
  const base=musePublicOrigin(origin),assets=await museReceiverAssets(),hostname=new URL(base).hostname;
  const provider="paperclip-muse-"+bindingId,oauth=base+"/api/muse/v1/oauth";
  const accessRequest={provider,api_hosts:[hostname],auth_scheme:"oauth2_code",authorization_url:oauth+"/authorize?pairing_ticket="+encodeURIComponent(ticket),issuer_domain:hostname,
    token_url:oauth+"/token",token_endpoint_auth_method:"none",registration_url:oauth+"/register",scopes:"paperclip:agent offline_access"};
  return `Connect this personal Muse conversation to Paperclip at ${base} using Muse's supported Secure Vault/authd flow.

First, directly in this current conversation, call credentials.request_api_access with exactly ${JSON.stringify(accessRequest)}. Do not create or delegate a background task for this first step. Present the normal Connect link immediately and wait for the user to complete it before downloading or installing files. Authd supplies its actual callback, public-client registration, S256 PKCE and automatic refresh. Never invent a callback, exchange tokens manually, copy credentials, or store them in files or environment. Approve this HTTPS hostname through Muse's normal UI; its standing permission may cover later Paperclip tasks. If the OAuth request fails, report the actual result and stop.

After consent, download the immutable asset2 client.py, detector.sh and instructions.md from ${base}/api/muse/v1/assets/2/. Verify SHA-256: client.py ${assets.manifest.assets["client.py"].sha256}; detector.sh ${assets.manifest.assets["detector.sh"].sha256}; instructions.md ${assets.manifest.assets["instructions.md"].sha256}. Install them privately beside ~/.config/paperclip-muse/client.py. Configure only nonsecret connection metadata with python3 client.py --binding ${bindingId} configure --origin ${base}. The installed client uses /opt/hatch/skills/skill-creator/bin/dynamic_credentials.py add_surrogate_to_request and read_json_response with credential_name custom.${provider}, access_token and allowed_hosts [${hostname}]. Never inspect or cache surrogate headers.

Run the client status helper and verify the expected scoped binding. Only after that authenticated read succeeds, register the generated ~/hooks/scripts/paperclip-muse-${bindingId}.sh as hooks.add script_path with no arguments. Request five-second checks; do not silently substitute sixty seconds. The detector reads only public receiver.json and sends X-Paperclip-Muse-Binding, never a credential. Persist the same verified instructions as ~/workspace/skills/paperclip-muse/SKILL.md, discoverable with muse.skill_search in fresh conversations without registration; record only binding UUID ${bindingId} and public client path there, never the ticket.

End the installation turn. A subsequent independent detector wake must read and confirm Paperclip's authenticated readiness challenge; never confirm it inline during setup. Follow the installed native work/question/receipt instructions. A signal grants no task content or execution authority. Stop uses exact boundaries and independent uncertainty holds. Disconnect globally revokes OAuth access immediately; post-revocation cleanup is unsupported/unconfirmed and requires truthful operator review. Usage and cost remain unavailable.`;
}
