"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useOpenDirectConversation } from "@/features/conversations/hooks/use-conversations";
import { useCounterpartPresence } from "@/features/messages/hooks/use-counterpart-presence";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import {
  useAccountLookup,
  useConnections,
  useConnectionRequests,
  useRespondToConnectionRequest,
  useSendConnectionRequest,
} from "../hooks/use-connections";
import type { ConnectionIdentity, ConnectionRequest } from "../types";

type ConnectionsPanelProps = Readonly<{ currentAccountId: string }>;
type PeopleFilter = "all" | "pending" | "requests";
type PersonRelationship =
  "available" | "established" | "incoming" | "outgoing" | "self";
type SelectedPerson = Readonly<{
  account: ConnectionIdentity;
  relationship: PersonRelationship;
}>;

function getErrorMessage(error: unknown): string {
  void error;
  return "Please try again shortly.";
}

function Identity({
  account,
  avatarSize = "md",
}: Readonly<{
  account: ConnectionIdentity;
  avatarSize?: "md" | "lg";
}>) {
  const identity = getProfileDisplayName(
    account.profile?.displayName,
    account.username,
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileAvatar
        name={identity}
        size={avatarSize}
        url={account.profile?.avatar ?? null}
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{identity}</p>
        {account.username ? (
          <p className="truncate text-sm text-foreground-muted">
            @{account.username}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConnectionRowSkeleton({
  actions = false,
}: Readonly<{ actions?: boolean }>) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      {actions ? <Skeleton className="h-10 w-24 rounded-full" /> : null}
    </div>
  );
}

function RequestItem({ request }: Readonly<{ request: ConnectionRequest }>) {
  const respond = useRespondToConnectionRequest();
  const isRespondingRef = useRef(false);
  const [pendingAction, setPendingAction] = useState<
    "ACCEPTED" | "REJECTED" | undefined
  >();

  function respondToRequest(status: "ACCEPTED" | "REJECTED") {
    if (isRespondingRef.current) {
      return;
    }

    isRespondingRef.current = true;
    setPendingAction(status);
    respond.mutate(
      { requestId: request.id, status },
      {
        onSettled: () => {
          isRespondingRef.current = false;
          setPendingAction(undefined);
        },
      },
    );
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <Identity account={request.counterpart} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="min-h-11 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={respond.isPending}
          onClick={() => respondToRequest("ACCEPTED")}
          type="button"
        >
          {pendingAction === "ACCEPTED" ? "Accepting…" : "Accept"}
        </button>
        <button
          className="min-h-11 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={respond.isPending}
          onClick={() => respondToRequest("REJECTED")}
          type="button"
        >
          {pendingAction === "REJECTED" ? "Declining…" : "Decline"}
        </button>
      </div>
      {respond.isError ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {getErrorMessage(respond.error)}
        </p>
      ) : null}
    </li>
  );
}

function PeopleInspector({
  onClose,
  onRequestSent,
  person,
}: Readonly<{
  onClose?: () => void;
  onRequestSent?: () => void;
  person: SelectedPerson;
}>) {
  const router = useRouter();
  const openDirectConversation = useOpenDirectConversation();
  const sendRequest = useSendConnectionRequest();
  const isOpeningChatRef = useRef(false);
  const isSendingRequestRef = useRef(false);
  const presence = useCounterpartPresence(person.account.id);
  const identity = getProfileDisplayName(
    person.account.profile?.displayName,
    person.account.username,
  );
  const requestSent =
    person.relationship === "outgoing" ||
    sendRequest.data?.counterpart.id === person.account.id;

  function openChat() {
    if (isOpeningChatRef.current) {
      return;
    }

    isOpeningChatRef.current = true;
    openDirectConversation.mutate(person.account.id, {
      onSettled: () => {
        isOpeningChatRef.current = false;
      },
      onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    });
  }

  function sendConnectionRequest() {
    if (isSendingRequestRef.current) {
      return;
    }

    isSendingRequestRef.current = true;
    sendRequest.mutate(person.account.id, {
      onSettled: () => {
        isSendingRequestRef.current = false;
      },
      onSuccess: () => onRequestSent?.(),
    });
  }

  return (
    <section
      aria-label="Person profile"
      className="flex min-h-0 flex-1 flex-col bg-surface"
    >
      <header className="flex min-h-16 items-center border-b border-border px-4">
        {onClose ? (
          <button
            aria-label="Back to people"
            className="mr-2 grid size-11 place-items-center rounded-full text-foreground-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 xl:hidden"
            onClick={onClose}
            type="button"
          >
            ←
          </button>
        ) : null}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Profile
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center text-center">
          <ProfileAvatar
            name={identity}
            presenceStatus={presence?.status}
            size="lg"
            url={person.account.profile?.avatar ?? null}
          />
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            {identity}
          </h3>
          {person.account.username ? (
            <p className="mt-1 text-sm text-foreground-muted">
              @{person.account.username}
            </p>
          ) : null}
          {presence?.status === "ONLINE" || presence?.status === "OFFLINE" ? (
            <p className="mt-2 text-sm text-foreground-muted">
              {presence.status === "ONLINE" ? "Online" : "Offline"}
            </p>
          ) : null}
        </div>

        <div className="mt-7 border-t border-border pt-5">
          {person.relationship === "available" ? (
            <button
              className="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sendRequest.isPending || requestSent}
              onClick={sendConnectionRequest}
              type="button"
            >
              {sendRequest.isPending
                ? "Sending request…"
                : requestSent
                  ? "Request sent"
                  : "Send request"}
            </button>
          ) : person.relationship === "established" ? (
            <button
              className="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={openDirectConversation.isPending}
              onClick={openChat}
              type="button"
            >
              {openDirectConversation.isPending ? "Opening chat…" : "Open chat"}
            </button>
          ) : person.relationship === "incoming" ? (
            <p className="text-center text-sm text-foreground-muted">
              This person sent you a request. Respond from Incoming requests.
            </p>
          ) : person.relationship === "outgoing" ? (
            <p className="text-center text-sm text-foreground-muted">
              Connection request pending.
            </p>
          ) : (
            <p className="text-center text-sm text-foreground-muted">
              This is your account.
            </p>
          )}
          {sendRequest.isError ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {getErrorMessage(sendRequest.error)}
            </p>
          ) : null}
          {openDirectConversation.isError ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {getErrorMessage(openDirectConversation.error)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ConnectionsPanel({ currentAccountId }: ConnectionsPanelProps) {
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const [mobilePane, setMobilePane] = useState<"people" | "requests">("people");
  const [phone, setPhone] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(
    null,
  );
  const [showCompactInspector, setShowCompactInspector] = useState(false);
  const lookup = useAccountLookup();
  const isLookingUpRef = useRef(false);
  const connections = useConnections(true);
  const incoming = useConnectionRequests("INCOMING", true, "PENDING");
  const outgoing = useConnectionRequests("OUTGOING", true, "PENDING");
  const lookupAccount = lookup.data?.account;
  const establishedAccounts = connections.data?.items ?? [];

  function getRelationship(account: ConnectionIdentity): PersonRelationship {
    if (account.id === currentAccountId) {
      return "self";
    }

    if (
      establishedAccounts.some(
        (connection) => connection.counterpart.id === account.id,
      )
    ) {
      return "established";
    }

    if (
      incoming.data?.items.some(
        (request) => request.counterpart.id === account.id,
      )
    ) {
      return "incoming";
    }

    if (
      outgoing.data?.items.some(
        (request) => request.counterpart.id === account.id,
      )
    ) {
      return "outgoing";
    }

    return "available";
  }

  function findPerson(value: string) {
    if (!value || isLookingUpRef.current) {
      return;
    }

    isLookingUpRef.current = true;
    lookup.mutate(value, {
      onSettled: () => {
        isLookingUpRef.current = false;
      },
    });
  }

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    findPerson(phone.trim());
  }

  function selectPerson(account: ConnectionIdentity) {
    setSelectedPerson({ account, relationship: getRelationship(account) });
    setShowCompactInspector(window.innerWidth < 1280);
  }

  const incomingCount = incoming.data?.items.length ?? 0;
  const outgoingCount = outgoing.data?.items.length ?? 0;
  const selectedAccountId = selectedPerson?.account.id;
  const showIncoming = filter !== "pending";
  const showOutgoing = filter !== "requests";
  function markSelectedRequestAsSent() {
    setSelectedPerson((current) =>
      current ? { ...current, relationship: "outgoing" } : current,
    );
  }

  return (
    <div className="relative grid h-full min-h-0 overflow-hidden bg-background md:grid-cols-[clamp(19rem,28vw,25rem)_minmax(0,1fr)] xl:grid-cols-[clamp(19rem,28vw,25rem)_minmax(0,1fr)_22rem]">
      <aside
        className={`${
          mobilePane === "requests" ? "flex" : "hidden"
        } min-h-0 flex-col border-r border-border bg-surface md:flex`}
      >
        <header className="border-b border-border px-5 pb-4 pt-5">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                People
              </h1>
              {connections.data ? (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground-muted">
                  {establishedAccounts.length}
                </span>
              ) : null}
            </div>
            <button
              className="min-h-11 rounded-full px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 md:hidden"
              onClick={() => setMobilePane("people")}
              type="button"
            >
              People
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-surface-muted p-1">
            {(
              [
                ["all", "All People", undefined],
                ["requests", "Requests", incomingCount],
                ["pending", "Sent", outgoingCount],
              ] as const
            ).map(([value, label, count]) => (
              <button
                aria-pressed={filter === value}
                className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 ${
                  filter === value
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:bg-surface/70 hover:text-foreground"
                }`}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {label}
                {count ? (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-5">
          {showIncoming ? (
            <section
              aria-busy={incoming.isPending}
              aria-labelledby="incoming-requests-title"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2
                  className="text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                  id="incoming-requests-title"
                >
                  Incoming requests
                </h2>
                {incomingCount ? (
                  <span className="text-xs font-semibold text-primary">
                    {incomingCount} new
                  </span>
                ) : null}
              </div>
              {incoming.isPending ? (
                <div>
                  <span className="sr-only" role="status">
                    Loading incoming requests…
                  </span>
                  <ConnectionRowSkeleton actions />
                  <ConnectionRowSkeleton actions />
                </div>
              ) : null}
              {incoming.isError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 p-3">
                  <p className="text-sm text-danger" role="alert">
                    {getErrorMessage(incoming.error)}
                  </p>
                  <button
                    className="min-h-10 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                    onClick={() => void incoming.refetch()}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {incoming.data?.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-foreground-muted">
                  No incoming requests.
                </p>
              ) : null}
              {incoming.data?.items.length ? (
                <ul className="space-y-2">
                  {incoming.data.items.map((request) => (
                    <RequestItem key={request.id} request={request} />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {showOutgoing ? (
            <section
              aria-busy={outgoing.isPending}
              aria-labelledby="pending-requests-title"
              className={showIncoming ? "mt-6 border-t border-border pt-5" : ""}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2
                  className="text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                  id="pending-requests-title"
                >
                  Sent requests
                </h2>
                {outgoingCount ? (
                  <span className="text-xs text-foreground-muted">
                    {outgoingCount} pending
                  </span>
                ) : null}
              </div>
              {outgoing.isPending ? (
                <div>
                  <span className="sr-only" role="status">
                    Loading pending requests…
                  </span>
                  <ConnectionRowSkeleton />
                </div>
              ) : null}
              {outgoing.isError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 p-3">
                  <p className="text-sm text-danger" role="alert">
                    {getErrorMessage(outgoing.error)}
                  </p>
                  <button
                    className="min-h-10 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                    onClick={() => void outgoing.refetch()}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {outgoing.data?.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-foreground-muted">
                  No pending requests.
                </p>
              ) : null}
              {outgoing.data?.items.length ? (
                <ul className="space-y-2">
                  {outgoing.data.items.map((request) => (
                    <li
                      className="rounded-xl border border-border bg-surface-muted px-3 py-3"
                      key={request.id}
                    >
                      <Identity account={request.counterpart} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      </aside>

      <main
        className={`${
          mobilePane === "people" ? "flex" : "hidden"
        } min-h-0 min-w-0 flex-col bg-surface md:flex`}
      >
        <header className="border-b border-border px-5 pb-4 pt-5 sm:px-6">
          <div className="mb-3 flex items-center gap-3 md:hidden">
            <button
              className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => setMobilePane("requests")}
              type="button"
            >
              Requests{incomingCount ? ` (${incomingCount})` : ""}
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              People
            </h1>
          </div>
          <form className="flex gap-2" onSubmit={handleLookup}>
            <label className="sr-only" htmlFor="people-phone-search">
              Find a person by phone number
            </label>
            <input
              className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-input px-4 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
              id="people-phone-search"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Find by phone number"
              type="tel"
              value={phone}
            />
            <button
              className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!phone.trim() || lookup.isPending}
              type="submit"
            >
              {lookup.isPending ? "Finding…" : "Find"}
            </button>
          </form>
          <p className="mt-2 text-xs text-foreground-muted">
            Exact phone lookup only. People search by name or username is not
            available yet.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lookup.isError ? (
            <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 p-3">
              <p className="text-sm text-danger" role="alert">
                {getErrorMessage(lookup.error)}
              </p>
              <button
                className="min-h-10 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!phone.trim() || lookup.isPending}
                onClick={() => findPerson(phone.trim())}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : null}
          {lookup.isSuccess && !lookup.data.registered ? (
            <p className="m-4 rounded-xl border border-dashed border-border p-4 text-sm text-foreground-muted">
              No available Pyaw account was found for that phone number.
            </p>
          ) : null}
          {lookupAccount ? (
            <section
              aria-labelledby="lookup-result-title"
              className="border-b border-border p-3"
            >
              <h2
                className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                id="lookup-result-title"
              >
                Phone lookup result
              </h2>
              <button
                className={`flex min-h-16 w-full items-center rounded-xl border-l-2 px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 ${
                  selectedAccountId === lookupAccount.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-surface-muted"
                }`}
                onClick={() => selectPerson(lookupAccount)}
                type="button"
              >
                <Identity account={lookupAccount} />
              </button>
            </section>
          ) : null}

          <section
            aria-busy={connections.isPending}
            aria-labelledby="people-list-title"
          >
            <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
              <h2
                className="font-semibold text-foreground"
                id="people-list-title"
              >
                All People
              </h2>
              {connections.data ? (
                <span className="text-sm text-foreground-muted">
                  {establishedAccounts.length}
                </span>
              ) : null}
            </div>
            {connections.isPending ? (
              <div>
                <span className="sr-only" role="status">
                  Loading people…
                </span>
                <ConnectionRowSkeleton />
                <ConnectionRowSkeleton />
                <ConnectionRowSkeleton />
              </div>
            ) : null}
            {connections.isError ? (
              <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 p-3">
                <p className="text-sm text-danger" role="alert">
                  {getErrorMessage(connections.error)}
                </p>
                <button
                  className="min-h-10 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                  onClick={() => void connections.refetch()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : null}
            {connections.data?.items.length === 0 ? (
              <p className="p-5 text-sm text-foreground-muted">
                Your accepted people will appear here.
              </p>
            ) : null}
            {connections.data?.items.length ? (
              <ul className="divide-y divide-border">
                {connections.data.items.map((connection) => {
                  const isSelected =
                    selectedAccountId === connection.counterpart.id;

                  return (
                    <li key={connection.id}>
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-16 w-full items-center border-l-2 px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-surface-muted"
                        }`}
                        onClick={() => selectPerson(connection.counterpart)}
                        type="button"
                      >
                        <Identity account={connection.counterpart} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </div>
      </main>

      <aside className="hidden min-h-0 border-l border-border xl:flex">
        {selectedPerson ? (
          <PeopleInspector
            onRequestSent={markSelectedRequestAsSent}
            person={selectedPerson}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <p className="text-sm text-foreground-muted">
              Select a person to view their available profile information.
            </p>
          </div>
        )}
      </aside>

      {selectedPerson && showCompactInspector ? (
        <div className="absolute inset-0 z-20 flex bg-surface xl:hidden">
          <PeopleInspector
            onClose={() => setShowCompactInspector(false)}
            onRequestSent={markSelectedRequestAsSent}
            person={selectedPerson}
          />
        </div>
      ) : null}
    </div>
  );
}
