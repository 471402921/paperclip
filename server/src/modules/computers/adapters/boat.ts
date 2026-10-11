import { generateKeyPairSync, randomUUID } from "node:crypto";
import {
  createSshCommandManagedRuntimeRunner,
  shellQuote,
} from "@paperclipai/adapter-utils/ssh";
import type { CommandManagedRuntimeRunner } from "@paperclipai/adapter-utils/command-managed-runtime";
import type { ComputerBackend, ComputerOperationOptions } from "../application/ports.js";
import {
  ComputerError,
  segment,
  type ComputerRecord,
  type Owner,
} from "../domain/ledger.js";
import { remoteProgram } from "./remote-program.js";

const apiOrigin = "https://boat.dev/api/v1";
const transportCache = new Map<string, Promise<CommandManagedRuntimeRunner>>();
type CommandInput = Parameters<CommandManagedRuntimeRunner["execute"]>[0];

const BOAT_BULK_COMMAND_LIMIT = 4;

/** Reserve SSH admission for lifecycle/identity calls while bulk and legacy commands run. */
export function createBoatTransportAdmission() {
  let active = 0;
  let ordinary = 0;
  let bulk = 0;
  const queue: Array<{ control: boolean; bulk: boolean; start: () => void }> = [];
  function drain() {
    while (active < 8) {
      const eligible = (entry: (typeof queue)[number]) =>
        entry.control || (ordinary < 6 && (!entry.bulk || bulk < BOAT_BULK_COMMAND_LIMIT));
      let index = queue.findIndex((entry) => entry.control && eligible(entry));
      if (index < 0) index = queue.findIndex(eligible);
      if (index < 0) break;
      queue.splice(index, 1)[0]!.start();
    }
  }
  async function execute(
    runner: CommandManagedRuntimeRunner,
    input: CommandInput,
    control: boolean,
  ) {
    const startedAt = new Date().toISOString();
    const deadline = Date.now() + (input.timeoutMs ?? 15_000);
    const isBulk = Buffer.byteLength(input.stdin ?? "") > 1024 * 1024;
    // Even process-control callers must use the ordinary budget for large uploads.
    const isControl = control && !isBulk;
    if (queue.length >= 128)
      throw new ComputerError("conflict", "Computer command admission is busy");
    return new Promise<Awaited<ReturnType<CommandManagedRuntimeRunner["execute"]>>>((resolve, reject) => {
      const timedOut = () => resolve({ exitCode: null, signal: null, timedOut: true,
        stdout: "", stderr: "Computer command timed out waiting for SSH admission", pid: null, startedAt });
      const entry = { control: isControl, bulk: isBulk, start: () => {
        clearTimeout(timer);
        const remaining = deadline - Date.now();
        if (remaining <= 0) { timedOut(); return; }
        active++;
        if (!isControl) ordinary++;
        if (isBulk) bulk++;
        void Promise.resolve().then(() => runner.execute({ ...input, timeoutMs: remaining }))
          .then(resolve, reject).finally(() => {
            active--;
            if (!isControl) ordinary--;
            if (isBulk) bulk--;
            drain();
          });
      } };
      const timer = setTimeout(() => {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        timedOut();
        drain();
      }, Math.max(1, deadline - Date.now()));
      queue.push(entry);
      drain();
    });
  }

  // All runner views for a machine share these slots. Wait outside execute so
  // one upload cannot consume another upload's SSH command deadline in queue.
  let uploads = 0;
  const uploadQueue: Array<{ start: () => void }> = [];
  function drainUploads() {
    while (uploads < BOAT_BULK_COMMAND_LIMIT && uploadQueue.length) uploadQueue.shift()!.start();
  }
  const withStdinUploadSlot: NonNullable<CommandManagedRuntimeRunner["withStdinUploadSlot"]> = (operation, options) => {
    if (uploadQueue.length >= 128) return Promise.reject(new ComputerError("conflict", "Computer upload admission is busy"));
    return new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener("abort", aborted); };
      const remove = (message: string) => {
        const index = uploadQueue.indexOf(entry);
        if (index < 0) return;
        uploadQueue.splice(index, 1);
        cleanup();
        reject(new ComputerError("provider_error", message));
      };
      const aborted = () => remove("Computer upload admission was cancelled");
      const entry = { start: () => {
        cleanup();
        uploads++;
        void Promise.resolve().then(operation).then(resolve, reject).finally(() => {
          uploads--;
          drainUploads();
        });
      } };
      const timer = setTimeout(() => remove("Computer upload timed out waiting for capacity"),
        Math.max(1, Math.min(options.timeoutMs, 180_000)));
      uploadQueue.push(entry);
      options.signal?.addEventListener("abort", aborted, { once: true });
      if (options.signal?.aborted) aborted();
      else drainUploads();
    });
  };
  return Object.assign(execute, { withStdinUploadSlot });
}
const transportAdmission = new Map<string, ReturnType<typeof createBoatTransportAdmission>>();
const desktopCache = new Map<
  string,
  { viewerUrl: string; expiresAt: string }
>();
export const desktopReadinessProgram = String.raw`
import os,sys,json,stat,fcntl,subprocess,time,uuid
# Boat restores its persistent home, but Unix sockets there can refer to stale
# kernel listeners. Keep a healthy IBus unchanged; repair only a failed probe.
uid=os.getuid();runtime='/run/user/'+str(uid)
st=os.lstat(runtime)
if not stat.S_ISDIR(st.st_mode) or st.st_uid!=uid:raise RuntimeError('invalid desktop runtime directory')
env={**os.environ,'HOME':'/home/user','XDG_CONFIG_HOME':'/home/user/.config','XDG_CACHE_HOME':'/home/user/.cache','DISPLAY':':0','XAUTHORITY':'/home/user/.Xauthority','DBUS_SESSION_BUS_ADDRESS':'unix:path='+runtime+'/bus','XDG_RUNTIME_DIR':runtime,'IBUS_ENABLE_SYNC_MODE':'0'}
env.pop('IBUS_ADDRESS',None)
def healthy():
 try:
  address=subprocess.run(['ibus','address'],env=env,capture_output=True,text=True,timeout=5)
  if address.returncode or not address.stdout.strip().startswith('unix:'):return False
  return subprocess.run(['gdbus','call','--address',address.stdout.strip(),'--dest','org.freedesktop.IBus','--object-path','/org/freedesktop/IBus','--method','org.freedesktop.DBus.Peer.Ping'],env=env,capture_output=True,timeout=5).returncode==0
 except subprocess.TimeoutExpired:return False
root=runtime+'/paperclip-ibus'
os.makedirs(root,mode=0o700,exist_ok=True)
st=os.lstat(root)
if not stat.S_ISDIR(st.st_mode) or st.st_uid!=uid:raise RuntimeError('invalid desktop input directory')
os.chmod(root,0o700)
fd=os.open(root+'/lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 if not healthy():
  # IBus serves the whole desktop. A Cua launcher can be inside an agent slice;
  # start the repaired daemon in app.slice so retiring that agent cannot kill it.
  desktop_keys=['HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','DISPLAY','XAUTHORITY','DBUS_SESSION_BUS_ADDRESS','XDG_RUNTIME_DIR','IBUS_ENABLE_SYNC_MODE']
  command=['systemd-run','--user','--quiet','--collect','--service-type=exec','--expand-environment=no','--slice=app.slice','--unit=paperclip-desktop-input-'+uuid.uuid4().hex+'.service','--property=ExitType=cgroup','--property=KillMode=control-group']
  command.extend('--setenv='+key+'='+env[key] for key in desktop_keys)
  command.extend(['--','/usr/bin/ibus-daemon','--replace','--daemonize','--xim','--address','unix:path='+root+'/bus'])
  result=subprocess.run(command,env=env,capture_output=True,timeout=20)
  if result.returncode:raise RuntimeError('desktop input repair failed')
  for attempt in range(10):
   if healthy():break
   time.sleep(0.2)
  else:raise RuntimeError('desktop input did not become ready')
`;

export const processProgram = String.raw`
import os,sys,json,fcntl,subprocess,shutil,re,datetime
p=json.load(sys.stdin);base='/home/user/.paperclip-owners';os.makedirs(base,exist_ok=True)
def retire_owner(root,oid):
 open(os.path.join(root,'retired'),'a').close()
 unit='paperclip-'+oid+'.service';slice='paperclip-'+oid+'.slice'
 subprocess.run(['systemctl','--user','stop',slice,unit],capture_output=True)
 state=subprocess.run(['systemctl','--user','show',slice,'--property=ActiveState','--value'],capture_output=True,text=True).stdout.strip()
 if state not in ('inactive','failed',''):raise RuntimeError('process retirement unconfirmed')
 for entry in os.scandir(root):
  if entry.name.startswith('command-') and entry.is_dir(follow_symlinks=False):
   try:shutil.rmtree(entry.path)
   except FileNotFoundError:pass
if p['action']=='cleanup-retired':
 # The controller supplies only its durable retired runner identities. Do not
 # discover owners from the filesystem or touch any agent/project directory.
 for owner in p['owners']:
  oid=owner['id']
  if not isinstance(oid,str) or not re.fullmatch('[A-Za-z0-9_-]{1,128}',oid):raise RuntimeError('invalid retired owner')
  root=os.path.join(base,oid)
  if os.path.islink(root):raise RuntimeError('invalid retired owner directory')
  if not os.path.isdir(root):continue
  with open(os.path.join(root,'lock'),'a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX)
   generation_path=os.path.join(root,'generation')
   generation=int(open(generation_path).read()) if os.path.exists(generation_path) else 0
   if owner['generation']<generation:print(json.dumps({'error':'conflict'}));sys.exit(0)
   if os.path.exists(os.path.join(root,'retired')) and not any(e.name.startswith('command-') and e.is_dir(follow_symlinks=False) for e in os.scandir(root)):continue
   retire_owner(root,oid)
 print('{}');sys.exit(0)
owner=p['owner'];oid=owner['id'];root=os.path.join(base,oid);os.makedirs(root,exist_ok=True)
with open(os.path.join(root,'lock'),'a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 tombstone=os.path.join(root,'retired');unit='paperclip-'+oid+'.service';slice='paperclip-'+oid+'.slice'
 boot=open('/proc/sys/kernel/random/boot_id').read().strip()
 generation_path=os.path.join(root,'generation')
 generation=int(open(generation_path).read()) if os.path.exists(generation_path) else 0
 if owner['generation']<generation:print(json.dumps({'error':'conflict'}));sys.exit(0)
 if p['action']=='advance':
  if os.path.exists(tombstone):print(json.dumps({'error':'conflict'}));sys.exit(0)
  retirement=os.path.join(root,'retiring.json')
  if owner.get('phase')=='retiring':
   deadline=datetime.datetime.fromisoformat(owner['retirementDeadline'].replace('Z','+00:00')).timestamp()*1000
   with open(retirement,'w') as f:json.dump({'deadline':deadline},f)
  elif os.path.exists(retirement):print(json.dumps({'error':'conflict'}));sys.exit(0)
  with open(generation_path,'w') as f:f.write(str(owner['generation']))
  print('{}')
 elif p['action']=='retire':
  retire_owner(root,oid)
  print('{}')
 elif p['action']=='inspect':
  claim=owner.get('process');marker=os.path.join(root,'claim.json');actual=json.load(open(marker)) if os.path.exists(marker) else None
  valid=claim and actual and claim['nonce']==actual['nonce'] and claim['launchGeneration']==actual['launchGeneration'] and actual['bootId']==boot
  state=subprocess.run(['systemctl','--user','is-active',unit],capture_output=True,text=True).stdout.strip()
  print(json.dumps({'running':bool(valid and state=='active' and not os.path.exists(tombstone)),'claim':actual if valid else claim}))
 else:
  if os.path.exists(tombstone) or os.path.exists(os.path.join(root,'retiring.json')):print(json.dumps({'error':'conflict'}));sys.exit(0)
  claim=owner['process'];claim['bootId']=boot
  marker=os.path.join(root,'claim.json')
  if os.path.exists(marker):
   old=json.load(open(marker))
   if old['launchGeneration']>claim['launchGeneration'] or (old['launchGeneration']==claim['launchGeneration'] and old['nonce']!=claim['nonce']):print(json.dumps({'error':'conflict'}));sys.exit(0)
   active=subprocess.run(['systemctl','--user','is-active',unit],capture_output=True,text=True).stdout.strip()=='active'
   if active and old['nonce']!=claim['nonce']:print(json.dumps({'error':'conflict'}));sys.exit(0)
  with open(marker,'w') as f:json.dump(claim,f)
  # Shell launch scripts own expansion of their positional arguments and identity markers.
  payload=p['input'];args=['systemd-run','--user','--expand-environment=no','--unit='+unit,'--slice='+slice,'--collect','--property=KillMode=control-group','--working-directory='+payload.get('cwd','/home/user')]
  for key,value in payload.get('env',{}).items():args.append('--setenv='+key+'='+value)
  state=subprocess.run(['systemctl','--user','is-active',unit],capture_output=True,text=True).stdout.strip()
  if state!='active':
   result=subprocess.run(args+['--',payload['command']]+payload.get('args',[]),capture_output=True)
   if result.returncode:raise RuntimeError('launch failed')
  print(json.dumps(claim))
`;
export function boatBackend(
  resolveKey: (record: ComputerRecord) => Promise<string>,
  fetcher: typeof fetch = fetch,
): ComputerBackend {
  // Coalesce provider readiness only; each admitted owner still claims and
  // validates its own execution authority in the application service.
  type Readiness = { deadlineMs: number; waiters: Set<{ deadlineMs: number }>; promise: Promise<void> };
  const readiness = new Map<string, Readiness>();
  function remaining(options: ComputerOperationOptions | undefined, limit: number) {
    const ms = options?.deadlineMs === undefined ? limit : Math.min(limit, options.deadlineMs - Date.now());
    if (ms <= 0) throw new ComputerError("provider_error", "Computer file operation timed out");
    return ms;
  }
  async function api(
    record: ComputerRecord,
    method: string,
    suffix = "",
    body?: unknown,
    options?: ComputerOperationOptions,
    checkDispatch?: () => void,
  ): Promise<any> {
    const key = await resolveKey(record);
    checkDispatch?.();
    const response = await fetcher(
      `${apiOrigin}/sandboxes/${segment(record.providerId)}${suffix}`,
      {
        method,
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(remaining(options, 90_000)),
      },
    );
    if (!response.ok) {
      // Closed operation labels identify the failing endpoint without exposing
      // the provider response, sandbox URL, stop ID, or credential material.
      const operation = ({
        "GET ": "inspect", "PATCH ": "renew", "POST /resume": "resume",
        "POST /sshkey": "ssh_key", "POST /host": "host", "POST /stop": "stop",
        "POST /desktop": "desktop",
      } as Record<string, string>)[`${method} ${suffix}`]
        ?? (method === "GET" && suffix.startsWith("/stops/") ? "stop_status" : "unknown");
      throw new ComputerError("provider_error", `Boat request failed (${response.status}) [operation=${operation}]`);
    }
    const data = await response.json();
    if (!data || typeof data !== "object")
      throw new ComputerError("provider_error", "Invalid Boat response");
    return data;
  }
  async function inspect(record: ComputerRecord, options?: ComputerOperationOptions, checkDispatch?: () => void) {
    const data = await api(record, "GET", "", undefined, options, checkDispatch);
    const sandbox = data.sandbox ?? data;
    if (sandbox.id !== record.providerId || typeof sandbox.state !== "string")
      throw new ComputerError(
        "provider_error",
        "Boat returned a different computer",
      );
    return {
      state: sandbox.state as string,
      snapshots: sandbox.snapshots === true,
      stop: sandbox.stop ?? null,
    };
  }
  async function rawRunner(
    record: ComputerRecord,
  ): Promise<CommandManagedRuntimeRunner> {
    const key = `${record.id}:${record.ledger.secretRef.secretId}:${record.ledger.secretRef.version ?? "latest"}`;
    let pending = transportCache.get(key);
    if (!pending) {
      pending = (async () => {
        const pair = generateKeyPairSync("ed25519");
        const jwk = pair.publicKey.export({ format: "jwk" });
        const publicBytes = Buffer.from(jwk.x!, "base64url");
        const name = Buffer.from("ssh-ed25519");
        const length = (n: number) => {
          const b = Buffer.alloc(4);
          b.writeUInt32BE(n);
          return b;
        };
        const publicKey = `ssh-ed25519 ${Buffer.concat([length(name.length), name, length(publicBytes.length), publicBytes]).toString("base64")} paperclip-computer`;
        // OpenSSH cannot read PKCS8 Ed25519 keys; emit its unencrypted private format in memory.
        const seed = Buffer.from(
          pair.privateKey.export({ format: "jwk" }).d!,
          "base64url",
        );
        const field = (b: Buffer) => Buffer.concat([length(b.length), b]);
        const check = Buffer.from("70617065", "hex");
        let privateBody = Buffer.concat([
          check,
          check,
          field(name),
          field(publicBytes),
          field(Buffer.concat([seed, publicBytes])),
          field(Buffer.from("paperclip-computer")),
        ]);
        const padding = 8 - (privateBody.length % 8);
        privateBody = Buffer.concat([
          privateBody,
          Buffer.from(Array.from({ length: padding }, (_, i) => i + 1)),
        ]);
        const publicBlob = Buffer.concat([field(name), field(publicBytes)]);
        const blob = Buffer.concat([
          Buffer.from("openssh-key-v1\0"),
          field(Buffer.from("none")),
          field(Buffer.from("none")),
          field(Buffer.alloc(0)),
          length(1),
          field(publicBlob),
          field(privateBody),
        ]);
        const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${blob
          .toString("base64")
          .match(/.{1,70}/g)!
          .join("\n")}\n-----END OPENSSH PRIVATE KEY-----\n`;
        const result = await api(record, "POST", "/sshkey", { key: publicKey });
        if (
          typeof result.hostKey !== "string" ||
          !/^ssh-ed25519 [A-Za-z0-9+/=]+$/.test(result.hostKey.trim())
        )
          throw new ComputerError(
            "provider_error",
            "Boat did not provide a valid SSH host key",
          );
        const endpoint =
          typeof result.sshEndpoint === "string" ? result.sshEndpoint : null;
        const parsed = endpoint?.match(/^([A-Za-z0-9.-]+):(\d+)$/);
        const host = parsed?.[1] ?? result.machineIp;
        const port = parsed ? Number(parsed[2]) : 22;
        if (
          typeof host !== "string" ||
          !host ||
          /[\s/]/.test(host) ||
          !Number.isInteger(port) ||
          port < 1 ||
          port > 65535
        )
          throw new ComputerError(
            "provider_error",
            "Invalid Boat SSH endpoint",
          );
        const knownHost = port === 22 ? host : `[${host}]:${port}`;
        return createSshCommandManagedRuntimeRunner({
          spec: {
            host,
            port,
            username: "user",
            remoteWorkspacePath: "/home/user",
            remoteCwd: "/home/user",
            privateKey,
            knownHosts: `${knownHost} ${result.hostKey.trim()}\n`,
            strictHostKeyChecking: true,
          },
          maxBufferBytes: 24 * 1024 * 1024,
        });
      })();
      transportCache.set(key, pending);
      pending.catch(() => transportCache.delete(key));
    }
    return pending;
  }
  async function runner(record: ComputerRecord, options?: { control?: boolean; remoteTimeout?: boolean }): Promise<CommandManagedRuntimeRunner> {
    const raw = await rawRunner(record);
    let admission = transportAdmission.get(record.providerId);
    if (!admission) {
      admission = createBoatTransportAdmission();
      transportAdmission.set(record.providerId, admission);
    }
    const execute = admission;
    const bounded = options?.remoteTimeout ? {
      ...raw,
      execute: (input: CommandInput) => raw.execute({
        ...input,
        // Admission has already deducted queue time. Bound the remote process
        // group as well as the local SSH child; socket closure is not stop proof.
        command: "timeout",
        args: ["--signal=KILL", `${input.timeoutMs! / 1000}s`, input.command, ...(input.args ?? [])],
      }),
    } : raw;
    return { ...raw, withStdinUploadSlot: admission.withStdinUploadSlot,
      execute: (input) => execute(bounded, input, options?.control === true) };
  }
  async function fileTransport(
    record: ComputerRecord,
    control: boolean,
    options?: ComputerOperationOptions,
  ) {
    remaining(options, 120_000);
    const pending = runner(record, { control, remoteTimeout: options?.deadlineMs !== undefined });
    if (options?.deadlineMs === undefined) return pending;
    // Initialization is shared with unrelated owners. Expire this waiter only;
    // the cached promise retains its normal success/eviction behavior.
    return new Promise<CommandManagedRuntimeRunner>((resolve, reject) => {
      const timer = setTimeout(() => reject(new ComputerError(
        "provider_error", "Computer file operation timed out",
      )), remaining(options, 120_000));
      pending.then(resolve, reject).finally(() => clearTimeout(timer));
    });
  }
  async function execute(
    record: ComputerRecord,
    code: string,
    payload: unknown,
    control = true,
    options?: ComputerOperationOptions,
  ) {
    const result = await (
      await fileTransport(record, control, options)
    ).execute({
      command: "python3",
      args: ["-c", code],
      stdin: JSON.stringify(payload),
      timeoutMs: remaining(options, 120_000),
    });
    if (result.exitCode !== 0 || result.timedOut)
      throw new ComputerError("provider_error", "Computer operation failed");
    let value: any;
    try {
      value = JSON.parse(result.stdout);
    } catch {
      throw new ComputerError(
        "provider_error",
        "Invalid computer operation response",
      );
    }
    if (value?.error)
      throw new ComputerError(
        ["not_found", "conflict", "invalid"].includes(value.error)
          ? value.error
          : "provider_error",
        `Computer operation: ${value.error}`,
      );
    return value;
  }

  async function host(record: ComputerRecord, port: number) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new ComputerError("invalid", "Invalid preview port");
    const result = await api(record, "POST", "/host", {
      port,
      access: "private",
    });
    const url = new URL(result.url);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".on.boat.dev") ||
      url.username ||
      url.password ||
      !url.searchParams.get("_token") ||
      result.access === "public"
    )
      throw new ComputerError(
        "provider_error",
        "Boat did not provide private hosting",
      );
    return url;
  }
  function stopReceipt(
    value: any,
    expectedId?: string,
  ): { id: string; status: string } {
    if (
      !value ||
      typeof value.id !== "string" ||
      !/^stop_[a-zA-Z0-9]+$/.test(value.id) ||
      (expectedId && value.id !== expectedId) ||
      !["pending", "failing", "completed", "superseded"].includes(value.status)
    ) {
      throw new ComputerError(
        "provider_error",
        "Boat returned an invalid stop receipt",
      );
    }
    return { id: value.id, status: value.status };
  }
  return {
    inspect,
    runner,
    async ready(record, options) {
      const waiter = { deadlineMs: Date.now() + remaining(options, 120_000) };
      const key = JSON.stringify([record.companyId, record.environmentId, record.id, record.providerId,
        record.ledger.controllerId, record.ledger.secretRef.secretId, record.ledger.secretRef.version ?? "latest"]);
      let pending = readiness.get(key);
      if (!pending) {
        const entry: Readiness = { deadlineMs: Date.now() + 120_000, waiters: new Set(), promise: Promise.resolve() };
        readiness.set(key, entry);
        pending = entry;
        const budget = () => {
          // An in-flight request may finish after its last waiter times out, but
          // cannot initiate another request without a still-live caller.
          if (![...entry.waiters].some(value => value.deadlineMs > Date.now()))
            throw new ComputerError("provider_error", "Computer readiness timed out");
          remaining({ deadlineMs: entry.deadlineMs }, 120_000);
          return { deadlineMs: entry.deadlineMs };
        };
        entry.promise = Promise.resolve().then(async () => {
          const checked = async () => {
            const state = await inspect(record, budget(), budget);
            if (!state.snapshots) throw new ComputerError("invalid", "Boat snapshots must be enabled");
            if (state.stop && ["pending", "failing"].includes(state.stop.status))
              throw new ComputerError("conflict", "Boat is still saving a previous stop");
            return ["ready", "idle", "running"].includes(state.state);
          };
          if (await checked()) return;
          await api(record, "POST", "/resume", { ttlSeconds: 300 }, budget(), budget);
          transportCache.delete(
            `${record.id}:${record.ledger.secretRef.secretId}:${record.ledger.secretRef.version ?? "latest"}`,
          );
          for (let i = 0; i < 90; i++) {
            if (await checked()) return;
            await new Promise(resolve => setTimeout(resolve, remaining(budget(), 1000)));
          }
          throw new ComputerError("provider_error", "Boat did not become ready");
        });
        const clear = () => { if (readiness.get(key) === entry) readiness.delete(key); };
        void entry.promise.then(clear, clear);
      }
      waiter.deadlineMs = Math.min(waiter.deadlineMs, pending.deadlineMs);
      pending.waiters.add(waiter);
      const entry = pending;
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); entry.waiters.delete(waiter); };
        const expired = () => new ComputerError("provider_error", "Computer readiness timed out");
        const timer = setTimeout(() => { cleanup(); reject(expired()); }, Math.max(1, waiter.deadlineMs - Date.now()));
        entry.promise.then(() => {
          cleanup();
          if (Date.now() >= waiter.deadlineMs) reject(expired());
          else resolve();
        }, error => { cleanup(); reject(error); });
      });
    },
    async claim(record, options) {
      await execute(
        record,
        String.raw`
import os,sys,json,fcntl
p=json.load(sys.stdin);path='/home/user/.paperclip-controller.json'
fd=os.open(path,os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'r+') as f:
 fcntl.flock(f,fcntl.LOCK_EX);old=f.read()
 if old and json.loads(old)!=p:print(json.dumps({'error':'conflict'}));sys.exit(0)
 if not old:f.write(json.dumps(p));f.flush();os.fsync(f.fileno())
print('{}')
`,
        {
          controllerId: record.ledger.controllerId,
          companyId: record.companyId,
          computerId: record.id,
        },
        true,
        options,
      );
      const retiredOwners = record.ledger.owners
        .filter((owner) => owner.kind === "runner" && owner.phase === "retired")
        .map(({ id, generation }) => ({ id, generation }));
      if (retiredOwners.length) {
        // Archived providers cannot clean remote files. Settle their exact
        // retired owners after resume, before admitting any new command.
        await execute(record, processProgram, {
          action: "cleanup-retired",
          owners: retiredOwners,
        }, true, options);
      }
    },
    async runnerPorts(record) {
      const value = await execute(record, runnerPortInventoryProgram, {});
      if (!Number.isInteger(value.ephemeralStart) || !Number.isInteger(value.ephemeralEnd)
        || value.ephemeralStart < 1 || value.ephemeralEnd > 65535
        || value.ephemeralStart > value.ephemeralEnd || !Array.isArray(value.occupied)
        || value.occupied.some((port: unknown) => !Number.isInteger(port) || Number(port) < 1 || Number(port) > 65535))
        throw new ComputerError("provider_error", "Computer returned invalid listener port availability");
      return value;
    },
    async advance(record, owner) {
      await execute(record, processProgram, { action: "advance", owner });
    },
    async launch(record, owner, input) {
      return execute(record, processProgram, {
        action: "launch",
        owner,
        input,
      });
    },
    async inspectProcess(record, owner) {
      return execute(record, processProgram, { action: "inspect", owner });
    },
    async retire(record, owner) {
      await execute(record, processProgram, { action: "retire", owner });
    },
    async stop(record) {
      const value = await api(record, "POST", "/stop", {});
      const stop = value.stop ?? value.sandbox?.stop;
      return stopReceipt(stop);
    },
    async stopStatus(record, id) {
      const value = await api(record, "GET", `/stops/${segment(id)}`);
      return stopReceipt(value.stop ?? value, id);
    },
    async renew(record, options) {
      await api(record, "PATCH", "", { ttlSeconds: 300 }, options);
    },
    computerTool() {
      return {
        command: "python3",
        args: ["-c", `${desktopReadinessProgram}\nos.execv('/opt/ascii/cua-driver/cua-driver',['cua-driver','mcp','--socket','/run/ascii-cua/driver.sock'])`],
      };
    },
    async desktop(record, options) {
      if (options?.checkInput !== false)
        await execute(record, `${desktopReadinessProgram}\nprint('{}')`, {}, true, options);
      const cached = desktopCache.get(record.id);
      // Explicit Connect must obtain a new stream session, including after a
      // failed connection. Only presence renewals reuse existing credentials.
      if (
        options?.checkInput === false &&
        cached &&
        Date.parse(cached.expiresAt) > Date.now() + 60_000
      )
        return cached;
      const value = await api(record, "POST", "/desktop", {}, options);
      const url = new URL(value.desktopUrl);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".on.boat.dev"))
        throw new ComputerError("provider_error", "Invalid Boat desktop URL");
      url.searchParams.set("overlay", "0");
      const result = {
        viewerUrl: url.toString(),
        expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
      };
      desktopCache.set(record.id, result);
      return result;
    },
    async preview(record, port) {
      return { url: (await host(record, port)).toString() };
    },
    async ingress(record, port, path) {
      if (
        !path.startsWith("/") ||
        path.startsWith("//") ||
        /[?#\r\n]/.test(path)
      )
        throw new ComputerError("invalid", "Invalid runner ingress path");
      const url = await host(record, port);
      const response = await fetcher(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(30_000),
      });
      const cookie = response.headers
        .getSetCookie()
        .find((value) => value.startsWith("_port_auth="))
        ?.split(";")[0];
      if (!cookie || response.status < 200 || response.status >= 400)
        throw new ComputerError(
          "provider_error",
          "Boat private hosting authentication failed",
        );
      url.search = "";
      url.hash = "";
      url.protocol = "wss:";
      url.pathname = path;
      return { url: url.toString(), secretHeaders: { Cookie: cookie } };
    },
    async remote(record, input, options) {
      // Git setup and file I/O may wait on locks or transfer substantial data.
      // Keep lifecycle capacity reserved; only the short owned-port probe uses it.
      return execute(record, remoteProgram, input, input.action === "owned-port", options);
    },
  };
}

/** Read-only Linux socket inventory; all states matter, not only LISTEN. */
export const runnerPortInventoryProgram = String.raw`
import json
with open('/proc/sys/net/ipv4/ip_local_port_range') as source:
 start,end=map(int,source.read().split())
occupied=set()
for path in ['/proc/net/tcp','/proc/net/tcp6']:
 with open(path) as source:
  for line in source.readlines()[1:]:
   port=int(line.split()[1].rsplit(':',1)[1],16)
   if port:occupied.add(port)
print(json.dumps({'ephemeralStart':start,'ephemeralEnd':end,'occupied':sorted(occupied)}))
`;
