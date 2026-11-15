# Roadmap миграции и вывода Legacy фронтенда из Shiki MX App

## 1. Текущий статус архитектуры
- **Основной активный фронтенд:** React 18, TypeScript, Vite (`frontend/`). Бандл компилируется в `static/dist/` и отдаётся в `routes/profile.py` как SPA (`static/dist/index.html`).
- **Legacy фронтенд:** Полностью выведен из эксплуатации и удален. Все 600+ КБ мертвого кода (старые шаблоны, неиспользуемые скрипты и стили) удалены из репозитория.

## 2. Этапы вывода из эксплуатации (Deprecation Roadmap)

### Фаза 1 (Выполнено)
- [x] Все 17 разделов и 8 модальных окон полностью реализованы в React (`frontend/src/`).
- [x] Декомпозиция монолитов: `AnimeModal.tsx`, `AppHeader.tsx`, `ExploreView.tsx`, `appConfig.ts`.
- [x] Внедрение Code Splitting (`React.lazy` + `Suspense`) по всем вкладкам и модалкам.
- [x] Маркировка `templates/index.html` и `build_assets.py` явными пометками `[DEPRECATED]`.

### Фаза 2 (Выполнено)
- [x] PWA (Service Worker `static/sw.js`) настроен и кэширует ассеты из `static/dist/` и шрифты.
- [x] Удаление устаревших `static/bundle.css` и `static/bundle.js` из репозитория.

### Фаза 3 (Выполнено)
- [x] Удаление `templates/index.html` и `build_assets.py`.
- [x] Удаление неиспользуемых legacy скриптов из `static/js/`.
- [x] Очистка устаревших CSS файлов из `static/css/` с сохранением только `fonts.css` и `tabler-icons.min.css`.
- [x] Обновление `app.py` и `routes/profile.py` для прямой отдачи React 18 SPA.
