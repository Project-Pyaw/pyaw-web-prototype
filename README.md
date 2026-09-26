# Pyaw Web

The Pyaw Web application is a Next.js App Router client for the existing Pyaw
API. The NestJS backend remains responsible for business rules, persistence,
and authorization.

## Setup

1. Use Node.js 20 or newer.
2. Run `yarn install`.
3. Run `yarn staging` to start against STAGING locally. It loads the committed,
   non-secret `.env.development` configuration.

Only public, non-secret browser configuration belongs in `NEXT_PUBLIC_*`
variables. Staging is the only supported environment for this initial phase.
Deployments must set the same variables in their own environment configuration.

## Verification

Run `yarn lint`, `yarn typecheck`, and `yarn build` after configuring the
required environment variables.

## Session security

Access and refresh tokens are held only in browser memory. They are never
written to browser storage, URLs, or readable cookies. The current backend
accepts refresh tokens in a request body and does not provide an HttpOnly
cookie-based web refresh session, so a full browser reload or a separate tab
starts unauthenticated.

### Persistent-session backend handoff

STAGING was checked on 2026-09-26. Its refresh preflight does not return
`Access-Control-Allow-Credentials`, and the supplied backend contract has no
cookie handling:

- `POST /auth/otp/verify` returns both tokens in JSON.
- `POST /auth/refresh` requires `{ "refreshToken": "..." }` in JSON and
  returns a rotated token pair in JSON.
- `POST /auth/logout` requires Bearer access authentication and the same JSON
  refresh-token body.

To safely support browser session restoration, the backend must establish a
refresh session with `Set-Cookie` during OTP verification, rotate that cookie
on `POST /auth/refresh`, and clear it on logout. The browser-facing refresh
and logout endpoints must not require a JavaScript-readable refresh token.
They must also enable credentialed CORS for an explicit Web origin (not a
wildcard), including `Access-Control-Allow-Credentials: true`.

Cookie attributes remain backend-owned: use `HttpOnly` and `Secure`; choose
`SameSite` from the deployed Web/API site relationship, with strict Origin or
CSRF protection for cookie-authenticated refresh/logout requests. Once that
contract exists, the Web client can add a one-time initializing bootstrap that
calls refresh with `credentials: "include"`, keeps only the returned access
token in memory, and preserves the requested protected route. No frontend
storage workaround is used before then.

Phone OTP request and verification use public API calls directly so responses
containing tokens are never retained in a TanStack Query cache.

The authenticated current-user profile is TanStack Query server state. It is
evicted when the in-memory session becomes unauthenticated; signed avatar URLs
are treated as temporary and are not persisted or constructed by the client.
