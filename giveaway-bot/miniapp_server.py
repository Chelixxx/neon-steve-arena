import hashlib
import hmac
import json
import os
import time
import urllib.parse
from pathlib import Path

from aiohttp import web

BOT_TOKEN = os.environ["BOT_TOKEN"]
OWNER_ID_RAW = os.getenv("OWNER_ID", "").strip()
OWNER_ID = int(OWNER_ID_RAW) if OWNER_ID_RAW.isdigit() else None
LABELS = {"bear":"🧸 Мишка","bouquet":"💐 Букет","heart":"💝 Сердечко","nft":"⚔️ Light Sword","inputkey":"🔑 InputKey","cupid":"💗 Cupid Charm"}

NFT_EVENTS = {
    "drop": ("🎁 NFT-ДРОП", "🎁 Открываем NFT-дроп! Участвуй в нашем событии и следи за новостями о выдаче коллекционного подарка."),
    "rare": ("💎 РЕДКИЙ NFT", "💎 Редкий NFT-ивент! Особое событие для поклонников коллекционных подарков. Подробности и итоги — в нашей группе."),
    "collection": ("🖼️ КОЛЛЕКЦИОННЫЙ ДРОП", "🖼️ Коллекционный дроп! Знакомимся с новой подборкой NFT-подарков. Следи за обновлениями и условиями выдачи."),
    "vip": ("👑 VIP NFT-ИВЕНТ", "👑 Специальный VIP NFT-ивент! Отдельное событие для нашего сообщества. Следи за сообщениями организатора."),
    "blitz": ("⚡ NFT-БЛИЦ", "⚡ NFT-БЛИЦ запущен! Короткое событие — подробности и время окончания объявит организатор в чате."),
    "holiday": ("🎉 ПРАЗДНИЧНЫЙ NFT-ДРОП", "🎉 Праздничный NFT-дроп! Отмечаем событие вместе с сообществом и делимся коллекционными подарками."),
}


def validate(init_data):
    try:
        values = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received = values.pop("hash")
        auth_date = int(values.get("auth_date", "0"))
        if abs(time.time() - auth_date) > 86400:
            return None
        check = "\n".join(f"{k}={v}" for k,v in sorted(values.items()))
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        return values if hmac.compare_digest(expected, received) else None
    except Exception:
        return None


def aggregate(application):
    result = {}
    for cd in application.chat_data.values():
        for uid, row in cd.get("prize_wins", {}).items():
            item = result.setdefault(str(uid), {"name": row.get("name", "Участник"), "total": 0, "prizes": {}})
            item["name"] = row.get("name") or item["name"]
            item["total"] += int(row.get("total", 0))
            for key, count in row.get("prizes", {}).items():
                item["prizes"][key] = item["prizes"].get(key, 0) + int(count)
    return result


def auth(request):
    values = validate(request.headers.get("X-Telegram-Init-Data", ""))
    if not values:
        return None
    try:
        return json.loads(values["user"])
    except Exception:
        return None


async def index(request):
    return web.FileResponse(Path(__file__).parent / "site" / "index.html")


async def miniapp(request):
    return web.FileResponse(Path(__file__).parent / "miniapp" / "app.html")


async def site_media(request):
    key = request.match_info.get("key", "")
    record = request.app["bot_app"].bot_data.get("site_media", {}).get(key)
    if not record:
        raise web.HTTPNotFound(text="Media not found")
    try:
        tg_file = await request.app["bot_app"].bot.get_file(record["file_id"])
        data = await tg_file.download_as_bytearray()
    except Exception:
        raise web.HTTPBadGateway(text="Could not retrieve Telegram media")
    response = web.Response(body=bytes(data), content_type=record.get("mime_type", "application/octet-stream"))
    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["Content-Disposition"] = "inline"
    return response

async def data(request):
    user = auth(request)
    if not user:
        return web.json_response({"error":"Не удалось подтвердить Telegram-профиль. Открой приложение кнопкой в боте."}, status=401)
    app = request.app["bot_app"]
    all_wins = aggregate(app)
    uid = str(user["id"])
    profile = all_wins.get(uid, {"name":user.get("first_name","Участник"),"total":0,"prizes":{}})
    top = sorted(all_wins.items(), key=lambda x:x[1]["total"], reverse=True)[:10]
    rank = next((i+1 for i,(key,_) in enumerate(sorted(all_wins.items(),key=lambda x:x[1]["total"],reverse=True)) if key==uid), None)
    owner = bool(OWNER_ID and int(uid)==OWNER_ID)
    return web.json_response({
        "user":{"id":uid,"name":user.get("first_name","Участник"),"username":user.get("username",""),"photo":user.get("photo_url",""),"is_owner":owner},
        "profile":profile,"rank":rank,"sponsor": uid in app.bot_data.get("sponsor_users", {}),
        "top":[{"id":key,**value} for key,value in top],"prize_labels":LABELS,
        "boosts":{"bear_seconds":max(0,int(app.bot_data.get("bear_boost_until",0)-time.time())),"nft_seconds":max(0,int(app.bot_data.get("nft_boost_until",0)-time.time())),"super_nft_seconds":max(0,int(app.bot_data.get("super_nft_boost_until",0)-time.time()))},
        "ignored_count":len(app.bot_data.get("ignored_users",{})) if owner else 0,
        "chance_settings": ({
            "default": app.bot_data.get("chance_default", {"bear":95,"bouquet":1,"heart":1,"nft":1,"inputkey":1,"cupid":1}),
            "temporary": app.bot_data.get("chance_temporary"),
            "users": app.bot_data.get("chance_users", {}),
            "known_users": sorted(
                [{"id":str(v.get("id",k)),"name":v.get("name","Участник"),"username":v.get("username","")}
                 for k,v in app.bot_data.get("known_users",{}).items()],
                key=lambda x:x["name"].lower()
            )
        } if owner else None)
    })



async def support_notify(request):
    user = auth(request)
    if not user:
        return web.json_response({"error":"Открой Mini App через Telegram."}, status=401)
    app = request.app["bot_app"]
    uid = str(user.get("id", ""))
    payload = await request.json()
    method = payload.get("method")
    if method not in ("card", "gift"):
        return web.json_response({"error":"Неизвестный способ поддержки."}, status=400)
    sent = app.bot_data.setdefault("support_notifications", {})
    now = time.time()
    if now - float(sent.get(uid, 0)) < 86400:
        return web.json_response({"error":"Уведомление уже отправлено. Повторить можно через 24 часа."}, status=429)
    if not OWNER_ID:
        return web.json_response({"error":"Владелец ещё не настроен."}, status=503)
    username = ("@" + user["username"]) if user.get("username") else "без username"
    method_label = "перевод по карте (нужно проверить вручную)" if method == "card" else "Stars / подарок (нужно проверить вручную)"
    await app.bot.send_message(
        chat_id=OWNER_ID,
        text=f"💜 Пользователь сообщил о поддержке!\nИмя: {user.get('first_name', 'Участник')}\nUsername: {username}\nTelegram ID: {uid}\nСпособ: {method_label}\nВремя: {time.strftime('%d.%m.%Y %H:%M', time.localtime(now))}"
    )
    sent[uid] = now
    return web.json_response({"ok":True,"message":"Уведомление отправлено владельцу. Перевод будет проверен вручную."})


async def support_info(request):
    if not auth(request):
        return web.json_response({"error":"Открой Mini App через Telegram."}, status=401)
    card = os.getenv("SUPPORT_CARD_NUMBER", "").strip()
    return web.json_response({"card_number": card, "gift_url": "https://t.me/chelixxxs"})


async def spin(request):
    user = auth(request)
    if not user:
        return web.json_response({"error":"Открой сайт через Mini App в Telegram."}, status=401)
    app = request.app["bot_app"]
    uid = str(user["id"])
    today = time.strftime("%Y-%m-%d", time.gmtime())
    spins = app.bot_data.setdefault("daily_site_spins", {})
    is_owner = bool(OWNER_ID and int(uid) == OWNER_ID)
    if not is_owner:
        if spins.get(uid) == today:
            return web.json_response({"error":"Сегодняшняя попытка уже использована. Возвращайся завтра."}, status=409)
        spins[uid] = today
    roll = __import__("random").randrange(100)
    if roll < 5:
        prize = "bear"
        message = "🧸 Поздравляем! Ты выиграл Мишку в ежедневной рулетке. Организатор свяжется для выдачи."
    else:
        prize = "none"
        message = "🍀 Сегодня без выигрыша. Новая бесплатная попытка будет доступна завтра!"
    if prize == "bear" and OWNER_ID:
        try:
            await app.bot.send_message(chat_id=OWNER_ID, text="🎁 Ежедневная рулетка: " + user.get("first_name", "Участник") + " (ID " + uid + ") выиграл Мишку. Нужна выдача.")
        except Exception:
            pass
    try:
        await app.bot.send_message(chat_id=int(uid), text=message, disable_web_page_preview=True)
    except Exception:
        message += " Не удалось написать в личку: открой бота и нажми Start."
    return web.json_response({"ok":True,"prize":prize,"message":message,"unlimited":is_owner})




async def admin(request):
    user = auth(request)
    if not user or not OWNER_ID or int(user.get("id",0)) != OWNER_ID:
        return web.json_response({"error":"Доступ только владельцу."},status=403)
    try:
        payload = await request.json()
        action = payload.get("action")
    except Exception:
        return web.json_response({"error":"Некорректный запрос."},status=400)
    app = request.app["bot_app"]
    if action == "event_publish":
        event_key = str(payload.get("event", ""))
        if event_key not in NFT_EVENTS:
            return web.json_response({"error":"Неизвестный формат NFT-ивента."}, status=400)
        title, message = NFT_EVENTS[event_key]
        try:
            await app.bot.send_message(
                chat_id="@freegiftsgroup",
                text=title + "\n\n" + message + "\n\n💜 Организатор: @chelixxxs",
                disable_web_page_preview=True,
            )
        except Exception:
            return web.json_response({"error":"Не удалось опубликовать. Проверь, что бот добавлен в @freegiftsgroup и может отправлять сообщения."}, status=502)
        return web.json_response({"ok":True,"message":"Ивент опубликован в @freegiftsgroup."})
    if action in ("sponsor_set", "sponsor_remove"):
        target = str(payload.get("target", "")).strip()
        known = app.bot_data.get("known_users", {})
        target_id = target if target in known else next(
            (uid for uid, person in known.items()
             if str(person.get("username", "")).lstrip("@").lower() == target.lstrip("@").lower()),
            None
        )
        if not target_id:
            return web.json_response({"error":"Участник не найден. Введи его Telegram ID или @username после того, как он напишет в группе."}, status=404)
        sponsors = app.bot_data.setdefault("sponsor_users", {})
        if action == "sponsor_set":
            sponsors[target_id] = {"since": time.time(), "name": known[target_id].get("name", "Участник")}
            message = f"Статус «Спонсор» выдан: {known[target_id].get('name', 'Участник')}."
        else:
            sponsors.pop(target_id, None)
            message = f"Статус «Спонсор» снят: {known[target_id].get('name', 'Участник')}."
        return web.json_response({"ok":True,"message":message})
    if action == "chance_save":
        mode = payload.get("mode")
        weights = payload.get("weights")
        keys = ("bear", "bouquet", "heart", "nft", "inputkey", "cupid")
        if not isinstance(weights, dict) or set(weights) != set(keys):
            return web.json_response({"error":"Нужно задать шансы для всех шести призов."},status=400)
        try:
            weights = {key:int(weights[key]) for key in keys}
        except (TypeError, ValueError):
            return web.json_response({"error":"Шансы должны быть целыми числами."},status=400)
        if any(v < 0 or v > 100 for v in weights.values()) or sum(weights.values()) != 100:
            return web.json_response({"error":"Сумма всех шансов должна быть ровно 100%."},status=400)
        minutes = payload.get("minutes", 0)
        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            return web.json_response({"error":"Укажи длительность в минутах."},status=400)
        if mode in ("temporary", "user_temporary") and not 1 <= minutes <= 43200:
            return web.json_response({"error":"Временная настройка: от 1 минуты до 30 дней."},status=400)
        if mode == "default":
            app.bot_data["chance_default"] = weights
            message = "Постоянные шансы для всех сохранены."
        elif mode == "temporary":
            app.bot_data["chance_temporary"] = {"weights":weights,"until":time.time()+minutes*60}
            message = f"Общие шансы применяются {minutes} мин., затем вернутся постоянные."
        elif mode in ("user", "user_temporary"):
            username = str(payload.get("username", "")).strip().lstrip("@").lower()
            if not username:
                return web.json_response({"error":"Введи @username участника."},status=400)
            known = app.bot_data.get("known_users", {})
            target = next((uid for uid, person in known.items()
                           if str(person.get("username", "")).lstrip("@").lower() == username), None)
            if not target:
                return web.json_response({"error":f"@{username} пока не найден. Пусть участник напишет любое сообщение в группе, затем попробуй снова."},status=404)
            record = {"weights":weights}
            if mode == "user_temporary":
                record["until"] = time.time()+minutes*60
            app.bot_data.setdefault("chance_users", {})[target] = record
            person = app.bot_data["known_users"][target].get("name","Участник")
            message = f"Персональные шансы для {person} сохранены."
        elif mode == "user_remove":
            username = str(payload.get("username", "")).strip().lstrip("@").lower()
            known = app.bot_data.get("known_users", {})
            target = next((uid for uid, person in known.items()
                           if str(person.get("username", "")).lstrip("@").lower() == username), None)
            if not target:
                return web.json_response({"error":f"@{username or 'username'} не найден среди участников, которых видел бот."},status=404)
            app.bot_data.setdefault("chance_users", {}).pop(target, None)
            message = f"Персональные шансы для @{username} удалены."
        else:
            return web.json_response({"error":"Неизвестный режим настройки."},status=400)
        return web.json_response({"ok":True,"message":message})
    if action == "bear_boost":
        app.bot_data["bear_boost_until"] = time.time()+180
        app.bot_data["bear_boost_session"] = app.bot_data["bear_boost_until"]
        app.bot_data["bear_boost_message_count"] = 0
        message = "Буст Мишек включён на 3 минуты."
    elif action == "nft_boost":
        app.bot_data["nft_boost_until"] = time.time()+3*24*60*60
        message = "NFT-буст включён на 3 дня. В розыгрышах выпадают Light Sword, InputKey или Cupid Charm."
    elif action == "super_nft_boost":
        app.bot_data["super_nft_boost_until"] = time.time()+180
        app.bot_data["super_nft_boost_session"] = app.bot_data["super_nft_boost_until"]
        message = "Супер-NFT-буст включён на 3 минуты: каждый второй пост выигрывает NFT."
    elif action == "stop_boosts":
        app.bot_data["bear_boost_until"] = 0
        app.bot_data["nft_boost_until"] = 0
        app.bot_data["super_nft_boost_until"] = 0
        message = "Бусты остановлены."
    else:
        return web.json_response({"error":"Неизвестная команда."},status=400)
    return web.json_response({"ok":True,"message":message})


_miniapp_runner = None


async def start_server(bot_app):
    global _miniapp_runner
    app = web.Application(client_max_size=8192)
    app["bot_app"] = bot_app
    app.router.add_get("/", index)
    app.router.add_get("/app", miniapp)
    app.router.add_get("/media/{key}", site_media)
    app.router.add_get("/api/data", data)
    app.router.add_get("/api/support", support_info)
    app.router.add_post("/api/support/notify", support_notify)
    app.router.add_post("/api/admin", admin)
    app.router.add_post("/api/spin", spin)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", int(os.getenv("PORT","8080")))
    await site.start()
    _miniapp_runner = runner


async def stop_server(bot_app):
    global _miniapp_runner
    if _miniapp_runner:
        await _miniapp_runner.cleanup()
        _miniapp_runner = None
