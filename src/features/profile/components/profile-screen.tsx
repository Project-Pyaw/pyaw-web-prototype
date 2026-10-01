"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AppHeader,
  type AppNavigationSection,
} from "@/components/layout/app-header";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/api-error";
import { bootstrapSession, logout } from "@/features/auth/session/session";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { stopMessagesSocket } from "@/lib/socket/messages-socket";

import { getProfileDisplayName, ProfileAvatar } from "./profile-avatar";
import {
  completeAvatarUpload,
  createAvatarUpload,
  uploadAvatarBytes,
} from "../api/avatar-api";
import type { UpdateCurrentProfileInput } from "../api/update-current-profile";
import {
  currentProfileQueryKey,
  useCurrentProfile,
} from "../hooks/use-current-profile";
import {
  useAccountPrivacy,
  useUpdateAccountPrivacy,
} from "../hooks/use-account-privacy";
import { useUpdateCurrentProfile } from "../hooks/use-update-current-profile";

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BIO_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 100;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PROFILE_UPDATE_CONFLICT") {
      return "Your profile changed elsewhere. Please review and try again.";
    }

    if (error.code === "PROFILE_UPDATE_EMPTY") {
      return "Update at least one profile field.";
    }
  }

  return "Unable to save your profile. Please try again.";
}

function ProfileWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  return <AppWorkspace className="flex flex-col">{children}</AppWorkspace>;
}

function ProfileHeader({
  avatar,
  identity,
  onNavigate,
  username,
}: Readonly<{
  avatar: string | null;
  identity: string;
  onNavigate: (section: AppNavigationSection) => void;
  username: string | null;
}>) {
  return (
    <AppHeader
      activeSection="profile"
      endContent={
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-foreground lg:block">
            {username ? `@${username}` : identity}
          </span>
          <ProfileAvatar name={identity} size="sm" url={avatar} />
        </div>
      }
      onBrandClick={() => onNavigate("chats")}
      onNavigate={onNavigate}
    />
  );
}

function ProfileNavigationItem({
  active = false,
  children,
  icon,
}: Readonly<{ active?: boolean; children: ReactNode; icon: ReactNode }>) {
  return (
    <div
      className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-medium ${
        active ? "bg-primary/15 text-primary" : "text-foreground-muted"
      }`}
    >
      <span aria-hidden="true" className="grid size-5 place-items-center">
        {icon}
      </span>
      {children}
      {active ? (
        <span
          aria-hidden="true"
          className="ml-auto size-1.5 rounded-full bg-primary"
        />
      ) : null}
    </div>
  );
}

function ProfileField({
  children,
  label,
}: Readonly<{ children: string; label: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </span>
      <input
        aria-readonly="true"
        className="h-12 w-full cursor-default rounded-2xl border border-border bg-surface-muted px-4 text-base text-foreground-muted outline-none"
        readOnly
        type="text"
        value={children}
      />
    </label>
  );
}

type PrivacySettingRowProps = Readonly<{
  checked: boolean;
  description: string;
  disabled: boolean;
  onChange: () => void;
  title: string;
}>;

function PrivacySettingRow({
  checked,
  description,
  disabled,
  onChange,
  title,
}: PrivacySettingRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary"
      >
        ♧
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>
      </div>
      <button
        aria-checked={checked}
        aria-label={`${title}: ${checked ? "visible" : "hidden"}`}
        className={`ml-auto inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "justify-end bg-primary" : "justify-start bg-border"
        }`}
        disabled={disabled}
        onClick={onChange}
        role="switch"
        type="button"
      >
        <span className="size-5 rounded-full bg-white" />
      </button>
    </div>
  );
}

type LogoutConfirmationDialogProps = Readonly<{
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

function LogoutConfirmationDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: LogoutConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && !isSubmitting) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === cancelButtonRef.current) {
      event.preventDefault();
      confirmButtonRef.current?.focus();
    } else if (!event.shiftKey && activeElement === confirmButtonRef.current) {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  }

  return (
    <div
      aria-describedby="logout-confirmation-description"
      aria-labelledby="logout-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-5"
      onKeyDown={handleKeyDown}
      role="alertdialog"
    >
      <form
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2
          className="text-lg font-semibold text-foreground"
          id="logout-confirmation-title"
        >
          Log out?
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-foreground-muted"
          id="logout-confirmation-description"
        >
          You’ll need to verify your phone number to sign back in.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-10 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            ref={confirmButtonRef}
            type="submit"
          >
            {isSubmitting ? "Logging out…" : "Log out"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { bootstrapError, status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");
  const privacyQuery = useAccountPrivacy(status === "authenticated");
  const updateCurrentProfile = useUpdateCurrentProfile();
  const updateAccountPrivacy = useUpdateAccountPrivacy();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const isProfileMutationInFlightRef = useRef(false);
  const isPrivacyMutationInFlightRef = useRef(false);
  const hasInitializedProfileFormRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<
    { message: string; type: "error" | "success" } | undefined
  >();
  const [avatarFeedback, setAvatarFeedback] = useState<
    { message: string; type: "error" | "progress" | "success" } | undefined
  >();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState<
    { message: string; type: "error" | "pending" | "success" } | undefined
  >();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const serverDisplayName = profileQuery.data?.profile.displayName ?? "";
  const serverBio = profileQuery.data?.profile.bio ?? "";
  const isProfileDirty =
    hasInitializedProfileFormRef.current &&
    (displayName !== serverDisplayName || bio !== serverBio);
  const displayNameError = hasInitializedProfileFormRef.current
    ? !displayName.trim()
      ? "Display name is required."
      : displayName.trim().length > MAX_DISPLAY_NAME_LENGTH
        ? `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`
        : undefined
    : undefined;
  const bioError =
    bio.length > MAX_BIO_LENGTH
      ? `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`
      : undefined;
  const isProfileMutationPending =
    updateCurrentProfile.isPending || isUploadingAvatar;

  function navigateFromProfile(section: AppNavigationSection) {
    if (section === "connections") {
      router.push("/chat?workspace=connections");
      return;
    }

    router.push(section === "chats" ? "/chat" : "/profile");
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    if (!hasInitializedProfileFormRef.current || !isProfileDirty) {
      setDisplayName(serverDisplayName);
      setBio(serverBio);
      hasInitializedProfileFormRef.current = true;
    }
  }, [isProfileDirty, profileQuery.data, serverBio, serverDisplayName]);

  async function saveProfile(): Promise<void> {
    if (
      isProfileMutationInFlightRef.current ||
      !isProfileDirty ||
      displayNameError ||
      bioError
    ) {
      return;
    }

    const normalizedDisplayName = displayName.trim();
    const normalizedBio = bio === "" ? null : bio;
    const input: UpdateCurrentProfileInput = {
      ...(normalizedDisplayName === serverDisplayName
        ? {}
        : { displayName: normalizedDisplayName }),
      ...(normalizedBio === serverBio ? {} : { bio: normalizedBio }),
    };

    if (!Object.keys(input).length) {
      return;
    }

    isProfileMutationInFlightRef.current = true;
    setProfileFeedback(undefined);

    try {
      const updatedProfile = await updateCurrentProfile.mutateAsync(input);

      setDisplayName(updatedProfile.displayName ?? "");
      setBio(updatedProfile.bio ?? "");
      setProfileFeedback({ message: "Profile saved.", type: "success" });
    } catch (error) {
      setProfileFeedback({
        message: getProfileErrorMessage(error),
        type: "error",
      });
    } finally {
      isProfileMutationInFlightRef.current = false;
    }
  }

  async function uploadAvatar(file: File): Promise<void> {
    if (isProfileMutationInFlightRef.current) {
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarFeedback({
        message: "Choose a GIF, JPEG, PNG, or WebP image.",
        type: "error",
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarFeedback({
        message: "Profile photos can be up to 10 MiB.",
        type: "error",
      });
      return;
    }

    isProfileMutationInFlightRef.current = true;
    setIsUploadingAvatar(true);
    setAvatarFeedback({ message: "Uploading photo…", type: "progress" });

    try {
      const upload = await createAvatarUpload(file);
      await uploadAvatarBytes(file, upload.upload);
      setAvatarFeedback({ message: "Processing photo…", type: "progress" });
      await completeAvatarUpload(upload.uploadIntent.id);
      await queryClient.invalidateQueries({ queryKey: currentProfileQueryKey });
      setAvatarFeedback({ message: "Profile photo updated.", type: "success" });
    } catch {
      setAvatarFeedback({
        message: "Unable to update your profile photo. Please try again.",
        type: "error",
      });
    } finally {
      isProfileMutationInFlightRef.current = false;
      setIsUploadingAvatar(false);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function updatePrivacySetting(
    setting: "onlineVisibleToConnections" | "lastSeenVisibleToConnections",
    value: boolean,
  ): Promise<void> {
    if (isPrivacyMutationInFlightRef.current) {
      return;
    }

    isPrivacyMutationInFlightRef.current = true;
    setPrivacyFeedback({ message: "Saving privacy setting…", type: "pending" });

    try {
      await updateAccountPrivacy.mutateAsync({ [setting]: value });
      setPrivacyFeedback({
        message: "Privacy setting saved.",
        type: "success",
      });
    } catch {
      setPrivacyFeedback({
        message: "Unable to update this privacy setting. Please try again.",
        type: "error",
      });
    } finally {
      isPrivacyMutationInFlightRef.current = false;
    }
  }

  function closeLogoutDialog() {
    if (isLoggingOut) {
      return;
    }

    setIsLogoutDialogOpen(false);
    requestAnimationFrame(() => logoutButtonRef.current?.focus());
  }

  async function confirmLogout(): Promise<void> {
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    stopMessagesSocket();

    try {
      await logout();
    } finally {
      try {
        await queryClient.cancelQueries();
      } catch {
        // Query cleanup continues below even if a transport cannot be cancelled.
      }

      queryClient.clear();
      router.replace("/login");
      isLoggingOutRef.current = false;
    }
  }

  if (status === "unauthenticated") {
    return <main className="min-h-[100dvh]" />;
  }

  if (status === "initializing") {
    return (
      <ProfileWorkspace>
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <section aria-busy="true" className="space-y-4 text-center">
            <span className="sr-only" role="status">
              Loading your account…
            </span>
            <Skeleton className="mx-auto h-6 w-40 rounded" />
            {bootstrapError ? (
              <button
                className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                onClick={() => void bootstrapSession()}
                type="button"
              >
                Try again
              </button>
            ) : null}
          </section>
        </div>
      </ProfileWorkspace>
    );
  }

  if (profileQuery.isPending) {
    return (
      <ProfileWorkspace>
        <ProfileHeader
          avatar={null}
          identity="Pyaw member"
          onNavigate={navigateFromProfile}
          username={null}
        />
        <div aria-busy="true" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-10 sm:px-10 sm:py-12">
            <span className="sr-only" role="status">
              Loading your profile…
            </span>
            <Skeleton className="size-24 rounded-full sm:size-28" />
            <Skeleton className="mt-5 h-8 w-48 max-w-full rounded" />
            <Skeleton className="mt-3 h-4 w-28 rounded" />
            <div className="mt-10 w-full max-w-xl border-t border-border pt-6">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="mt-4 h-4 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded" />
            </div>
          </div>
        </div>
      </ProfileWorkspace>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileWorkspace>
        <ProfileHeader
          avatar={null}
          identity="Pyaw member"
          onNavigate={navigateFromProfile}
          username={null}
        />
        <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-5 sm:p-10">
          <section className="w-full max-w-2xl space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Your profile is unavailable.
            </h2>
            <p className="text-sm leading-6 text-foreground-muted">
              Please try again shortly.
            </p>
            <button
              className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => profileQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </section>
        </div>
      </ProfileWorkspace>
    );
  }

  const { account, profile } = profileQuery.data;
  const identity = getProfileDisplayName(profile.displayName, account.username);

  return (
    <ProfileWorkspace>
      <ProfileHeader
        avatar={profile.avatar}
        identity={identity}
        onNavigate={navigateFromProfile}
        username={account.username}
      />
      <div className="grid min-h-0 flex-1 bg-background lg:grid-cols-[clamp(19rem,28vw,25rem)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col border-r border-border bg-surface p-5 lg:flex">
          <div className="rounded-2xl bg-input p-4">
            <div className="flex items-center gap-3">
              <ProfileAvatar name={identity} size="md" url={profile.avatar} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {identity}
                </p>
                {account.username ? (
                  <p className="truncate text-sm text-foreground-muted">
                    @{account.username}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs font-medium text-foreground-muted">
                  <span className="text-emerald-500">●</span>{" "}
                  {account.status === "ACTIVE"
                    ? "Online • Available"
                    : account.status}
                </p>
              </div>
            </div>
          </div>
          <nav aria-label="Profile navigation" className="mt-5 space-y-2">
            <ProfileNavigationItem active icon="●">
              Profile
            </ProfileNavigationItem>
            <ProfileNavigationItem icon="⚙">Settings</ProfileNavigationItem>
            <ProfileNavigationItem icon="⊘">
              Blocked Users
            </ProfileNavigationItem>
            <ProfileNavigationItem icon="ⓘ">About</ProfileNavigationItem>
          </nav>
          <div className="mt-auto border-t border-border pt-4">
            <ProfileNavigationItem icon="?">
              Help &amp; Support
            </ProfileNavigationItem>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-left text-sm font-semibold text-danger transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutDialogOpen(true)}
              ref={logoutButtonRef}
              type="button"
            >
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center"
              >
                ↪
              </span>
              Log out
            </button>
          </div>
        </aside>
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Profile
                </h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Manage your public information, avatar, and contact
                  credentials.
                </p>
              </div>
              <button
                aria-describedby={
                  displayNameError || bioError
                    ? "profile-form-error"
                    : undefined
                }
                className="min-h-12 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  !isProfileDirty ||
                  Boolean(displayNameError) ||
                  Boolean(bioError) ||
                  isProfileMutationPending
                }
                onClick={() => void saveProfile()}
                type="button"
              >
                {updateCurrentProfile.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
            <section
              aria-labelledby="profile-details-title"
              className="mt-8 rounded-3xl border border-border bg-surface p-5 sm:p-7"
            >
              <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
                <span className="relative w-fit">
                  <ProfileAvatar
                    name={identity}
                    size="lg"
                    url={profile.avatar}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-4 border-surface bg-primary text-lg text-primary-foreground"
                  >
                    ⌾
                  </span>
                </span>
                <div>
                  <h3
                    className="text-lg font-semibold text-foreground"
                    id="profile-details-title"
                  >
                    Profile Photo
                  </h3>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Your avatar is provided by your Pyaw profile.
                  </p>
                  <div className="mt-4 flex items-center gap-5">
                    <input
                      accept="image/gif,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={isProfileMutationPending}
                      id="profile-avatar-upload"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          void uploadAvatar(file);
                        }
                      }}
                      ref={avatarInputRef}
                      type="file"
                    />
                    <button
                      className="rounded-full bg-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isProfileMutationPending}
                      onClick={() => avatarInputRef.current?.click()}
                      type="button"
                    >
                      {isUploadingAvatar ? "Uploading…" : "Upload New"}
                    </button>
                    <button
                      aria-describedby="avatar-remove-unavailable"
                      className="cursor-not-allowed text-sm font-medium text-foreground-muted opacity-60"
                      disabled
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <p
                    className="mt-3 text-xs text-foreground-muted"
                    id="avatar-remove-unavailable"
                  >
                    Removing a profile photo is not available yet.
                  </p>
                  {avatarFeedback ? (
                    <p
                      className={`mt-3 text-sm ${
                        avatarFeedback.type === "error"
                          ? "text-danger"
                          : "text-foreground-muted"
                      }`}
                      role={
                        avatarFeedback.type === "error" ? "alert" : "status"
                      }
                    >
                      {avatarFeedback.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">
                    Display Name
                  </span>
                  <input
                    aria-describedby={
                      displayNameError ? "profile-form-error" : undefined
                    }
                    aria-invalid={Boolean(displayNameError)}
                    className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isProfileMutationPending}
                    maxLength={MAX_DISPLAY_NAME_LENGTH + 1}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setProfileFeedback(undefined);
                    }}
                    type="text"
                    value={displayName}
                  />
                </label>
                <ProfileField label="Username">
                  {account.username ? `@${account.username}` : "Not set"}
                </ProfileField>
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  About / Bio
                </span>
                <textarea
                  aria-describedby={bioError ? "profile-form-error" : undefined}
                  aria-invalid={Boolean(bioError)}
                  className="min-h-24 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base leading-6 text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isProfileMutationPending}
                  maxLength={MAX_BIO_LENGTH + 1}
                  onChange={(event) => {
                    setBio(event.target.value);
                    setProfileFeedback(undefined);
                  }}
                  placeholder="Tell people a little about yourself."
                  value={bio}
                />
                <span className="mt-2 block text-right text-xs font-medium text-foreground-muted">
                  {bio.length} / {MAX_BIO_LENGTH}
                </span>
              </label>
              {displayNameError || bioError || profileFeedback ? (
                <p
                  className={`mt-4 text-sm ${
                    displayNameError ||
                    bioError ||
                    profileFeedback?.type === "error"
                      ? "text-danger"
                      : "text-foreground-muted"
                  }`}
                  id="profile-form-error"
                  role={
                    displayNameError ||
                    bioError ||
                    profileFeedback?.type === "error"
                      ? "alert"
                      : "status"
                  }
                >
                  {displayNameError || bioError || profileFeedback?.message}
                </p>
              ) : null}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <ProfileField label="Phone Number">
                  {account.phone}
                </ProfileField>
                <div className="rounded-2xl border border-border bg-input px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Account status
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {account.status === "ACTIVE"
                      ? "Verified active account"
                      : account.status}
                  </p>
                </div>
              </div>
            </section>
            <section aria-labelledby="privacy-title" className="mt-10">
              <h2
                className="text-3xl font-semibold tracking-tight text-foreground"
                id="privacy-title"
              >
                Privacy
              </h2>
              <p className="mt-1 text-base text-foreground-muted">
                Choose what your connections can see about your presence.
              </p>
              <div className="mt-7 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
                {privacyQuery.isPending ? (
                  <p
                    className="px-5 py-5 text-sm text-foreground-muted sm:px-6"
                    role="status"
                  >
                    Loading privacy settings…
                  </p>
                ) : privacyQuery.isError || !privacyQuery.data ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
                    <p className="text-sm text-danger" role="alert">
                      Privacy settings are unavailable.
                    </p>
                    <button
                      className="min-h-10 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                      onClick={() => void privacyQuery.refetch()}
                      type="button"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    <PrivacySettingRow
                      checked={privacyQuery.data.onlineVisibleToConnections}
                      description="Let your connections see when you are online."
                      disabled={updateAccountPrivacy.isPending}
                      onChange={() =>
                        void updatePrivacySetting(
                          "onlineVisibleToConnections",
                          !privacyQuery.data.onlineVisibleToConnections,
                        )
                      }
                      title="Online status"
                    />
                    <PrivacySettingRow
                      checked={privacyQuery.data.lastSeenVisibleToConnections}
                      description="Let your connections see when you were last active."
                      disabled={updateAccountPrivacy.isPending}
                      onChange={() =>
                        void updatePrivacySetting(
                          "lastSeenVisibleToConnections",
                          !privacyQuery.data.lastSeenVisibleToConnections,
                        )
                      }
                      title="Last seen"
                    />
                  </>
                )}
              </div>
              {privacyFeedback ? (
                <p
                  className={`mt-3 text-sm ${
                    privacyFeedback.type === "error"
                      ? "text-danger"
                      : "text-foreground-muted"
                  }`}
                  role={privacyFeedback.type === "error" ? "alert" : "status"}
                >
                  {privacyFeedback.message}
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </div>
      <LogoutConfirmationDialog
        isOpen={isLogoutDialogOpen}
        isSubmitting={isLoggingOut}
        onCancel={closeLogoutDialog}
        onConfirm={() => void confirmLogout()}
      />
    </ProfileWorkspace>
  );
}
