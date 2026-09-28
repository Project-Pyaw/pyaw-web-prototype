import type { MessageReaction } from "../types";

type MessageReactionsUpdatedEvent = Readonly<{
  accountId: string;
  active: boolean;
  conversationId: string;
  messageId: string;
  reaction: MessageReaction;
  reactionVersion: number;
  reactions: readonly Readonly<{
    count: number;
    reaction: MessageReaction;
  }>[];
}>;

const supportedReactions = new Set<MessageReaction>([
  "THUMBS_UP",
  "HEART",
  "FACE_WITH_TEARS_OF_JOY",
  "OPEN_MOUTH",
  "CRY",
  "ANGRY",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isMessageReaction(value: unknown): value is MessageReaction {
  return (
    typeof value === "string" &&
    supportedReactions.has(value as MessageReaction)
  );
}

export function mapMessageReactionsUpdatedEvent(
  payload: unknown,
): MessageReactionsUpdatedEvent | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data)
  ) {
    return null;
  }

  const data = payload.data;

  if (
    typeof data.accountId !== "string" ||
    typeof data.active !== "boolean" ||
    typeof data.conversationId !== "string" ||
    typeof data.messageId !== "string" ||
    !isMessageReaction(data.reaction) ||
    typeof data.reactionVersion !== "number" ||
    !Number.isSafeInteger(data.reactionVersion) ||
    data.reactionVersion < 0 ||
    !Array.isArray(data.reactions)
  ) {
    return null;
  }

  const reactions: Array<{
    count: number;
    reaction: MessageReaction;
  }> = [];
  const seenReactions = new Set<MessageReaction>();

  for (const summary of data.reactions) {
    if (
      !isRecord(summary) ||
      !isMessageReaction(summary.reaction) ||
      typeof summary.count !== "number" ||
      !Number.isSafeInteger(summary.count) ||
      summary.count <= 0 ||
      seenReactions.has(summary.reaction)
    ) {
      return null;
    }

    seenReactions.add(summary.reaction);
    reactions.push({ reaction: summary.reaction, count: summary.count });
  }

  return {
    accountId: data.accountId,
    active: data.active,
    conversationId: data.conversationId,
    messageId: data.messageId,
    reaction: data.reaction,
    reactionVersion: data.reactionVersion,
    reactions,
  };
}
