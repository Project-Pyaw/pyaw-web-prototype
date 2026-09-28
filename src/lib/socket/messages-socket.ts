import "client-only";

import { io, type Socket } from "socket.io-client";

import {
  getCurrentAccessToken,
  subscribeToSession,
} from "@/features/auth/session/session";
import { getPublicConfig } from "@/config/env";

export type MessagesSocketConnectionState =
  "disconnected" | "connecting" | "connected" | "reconnecting";

type ConnectionStateListener = () => void;
type ConversationReadListener = (payload: unknown) => void;
type MessageDeletedListener = (payload: unknown) => void;
type MessageNewListener = (payload: unknown) => void;
type MessageReactionsUpdatedListener = (payload: unknown) => void;
type PresenceUpdateListener = (payload: unknown) => void;
type TypingUpdateListener = (payload: unknown) => void;

const connectionStateListeners = new Set<ConnectionStateListener>();
const conversationReadListeners = new Set<ConversationReadListener>();
const messageDeletedListeners = new Set<MessageDeletedListener>();
const messageNewListeners = new Set<MessageNewListener>();
const messageReactionsUpdatedListeners =
  new Set<MessageReactionsUpdatedListener>();
const presenceUpdateListeners = new Set<PresenceUpdateListener>();
const typingUpdateListeners = new Set<TypingUpdateListener>();

let connectionState: MessagesSocketConnectionState = "disconnected";
let messagesSocket: Socket | undefined;
let requested = false;
let unsubscribeFromSession: (() => void) | undefined;

function setConnectionState(nextState: MessagesSocketConnectionState): void {
  if (connectionState === nextState) {
    return;
  }

  connectionState = nextState;
  connectionStateListeners.forEach((listener) => listener());
}

function createMessagesSocket(): Socket {
  const socket = io(`${getPublicConfig().socketUrl}/messages`, {
    auth: (callback) => {
      const accessToken = getCurrentAccessToken();

      callback(accessToken ? { accessToken } : {});
    },
    autoConnect: false,
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    setConnectionState("connected");
  });
  socket.on("connect_error", () => {
    setConnectionState(requested ? "reconnecting" : "disconnected");
  });
  socket.on("disconnect", () => {
    setConnectionState(requested ? "reconnecting" : "disconnected");
  });
  socket.io.on("reconnect_attempt", () => {
    setConnectionState("reconnecting");
  });
  socket.on("message:new", (payload: unknown) => {
    messageNewListeners.forEach((listener) => listener(payload));
  });
  socket.on("message:deleted", (payload: unknown) => {
    messageDeletedListeners.forEach((listener) => listener(payload));
  });
  socket.on("message:reactions-updated", (payload: unknown) => {
    messageReactionsUpdatedListeners.forEach((listener) => listener(payload));
  });
  socket.on("presence:update", (payload: unknown) => {
    presenceUpdateListeners.forEach((listener) => listener(payload));
  });
  socket.on("conversation:read", (payload: unknown) => {
    conversationReadListeners.forEach((listener) => listener(payload));
  });
  socket.on("typing:update", (payload: unknown) => {
    typingUpdateListeners.forEach((listener) => listener(payload));
  });

  return socket;
}

function connect(): void {
  if (!requested || !getCurrentAccessToken()) {
    return;
  }

  messagesSocket ??= createMessagesSocket();
  setConnectionState("connecting");
  messagesSocket.connect();
}

function refreshSocketAuthentication(): void {
  if (!requested) {
    return;
  }

  if (!getCurrentAccessToken()) {
    stopMessagesSocket();
    return;
  }

  if (messagesSocket) {
    messagesSocket.disconnect();
  }

  connect();
}

export function startMessagesSocket(): void {
  if (requested) {
    return;
  }

  requested = true;
  unsubscribeFromSession = subscribeToSession(refreshSocketAuthentication);
  connect();
}

export function stopMessagesSocket(): void {
  requested = false;
  unsubscribeFromSession?.();
  unsubscribeFromSession = undefined;
  messagesSocket?.removeAllListeners();
  messagesSocket?.disconnect();
  messagesSocket = undefined;
  setConnectionState("disconnected");
}

export function getMessagesSocketConnectionState(): MessagesSocketConnectionState {
  return connectionState;
}

export function subscribeToMessagesSocketConnectionState(
  listener: ConnectionStateListener,
): () => void {
  connectionStateListeners.add(listener);

  return () => connectionStateListeners.delete(listener);
}

export function subscribeToMessageNew(
  listener: MessageNewListener,
): () => void {
  messageNewListeners.add(listener);

  return () => messageNewListeners.delete(listener);
}

export function subscribeToMessageDeleted(
  listener: MessageDeletedListener,
): () => void {
  messageDeletedListeners.add(listener);

  return () => messageDeletedListeners.delete(listener);
}

export function subscribeToMessageReactionsUpdated(
  listener: MessageReactionsUpdatedListener,
): () => void {
  messageReactionsUpdatedListeners.add(listener);

  return () => messageReactionsUpdatedListeners.delete(listener);
}

export function subscribeToPresenceUpdate(
  listener: PresenceUpdateListener,
): () => void {
  presenceUpdateListeners.add(listener);

  return () => presenceUpdateListeners.delete(listener);
}

export function subscribeToConversationRead(
  listener: ConversationReadListener,
): () => void {
  conversationReadListeners.add(listener);

  return () => conversationReadListeners.delete(listener);
}

export function subscribeToTypingUpdate(
  listener: TypingUpdateListener,
): () => void {
  typingUpdateListeners.add(listener);

  return () => typingUpdateListeners.delete(listener);
}

export function joinTypingConversation(conversationId: string): void {
  if (!messagesSocket?.connected) {
    return;
  }

  messagesSocket.emit("conversation:join", { conversationId }, () => {});
}

export function leaveTypingConversation(conversationId: string): void {
  if (!messagesSocket?.connected) {
    return;
  }

  messagesSocket.emit("conversation:leave", { conversationId }, () => {});
}

export function emitTypingUpdate(
  conversationId: string,
  isTyping: boolean,
): void {
  if (!messagesSocket?.connected) {
    return;
  }

  messagesSocket.emit("typing:update", { conversationId, isTyping }, () => {});
}
