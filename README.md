# Shiki MX App 🎬

> Современное, быстрое и адаптивное веб-приложение для клиентов платформы [Shikimori](https://shikimori.one): личный кабинет, каталоги аниме и манги, расписание онгоингов, форум, списки, интеграция с Shikimori OAuth 2.0 и встроенный мультипровайдерный плеер.

[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/mxmpx/shikimxapp/actions/workflows/ci.yml/badge.svg)](https://github.com/mxmpx/shikimxapp/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-43%20Passed-brightgreen)](https://github.com/mxmpx/shikimxapp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 О проекте

**Shiki MX App** — это клиент для Shikimori с акцентом на скорость, эстетику и удобство как на десктопах, так и на смартфонах. Приложение объединяет функционал трекера списков, каталога с гибкими фильтрами, календаря онгоингов, новостей сообщества и онлайн-просмотра аниме в единый интерфейс.

### Архитектурные особенности:
- **Современный Frontend:** Single Page Application (SPA) на базе **React 19**, **TypeScript** и **Vite 8** с утилитами **Tailwind CSS v4** и семантическими дизайн-токенами (`mxstyle2`).
- **Модульный Backend:** RESTful API на **Python 3.13 / Flask 3.x** с разделением на специализированные Blueprints, многоуровневым кэшированием (RAM SWR + SQLite WAL) и параллельной сборкой данных через **GraphQL**.
- **Безопасность (Security Hardened):** Централизованная политика **Content Security Policy (CSP)** с защитой от XSS/clickjacking и бесшовным встраиванием проверенных видео-CDN (Kodik, AnimeGo, AniLibria, YouTube).
- **PWA и адаптивность:** Поддержка установки как прогрессивного веб-приложения (PWA) на Android, iOS, Windows и macOS с оффлайн-кэшированием шрифтов и ассетов.

---

## 🚀 Ключевые возможности

### 1. 🔒 Авторизация и списки пользователя
- **Shikimori OAuth 2.0:** Безопасный вход с чтением и сохранением профиля.
- **Интерактивное управление списками («Мой список»):**
  - Смена статусов (*«Смотрю»*, *«В планах»*, *«Просмотрено»*, *«Отложено»*, *«Брошено»*).
  - Быстрый инкремент просмотренных серий (`+1`).
  - Оценка тайтла (1–10 золотых звёзд), текстовые заметки, синхронизация с Shikimori API v2.
  - Мгновенная инвалидация локального кэша списков без лишних перезагрузок страницы.

### 2. 📺 Мультипровайдерный онлайн-плеер
- **Агрегация источников:** Сбор видеопотоков из баз Kodik, AnimeGo, AniLibria и YummyAnime с нормализацией озвучек и разделением по зеркалам.
- **Умное переключение:** Автоматическое сохранение выбранной озвучки при смене серии (`След. серия` / `Пред. серия`).
- **Полноэкранный кинотеатральный режим (Theater / Fullscreen):**
  - Адаптивное открытие на мобильных телефонах и планшетах с поддержкой горизонтальной и вертикальной ориентации.
  - Выделенные элементы управления с учётом зон выреза экрана (`env(safe-area-inset-*)`).
  - Кнопка быстрого выхода, оверлей с информацией о серии и озвучке.
- **Мини-плеер (PiP):** Возможность свернуть видео в компактный плавающий режим при навигации по сайту.
- **«Продолжить просмотр»:** Локальное сохранение истории просмотренных серий и тайтлов.

### 3. 🖼️ Галерея постеров и кадров (Lightbox Portal)
- Просмотр оригинальных обложек и кадров тайтлов (до 50+ скриншотов).
- Реализация через **React Portal** на уровне `document.body` с наивысшим `z-index` (хедер сайта не перекрывает кнопки).
- Поддержка мобильных тач-свайпов: свайп влево/вправо для перелистывания, свайп вниз для закрытия.
- Интерактивная горизонтальная лента миниатюр с автоматическим скроллом к активному кадру.

### 4. 🧭 12 самостоятельных разделов базы данных
1. **Каталог аниме:** Гибкие фильтры по жанрам, сезонам, годам, типам (TV, Movie, OVA) и статусам.
2. **Топ 100:** Ранжированные списки лучших аниме, фильмов, онгоингов и манги.
3. **Каталог манги:** Фильтрация по типам (манхва, маньхуа, додзинси, ваншоты) и статусам публикации.
4. **Каталог ранобэ:** Полноценный каталог новелл и ранобэ.
5. **Календарь онгоингов:** Расписание выхода серий по дням недели с таймзонами.
6. **Форум:** Темы сообщества с сортировкой по популярности и категориям.
7. **Клубы:** Каталог популярных сообществ и поиск клубов.
8. **Коллекции:** Пользовательские подборки тайтлов.
9. **Рецензии:** Подробные критические обзоры и мнения зрителей.
10. **Статьи:** Аналитические статьи и гайды от авторов сообщества.
11. **Пользователи:** Поиск профилей и активность друзей.
12. **Рекомендации & «Мне повезёт»:** Персональный подбор тайтлов и генератор случайного аниме.

### 5. ♿ Дизайн-система, темы и доступность (A11y)
- **Светлая и тёмная темы:** Семантические CSS-токены в `index.css` без жёстко закодированных цветов.
- **Доступность (WCAG 2.1 AA):** Чёткие контуры фокуса `focus-visible`, корректные `aria-label` для всех кнопок-иконок, модальные диалоги с `role="dialog"` и закрытием по клавише `Escape`.
- **Микровзаимодействия и анимации:** Выверенные тайминги переходов (120–220 мс), поддержка системного режима `prefers-reduced-motion: reduce`.

---

## 🛠️ Стек технологий

| Область | Технологии |
|---|---|
| **Frontend** | React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, Lucide/Tabler Icons |
| **Backend** | Python 3.12 / 3.13, Flask 3.x, Gunicorn, Requests, GraphQL |
| **База данных & Кэш** | SQLite 3 (WAL mode), Memory SWR Cache, Tiered Storage |
| **PWA & Оффлайн** | Service Worker API (`shikimx-v3-react`), Web App Manifest |
| **Тестирование & Линтинг** | Pytest, pytest-mock, Stylelint, Prettier, TypeScript (`tsc --noEmit`) |
| **DevOps & Контейнеризация** | Docker (multi-stage build), Docker Compose, GitHub Actions |

---

## 📂 Структура проекта

```text
shikimxapp/
├── .github/workflows/ci.yml       # GitHub Actions CI/CD пайплайн
├── Dockerfile                     # Multi-stage сборка (Node builder + Python runner)
├── docker-compose.yml             # Контейнеризированный запуск сервиса
├── gunicorn.conf.py               # Конфигурация production WSGI сервера
├── wsgi.py                        # WSGI точка входа для Gunicorn
├── run.py                         # Скрипт локального запуска Flask dev-сервера
├── app.py                         # Фабрика Flask-приложения, CSP и безопасность
├── database.py                    # Инициализация SQLite базы и миграции
├── logging_config.py              # Структурированное цветное логирование
├── pytest.ini                     # Конфигурация тестового раннера
├── requirements.txt               # Зависимости Python (production)
├── requirements-dev.txt           # Зависимости Python для разработки и тестов
├── security.py                    # Валидация входных параметров и защита
│
├── frontend/                      # Исходный код React SPA
│   ├── index.html                 # Шаблон точки входа Vite
│   ├── package.json               # Зависимости и npm-скрипты
│   ├── tsconfig.json              # Конфигурация TypeScript
│   ├── vite.config.ts             # Конфигурация сборки Vite в static/dist
│   └── src/
│       ├── main.tsx               # Bootstrap приложения React 19
│       ├── App.tsx                # Корневой маршрутизатор и оркестрация табов
│       ├── index.css              # Дизайн-токены, Tailwind v4, темы, адаптив
│       ├── api/client.ts          # Типизированный HTTP API-клиент
│       ├── types/anime.ts         # TypeScript-интерфейсы моделей данных
│       ├── config/appConfig.ts    # Конфигурация оформления и фиче-флаги
│       ├── components/            # Переиспользуемые UI-компоненты
│       │   ├── AppHeader.tsx      # Верхняя панель с поиском, меню и табами
│       │   ├── AnimeModal.tsx     # Полноэкранный детальный модал аниме
│       │   ├── MangaModal.tsx     # Полноэкранный детальный модал манги
│       │   ├── ErrorBoundary.tsx  # Перехват и локализация React-ошибок
│       │   ├── MxSelect.tsx       # Доступные кастомные выпадающие списки
│       │   └── anime_modal/       # Компоненты модала: плеер, трекер, кадры
│       └── views/                 # Страницы разделов (Explore, Catalog, Rates...)
│
├── services/                      # Сервисный слой бэкенда
│   ├── api_client.py              # Отказоустойчивый HTTP-клиент с ретраями
│   ├── cache_utils.py             # Потокобезопасный LRU-кэш BoundedDict
│   ├── tiered_cache.py            # Двухуровневый кэш (RAM SWR + SQLite)
│   ├── rates_cache.py             # Специализированный кэш списков
│   ├── poster_resolver.py         # Пакетное обогащение постеров через GraphQL
│   ├── formatters.py              # Нормализация текстов и дат
│   └── video_aggregator.py        # Мультипровайдерный парсер видеопотоков
│
├── routes/                        # Модульные Blueprints Flask
│   ├── auth.py                    # Shikimori OAuth 2.0 авторизация
│   ├── anime.py                   # Детали аниме, кадры, связанные тайтлы
│   ├── manga.py                   # Детали манги и тома
│   ├── catalog.py                 # Фильтрация и пагинация каталогов
│   ├── rates.py                   # Синхронизация списков User Rates
│   ├── calendar.py                # Расписание онгоингов
│   ├── explore.py                 # Главная витрина и новости
│   ├── forum.py                   # Темы форума
│   ├── news.py                    # Новости аниме-индустрии
│   ├── media.py                   # Проксирование и кэширование изображений
│   ├── history.py                 # История просмотров
│   └── settings.py                # Пользовательские настройки интерфейса
│
├── static/                        # Статические ресурсы
│   ├── dist/                      # Скомпилированный production-бандл React
│   ├── manifest.json              # Манифест PWA
│   ├── sw.js                      # Service Worker кэширования
│   └── css/fonts.css              # Локальные шрифты и иконки
│
└── tests/                         # Автоматические тесты (Pytest)
    ├── conftest.py                # Фикстуры приложения и моки БД
    ├── test_health.py             # Тесты эндпоинта /health
    ├── test_cache.py              # Тесты SWR и tiered-кэша
    ├── test_database.py           # Тесты целостности SQLite
    ├── test_api_endpoints.py      # Интеграционные тесты API
    ├── test_security.py           # Тесты безопасности, санитизации и заголовков
    └── test_video_aggregator.py   # Тесты парсеров и агрегатора
```

---

## ⚡ Быстрый старт

### Требования
- **Python:** 3.12 или 3.13
- **Node.js:** 20+ и **npm**
- **Git**

### 1. Клонирование репозитория
```bash
git clone https://github.com/mxmpx/shikimxapp.git
cd shikimxapp
```

### 2. Настройка виртуального окружения Python
```bash
# Создание виртуального окружения
python -m venv .venv

# Активация:
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

### 3. Конфигурация переменных окружения (`.env`)
Создайте файл `.env` в корне проекта на основе `.env.example`:
```env
FLASK_SECRET_KEY=generate-a-strong-random-key-here
SHIKIMORI_CLIENT_ID=your-shikimori-oauth-client-id
SHIKIMORI_CLIENT_SECRET=your-shikimori-oauth-client-secret
SHIKIMORI_REDIRECT_URI=http://127.0.0.1:5000/auth/callback
SHIKIMORI_APP_NAME=ShikiMXApp/1.0
HOST=127.0.0.1
PORT=5000
```

> **Где взять ключи OAuth?** Зарегистрируйте приложение в [OAuth Applications на Shikimori](https://shikimori.one/oauth/applications) с Redirect URI `http://127.0.0.1:5000/auth/callback` и правами доступа `user_rates`, `comments`, `topics`.

### 4. Сборка фронтенда
```bash
# Установка npm-зависимостей
npm --prefix frontend install

# Сборка production-бандла в static/dist
npm --prefix frontend run build
```

### 5. Запуск сервера
```bash
python run.py
```
Приложение откроется по адресу: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💻 Режим разработки (Hot Reload)

Для одновременной разработки бэкенда и фронтенда с горячей перезагрузкой модулей (HMR):

1. **Терминал 1 (Flask API):**
   ```bash
   python run.py
   ```
2. **Терминал 2 (Vite Dev Server):**
   ```bash
   npm --prefix frontend run dev
   ```
Интерфейс разработчика будет доступен на **`http://127.0.0.1:5173`** с автоматическим проксированием запросов `/api` и `/static` на порт 5000.

---

## 🐳 Запуск в Docker

Для запуска контейнеризированной версии через Docker Compose:

```bash
# Сборка и запуск контейнера
docker-compose up -d --build

# Проверка логов
docker-compose logs -f

# Остановка
docker-compose down
```

Контейнер использует многоэтапную сборку: сначала собирает React-ассеты в Node-окружении, затем упаковывает легковесный Python WSGI образ с запуском через **Gunicorn**.

---

## 🧪 Тестирование и качество кода

### Backend тесты (Pytest)
```bash
# Запуск полного набора тестов
pytest -v

# Запуск тестов безопасности и заголовков
pytest tests/test_security.py -v
```

### Проверка типов фронтенда
```bash
npm --prefix frontend run typecheck
```

### Форматирование и Stylelint
```bash
npm --prefix frontend run format:check
npm --prefix frontend run lint:css
```

---

## 🛡️ Безопасность и CSP

Приложение реализует строгие политики безопасности веб-стандартов:
- **Content-Security-Policy (CSP):** Защита от межсайтового скриптинга (XSS), запрет небезопасных плагинов (`object-src 'none'`), изоляция контекста выполнения.
- **Безопасный стриминг:** Директива `frame-src 'self' https: blob:` разрешает подключение только проверенных HTTPS видеопотоков и зеркал.
- **Защита сессий:** Cookie флагов `HttpOnly`, `SameSite=Lax` и динамическая генерация CSRF-токенов при взаимодействии с API.
- **Rate Limiting & Retries:** Интеллектуальная обработка кодов 429 от Shikimori API с экспоненциальной задержкой.

---

## 📜 Лицензия

Проект распространяется под лицензией **MIT**. Подробная информация находится в файле [LICENSE](LICENSE).

---

<p align="center">
  Разработано с ❤️ для любителей аниме и манги.
</p>
