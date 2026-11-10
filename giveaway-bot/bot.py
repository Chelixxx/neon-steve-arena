import logging
import os
import random
from pathlib import Path

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.environ["BOT_TOKEN"]
OWNER_ID_RAW = os.getenv("OWNER_ID", "").strip()
OWNER_ID = int(OWNER_ID_RAW) if OWNER_ID_RAW.isdigit() else None
WIN_CHANCE = float(os.getenv("WIN_CHANCE", "0.07"))
PHOTO_FILE_ID = os.getenv("GIVEAWAY_PHOTO_FILE_ID", "").strip()
IMAGE_PATH = Path(__file__).parent / "assets" / "giveaway.jpg"

CAPTION = (
    "🎉 Поздравляю!\n"
    "🎁 Ты выиграл Мишка 🧸 от @Chelixxx\n"
    "✅ Подарок отправлен.\n\n"
    "🚨 Пишите сообщения в чате и получайте возможность так же залутать подарки!\n\n"
    "🎀 Также вы можете выбить мишку у @aftter в его чате — @chatikloxssy"
)

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


async def on_group_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if not msg or not user or user.is_bot or not chat:
        return

    # Every eligible group message is an independent free 7% giveaway roll.
    if random.random() >= WIN_CHANCE:
        return

    username = f"@{user.username}" if user.username else f"{user.full_name} (без username)"
    group_name = chat.title or str(chat.id)

    try:
        if PHOTO_FILE_ID:
            await msg.reply_photo(photo=PHOTO_FILE_ID, caption=CAPTION)
        elif IMAGE_PATH.is_file():
            with IMAGE_PATH.open("rb") as photo:
                await msg.reply_photo(photo=photo, caption=CAPTION)
        else:
            await msg.reply_text(CAPTION)
    except Exception:
        log.exception("Could not post winner announcement")
        return

    if OWNER_ID:
        try:
            await context.bot.send_message(
                chat_id=OWNER_ID,
                text=(
                    "🏆 Победитель бесплатного розыгрыша!\n"
                    f"👤 Участник: {username}\n"
                    f"💬 Группа: {group_name}\n"
                    f"🆔 Telegram ID: {user.id}\n"
                    "🎁 Выдачу реального подарка подтверди вручную."
                ),
            )
        except Exception:
            log.exception("Could not notify owner")


def main():
    if not 0 < WIN_CHANCE <= 1:
        raise SystemExit("WIN_CHANCE must be > 0 and <= 1")
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.PHOTO, save_owner_photo_id))
    app.add_handler(
        MessageHandler(
            filters.ChatType.GROUPS & (filters.TEXT | filters.PHOTO | filters.VIDEO | filters.Document.ALL),
            on_group_message,
        )
    )
    log.info("Giveaway bot is running; win chance=%s", WIN_CHANCE)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
