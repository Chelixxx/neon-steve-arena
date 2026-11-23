# VOLTRA: запуск Node.js на Layero с Railway PostgreSQL

## Настройки приложения в Layero

- Репозиторий: `Chelixxx/neon-steve-arena`
- Ветка: `layero-railway-postgres` (после проверки можно переключить на `main`)
- Runtime/framework: Node.js
- Build command: не нужен — это приложение без отдельной стадии сборки
- Start command: `npm start`
- Node.js: 18 или новее
- Публичный HTTP-порт: используйте переменную `PORT`, которую выдаёт хостинг. Сервер слушает `0.0.0.0` и этот порт.
- WebSocket: должен быть включён на том же домене, путь `/ws`, с поддержкой Upgrade.

## Подключение к Railway PostgreSQL

В переменные окружения приложения Layero добавьте:

`VOLTRA_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

Значения `USER`, `PASSWORD`, `DATABASE` возьмите из переменных существующего сервиса Railway `voltra-postgres`. Для внешнего хостинга нужен TCP Proxy Railway на порту приложения `5432`; в URL используйте выданные им HOST и PORT, а не приватный Railway hostname.

Не публикуйте URL с паролем в GitHub, HTML, клиентском JavaScript или сообщениях. Задайте его только в секретных environment variables Layero.

## Хранилище приложения

При первом запуске сервер создаёт отдельную схему `voltra_web` и таблицу `voltra_web.state`. В ней лежат данные веб-приложения, ключ сессий и ключи Push. Таблицы Gramsrv и их записи не используются и не меняются.

Если в `DATA_DIR/pulse-store.json` есть старая JSON-база, она используется только для первоначального заполнения новой таблицы. Если такой файл отсутствует, база будет инициализирована пустым состоянием. Не удаляйте старый файл, пока не проверена миграция.

Файлы загрузок остаются в каталоге `DATA_DIR/uploads`. Для сохранения фотографий и вложений между перезапусками задайте `DATA_DIR` на постоянный диск/volume, предоставленный Layero. PostgreSQL сохраняет JSON-состояние, но не сами бинарные файлы.

## Проверка

После запуска в логах должно появиться одно из сообщений:

- `Initialized VOLTRA web state in Railway PostgreSQL (voltra_web.state)`
- `Loaded VOLTRA web state from Railway PostgreSQL (voltra_web.state)`

Если `VOLTRA_DATABASE_URL` задан, но подключение не работает, сервер завершит запуск с ошибкой вместо незаметного перехода на пустую локальную базу.

Проверка синтаксиса: `npm run check`.
