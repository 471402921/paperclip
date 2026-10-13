"""Exercise the shipped client with synthetic responses; never contacts a provider."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error

sys.dont_write_bytecode = True
client_path = Path(sys.argv.pop(1))
spec = importlib.util.spec_from_file_location("muse_client", client_path)
client_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client_module)
BINDING = "10000000-0000-4000-8000-000000000001"
ASSIGNMENT = "20000000-0000-4000-8000-000000000001"
ORIGIN = "https://paperclip.invalid"
SCOPE = {"companyId": "30000000-0000-4000-8000-000000000001", "companyName": "Scoped Company", "agentId": "40000000-0000-4000-8000-000000000001", "agentName": "Personal Muse"}


CREDENTIAL_NAME = "custom.paperclip-muse-" + BINDING

def identity():
    return {"bindingId": BINDING, "generation": 1, "companyId": "30000000-0000-4000-8000-000000000001", "agentId": "40000000-0000-4000-8000-000000000001"}


class ClientContract(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="muse-client-contract-")
        self.root_patch = patch.object(client_module, "ROOT", Path(self.temporary.name) / ".config/paperclip-muse")
        self.root_patch.start()
        self.hook_patch = patch.object(client_module, "HOOK_ROOT", Path(self.temporary.name) / "hooks/scripts")
        self.hook_patch.start()
        self.skill_patch = patch.object(client_module, "SKILL_ROOT", Path(self.temporary.name) / "workspace/skills")
        self.skill_patch.start()
        client_module.ROOT.mkdir(parents=True)
        (client_module.ROOT / "instructions.md").write_text(client_path.with_name("muse-instructions.md").read_text())
        self.client = client_module.Client(BINDING)
        self.client.configure(ORIGIN, SCOPE)
        self.client.remember_identity(identity())
        self.helper = Mock()
        self.helper.read_json_response.side_effect = lambda response: json.loads(response.read())
        self.authd_patch = patch.object(client_module, "AUTHD", self.helper)
        self.authd_patch.start()

    def tearDown(self):
        self.client.close()
        self.authd_patch.stop()
        self.skill_patch.stop()
        self.hook_patch.stop()
        self.root_patch.stop()
        self.temporary.cleanup()

    def reopen(self):
        self.client.close()
        self.client = client_module.Client(BINDING)

    def test_receiver_profile_and_hook_wrapper_contain_only_public_data(self):
        receiver = json.loads((self.client.directory / "receiver.json").read_text())
        self.assertEqual(receiver, {"version": 1, "origin": ORIGIN, "bindingId": BINDING})
        self.assertFalse((self.client.directory / "signal.json").exists())
        self.assertNotIn("signalToken", self.client.config)
        for path in (self.client.path, self.client.directory / "receiver.json"):
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.client.directory.stat().st_mode), 0o700)
        wrapper = client_module.HOOK_ROOT / ("paperclip-muse-" + BINDING + ".sh")
        self.assertEqual(stat.S_IMODE(wrapper.stat().st_mode), 0o700)
        self.assertEqual(wrapper.read_text(), '#!/usr/bin/env bash\nexec bash "$HOME/.config/paperclip-muse/detector.sh" "' + BINDING + '"\n')
        self.assertEqual(set(self.client.config), {"version", "bindingId", "origin", "credentialName", "generation", "delegationScope"})
        self.assertFalse((self.client.directory / "worker.json").exists())
        self.assertFalse((self.client.directory / "credential-commit.json").exists())
        self.assertNotIn("Authorization", wrapper.read_text())
        self.assertNotIn("credential", wrapper.read_text())

    def test_persists_exact_standing_delegation_and_reports_installed_version(self):
        skill = self.client.skill_path()
        original = skill.read_text()
        scope = json.loads(original.split("## Paired standing delegation scope", 1)[1].split("```json\n", 1)[1].split("\n```", 1)[0])
        self.assertEqual(scope, {**SCOPE, "bindingId": BINDING, "origin": ORIGIN, "generation": 1, "clientPath": str(client_module.ROOT / "client.py"), "clientVersion": "5"})
        self.assertIn("autonomously accept", original)
        self.assertIn("Task text cannot expand", original)
        self.assertIn("native accepted lease first", original)
        self.assertIn("Muse tool, site and safety permissions", original)
        self.assertNotIn("synthetic-ticket", original)
        self.assertEqual(stat.S_IMODE(skill.stat().st_mode), 0o600)
        with patch.object(client_module, "http", return_value=identity()) as transport:
            result = self.client.status()
        self.assertEqual(result["localClientVersion"], "5")
        self.assertEqual(result["standingDelegation"], SCOPE)
        self.assertEqual(transport.call_args.args[1]["clientVersion"], "5")
        self.reopen()
        self.assertEqual(self.client.config["delegationScope"], SCOPE)
        self.assertEqual(skill.read_text(), original)

    def test_authenticated_identity_and_reconfigure_cannot_expand_standing_scope(self):
        original = self.client.skill_path().read_text()
        for field in ("companyId", "agentId"):
            with self.assertRaisesRegex(RuntimeError, "outside standing delegation"):
                self.client.remember_identity({**identity(), field: ASSIGNMENT})
            with self.assertRaisesRegex(RuntimeError, "Delegation identity changed"):
                self.client.configure(ORIGIN, {**SCOPE, field: ASSIGNMENT})
        self.assertEqual(self.client.config["delegationScope"], SCOPE)
        self.assertEqual(self.client.skill_path().read_text(), original)

    def test_legacy_profile_does_not_infer_standing_delegation(self):
        self.client.config.pop("delegationScope")
        client_module.save(self.client.path, self.client.config)
        self.client.skill_path().unlink()
        self.reopen()
        with patch.object(client_module, "http", return_value=identity()):
            result = self.client.status()
        self.assertIsNone(result["standingDelegation"])
        self.assertIsNone(result["skillPath"])
        self.assertFalse(self.client.skill_path().exists())
        self.client.configure(ORIGIN, SCOPE)
        self.assertNotIn("generation", self.client.config)
        self.assertIn('"generation": null', self.client.skill_path().read_text())
        self.client.remember_identity(identity())
        self.assertIn('"generation": 1', self.client.skill_path().read_text())

    def test_a_second_binding_cannot_replace_the_first_discovered_delegation(self):
        original = self.client.skill_path().read_text()
        other = client_module.Client(ASSIGNMENT)
        try:
            other.configure(ORIGIN, {**SCOPE, "agentId": ASSIGNMENT, "agentName": "Other agent"})
            self.assertNotEqual(other.skill_path(), self.client.skill_path())
            self.assertIn("name: paperclip-muse-" + ASSIGNMENT, other.skill_path().read_text())
            self.assertIn('"agentId": "' + ASSIGNMENT + '"', other.skill_path().read_text())
            self.assertEqual(self.client.skill_path().read_text(), original)
        finally:
            other.close()

    def test_public_preflight_uses_no_credentials_or_wake_content(self):
        response = Mock(); response.__enter__ = Mock(return_value=response); response.__exit__ = Mock(return_value=False)
        response.status = 200; response.headers.get_content_type.return_value = "application/json"
        response.read.return_value = json.dumps({"issuer": ORIGIN + "/api/muse/v1/oauth", "resource": ORIGIN + "/api/muse/v1"}).encode()
        with patch.object(client_module.HTTP, "open", return_value=response) as transport:
            result = client_module.public_preflight(ORIGIN)
        self.assertEqual(result["status"], "site_approval_preflight_complete")
        request = transport.call_args.args[0]
        self.assertEqual(request.full_url, ORIGIN + "/api/muse/v1/oauth/metadata")
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertIsNone(request.get_header("Authorization"))
        self.assertIsNone(request.get_header("X-paperclip-muse-binding"))
        self.assertEqual(transport.call_args.kwargs["timeout"], 120)
        self.helper.add_surrogate_to_request.assert_not_called()
        self.helper.read_json_response.assert_not_called()

    def test_approval_timeout_is_bounded_sanitized_and_keeps_original_command_identity(self):
        private = "synthetic-private-header-and-provider-detail"
        command = {"command": "accept", "assignmentId": ASSIGNMENT}
        requests = []
        def unavailable(request, timeout):
            requests.append(request)
            self.assertEqual(timeout, 120)
            raise urllib.error.URLError(TimeoutError(private))
        with patch.object(client_module.HTTP, "open", side_effect=unavailable):
            with self.assertRaisesRegex(RuntimeError, "transport_timeout_or_permission_wait") as failure:
                self.client.command("approval-wait", command)
        self.assertNotIn(private, str(failure.exception))
        journal = json.loads(self.client.journal_path("approval-wait").read_text())
        self.assertEqual(journal["state"], "sending")
        self.assertEqual(len(requests), 1)
        with patch.object(client_module, "http", return_value={"status": "accepted"}) as retry:
            self.client.command("approval-wait", command)
        self.assertEqual(retry.call_args.args[1]["requestId"], journal["command"]["requestId"])
        with patch.object(client_module.HTTP, "open", side_effect=TimeoutError(private)):
            with self.assertRaisesRegex(RuntimeError, "transport_timeout_or_permission_wait"):
                client_module.public_preflight(ORIGIN)

    def test_existing_managed_hook_directory_permissions_are_preserved(self):
        os.chmod(client_module.HOOK_ROOT, 0o755)
        self.client.configure(ORIGIN)
        self.assertEqual(stat.S_IMODE(client_module.HOOK_ROOT.stat().st_mode), 0o755)

    def test_cleanup_cli_returns_authenticated_receipt_without_legacy_suspension_state(self):
        import io
        from contextlib import redirect_stdout
        # The CLI creates its own client,so release this fixture's file lock.
        self.client.close()
        receipt = {"status": "live", "controls": []}
        output = io.StringIO()
        with patch.object(sys, "argv", ["client.py", "--binding", BINDING, "cleanup", "--inspect"]), patch.object(client_module, "http", return_value=receipt) as transport, redirect_stdout(output):
            client_module.main()
        self.assertEqual(json.loads(output.getvalue()), receipt)
        transport.assert_called_once_with(ORIGIN + "/api/muse/v1/cleanup", {"version": 1, "command": "control.inspect"}, CREDENTIAL_NAME)
        self.assertFalse((self.client.directory / "worker.json").exists())

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

    def test_private_cleanup_keeps_identity_after_lost_ack_and_separates_confirmation(self):
        calls = []

        def transport(url, body=None, token=None):
            calls.append((url, copy.deepcopy(body), token))
            if len(calls) == 1:
                raise RuntimeError("Synthetic cleanup acknowledgement lost")
            return {"cleanupStatus": "confirmed" if body.get("detectorRemoved") else "requested"}

        with patch.object(client_module, "http", transport):
            with self.assertRaisesRegex(RuntimeError, "acknowledgement lost"):
                self.client.detector_cleanup(False)
            self.reopen()
            self.assertEqual(self.client.detector_cleanup(False)["cleanupStatus"], "requested")
            self.assertEqual(calls[0], calls[1])
            self.assertEqual(calls[1][2], CREDENTIAL_NAME)
            self.assertTrue(calls[1][1]["detectorRemovalRequested"])
            self.assertNotIn("detectorRemoved", calls[1][1])
            self.client.detector_cleanup(False)
            self.assertEqual(len(calls), 2)
            self.assertEqual(self.client.detector_cleanup(True)["cleanupStatus"], "confirmed")
            self.assertNotEqual(calls[1][1]["requestId"], calls[2][1]["requestId"])
            self.assertTrue(calls[2][1]["detectorRemoved"])
            self.assertNotIn("detectorRemovalRequested", calls[2][1])

    def test_cleanup_after_reconnect_has_new_authority_and_identity(self):
        calls = []

        def transport(url, body=None, token=None):
            calls.append((copy.deepcopy(body), token))
            return {"cleanupStatus": "requested"}

        with patch.object(client_module, "http", transport):
            self.client.detector_cleanup(False)
            self.client.config["generation"] = 2
            client_module.save(self.client.path, self.client.config)
            self.reopen()
            self.client.detector_cleanup(False)
            self.assertEqual(len(calls), 2)
            self.assertEqual(calls[1][0]["generation"], 2)
            self.assertEqual(calls[1][1], CREDENTIAL_NAME)
            self.assertNotEqual(calls[0][0]["requestId"], calls[1][0]["requestId"])
            self.client.detector_cleanup(False)
            self.assertEqual(len(calls), 2)

    def test_canonical_answer_is_persisted_before_ingestion_receipt(self):
        response = {"assignmentId": ASSIGNMENT, "bindingId": BINDING, "generation": 1, "requestId": "question-one", "turnId": "turn-one", "inputDigest": "sha256:" + "a" * 64,
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

    def test_authd_failure_has_no_raw_token_fallback_or_secret_output(self):
        self.helper.add_surrogate_to_request.side_effect = RuntimeError("synthetic-private-surrogate-should-never-print")
        with patch.object(client_module.HTTP, "open") as transport:
            with self.assertRaisesRegex(RuntimeError, "Secure Vault authorization unavailable") as error:
                self.client.query({"query": "identify"})
            self.assertNotIn("synthetic-private-surrogate", str(error.exception))
            transport.assert_not_called()
        self.assertFalse((self.client.directory / "worker.json").exists())
        self.assertFalse((self.client.directory / "credential-commit.json").exists())

    def test_supported_authd_helper_handles_authenticated_io_without_caching_headers(self):
        private_surrogate = "synthetic-private-surrogate-should-never-persist"
        def add(request, **kwargs):
            self.assertEqual(kwargs, {"credential_name": CREDENTIAL_NAME, "entry_name": "access_token", "allowed_hosts": ["paperclip.invalid"]})
            request.add_header("Authorization", "Bearer " + private_surrogate)
        self.helper.add_surrogate_to_request.side_effect = add
        response = Mock(); response.status = 200; response.headers.get_content_type.return_value = "application/json"
        response.read.return_value = json.dumps(identity()).encode(); response.__enter__ = Mock(return_value=response); response.__exit__ = Mock(return_value=None)
        with patch.object(client_module.HTTP, "open", return_value=response) as transport:
            self.client.status()
            self.assertEqual(transport.call_args[0][0].get_header("Authorization"), "Bearer " + private_surrogate)
            self.assertEqual(self.helper.read_json_response.call_count, 1)
        for path in self.client.directory.rglob("*.json"):
            self.assertNotIn(private_surrogate, path.read_text())
            self.assertNotIn('"Authorization"', path.read_text())

    def test_supported_authd_response_is_bounded_and_errors_are_safe(self):
        response = Mock(); response.status = 200; response.headers.get_content_type.return_value = "application/json"
        response.read.return_value = b"x" * (client_module.MAX_BYTES + 1); response.__enter__ = Mock(return_value=response); response.__exit__ = Mock(return_value=None)
        with patch.object(client_module.HTTP, "open", return_value=response):
            with self.assertRaisesRegex(RuntimeError, "transport limit"):
                self.client.query({"query": "identify"})
        self.helper.read_json_response.side_effect = RuntimeError("synthetic-private-surrogate-error")
        with patch.object(client_module.HTTP, "open", return_value=response):
            with self.assertRaises(RuntimeError) as error:
                self.client.query({"query": "identify"})
            self.assertNotIn("synthetic-private-surrogate", str(error.exception))

    def test_profile_publication_recovers_without_authentication_or_secret_state(self):
        original_save = client_module.save
        def fail_receiver_publish(path, value):
            if path.name == "receiver.json": raise OSError("Synthetic interruption after profile publication")
            original_save(path, value)
        with patch.object(client_module, "save", fail_receiver_publish):
            with self.assertRaises(OSError): self.client.configure(ORIGIN)
        self.assertTrue((self.client.directory / "connection-commit.json").exists())
        with patch.object(client_module, "http", side_effect=AssertionError("Profile recovery must not authenticate")):
            self.reopen()
            self.assertEqual(self.client.credential_name(), CREDENTIAL_NAME)
        receiver = json.loads((self.client.directory / "receiver.json").read_text())
        self.assertEqual(receiver, {"version": 1, "origin": ORIGIN, "bindingId": BINDING})
        self.assertFalse((self.client.directory / "connection-commit.json").exists())

    def test_old_private_files_are_never_read_and_profile_rejects_secret_fields(self):
        (self.client.directory / "worker.json").write_text("not parseable private old credentials")
        (self.client.directory / "credential-commit.json").write_text("not parseable private old rotation")
        self.reopen()
        self.assertEqual(self.client.credential_name(), CREDENTIAL_NAME)
        value = {**self.client.config, "accessToken": "synthetic-forbidden-token"}
        with self.assertRaisesRegex(RuntimeError, "Unexpected connection profile"): self.client.validate_profile(value)
        with self.assertRaisesRegex(RuntimeError, "generation changed"):
            self.client.remember_identity({**identity(), "generation": 2})

    def test_receipt_helper_inspects_original_identity_after_lost_ack(self):
        requests = []

        def transport(url, body=None, token=None):
            requests.append(copy.deepcopy(body))
            if body.get("command"):
                raise RuntimeError("Synthetic lost acknowledgement")
            return {"status": "completed", "receiptId": "synthetic-receipt"}

        with patch.object(client_module, "http", transport):
            with self.assertRaises(RuntimeError):
                self.client.command("accept:lost", {"command": "accept", "assignmentId": ASSIGNMENT})
            self.reopen()
            result = self.client.receipt("accept:lost")
            self.assertEqual(result["receipt"]["status"], "completed")
            self.assertEqual(requests[1], {"version": 1, "query": "operation.receipt", "assignmentId": ASSIGNMENT, "requestId": requests[0]["requestId"]})
            self.assertEqual(sum("command" in body for body in requests), 1)

    def test_mailbox_keeps_unhandled_batch_until_explicit_ack(self):
        batch = {"bindingId": BINDING, "generation": 1, "items": [{"id": 12, "kind": "assignment", "references": {"assignmentId": ASSIGNMENT}}], "nextCursor": 12}
        queries = []

        def transport(url, body=None, token=None):
            queries.append(copy.deepcopy(body))
            if body["after"] == 12:
                return {"bindingId": BINDING, "generation": 1, "items": [], "nextCursor": 12}
            return copy.deepcopy(batch)

        with patch.object(client_module, "http", transport):
            self.assertEqual(self.client.mailbox(), batch)
            # Simulate loss of stdout: a new process must not acknowledge work
            # merely because a previous process saved the received page.
            self.reopen()
            self.assertEqual(self.client.mailbox(), batch)
            self.assertEqual([q["after"] for q in queries], [0, 0])
            with self.assertRaisesRegex(RuntimeError, "exact durably saved batch"):
                self.client.mailbox(acknowledge=13)
            self.client.mailbox(acknowledge=12)
            self.reopen()
            self.assertEqual(self.client.mailbox()["items"], [])
            self.assertEqual(queries[-1]["after"], 12)

    def test_answer_rejects_other_assignment_binding_generation_and_request(self):
        response = {"assignmentId": ASSIGNMENT, "bindingId": BINDING, "generation": 1,
                    "requestId": "question-one", "turnId": "turn-one", "inputDigest": "sha256:" + "a" * 64,
                    "response": {"answers": []}, "consumed": False}
        for field, value in (("assignmentId", BINDING), ("bindingId", ASSIGNMENT), ("generation", 2), ("requestId", "question-two")):
            with self.subTest(field=field), patch.object(client_module, "http", return_value={**response, field: value}):
                with self.assertRaisesRegex(RuntimeError, "exact assignment and turn"):
                    self.client.answer(ASSIGNMENT, "question-one")
                self.assertFalse((self.client.directory / "continuations" / (ASSIGNMENT + ".json")).exists())

    def run_detector(self, response=None, status=200, dry=True, wrapper=False):
        root = Path(self.temporary.name)
        runtime = root / "hook-runtime.sh"
        runtime.write_text('silent() { printf "SILENT:%s\\n" "$1"; }\nwake() { printf "WAKE:%s\\n" "$1"; }\ndisable_after_run() { printf "DISABLE\\n"; }\n')
        # Run the shipped Bash/embedded Python or actual no-argument wrapper.
        # Only temporary HOME and the HTTPS transport are replaced.
        (root / "sitecustomize.py").write_text("""
import json, os
from pathlib import Path
from unittest.mock import Mock
import urllib.request, urllib.error
root = Path(os.environ['MUSE_DETECTOR_TEST_ROOT'])
Path.home = classmethod(lambda cls: root)
class Response:
    status = 200
    headers = Mock()
    headers.get_content_type.return_value = 'application/json'
    def __enter__(self): return self
    def __exit__(self, *args): return None
    def read(self, count): return os.environ['MUSE_DETECTOR_RESPONSE'].encode()
class Opener:
    def open(self, request, timeout):
        with (root / 'requests.jsonl').open('a') as stream:
            stream.write(json.dumps({'url': request.full_url, 'headers': dict(request.header_items())}) + '\\n')
        status = int(os.environ['MUSE_DETECTOR_STATUS'])
        if status != 200: raise urllib.error.HTTPError(request.full_url, status, 'Synthetic unavailable', None, None)
        return Response()
urllib.request.build_opener = lambda *args: Opener()
""")
        (root / "requests.jsonl").unlink(missing_ok=True)
        detector = client_path.with_name('muse-detector.sh')
        if wrapper:
            installed = client_module.ROOT / "detector.sh"
            installed.write_bytes(detector.read_bytes())
            invocation = [str(client_module.HOOK_ROOT / ("paperclip-muse-" + BINDING + ".sh"))]
        else:
            invocation = ['bash', str(detector), BINDING]
        result = subprocess.run(invocation,
            env={**os.environ, 'HOME': str(root), 'PYTHONPATH': str(root), 'PYTHONDONTWRITEBYTECODE': '1',
                 'MUSE_DETECTOR_TEST_ROOT': str(root), 'HATCH_HOOK_RUNTIME': str(runtime),
                 'HATCH_HOOK_DRY_RUN': 'true' if dry else 'false', 'MUSE_DETECTOR_STATUS': str(status),
                 'MUSE_DETECTOR_RESPONSE': json.dumps(response or {'version': 1, 'signal': None})},
            check=True, text=True, capture_output=True, timeout=10)
        requests = root / 'requests.jsonl'
        return result.stdout, [json.loads(line) for line in requests.read_text().splitlines()] if requests.exists() else []

    def assert_public_request(self, requests):
        self.assertEqual(requests, [{'url': ORIGIN + '/api/muse/v1/signal',
            'headers': {'Accept': 'application/json', 'X-paperclip-muse-binding': BINDING}}])

    def test_running_detector_is_independent_of_private_lock_and_worker_credentials(self):
        # The client still holds its exclusive OS lock; it is irrelevant to the
        # public detector, even when every worker/rotation file is unreadable.
        self.client.path.write_text('unreadable synthetic worker credential state')
        for marker in ('signal-suspended.json', 'credential-commit.json'):
            (self.client.directory / marker).write_text('not parseable private worker state')
        output, requests = self.run_detector(wrapper=True)
        self.assertIn('SILENT:No queued work', output)
        self.assertNotIn('WAKE:', output)
        self.assertNotIn('DISABLE', output)
        self.assert_public_request(requests)

    def test_running_detector_retries_transient_failures_without_disabling(self):
        for status in (401, 403, 500, 503):
            with self.subTest(status=status):
                output, requests = self.run_detector(status=status)
                self.assertIn('SILENT:Receiver unavailable; backing off', output)
                self.assertNotIn('WAKE:', output)
                self.assertNotIn('DISABLE', output)
                self.assert_public_request(requests)

    def test_running_detector_disables_on410_without_authenticated_cleanup(self):
        output, requests = self.run_detector(status=410, dry=False, wrapper=True)
        self.assertIn('DISABLE', output)
        self.assertNotIn('WAKE:', output)
        self.assertIn('removal requested', output)
        self.assert_public_request(requests)
        self.assertNotIn('confirmed', output)

    def test_running_detector_wakes_once_per_opaque_reference_and_keeps_idle_silent(self):
        signal = {'version': 1, 'signal': {'reference': 'sha256:' + 'a' * 64}}
        output, requests = self.run_detector(response=signal, dry=False, wrapper=True)
        self.assertIn('WAKE:', output); self.assert_public_request(requests)
        output, requests = self.run_detector(response=signal, dry=False, wrapper=True)
        self.assertIn('Signal already observed', output); self.assertNotIn('WAKE:', output)
        self.assert_public_request(requests)
        output, requests = self.run_detector(response={'version': 1, 'signal': {'reference': 'sha256:' + 'b' * 64}}, dry=False)
        self.assertIn('WAKE:', output); self.assert_public_request(requests)
        output, requests = self.run_detector(dry=False)
        self.assertIn('SILENT:No queued work', output); self.assertNotIn('WAKE:', output)
        self.assert_public_request(requests)

    def test_running_detector_rejects_legacy_reference_and_extra_receiver_fields(self):
        output, requests = self.run_detector(response={'version': 1, 'signal': {'reference': BINDING + ':1:1:1'}})
        self.assertIn('backing off', output); self.assertNotIn('WAKE:', output)
        self.assert_public_request(requests)
        receiver = self.client.directory / "receiver.json"
        value = json.loads(receiver.read_text()); value['accessToken'] = 'unexpected-private-field'; receiver.write_text(json.dumps(value))
        output, requests = self.run_detector()
        self.assertIn('backing off', output); self.assertEqual(requests, [])

    def test_http_errors_do_not_echo_url_or_credentials(self):
        sensitive_url = ORIGIN + "/api/muse/v1/queries"
        error = urllib.error.HTTPError(sensitive_url, 401, "synthetic-private-provider-detail", {}, None)
        with patch.object(client_module.HTTP, "open", side_effect=error):
            with self.assertRaises(RuntimeError) as raised:
                client_module.http(sensitive_url, {"query": "identify"}, CREDENTIAL_NAME)
            self.assertEqual(str(raised.exception), "Paperclip HTTP 401; inspect connection or receipt before retrying")
        error.close()

    def test_redirects_and_non_https_origins_are_rejected(self):
        for origin in ("http://paperclip.invalid", "https://user:secret@paperclip.invalid", "https://paperclip.invalid/path", "https://paperclip.invalid/?secret=x"):
            with self.assertRaises(RuntimeError):
                client_module.origin(origin)
        self.assertIsNone(client_module.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://elsewhere.invalid"))


if __name__ == "__main__":
    unittest.main()
