import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { IssueQueuedCommentQueue } from "@paperclipai/shared";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { TaskChatQueuedMessages } from "@/components/task-chat/TaskChatQueuedMessages";
const initialQueue: IssueQueuedCommentQueue = {
  issueId: "task-gap",
  queueId: "response-gap",
  state: "deferred",
  targetRunId: "run-gap",
  revision: "rev-1",
  protocol: "paperclip_runner_v1",
  steeringDisposition: "available",
  entries: [
    {
      position: 0,
      canEdit: false,
      canDiscard: false,
      source: {
        kind: "interaction",
        interactionId: "approval-gap",
        interactionKind: "request_confirmation",
        requiresFreshSession: true,
      },
      comment: {
        id: "response-comment",
        companyId: "company-storybook",
        issueId: "task-gap",
        authorType: "user",
        authorAgentId: null,
        authorUserId: "user-storybook",
        body: "Accepted: Review the migration\n\nApproved revision v2.",
        presentation: null,
        metadata: null,
        createdAt: new Date("2026-10-12T12:00:00Z"),
        updatedAt: new Date("2026-10-12T12:00:00Z"),
      },
    },
  ],
};
function ResponseQueue({
  state = "ready",
}: {
  state?: "ready" | "empty" | "waiting" | "failure" | "saving" | "blocked";
}) {
  const [queue, setQueue] = useState<IssueQueuedCommentQueue>({
    ...initialQueue,
    queueId: state === "blocked" ? null : initialQueue.queueId,
    entries: state === "empty" ? [] : initialQueue.entries,
    executionWait:
      state === "waiting"
        ? {
            reason: "remote_cleanup",
            message:
              "Waiting for the previous environment to stop. Your message will start automatically.",
          }
        : undefined,
  });
  const deliver = async () => {
    if (state === "failure")
      throw new Error("The response could not be delivered.");
    if (state === "saving") return new Promise<void>(() => {});
    setQueue((current) => ({
      ...current,
      entries: [],
      executionWait: undefined,
      revision: "rev-2",
    }));
  };
  return (
    <TaskChatQueuedMessages
      queue={queue}
      onEdit={() => {
        throw new Error("Accepted responses cannot be edited.");
      }}
      onReorder={async () => {
        throw new Error("Accepted responses cannot be reordered.");
      }}
      onSteer={deliver}
      onInterrupt={deliver}
      onDiscard={async () => {
        throw new Error("Accepted responses cannot be discarded.");
      }}
    />
  );
}
const meta = {
  id: "feature-durable-response-queue",
  title:
    "Tasks and conversations/Steering and queued messages/Accepted response delivery",
  component: ResponseQueue,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Production queue with an immutable accepted response and remote-cleanup wait. Delivery uses local state; it does not prove persisted queues or runtime continuation.",
      },
    },
  },
} satisfies Meta<typeof ResponseQueue>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AcceptedResponse: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText("Accepted: Review the migration");
    await expect(
      c.getByRole("button", { name: /Reorder queued message/ }),
    ).toBeDisabled();
  },
};
export const WaitingForCleanup: Story = {
  args: { state: "waiting" },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(
      "Waiting for the previous environment to stop. Your message will start automatically.",
    );
  },
};
export const AdmissionUnavailable: Story = {
  args: { state: "blocked" },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("button", { name: "Interrupt" }),
    ).toBeDisabled();
  },
};
export const Empty: Story = { args: { state: "empty" } };
export const DeliveryFailed: Story = {
  args: { state: "failure" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("button", { name: "Interrupt" }));
    await waitFor(() =>
      expect(c.getByText("Accepted: Review the migration")).toBeInTheDocument(),
    );
    await c.findByText("Couldn’t interrupt. Message is still queued.");
  },
};
export const Delivering: Story = {
  args: { state: "saving" },
  parameters: {
    docs: {
      description: {
        story:
          "The shipped queue removes accepted responses optimistically while delivery remains pending; it has no separate visible progress indicator.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", { name: "Interrupt" }),
    );
    await waitFor(() =>
      expect(
        within(canvasElement).queryByTestId("task-chat-queued-messages"),
      ).not.toBeInTheDocument(),
    );
    await expect(canvasElement).toBeEmptyDOMElement();
  },
};
export const Delivered: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("button", { name: "Interrupt" }));
    await waitFor(() =>
      expect(
        c.queryByText("Accepted: Review the migration"),
      ).not.toBeInTheDocument(),
    );
  },
};
