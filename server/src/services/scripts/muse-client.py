#!/usr/bin/env python3
"""Private personal Muse transport; durable command identities precede network I/O."""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
import uuid
from urllib.parse import urlparse
VERSION = "1"
ROOT = Path.home() / ".config" / "paperclip-muse"
MAX_BYTES = 2_000_000
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None
HTTP = urllib.request.build_opener(NoRedirect)
def canonical(value): return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    temporary = path.with_name(path.name + ".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        json.dump(value, stream, ensure_ascii=False); stream.flush(); os.fsync(stream.fileno())
    os.chmod(temporary, 0o600); os.replace(temporary, path)
    descriptor = os.open(path.parent, os.O_RDONLY)
    try: os.fsync(descriptor)
    finally: os.close(descriptor)
def origin(value):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
        raise RuntimeError("A public HTTPS Paperclip origin is required")
    return value.rstrip("/")
def http(url, body=None, token=None):
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise RuntimeError("Invalid Paperclip endpoint")
    headers = {"Accept": "application/json"}
    if token: headers["Authorization"] = "Bearer " + token
    if body is not None: headers["Content-Type"] = "application/json"
    encoded = None if body is None else canonical(body)
    if encoded is not None and len(encoded) > 262144: raise RuntimeError("Command exceeds transport limit")
    request = urllib.request.Request(url, encoded, headers)
    try:
        with HTTP.open(request, timeout=30) as response:
            if response.status != 200 or response.headers.get_content_type() != "application/json": raise RuntimeError("Incomplete Paperclip protocol response")
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES: raise RuntimeError("Paperclip response exceeds transport limit")
            value = json.loads(data)
            if not isinstance(value, dict): raise RuntimeError("Invalid Paperclip protocol response")
            return value
    except urllib.error.HTTPError as error:
        raise RuntimeError("Paperclip HTTP %d; inspect connection or receipt before retrying" % error.code) from None
class Client:
    def __init__(self, binding):
        uuid.UUID(binding)
        self.binding = binding; self.directory = ROOT / binding
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700); os.chmod(self.directory, 0o700)
        self.lock = open(self.directory / "client.lock", "a"); os.chmod(self.directory / "client.lock", 0o600)
        fcntl.flock(self.lock, fcntl.LOCK_EX)
        self.path = self.directory / "worker.json"
        self.config = json.loads(self.path.read_text()) if self.path.exists() else None
    def close(self): self.lock.close()
    def store_credentials(self, value, base):
        required = {"version", "bindingId", "generation", "companyId", "agentId", "accessToken", "accessExpiresAt", "refreshToken", "refreshExpiresAt", "signalToken", "cleanupToken", "detectorCleanupToken"}
        if set(value) != required or value["version"] != 1 or value["bindingId"] != self.binding: raise RuntimeError("Unexpected pairing identity")
        self.config = {**value, "origin": origin(base)}
        save(self.path, self.config)
        # Detector reads this file alone. No worker/refresh/cleanup credentials.
        save(self.directory / "signal.json", {"origin": self.config["origin"], "bindingId": self.binding, "generation": value["generation"], "signalToken": value["signalToken"], "detectorCleanupToken": value["detectorCleanupToken"]})
    def access(self):
        if not self.config or self.config.get("reconnectRequired") or self.config.get("refreshPending"): raise RuntimeError("Reconnect Muse; credential rotation outcome is uncertain")
        expiry = datetime.datetime.fromisoformat(self.config["accessExpiresAt"].replace("Z", "+00:00")).timestamp()
        if expiry < datetime.datetime.now().timestamp() + 60:
            self.config["refreshPending"] = True; save(self.path, self.config)
            try:
                value = http(self.config["origin"] + "/api/muse/v1/refresh", {"version": 1, "refreshToken": self.config["refreshToken"]})
                self.store_credentials(value, self.config["origin"])
            except Exception:
                self.config["reconnectRequired"] = True; save(self.path, self.config)
                raise RuntimeError("Refresh outcome uncertain; reconnect without replaying refresh") from None
        return self.config["accessToken"]
    def query(self, value):
        return http(self.config["origin"] + "/api/muse/v1/queries", {"version": 1, **value}, self.access())
    def command(self, key, value):
        path = self.directory / "journal" / (hashlib.sha256(key.encode()).hexdigest() + ".json")
        value = {"version": 1, **value}
        proposed = {k: v for k, v in value.items() if k != "requestId"}
        digest = hashlib.sha256(canonical(proposed)).hexdigest()
        if path.exists():
            journal = json.loads(path.read_text())
            if journal["digest"] != digest: raise RuntimeError("Stable command key reused with different input")
        else:
            journal = {"digest": digest, "command": {**value, "requestId": value.get("requestId", str(uuid.uuid4()))}, "state": "prepared"}
            save(path, journal)
        if journal.get("receipt", {}).get("status") in ("unknown", "rejected"):
            raise RuntimeError("Operation is unresolved or rejected; inspect its original receipt without replay")
        if journal.get("receipt", {}).get("status") not in ("pending", "reserved", "dispatched") and "receipt" in journal: return journal["receipt"]
        # Persist dispatch intent before issuing the stable command. A lost ACK
        # is inspected using exactly this requestId, never a replacement effect.
        journal["state"] = "sending"; save(path, journal)
        result = http(self.config["origin"] + "/api/muse/v1/commands", journal["command"], self.access())
        journal["receipt"] = result; journal["state"] = "received"; save(path, journal)
        return result
    def answer(self, assignment, request):
        value = self.query({"query": "input.pending", "assignmentId": assignment, "nativeRequestId": request})
        if value.get("status") == "pending": return value
        path = self.directory / "continuations" / (assignment + ".json")
        old = json.loads(path.read_text()) if path.exists() else {"assignmentId": assignment, "inputs": {}}
        previous = old["inputs"].get(request)
        if previous and previous["inputDigest"] != value["inputDigest"]: raise RuntimeError("Input changed within a turn")
        old["inputs"][request] = {**value, "continuationReceiptId": previous["continuationReceiptId"] if previous else str(uuid.uuid4())}
        save(path, old)
        return old["inputs"][request]
    def consume(self, assignment, request):
        value = json.loads((self.directory / "continuations" / (assignment + ".json")).read_text())["inputs"][request]
        return self.command("consume:" + assignment + ":" + request, {"command": "consume_input", "assignmentId": assignment, "nativeRequestId": request, "inputDigest": value["inputDigest"], "continuationReceiptId": value["continuationReceiptId"], "continuationPersisted": True})
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--binding", required=True)
    sub = parser.add_subparsers(dest="mode", required=True)
    pair = sub.add_parser("pair"); pair.add_argument("--origin", required=True); pair.add_argument("--ticket", required=True)
    sub.add_parser("query")
    command = sub.add_parser("command"); command.add_argument("--key", required=True)
    for name in ("answer", "consume-input"):
        child = sub.add_parser(name); child.add_argument("assignment"); child.add_argument("request")
    cleanup = sub.add_parser("cleanup"); cleanup.add_argument("--inspect", action="store_true")
    client = Client(parser.parse_args().binding)
    try:
        args = parser.parse_args()
        if args.mode == "pair":
            base = origin(args.origin)
            client.store_credentials(http(base + "/api/muse/v1/pair", {"version": 1, "ticket": args.ticket, "clientVersion": VERSION}), base)
            result = {"paired": True, "bindingId": client.binding, "version": VERSION}
        elif args.mode == "query": result = client.query(json.load(sys.stdin))
        elif args.mode == "command": result = client.command(args.key, json.load(sys.stdin))
        elif args.mode == "answer": result = client.answer(args.assignment, args.request)
        elif args.mode == "consume-input": result = client.consume(args.assignment, args.request)
        elif args.mode == "cleanup":
            body = {"version": 1, "command": "control.inspect"} if args.inspect else {"version": 1, **json.load(sys.stdin)}
            result = http(client.config["origin"] + "/api/muse/v1/cleanup", body, client.config["cleanupToken"])
        print(json.dumps(result, ensure_ascii=False))
    finally: client.close()
if __name__ == "__main__":
    try: main()
    except Exception as error:
        # Never echo exception payloads, request bodies, credentials or URLs.
        print("Paperclip client stopped: " + (str(error) if isinstance(error, RuntimeError) else "private state or transport failure"), file=sys.stderr)
        sys.exit(1)
