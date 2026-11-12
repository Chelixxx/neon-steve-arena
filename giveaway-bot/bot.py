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
        lower_name = filename.lower()
        if lower_name.endswith(".gif"):
            mime = "image/gif"
        elif lower_name.endswith(".mp4"):
            mime = "video/mp4"
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



async def nft_boost(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not is_owner(update):
        await send_group_link(msg)
        return
    context.bot_data["nft_boost_until"] = time.time() + 3 * 24 * 60 * 60
    await msg.reply_text("💎 NFT-буст активирован на 3 дня! Каждый выигрыш в этот период — случайный NFT: Light Sword, InputKey или Cupid Charm.")


async def super_nft_boost(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not is_owner(update):
        await send_group_link(msg)
        return
    context.bot_data["super_nft_boost_until"] = time.time() + 3 * 60
    context.bot_data["super_nft_boost_session"] = context.bot_data["super_nft_boost_until"]
    await msg.reply_text("💎⚡ СУПЕР-NFT-БУСТ активирован на 3 минуты! Каждое второе сообщение в группе выигрывает случайный NFT: Light Sword, InputKey или Cupid Charm.")


async def bear_boost(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not is_owner(update):
        await send_group_link(msg)
        return
    context.bot_data["bear_boost_until"] = time.time() + 3 * 60
    context.bot_data["bear_boost_session"] = context.bot_data["bear_boost_until"]
    context.bot_data["bear_boost_message_count"] = 0
    await msg.reply_text("🧸 Буст Мишек активирован на 3 минуты! Каждое второе сообщение в группе гарантированно запускает выпадение Мишки.")


async def top_wins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    chat = update.effective_chat
    if not msg or not chat or chat.type not in ("group", "supergroup"):
        if msg:
            await msg.reply_text("Команда /top работает в группе розыгрыша.")
        return

    stats = context.chat_data.get("prize_wins", {})
    ranked = sorted(stats.items(), key=lambda item: item[1].get("total", 0), reverse=True)
    if not ranked:
        await msg.reply_text("🏆 Топ пока пуст — выигравших ещё нет!")
        return

    medals = ["🥇", "🥈", "🥉"]
    lines = ["🏆 ТОП ПОБЕДИТЕЛЕЙ ЭТОЙ ГРУППЫ", ""]
    for index, (user_id, data) in enumerate(ranked[:10]):
        medal = medals[index] if index < len(medals) else f"{index + 1}."
        name = data.get("name") or f"ID {user_id}"
        total = data.get("total", 0)
        prize_counts = data.get("prizes", {})
        breakdown = " · ".join(
            f"{PRIZE_LABELS.get(key, key)}: {count}"
            for key, count in sorted(prize_counts.items()) if count
        )
        lines.append(f"{medal} {name} — {total} побед")
        if breakdown:
            lines.append(f"   {breakdown}")
    await msg.reply_text("\n".join(lines))


async def giveaway_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat = update.effective_chat
    msg = update.effective_message
    if not msg or not user or not OWNER_ID or user.id != OWNER_ID:
        await send_group_link(msg)
        return
    if not chat or chat.type not in ("group", "supergroup"):
        await msg.reply_text("Команду /giveaway_status используй в группе.")
        return

    count = context.chat_data.get("message_count", 0)
    target = context.chat_data.get("message_target")
    if target is None:
        target = random.randint(MIN_MESSAGES, MAX_MESSAGES)
        context.chat_data["message_target"] = target
    await msg.reply_text(f"🎲 Счётчик розыгрыша: {count}/{target} сообщений.")


async def on_group_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if not msg or not user or user.is_bot or not chat:
        return

    excluded = ignored_users(context)
    if user.id in excluded:
        try:
            await context.bot.set_message_reaction(chat_id=chat.id, message_id=msg.message_id, reaction=[ReactionTypeEmoji("👎")])
        except Exception:
            log.exception("Could not react to ignored user's message")
        return

    # Remember groups and real participants seen by the bot for owner-only targeting.
    known_group_ids = context.bot_data.setdefault("known_group_ids", set())
    known_group_ids.add(chat.id)
    known_users = context.bot_data.setdefault("known_users", {})
    known_users[str(user.id)] = {
        "id": user.id,
        "name": user.full_name,
        "username": user.username or "",
        "last_chat_id": chat.id,
    }

    # Super NFT boost takes priority: every second group message wins an NFT.
    super_nft_active = context.bot_data.get("super_nft_boost_until", 0) > time.time()
    forced_nft = False
    bear_boost_active = context.bot_data.get("bear_boost_until", 0) > time.time()
    forced_bear = False
    if super_nft_active:
        session = context.bot_data.get("super_nft_boost_session", 0)
        if context.chat_data.get("super_nft_boost_session") != session:
            context.chat_data["super_nft_boost_session"] = session
            context.chat_data["super_nft_boost_message_count"] = 0
        boost_count = context.chat_data.get("super_nft_boost_message_count", 0) + 1
        context.chat_data["super_nft_boost_message_count"] = boost_count
        if boost_count % 2 == 1:
            try:
                await context.bot.set_message_reaction(chat_id=chat.id, message_id=msg.message_id, reaction=[ReactionTypeEmoji("👎")])
            except Exception:
                log.exception("Could not react to non-winning super NFT boost message")
            return
        forced_nft = True
    elif bear_boost_active:
        # Reset the per-group counter every time the owner starts a new bear boost.
        # The activation timestamp is the session ID and is shared by all groups.
        session = context.bot_data.get("bear_boost_session", 0)
        if context.chat_data.get("bear_boost_session") != session:
            context.chat_data["bear_boost_session"] = session
            context.chat_data["bear_boost_message_count"] = 0
        boost_count = context.chat_data.get("bear_boost_message_count", 0) + 1
        context.chat_data["bear_boost_message_count"] = boost_count
        if boost_count % 2 == 1:
            try:
                await context.bot.set_message_reaction(
                    chat_id=chat.id,
                    message_id=msg.message_id,
                    reaction=[ReactionTypeEmoji("👎")],
                )
            except Exception:
                log.exception("Could not react to non-winning boost message")
            return
        forced_bear = True
    else:
        # Normal giveaway: one random target per round, independently for each group.
        target = context.chat_data.get("message_target")
        if target is None:
            target = random.randint(MIN_MESSAGES, MAX_MESSAGES)
            context.chat_data["message_target"] = target
            context.chat_data["message_count"] = 0

        context.chat_data["message_count"] = context.chat_data.get("message_count", 0) + 1
        count = context.chat_data["message_count"]
        log.info("Group %s giveaway progress: %s/%s", chat.id, count, target)

        if count < target:
            try:
                await context.bot.set_message_reaction(
                    chat_id=chat.id,
                    message_id=msg.message_id,
                    reaction=[ReactionTypeEmoji("👎")],
                )
            except Exception:
                log.exception("Could not react to non-winning message")
            return
    username = f"@{user.username}" if user.username else f"{user.full_name} (без username)"
    group_name = chat.title or str(chat.id)

    if forced_nft:
        prize_key = random.choice(["nft", "inputkey", "cupid"])
        nft = next(item for item in PRIZES if item[1] == prize_key)
        prize_title = nft[2]
        caption = nft_rental_caption(prize_key, nft[3])
    elif forced_bear:
        bear = next(item for item in PRIZES if item[1] == "bear")
        prize_key, prize_title, caption = bear[1], bear[2], bear[3]
    else:
        prize_key, prize_title, caption = choose_prize(context, context.chat_data, user.id)
    log.info("Winner %s in group %s won %s (bear_boost=%s, boost_count=%s)", user.id, chat.id, prize_key, forced_bear, context.chat_data.get("bear_boost_message_count", 0))

    # The owner participates in the public draw, but does not receive a paid gift.
    # Other winners receive a regular Telegram gift from the bot's own Stars balance.
    delivery_ok = False
    delivery_note = "Владелец выиграл: реальный подарок не отправлялся."
    if OWNER_ID and user.id == OWNER_ID:
        log.info("Owner %s won %s; skipping gift delivery", user.id, prize_key)
    elif prize_key == "bear" and context.bot_data.get("bear_boost_until", 0) > time.time():
        delivery_note = "Мишка объявлен; выдача вручную владельцем."
        log.info("Bear boost winner %s; automatic gift delivery skipped for manual handoff", user.id)
    else:
        try:
            delivery_ok, delivery_note = await deliver_prize(context, user.id, prize_key)
            if not delivery_ok:
                log.warning("Gift delivery unavailable for winner %s: %s", user.id, delivery_note)
        except Exception as exc:
            delivery_note = f"Ошибка отправки подарка: {exc}"
            log.exception("Could not deliver gift to winner %s", user.id)

    try:
        if PHOTO_FILE_ID:
            await msg.reply_photo(photo=PHOTO_FILE_ID, caption=caption, parse_mode=ParseMode.MARKDOWN)
        elif IMAGE_PATH.is_file():
            with IMAGE_PATH.open("rb") as photo:
                await msg.reply_photo(photo=photo, caption=caption, parse_mode=ParseMode.MARKDOWN)
        else:
            await msg.reply_text(caption, parse_mode=ParseMode.MARKDOWN)
    except Exception:
        log.exception("Could not post winner announcement")
        return

    # Count only wins whose announcement was successfully posted.
    wins = context.chat_data.setdefault("prize_wins", {})
    user_key = str(user.id)
    entry = wins.setdefault(user_key, {"name": username, "total": 0, "prizes": {}})
    entry["name"] = username
    entry["total"] = entry.get("total", 0) + 1
    prize_counts = entry.setdefault("prizes", {})
    prize_counts[prize_key] = prize_counts.get(prize_key, 0) + 1

    # Start a fresh round only after the announcement was successfully sent.
    context.chat_data["message_count"] = 0
    context.chat_data["message_target"] = random.randint(MIN_MESSAGES, MAX_MESSAGES)
    log.info("New giveaway round in %s: next target=%s", chat.id, context.chat_data["message_target"])

    if OWNER_ID:
        try:
            await context.bot.send_message(
                chat_id=OWNER_ID,
                text=(
                    "🏆 Победитель бесплатного розыгрыша!\n"
                    f"👤 Участник: {username}\n"
                    f"💬 Группа: {group_name}\n"
                    f"🆔 Telegram ID: {user.id}\n"
                    f"🎁 Приз: {prize_title}\n"
                    f"📦 Выдача: {delivery_note}"
                ),
            )
        except Exception:
            log.exception("Could not notify owner")

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
    owner_media = filters.PHOTO | filters.ANIMATION | filters.VIDEO | filters.Document.ALL
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & owner_media, save_owner_media))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & ~owner_media, private_redirect))
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
