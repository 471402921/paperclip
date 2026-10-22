import type { IssueThreadInteraction } from "@paperclipai/shared";

export function chatInteractionPresentation(interaction: IssueThreadInteraction) {
  const context = [interaction.summary].filter((value): value is string => Boolean(value?.trim()));
  switch (interaction.kind) {
    case "ask_user_questions": {
      const { payload } = interaction;
      if (payload.questionSet?.description) context.push(payload.questionSet.description);
      for (const question of payload.questions) {
        const source = payload.questionSet?.questions.find(item => item.id === question.id);
        context.push(question.prompt);
        if (question.helpText) context.push(question.helpText);
        for (const option of question.options.filter(item => !item.freeText)) {
          const recommended = source?.options?.find(item => item.id === option.id)?.recommended;
          context.push(`- ${option.label}${recommended ? " (recommended)" : ""}${option.description ? `: ${option.description}` : ""}`);
        }
        if (source?.customAnswer || (question.allowOther && question.options.some(item => !item.freeText))) {
          context.push("You can also provide your own answer.");
        }
      }
      return {
        title: payload.title ?? interaction.title ?? "Input needed",
        body: [...new Set(context)].join("\n\n"),
      };
    }
    case "request_confirmation":
    case "request_checkbox_confirmation":
    case "request_item_verdicts": {
      const { payload } = interaction;
      context.push(payload.prompt);
      if (payload.detailsMarkdown) context.push(payload.detailsMarkdown);
      if (interaction.kind === "request_checkbox_confirmation") {
        for (const option of interaction.payload.options) {
          context.push(`- ${option.label}${option.description ? `: ${option.description}` : ""}`);
        }
      }
      if (interaction.kind === "request_item_verdicts") {
        for (const item of interaction.payload.items) {
          context.push(`- ${item.label}${item.description ? `: ${item.description}` : ""}`);
        }
      }
      return { title: payload.prompt, body: [...new Set(context)].join("\n\n") };
    }
    case "suggest_tasks": {
      for (const task of interaction.payload.tasks.filter(item => !item.hiddenInPreview)) {
        context.push(`- ${task.title}${task.description ? `: ${task.description}` : ""}`);
      }
      return { title: interaction.title ?? "Review suggested tasks", body: context.join("\n\n") };
    }
    case "connection_intent": {
      const { payload } = interaction;
      context.push(`${payload.requestingAgentName} needs ${payload.serviceName}${payload.accessRequest ? ` (${payload.accessRequest.connectionName})` : ""}.`);
      context.push("The addressed user must review this connection request in Paperclip.");
      return { title: interaction.title ?? `Connect ${payload.serviceName}`, body: context.join("\n\n") };
    }
  }
}
