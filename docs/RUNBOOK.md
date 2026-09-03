# Runbook

Прод: Caddy → `127.0.0.1:8080` → Compose. Логи: `docker compose -f infra/docker-compose.yml logs -f api`.

## Сайт не открывается

1. `curl -sS https://домен/health` — должен быть `{"status":"ok"}`.
2. `curl -sS https://домен/health/ready` — `postgres` и `redis` true.
3. Если ready 503: `docker compose -f infra/docker-compose.yml ps`, логи `postgres` / `redis` / `api`.
4. Если health 200, а HTML 502: логи `web` и `nginx`. После ребилда API сменился IP — перезапустить `nginx`.

## Заявки не приходят в Telegram

1. `/health/ready` → `"telegram": false` — пустые `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`. На сервере: `./infra/enable-telegram.sh "<token>" "<chat_id>"` (бот: @BotFather; chat id — написать боту и `getUpdates`).
2. Токены есть, в логах `Telegram error` — неверный chat id или бот не писал в чат.
3. Заявка всё равно должна быть в `/admin/orders`.

## PWA-уведомления не приходят

1. Админка открыта по **https** (или localhost). HTTP на телефоне не умеет Web Push.
2. В шапке админки «Включить уведомления» → разрешить в браузере → «Проверить».
3. iPhone: сначала «Поделиться → На экран Домой», открыть ярлык, затем включить уведомления. В обычном Safari пуш не работает.
4. После смены домена или очистки БД подписки сбрасываются — включить ещё раз.

## 401 в админке после деплоя

Сменили `SECRET_KEY` — все сессии мертвы. Войти заново. Пароль из `.env` применяется **только при первом seed** админа.

## Диск забит

Логи json-file max 10m×3. Бэкапы в `backups/` старше 14 дней чистит `backup.sh`. Том `api_uploads` растёт с фото.

## Подозрение на брутфорс `/admin/login`

Nginx 5 req/min + Redis 10 / 15 мин. Смотреть 429 в логах nginx. При необходимости `infra/ufw.sh` и смена пароля.

## SSH только по ключу

С Mac: `./infra/install-ssh-key.sh root@IP`. На сервере: `./infra/harden-ssh.sh`. Проверка: `ssh -o BatchMode=yes root@IP`.

## Скачать бэкап на Mac

На VPS: `./infra/backup.sh`. С Mac: `mkdir -p ~/elite-doors-backups && scp root@IP:/opt/lending-web/backups/doors-*.sql.gz ~/elite-doors-backups/`
