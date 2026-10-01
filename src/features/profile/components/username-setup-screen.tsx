"use client";

import { type FormEvent, useRef, useState } from "react";

import { ApiError } from "@/lib/api/api-error";

import { useUpdateCurrentProfile } from "../hooks/use-update-current-profile";
import { useUpdateUsername } from "../hooks/use-update-username";

const MAX_DISPLAY_NAME_LENGTH = 100;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

const errorMessages: Record<string, string> = {
  NETWORK_ERROR: "Unable to reach the service. Please try again.",
  USERNAME_INVALID:
    "Use 3–30 characters, starting with a letter. Only letters, numbers, and underscores are allowed.",
  USERNAME_UNAVAILABLE: "That username is unavailable. Try another one.",
};

function getUsernameErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return (
      errorMessages[error.code] ?? "Something went wrong. Please try again."
    );
  }

  return "Something went wrong. Please try again.";
}

function getDisplayNameErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return errorMessages.NETWORK_ERROR;
    }

    if (error.code === "PROFILE_UPDATE_CONFLICT") {
      return "Your display name could not be saved. Please try again.";
    }
  }

  return "Your display name could not be saved. Please try again.";
}

type UsernameSetupScreenProps = Readonly<{
  currentDisplayName: string | null;
  currentUsername: string | null;
  needsDisplayName: boolean;
  needsUsername: boolean;
}>;

export function UsernameSetupScreen({
  currentDisplayName,
  currentUsername,
  needsDisplayName,
  needsUsername,
}: UsernameSetupScreenProps) {
  const updateCurrentProfile = useUpdateCurrentProfile();
  const updateUsername = useUpdateUsername();
  const isSubmittingRef = useRef(false);
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [username, setUsername] = useState(currentUsername ?? "");
  const [displayNameError, setDisplayNameError] = useState<
    string | undefined
  >();
  const [usernameError, setUsernameError] = useState<string | undefined>();

  const normalizedDisplayName = displayName.trim();
  const canonicalUsername = username.trim().toLowerCase();
  const isValidDisplayName =
    normalizedDisplayName.length > 0 &&
    normalizedDisplayName.length <= MAX_DISPLAY_NAME_LENGTH;
  const isValidUsername = USERNAME_PATTERN.test(canonicalUsername);
  const isPending = updateCurrentProfile.isPending || updateUsername.isPending;
  const shouldUpdateDisplayName =
    needsDisplayName || normalizedDisplayName !== currentDisplayName?.trim();
  const shouldUpdateUsername =
    needsUsername || canonicalUsername !== currentUsername;

  const title = needsDisplayName
    ? needsUsername
      ? "Complete your profile"
      : "Add your display name"
    : "Choose your username";
  const description = needsDisplayName
    ? "Add the information people will see when they find you on Pyaw."
    : "This is how people will find you on Pyaw.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidDisplayName) {
      setDisplayNameError("Enter a display name between 1 and 100 characters.");
      return;
    }

    if (!isValidUsername) {
      setUsernameError(errorMessages.USERNAME_INVALID);
      return;
    }

    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setDisplayNameError(undefined);
    setUsernameError(undefined);

    try {
      if (shouldUpdateDisplayName) {
        try {
          await updateCurrentProfile.mutateAsync({
            displayName: normalizedDisplayName,
          });
        } catch (submitError) {
          setDisplayNameError(getDisplayNameErrorMessage(submitError));
          return;
        }
      }

      if (shouldUpdateUsername) {
        try {
          await updateUsername.mutateAsync(canonicalUsername);
        } catch (submitError) {
          setUsernameError(getUsernameErrorMessage(submitError));
        }
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-6 rounded-xl border border-border bg-surface p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Pyaw</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="display-name"
              >
                Display Name
              </label>
              <input
                aria-describedby={
                  displayNameError ? "display-name-error" : "display-name-help"
                }
                aria-invalid={Boolean(displayNameError)}
                autoComplete="name"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
                disabled={isPending}
                id="display-name"
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setDisplayNameError(undefined);
                }}
                placeholder="Your name"
                required
                type="text"
                value={displayName}
              />
              <p
                className="text-sm leading-5 text-foreground-muted"
                id="display-name-help"
              >
                1–100 characters.
              </p>
              {displayNameError ? (
                <p
                  className="text-sm text-danger"
                  id="display-name-error"
                  role="alert"
                >
                  {displayNameError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="username"
              >
                Username
              </label>
              <div className="flex items-center rounded-lg border border-border bg-input px-3 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20">
                <span aria-hidden="true" className="text-foreground-muted">
                  @
                </span>
                <input
                  aria-describedby={
                    usernameError
                      ? "username-error"
                      : "username-help username-canonical"
                  }
                  aria-invalid={Boolean(usernameError)}
                  autoCapitalize="none"
                  autoComplete="username"
                  className="min-w-0 flex-1 bg-transparent py-2.5 pl-1 text-foreground outline-none"
                  disabled={isPending}
                  id="username"
                  maxLength={30}
                  onChange={(event) => {
                    setUsername(event.target.value.toLowerCase());
                    setUsernameError(undefined);
                  }}
                  placeholder="aye_aye"
                  required
                  spellCheck={false}
                  type="text"
                  value={username}
                />
              </div>
              <p
                className="text-sm leading-5 text-foreground-muted"
                id="username-help"
              >
                3–30 characters. Start with a letter; use letters, numbers, or
                underscores.
              </p>
              <p
                className="text-sm leading-5 text-foreground-muted"
                id="username-canonical"
              >
                Your username is saved in lowercase
                {canonicalUsername ? ` as @${canonicalUsername}` : "."}
              </p>
              {usernameError ? (
                <p
                  className="text-sm text-danger"
                  id="username-error"
                  role="alert"
                >
                  {usernameError}
                </p>
              ) : null}
            </div>
          </div>

          <button
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
