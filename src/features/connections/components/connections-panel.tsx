"use client";

import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/api-error";
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

type ConnectionsPanelProps = Readonly<{
  currentAccountId: string;
  isOpeningConversation?: boolean;
  onMessage?: (accountId: string) => void;
}>;

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Please try again shortly.";
}

function Identity({ account }: Readonly<{ account: ConnectionIdentity }>) {
  const identity = getProfileDisplayName(
    account.profile?.displayName,
    account.username,
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileAvatar name={identity} url={account.profile?.avatar ?? null} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{identity}</p>
        {account.username ? (
          <p className="truncate text-sm text-foreground-muted">
            @{account.username}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConnectionRequestItem({
  request,
}: Readonly<{
  request: ConnectionRequest;
}>) {
  const respond = useRespondToConnectionRequest();
  const canRespond = request.status === "PENDING";

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <Identity account={request.counterpart} />
      {canRespond ? (
        <div className="flex gap-2 sm:shrink-0">
          <button
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={respond.isPending}
            onClick={() =>
              respond.mutate({ requestId: request.id, status: "ACCEPTED" })
            }
            type="button"
          >
            Accept
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={respond.isPending}
            onClick={() =>
              respond.mutate({ requestId: request.id, status: "REJECTED" })
            }
            type="button"
          >
            Reject
          </button>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">
          {request.status.toLowerCase()}
        </p>
      )}
      {respond.isError ? (
        <p className="text-sm text-danger" role="alert">
          {getErrorMessage(respond.error)}
        </p>
      ) : null}
    </li>
  );
}

export function ConnectionsPanel({
  currentAccountId,
  isOpeningConversation = false,
  onMessage,
}: ConnectionsPanelProps) {
  const [phone, setPhone] = useState("");
  const lookup = useAccountLookup();
  const sendRequest = useSendConnectionRequest();
  const connections = useConnections(true);
  const incoming = useConnectionRequests("INCOMING", true);
  const outgoing = useConnectionRequests("OUTGOING", true);
  const lookupAccount = lookup.data?.account;
  const isSelf = lookupAccount?.id === currentAccountId;

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = phone.trim();

    if (value) {
      sendRequest.reset();
      lookup.mutate(value);
    }
  }

  function handleSendRequest() {
    if (lookupAccount && !isSelf) {
      sendRequest.mutate(lookupAccount.id);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="find-people-title">
        <div>
          <h2
            id="find-people-title"
            className="text-lg font-semibold text-foreground"
          >
            Find people
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Search Pyaw by phone number to send a connection request.
          </p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={handleLookup}
        >
          <label className="sr-only" htmlFor="phone">
            Phone number
          </label>
          <input
            className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2.5 text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
            id="phone"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
            type="tel"
            value={phone}
          />
          <button
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!phone.trim() || lookup.isPending}
            type="submit"
          >
            {lookup.isPending ? "Searching…" : "Search"}
          </button>
        </form>
        {lookup.isError ? (
          <p className="text-sm text-danger" role="alert">
            {getErrorMessage(lookup.error)}
          </p>
        ) : null}
        {lookup.isSuccess && !lookup.data.registered ? (
          <p className="text-sm text-foreground-muted">
            No available Pyaw account was found.
          </p>
        ) : null}
        {lookupAccount ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <Identity account={lookupAccount} />
            {isSelf ? (
              <p className="text-sm text-foreground-muted">
                This is your account.
              </p>
            ) : (
              <div className="space-y-2 sm:text-right">
                <button
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={sendRequest.isPending}
                  onClick={handleSendRequest}
                  type="button"
                >
                  {sendRequest.isPending ? "Sending…" : "Connect"}
                </button>
                {sendRequest.isError ? (
                  <p className="text-sm text-danger" role="alert">
                    {getErrorMessage(sendRequest.error)}
                  </p>
                ) : null}
                {sendRequest.isSuccess ? (
                  <p className="text-sm text-foreground-muted">Request sent.</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="incoming-title">
        <h2
          id="incoming-title"
          className="text-lg font-semibold text-foreground"
        >
          Incoming requests
        </h2>
        {incoming.isPending ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : null}
        {incoming.isError ? (
          <p className="text-sm text-danger" role="alert">
            {getErrorMessage(incoming.error)}
          </p>
        ) : null}
        {incoming.data?.items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No incoming requests.</p>
        ) : null}
        {incoming.data?.items.length ? (
          <ul className="space-y-3">
            {incoming.data.items.map((request) => (
              <ConnectionRequestItem key={request.id} request={request} />
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="outgoing-title">
        <h2
          id="outgoing-title"
          className="text-lg font-semibold text-foreground"
        >
          Sent requests
        </h2>
        {outgoing.isPending ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : null}
        {outgoing.isError ? (
          <p className="text-sm text-danger" role="alert">
            {getErrorMessage(outgoing.error)}
          </p>
        ) : null}
        {outgoing.data?.items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No sent requests.</p>
        ) : null}
        {outgoing.data?.items.length ? (
          <ul className="space-y-3">
            {outgoing.data.items.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <Identity account={request.counterpart} />
                <p className="shrink-0 text-sm text-foreground-muted">
                  {request.status.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="connections-title">
        <h2
          id="connections-title"
          className="text-lg font-semibold text-foreground"
        >
          Connections
        </h2>
        {connections.isPending ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : null}
        {connections.isError ? (
          <p className="text-sm text-danger" role="alert">
            {getErrorMessage(connections.error)}
          </p>
        ) : null}
        {connections.data?.items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No connections yet.</p>
        ) : null}
        {connections.data?.items.length ? (
          <ul className="space-y-3">
            {connections.data.items.map((connection) => (
              <li
                key={connection.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <Identity account={connection.counterpart} />
                {onMessage ? (
                  <button
                    className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isOpeningConversation}
                    onClick={() => onMessage(connection.counterpart.id)}
                    type="button"
                  >
                    {isOpeningConversation ? "Opening…" : "Message"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
