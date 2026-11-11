import logging
import os
import random
import time
from pathlib import Path

from telegram import Update, ReactionTypeEmoji, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters, PicklePersistence

BOT_TOKEN = os.environ["BOT_TOKEN"]
OWNER_ID_RAW = os.getenv("OWNER_ID", "").strip()
OWNER_ID = int(OWNER_ID_RAW) if OWNER_ID_RAW.isdigit() else None
PHOTO_FILE_ID = os.getenv("GIVEAWAY_PHOTO_FILE_ID", "").strip()
MIN_MESSAGES = 1
MAX_MESSAGES = 15
IMAGE_PATH = Path(__file__).parent / "assets" / "giveaway.jpg"

PRIZES = [
    (97, "bear", "🧸 МИШКА", (
        "🎉 Поздравляю!\n"
        "🎁 Ты выиграл Мишку 🧸 от @Chelixxx\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Пишите сообщения в чате и получайте возможность тоже выиграть подарок!\n\n"
        "🎀 Также вы можете выбить подарок у @aftter в его чате — @chatikloxssy"
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
        "👑 Во время специального бонуса шанс выпадения — 100%!\n"
        "✅ Организатор свяжется с тобой для выдачи подарка."
    )),
]


def choose_prize(context: ContextTypes.DEFAULT_TYPE):
    roll = random.randrange(100)
    cumulative = 0
    for weight, key, title, caption in PRIZES:
        cumulative += weight
        if roll < cumulative:
            return key, title, caption
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
    if is_owner(update):
        await msg.reply_text(
            "🛠 Админ-панель розыгрыша\\n\\n"
            "Управляй исключёнными пользователями и настройками бота.",
            reply_markup=ignored_menu(context),
        )
    else:
        await msg.reply_text(
            "🎁 Все розыгрыши проходят в нашей группе!",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🎁 Перейти в группу с раздачей", url="https://t.me/freegiftsgroup")
            ]]),
        )


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
    await update.effective_message.reply_text(ignored_panel_text(context), reply_markup=ignored_menu(context))


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


async def save_owner_photo_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not user or not OWNER_ID or user.id != OWNER_ID:
        await send_group_link(update.effective_message)
        return
    photo_id = update.effective_message.photo[-1].file_id
    await update.effective_message.reply_text(
        "Фото получено. Скопируй этот ID в Railway → Variables как GIVEAWAY_PHOTO_FILE_ID:\n\n"
        + photo_id
    )


async def nft_boost(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not is_owner(update):
        await send_group_link(msg)
        return
    context.bot_data["nft_boost_until"] = time.time() + 5 * 60
    await msg.reply_text("⚔️ NFT Light Sword активирован с шансом 100% на следующие 5 минут!")


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

    # Remember every group where the bot receives a user message.
    known_group_ids = context.bot_data.setdefault("known_group_ids", set())
    known_group_ids.add(chat.id)

    # One random target per round, independently for each group.
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

    prize_key, prize_title, caption = choose_prize(context)
    log.info("Winner %s in group %s won %s", user.id, chat.id, prize_key)

    try:
        if PHOTO_FILE_ID:
            await msg.reply_photo(photo=PHOTO_FILE_ID, caption=caption, parse_mode=ParseMode.MARKDOWN)
        elif IMAGE_PATH.is_file():
            with IMAGE_PATH.open("rb") as photo:
                await msg.reply_photo(photo=photo, caption=caption)
        else:
            await msg.reply_text(caption, parse_mode=ParseMode.MARKDOWN)
    except Exception:
        log.exception("Could not post winner announcement")
        return

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
                    "🎁 Выдачу реального подарка подтверди вручную."
                ),
            )
        except Exception:
            log.exception("Could not notify owner")


def main():
    persistence = PicklePersistence(filepath="giveaway_bot_data.pickle", update_interval=5)
    app = Application.builder().token(BOT_TOKEN).persistence(persistence).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("giveaway_status", giveaway_status))
    app.add_handler(CommandHandler("say", say_to_groups))
    app.add_handler(CommandHandler("panel", panel))
    app.add_handler(CommandHandler("ignore", ignore_user))
    app.add_handler(CallbackQueryHandler(ignored_menu_callback, pattern=r"^ignored:"))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.PHOTO, save_owner_photo_id))
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
        "Giveaway bot is running; message target=%s-%s; prize weights: bear=97%%, bouquet=1%%, heart=1%%, nft=1%%",
        MIN_MESSAGES, MAX_MESSAGES
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
