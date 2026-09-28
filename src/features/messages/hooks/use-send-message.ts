"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";

import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";

import { sendMessage } from "../api/send-message";
import {
  completeImageUpload,
  createImageUpload,
  uploadImageBytes,
} from "../api/uploads-api";
import {
  mergePersistedMessage,
  updateOptimisticMessage,
} from "../message-cache";
import type {
  MessageAttachment,
  MessageHistoryPage,
  OptimisticMessage,
  ReplyMessagePreview,
} from "../types";
import { messageHistoryQueryKey } from "./use-message-history";

const MAX_TEXT_MESSAGE_LENGTH = 4000;

type SendMessageVariables = Readonly<{
  clientMessageId: string;
  content?: string;
  conversationId: string;
  attachmentIds?: readonly string[];
  replyToMessageId?: string;
}>;

export type SelectedComposerImage = Readonly<{
  file: File;
  previewUrl: string;
}>;

export type SendMessageResult =
  Readonly<{ accepted: true }> | Readonly<{ accepted: false; error: string }>;

function createClientMessageId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [...bytes]
    .map((byte, index) => {
      const separator = [4, 6, 8, 10].includes(index) ? "-" : "";

      return `${separator}${byte.toString(16).padStart(2, "0")}`;
    })
    .join("");
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const inFlightClientMessageIds = useRef(new Set<string>());
  const queryKey = messageHistoryQueryKey(conversationId);
  const mutation = useMutation({
    mutationFn: ({
      clientMessageId,
      content,
      conversationId: targetId,
      attachmentIds,
      replyToMessageId,
    }: SendMessageVariables) =>
      sendMessage(targetId, {
        clientMessageId,
        ...(content ? { content } : {}),
        ...(attachmentIds && attachmentIds.length > 0 ? { attachmentIds } : {}),
        ...(replyToMessageId ? { replyToMessageId } : {}),
      }),
    onError: (_error, variables) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(variables.conversationId),
        (data) =>
          updateOptimisticMessage(
            data,
            variables.clientMessageId,
            (message) => ({
              ...message,
              deliveryState: "failed",
            }),
          ),
      );
    },
    onSuccess: (message, variables) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(variables.conversationId),
        (data) => mergePersistedMessage(data, message),
      );
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });

  function submit(variables: SendMessageVariables): boolean {
    if (inFlightClientMessageIds.current.has(variables.clientMessageId)) {
      return false;
    }

    inFlightClientMessageIds.current.add(variables.clientMessageId);
    mutation.mutate(variables, {
      onSettled: () => {
        inFlightClientMessageIds.current.delete(variables.clientMessageId);
      },
    });

    return true;
  }

  function addOptimisticMessage(
    clientMessageId: string,
    content: string | undefined,
    attachments: readonly MessageAttachment[],
    localImagePreviewUrl: string | undefined,
    replyTo: ReplyMessagePreview | null,
  ): boolean {
    if (!queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)) {
      return false;
    }

    const optimisticMessage: OptimisticMessage = {
      clientMessageId,
      content: content ?? "",
      conversationId,
      createdAt: new Date().toISOString(),
      deliveryState: "sending",
      type: "TEXT",
      attachments,
      replyTo,
      ...(localImagePreviewUrl ? { localImagePreviewUrl } : {}),
    };

    queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
      queryKey,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) =>
                index === 0
                  ? { ...page, items: [optimisticMessage, ...page.items] }
                  : page,
              ),
            }
          : data,
    );

    return true;
  }

  function sendPersistedMessage(
    clientMessageId: string,
    content: string | undefined,
    attachments: readonly MessageAttachment[],
    localImagePreviewUrl: string | undefined,
    replyTo: ReplyMessagePreview | null,
  ): boolean {
    if (
      !addOptimisticMessage(
        clientMessageId,
        content,
        attachments,
        localImagePreviewUrl,
        replyTo,
      )
    ) {
      return false;
    }

    return submit({
      clientMessageId,
      ...(content ? { content } : {}),
      conversationId,
      ...(attachments.length > 0
        ? { attachmentIds: attachments.map((attachment) => attachment.id) }
        : {}),
      ...(replyTo ? { replyToMessageId: replyTo.messageId } : {}),
    });
  }

  async function send(
    content: string,
    image?: SelectedComposerImage,
    replyTo: ReplyMessagePreview | null = null,
  ): Promise<SendMessageResult> {
    const normalizedContent = content.trim();

    if (
      normalizedContent.length > MAX_TEXT_MESSAGE_LENGTH ||
      !queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
    ) {
      return {
        accepted: false,
        error: "Messages are still loading. Try again in a moment.",
      };
    }

    if (!normalizedContent && !image) {
      return { accepted: false, error: "Enter a message or choose an image." };
    }

    if (replyTo?.deleted) {
      return {
        accepted: false,
        error:
          "The original message was deleted. Cancel the reply to continue.",
      };
    }

    const clientMessageId = createClientMessageId();

    if (!image) {
      return sendPersistedMessage(
        clientMessageId,
        normalizedContent,
        [],
        undefined,
        replyTo,
      )
        ? { accepted: true }
        : {
            accepted: false,
            error: "Unable to start sending this message. Try again.",
          };
    }

    let createdUpload: Awaited<ReturnType<typeof createImageUpload>>;

    try {
      createdUpload = await createImageUpload({
        type: "IMAGE",
        purpose: "MESSAGE",
        originalName: image.file.name,
        mimeType: image.file.type,
        sizeBytes: image.file.size,
      });
    } catch {
      return {
        accepted: false,
        error: "Could not start the image upload. Please try again.",
      };
    }

    try {
      await uploadImageBytes(image.file, createdUpload.upload);
    } catch {
      return {
        accepted: false,
        error: "Image upload failed. Check your connection and try again.",
      };
    }

    let attachment: Awaited<ReturnType<typeof completeImageUpload>>;

    try {
      attachment = await completeImageUpload(createdUpload.attachment.id);
    } catch {
      return {
        accepted: false,
        error: "Image processing failed. Please try again.",
      };
    }

    if (attachment.status !== "READY") {
      return {
        accepted: false,
        error: "The image could not be prepared. Please try again.",
      };
    }

    return sendPersistedMessage(
      clientMessageId,
      normalizedContent || undefined,
      [attachment],
      image.previewUrl,
      replyTo,
    )
      ? { accepted: true }
      : {
          accepted: false,
          error: "Unable to start sending this image. Try again.",
        };
  }

  function retry(message: OptimisticMessage): boolean {
    if (
      message.deliveryState !== "failed" ||
      message.conversationId !== conversationId ||
      inFlightClientMessageIds.current.has(message.clientMessageId)
    ) {
      return false;
    }

    queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
      queryKey,
      (data) =>
        updateOptimisticMessage(
          data,
          message.clientMessageId,
          (currentMessage) => ({
            ...currentMessage,
            deliveryState: "sending",
          }),
        ),
    );

    return submit({
      clientMessageId: message.clientMessageId,
      ...(message.content ? { content: message.content } : {}),
      conversationId,
      ...(message.attachments.length > 0
        ? {
            attachmentIds: message.attachments.map(
              (attachment) => attachment.id,
            ),
          }
        : {}),
      ...(message.replyTo
        ? { replyToMessageId: message.replyTo.messageId }
        : {}),
    });
  }

  return { retry, send };
}
