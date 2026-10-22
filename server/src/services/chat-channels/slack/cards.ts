import type { SafeChatPublicationPayload } from "@paperclipai/shared";
import { Actions, Button, Card, CardText, LinkButton, type CardElement } from "chat";
import { isChatQuestionFormOpenActionId } from "../../chat-question-forms.js";

const MAX_CARD_BODY_LENGTH = 32_000;

export function slackInteractionRequiresBoard(body: string): boolean {
  return Array.from(body).length > MAX_CARD_BODY_LENGTH;
}

export function slackPublicationCard(payload: SafeChatPublicationPayload): CardElement | null {
  const card = payload.card;
  if (!card) return null;
  const children: CardElement["children"] = [];
  const body = Array.from(card.body ?? "");
  const visibleBody = body.slice(0, MAX_CARD_BODY_LENGTH);
  for (let offset = 0; offset < visibleBody.length; offset += 2000) {
    children.push(CardText(visibleBody.slice(offset, offset + 2000).join("")));
  }
  if (body.length > MAX_CARD_BODY_LENGTH) children.push(CardText("This request is too long for Slack. Open it in Paperclip to read the complete request and respond."));
  const actions = (card.actions ?? []).map(action => {
    const label = Array.from(action.label).slice(0, 75).join("");
    return action.type === "callback"
      ? Button({ id: action.actionId, label, style: action.style ?? "default", value: payload.interactionId, actionType: isChatQuestionFormOpenActionId(action.actionId) ? "modal" : undefined })
      : LinkButton({ label, url: action.url });
  });
  if (actions.length) children.push(Actions(actions));
  return Card({ title: Array.from(card.title).slice(0, 150).join(""), children });
}
