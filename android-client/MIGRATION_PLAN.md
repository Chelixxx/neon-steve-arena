# Android-first rebuild plan

1. **Source/legal baseline:** pin Telegram-FOSS as a submodule, preserve GPL-2.0 notices, audit resource licenses, replace Telegram identity and app package.
2. **Reproducible APK:** build the pinned upstream untouched in Linux, record SDK/NDK/Go/Ninja versions, install and smoke-test a debug APK.
3. **VOLTRA shell:** retain native layouts, rows, dialogs, transitions, bubbles, settings hierarchy, sounds and customization; remove map/location features; add VOLTRA identity and Stars/Premium/Gifts/Mini Apps entry points.
4. **Network replacement:** add a VOLTRA API repository; replace auth, contacts, chats, messages, media, presence and notification calls with VOLTRA HTTPS/WebSocket endpoints. Preserve current account IDs and compatible data.
5. **Local-first storage:** Room cache/outbox, encrypted session storage via Android Keystore, safe versioned migration export without secrets.
6. **Economy:** server-authoritative Stars ledger, Premium entitlements, gift inventory and send transactions. Use idempotency keys, server-side prices and verified payment callbacks.
7. **QA:** existing-account login, history, send/receive, media, groups, read receipts, notifications, offline queue, Stars, Premium, gifts. Confirm independent giveaway-bot Railway service stays untouched.
8. **Web:** build after Android is stable against the same VOLTRA API.
