# Giveaway bot

Railway worker for a free group giveaway.

Required Railway variables:
- BOT_TOKEN: token from @BotFather (set privately in Railway Variables; never commit it)
- OWNER_ID: your numeric Telegram user ID
- WIN_CHANCE: 0.07 (7%)

There are no per-user or per-group cooldowns. Every eligible group message is an independent 7% draw. High-volume chats can produce frequent winner posts and may hit Telegram rate limits.

Place the original image at assets/giveaway.jpg to attach it to announcements. Until the image is added, the bot sends the announcement as text.

Start command: python bot.py

The bot only announces winners and sends the owner a notification. It does not spend Stars or automatically transfer gifts.
