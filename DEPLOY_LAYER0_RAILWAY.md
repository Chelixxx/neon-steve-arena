# VOLTRA: запуск Node.js на Layero с Railway PostgreSQL

## Настройки приложения в Layero

- Репозиторий: `Chelixxx/neon-steve-arena`
- Ветка: `layero-railway-postgres` (после проверки можно переключить на `main`)
- Runtime/framework: Node.js
- Build command: не нужен — это Node-приложение без отдельной стадии сборки
- Start command: `npm start`
- Node.js: 18 или новее
- Порт: используйте переменную `PORT`, которую выдаёт хостинг. Сервер слушает `0.0.0.0` и этот порт.
- WebSocket: на том же домене, путь `/ws`, с поддержкой WebSocket Upgrade.

## Подключение к Railway PostgreSQL

В переменные окружения приложения Layero добавьте секрет:

`VOLTRA_DATABASE_URL=postgresql://USER:PASSWORD@shinkansen.proxy.rlwy.net:41108/DATABASE?sslmode=require`

Это внешний TCP endpoint существующего Railway-сервиса `voltra-postgres` (порт приложения PostgreSQL — 5432). Значения `USER`, `PASSWORD`, `DATABASE` возьмите в Variables этого сервиса Railway: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

Если пароль содержит специальные символы, URL-кодируйте username и password перед вставкой в URI. Сам URL с паролем задайте только в секретных Environment Variables Layero. Не помещайте его в GitHub, HTML, клиентский JavaScript или сообщения.

## Хранилище приложения

При первом запуске сервер создаёт отдельную схему `voltra_web` и таблицу `voltra_web.state`. В ней хранятся данные веб-приложения, ключ сессий и ключи Push. Таблицы Gramsrv и их записи не используются и не меняются.

Если в `DATA_DIR/pulse-store.json` есть старая JSON-база, она используется только для первоначального заполнения новой таблицы. Если такого файла нет, состояние создаётся из пустого шаблона. Не удаляйте старый файл, пока не проверена миграция.

Файлы загрузок остаются в каталоге `DATA_DIR/uploads`. Для сохранения фотографий и вложений между перезапусками задайте `DATA_DIR` на постоянный диск/volume, предоставленный Layero. PostgreSQL сохраняет JSON-состояние, но не сами бинарные файлы.

## Проверка

После запуска в логах должно появиться одно из сообщений:

- `Initialized VOLTRA web state in Railway PostgreSQL (voltra_web.state)`
- `Loaded VOLTRA web state from Railway PostgreSQL (voltra_web.state)`

Если `VOLTRA_DATABASE_URL` задан, но подключение не работает, сервер завершит запуск с ошибкой вместо незаметного перехода на пустое локальное хранилище.

Проверка синтаксиса: `npm run check`.
