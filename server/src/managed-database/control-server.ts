import { createReadStream, chmodSync, existsSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { MANAGED_DATABASE_HTTP } from "@paperclipai/shared/managed-database";
import type { CommandResponse, ManagedDatabaseSupervisor } from "./supervisor.js";

const MAX_COMMAND_BYTES = 256 * 1024;

function send(res: ServerResponse, response: CommandResponse): void {
  const payload = JSON.stringify(response.body);
  res.writeHead(response.status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_COMMAND_BYTES) throw new Error("command body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The supervisor's HTTP surface. It exposes exactly the signed command API,
 * archive transfer, and a minimal health probe; there is no shell or SQL
 * passthrough. `maintenanceSurface` additionally answers the app's public
 * health path while no app is running.
 */
export function createControlHandler(supervisor: ManagedDatabaseSupervisor, maintenanceSurface: () => boolean) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (req.method === "GET" && (url.pathname === MANAGED_DATABASE_HTTP.health || (url.pathname === "/api/health" && maintenanceSurface()))) {
        send(res, { status: 200, body: supervisor.publicHealth() });
        return;
      }
      if (req.method === "POST" && url.pathname === MANAGED_DATABASE_HTTP.command) {
        let body: unknown;
        try {
          body = await readJson(req);
        } catch {
          send(res, { status: 400, body: { outcome: "rejected", code: "invalid_command", error: "body must be JSON" } });
          return;
        }
        send(res, await supervisor.handleCommand(body, header(req, MANAGED_DATABASE_HTTP.signatureHeader)));
        return;
      }
      if (url.pathname === MANAGED_DATABASE_HTTP.archive && (req.method === "GET" || req.method === "PUT")) {
        const commandHeader = header(req, MANAGED_DATABASE_HTTP.commandHeader);
        const signature = header(req, MANAGED_DATABASE_HTTP.signatureHeader);
        if (req.method === "PUT") {
          send(res, await supervisor.handleArchiveUpload(commandHeader, signature, req));
          return;
        }
        const opened = supervisor.openArchiveDownload(commandHeader, signature);
        if (!opened.ok) {
          send(res, opened.response);
          return;
        }
        res.writeHead(200, {
          "content-type": "application/octet-stream",
          "content-length": String(opened.sizeBytes),
          [MANAGED_DATABASE_HTTP.archiveSha256Header]: opened.sha256,
          "cache-control": "no-store",
        });
        createReadStream(opened.file).pipe(res);
        return;
      }
      if (maintenanceSurface()) {
        send(res, { status: 503, body: { status: supervisor.publicHealth().status, error: "stack is in database maintenance" } });
        return;
      }
      send(res, { status: 404, body: { error: "not found" } });
    } catch (error) {
      if (!res.headersSent) send(res, { status: 500, body: { error: error instanceof Error ? error.message : "internal error" } });
      else res.destroy();
    }
  };
}

export async function listenUnix(server: Server, socketPath: string): Promise<void> {
  if (existsSync(socketPath)) rmSync(socketPath, { force: true });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });
  // Any local user may connect: every command is authenticated by HMAC, so
  // the socket grants reachability, not authority.
  chmodSync(socketPath, 0o666);
}

export async function listenTcp(server: Server, port: number, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

export function createControlServer(supervisor: ManagedDatabaseSupervisor, maintenanceSurface: () => boolean): Server {
  return createServer((req, res) => {
    void createControlHandler(supervisor, maintenanceSurface)(req, res);
  });
}

export async function closeServer(server: Server | null): Promise<void> {
  if (!server || !server.listening) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
