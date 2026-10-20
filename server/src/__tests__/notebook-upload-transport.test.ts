import { describe, expect, it } from "vitest";
import { isNotebookUploadRequest, prepareNotebookUploadResult, restoreNotebookUploadTickets } from "../services/notebook-upload-transport.js";

const deploymentId = "44444444-4444-4444-8444-444444444444";
const url = "https://notebook-quarantine.s3.us-east-1.amazonaws.com/quarantine/report%20one.html?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAEXAMPLE%2F20261020%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261020T120000Z&X-Amz-Expires=900&X-Amz-Security-Token=session%2Btoken%2Fbytes%3D&X-Amz-SignedHeaders=host&X-Amz-Signature=0123456789abcdef";
const tool = { providerType: "mcp_remote_http", applicationKey: `app-gallery:paperclip-notebook:${deploymentId}`,
  connectionId: "notebook-connection", upstreamToolName: "notebook_begin_upload" };
function response(plan: Record<string, unknown> = { deploymentId, uploads: [{ path: "index.html", url, method: "PUT", headers: { "content-type": "text/html" } }] }) {
  const firstUrl = (plan.uploads as Array<{ url?: string }> | undefined)?.[0]?.url ?? "No upload ticket";
  return { content: `Upload plan: ${firstUrl}`, data: { isError: false,
    content: [{ type: "text", text: JSON.stringify(plan) }, { type: "text", text: `Second envelope: ${firstUrl}` }],
    structuredContent: plan } };
}

describe("Notebook upload transport", () => {
  it("keeps exact SigV4 URL bytes only in a bounded in-memory transfer", () => {
    const input = response();
    const prepared = prepareNotebookUploadResult(input, tool, {});
    expect(prepared.uploadTickets).toEqual({ deploymentId, uploads: [{ path: "index.html", url }] });
    expect(JSON.stringify(prepared.result)).not.toContain(url);
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
    expect(input.data.structuredContent.uploads).toEqual([{ path: "index.html", url, method: "PUT", headers: { "content-type": "text/html" } }]);
    const restored = restoreNotebookUploadTickets(prepared.result, prepared.uploadTickets!);
    expect(restored.data.structuredContent.uploads).toEqual(input.data.structuredContent.uploads);
    expect(restored.content).not.toContain(url);
    expect(restored.data.content.every(block => !block.text.includes(url))).toBe(true);
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
  });

  it("recognizes only the actual Notebook provider and upload requests", () => {
    expect(isNotebookUploadRequest(tool, {})).toBe(true);
    expect(isNotebookUploadRequest({ ...tool, applicationKey: "paperclip-notebook" }, {})).toBe(true);
    const operation = { ...tool, upstreamToolName: "notebook_get_operation" };
    expect(isNotebookUploadRequest(operation, { receipt: { kind: "begin_upload", idempotencyKey: "same-upload" } })).toBe(true);
    for (const parameters of [{}, { operationId: deploymentId }, { receipt: { kind: "create_page", idempotencyKey: "page" } },
      { receipt: { kind: "begin_upload" } }, { receipt: { kind: "begin_upload", idempotencyKey: " " } },
      { operationId: deploymentId, receipt: { kind: "begin_upload", idempotencyKey: "upload" } }]) {
      expect(isNotebookUploadRequest(operation, parameters)).toBe(false);
      const input = response();
      expect(prepareNotebookUploadResult(input, operation, parameters).result).toBe(input);
    }
    for (const descriptor of [{ ...tool, providerType: "mcp_http" }, { ...tool, applicationKey: "other-app" },
      { ...tool, connectionId: "" }, { ...tool, upstreamToolName: "notebook_get_page" }]) {
      const input = response();
      expect(prepareNotebookUploadResult(input, descriptor, {})).toEqual({ result: input });
      expect(prepareNotebookUploadResult(input, descriptor, {}).result).toBe(input);
    }
  });

  it("supports a complete receipt recovery and the 200-file limit", () => {
    const uploads = Array.from({ length: 200 }, (_, index) => ({ path: `assets/${index}.png`, url: `${url}&object=${index}` }));
    const prepared = prepareNotebookUploadResult(response({ deploymentId, uploads }), { ...tool, upstreamToolName: "notebook_get_operation" },
      { receipt: { kind: "begin_upload", idempotencyKey: "original-upload" } });
    expect(prepared.uploadTickets).toEqual({ deploymentId, uploads });
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
    expect(restoreNotebookUploadTickets(prepared.result, prepared.uploadTickets!).data.structuredContent.uploads).toEqual(uploads);
  });

  it("redacts all text envelopes, escaped JSON, and copies outside the canonical plan", () => {
    const otherUrl = "https://other.example.test/second?ticket=secret";
    const input = response();
    input.data.content.push({ type: "text", text: JSON.stringify({ uploads: [{ path: "other.html", url: otherUrl }] }).replaceAll("/", "\\/") });
    input.data.content.push({ type: "text", text: `Also ${otherUrl}` });
    input.data.structuredContent.preview = `${url} and ${otherUrl}`;
    const prepared = prepareNotebookUploadResult(input, tool, {});
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
    expect(JSON.stringify(prepared.result)).not.toContain("ticket=secret");
    expect(prepared.uploadTickets?.uploads).toEqual([{ path: "index.html", url }]);
    expect(prepared.result.data.content.map(block => block.text).join("\n")).toContain("REDACTED_NOTEBOOK_UPLOAD_URL");
  });

  it.each([
    { deploymentId: "not-a-uuid", uploads: [{ path: "index.html", url }] },
    { deploymentId, uploads: [{ path: "../index.html", url }] },
    { deploymentId, uploads: [{ path: "a//index.html", url }] },
    { deploymentId, uploads: [{ path: "/index.html", url }] },
    { deploymentId, uploads: [{ path: "__nb/index.html", url }] },
    { deploymentId, uploads: [{ path: "assets/%2e.html", url }] },
    { deploymentId, uploads: [{ path: "a".repeat(1001), url }] },
    { deploymentId, uploads: [{ path: "index.html", url }, { path: "index.html", url }] },
    { deploymentId, uploads: Array.from({ length: 201 }, (_, index) => ({ path: `${index}.html`, url })) },
    { deploymentId, uploads: [{ path: "index.html", url, headers: { authorization: 12 } }] },
    { deploymentId, uploads: [{ path: "index.html", url, method: "POST" }] },
  ])("redacts invalid plans without extracting a transfer (%#)", plan => {
    const prepared = prepareNotebookUploadResult(response(plan), tool, {});
    expect(prepared.uploadTickets).toBeUndefined();
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
    expect(JSON.stringify(prepared.result)).toContain("REDACTED_NOTEBOOK_UPLOAD_URL");
  });

  it.each(["http://example.test/file?secret=value", "https://user:password@example.test/file", "https://@example.test/file",
    "https://example.test/file#fragment", "https://example.test/file#", "https://example.test/\\file", "https://example.test/file\n"])("does not extract invalid URLs (%#)", invalidUrl => {
    const input = response({ deploymentId, uploads: [{ path: "index.html", url: invalidUrl }] });
    const prepared = prepareNotebookUploadResult(input, tool, {});
    expect(prepared.uploadTickets).toBeUndefined();
    expect((prepared.result.data.structuredContent.uploads as Array<{ url: string }>)[0]?.url).toBe("[REDACTED_NOTEBOOK_UPLOAD_URL]");
    expect(prepared.result.data.content[0]?.text).not.toContain(invalidUrl);
  });

  it("redacts errored and text-only upload plans without creating a transfer", () => {
    const error = response(); error.data.isError = true;
    expect(prepareNotebookUploadResult(error, tool, {}).uploadTickets).toBeUndefined();
    expect(JSON.stringify(prepareNotebookUploadResult(error, tool, {}).result)).not.toContain("X-Amz-");
    const textOnly = { content: url, data: { content: response().data.content } };
    const prepared = prepareNotebookUploadResult(textOnly, tool, {});
    expect(prepared.uploadTickets).toBeUndefined();
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
  });

  it("restores only URL leaves and preserves every other redaction", () => {
    const input = response({ deploymentId, secret: "unrelated-secret", uploads: [{ path: "index.html", url,
      headers: { authorization: "Bearer unrelated-secret", "x-other": url }, extra: "unrelated-secret" }] });
    const prepared = prepareNotebookUploadResult(input, tool, {});
    const redacted = JSON.parse(JSON.stringify(prepared.result).replaceAll("unrelated-secret", "[REDACTED]"));
    const restored = restoreNotebookUploadTickets(redacted, prepared.uploadTickets!);
    const plan = restored.data.structuredContent;
    expect(plan.uploads[0].url).toBe(url);
    expect(plan.secret).toBe("[REDACTED]");
    expect(plan.uploads[0].headers).toEqual({ authorization: "Bearer [REDACTED]", "x-other": "[REDACTED_NOTEBOOK_UPLOAD_URL]" });
    expect(plan.uploads[0].extra).toBe("[REDACTED]");
    expect(restored.content).not.toContain(url);
    expect(restored.data.content[0].text).not.toContain(url);
    expect(JSON.stringify(restored)).not.toContain("unrelated-secret");
  });

  it("refuses restoration when the deployment, ticket paths, count, URL markers, or transfer differ", () => {
    const prepared = prepareNotebookUploadResult(response(), tool, {});
    const variants = [
      { ...prepared.uploadTickets!, deploymentId: "55555555-5555-4555-8555-555555555555" },
      { ...prepared.uploadTickets!, uploads: [{ path: "other.html", url }] },
      { ...prepared.uploadTickets!, uploads: [] },
      { ...prepared.uploadTickets!, uploads: [{ path: "index.html", url: "http://example.test" }] },
    ];
    for (const tickets of variants) expect(restoreNotebookUploadTickets(prepared.result, tickets)).toBe(prepared.result);
    const wrongMarker = JSON.parse(JSON.stringify(prepared.result).replaceAll("[REDACTED_NOTEBOOK_UPLOAD_URL]", "changed"));
    expect(restoreNotebookUploadTickets(wrongMarker, prepared.uploadTickets!)).toBe(wrongMarker);
    expect(restoreNotebookUploadTickets(response(), prepared.uploadTickets!)).toEqual(response());
  });

  const limitError = { result: {
    content: "Notebook upload response exceeded transfer limits.", error: "Invalid Notebook upload response",
    data: { isError: true, content: [], structuredContent: null },
  } };

  it("fails closed on 201 unique upload URLs across all response envelopes", () => {
    const input = response();
    input.data.structuredContent.other = { nested: { uploads: Array.from({ length: 200 }, (_, index) => ({
      path: `outside-${index}.html`, url: `https://other.example.test/${index}?ticket=outside-secret`,
    })) } };
    expect(prepareNotebookUploadResult(input, tool, {})).toEqual(limitError);
    expect(JSON.stringify(prepareNotebookUploadResult(input, tool, {}))).not.toContain("outside-secret");
  });

  it("does not count duplicate URL occurrences against the unique-ticket limit", () => {
    const input = response();
    input.data.structuredContent.other = { uploads: Array.from({ length: 400 }, (_, index) => ({ path: `${index}.html`, url })) };
    const prepared = prepareNotebookUploadResult(input, tool, {});
    expect(prepared.uploadTickets?.uploads).toEqual([{ path: "index.html", url }]);
    expect(JSON.stringify(prepared.result)).not.toContain("X-Amz-");
  });

  it("fails closed on an oversized upload URL or text before parsing or redaction", () => {
    const longUrl = `https://example.test/file?ticket=${"x".repeat(8192)}`;
    expect(prepareNotebookUploadResult(response({ deploymentId, uploads: [{ path: "index.html", url: longUrl }] }), tool, {})).toEqual(limitError);
    const input = response();
    input.data.content.push({ type: "text", text: "x".repeat(2 * 1024 * 1024 + 1) });
    expect(prepareNotebookUploadResult(input, tool, {})).toEqual(limitError);
  });

  it("bounds object and parsed-JSON nesting and total traversal", () => {
    let nested: unknown = { hidden: url };
    for (let index = 0; index < 60; index++) nested = { child: nested };
    const deepObject = response(); deepObject.data.structuredContent.other = nested;
    expect(prepareNotebookUploadResult(deepObject, tool, {})).toEqual(limitError);
    const deepText = response(); deepText.data.content.push({ type: "text", text: JSON.stringify(nested) });
    expect(prepareNotebookUploadResult(deepText, tool, {})).toEqual(limitError);
    const manyNodes = response(); manyNodes.data.structuredContent.other = Array.from({ length: 20_001 }, () => null);
    expect(prepareNotebookUploadResult(manyNodes, tool, {})).toEqual(limitError);
  });
});
