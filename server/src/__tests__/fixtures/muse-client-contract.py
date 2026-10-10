"""Exercise the shipped client with synthetic responses; never contacts a provider."""
import copy
import importlib.util
import json
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("muse_client", sys.argv.pop(1))
client_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client_module)
BINDING = "10000000-0000-4000-8000-000000000001"
ASSIGNMENT = "20000000-0000-4000-8000-000000000001"
ORIGIN = "https://paperclip.invalid"


def credentials(suffix="initial"):
    return {
        "version": 1, "bindingId": BINDING, "generation": 1,
        "companyId": "30000000-0000-4000-8000-000000000001",
        "agentId": "40000000-0000-4000-8000-000000000001",
        "accessToken": "synthetic-access-" + suffix,
        "accessExpiresAt": "2099-01-01T00:00:00Z",
        "refreshToken": "synthetic-refresh-" + suffix,
        "refreshExpiresAt": "2099-02-01T00:00:00Z",
        "signalToken": "synthetic-signal-" + suffix,
        "cleanupToken": "synthetic-cleanup-" + suffix,
        "detectorCleanupToken": "synthetic-detector-cleanup-" + suffix,
    }


class ClientContract(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="muse-client-contract-")
        self.root_patch = patch.object(client_module, "ROOT", Path(self.temporary.name))
        self.root_patch.start()
        self.client = client_module.Client(BINDING)
        self.client.store_credentials(credentials(), ORIGIN)

    def tearDown(self):
        self.client.close()
        self.root_patch.stop()
        self.temporary.cleanup()

    def reopen(self):
        self.client.close()
        self.client = client_module.Client(BINDING)

    def test_detector_never_reads_worker_credentials(self):
        signal = json.loads((self.client.directory / "signal.json").read_text())
        self.assertEqual(set(signal), {"origin", "bindingId", "generation", "signalToken", "detectorCleanupToken"})
        for path in (self.client.path, self.client.directory / "signal.json"):
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.client.directory.stat().st_mode), 0o700)
        self.assertEqual(self.client.config["accessToken"], credentials()["accessToken"])

    def test_lost_ack_reuses_persisted_identity_and_rejects_changed_effect(self):
        requests = []
        command = {"command": "tool", "assignmentId": ASSIGNMENT, "name": "paperclip_document_upsert", "arguments": {"key": "report", "body": "Synthetic evidence"}}

        def transport(url, body=None, token=None):
            requests.append(copy.deepcopy(body))
            if len(requests) == 1:
                raise RuntimeError("Synthetic response lost after server acceptance")
            return {"status": "completed", "receiptId": "synthetic-receipt"}

        with patch.object(client_module, "http", transport):
            with self.assertRaisesRegex(RuntimeError, "Synthetic response lost"):
                self.client.command("document:report:1", command)
            self.reopen()
            result = self.client.command("document:report:1", command)
            self.assertEqual(result["status"], "completed")
            self.assertEqual(requests[0], requests[1])
            self.assertTrue(requests[0]["requestId"])
            self.client.command("document:report:1", command)
            self.assertEqual(len(requests), 2)
            with self.assertRaisesRegex(RuntimeError, "different input"):
                self.client.command("document:report:1", {**command, "arguments": {"key": "report", "body": "Changed effect"}})
            self.assertEqual(len(requests), 2)

    def test_unknown_receipt_blocks_automatic_repetition(self):
        with patch.object(client_module, "http", return_value={"status": "unknown", "canReplay": False}) as transport:
            command = {"command": "accept", "assignmentId": ASSIGNMENT}
            self.assertEqual(self.client.command("accept:1", command)["status"], "unknown")
            self.reopen()
            with self.assertRaisesRegex(RuntimeError, "unresolved"):
                self.client.command("accept:1", command)
            self.assertEqual(transport.call_count, 1)

    def test_canonical_answer_is_persisted_before_ingestion_receipt(self):
        response = {"requestId": "question-one", "turnId": "turn-one", "inputDigest": "sha256:" + "a" * 64,
                    "response": {"answers": [{"questionId": "format", "answer": "Markdown"}]}, "consumed": False}
        calls = []

        def transport(url, body=None, token=None):
            calls.append(copy.deepcopy(body))
            if body.get("query") == "input.pending":
                return copy.deepcopy(response)
            persisted = json.loads((self.client.directory / "continuations" / (ASSIGNMENT + ".json")).read_text())
            self.assertEqual(body["continuationReceiptId"], persisted["inputs"]["question-one"]["continuationReceiptId"])
            self.assertTrue(body["continuationPersisted"])
            self.assertEqual(body["inputDigest"], response["inputDigest"])
            return {"status": "consumed"}

        with patch.object(client_module, "http", transport):
            answer = self.client.answer(ASSIGNMENT, "question-one")
            self.assertEqual([call.get("command") for call in calls], [None])
            self.reopen()
            self.assertEqual(self.client.answer(ASSIGNMENT, "question-one")["continuationReceiptId"], answer["continuationReceiptId"])
            self.assertEqual(self.client.consume(ASSIGNMENT, "question-one")["status"], "consumed")
            response["inputDigest"] = "sha256:" + "b" * 64
            with self.assertRaisesRegex(RuntimeError, "Input changed"):
                self.client.answer(ASSIGNMENT, "question-one")

    def test_uncertain_refresh_requires_reconnect_without_replaying_rotation(self):
        expired = credentials()
        expired["accessExpiresAt"] = "2000-01-01T00:00:00Z"
        self.client.store_credentials(expired, ORIGIN)
        with patch.object(client_module, "http", side_effect=RuntimeError("Synthetic lost rotation response")) as transport:
            with self.assertRaisesRegex(RuntimeError, "Refresh outcome uncertain"):
                self.client.access()
            self.reopen()
            with self.assertRaisesRegex(RuntimeError, "Reconnect Muse"):
                self.client.access()
            self.assertEqual(transport.call_count, 1)

    def test_http_errors_do_not_echo_url_or_credentials(self):
        sensitive_url = ORIGIN + "/api/muse/v1/queries"
        error = urllib.error.HTTPError(sensitive_url, 401, "synthetic-private-provider-detail", {}, None)
        with patch.object(client_module.HTTP, "open", side_effect=error):
            with self.assertRaises(RuntimeError) as raised:
                client_module.http(sensitive_url, {"query": "identify"}, "synthetic-access-credential")
            self.assertEqual(str(raised.exception), "Paperclip HTTP 401; inspect connection or receipt before retrying")

    def test_redirects_and_non_https_origins_are_rejected(self):
        for origin in ("http://paperclip.invalid", "https://user:secret@paperclip.invalid", "https://paperclip.invalid/path", "https://paperclip.invalid/?secret=x"):
            with self.assertRaises(RuntimeError):
                client_module.origin(origin)
        self.assertIsNone(client_module.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://elsewhere.invalid"))


if __name__ == "__main__":
    unittest.main()
