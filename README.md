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
starts unauthenticated. A future backend cookie-session contract can replace
this limitation without changing feature APIs.

Phone OTP request and verification use public API calls directly so responses
containing tokens are never retained in a TanStack Query cache.
