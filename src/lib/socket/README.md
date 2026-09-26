# Socket.IO boundary

The messages socket manager owns the single authenticated Socket.IO lifecycle:
`/messages` namespace, `/socket.io` path, websocket transport, and
`auth.accessToken` handshake authentication. Feature-level handlers subscribe
to it and reconcile TanStack Query caches; it does not own message state.
