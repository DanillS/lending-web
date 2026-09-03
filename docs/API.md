# HTTP API

Источник правды — FastAPI `openapi.json`. Ниже — то, чем пользуется витрина.

## Публичные

| Метод | Путь | Зачем |
| --- | --- | --- |
| GET | `/health` | liveness (процесс жив) |
| GET | `/health/live` | то же, алиас под k8s-привычку |
| GET | `/health/ready` | Postgres + Redis; 503 если нет |
| GET | `/openapi.json` | схема |
| GET | `/api/v1/products` | каталог, фильтры `q`, `type`, `category`, цена |
| GET | `/api/v1/products/{slug}` | карточка |
| POST | `/api/v1/quote` | расчёт комплекта |
| GET | `/api/v1/handles` | ручки для конфигуратора |
| GET | `/api/v1/cart` | корзина по cookie |
| POST | `/api/v1/cart/items` | положить позицию |
| DELETE | `/api/v1/cart/items/{id}` | убрать |
| POST | `/api/v1/orders` | заявка (honeypot + rate limit) |
| POST | `/api/v1/suggest/address` | подсказки DaData, пустой список если нет ключа или таймаут |
| POST | `/api/v1/phone/normalize` | +7…; DaData cleaner если есть `DADATA_SECRET`, иначе локально |
| GET | `/api/v1/site` | телефон, FAQ, отзывы, флаг `dadata` |

## Админка (`/api/v1/admin`, cookie JWT)

Логин, товары CRUD, загрузка фото, массовые цены, заявки. Swagger на проде не отдаём.

Web Push (PWA): `GET /push/vapid`, `POST /push/subscribe`, `POST /push/unsubscribe`, `POST /push/test`.

## Аутентификация витрины

Нет аккаунтов покупателей. Корзина — httpOnly cookie. Админ — `access_token` / `refresh_token`.
