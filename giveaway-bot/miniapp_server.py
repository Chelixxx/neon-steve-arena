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
        "profile":profile,"rank":rank,
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


async def start_server(bot_app):
    app = web.Application(client_max_size=8192)
    app["bot_app"] = bot_app
    app.router.add_get("/", index)
    app.router.add_get("/app", miniapp)
    app.router.add_get("/api/data", data)
    app.router.add_post("/api/admin", admin)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", int(os.getenv("PORT","8080")))
    await site.start()
    bot_app.bot_data["miniapp_runner"] = runner


async def stop_server(bot_app):
    runner = bot_app.bot_data.get("miniapp_runner")
    if runner:
        await runner.cleanup()
