import type { MessageHistoryItem } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
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

  if (
    typeof data.id !== "string" ||
    typeof data.conversationId !== "string" ||
    !isNullableString(data.clientMessageId) ||
    typeof data.type !== "string" ||
    !isNullableString(data.content) ||
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
    createdAt: data.createdAt,
    sender: {
      accountId: sender.accountId,
      username: sender.username,
      profile: mappedProfile,
    },
  };
}
