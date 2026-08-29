# MCP для этого репозитория

Cursor уже ходит в браузер (`cursor-ide-browser`) и в Figma. Ниже — что ещё имеет смысл, и что опасно.

## Уже в проекте (`.cursor/mcp.json`)

**Playwright** — агент может гонять сценарии витрины без выдуманного DOM. Нужен Node и первый `npx playwright install chromium` (один раз на машине).

## Добавьте сами, если пользуетесь каждый день

| MCP | Зачем | Секрет |
| --- | --- | --- |
| GitHub | PR, checks, релизы | `GITHUB_TOKEN` с узким scope |
| Sentry | ошибки прода | DSN / org auth после появления `SENTRY_DSN` |
| Context7 / docs | актуальные доки Next/FastAPI | обычно без ключа |

## Не подключайте к проду

- Postgres / Redis MCP с URL из `.env` продакшена — это ключ от заявок и админки в чат.
- Любой «generic SQL» MCP, пока агент не изолирован от сети VPS.

Figma MCP у вас уже есть — для витрины этого достаточно. Kafka/K8s MCP не нужны: стека нет.
