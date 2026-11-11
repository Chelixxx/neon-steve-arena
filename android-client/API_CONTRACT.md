# VOLTRA Android client API map

Production base: `https://neon-steve-arena-server-production.up.railway.app`

This map is based on routes actually present in `server.js` on `main` at the time of inspection. The route list is a starting point; request/response schemas and auth requirements must be verified before wiring native screens. Do not assume draft route names from earlier versions of this document.

## Existing REST routes

### Account and authentication
- `POST /api/register/start`
- `POST /api/register/verify`
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/security/sessions`
- `POST /api/security/sessions/revoke`
- `POST /api/contact/start`, `POST /api/contact/verify`
- `POST /api/recovery/start`, `POST /api/recovery/complete`
- `GET /api/profile`, `POST /api/profile`
- `GET /api/presence-settings`

### Discovery, contacts and social
- `GET /api/users/search`
- `GET /api/community`
- `GET /api/channels`
- `GET /api/news`
- `GET /api/reports`

### Stickers and mini apps
- `GET/POST /api/sticker-packs`
- `GET /api/miniapps`
- `GET /api/miniapps/users`
- `POST /api/miniapps/inspect-image`
- `POST /api/miniapps/subscribe`
- `POST /api/miniapps/create`
- `POST /api/miniapps/update`
- `POST /api/miniapps/remove`
- `POST /api/miniapps/start`

### Gifts, wallet and Premium
- `GET /api/gifts`
- `POST /api/gifts/buy`
- `POST /api/gifts/send`
- `POST /api/gifts/transfer`
- `POST /api/gifts/equip`
- `GET /api/gifts/resale` and related resale endpoints
- `GET /api/gifts/upgrader`, `POST /api/gifts/upgrader/attempt`
- `POST /api/premium/request`
- `GET /api/catcoin` and `POST /api/catcoin/action`
- `GET /api/payments/manual/requisites`
- `POST /api/payments/manual/orders`
- `POST /api/payments/manual/claim`
- `GET /api/market`, `GET /api/market/history`, `POST /api/market/list`, `POST /api/market/buy`

The current backend also exposes admin routes. The Android client must not show or call admin operations unless the authenticated account has server-verified permissions.

## Existing WebSocket protocol

Endpoint: `wss://neon-steve-arena-server-production.up.railway.app/ws`

Server-handled client message types observed in `server.js`:
`ping`, `upload-ticket`, `message`, `message-reaction`, `poll-vote`, `pin-message`, `edit-message`, `delete-message`, `search-messages`, `history`, `read`, `invite-response`, `tictactoe-move`, `typing`, `voice-room-join`, `voice-room-leave`, `voice-room-offer`, `voice-room-answer`, `voice-room-ice`, `call-end`, `call-offer`, `ice`.

The exact cookie/session-ticket handshake and payload shapes must be read from the backend before implementation. Native Android should use secure cookie/session handling and never log auth tickets.

## Important gaps before claiming Telegram feature parity

The inspected backend is currently a single Node.js application with a JSON file store and WebSocket protocol. It is not an MTProto server. It does not yet demonstrate a complete Telegram-equivalent contract for every feature (for example, all group/channel permissions, cloud media semantics, multi-device sync, end-to-end secret chats, and scalable message history).

Build an adapter around the routes and WebSocket protocol that exist today. Add versioned backend APIs and database migrations before implementing missing product features. Do not silently map unsupported features to fake local-only behavior.

## Stars, Premium and gifts

The current server already contains gift purchase/send/resale routes, Premium request flow, and test/manual payment routes. Before exposing real purchases in the Android client:
- verify prices and balances on the server;
- use atomic, idempotent ledger transactions;
- verify payment completion server-side;
- prevent client-supplied balance/price/entitlement changes;
- preserve audit history and support refunds/reversals;
- distinguish test payment flows from production payments.

## Local storage and export

Use Room/SQLite for cache and offline outbox. A user-consented JSON export may include ordinary profile data and message history. Never write passwords, OTPs, session cookies/tickets, private keys or payment secrets to plaintext TXT/JSON. Encrypt session material with Android Keystore.
