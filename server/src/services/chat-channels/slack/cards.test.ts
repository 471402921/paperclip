import { describe, expect, it } from "vitest";
import { cardToBlockKit } from "@chat-adapter/slack";
import { projectSafeChatPublication } from "../../chat-publication-projection.js";
import { slackPublicationCard } from "./cards.js";

describe("Slack interaction card wire payloads", () => {
  it.each([120, 32000, 100000])("renders a %i-character request within Slack limits", length => {
    const payload = projectSafeChatPublication({
      classification: "external", source: "issue_interaction", text: "Read this request in Paperclip",
      interaction: { id: "interaction-1", card: {
        kind: "question", title: "😀".repeat(160), body: "Q".repeat(length),
        actions: [{ type: "link", label: "😀".repeat(80), url: "https://paperclip.example/issues/task-1" }],
      } },
    });
    const blocks = cardToBlockKit(slackPublicationCard(payload)!) as Array<{
      type: string;
      text?: { text: string };
      elements?: Array<{ text: { text: string } }>;
    }>;
    expect(blocks.length).toBeLessThanOrEqual(50);
    expect(blocks[0]).toMatchObject({ type: "header", text: { text: "😀".repeat(150) } });
    for (const block of blocks) {
      if (block.type === "section") expect(Array.from(block.text!.text).length).toBeLessThanOrEqual(3000);
      if (block.type === "actions") expect(block.elements![0]).toMatchObject({ text: { text: "😀".repeat(75) } });
    }
    const wire = JSON.stringify(blocks);
    if (length > 32000) expect(wire).toContain("too long for Slack");
    else expect(blocks.filter(block => block.type === "section").map(block => block.text!.text).join("")).toBe("Q".repeat(length));
    expect(wire).toContain("https://paperclip.example/issues/task-1");
  });
});
