import logging
import hashlib
import hmac
import json
import urllib.parse
import os
import random
import time
from pathlib import Path

from aiohttp import web
from telegram import WebAppInfo

from telegram import Update, ReactionTypeEmoji, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from miniapp_server import start_server, stop_server
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters, PicklePersistence

BOT_TOKEN = os.environ["BOT_TOKEN"]
OWNER_ID_RAW = os.getenv("OWNER_ID", "").strip()
OWNER_ID = int(OWNER_ID_RAW) if OWNER_ID_RAW.isdigit() else None
PHOTO_FILE_ID = os.getenv("GIVEAWAY_PHOTO_FILE_ID", "").strip()
MIN_MESSAGES = 3
MAX_MESSAGES = 20
IMAGE_PATH = Path(__file__).parent / "assets" / "giveaway.jpg"

PRIZES = [
    (95, "bear", "🧸 МИШКА", (
        "🎉 Поздравляю!\n"
        "🎁 Ты выиграл Мишку 🧸 от @Chelixxx\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Пишите сообщения в чате и получайте возможность тоже выиграть подарок!\n\n"
        "🎀 Розыгрыши в канале [https://t.me/cheli_gift](https://t.me/cheli_gift)"
    )),
    (1, "bouquet", "💐 БУКЕТ — ДЖЕКПОТ", (
        "💐 ВОТ ЭТО УДАЧА!\n"
        "🎁 Ты сорвал ДЖЕКПОТ и выиграл БУКЕТ! 🌹\n"
        "👑 Такой выигрыш выпадает не каждый день!\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Продолжайте писать — впереди ещё розыгрыши!\n"
        "🎀 @chatikloxssy"
    )),
    (1, "heart", "💝 СЕРДЕЧКО — ДЖЕКПОТ", (
        "💗 НЕВЕРОЯТНО!\n"
        "🎁 Ты выиграл ДЖЕКПОТ — СЕРДЕЧКО! 💝\n"
        "✨ Сегодня удача явно на твоей стороне!\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Пишите сообщения, участвуйте в розыгрышах и ловите подарки!\n"
        "🎀 @chatikloxssy"
    )),
    (1, "nft", "⚔️ NFT LIGHT SWORD", (
        "⚔️ НЕВЕРОЯТНО! ТЕБЕ ВЫПАЛ NFT-ДЖЕКПОТ!\n"
        "🎁 Твой приз — [NFT Light Sword](https://t.me/nft/LightSword-36379)\n"
        "⏳ Коллекционный подарок будет закреплён за тобой на 3 дня.\n"
        "✅ Организатор свяжется с тобой для выдачи подарка."
    )),

    (1, "inputkey", "🔑 NFT INPUT KEY", (
        "🔑 НЕВЕРОЯТНО! ТЕБЕ ВЫПАЛ NFT-ДЖЕКПОТ!\n"
        "🎁 Твой приз — [NFT InputKey](https://t.me/nft/InputKey-72263)\n"
        "⏳ Коллекционный подарок будет закреплён за тобой на 3 дня.\n"
        "✅ Организатор свяжется с тобой для выдачи подарка."
    )),
    (1, "cupid", "💗 NFT CUPID CHARM", (
        "💗 НЕВЕРОЯТНО! ТЕБЕ ВЫПАЛ НОВЫЙ NFT-ДЖЕКПОТ!\n"
        "🎁 Твой приз — [NFT Cupid Charm](https://t.me/nft/CupidCharm-14434)\n"
        "⏳ Коллекционный подарок будет закреплён за тобой на 3 дня.\n"
        "✅ Организатор свяжется с тобой для выдачи подарка."
    )),]


PRIZE_LABELS = {
    "bear": "🧸 Мишка",
    "bouquet": "💐 Букет",
    "heart": "💝 Сердечко",
    "nft": "⚔️ Light Sword",
    "inputkey": "🔑 InputKey",
    "cupid": "💗 Cupid Charm",
}

GIFT_EMOJI = {
    "bear": "🧸",
    "bouquet": "💐",
    "heart": "💝",
}


async def deliver_prize(context: ContextTypes.DEFAULT_TYPE, user_id: int, prize_key: str) -> tuple[bool, str]:
    """Send a regular Telegram gift using only the bot's own Stars balance."""
    if prize_key not in GIFT_EMOJI:
        return False, "Этот приз — коллекционный NFT; обычный sendGift его не передаёт."

    gifts = await context.bot.get_available_gifts()
    target_emoji = GIFT_EMOJI[prize_key]
    gift = next(
        (
            item for item in gifts.gifts
            if getattr(getattr(item, "sticker", None), "emoji", None) == target_emoji
        ),
        None,
    )
    if gift is None:
        return False, f"В каталоге бота сейчас нет подарка с эмодзи {target_emoji}."

    balance = await context.bot.get_my_star_balance()
    balance_amount = getattr(balance, "amount", 0)
    price = getattr(gift, "star_count", 0)
    if price > balance_amount:
        return False, f"Недостаточно Stars у бота: нужно {price}, доступно {balance_amount}."

    await context.bot.send_gift(user_id=user_id, gift_id=gift.id)
    return True, f"Подарок отправлен автоматически за {price} ⭐."


def nft_rental_caption(key: str, caption: str) -> str:
    if key not in ("nft", "inputkey", "cupid"):
        return caption
    days = random.randint(3, 7)
    word = "день" if days % 10 == 1 and days % 100 != 11 else "дня" if 2 <= days % 10 <= 4 and not 12 <= days % 100 <= 14 else "дней"
    return caption.replace(
        "⏳ Коллекционный подарок будет закреплён за тобой на 3 дня.",
        f"⏳ Аренда NFT — {days} {word}."
    )


def choose_prize(context: ContextTypes.DEFAULT_TYPE, chat_data: dict, user_id: int | None = None):
    defaults = {key: weight for weight, key, _, _ in PRIZES}
    now = time.time()
    settings = context.bot_data
    weights = settings.get("chance_default", defaults)
    temporary = settings.get("chance_temporary")
    if temporary and temporary.get("until", 0) > now:
        weights = temporary.get("weights", weights)
    if user_id is not None:
        personal = settings.get("chance_users", {}).get(str(user_id))
        if personal and (not personal.get("until") or personal["until"] > now):
            weights = personal.get("weights", weights)
    if settings.get("nft_boost_until", 0) > now:
        key = random.choice(["nft", "inputkey", "cupid"])
        prize = next(item for item in PRIZES if item[1] == key)
        return prize[1], prize[2], nft_rental_caption(prize[1], prize[3])
    roll = random.randrange(100)
    cumulative = 0
    for _, key, title, caption in PRIZES:
        cumulative += int(weights.get(key, defaults[key]))
        if roll < cumulative:
            return key, title, nft_rental_caption(key, caption)
    return PRIZES[0][1:]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("giveaway")


async def send_group_link(message):
    if message:
        await message.reply_text(
            "🎁 Все розыгрыши проходят в нашей группе!",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🎁 Перейти в группу с раздачей", url="https://t.me/freegiftsgroup")
            ]]),
        )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not msg:
        return
    url = os.getenv("MINI_APP_URL", "").strip()
    greeting = "🛠 Панель владельца Челикс Гифтс" if is_owner(update) else "🎁 Профиль, рейтинг и история твоих побед"
    buttons = [[InlineKeyboardButton("🎁 Группа с розыгрышами", url="https://t.me/freegiftsgroup")]]
    if url:
        buttons.insert(0, [InlineKeyboardButton("🎡 Сайт и ежедневная рулетка", web_app=WebAppInfo(url=url.replace("/app", "")))])
        if is_owner(update):
            buttons.insert(1, [InlineKeyboardButton("🛠 Панель владельца", web_app=WebAppInfo(url=url))])
    await msg.reply_text(greeting, reply_markup=InlineKeyboardMarkup(buttons))


async def private_redirect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if is_owner(update):
        await update.effective_message.reply_text(
            ignored_panel_text(context),
            reply_markup=ignored_menu(context),
        )
    else:
        await update.effective_message.reply_text(
            "🎁 Бот используется для розыгрышей в группе.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🎁 Группа с раздачей", url="https://t.me/freegiftsgroup")
            ]]),
        )


def is_owner(update: Update) -> bool:
    user = update.effective_user
    return bool(user and OWNER_ID and user.id == OWNER_ID)


def ignored_users(context: ContextTypes.DEFAULT_TYPE) -> dict:
    return context.bot_data.setdefault("ignored_users", {})


def ignored_menu(context: ContextTypes.DEFAULT_TYPE) -> InlineKeyboardMarkup:
    users = ignored_users(context)
    rows = []
    for user_id, label in list(users.items())[:30]:
        rows.append([InlineKeyboardButton(f"Убрать: {label} ({user_id})", callback_data=f"ignored:remove:{user_id}")])
    rows.append([InlineKeyboardButton("💰 Баланс Stars бота", callback_data="balance:show")])
    rows.append([InlineKeyboardButton("📜 История Stars", callback_data="balance:history")])
    rows.append([InlineKeyboardButton("🔄 Обновить список", callback_data="ignored:refresh")])
    return InlineKeyboardMarkup(rows)


def ignored_panel_text(context: ContextTypes.DEFAULT_TYPE) -> str:
    users = ignored_users(context)
    names = "\n".join(f"• {label} — ID {uid}" for uid, label in list(users.items())[:30])
    return (
        f"🛠 Панель розыгрыша\n\nВ игнор-листе: {len(users)}\n"
        f"{names or 'Список пуст.'}\n\n"
        "Добавление: ответь на сообщение пользователя в группе командой /ignore.\n"
        "Исключённые пользователи получают 👎, их сообщения не засчитываются и они не выигрывают."
    )


async def panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update):
        await update.effective_message.reply_text(
            "🎁 Админ-меню доступно только владельцу. Все розыгрыши проходят в группе.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🎁 Группа с раздачей", url="https://t.me/freegiftsgroup")
            ]]),
        )
        return
    if update.effective_chat.type != "private":
        await update.effective_message.reply_text("Открой меню в личке с ботом: /panel")
        return
    rows = [[InlineKeyboardButton("✨ Открыть Mini App", web_app=WebAppInfo(url=os.getenv("MINI_APP_URL", "https://giveaway-bot-hidden-production.up.railway.app")))]]
    rows.extend(ignored_menu(context).inline_keyboard)
    await update.effective_message.reply_text(ignored_panel_text(context), reply_markup=InlineKeyboardMarkup(rows))


async def ignore_user(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update):
        await update.effective_message.reply_text(
            "🎁 Управление ботом доступно только владельцу. Присоединяйся к группе с раздачей!",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🎁 Группа с раздачей", url="https://t.me/freegiftsgroup")
            ]]),
        )
        return
    msg = update.effective_message
    if not msg or not msg.reply_to_message or not msg.reply_to_message.from_user:
        await msg.reply_text("Ответь командой /ignore на сообщение пользователя, которого нужно исключить.")
        return
    target = msg.reply_to_message.from_user
    if target.is_bot or (OWNER_ID and target.id == OWNER_ID):
        await msg.reply_text("Этого пользователя нельзя добавить в игнор-лист.")
        return
    users = ignored_users(context)
    users[target.id] = f"@{target.username}" if target.username else target.full_name
    await msg.reply_text(f"🚫 {users[target.id]} добавлен в игнор-лист. Его сообщения не влияют на розыгрыш.")


async def ignored_menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return
    if not is_owner(update):
        await query.answer("Нет доступа.", show_alert=True)
        return
    await query.answer()
    data = query.data or ""
    users = ignored_users(context)
    if data.startswith("ignored:remove:"):
        try:
            user_id = int(data.rsplit(":", 1)[1])
        except ValueError:
            return
        users.pop(user_id, None)
    await query.edit_message_text(ignored_panel_text(context), reply_markup=ignored_menu(context))



async def balance_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return
    if not is_owner(update):
        await query.answer("Нет доступа.", show_alert=True)
        return
    await query.answer()
    try:
        balance = await context.bot.get_my_star_balance()
        amount = getattr(balance, "amount", None)
        if amount is None:
            text = "Не удалось прочитать баланс: Telegram вернул неизвестный формат."
        else:
            text = f"💰 Баланс Stars бота: {amount} ⭐\n\nЛичный баланс владельца не затрагивается."
    except Exception:
        log.exception("Could not fetch bot Star balance")
        text = "❌ Не удалось получить баланс Stars бота. Проверь поддержку метода Telegram и повтори позже."
    await query.edit_message_text(text, reply_markup=ignored_menu(context))



async def star_history_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return
    if not is_owner(update):
        await query.answer("Нет доступа.", show_alert=True)
        return
    await query.answer()
    try:
        result = await context.bot.get_star_transactions(limit=10)
        transactions = getattr(result, "transactions", ())
        if not transactions:
            text = "📜 История Stars пока пуста."
        else:
            lines = ["📜 Последние операции Stars бота:"]
            for tx in transactions:
                direction = "➕" if getattr(tx, "amount", 0) > 0 else "➖"
                amount = abs(getattr(tx, "amount", 0))
                date = getattr(tx, "date", None)
                date_text = date.strftime("%d.%m.%Y %H:%M") if date else "дата неизвестна"
                lines.append(f"{direction} {amount} ⭐ — {date_text}")
            text = "\n".join(lines)
    except Exception:
        log.exception("Could not fetch bot Star transactions")
        text = "❌ Telegram не вернул историю Stars. Попробуй позже."
    await query.edit_message_text(text, reply_markup=ignored_menu(context))


async def say_to_groups(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    chat = update.effective_chat
    if not msg or not user or not OWNER_ID or user.id != OWNER_ID:
        await send_group_link(msg)
        return
    if not chat or chat.type != "private":
        await msg.reply_text("Команду /say используй в личке с ботом.")
        return

    text_to_send = " ".join(context.args).strip()
    if not text_to_send:
        await msg.reply_text("Напиши текст так: /say Всем привет! 👋")
        return

    target_chat = "@freegiftsgroup"
    try:
        await context.bot.send_message(
            chat_id=target_chat,
            text=text_to_send,
            parse_mode=ParseMode.MARKDOWN,
            disable_web_page_preview=True,
        )
        await msg.reply_text("✅ Сообщение отправлено в @freegiftsgroup от лица бота.")
    except Exception:
        log.exception("Could not send owner's message to @freegiftsgroup")
        await msg.reply_text(
            "❌ Не получилось отправить. Проверь, что бот добавлен в @freegiftsgroup "
            "и ему разрешено отправлять сообщения."
        )


async def save_owner_media(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    if not user or not OWNER_ID or user.id != OWNER_ID:
        await send_group_link(msg)
        return
    media = None
    filename = "upload"
    mime = "application/octet-stream"
    if msg.photo:
        media = msg.photo[-1]
        filename, mime = "photo.jpg", "image/jpeg"
    elif msg.animation:
        media = msg.animation
        filename = getattr(media, "file_name", None) or "animation.gif"
        mime = "image/gif"
    elif msg.video:
        media = msg.video
        filename = getattr(media, "file_name", None) or "video.mp4"
        mime = getattr(media, "mime_type", None) or "video/mp4"
    elif msg.document:
        media = msg.document
        filename = media.file_name or "document"
        mime = media.mime_type or "application/octet-stream"
    if not media:
        return
    import re
    label = (msg.caption or "").strip().split()[0] if msg.caption else Path(filename).stem
    key = re.sub(r"[^a-zA-Z0-9_-]", "_", label).strip("_").lower()[:48]
    if not key:
        key = "upload"
    if not (mime.startswith("image/") or mime.startswith("video/")):
        await msg.reply_text("Поддерживаются изображения, GIF и MP4. Для документа отправь файл с MIME image/* или video/*.")
        return
    context.bot_data.setdefault("site_media", {})[key] = {
        "file_id": media.file_id, "file_unique_id": media.file_unique_id,
        "filename": filename, "mime_type": mime, "updated_at": time.time()
    }
    await msg.reply_text(
        "✅ Медиа сохранено для сайта!\n"
        f"Ключ: {key}\n"
        f"Формат: {mime}\n"
        f"Открыть: https://giveaway-bot-hidden-production.up.railway.app/media/{key}\n\n"
        "Чтобы заменить файл, отправь новый с тем же ключом в подписи.\n"
        "Примеры подписей: bear_gift, cupid_charm, heart_gift, ice_cream_gift."
    )


def main():
    persistence = PicklePersistence(filepath="giveaway_bot_data.pickle", update_interval=5)
    app = Application.builder().token(BOT_TOKEN).persistence(persistence).post_init(start_server).post_shutdown(stop_server).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("nftboost", nft_boost))
    app.add_handler(CommandHandler("supernftboost", super_nft_boost))
    app.add_handler(CommandHandler("boost", bear_boost))
    app.add_handler(CommandHandler("giveaway_status", giveaway_status))
    app.add_handler(CommandHandler("top", top_wins))
    app.add_handler(CommandHandler("say", say_to_groups))
    app.add_handler(CommandHandler("panel", panel))
    app.add_handler(CommandHandler("ignore", ignore_user))
    app.add_handler(CallbackQueryHandler(balance_callback, pattern=r"^balance:show$"))
    app.add_handler(CallbackQueryHandler(star_history_callback, pattern=r"^balance:history$"))
    app.add_handler(CallbackQueryHandler(ignored_menu_callback, pattern=r"^ignored:"))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & (filters.PHOTO | filters.ANIMATION | filters.VIDEO | filters.Document.ALL), save_owner_media))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & ~filters.PHOTO, private_redirect))
    group_messages = (
        (filters.TEXT & ~filters.COMMAND)
        | filters.PHOTO
        | filters.VIDEO
        | filters.Document.ALL
    )
    app.add_handler(
        MessageHandler(filters.ChatType.GROUPS & group_messages, on_group_message)
    )
    log.info(
        "Giveaway bot is running; message target=%s-%s; prize weights: bear=95%%, bouquet=1%%, heart=1%%, LightSword=1%%, InputKey=1%%, CupidCharm=1%%",
        MIN_MESSAGES, MAX_MESSAGES
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
