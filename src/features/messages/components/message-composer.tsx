"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { formatFileSize } from "@/lib/format/file-size";

import { MessageReplyPreview } from "./message-reply-preview";
import type {
  SelectedComposerImage,
  SendMessageResult,
} from "../hooks/use-send-message";
import type { ReplyMessagePreview } from "../types";

const MAX_TEXT_MESSAGE_LENGTH = 4000;
const MAX_COMPOSER_HEIGHT = 128;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type MessageComposerProps = Readonly<{
  onContentChange?: (content: string) => void;
  onSend: (
    content: string,
    image?: SelectedComposerImage,
    replyTo?: ReplyMessagePreview | null,
  ) => Promise<SendMessageResult>;
  onCancelReply: () => void;
  replyTo: ReplyMessagePreview | null;
}>;

export function MessageComposer({
  onContentChange,
  onCancelReply,
  onSend,
  replyTo,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedImageRef = useRef<SelectedComposerImage | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<SelectedComposerImage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const trimmedContent = content.trim();
  const isTooLong = trimmedContent.length > MAX_TEXT_MESSAGE_LENGTH;
  const canSend =
    (Boolean(trimmedContent) || Boolean(selectedImage)) && !isTooLong;

  useEffect(
    () => () => {
      if (selectedImageRef.current) {
        URL.revokeObjectURL(selectedImageRef.current.previewUrl);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      MAX_COMPOSER_HEIGHT,
    )}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
  }, [content]);

  function removeSelectedImage(revokePreview = true) {
    const image = selectedImageRef.current;

    if (image && revokePreview) {
      URL.revokeObjectURL(image.previewUrl);
    }

    selectedImageRef.current = null;
    setSelectedImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      setError("Choose a GIF, JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Images can be up to 10 MiB.");
      event.target.value = "";
      return;
    }

    removeSelectedImage();
    const image = {
      file,
      previewUrl: URL.createObjectURL(file),
    };

    selectedImageRef.current = image;
    setSelectedImage(image);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedContent && !selectedImage) {
      setError("Enter a message or choose an image.");
      return;
    }

    if (isTooLong) {
      setError("Messages can contain up to 4,000 characters.");
      return;
    }

    if (isSending) {
      return;
    }

    setIsSending(true);
    const result = await onSend(content, selectedImage ?? undefined, replyTo);
    setIsSending(false);

    if (!result.accepted) {
      setError(result.error);
      return;
    }

    setContent("");
    onContentChange?.("");
    removeSelectedImage(false);
    onCancelReply();
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      className="chat-composer shrink-0 border-t border-border bg-surface px-4 pt-3 sm:px-8"
      onSubmit={handleSubmit}
    >
      {replyTo ? (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-2">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-foreground-muted">
              Replying to
            </p>
            <MessageReplyPreview replyTo={replyTo} />
          </div>
          <button
            aria-label="Cancel reply"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSending}
            onClick={onCancelReply}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m7 7 10 10M17 7 7 17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      ) : null}
      {selectedImage ? (
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-2">
          {/* The object URL exists only for this unsent local preview. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Selected image: ${selectedImage.file.name}`}
            className="h-20 w-20 rounded-lg object-cover"
            src={selectedImage.previewUrl}
          />
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedImage.file.name}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              {formatFileSize(selectedImage.file.size)}
            </p>
          </div>
          <button
            aria-label="Remove selected image"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSending}
            onClick={() => removeSelectedImage()}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m7 7 10 10M17 7 7 17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      ) : null}
      <label className="sr-only" htmlFor="message-content">
        Message
      </label>
      <div className="flex items-end gap-2.5">
        <input
          ref={imageInputRef}
          accept="image/gif,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={isSending}
          id="message-image"
          onChange={handleImageSelection}
          type="file"
        />
        <button
          aria-label="Choose image"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 sm:size-12"
          disabled={isSending}
          onClick={() => imageInputRef.current?.click()}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m7 12 3-3 4 4 2-2 3 3M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <circle cx="9" cy="9" fill="currentColor" r="1" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          aria-describedby={error ? "message-composer-error" : undefined}
          aria-label="Message"
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-input px-4 py-3 text-base leading-5 text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20 sm:min-h-12 sm:rounded-full sm:px-5"
          id="message-content"
          maxLength={MAX_TEXT_MESSAGE_LENGTH + 1}
          disabled={isSending}
          onChange={(event) => {
            const nextContent = event.target.value;

            setContent(nextContent);
            onContentChange?.(nextContent);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          value={content}
        />
        <button
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:size-12"
          disabled={!canSend || isSending}
          type="submit"
        >
          <svg
            aria-hidden="true"
            className="size-5 translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m4 4 16 8-16 8 3.5-8L4 4Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
      {isSending ? (
        <p className="mt-2 text-sm text-foreground-muted" role="status">
          {selectedImage ? "Uploading image…" : "Sending message…"}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-2 text-sm text-danger"
          id="message-composer-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
