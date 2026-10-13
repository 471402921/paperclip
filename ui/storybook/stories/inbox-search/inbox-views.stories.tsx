import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Inbox } from "@/pages/Inbox";
import { instanceExperimentalSettingsSchema } from "@paperclipai/shared";
import { storybookIssues } from "../../fixtures/paperclipData";
import {
  prepareFixtureApi,
  type FixtureState,
} from "../../support/capability-gaps/api";
function InboxHost(props: NonNullable<ComponentProps<typeof Inbox>>) {
  return <Inbox {...props} />;
}
const meta = {
  id: "feature-inbox-views",
  title:
    "Tasks and conversations/Inbox, decisions, and search/Personal task views",
  component: InboxHost,
  args: { tab: "mine" },
  parameters: { layout: "padded" },
  beforeEach: ({ parameters }) => {
    const api = prepareFixtureApi(
      [
        {
          path: "/api/companies/company-storybook/issues",
          read: () =>
            parameters.fixtureState === "empty" ? [] : storybookIssues,
        },
        {
          path: /^\/api\/companies\/company-storybook\/(approvals|join-requests|heartbeat-runs)$/,
          read: () => [],
        },
      ],
      parameters.fixtureState as FixtureState,
    );
    const flags = prepareFixtureApi([
      {
        path: "/api/instance/settings/experimental",
        read: () => ({
          ...instanceExperimentalSettingsSchema.parse({}),
          enableStreamlinedUi: true,
          enableCombinedInboxTasks: true,
        }),
      },
    ]);
    return () => {
      flags.cleanup();
      api.cleanup();
    };
  },
} satisfies Meta<typeof InboxHost>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Mine: Story = { args: { tab: "mine" } };
export const Recent: Story = { args: { tab: "recent" } };
export const Unread: Story = { args: { tab: "unread" } };
export const Blocked: Story = { args: { tab: "blocked" } };
export const Empty: Story = {
  args: { tab: "mine" },
  parameters: { fixtureState: "empty" },
};
export const Loading: Story = { parameters: { fixtureState: "loading" } };
export const Failed: Story = { parameters: { fixtureState: "failure" } };
export const PermissionDenied: Story = {
  parameters: { fixtureState: "permission" },
};
