"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const MAX_TEXT_MESSAGE_LENGTH = 4000;
const MAX_COMPOSER_HEIGHT = 128;

type MessageComposerProps = Readonly<{
  onContentChange?: (content: string) => void;
  onSend: (content: string) => boolean;
}>;

export function MessageComposer({
  onContentChange,
  onSend,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const trimmedContent = content.trim();
  const isTooLong = trimmedContent.length > MAX_TEXT_MESSAGE_LENGTH;
  const canSend = Boolean(trimmedContent) && !isTooLong;

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedContent) {
      setError("Enter a message before sending.");
      return;
    }

    if (isTooLong) {
      setError("Messages can contain up to 4,000 characters.");
      return;
    }

    if (!onSend(content)) {
      setError("Messages are still loading. Try again in a moment.");
      return;
    }

    setContent("");
    onContentChange?.("");
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
      className="chat-composer shrink-0 border-t border-border bg-surface px-5 pt-4 sm:px-8"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="message-content">
        Message
      </label>
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          aria-describedby={error ? "message-composer-error" : undefined}
          aria-label="Message"
          className="min-h-12 flex-1 resize-none rounded-full border border-border bg-input px-5 py-3 text-base leading-5 text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
          id="message-content"
          maxLength={MAX_TEXT_MESSAGE_LENGTH + 1}
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
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          disabled={!canSend}
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
