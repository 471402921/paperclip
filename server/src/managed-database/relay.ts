import { request } from "node:http";
import type { RequestHandler } from "express";
import { MANAGED_DATABASE_HTTP } from "@paperclipai/shared/managed-database";

const FORWARDED_REQUEST_HEADERS = [
  "content-type",
  "content-length",
  MANAGED_DATABASE_HTTP.signatureHeader,
  MANAGED_DATABASE_HTTP.commandHeader,
];
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  MANAGED_DATABASE_HTTP.archiveSha256Header,
];

/**
 * Serving-mode relay: while the tenant app owns $PORT, managed database
 * requests are streamed byte-for-byte to the supervisor's Unix socket. The
 * app holds no control key, so it can forward commands but never forge them.
 * Mount before any body parser.
 */
export function managedDatabaseRelay(controlSocket: string): RequestHandler {
  return (req, res) => {
    const headers: Record<string, string> = {};
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.headers[name];
      if (typeof value === "string") headers[name] = value;
    }
    const upstream = request({
      socketPath: controlSocket,
      method: req.method,
      path: `${MANAGED_DATABASE_HTTP.prefix}${req.url}`,
      headers,
    }, (response) => {
      const outgoing: Record<string, string> = {};
      for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = response.headers[name];
        if (typeof value === "string") outgoing[name] = value;
      }
      res.writeHead(response.statusCode ?? 502, outgoing);
      response.pipe(res);
    });
    upstream.on("error", () => {
      if (!res.headersSent) res.status(502).json({ error: "managed database supervisor unreachable" });
      else res.destroy();
    });
    req.pipe(upstream);
  };
}
