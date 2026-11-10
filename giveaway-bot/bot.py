import logging
import os
import random
from pathlib import Path

from telegram import Update, ReactionTypeEmoji
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.environ["BOT_TOKEN"]
OWNER_ID_RAW = os.getenv("OWNER_ID", "").strip()
OWNER_ID = int(OWNER_ID_RAW) if OWNER_ID_RAW.isdigit() else None
PHOTO_FILE_ID = os.getenv("GIVEAWAY_PHOTO_FILE_ID", "").strip()
MIN_MESSAGES = 1
MAX_MESSAGES = 15
IMAGE_PATH = Path(__file__).parent / "assets" / "giveaway.jpg"

PRIZES = [
    (81, "bear", "🧸 МИШКА", (
        "🎉 Поздравляю!\n"
        "🎁 Ты выиграл Мишку 🧸 от @Chelixxx\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Пишите сообщения в чате и получайте возможность тоже выиграть подарок!\n\n"
        "🎀 Также вы можете выбить подарок у @aftter в его чате — @chatikloxssy"
    )),
    (10, "bouquet", "💐 БУКЕТ — ДЖЕКПОТ", (
        "💐 ВОТ ЭТО УДАЧА!\n"
        "🎁 Ты сорвал ДЖЕКПОТ и выиграл БУКЕТ! 🌹\n"
        "👑 Такой выигрыш выпадает не каждый день!\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Продолжайте писать — впереди ещё розыгрыши!\n"
        "🎀 @chatikloxssy"
    )),
    (9, "heart", "💝 СЕРДЕЧКО — ДЖЕКПОТ", (
        "💗 НЕВЕРОЯТНО!\n"
        "🎁 Ты выиграл ДЖЕКПОТ — СЕРДЕЧКО! 💝\n"
        "✨ Сегодня удача явно на твоей стороне!\n"
        "✅ Организатор свяжется с тобой для выдачи подарка.\n\n"
        "🚨 Пишите сообщения, участвуйте в розыгрышах и ловите подарки!\n"
        "🎀 @chatikloxssy"
    )),
]


def choose_prize():
    roll = random.randrange(100)
    cumulative = 0
    for weight, key, title, caption in PRIZES:
        cumulative += weight
        if roll < cumulative:
            return key, title, caption
    return PRIZES[0][1:]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("giveaway")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        "Я работаю 🎁 Добавь меня в группу. Владелец должен нажать /start в личке, "
        "а Privacy Mode нужно отключить через @BotFather → /setprivacy → Disable."
    )


async def save_owner_photo_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not user or not OWNER_ID or user.id != OWNER_ID:
        return
    photo_id = update.effective_message.photo[-1].file_id
    await update.effective_message.reply_text(
        "Фото получено. Скопируй этот ID в Railway → Variables как GIVEAWAY_PHOTO_FILE_ID:\n\n"
        + photo_id
    )


async def giveaway_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat = update.effective_chat
    msg = update.effective_message
    if not msg or not user or not OWNER_ID or user.id != OWNER_ID:
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

    prize_key, prize_title, caption = choose_prize()
    log.info("Winner %s in group %s won %s", user.id, chat.id, prize_key)

    try:
        if PHOTO_FILE_ID:
            await msg.reply_photo(photo=PHOTO_FILE_ID, caption=caption)
        elif IMAGE_PATH.is_file():
            with IMAGE_PATH.open("rb") as photo:
                await msg.reply_photo(photo=photo, caption=caption)
        else:
            await msg.reply_text(caption)
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
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("giveaway_status", giveaway_status))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.PHOTO, save_owner_photo_id))
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
        "Giveaway bot is running; message target=%s-%s; prize weights: bear=81%%, bouquet=10%%, heart=9%%",
        MIN_MESSAGES, MAX_MESSAGES
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
