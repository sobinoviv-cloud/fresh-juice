# Fresh Juice

Ежедневный журнал JUICE о рынке видеоконтента. Сайт: https://sobinoviv-cloud.github.io/fresh-juice/

- `index.html` — страница журнала (последний выпуск + архив «Все выпуски»).
- `data/index.json` — список выпусков и настройки; `data/<issue_id>.json` — выпуск.
- `img/<story_id>.webp`, `img/<story_id>-s.webp` — картинки новостей.
- `<дата>/` (например `2026-10-28/`) — постоянная ссылка на выпуск с превью для Telegram; `og/<issue_id>.jpg` — картинка превью.
- `tools/make_og.js` — генерирует превью и страницу выпуска: `node tools/make_og.js <issue_id>`.
