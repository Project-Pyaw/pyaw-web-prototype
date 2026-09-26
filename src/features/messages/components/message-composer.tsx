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
      className="chat-composer shrink-0 border-t border-border bg-surface px-3 pt-3 sm:px-4 md:px-6"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="message-content">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          aria-describedby={error ? "message-composer-error" : undefined}
          aria-label="Message"
          className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
          id="message-content"
          maxLength={MAX_TEXT_MESSAGE_LENGTH + 1}
          onChange={(event) => {
            const nextContent = event.target.value;

            setContent(nextContent);
            onContentChange?.(nextContent);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message"
          rows={1}
          value={content}
        />
        <button
          className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          disabled={!canSend}
          type="submit"
        >
          Send
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
