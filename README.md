# Morrison Premium Transfer — Static Multi-page Website

Готовый статический сайт для GitHub Pages под сервис премиальных частных трансферов по Бразилии и Южной Америке.

## Структура

- `index.html` — главная страница
- `brazil-transfers.html` — междугородние трансферы по Бразилии
- `airport-transfer.html` — трансферы в/из аэропортов (FLN / POA)
- `international.html` — международные маршруты (Уругвай / Парагвай)
- `partners.html` — страница для партнёров
- `contact.html` — контакты и бронирование
- `balneario-camboriu.html` — SEO страница
- `porto-alegre.html` — SEO страница
- `florianopolis.html` — SEO страница
- `assets/style.css` — общие стили
- `assets/script.js` — мобильное меню, активный пункт навигации, год в футере
- `assets/images/hero-car.svg` — легкое бренд-изображение
- `favicon.svg` — favicon

## Быстрый запуск локально

Откройте `index.html` в браузере **или** поднимите любой простой static server.

## GitHub Pages

1. Push в ветку `main`.
2. Включите Pages в настройках репозитория (`Deploy from a branch`).
3. Укажите branch/folder, где лежат HTML-файлы (обычно root).

## Что редактировать чаще всего

- Контент страниц: соответствующие `*.html`
- Визуальный стиль: `assets/style.css`
- Контакты и CTA-ссылки WhatsApp/Telegram: во всех `*.html`
- SEO title/description/OG: `<head>` каждой страницы

> Перед публикацией замените `https://yourdomain.com/...` в canonical/og:url на фактический домен GitHub Pages или ваш кастомный домен.
