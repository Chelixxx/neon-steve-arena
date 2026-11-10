# VOLTRA client API contract (draft)

Base URL: `https://neon-steve-arena-server-production.up.railway.app/api`

These are target operations, not a claim that every route exists today. Map each operation to the current server and add versioned endpoints where needed.

- Auth: `POST /auth/request-code`, `POST /auth/verify-code`, `POST /auth/refresh`, `POST /auth/logout`
- Account: `GET /me`, `PATCH /me`, `GET /users/{userId}`
- Contacts: `GET /contacts`, `POST /contacts`, `DELETE /contacts/{userId}`
- Chats: `GET /chats?cursor=...`, `POST /chats`
- Messages: `GET /chats/{chatId}/messages?before=...`, `POST /chats/{chatId}/messages`, `PATCH /messages/{messageId}`, `DELETE /messages/{messageId}`, `POST /messages/{messageId}/reactions`, `POST /messages/{messageId}/read`
- WebSocket events: `message.created`, `message.updated`, `message.deleted`, `message.read`, `typing`, `presence`, `chat.updated`
- Media: `POST /media/presign`, `POST /media/complete`
- Catalog: `GET /stickers`, `GET /gifts`, `GET /themes`, `GET /wallpapers`, `GET /sounds`
- Stars: `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/purchase-intents`
- Premium: `GET /premium`, `POST /premium/subscribe-intents`
- Gifts: `POST /gifts/{giftId}/send`
- Mini Apps: `GET /mini-apps`, `POST /mini-apps/{appId}/launch`

All balance and entitlement changes must be atomic, idempotent, and server-authoritative. Never trust client-supplied balance, price, entitlement or payment-success flags. Verify provider webhooks server-side; keep payment provider integration separate from the UI.
