# Pyaw Web

The Pyaw Web application is a Next.js App Router client for the existing Pyaw
API. The NestJS backend remains responsible for business rules, persistence,
and authorization.

## Setup

1. Use Node.js 20 or newer.
2. Run `yarn install`.
3. Run `yarn dev` (or `yarn dev:frontend`) to start the frontend at
   `http://localhost:4000`. It loads the local development configuration from
   `.env.development`:

   ```ini
   NEXT_PUBLIC_APP_ENV=development
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
   ```

4. Start the Pyaw backend separately at `http://localhost:3000`. Its local
   CORS allowlist must include `http://localhost:4000` with credentials
   enabled. For the backend's local environment, use exact origins rather than
   a wildcard, for example:

   ```ini
   CORS_ORIGINS=http://localhost:4000
   WEB_AUTH_ORIGINS=http://localhost:4000
   ```

   The frontend continues to send credentialed authentication requests, so the
   HttpOnly refresh-session cookie is included in local refresh and logout
   flows.

Use `yarn start` to serve a production build locally on `http://localhost:4000`.

Only public, non-secret browser configuration belongs in `NEXT_PUBLIC_*`
variables. STAGING remains separately configured with the HTTPS Railway values
in `.env.example`; deployments must set those values in their own environment
configuration.

## Verification

Run `yarn lint`, `yarn typecheck`, and `yarn build` after configuring the
required environment variables.

## Session security

The access token is held only in browser memory. It is never written to
browser storage, URLs, or readable cookies. The refresh credential is an
HttpOnly browser-managed cookie for Web authentication and is never exposed to
application JavaScript.

### Persistent-session backend handoff

The supplied OpenAPI contract defines the Web authentication flow:

- `POST /auth/otp/verify` with `transport: "WEB"` returns an access token and
  establishes the HttpOnly refresh session.
- `POST /auth/refresh` sends the browser-managed refresh cookie, rotates it,
  and returns a replacement access token.
- `POST /auth/logout` requires the Bearer access token and browser credentials
  and revokes the current refresh session.

STAGING was checked on 2026-09-26. It recognizes the browser-auth Origin
policy, but its refresh preflight does not return
`Access-Control-Allow-Credentials`; credentialed browser requests therefore
remain blocked until the deployment enables credentialed CORS for the intended
Web origin.

For local Web authentication against STAGING, configure these Railway
environment variables exactly:

```ini
CORS_ORIGINS=https://localhost:3000
WEB_AUTH_ORIGINS=https://localhost:3000
WEB_AUTH_SAME_SITE=none
```

Cookie attributes remain backend-owned: use `HttpOnly` and `Secure`; choose
`SameSite` from the deployed Web/API site relationship, with strict Origin or
CSRF protection for cookie-authenticated refresh/logout requests. Once that
contract exists, the Web client can add a one-time initializing bootstrap that
calls refresh with `credentials: "include"`, keeps only the returned access
token in memory, and preserves the requested protected route. No frontend
storage workaround is used before then.

Phone OTP request and verification use public API calls directly so access
tokens are never retained in a TanStack Query cache.

The authenticated current-user profile is TanStack Query server state. It is
evicted when the in-memory session becomes unauthenticated; signed avatar URLs
are treated as temporary and are not persisted or constructed by the client.
