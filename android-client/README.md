# VOLTRA Android client

Android-first native rebuild based on the public Telegram-FOSS Android client as the UI/UX reference and GPL-2.0 codebase.

- Upstream: https://github.com/Telegram-FOSS-Team/Telegram-FOSS
- Pinned upstream commit: `10da5406ed92d30c6add3b25d40b2b3b6995d873`
- Submodule path: `android-client/Telegram-FOSS`
- Preserve upstream copyright notices and GPL-2.0 notices. Publish the complete corresponding source and license notices when distributing a modified APK.
- VOLTRA must use its own name, package ID, icon and service identity. Do not ship Telegram branding as if this were the official Telegram app.

## Clone / initialize

```bash
git clone --recurse-submodules https://github.com/Chelixxx/neon-steve-arena.git
cd neon-steve-arena
git checkout voltra-native-android
git submodule update --init --recursive
```

## Build prerequisites

Use Linux (or WSL2), JDK 17, Android SDK, Android NDK, CMake, Ninja and Go as required by the pinned upstream build scripts. Follow the upstream README for native dependency build steps. First deliverable is a debug/sideloadable APK; signing keys stay private and must never be committed.

The upstream app requires its own API ID/hash file for Telegram's service. Those credentials are not VOLTRA credentials. Do not connect the VOLTRA build to Telegram's production messaging service. Replace its network layer with the VOLTRA API.

## Product scope

Keep the native Android interaction patterns and screens as close as practical to the upstream client: chat list, folders, pinned/unread states, search, one-to-one and group conversations, replies, edits, deletes, reactions, forwarding, attachments, voice messages, read states, contacts, profile, account/privacy/notification/data/device/appearance settings, themes, wallpapers, sounds, stickers and gift browsing.

Remove unsupported features such as map/location-sharing screens. Replace Telegram service operations with VOLTRA operations. Add VOLTRA Stars wallet, Premium entitlements, gifts and bot/Mini App catalog.

## Data safety

Use SQLite/Room for a durable local cache and offline outbox. A human-readable versioned JSON export may include non-secret profile/chat metadata and messages only with explicit consent. Never export passwords, OTPs, session tokens, private keys or payment secrets to plaintext. Protect session material with Android Keystore-backed encryption.

## Protocol boundary

Telegram-FOSS speaks Telegram MTProto. VOLTRA's Railway backend is a separate application API, not an MTProto server. Changing an IP/domain will not connect the app to VOLTRA. Implement a VOLTRA repository/data-source layer and replace app network calls with authenticated HTTPS + WebSocket operations.

## Protected service

Do not edit Railway `giveaway-bot-hidden`, its `giveaway-bot-railway` branch or `/giveaway-bot` directory.
