# VOLTRA shared-account web test

This branch adds an isolated browser test client at `/shared-login/`. It connects to the existing VOLTRA Gramsrv server over MTProto-over-WebSocket and uses the same accounts, dialogs and message history as the Android client. It does not connect to PostgreSQL from the browser and does not create a second users table.

## Layer0 / Layero deployment

- Use this repository and the branch `voltra-shared-mtproto-web`.
- Runtime: Node.js 18 or newer.
- Install command: `npm install`.
- Start command: `npm start`.
- A separate build command is not required: `prestart` builds the browser bundle and copies both MTcute WASM variants into `public/shared-login/`.
- The app should be served over HTTPS. Open `https://YOUR-WEB-DOMAIN/shared-login/`.

## Required Railway WebSocket origin

The Gramsrv service is `voltra-server-production.up.railway.app`, port 2398, and the browser transport connects through:

`wss://voltra-server-production.up.railway.app/apiws`

Railway service variables must allow the exact website origin in `TELESRV_WEBSOCKET_ALLOWED_ORIGINS`. Add the origin including scheme, for example `https://voltra.example`, while preserving any existing origins that are still needed. Do not set this to `*` in production. The public website's final hostname is not known to this repository yet, so this variable must be updated after Layer0 provides the domain.

## What this prototype verifies

- Existing phone-number account can request and confirm a login code.
- A browser has its own local IndexedDB device session.
- The web client can request the account's dialogs and message history from the same Gramsrv backend as Android.
- Text messages sent by this test page go through Gramsrv and are available to other logged-in clients.

The legacy VOLTRA web SPA at `/` still has its existing account and feature implementation. Those old web-only features are **not** automatically shared by this first prototype. Once the login and chat test is confirmed, they can be migrated feature-by-feature to the Gramsrv API/protocol. Do not merge the old JSONB-only `voltra_web.state` proposal as a substitute for this connection.
