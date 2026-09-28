import type {
  MessageAttachment,
  MessageHistoryItem,
  MessageReaction,
  MessageReactionSummary,
  ReplyMessagePreview,
} from "../types";

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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isMessageReaction(value: unknown): value is MessageReaction {
  return (
    typeof value === "string" &&
    supportedReactions.has(value as MessageReaction)
  );
}

function mapReactions(
  value: unknown,
): readonly MessageReactionSummary[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const reactions: MessageReactionSummary[] = [];
  const seenReactions = new Set<MessageReaction>();

  for (const summary of value) {
    if (
      !isRecord(summary) ||
      !isMessageReaction(summary.reaction) ||
      typeof summary.count !== "number" ||
      !Number.isSafeInteger(summary.count) ||
      summary.count <= 0 ||
      typeof summary.reactedByMe !== "boolean" ||
      seenReactions.has(summary.reaction)
    ) {
      return null;
    }

    seenReactions.add(summary.reaction);
    reactions.push({
      reaction: summary.reaction,
      count: summary.count,
      reactedByMe: summary.reactedByMe,
    });
  }

  return reactions;
}

function mapAttachments(value: unknown): readonly MessageAttachment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const attachments: MessageAttachment[] = [];

  for (const attachment of value) {
    if (
      !isRecord(attachment) ||
      typeof attachment.id !== "string" ||
      (attachment.kind !== "IMAGE" && attachment.kind !== "FILE") ||
      typeof attachment.originalName !== "string" ||
      typeof attachment.mimeType !== "string" ||
      typeof attachment.sizeBytes !== "number" ||
      !Number.isSafeInteger(attachment.sizeBytes) ||
      (attachment.status !== "PENDING" &&
        attachment.status !== "READY" &&
        attachment.status !== "ARCHIVED") ||
      typeof attachment.createdAt !== "string" ||
      typeof attachment.updatedAt !== "string"
    ) {
      return null;
    }

    attachments.push({
      id: attachment.id,
      kind: attachment.kind,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      status: attachment.status,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    });
  }

  return attachments;
}

function mapReplyTo(value: unknown): ReplyMessagePreview | null | undefined {
  if (value === null) {
    return null;
  }

  if (!isRecord(value) || !isRecord(value.sender)) {
    return undefined;
  }

  const { sender } = value;
  const profile = sender.profile;

  if (
    typeof value.messageId !== "string" ||
    typeof value.type !== "string" ||
    !isNullableString(value.content) ||
    typeof value.hasAttachments !== "boolean" ||
    typeof value.deleted !== "boolean" ||
    typeof sender.accountId !== "string" ||
    !isNullableString(sender.username)
  ) {
    return undefined;
  }

  let mappedProfile: ReplyMessagePreview["sender"]["profile"];

  if (profile === null) {
    mappedProfile = null;
  } else {
    if (
      !isRecord(profile) ||
      typeof profile.id !== "string" ||
      !isNullableString(profile.displayName)
    ) {
      return undefined;
    }

    mappedProfile = {
      id: profile.id,
      displayName: profile.displayName,
    };
  }

  return {
    messageId: value.messageId,
    type: value.type,
    sender: {
      accountId: sender.accountId,
      username: sender.username,
      profile: mappedProfile,
    },
    content: value.content,
    hasAttachments: value.hasAttachments,
    deleted: value.deleted,
  };
}

export function mapMessageNewEvent(
  payload: unknown,
): MessageHistoryItem | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data)
  ) {
    return null;
  }

  const data = payload.data;
  const sender = data.sender;
  const attachments = mapAttachments(data.attachments);
  const reactions = mapReactions(data.reactions);
  const replyTo = mapReplyTo(data.replyTo);

  if (
    typeof data.id !== "string" ||
    typeof data.conversationId !== "string" ||
    !isNullableString(data.clientMessageId) ||
    typeof data.type !== "string" ||
    !isNullableString(data.content) ||
    !isNullableString(data.editedAt) ||
    !isNullableString(data.deletedAt) ||
    attachments === null ||
    reactions === null ||
    replyTo === undefined ||
    typeof data.reactionVersion !== "number" ||
    !Number.isSafeInteger(data.reactionVersion) ||
    data.reactionVersion < 0 ||
    typeof data.createdAt !== "string" ||
    Number.isNaN(Date.parse(data.createdAt)) ||
    !isRecord(sender) ||
    typeof sender.accountId !== "string" ||
    !isNullableString(sender.username)
  ) {
    return null;
  }

  const profile = sender.profile;

  let mappedProfile: MessageHistoryItem["sender"]["profile"];

  if (profile === null) {
    mappedProfile = null;
  } else {
    if (
      !isRecord(profile) ||
      typeof profile.id !== "string" ||
      !isNullableString(profile.displayName)
    ) {
      return null;
    }

    mappedProfile = {
      id: profile.id,
      displayName: profile.displayName,
    };
  }

  return {
    id: data.id,
    clientMessageId: data.clientMessageId,
    conversationId: data.conversationId,
    type: data.type,
    content: data.content,
    editedAt: data.editedAt,
    deletedAt: data.deletedAt,
    createdAt: data.createdAt,
    attachments,
    reactions,
    reactionVersion: data.reactionVersion,
    replyTo,
    sender: {
      accountId: sender.accountId,
      username: sender.username,
      profile: mappedProfile,
    },
  };
}
