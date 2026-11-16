# План мобильной адаптации Shiki MX App

| Параметр | Значение |
|---|---|
| Статус | Перепроверен после начала реализации: часть работ выполнена, есть блокирующие дефекты |
| Область | Frontend: `frontend/src`, `frontend/index.html`, PWA, `static/dist` |
| Дата первичного аудита | Ноябрь 2026 |
| Дата перепроверки | 16.11.2026 |
| Связанные документы | `docs/MIGRATION_ROADMAP.md`, `DEVELOPMENT.md` |

> В рамках перепроверки код приложения **не изменялся**. Был пересобран `static/dist` (каталог в `.gitignore`, в репозиторий не попадает). Все измерения ниже сделаны на реально запущенном приложении (Flask + Chromium/Playwright).

---

## 1. Краткое резюме

Сайт — React 19 SPA (Vite) поверх Flask. Стили — преимущественно inline в TSX плюс один `index.css` (2103 строки). Мобильная адаптация уже не «в планах»: в рабочем дереве есть незакоммиченная реализация (48 изменённых файлов, +677/−241, два новых компонента навигации).

### Что уже работает

- Мета `viewport-fit=cover`, `interactive-widget=resizes-content`, PWA-мета, `theme-color` под тёмную/светлую тему.
- Мобильный слой в `index.css`: токены `--page-gutter`, `--card-min`, `--bottom-nav-height`, `--modal-pad`; 16 px для полей на `pointer: coarse`; `.page-container`; `.responsive-card-grid`; нижняя навигация; полноэкранный sheet; overlay-поиск; safe-area; `.modal-mobile-sheet`.
- Нижняя навигация из 5 слотов и sheet со всеми 17 разделами.
- Все 17 view переведены на `.page-container`; карточные сетки — на `.responsive-card-grid` или `minmax(min(…, 100%), 1fr)`.
- Шапка на 320–430 px больше не переполняется; поиск на телефоне вынесен в отдельный overlay.
- Модалки получили close 44 px, `min(90vh, 100dvh)`, `clamp()`-паддинги.
- PWA: обновлены цвета манифеста, поднят `CACHE_NAME` до `shikimx-v7-mobile`.
- `npm run typecheck` и `npm run build` проходят без ошибок; сборка пересобрана.

### Что блокирует выпуск

1. **`AnimeModal` горизонтально разорван на телефонах и планшетах.** При 360–900 px контент модалки имеет ширину **4356 px** (`scrollWidth` 4372 при `clientWidth` 390); на 320 px конфигурация та же. Причина — колоночный режим `modal-columns-layout` с `align-items: flex-start` и элементы с `min-width: auto` (timeline-карточки, панель плеера).
2. **Мобильный поиск фактически не работает визуально.** Overlay отрисован внутри `<header>`, у которого inline `backdrop-filter` и анимация с сохранившимся `transform`. Из-за этого `position: fixed; inset: 0` считается от шапки: overlay получается **390×55 px**, список результатов — 24 px высотой, страница просвечивает, кнопка «Отмена» уходит за правый край (`right = 395` при ширине 390).
3. **Нижняя навигация перекрывает модалки.** `.mobile-bottom-nav` имеет `z-index: 1100`, а `AnimeModal` — 90, `SettingsModal`/`StatsModal`/`AboutModal` — 1000. У полноэкранной модалки аниме нижние 58 px перекрыты панелью, у настроек — нижняя карточка; контент обрезается.
4. **Настройки на 320 px обрезаны по горизонтали.** Переключатель темы выходит за правый край на 78 px, сетка «Стиль навигации» — на 22 px; модалка клипует содержимое.
5. **Анимация sheet не проигрывается.** В CSS используется `animation: slideUp`, но `@keyframes slideUp` отсутствует (есть только `slideUpFadeIn`).

Вывод: фундамент и навигация сделаны хорошо, но **P0-дефекты модалок, поиска и z-index нужно исправить до любой дальнейшей полировки**. Ориентир: 1–2 дня на P0, затем 4–7 дней на остаток плана.

---

## 2. Фактическое состояние после начала реализации

### 2.1. Изменения в рабочем дереве

| Группа | Файлы | Что сделано |
|---|---|---|
| Каркас | `App.tsx`, `AppHeader.tsx` | `<BottomNav>`, `main-content-wrapper`, padding шапки через `--page-gutter` |
| Навигация | `components/navigation/BottomNav.tsx`, `MobileNavSheet.tsx` (новые) | 5 слотов + sheet со всеми разделами и быстрыми действиями |
| Поиск | `header/SearchBar.tsx` (+250 строк) | мобильная иконка и overlay, отдельный input, результаты, «Отмена» |
| Шапка | `header/NavigationTabs.tsx`, `header/UserMenu.tsx` | dropdown и часть кнопок скрыты на мобильном через `.desktop-only` |
| CSS | `index.css` (+234 строки) | токены, mobile-first слой, coarse-pointer, touch-targets, сетки, nav, sheet, overlay, safe-area |
| Контент | `views/*.tsx` (17), `components/explore/*` | `.page-container`, `.responsive-card-grid`, `minmax(min(...))`, `clamp()` |
| Модалки | `AnimeModal`, `MangaModal`, `SettingsModal`, `StatsModal`, `AboutModal` | close 44 px, `dvh`, `clamp()`, мобильные сетки |
| Внутри модалки | `AnimeCharacters`, `AnimeCommunitySection`, `AnimeScreenshotsGallery` | touch-scroll, `auto-fill`-сетки |
| PWA | `index.html`, `static/manifest.json`, `static/sw.js` | viewport/PWA-мета, цвета, cache bump |
| Бэкенд (вне мобильной задачи) | `routes/*.py`, `services/poster_resolver.py`, `utils.py` | миграция ссылок `shikimori.one → shikimori.io`, `unwrap_camo_url` |

### 2.2. Проверенные факты

- `frontend/src` — 50 TSX/CSS файлов, ~19 856 строк; `index.css` — 2103 строки.
- `npm run typecheck` (`tsc --noEmit`) — без ошибок.
- `npm run build` (Vite 8.3.8) — успешно, 67 модулей, `dist/index.html` 1.55 kB, основной JS 293 kB (gzip 87.8 kB).
- Приложение поднято через `python run.py`, `GET /` → HTTP 200.
- Браузер: Chromium 151 (Playwright), mobile-эмуляция, DPR 2, `has_touch`.
- Ошибок и warning'ов в консоли на проверенных сценариях нет.
- `static/dist/` **не коммитится**: `.gitignore:19`. Пересборка нужна для локального запуска/деплоя, но не для git.
- Кириллица в `frontend/index.html`, `static/dist/index.html`, `static/manifest.json` — валидный UTF-8. Искажения в консоли PowerShell — артефакт вывода, не файлов.

### 2.3. Что проверено на ширинах

| Проверка | 320 | 360 | 390 | 768 | 844 (landscape) | 900 | 961 | 1024 | 1280 |
|---|---|---|---|---|---|---|---|---|---|
| Главная: горизонтальный overflow | нет | нет | нет | нет | нет | — | — | — | нет |
| 16 разделов через sheet: overflow | нет | — | нет | — | — | — | — | — | — |
| Шапка помещается | да | да | да | да | да | — | — | — | да |
| Bottom nav виден | да | да | да | да | **нет** | — | — | — | нет |
| Sheet открывается | да | да | да | — | — | — | — | — | — |
| Поиск: overlay на весь экран | **нет** | **нет** | **нет** | — | — | — | — | — | — |
| AnimeModal: внутренний overflow | **да** | **да** | **да** | **да** | — | **да** | **да** | **да** | нет |
| SettingsModal: overflow контролов | **да** | **да** | — | — | — | — | — | — | — |
| MangaModal: overflow | нет | — | — | — | — | — | — | — | — |
| About/Stats: overflow | нет | — | — | — | — | — | — | — | — |
| Поля ввода ≥ 16 px | да | да | да | — | — | — | — | — | — |

---

## 3. Ключевые дефекты

> Приоритеты: 3.1–3.5 — **P0** (блокируют мобильный выпуск), 3.6 — **P2** (мёртвая настройка), 3.7 — **P1** (плеер, планируется во втором спринте).

### 3.1. `AnimeModal`: контент шириной 4356 px

**Симптом.** На 320–900 px модалка аниме показывает только левую часть контента; заголовок, теги, кнопки плеера и таблицы обрезаны справа. Внутри модалки появляется горизонтальный скролл, скрытый `overflow-x: hidden`.

**Измерения.**

| Ширина viewport | `scrollWidth` модалки | `clientWidth` | Ширина `.modal-main-content` | Режим |
|---|---|---|---|---|
| 320 | 4372 | 320 | 4356 | column |
| 360 | 4372 | 360 | 4356 | column |
| 390 | 4372 | 390 | 4356 | column |
| 768 | 4372 | 768 | 4356 | column |
| 900 | 4372 | 900 | 4356 | column |
| 961 | 1045 | 961 | 499 | row |
| 1024 | 1045 | 1024 | 562 | row |
| 1280 | 1280 | 1280 | 818 | row |

**Причина.**

- В `@media (max-width: 960px)` `.modal-columns-layout` получает `flex-direction: column`, но сохраняет `align-items: flex-start` (строки 818–825 `index.css`). В колоночном flex-контейнере это означает «ширина по max-content», а не «растянуть на всю ширину».
- Дочерние элементы не дают себя сжать: `.timeline-card` имеет `min-width: auto` и внутри строку с `white-space: nowrap`; `.player-dropdowns-bar` — три `MxSelect` с длинными подписями; `.screenshots-grid` — 39 элементов.
- После инъекции `align-items: stretch` + `width/min-width/max-width` для `.modal-main-content` ширина падает с 4372 до **647 px**. После `min-width: 0` для `.timeline-card` — до **390 px**, то есть ровно в viewport.

**Рекомендуемое исправление (минимальное).**

```css
@media (max-width: 960px) {
  .modal-columns-layout {
    align-items: stretch !important;
  }
  .modal-sidebar,
  .modal-main-content {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
}
.timeline-card,
.timeline-card > * {
  min-width: 0 !important;
  max-width: 100% !important;
}
```

Дополнительно:

- `.player-dropdowns-bar { flex-wrap: wrap; }`, у `MxSelect` — `min-width: 0`, `flex: 1 1 140px`, подписи с `white-space: normal`/ellipsis.
- `.screenshots-grid`, `.stagger-children`, `.franchise-*` — `max-width: 100%; min-width: 0`.
- Проверить 961–1024 px отдельно: там остаётся overflow 1045 vs 961/1024 (≈180/21 px).

**DoD.** `scrollWidth === clientWidth` внутри `.modal-unified-scroll` на 320, 360, 390, 768, 900, 961, 1024, 1280.

### 3.2. Мобильный поиск: overlay 55 px вместо 844 px

**Симптом.** После нажатия на иконку поиска страница не затемняется и не перекрывается: виден только верхний бар с полем, результаты не видны, кнопка «Отмена» обрезана. При этом поиск реально выполняется (API вернул 16 результатов).

**Измерения.**

- `.mobile-search-overlay`: `390×55`, хотя задано `position: fixed; inset: 0`.
- Список результатов: высота **24 px**, `scrollHeight` 1400 px.
- Кнопка «Отмена»: `left = 334`, `right = 395.03` при viewport 390 → выходит за экран.
- `document.body` корректно блокируется (`overflow: hidden`) и разблокируется при закрытии.

**Причина.**

1. Overlay отрисовывается внутри `<header class="app-header-mx2">`. У шапки:
   - inline `backdropFilter: 'blur(20px)'`;
   - `animation: headerEntrance`, после завершения сохраняется `transform: matrix(1, 0, 0, 1, 0, 0)`.
   Любой из этих эффектов делает шапку containing block для `position: fixed` потомков. Эксперимент: снятие только `backdrop-filter` не помогает; снятие `transform` + `animation` + `backdrop-filter` возвращает overlay `390×844`.
2. Внутренний flex-контейнер поля не имеет `min-width: 0`, поэтому placeholder не даёт ему сжаться и выталкивает «Отмена». После `min-width: 0` на обёртке input `right` становится 376 — в пределах экрана.

**Рекомендуемое исправление.**

- Рендерить overlay через `createPortal(..., document.body)` (лучше) **или** вынести его из `<header>` в корень приложения.
- Не полагаться на удаление `backdrop-filter` у шапки — это ухудшит её вид.
- Добавить `min-width: 0` обёртке input и `flex-shrink: 0` кнопке «Отмена».
- Добавить обработку `Escape`, focus-trap и возврат фокуса.
- Проверить, что при открытии overlay `z-index` выше шапки и нижней навигации (сейчас 2500 — достаточно).

**DoD.** Overlay занимает весь viewport, список результатов скроллится, «Отмена» и «Назад» доступны на 320 px, фон не просвечивает.

### 3.3. Нижняя навигация перекрывает модалки

**Симптом.** В `AnimeModal` нижние кнопки трекера/плеера уходят под нижнюю панель; в `SettingsModal` нижняя карточка «О сайте» частично скрыта. На скриншоте 360×740 видно, что панель навигации рисуется поверх модалки.

**Причина.** `.mobile-bottom-nav { z-index: 1100 }`, при этом:

- `AnimeModal` / `MangaModal` — `z-index: 90`;
- `SettingsModal` / `StatsModal` / `AboutModal` — `z-index: 1000`.

**Рекомендуемое исправление.**

- Ввести шкалу z-index: контент 0–10, шапка 100, bottom nav 90, модалки 1000+, sheet 2000, overlay-поиск 2500, fullscreen-плеер 3000.
- Либо скрывать bottom nav, когда открыта модалка/плеер (класс на `body`, например `has-modal`), и добавлять `padding-bottom` в скролл модалки.
- В `AnimeModal`/`MangaModal` поднять `z-index` до 1000 и добавить нижний safe-area padding внутри `.modal-unified-scroll`.

**DoD.** Ни один элемент модалки не перекрыт навигацией; нижний контент достижим скроллом; sheet и overlay-поиск по-прежнему выше модалок.

### 3.4. `SettingsModal`: горизонтальное обрезание на 320 px

**Симптом.** На 320 px блок «Тема оформления» выходит за карточку: кнопка «Светлая» обрезана; сетка «Стиль навигации в шапке» обрезает третий вариант («Только текст»). Модалка имеет `overflow: hidden`, поэтому добраться до скрытых кнопок нельзя.

**Измерения (модалка 300 px, `x=10`, `right=310`).**

| Элемент | `left` | `right` | Ширина |
|---|---|---|---|
| Контейнер переключателя темы | 189 | 388 | 199 |
| Кнопка «Светлая» | 288 | 384 | 96 |
| Кнопка «Только текст» | 246 | 332 | 86 |

**Причина.**

- Строка темы: `display: flex; justify-content: space-between` без `flex-wrap`; левая группа не сжимается.
- Сетка навигации: `grid-template-columns: repeat(3, 1fr)`; `1fr` не опускается ниже min-content, а подписи длинные.

**Рекомендуемое исправление.**

- Строке темы — `flex-wrap: wrap; gap: 12px`, переключателю — `flex-shrink: 0`.
- Сетке — `grid-template-columns: repeat(auto-fit, minmax(min(96px, 100%), 1fr))` или на ≤360 px `repeat(2, minmax(0, 1fr))`; `min-width: 0` кнопкам.
- Аналогично проверить остальные строки «label + control» в настройках.

**DoD.** На 320 px `scrollWidth` контента модалки ≤ `clientWidth`, все три варианта навигации доступны.

### 3.5. Отсутствует `@keyframes slideUp`

В `index.css` есть `animation: slideUp 0.25s ...` для `.mobile-sheet-content`, но ключевые кадры не определены (в файле только `fadeIn`, `slideUpFadeIn`, `reveal*`, `modalShellEntrance`, `headerEntrance`, `mx2DropdownEnter`). Sheet открывается без анимации.

**Исправление.** Либо добавить `@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`, либо использовать существующий `slideUpFadeIn`. Учесть `prefers-reduced-motion`.

### 3.6. `--header-height: 52px` на мобильном не применяется (P2)

В `index.css` медиа-блок задаёт `--header-height: 52px`, но `appConfig.applyTheme()` (`frontend/src/config/appConfig.ts`, строка 763) выставляет `--header-height: 56px` inline на `documentElement`. Inline-переменная перебивает media-запрос, поэтому шапка остаётся 56 px.

**Исправление.** Либо убрать мобильный override из CSS (оставить 56 px везде), либо применять 52 px в JS по `matchMedia('(max-width: 768px)')`. Сейчас это «мёртвая» настройка, которая вводит в заблуждение.

### 3.7. Плеер не адаптирован (P1)

`AnimePlayer.tsx` в diff отсутствует — компонент не менялся. Следствия:

- панель `player-dropdowns-bar` из трёх `MxSelect` не переносится и является одним из источников ширины 4356 px;
- длинные кнопки «Мульти-агрегатор (Kodik, AnimeGo)» и «Зеркало плеера» обрезаются;
- список серий и внешние ссылки выходят за пределы модалки;
- fullscreen-режим использует `100vw/100dvh` и в целом корректен, но проверить на iOS нужно отдельно.

**Исправление.** См. 3.1: `flex-wrap`, `min-width: 0`, компактные подписи, `MxSelect` в режиме bottom-sheet на ≤480 px, нижний safe-area.

---

## 4. Остальные дефекты и долги (P1/P2)

| # | Дефект | Приоритет | Комментарий |
|---|---|---|---|
| 1 | Кнопка темы в шапке 34×34 px | P1 | Норма 44×44; поиск уже 44×44 |
| 2 | Нет `aria-current` у bottom nav, нет focus-trap в sheet/overlay | P1 | Доступность |
| 3 | В overlay-поиске нет Escape и блокировки фокуса | P1 | Закрытие только кнопками |
| 4 | Текст страницы просвечивает под bottom nav (тёмная и светлая темы) | P2 | `--header-bg` = 0.92 + blur; сделать фон панели плотнее (`0.98` или solid) |
| 5 | Вкладки статусов (`RatesView`) и жанры (`CatalogView`) обрезаны справа без индикатора | P1 | Скроллятся (`overflowX: auto`), но нет affordance/scroll-snap |
| 6 | На 844×390 (landscape телефона) включается десктопная шапка, bottom nav пропадает | P2 | Рассмотреть `(pointer: coarse)` для навигации до 1023 px |
| 7 | «Мёртвые» классы: `.modal-mobile-sheet`, `.safe-bottom-padding`, `.touch-icon-btn`, `.mobile-flex` | P2 | Нигде не используются; удалить или применить |
| 8 | `@media (max-width: 768px) .app-header-mx2 { padding: 0 16px }` не работает | P2 | Перебивается inline `padding: 0 var(--page-gutter)` |
| 9 | Hover-эффекты `AnimeCard` и др. без `:active`/`:focus-visible` | P2 | На тач-устройствах не видно отклика |
| 10 | `MxSelect` — absolute-меню `min-width: 220` | P1 | В узких колонках может выходить за экран; нужен bottom-sheet |
| 11 | Нет `srcset/sizes` у постеров, hero — фон | P2 | Производительность/LCP |
| 12 | Нет автотестов на overflow, включая **внутренний** overflow модалок | P1 | Текущая проверка ищет только `documentElement` |
| 13 | В `sw.js` нет offline-заглушки и UI обновления | P2 | PWA-полировка |
| 14 | Домены `shikimori.io` | Вне мобильной задачи | Миграция затронула API base, ссылки, изображения, camo; нужен отдельный прогон, не входит в P0/P1/P2 мобильного плана |

---

## 5. Целевая модель

### 5.1. Брейкпоинты

| Токен | Ширина | Назначение |
|---|---|---|
| `base` | 320–479 | телефоны, 1–2 колонки |
| `sm` | 480–767 | крупные телефоны |
| `md` | 768–1023 | планшеты портрет, телефоны landscape |
| `lg` | 1024–1279 | планшеты landscape / ноутбуки |
| `xl` | ≥1280 | десктоп |

Дополнительно — по возможностям устройства:

- `@media (hover: hover) and (pointer: fine)` — hover и морфящий курсор;
- `@media (pointer: coarse)` — тач-таргеты 44 px, поля 16 px, bottom nav до 1023 px;
- container queries для карточек и модальных колонок.

### 5.2. Токены

Уже введены: `--page-gutter: clamp(12px, 3.5vw, 32px)`, `--header-height`, `--bottom-nav-height`, `--card-min`, `--card-gap`, `--modal-pad`.

Добавить/упорядочить:

- `--z-header`, `--z-bottom-nav`, `--z-modal`, `--z-sheet`, `--z-overlay`, `--z-fullscreen`;
- `--safe-top`, `--safe-bottom` (обёртки над `env()`);
- `--control-min: 44px`;
- `--font-input: 16px` для coarse;
- типографическая шкала `clamp()` для заголовков view/модалок.

### 5.3. Целевой каркас

- **Шапка на телефоне:** логотип + иконка поиска + тема + вход/аватар. Меню разделов — только десктоп.
- **Нижняя навигация:** Главная, Каталог, Списки, Сообщество, Ещё. «Ещё» — sheet с группами.
- **Поиск:** portal-overlay поверх всего, крупные строки, «Отмена», история, Escape.
- **Модалки:** на телефоне — полный экран ниже шапки, собственная прокрутка, safe-area, close 44 px; на планшете/десктопе — прежние колонки.
- **Плеер:** 16:9, управление в столбец на узком экране, fullscreen с safe-area, без горизонтального overflow.

---

## 6. Технический подход

Рекомендация остаётся прежней — **вариант B**: постепенная экстракция layout-критичных inline-стилей в семантические классы и токены. Реализация уже пошла по этому пути (`.page-container`, `.responsive-card-grid`, `.mobile-only`), но появились две системные ошибки, которые надо зафиксировать правилами:

1. **Overlay-компоненты не рендерить внутри элементов с `backdrop-filter`/`transform`.** Использовать `createPortal` в `document.body`.
2. **Не полагаться только на `overflow-x: hidden`.** Он маскирует дефект: контент остаётся шириной 4356 px внутри клипа. В автотестах проверять `scrollWidth` каждого скролл-контейнера и модалок.
3. `!important` — только в переходный период, с TODO.
4. Z-index — только через токены, не «на глаз».
5. Инлайн-переменные (`--header-height`) не должны конфликтовать с media-запросами; задавать их в одном месте.

---

## 7. Этапы работ и статус

| Этап | Статус | Что осталось |
|---|---|---|
| 0. Подготовка и baseline | Частично | Playwright-тест на overflow (включая модалки), скриншот-базлайн |
| 1. Фундамент (мета, токены, 16 px, safe-area) | **Готово, с долгами** | Убрать мёртвые токены/классы, проверить `--header-height` |
| 2. Шапка и навигация | **Готово, есть P0** | Portal для поиска, `min-width: 0`, z-index, focus-trap, 44 px тема |
| 3. Главная / Explore | В основном готово | Hero на 320 проверить повторно, карусели/scroll-snap, tap-состояния |
| 4. Каталоги и списки | В основном готово | Индикаторы горизонтальных вкладок, таблицы Top100/Rates/Forum |
| 5. Модалки и плеер | **Не готово** | P0 3.1, 3.3, 3.4, 3.5; полностью `AnimePlayer`; `MxSelect` sheet |
| 6. Доступность | Частично | `aria-current`, фокус-трап, Escape, контраст, 200% text |
| 7. Производительность и PWA | Частично | `srcset`, LCP, offline, preload шрифтов |
| 8. QA и релиз | Не начато | Матрица устройств, Lighthouse, регрессия десктопа |

### 7.1. Ближайший спринт (P0, 1–2 дня)

1. `AnimeModal`: `align-items: stretch`, `min-width: 0` для timeline и панели плеера, `max-width: 100%` для внутренних сеток.
2. Поиск: вынести overlay в `document.body` через portal; `min-width: 0` обёртке input; Escape; focus-trap.
3. Z-index: bottom nav ниже модалок; нижний safe-area padding в модалках.
4. Настройки: `flex-wrap` строки темы и `auto-fit`/`minmax(0, 1fr)` сетки навигации.
5. Добавить `@keyframes slideUp` (или переключиться на существующий).
6. Прогнать автотест: `documentElement` + `.modal-unified-scroll` + `.modal-shell` + `search overlay` на 320–1280.

### 7.2. Второй спринт (P1, 2–3 дня)

- `AnimePlayer`: панель селектов, кнопки-агрегаторы, список серий, fullscreen на iOS.
- `MxSelect` → bottom-sheet на ≤480 px.
- Bottom nav: `aria-current`, активные состояния, скрытие при модалке/плеере.
- Индикаторы горизонтальных вкладок/чипов, scroll-snap.
- Табличные view (Top100, Rates, Forum): карточный режим или закреплённая колонка.
- Контраст и 200% text scale; `prefers-reduced-motion` для новых анимаций.

### 7.3. Третий спринт (P2, 1–2 дня)

- Плотность фона bottom nav, ghost-text.
- `srcset/sizes`, `fetchpriority`, preload кириллицы.
- Offline-заглушка и UI обновления SW.
- Чистка мёртвого CSS и media-правил, которые перебиваются inline-стилями.
- Определиться с `--header-height` (52 px через JS или 56 px везде).
- Landscape-телефоны: решение по навигации на `pointer: coarse`.

---

## 8. Карта изменений по файлам (обновлённая)

| Файл / группа | Состояние | Приоритет |
|---|---|---|
| `frontend/index.html` | Готово | — |
| `frontend/src/index.css` | Готово, но есть мёртвый код и конфликт `--header-height` | P0/P2 |
| `components/AppHeader.tsx` | Готово | — |
| `components/header/SearchBar.tsx` | Overlay есть, **сломан** (portal/containing block, min-width) | **P0** |
| `components/header/NavigationTabs.tsx` | Готово | P2 |
| `components/header/UserMenu.tsx` | Частично (тема 34 px) | P1 |
| `components/navigation/BottomNav.tsx` | Готово, **z-index конфликт** | **P0** |
| `components/navigation/MobileNavSheet.tsx` | Готово, нет `slideUp` и focus-trap | P1 |
| `App.tsx` | Готово | — |
| `components/explore/*` | В основном готово | P1 |
| `components/AnimeCard.tsx` | Без изменений, tap-состояния | P2 |
| `components/AnimeModal.tsx` | **Критический overflow**, close/paddings готовы | **P0** |
| `components/MangaModal.tsx` | Проверено: overflow нет | P2 |
| `components/SettingsModal.tsx` | **Overflow контролов на 320** | **P0** |
| `components/StatsModal.tsx`, `AboutModal.tsx` | Проверено: overflow нет | P1 |
| `components/anime_modal/AnimePlayer.tsx` | **Не менялся** | P1 |
| `components/anime_modal/AnimeRelatedTimeline.tsx` | Источник ширины 4356 px | **P0** |
| `components/anime_modal/AnimeScreenshotsGallery.tsx` | Сетка обновлена | P1 |
| `components/anime_modal/AnimeCommunitySection.tsx` | Сетка обновлена | P1 |
| `components/MxSelect.tsx` | Absolute-меню, нужен sheet | P1 |
| `views/*.tsx` (17) | `.page-container` внедрён | P1 |
| `static/manifest.json`, `static/sw.js` | Cache bump и цвета готовы | P2 |
| `static/dist` | Пересобран локально, **gitignored** | — |
| `routes/*`, `services/poster_resolver.py`, `utils.py` | Домены/camo (вне мобильной задачи) | Проверить отдельно |

---

## 9. Матрица тестирования

### 9.1. Ширины

- 320×568/640 — стресс-тест (iPhone SE 1 / малый Android).
- 360×640, 375×667, 390×844, 414×896, 430×932.
- Landscape 640×360, 844×390.
- Планшеты 768×1024, 900×1000, 1024×768.
- Десктоп 1280×800, 1440×900.

### 9.2. Браузеры

- iOS Safari (2 актуальные версии) — приоритет.
- Chrome Android, Samsung Internet, Firefox Android.
- Chrome / Edge / Safari desktop — регрессия.

### 9.3. Обязательные проверки

1. `documentElement.scrollWidth === clientWidth` на каждой view.
2. `scrollWidth === clientWidth` у `.modal-unified-scroll`, `.modal-shell`, `.mobile-search-overlay`.
3. Скролл до низа модалки: последний элемент не перекрыт bottom nav.
4. Поиск: overlay на весь экран, результаты скроллятся, «Отмена» доступна на 320 px.
5. Sheet: открытие/закрытие, анимация, Escape, все 17 разделов.
6. Плеер: селекты, серии, агрегаторы, fullscreen, портрет/ландшафт.
7. Ввод: 16 px, клавиатура не закрывает поле, нет iOS-зума.
8. 200% text scale, safe-area, поворот, возврат назад.
9. Lighthouse Mobile: Perf ≥ 85, A11y ≥ 95, BP ≥ 95.
10. Десктоп 1280+: шапка, dropdown, модалки-колонки, отсутствие bottom nav.

### 9.4. Инструменты

- Playwright (Chromium/WebKit) — скриншоты + overflow-ассерты.
- Lighthouse CI (mobile preset), axe-core.
- Реальные iOS/Android или BrowserStack.
- Throttling Slow 4G / CPU 4×.

---

## 10. Критерии приёмки

- На 320–430 px **нет** горизонтального скролла и обрезанного контента ни на одной view.
- **Внутри модалок** `scrollWidth === clientWidth` на 320–1280 px (сейчас нарушено).
- Шапка и bottom nav не перекрывают контент; safe-area учтён; навигация не выше модалок.
- Все поля ввода ≥16 px на мобильных; фокус не вызывает зум.
- Тач-таргеты ≥44×44 px (включая кнопку темы).
- Все 5 модалок открываются/закрываются, фокус возвращается, фон не скроллится.
- Поиск — полноэкранный, результаты доступны, «Отмена» и Escape работают.
- Плеер работает в портрете и ландшафте, fullscreen корректен.
- Lighthouse Mobile: Perf ≥85, A11y ≥95, BP ≥95; PWA installable.
- Нет регрессий на десктопе 1280+.
- `static/dist` пересобран для деплоя (в git не коммитится).

---

## 11. Риски и митигации

| Риск | Митигация |
|---|---|
| Inline-стили сопротивляются media-запросам | Экстракция layout-стилей, токены, `!important` только временно |
| `position: fixed` внутри `transform`/`backdrop-filter` | Всегда portal в `body`; правило code review |
| `overflow-x: hidden` маскирует баги | Автотесты на `scrollWidth` всех контейнеров |
| Z-index-конфликты | Единая шкала токенов; тест «элемент под модалкой» |
| Большой объём работ | P0 → P1 → P2, вертикальные срезы |
| Регрессии десктопа | Baseline-скриншоты, проверка 1280+ на каждом этапе |
| iOS-специфика (зум, клавиатура, fullscreen iframe) | Раннее тестирование на реальном iPhone, visualViewport |
| PWA-кэш отдаёт старую версию | Версионирование `CACHE_NAME`, UI обновления |
| Миграция на `shikimori.io` | Отдельный прогон API, ссылок, изображений и camo; не смешивать с мобильным релизом |
| Забытая пересборка `dist` | Чек-лист релиза/CI (каталог gitignored) |

---

## 12. Оценка и порядок

| Блок | Оценка |
|---|---|
| P0: модалка, поиск, z-index, настройки, keyframes | 1–2 дня |
| P1: плеер, MxSelect, доступность, вкладки | 2–3 дня |
| P2: PWA, изображения, полировка, тесты | 1–2 дня |
| QA и релиз | 1–2 дня |
| **Итого до релиза** | **~5–9 рабочих дней** + буфер 2 дня |

Порядок:

1. **R1 (P0):** исправления 3.1–3.5, автотест overflow, smoke на 320/390/768/1280.
2. **R2 (P1):** плеер, MxSelect, доступность, горизонтальные вкладки.
3. **R3 (P2):** PWA, изображения, чистота CSS, Lighthouse.

---

## 13. Протокол повторной проверки (16.11.2026)

### 13.1. Команды

```powershell
cd frontend
npm run typecheck
npm run build
cd ..
python run.py          # http://127.0.0.1:5000
```

### 13.2. Результаты

| Проверка | Результат |
|---|---|
| TypeScript | OK |
| Vite build | OK: 67 модулей, ~200 мс; предупреждения только про runtime-подключение `fonts.css` и `tabler-icons.min.css` |
| Flask `GET /` | 200 |
| Консоль браузера | 0 ошибок на проверенных сценариях |
| Главная + 16 разделов (320/390) | Нет внешнего overflow |
| Шапка 320/360/390/768 | Помещается |
| Bottom nav | 5 × 78×57 px (при 390 px), `padding-bottom` контента 74 px |
| Sheet | Открывается, 320×544 при 320×640, скроллится |
| Мобильный поиск | 16 результатов получено, но overlay 55 px, список 24 px, «Отмена» `right=395` |
| AnimeModal | `scrollWidth` 4372 vs 320/360/390/768/900; 1045 vs 961/1024; 1280 — OK |
| Timeline-карточки | 420–593 px в строке 358 px |
| SettingsModal 320 | Тема `right=388`, навигация `right=332` при `right` модалки 310 |
| MangaModal 320 | `scrollWidth = clientWidth = 320` |
| About/Stats 320 | `scrollWidth = clientWidth = 298` |
| Поля ввода (coarse) | 16 px |
| Кнопка темы | 34×34 px |
| Landscape 844×390 | Десктопная шапка, bottom nav скрыт, overflow нет |
| Десктоп 1280 | Bottom nav `display: none`, поиск виден, модалка — row, overflow нет |

### 13.3. Что подтвердилось из первичного аудита

- Inline-стили действительно мешают media-запросам (пример: `--header-height`, padding шапки).
- `overflow-x: hidden` маскирует реальный дефект ширины модалки.
- Safe-area и 16 px-вводы — сделаны.
- Hero, сетки и контейнеры на статичных view — исправлены.

### 13.4. Что оказалось неверным в первичном плане

- `static/dist` **не закоммичен**, а gitignored; «порча кодировки» в `dist/index.html` — артефакт вывода PowerShell, файл в UTF-8.
- «Всего 7 media-запросов» — устарело: добавлен отдельный мобильный слой.
- «Код не изменялся» — на момент перепроверки изменения уже были в рабочем дереве.

---

## 14. Артефакты

- `docs/MOBILE_ADAPTATION_PLAN.md` — этот документ.
- `docs/MOBILE_QA_CHECKLIST.md` — матрица устройств и сценариев (создать/обновить).
- `docs/MOBILE_AUDIT.md` — baseline-скриншоты и список дефектов (создать/обновить).
- Playwright-тест: внешний и внутренний overflow, z-index модалок, доступность «Отмена».
- Обновлённые `static/dist` (локально), `manifest.json`, `sw.js`.
