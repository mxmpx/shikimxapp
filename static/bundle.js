/* --- js/logger.js --- */
(function (global) {
    'use strict';

    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

    class ApiError extends Error {
        constructor(message, status, data = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    const AppLogger = {
        _minLevel: LEVELS[localStorage.getItem('logLevel') || 'debug'] ?? LEVELS.debug,

        setLevel(level) {
            if (LEVELS[level] === undefined) return;
            this._minLevel = LEVELS[level];
            localStorage.setItem('logLevel', level);
            this.info('logger', `Log level set to "${level}"`);
        },

        _emit(level, module, args) {
            if (LEVELS[level] < this._minLevel) return;
            const prefix = `[ShikiMX:${module}]`;
            const fn = level === 'error'
                ? console.error
                : level === 'warn'
                    ? console.warn
                    : level === 'info'
                        ? console.info
                        : console.debug;
            fn(prefix, ...args);
        },

        debug(module, ...args) { this._emit('debug', module, args); },
        info(module, ...args) { this._emit('info', module, args); },
        warn(module, ...args) { this._emit('warn', module, args); },

        error(module, err, context = null) {
            const message = err instanceof Error ? err.message : String(err);
            const payload = context ? [message, context] : [message];
            if (err instanceof Error && err !== message) payload.push(err);
            this._emit('error', module, payload);
        },
    };

    async function apiFetch(url, options = {}) {
        const module = options.module || 'api';
        const fetchOptions = { ...options };
        delete fetchOptions.module;
        delete fetchOptions.silent;

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const start = performance.now();

        AppLogger.debug(module, `${method} ${url}`);

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (err) {
            AppLogger.error(module, err, { url, method, phase: 'network' });
            throw err;
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseErr) {
                AppLogger.warn(module, `Invalid JSON response from ${url}`, parseErr);
            }
        } else if (!response.ok) {
            try {
                data = { error: await response.text() };
            } catch (_) {
                data = null;
            }
        }

        const elapsed = Math.round(performance.now() - start);

        if (!response.ok) {
            const message = (data && data.error) || `HTTP ${response.status}`;
            if (!options.silent) {
                AppLogger.warn(module, `${method} ${url} → ${response.status} (${elapsed}ms)`, message);
            }
            throw new ApiError(message, response.status, data);
        }

        AppLogger.debug(module, `${method} ${url} → ${response.status} (${elapsed}ms)`);
        return data;
    }

    function showFetchError(container, err, fallback = 'Ошибка загрузки') {
        const message = err instanceof ApiError
            ? err.message
            : (err && err.message) || fallback;

        AppLogger.error('ui', err instanceof Error ? err : new Error(message), { fallback });

        if (container) {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${message}</p>`;
        }
        return message;
    }

    function showModalError(body, err, fallback = 'Ошибка загрузки') {
        const message = showFetchError(null, err, fallback);
        if (body) {
            body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${message}</div>`;
        }
        return message;
    }

    window.addEventListener('unhandledrejection', (event) => {
        AppLogger.error('global', event.reason || new Error('Unhandled promise rejection'), {
            type: 'unhandledrejection',
        });
    });

    window.addEventListener('error', (event) => {
        AppLogger.error('global', event.error || new Error(event.message), {
            type: 'error',
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
        });
    });

    global.AppLogger = AppLogger;
    global.ApiError = ApiError;
    global.apiFetch = apiFetch;
    global.showFetchError = showFetchError;
    global.showModalError = showModalError;

    AppLogger.info('logger', 'Initialized', { level: localStorage.getItem('logLevel') || 'debug' });
})(window);

;
/* --- js/translations.js --- */
/* Translations for Shiki MX App */

const TRANSLATIONS = {
    ru: {
        // Header
        'tab.profile': 'Профиль & Обзор',
        'tab.rates': 'Списки',
        'tab.favourites': 'Избранное',
        'tab.friends': 'Друзья',
        'tab.history': 'История',
        'search.title': 'Поиск',
        'search.placeholder': 'Поиск аниме, манги...',
        'theme.title': 'Сменить тему',
        'logout': 'Выйти',

        // Auth
        'login.shikimori': 'Войти',
        'login.via_shikimori': 'Войти через Shikimori',
        'auth.not_authorized': 'Авторизация не выполнена',
        'auth.not_authorized.desc': 'Войдите через Shikimori, чтобы просмотреть свой профиль, списки и обзор.',

        // Profile
        'profile.info': 'Информация',
        'profile.stats': 'Статистика',
        'profile.friends_clubs': 'Друзья и клубы',
        'profile.activity': 'Активность',
        'profile.about': 'О себе',
        'profile.all': 'Все',
        'profile.full_history': 'Вся история',
        'profile.show_full': 'Показать полностью',
        'profile.collapse': 'Свернуть',
        'profile.expand': 'Показать полностью',
        'profile.about_empty': 'Информация о себе не заполнена.',
        'profile.stats_unavailable': 'Статистика недоступна',
        'profile.id': 'ID:',
        'profile.name': 'Имя:',
        'profile.age': 'Возраст:',
        'profile.sex': 'Пол:',
        'profile.last_visit': 'Последний визит:',
        'profile.anime_completed': 'Просмотрено аниме:',
        'profile.anime_watching': 'Смотрю аниме:',
        'profile.manga_completed': 'Прочитано манги:',
        'profile.manga_watching': 'Читаю мангу:',

        // Explore
        'explore.content': 'Контент',
        'explore.hot_topics': 'Темы дня',
        'explore.main_news': 'Главные новости',
        'explore.more_news': 'Ещё новости',
        'explore.no_content': 'Нет доступного контента',
        'explore.no_hot': 'Нет популярных тем',
        'explore.searching': 'Поиск...',
        'explore.no_results': 'Ничего не найдено',
        'explore.min_chars': 'Введите минимум 2 символа',
        'explore.topic': 'Тема',
        'explore.collection': 'Коллекция',
        'explore.review': 'Рецензия',
        'explore.discussion': 'Обсуждение',
        'explore.article': 'Статья',
        'explore.loading': 'Загрузка...',
        'explore.loading_more': 'Подгрузка новостей...',
        'explore.news_feed': 'Новостная лента',
        'explore.collections': 'коллекции',
        'explore.reviews': 'рецензии',
        'explore.articles': 'статьи',
        'explore.search_error': 'Ошибка поиска',
        'explore.status.released': 'Завершено',
        'explore.status.ongoing': 'Онгоинг',
        'explore.status.anons': 'Анонс',
        'explore.type': 'Тип:',
        'explore.year': 'год',
        'explore.genres': 'Жанры:',
        'explore.no_more_news': 'Больше новостей нет',
        'explore.load_more_error': 'Ошибка подгрузки новостей:',

        // Settings
        'settings.title': 'Настройки',
        'settings.background': 'Фон сайта',
        'settings.background.hint': 'Выберите цвет фона или установите любое фото.',
        'settings.color': 'Цвет',
        'settings.image': 'Фото',
        'settings.bg_color': 'Цвет фона',
        'settings.image_url': 'URL изображения',
        'settings.or': 'или',
        'settings.upload': 'Загрузить с устройства',
        'settings.reset': 'Сбросить',
        'settings.section_visibility': 'Видимость разделов',
        'settings.section_visibility.hint': 'Выберите, какие разделы отображать на вкладке «Профиль & Обзор».',
        'settings.navbar_view': 'Вид навигации',
        'settings.navbar_view.hint': 'Выберите, как отображать элементы навигации.',
        'settings.navbar_view.full': 'Иконка + название',
        'settings.navbar_view.icons': 'Только иконки',
        'settings.navbar_view.titles': 'Только названия',

        // About modal
        'about.title': 'О сайте',
        'about.features': 'Возможности приложения',
        'about.tech_stack': 'Технологический стек',
        'about.changelog': 'Чейнджлог (История изменений)',

        // Common
        'loading': 'Загрузка...',
        'rates.loading': 'Загрузка списков...',
        'favourites.loading': 'Загрузка избранного...',
        'friends.loading': 'Загрузка друзей и клубов...',
        'history.loading': 'Загрузка истории...',
        'common.load_error': 'Ошибка загрузки',
        'error': 'Ошибка',
        'close': 'Закрыть',

        // Rates
        'rates.watching': 'Смотрю',
        'rates.completed': 'Просмотрено',
        'rates.planned': 'В планах',
        'rates.on_hold': 'Отложено',
        'rates.dropped': 'Брошено',
        'rates.rewatching': 'Пересматриваю',
        'rates.anime': 'Аниме',
        'rates.manga': 'Манга',
        'rates.all': 'Все',
        'rates.empty': 'Список пуст',
        'rates.no_results': 'Записей не найдено',
        'rates.sort.updated': 'По дате обновления',
        'rates.sort.score_desc': 'По оценке (сначала высокие)',
        'rates.sort.score_asc': 'По оценке (сначала низкие)',
        'rates.sort.name': 'По названию (А-Я)',
        'rates.sort.progress': 'По прогрессу',
        'rates.progress.anime': 'эп.',
        'rates.progress.manga': 'гл.',
        'rates.rewatches': 'повторов:',
        'rates.view.list': 'Список',
        'rates.view.cards': 'Карточки',
        'rates.view.large': 'Большие постеры',
        'rates.progress': 'Прогресс',
        'rates.score': 'Оценка',
        
        // Friends
        'friends.empty': 'Список пуст',
        'friends.load_error': 'Ошибка загрузки',
        'friends.friends': 'Друзья',
        'friends.clubs': 'Клубы',
        'friends.private_club': 'Закрытый клуб',
        'friends.public_club': 'Публичный клуб',
        'friends.open_shikimori': 'Открыть на Shikimori',
        'friends.about': 'О себе',
        'friends.about_empty': 'Информация о себе не заполнена.',
        'friends.id': 'ID:',
        'friends.sex': 'Пол:',
        'friends.age': 'Возраст:',
        'friends.last_online': 'Был(а) в сети:',
        'friends.online_today': 'Онлайн сегодня',
        'friends.anime': 'Аниме',
        'friends.manga': 'Манга',
        'friends.watched': 'Просмотрено:',
        'friends.watching': 'Смотрит:',
        'friends.read': 'Прочитано:',
        'friends.reading': 'Читает:',

        // Favourites
        'favourites.empty': 'Пусто',
        'favourites.characters': 'Избранные персонажи',
        'favourites.animes': 'Избранные Аниме',
        'favourites.mangas': 'Избранная Манга',

        // History
        'history.empty': 'История пуста',
        'history.load_error': 'Не удалось загрузить историю',
        'history.full': 'Вся история',

        // Anime modal
        'anime.loading': 'Загрузка информации...',
        'anime.load_error': 'Не удалось загрузить данные',
        'anime.playback_error': 'Ошибка воспроизведения',
        'anime.no_players': 'Доступные плееры не найдены',
        'anime.sources': 'Источники:',
        'anime.open_shikimori': 'Открыть на Shikimori',
        'anime.episode': 'Серия',
        'anime.translation': 'Озвучка / Перевод:',
        'anime.player': 'Плеер / Зеркало:',
        'anime.description': 'Описание',
        'anime.search_error': 'Ошибка поиска',
        'anime.no_results': 'Ничего не найдено',
        'anime.search_players': 'Поиск в Kodik, AniLibria, AnimeGo, Animevost...',
        'anime.player_1': 'Плеер 1 (Shikimori)',
        'anime.player_2': 'Плеер 2 (Anicli)',
        'anime.type': 'Тип:',
        'anime.status': 'Статус:',
        'anime.episodes': 'Эпизоды:',
        'anime.duration': 'Длительность:',
        'anime.min': 'мин.',
        'anime.aired': 'Выпуск:',
        'anime.rating': 'Рейтинг:',
        'anime.studios': 'Студии:',
        'anime.genres': 'Жанры:',
        'anime.scored_by': 'Оценили:',
        'anime.characters': 'Персонажи:',
        'anime.show_all_characters': 'Показать всех',
        'anime.hide_characters': 'Скрыть',
        'anime.franchise': 'Франшиза:',
        'anime.related': 'Относится:',
        'anime.screenshots': 'Скриншоты:',
        'anime.external_scores': 'Оценки на других сайтах:',
        'anime.videos': 'Видео:',
        'anime.licensed_by': 'Лицензиары:',
        'anime.my_progress': 'Мой прогресс:',
        'anime.chapters': 'Главы:',
        'anime.volumes': 'Тома:',
        'anime.publisher': 'Издательство:',

        // Lightbox
        'lightbox.close': 'Закрыть (Esc)',
        'lightbox.prev': 'Назад (←)',
        'lightbox.next': 'Вперед (→)',
        'lightbox.zoom': 'Нажмите для увеличения',
        'video.link': 'Видео',

        // Manga modal
        'manga.loading': 'Загрузка информации о манге...',
        'manga.load_error': 'Не удалось загрузить данные о манге',
        'manga.type': 'Тип:',
        'manga.status': 'Статус:',
        'manga.volumes': 'Томов:',
        'manga.chapters': 'Глав:',
        'manga.publisher': 'Издательство:',
        'manga.aired': 'Выпуск:',
        'manga.genres': 'Жанры:',

        // Character modal
        'character.loading': 'Загрузка персонажа...',
        'character.load_error': 'Не удалось загрузить персонажа',
        'character.info': 'Информация о персонаже',
        'character.anime': 'Аниме:',
        'character.manga': 'Манга:',

        // Club modal
        'club.loading': 'Загрузка информации о клубе...',
        'club.load_error': 'Не удалось загрузить данные клуба',
        'club.members': 'Участников:',
        'club.type': 'Тип:',
        'club.description': 'Описание клуба',

        // Player & Continue Watching
        'player.continue_watching': 'Продолжить просмотр',
        'player.continue_desc': 'Вы остановились здесь',
        'player.ep_short': 'сер.',
        'player.skip_intro': '+85 сек',
        'player.next_ep': 'След. серия',
        'player.prev_ep': 'Пред. серия',
        'player.mini_player': 'PiP',
        'player.restore': 'Развернуть',
        'player.close': 'Закрыть',

        // My List widget
        'mylist.title': 'Мой список',
        'mylist.not_in_list': 'Не в списке',
        'mylist.status': 'Статус:',
        'mylist.episodes': 'Серии:',
        'mylist.chapters': 'Главы:',
        'mylist.volumes': 'Тома:',
        'mylist.score': 'Оценка:',
        'mylist.note': 'Заметка / впечатления:',
        'mylist.note_placeholder': 'Напишите заметку...',
        'mylist.save': 'Сохранить',
        'mylist.saving': 'Сохранение...',
        'mylist.saved': 'Успешно сохранено в Shikimori',
        'mylist.delete': 'Удалить из списка',
        'mylist.deleted': 'Удалено из списка',
        'mylist.quick_inc': '+1',
        'mylist.search_placeholder': 'Поиск по вашим спискам...',
        'mylist.delete_confirm': 'Удалить из списка?',
        'mylist.delete_error': 'Ошибка удаления',
        'mylist.save_error': 'Ошибка при сохранении',
        'mylist.update_error': 'Ошибка обновления',

        // Airing Calendar
        'calendar.title': 'Расписание онгоингов',
        'calendar.today': 'Сегодня',
        'calendar.airing_soon': 'Скоро выйдет',
        'calendar.ep_next': 'серия',
        'calendar.empty_day': 'В этот день нет запланированных релизов',
        'calendar.mon': 'Пн',
        'calendar.tue': 'Вт',
        'calendar.wed': 'Ср',
        'calendar.thu': 'Чт',
        'calendar.fri': 'Пт',
        'calendar.sat': 'Сб',
        'calendar.sun': 'Вс',

        // Catalog
        'catalog.title': 'Каталог аниме',
        'catalog.filter.genre': 'Жанр',
        'catalog.filter.all_genres': 'Все жанры',
        'catalog.filter.season': 'Сезон / Год',
        'catalog.filter.all_seasons': 'Все сезоны',
        'catalog.season.summer_2026': 'Лето 2026',
        'catalog.season.spring_2026': 'Весна 2026',
        'catalog.season.winter_2026': 'Зима 2026',
        'catalog.season.fall_2025': 'Осень 2025',
        'catalog.season.y2026': '2026 год',
        'catalog.season.y2025': '2025 год',
        'catalog.season.y2024': '2024 год',
        'catalog.filter.type': 'Тип',
        'catalog.filter.all_types': 'Все типы',
        'catalog.kind.tv': 'ТВ Сериал',
        'catalog.kind.movie': 'Фильм',
        'catalog.kind.ova': 'OVA',
        'catalog.kind.ona': 'ONA',
        'catalog.kind.special': 'Спешл',
        'catalog.filter.status': 'Статус',
        'catalog.filter.all_statuses': 'Все статусы',
        'catalog.status.ongoing': 'Онгоинг',
        'catalog.status.released': 'Вышло',
        'catalog.status.anons': 'Анонс',
        'catalog.filter.score': 'Мин. оценка',
        'catalog.filter.all_scores': 'Любая',
        'catalog.filter.sort': 'Сортировка',
        'catalog.sort.ranked': 'По рейтингу',
        'catalog.sort.popularity': 'По популярности',
        'catalog.sort.aired_on': 'По дате выхода',
        'catalog.sort.name': 'По названию',
        'catalog.load_more': 'Загрузить ещё',
        'catalog.empty': 'Ничего не найдено по выбранным фильтрам',

        // Randomizer & Recommendations
        'random.title': 'Рандомайзер',
        'random.btn': 'Мне повезёт!',
        'random.tooltip': 'Случайное аниме (Мне повезёт!)',
        'random.finding': 'Подбираем случайное аниме...',
        'random.error': 'Не удалось подобрать тайтл',
        'recommendations.title': 'Рекомендуем посмотреть',

        // PWA
        'pwa.title': 'Приложение (PWA)',
        'pwa.desc': 'Установите Shiki MX как быстрое приложение для рабочего стола или смартфона.',
        'pwa.install': 'Установить приложение',
        'pwa.installed': 'Приложение установлено',
        'pwa.offline_toast': 'Вы находитесь в офлайн-режиме',
    },
    en: {
        // Header
        'tab.profile': 'Profile & Explore',
        'tab.rates': 'Lists',
        'tab.favourites': 'Favorites',
        'tab.friends': 'Friends',
        'tab.history': 'History',
        'search.title': 'Search',
        'search.placeholder': 'Search anime, manga...',
        'theme.title': 'Change theme',
        'logout': 'Log out',

        // Auth
        'login.shikimori': 'Log in',
        'login.via_shikimori': 'Log in with Shikimori',
        'auth.not_authorized': 'Authorization not completed',
        'auth.not_authorized.desc': 'Log in with Shikimori to view your profile, lists and explore.',

        // Profile
        'profile.info': 'Information',
        'profile.stats': 'Statistics',
        'profile.friends_clubs': 'Friends and clubs',
        'profile.activity': 'Activity',
        'profile.about': 'About',
        'profile.all': 'All',
        'profile.full_history': 'Full history',
        'profile.show_full': 'Show full',
        'profile.collapse': 'Collapse',
        'profile.expand': 'Show more',
        'profile.about_empty': 'About section is not filled.',
        'profile.stats_unavailable': 'Statistics unavailable',
        'profile.id': 'ID:',
        'profile.name': 'Name:',
        'profile.age': 'Age:',
        'profile.sex': 'Gender:',
        'profile.last_visit': 'Last visit:',
        'profile.anime_completed': 'Anime watched:',
        'profile.anime_watching': 'Watching anime:',
        'profile.manga_completed': 'Manga read:',
        'profile.manga_watching': 'Reading manga:',

        // Explore
        'explore.content': 'Content',
        'explore.hot_topics': 'Hot topics',
        'explore.main_news': 'Main news',
        'explore.more_news': 'More news',
        'explore.no_content': 'No content available',
        'explore.no_hot': 'No popular topics',
        'explore.searching': 'Searching...',
        'explore.no_results': 'No results found',
        'explore.min_chars': 'Enter at least 2 characters',
        'explore.topic': 'Topic',
        'explore.collection': 'Collection',
        'explore.review': 'Review',
        'explore.discussion': 'Discussion',
        'explore.article': 'Article',
        'explore.loading': 'Loading...',
        'explore.loading_more': 'Loading more news...',
        'explore.news_feed': 'News feed',
        'explore.collections': 'collections',
        'explore.reviews': 'reviews',
        'explore.articles': 'articles',
        'explore.search_error': 'Search error',
        'explore.status.released': 'Released',
        'explore.status.ongoing': 'Ongoing',
        'explore.status.anons': 'Announced',
        'explore.type': 'Type:',
        'explore.year': 'year',
        'explore.genres': 'Genres:',
        'explore.no_more_news': 'No more news',
        'explore.load_more_error': 'Error loading more news:',

        // Settings
        'settings.title': 'Settings',
        'settings.background': 'Site background',
        'settings.background.hint': 'Choose a background color or set any image.',
        'settings.color': 'Color',
        'settings.image': 'Image',
        'settings.bg_color': 'Background color',
        'settings.image_url': 'Image URL',
        'settings.or': 'or',
        'settings.upload': 'Upload from device',
        'settings.reset': 'Reset',
        'settings.section_visibility': 'Section visibility',
        'settings.section_visibility.hint': 'Choose which sections to display on the «Profile & Explore» tab.',
        'settings.navbar_view': 'Navigation view',
        'settings.navbar_view.hint': 'Choose how navigation elements are displayed.',
        'settings.navbar_view.full': 'Icon + label',
        'settings.navbar_view.icons': 'Icons only',
        'settings.navbar_view.titles': 'Labels only',

        // About modal
        'about.title': 'About',
        'about.features': 'Features',
        'about.tech_stack': 'Tech stack',
        'about.changelog': 'Changelog (Change history)',

        // Common
        'loading': 'Loading...',
        'rates.loading': 'Loading lists...',
        'favourites.loading': 'Loading favorites...',
        'friends.loading': 'Loading friends and clubs...',
        'history.loading': 'Loading history...',
        'common.load_error': 'Loading error',
        'error': 'Error',
        'close': 'Close',

        // Rates
        'rates.watching': 'Watching',
        'rates.completed': 'Completed',
        'rates.planned': 'Planned',
        'rates.on_hold': 'On hold',
        'rates.dropped': 'Dropped',
        'rates.rewatching': 'Rewatching',
        'rates.anime': 'Anime',
        'rates.manga': 'Manga',
        'rates.all': 'All',
        'rates.empty': 'List is empty',
        'rates.no_results': 'No records found',
        'rates.sort.updated': 'By update date',
        'rates.sort.score_desc': 'By score (highest first)',
        'rates.sort.score_asc': 'By score (lowest first)',
        'rates.sort.name': 'By name (A-Z)',
        'rates.sort.progress': 'By progress',
        'rates.progress': 'Progress',
        'rates.score': 'Score',
        'rates.progress.anime': 'eps',
        'rates.progress.manga': 'ch',
        'rates.rewatches': 'rewatches:',
        'rates.view.list': 'List',
        'rates.view.cards': 'Cards',
        'rates.view.large': 'Large',

        // Friends
        'friends.empty': 'List is empty',
        'friends.load_error': 'Loading error',
        'friends.friends': 'Friends',
        'friends.clubs': 'Clubs',
        'friends.private_club': 'Private club',
        'friends.public_club': 'Public club',
        'friends.open_shikimori': 'Open on Shikimori',
        'friends.about': 'About',
        'friends.about_empty': 'About section is not filled.',
        'friends.id': 'ID:',
        'friends.sex': 'Gender:',
        'friends.age': 'Age:',
        'friends.last_online': 'Last seen:',
        'friends.online_today': 'Online today',
        'friends.anime': 'Anime',
        'friends.manga': 'Manga',
        'friends.watched': 'Watched:',
        'friends.watching': 'Watching:',
        'friends.read': 'Read:',
        'friends.reading': 'Reading:',

        // Favourites
        'favourites.empty': 'Empty',
        'favourites.characters': 'Favorite characters',
        'favourites.animes': 'Favorite anime',
        'favourites.mangas': 'Favorite manga',

        // History
        'history.empty': 'History is empty',
        'history.load_error': 'Failed to load history',
        'history.full': 'Full history',

        // Anime modal
        'anime.loading': 'Loading information...',
        'anime.load_error': 'Failed to load data',
        'anime.playback_error': 'Playback error',
        'anime.no_players': 'No available players found',
        'anime.sources': 'Sources:',
        'anime.open_shikimori': 'Open on Shikimori',
        'anime.episode': 'Episode',
        'anime.translation': 'Dub / Sub:',
        'anime.player': 'Player / Mirror:',
        'anime.description': 'Description',
        'anime.search_error': 'Search error',
        'anime.no_results': 'No results found',
        'anime.search_players': 'Searching in Kodik, AniLibria, AnimeGo, Animevost...',
        'anime.player_1': 'Player 1 (Shikimori)',
        'anime.player_2': 'Player 2 (Anicli)',
        'anime.type': 'Type:',
        'anime.status': 'Status:',
        'anime.episodes': 'Episodes:',
        'anime.duration': 'Duration:',
        'anime.min': 'min.',
        'anime.aired': 'Aired:',
        'anime.rating': 'Rating:',
        'anime.studios': 'Studios:',
        'anime.genres': 'Genres:',
        'anime.scored_by': 'Rated by:',
        'anime.characters': 'Characters:',
        'anime.show_all_characters': 'Show all',
        'anime.hide_characters': 'Hide',
        'anime.franchise': 'Franchise:',
        'anime.related': 'Related:',
        'anime.screenshots': 'Screenshots:',
        'anime.external_scores': 'External scores:',
        'anime.videos': 'Videos:',
        'anime.licensed_by': 'Licensed by:',
        'anime.my_progress': 'My progress:',
        'anime.chapters': 'Chapters:',
        'anime.volumes': 'Volumes:',
        'anime.publisher': 'Publisher:',

        // Lightbox
        'lightbox.close': 'Close (Esc)',
        'lightbox.prev': 'Previous (←)',
        'lightbox.next': 'Next (→)',
        'lightbox.zoom': 'Click to zoom',
        'video.link': 'Video',

        // Manga modal
        'manga.loading': 'Loading manga information...',
        'manga.load_error': 'Failed to load manga data',
        'manga.type': 'Type:',
        'manga.status': 'Status:',
        'manga.volumes': 'Volumes:',
        'manga.chapters': 'Chapters:',
        'manga.publisher': 'Publisher:',
        'manga.aired': 'Aired:',
        'manga.genres': 'Genres:',

        // Character modal
        'character.loading': 'Loading character...',
        'character.load_error': 'Failed to load character',
        'character.info': 'Character information',
        'character.anime': 'Anime:',
        'character.manga': 'Manga:',

        // Club modal
        'club.loading': 'Loading club information...',
        'club.load_error': 'Failed to load club data',
        'club.members': 'Members:',
        'club.type': 'Type:',
        'club.description': 'Club description',

        // Player & Continue Watching
        'player.continue_watching': 'Continue Watching',
        'player.continue_desc': 'Pick up where you left off',
        'player.ep_short': 'ep.',
        'player.skip_intro': '+85 sec',
        'player.next_ep': 'Next Episode',
        'player.prev_ep': 'Prev Episode',
        'player.mini_player': 'PiP',
        'player.restore': 'Restore',
        'player.close': 'Close',

        // My List widget
        'mylist.title': 'My List',
        'mylist.not_in_list': 'Not in list',
        'mylist.status': 'Status:',
        'mylist.episodes': 'Episodes:',
        'mylist.chapters': 'Chapters:',
        'mylist.volumes': 'Volumes:',
        'mylist.score': 'Score:',
        'mylist.note': 'Note / Review:',
        'mylist.note_placeholder': 'Write your personal note...',
        'mylist.save': 'Save',
        'mylist.saving': 'Saving...',
        'mylist.saved': 'Successfully saved to Shikimori',
        'mylist.delete': 'Remove from list',
        'mylist.deleted': 'Removed from list',
        'mylist.quick_inc': '+1',
        'mylist.search_placeholder': 'Search your lists...',
        'mylist.delete_confirm': 'Remove from list?',
        'mylist.delete_error': 'Error removing item',
        'mylist.save_error': 'Error saving item',
        'mylist.update_error': 'Error updating',

        // Airing Calendar
        'calendar.title': 'Airing Schedule',
        'calendar.today': 'Today',
        'calendar.airing_soon': 'Airing soon',
        'calendar.ep_next': 'ep.',
        'calendar.empty_day': 'No scheduled releases on this day',
        'calendar.mon': 'Mon',
        'calendar.tue': 'Tue',
        'calendar.wed': 'Wed',
        'calendar.thu': 'Thu',
        'calendar.fri': 'Fri',
        'calendar.sat': 'Sat',
        'calendar.sun': 'Sun',

        // Catalog
        'catalog.title': 'Anime Catalog',
        'catalog.filter.genre': 'Genre',
        'catalog.filter.all_genres': 'All genres',
        'catalog.filter.season': 'Season / Year',
        'catalog.filter.all_seasons': 'All seasons',
        'catalog.season.summer_2026': 'Summer 2026',
        'catalog.season.spring_2026': 'Spring 2026',
        'catalog.season.winter_2026': 'Winter 2026',
        'catalog.season.fall_2025': 'Fall 2025',
        'catalog.season.y2026': '2026',
        'catalog.season.y2025': '2025',
        'catalog.season.y2024': '2024',
        'catalog.filter.type': 'Type',
        'catalog.filter.all_types': 'All types',
        'catalog.kind.tv': 'TV Series',
        'catalog.kind.movie': 'Movie',
        'catalog.kind.ova': 'OVA',
        'catalog.kind.ona': 'ONA',
        'catalog.kind.special': 'Special',
        'catalog.filter.status': 'Status',
        'catalog.filter.all_statuses': 'All statuses',
        'catalog.status.ongoing': 'Ongoing',
        'catalog.status.released': 'Released',
        'catalog.status.anons': 'Announced',
        'catalog.filter.score': 'Min Score',
        'catalog.filter.all_scores': 'Any',
        'catalog.filter.sort': 'Sort',
        'catalog.sort.ranked': 'By Rating',
        'catalog.sort.popularity': 'By Popularity',
        'catalog.sort.aired_on': 'By Release Date',
        'catalog.sort.name': 'By Name',
        'catalog.load_more': 'Load More',
        'catalog.empty': 'No anime found matching selected filters',

        // Randomizer & Recommendations
        'random.title': 'Random Anime',
        'random.btn': 'I\'m Feeling Lucky!',
        'random.tooltip': 'Random Anime (I\'m Feeling Lucky!)',
        'random.finding': 'Picking a random anime...',
        'random.error': 'Could not find anime',
        'recommendations.title': 'Recommended for You',

        // PWA
        'pwa.title': 'App (PWA)',
        'pwa.desc': 'Install Shiki MX as a fast app on desktop or mobile.',
        'pwa.install': 'Install Application',
        'pwa.installed': 'App installed',
        'pwa.offline_toast': 'You are currently offline',
    }
};

const LANGUAGE_KEY = 'app_language';
let currentLanguage = 'ru';

function getSavedLanguage() {
    try {
        return localStorage.getItem(LANGUAGE_KEY) || 'ru';
    } catch (err) {
        return 'ru';
    }
}

function saveLanguage(lang) {
    try {
        localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (err) {
        console.error('Ошибка сохранения языка:', err);
    }
}

function t(key) {
    const lang = getSavedLanguage();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['ru'];
    return (dict && dict[key]) || (TRANSLATIONS['ru'] && TRANSLATIONS['ru'][key]) || key;
}

function applyTranslations() {
    const lang = getSavedLanguage();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const translation = t(key);
        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        const translation = t(key);
        if (translation) {
            el.title = translation;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const translation = t(key);
        if (translation) {
            el.placeholder = translation;
        }
    });
}

function toggleLanguage() {
    const current = getSavedLanguage();
    const next = current === 'ru' ? 'en' : 'ru';
    saveLanguage(next);
    currentLanguage = next;
    applyTranslations();
    updateLanguageButton();
    window.location.reload();
}

function updateLanguageButton() {
    const btn = document.getElementById('lang-toggle-btn');
    if (!btn) return;
    const lang = getSavedLanguage();
    const label = btn.querySelector('.lang-label');
    if (label) {
        label.textContent = lang === 'ru' ? 'RU' : 'EN';
    }
    btn.title = lang === 'ru' ? 'Switch to English' : 'Переключить на русский';
}

document.addEventListener('DOMContentLoaded', () => {
    currentLanguage = getSavedLanguage();
    applyTranslations();
    updateLanguageButton();
});

;
/* --- js/core.js --- */
const tabLoaded = {};
let cachedHistoryData = null;
let ratesDataCache = [];

function showLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
}

window.addEventListener('load', () => setTimeout(hideLoader, 300));

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
}

function buildImgUrl(src, highRes = false) {
    if (!src) return '';
    if (typeof src === 'string') {
        if (src.startsWith('data:')) return src;
        if (src.includes('missing_original') || src.includes('missing_preview')) return '';
    }
    let path = '';
    if (typeof src === 'object' && src !== null) {
        if (highRes) {
            path = src.original || src.x160 || src.main || src.preview || '';
        } else {
            path = src.x160 || src.preview || src.main || src.original || '';
        }
    } else {
        path = String(src);
    }
    if (!path || path === 'None' || path === '{}') return '';
    if (path.includes('missing_original') || path.includes('missing_preview')) return '';

    if (highRes) {
        path = path.replace(/\/(x64|x32|preview)\//, '/original/');
    }

    const fullUrl = path.startsWith('http') ? path : 'https://shikimori.io' + (path.startsWith('/') ? path : '/' + path);
    return fullUrl;
}


function setupSectionLazyLoader(target, callback, rootMargin = '250px') {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;

    if (el.classList.contains('hidden') || el.style.display === 'none') {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        callback();
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                obs.unobserve(entry.target);
                callback();
            }
        });
    }, { rootMargin });

    observer.observe(el);
}
window.setupSectionLazyLoader = setupSectionLazyLoader;

async function openTab(tabId) {
    localStorage.setItem('activeTab', tabId);
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-tab-btn').forEach(el => el.classList.remove('active'));

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');

    document.querySelectorAll(`.tab-btn[onclick*="'${tabId}'"]`).forEach(btn => btn.classList.add('active'));
    document.querySelectorAll(`.mobile-tab-btn[data-tab="${tabId}"]`).forEach(btn => btn.classList.add('active'));

    if (tabId === 'profile') {
        // Ленивая подгрузка новостей только при приближении к области видимости
        setupSectionLazyLoader('explore-news-container', async () => {
            if (!tabLoaded['explore']) {
                try {
                    const res = await fetch(`/api/tab/explore`);
                    const data = await res.json();
                    tabLoaded['explore'] = true;
                    renderExplore(data);
                } catch (err) {
                    console.error('Ошибка загрузки новостей:', err);
                }
            }
        }, '300px');
        return;
    }
    if (tabId === 'history' && cachedHistoryData) {
        renderHistory(cachedHistoryData);
        tabLoaded['history'] = true;
        return;
    }
    if (tabLoaded[tabId]) return;

    showLoader();
    try {
        const res = await fetch(`/api/tab/${tabId}`);
        const data = await res.json();
        tabLoaded[tabId] = true;

        if (tabId === 'favourites') renderFavourites(data);
        else if (tabId === 'friends') renderFriends(data);
        else if (tabId === 'history') { cachedHistoryData = data; renderHistory(data); }
        else if (tabId === 'rates') { ratesDataCache = data; renderRatesView(); }
    } catch (err) {
        console.error(`Ошибка загрузки вкладки ${tabId}:`, err);
        if (activeContent) activeContent.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
    } finally {
        hideLoader();
    }
}
window.openTab = openTab;


async function syncAppVersion() {
    try {
        const res = await fetch('/api/about');
        const data = await res.json();

        if (data.version) {
            const dropdownVer = document.getElementById('dropdown-version');
            if (dropdownVer) dropdownVer.innerHTML = `<i class="ti ti-code"></i> Shiki MX v${data.version}`;

            const badgeVer = document.getElementById('about-badge-version');
            if (badgeVer) badgeVer.innerText = `v${data.version}`;
        }
        return data;
    } catch (err) {
        console.error('Ошибка получения версии приложения:', err);
        return null;
    }
}

async function openAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    try {
        const data = await syncAppVersion();
        if (!data) return;

        const descEl = document.getElementById('about-modal-desc');
        if (descEl && data.description) descEl.innerText = data.description;

        const featuresEl = document.getElementById('about-modal-features');
        if (featuresEl && data.features) {
            featuresEl.innerHTML = data.features.map(f => `<li><i class="ti ti-check"></i> ${f}</li>`).join('');
        }

        const stackEl = document.getElementById('about-modal-stack');
        if (stackEl && data.stack) {
            stackEl.innerHTML = data.stack.map(s => `<span class="search-tag">${s}</span>`).join('');
        }

        const changelogEl = document.getElementById('about-modal-changelog');
        if (changelogEl && Array.isArray(data.changelog)) {
            changelogEl.innerHTML = data.changelog.map(item => `
                <div class="changelog-item">
                    <div class="changelog-header">
                        <div class="changelog-title-wrap">
                            <span class="changelog-version">v${item.version}</span>
                            <span class="changelog-item-title">${item.title || ''}</span>
                        </div>
                        <span class="changelog-date">${item.date || ''}</span>
                    </div>
                    <ul class="changelog-changes">
                        ${(item.changes || []).map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Ошибка загрузки данных о сайте:', err);
    }
}

function closeAboutModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('about-modal');
    if (modal) modal.classList.add('hidden');
}

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'ti-info-circle';
    if (type === 'success') icon = 'ti-circle-check';
    else if (type === 'error') icon = 'ti-alert-circle';
    else if (type === 'warning') icon = 'ti-alert-triangle';

    toast.innerHTML = `
        <i class="ti ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
window.showToast = showToast;

// PWA Service Worker & Install Prompt
window.deferredPwaPrompt = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
            .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPwaPrompt = e;
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.remove('hidden'));
});

window.addEventListener('appinstalled', () => {
    window.deferredPwaPrompt = null;
    showToast(i18n('pwa.installed'), 'success');
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.add('hidden'));
});

function installPwaApp() {
    if (!window.deferredPwaPrompt) {
        showToast(i18n('pwa.install'), 'info');
        return;
    }
    window.deferredPwaPrompt.prompt();
    window.deferredPwaPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted install prompt');
        }
        window.deferredPwaPrompt = null;
    });
}
window.installPwaApp = installPwaApp;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    syncAppVersion();

    const savedTab = localStorage.getItem('activeTab') || 'profile';
    openTab(savedTab);

    // Ленивая загрузка карточек профиля только при попадании во вьюпорт
    setupSectionLazyLoader('recent-history-list', () => {
        if (typeof loadRecentHistory === 'function') loadRecentHistory();
    }, '250px');

    setupSectionLazyLoader('profile-friends-clubs-preview', () => {
        if (typeof loadProfileFriendsClubs === 'function') loadProfileFriendsClubs();
    }, '250px');

    if (typeof applyTranslations === 'function') applyTranslations();
    if (typeof updateLanguageButton === 'function') updateLanguageButton();

    // Ленивая подгрузка BBCode сеток (shiki-grid) только при скролле к ним
    document.querySelectorAll('.shiki-grid').forEach((grid) => {
        setupSectionLazyLoader(grid, async () => {
            const type = grid.dataset.type;
            const ids = grid.dataset.ids;
            if (!ids) return;

            try {
                const res = await fetch(`/api/grid-data?type=${type}&ids=${ids}`);
                const items = await res.json();
                if (!Array.isArray(items)) return;

                grid.innerHTML = items.map(item => {
                    const title = item.russian || item.name || '';
                    const imgUrl = buildImgUrl(item.image);
                    const itemUrl = item.url ? `https://shikimori.io${item.url}` : `https://shikimori.io/${type}/${item.id}`;
                    return `
                        <a href="${itemUrl}" target="_blank" class="shiki-grid-item" title="${title}">
                            <img src="${imgUrl}" alt="${title}" loading="lazy" decoding="async">
                            <div class="item-title">${title}</div>
                        </a>`;
                }).join('');
            } catch (err) {
                console.error('Ошибка загрузки сетки:', err);
            }
        }, '250px');
    });
});

;
/* --- js/anime.js --- */
// ==================== EVENT LISTENERS & MODAL HANDLERS ====================

document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    if (link.dataset.external === 'true') return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    if (!href.includes('shikimori') && !href.startsWith('/')) return;

    const animeMatch = href.match(/shikimori\.(?:io|one|me)?\/animes\/(?:z|a)?(\d+)/) || href.match(/\/animes\/(?:z|a)?(\d+)/);
    if (animeMatch && animeMatch[1]) {
        e.preventDefault();
        openAnimeModal(animeMatch[1]);
        return;
    }

    const mangaMatch = href.match(/shikimori\.(?:io|one|me)?\/mangas\/(?:z|a)?(\d+)/) || href.match(/\/mangas\/(?:z|a)?(\d+)/);
    if (mangaMatch && mangaMatch[1]) {
        e.preventDefault();
        openMangaModal(mangaMatch[1]);
        return;
    }

    const charMatch = href.match(/shikimori\.(?:io|one|me)?\/characters\/(?:z|a)?(\d+)/) || href.match(/\/characters\/(?:z|a)?(\d+)/);
    if (charMatch && charMatch[1]) {
        e.preventDefault();
        openCharacterModal(charMatch[1]);
        return;
    }

    const userMatch = href.match(/shikimori\.(?:io|one|me)?\/users\/([^\/\?]+)/) || href.match(/\/users\/([^\/\?]+)/);
    const directUserMatch = !userMatch && href.match(/shikimori\.(?:io|one|me)\/([A-Za-z0-9_\-]+)\s*$/);
    const resolvedUser = userMatch || directUserMatch;
    if (resolvedUser && resolvedUser[1] && !['sign_in', 'sign_out', 'whoami', 'animes', 'mangas', 'characters', 'clubs', 'forum', 'api', 'oauth', 'about', 'topics', 'collections', 'reviews', 'contests', 'moderations', 'pages', 'terms'].includes(resolvedUser[1])) {
        e.preventDefault();
        openUserModal(resolvedUser[1]);
        return;
    }

    const clubMatch = href.match(/shikimori\.(?:io|one|me)?\/clubs\/(\d+)/) || href.match(/\/clubs\/(\d+)/);
    if (clubMatch && clubMatch[1]) {
        e.preventDefault();
        openClubModal(clubMatch[1]);
        return;
    }
});

window.modalStack = [];

function pushModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && body.innerHTML.trim()) {
        window.modalStack.push(body.innerHTML);
    }
    updateBackButtonVisibility();
}

function popModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && window.modalStack.length > 0) {
        body.innerHTML = window.modalStack.pop();
        updateBackButtonVisibility();
        return true;
    }
    return false;
}

function updateBackButtonVisibility() {
    const backBtn = document.querySelector('.modal-back-btn');
    if (backBtn) {
        backBtn.classList.toggle('visible', window.modalStack.length > 0);
    }
}

function handleModalBack() {
    const animeModal = document.getElementById('anime-modal');
    if (animeModal && !animeModal.classList.contains('hidden')) {
        if (!popModalState()) {
            closeAnimeModal({target: animeModal});
        }
        return;
    }

    const aboutModal = document.getElementById('about-modal');
    if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        document.body.style.overflow = '';
        return;
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
        document.body.style.overflow = '';
        return;
    }
}

window.handleModalBack = handleModalBack;

async function openAnimeModal(animeId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.loading') + '</div>';

    try {
        const res = await fetch(`/api/anime/${animeId}`);
        if (!res.ok) throw new Error(i18n('anime.load_error'));
        const anime = await res.json();
        renderAnimeDetail(anime);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.load_error')}: ${err.message}</div>`;
    }
}

function closeAnimeModal(e) {
    if (e && e.target) {
        const isOverlay = e.target.classList.contains('modal-overlay');
        const isCloseBtn = !!e.target.closest('.modal-close-btn');
        if (!isOverlay && !isCloseBtn) {
            return;
        }
    }
    const modal = document.getElementById('anime-modal');
    if (!modal) return;

    if (popModalState()) {
        return;
    }

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    const player = document.getElementById('watch-player-container');
    if (player) {
        player.classList.add('hidden');
        player.innerHTML = '';
        player.dataset.playerType = '';
    }
}
window.closeAnimeModal = closeAnimeModal;

function toggleWatchPlayer(shikimoriPath, episode = 1) {
    const container = document.getElementById('watch-player-container');
    if (!container || !shikimoriPath) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'shikimori') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        return;
    }

    const cleanPath = shikimoriPath.replace(/^https?:\/\/[^\/]+/, '').replace(/\/watch$/, '');
    let watchUrl = `https://shikimori.io${cleanPath}/watch`;
    
    if (episode && episode > 1) {
        watchUrl += `?episode=${episode}`;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'shikimori';
    container.innerHTML = `
        <div class="watch-player-crop-wrapper">
            <iframe 
                src="${watchUrl}" 
                allowfullscreen 
                allow="autoplay; fullscreen; picture-in-picture">
            </iframe>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function toggleAnicliPlayer(title, episode = 1, animeId = 0) {
    const container = document.getElementById('watch-player-container');
    if (!container) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'anicli') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        window.anicliEpisodesData = null;
        window.anicliSourcesFound = [];
        return;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'anicli';
    container.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.search_players') + '</div>';

    try {
        const res = await fetch(`/api/anime/${animeId}/anicli?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error || i18n('anime.load_error'));

        window.anicliEpisodesData = data.episodes || {};
        window.anicliSourcesFound = data.sources_found || [];
        initAnicliPlayerUI(container, episode);
    } catch (err) {
        container.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.playback_error')}: ${err.message}</div>`;
    }
}

// ==================== SCREENSHOT LIGHTBOX ====================
let currentScreenshots = [];

let currentScreenshotIndex = 0;

function openScreenshotLightbox(index) {
    if (!currentScreenshots || !currentScreenshots.length) return;
    currentScreenshotIndex = index;

    let lightbox = document.getElementById('screenshot-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'screenshot-lightbox';
        lightbox.className = 'screenshot-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="closeScreenshotLightbox()"></div>
            <button class="lightbox-close-btn" onclick="closeScreenshotLightbox()" title="${i18n('lightbox.close')}"><i class="ti ti-x"></i></button>
            <button class="lightbox-nav-btn lightbox-prev-btn" onclick="prevScreenshot(event)" title="${i18n('lightbox.prev')}"><i class="ti ti-chevron-left"></i></button>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" alt="Screenshot" />
                <div id="lightbox-counter" class="lightbox-counter"></div>
            </div>
            <button class="lightbox-nav-btn lightbox-next-btn" onclick="nextScreenshot(event)" title="${i18n('lightbox.next')}"><i class="ti ti-chevron-right"></i></button>

        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', (e) => {
            const lb = document.getElementById('screenshot-lightbox');
            if (!lb || !lb.classList.contains('active')) return;
            if (e.key === 'Escape') closeScreenshotLightbox();
            if (e.key === 'ArrowLeft') prevScreenshot();
            if (e.key === 'ArrowRight') nextScreenshot();
        });
    }

    updateLightbox();
    lightbox.classList.add('active');
}

function updateLightbox() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    if (img && currentScreenshots[currentScreenshotIndex]) {
        img.src = currentScreenshots[currentScreenshotIndex];
    }
    if (counter) {
        counter.textContent = `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
    }
}

function closeScreenshotLightbox() {
    const lightbox = document.getElementById('screenshot-lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

function prevScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex > 0) {
        currentScreenshotIndex--;
    } else {
        currentScreenshotIndex = currentScreenshots.length - 1;
    }
    updateLightbox();
}

function nextScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex < currentScreenshots.length - 1) {
        currentScreenshotIndex++;
    } else {
        currentScreenshotIndex = 0;
    }
    updateLightbox();
}

window.openScreenshotLightbox = openScreenshotLightbox;
window.closeScreenshotLightbox = closeScreenshotLightbox;
window.prevScreenshot = prevScreenshot;
window.nextScreenshot = nextScreenshot;

function saveWatchProgress(animeId, title, russian, poster, episode, translation, totalEpisodes) {

    if (!animeId) return;
    try {
        let list = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        list = list.filter(item => item.id != animeId);
        list.unshift({
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || '',
            total_episodes: totalEpisodes || 0,
            updated_at: new Date().toISOString()
        });
        list = list.slice(0, 20);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));
        if (typeof renderContinueWatching === 'function') {
            renderContinueWatching();
        }
    } catch (e) {
        console.warn('Failed to save watch progress:', e);
    }
}
window.saveWatchProgress = saveWatchProgress;

function stepAnicliEpisode(delta) {
    if (typeof window.currentAnicliEp !== 'number') return;
    const availableEpNums = Object.keys(window.anicliEpisodesData || {}).map(Number).sort((a, b) => a - b);
    const currentIdx = availableEpNums.indexOf(window.currentAnicliEp);
    const nextIdx = currentIdx + delta;
    if (nextIdx < 0 || nextIdx >= availableEpNums.length) {
        showToast(delta > 0 ? 'Это последняя серия!' : 'Это первая серия!', 'info', 2000);
        return;
    }

    const nextEp = availableEpNums[nextIdx];
    const epData = window.anicliEpisodesData[nextEp.toString()];
    if (!epData) {
        onAnicliEpisodeChange(nextEp);
        return;
    }

    const currentDub = window.currentAnicliTrans;
    const currentPlayer = window.currentAnicliPlayerName;

    // 1. Проверяем наличие текущей озвучки в новой серии
    if (!currentDub || !epData[currentDub]) {
        // Озвучка не найдена в новой серии -> открываем выбор озвучки (Шаг 2)
        onAnicliEpisodeChange(nextEp);
        if (currentDub) {
            showToast(`Серия ${nextEp} не найдена в озвучке «${currentDub}». Выберите другую озвучку`, 'warning', 4000);
        }
        return;
    }

    // 2. Озвучка есть. Проверяем наличие того же источника (плеера)
    const availablePlayers = epData[currentDub];
    let matchedPlayer = null;

    if (currentPlayer && availablePlayers && availablePlayers.length) {
        // Точное совпадение
        matchedPlayer = availablePlayers.find(p => p.player === currentPlayer);

        // Если было Kodik #1, а в новой серии просто Kodik (или наоборот), сопоставляем по базовому имени
        if (!matchedPlayer) {
            const baseName = currentPlayer.replace(/\s*#\d+$/, '').trim().toLowerCase();
            matchedPlayer = availablePlayers.find(p => p.player.replace(/\s*#\d+$/, '').trim().toLowerCase() === baseName);
        }
    }

    // 3. Если источник найден -> сразу запускаем воспроизведение новой серии
    if (matchedPlayer) {
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        const transLbl = document.getElementById('wizard-trans-lbl');
        if (transLbl) transLbl.innerText = `(${currentDub})`;
        populateAnicliPlayers(nextEp, currentDub);

        onAnicliPlayerChange(matchedPlayer.url, null, matchedPlayer.player);
        showToast(`Серия ${nextEp} • ${currentDub} • ${matchedPlayer.player}`, 'info', 2000);
    } else {
        // Источник не найден -> открываем выбор источника (Шаг 3)
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        onAnicliTranslationChange(currentDub);

        showToast(`Источник «${currentPlayer || 'выбранный'}» не найден для ${nextEp} серии. Выберите другой источник`, 'warning', 4000);
    }
}
window.stepAnicliEpisode = stepAnicliEpisode;

function skipPlayerIntro() {
    showToast(i18n('player.skip_intro') + ' ⏩', 'info', 1800);
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage({ event: 'seek', value: 85 }, '*');
        } catch (e) {}
    }
}
window.skipPlayerIntro = skipPlayerIntro;

async function toggleFloatingMiniPlayer() {
    const iframe = document.getElementById('anicli-iframe') || document.querySelector('#watch-player-container iframe');
    if (!iframe || !iframe.src) {
        showToast(i18n('anime.no_players'), 'warning');
        return;
    }

    const currentSrc = iframe.src;
    const animeTitle = window.currentPlayingTitle || document.querySelector('.anime-title')?.textContent || 'Anime';
    const epNum = window.currentAnicliEp || '';
    const epText = epNum ? ` | Серия ${epNum}` : '';

    // 1. Настоящий системный PiP (Document Picture-in-Picture API) - виден поверх всех окон при свёрнутом браузере
    if ('documentPictureInPicture' in window) {
        try {
            if (window.pipWindowInstance && !window.pipWindowInstance.closed) {
                window.pipWindowInstance.close();
            }

            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 640,
                height: 360
            });
            window.pipWindowInstance = pipWindow;

            pipWindow.document.title = `${animeTitle}${epText} - PiP`;
            pipWindow.document.body.style.margin = '0';
            pipWindow.document.body.style.padding = '0';
            pipWindow.document.body.style.background = '#000';
            pipWindow.document.body.style.overflow = 'hidden';
            pipWindow.document.body.style.width = '100vw';
            pipWindow.document.body.style.height = '100vh';

            const pipIframe = document.createElement('iframe');
            pipIframe.src = currentSrc;
            pipIframe.style.width = '100%';
            pipIframe.style.height = '100%';
            pipIframe.style.border = 'none';
            pipIframe.allow = "autoplay; fullscreen; picture-in-picture";
            pipIframe.setAttribute('allowfullscreen', 'true');
            pipIframe.setAttribute('referrerpolicy', 'no-referrer');
            
            pipWindow.document.body.appendChild(pipIframe);

            showToast('Настоящий PiP открыт поверх всех окон! 📺', 'success');
            return;
        } catch (e) {
            console.warn('Document Picture-in-Picture failed:', e);
        }
    }

    // 2. Резервный HTML5 Video PiP (если доступен)
    try {
        if (document.pictureInPictureEnabled) {
            const video = iframe.contentDocument?.querySelector('video');
            if (video) {
                await video.requestPictureInPicture();
                showToast('PiP активирован!', 'info');
                return;
            }
        }
    } catch (e) {}

    // 3. Fallback: внутристраничный плавающий мини-плеер
    let miniPlayer = document.getElementById('floating-mini-player');
    if (!miniPlayer) {
        miniPlayer = document.createElement('div');
        miniPlayer.id = 'floating-mini-player';
        miniPlayer.className = 'floating-mini-player';
        document.body.appendChild(miniPlayer);
    }

    miniPlayer.innerHTML = `
        <div class="mini-player-header">
            <span class="mini-player-title" title="${animeTitle}">${animeTitle}${epText}</span>
            <div class="mini-player-controls">
                <button onclick="restoreFloatingMiniPlayer()" title="${i18n('player.restore')}"><i class="ti ti-arrows-maximize"></i></button>
                <button onclick="closeFloatingMiniPlayer()" title="${i18n('player.close')}"><i class="ti ti-x"></i></button>
            </div>
        </div>
        <div class="mini-player-body">
            <iframe src="${currentSrc}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>
        </div>
    `;

    miniPlayer.classList.remove('hidden');
    closeAnimeModal();
    showToast(i18n('player.mini_player'), 'info');
}
window.toggleFloatingMiniPlayer = toggleFloatingMiniPlayer;

function closeFloatingMiniPlayer() {
    const miniPlayer = document.getElementById('floating-mini-player');
    if (miniPlayer) {
        miniPlayer.classList.add('hidden');
        miniPlayer.innerHTML = '';
    }
}
window.closeFloatingMiniPlayer = closeFloatingMiniPlayer;

function restoreFloatingMiniPlayer() {
    closeFloatingMiniPlayer();
    if (window.currentPlayingAnimeId) {
        openAnimeModal(window.currentPlayingAnimeId);
    }
}
window.restoreFloatingMiniPlayer = restoreFloatingMiniPlayer;


function initAnicliPlayerUI(container, initialEpisode = 1) {
    const episodes = window.anicliEpisodesData;
    if (!episodes || !Object.keys(episodes).length) {
        container.innerHTML = '<div class="anime-error"><i class="ti ti-alert-circle"></i> ' + i18n('anime.no_players') + '</div>';
        return;
    }

    const availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    window.currentAnicliEp = availableEpNums.includes(initialEpisode) ? initialEpisode : availableEpNums[0];
    window.currentAnicliTrans = null;
    const sourcesFound = window.anicliSourcesFound || [];

    container.innerHTML = `
        <div class="anicli-player-wrapper">
            ${sourcesFound.length ? `
                <div class="anicli-sources-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--text-muted);">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span><i class="ti ti-circle-check" style="color: var(--success);"></i> ${i18n('anime.sources')}</span>
                        ${sourcesFound.map(s => `<span class="badge badge-watching" style="font-size: 10px; padding: 2px 8px;">${s}</span>`).join(' ')}
                    </div>
                </div>
            ` : ''}
            
            <div id="anicli-wizard" class="anicli-wizard-container">
                <!-- STEP 1: EPISODE -->
                <div class="anicli-step-container" id="anicli-step-1">
                    <div class="anicli-step-title"><i class="ti ti-list-numbers"></i> Шаг 1: Выберите серию</div>
                    <div class="anicli-chip-list" id="anicli-ep-chips">
                        ${availableEpNums.map(num => `<div class="anicli-chip" data-ep="${num}" onclick="onAnicliEpisodeChange(${num})">${num} серия</div>`).join('')}
                    </div>
                </div>

                <!-- STEP 2: TRANSLATION -->
                <div class="anicli-step-container hidden" id="anicli-step-2">
                    <div class="anicli-step-title" style="justify-content: space-between;">
                        <span><i class="ti ti-headphones"></i> Шаг 2: Выберите озвучку <span id="wizard-ep-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                        <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-arrow-left"></i> Назад</button>
                    </div>
                    <div class="anicli-chip-list" id="anicli-trans-chips"></div>
                </div>

                <!-- STEP 3: PLAYER -->
                <div class="anicli-step-container hidden" id="anicli-step-3">
                    <div class="anicli-step-title" style="justify-content: space-between;">
                        <span><i class="ti ti-video"></i> Шаг 3: Выберите источник <span id="wizard-trans-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                        <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(2)"><i class="ti ti-arrow-left"></i> Назад</button>
                    </div>
                    <div class="anicli-chip-list" id="anicli-player-chips"></div>
                </div>
            </div>

            <!-- VIDEO VIEW (Hidden initially) -->
            <div id="anicli-video-view" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="color: var(--text-main); font-size: 13px; font-weight: 600;" id="video-active-info"></div>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-settings"></i> Изменить</button>
                </div>

                <div class="watch-player-crop-wrapper" style="height: 480px; margin-bottom: 12px;">
                    <iframe 
                        id="anicli-iframe" 
                        src="" 
                        allowfullscreen 
                        referrerpolicy="no-referrer"
                        allow="autoplay; fullscreen; picture-in-picture"
                        style="width: 100%; height: 100%; border: none; border-radius: 8px; background: #000;">
                    </iframe>
                </div>

                <div class="player-quick-actions-bar">
                    <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(-1)">
                        <i class="ti ti-player-skip-back"></i> <span data-i18n="player.prev_ep">${i18n('player.prev_ep')}</span>
                    </button>
                    <button type="button" class="btn-player-action btn-skip-intro" onclick="skipPlayerIntro()">
                        <i class="ti ti-player-track-next"></i> <span>${i18n('player.skip_intro')}</span>
                    </button>
                    <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(1)">
                        <i class="ti ti-player-skip-forward"></i> <span data-i18n="player.next_ep">${i18n('player.next_ep')}</span>
                    </button>
                    <button type="button" class="btn-player-action" onclick="toggleFloatingMiniPlayer()">
                        <i class="ti ti-picture-in-picture-top"></i> <span data-i18n="player.mini_player">${i18n('player.mini_player')}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initialize state
    goToAnicliStep(1);
}

function goToAnicliStep(step) {
    const s1 = document.getElementById('anicli-step-1');
    const s2 = document.getElementById('anicli-step-2');
    const s3 = document.getElementById('anicli-step-3');
    const wizard = document.getElementById('anicli-wizard');
    const video = document.getElementById('anicli-video-view');
    const iframe = document.getElementById('anicli-iframe');

    if (!s1) return;

    wizard.classList.remove('hidden');
    video.classList.add('hidden');
    
    if (step === 1) {
        // Only show episodes
        s1.classList.remove('hidden');
        s2.classList.add('hidden');
        s3.classList.add('hidden');
        if (iframe) iframe.src = ""; // Stop video if going back to setup
    } else if (step === 2) {
        // Show translations
        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        s3.classList.add('hidden');
    } else if (step === 3) {
        // Show players
        s1.classList.add('hidden');
        s2.classList.add('hidden');
        s3.classList.remove('hidden');
    } else if (step === 4) {
        // Show video
        wizard.classList.add('hidden');
        video.classList.remove('hidden');
    }
}

function onAnicliEpisodeChange(epNum) {
    window.currentAnicliEp = epNum;
    
    // Update active class on chips (visual feedback if they go back)
    document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === epNum);
    });

    document.getElementById('wizard-ep-lbl').innerText = `(Серия ${epNum})`;
    populateAnicliTranslations(epNum);
    goToAnicliStep(2);
}

function populateAnicliTranslations(epNum) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const transChips = document.getElementById('anicli-trans-chips');
    if (!epData || !transChips) return;

    const availableTrans = Object.keys(epData);
    
    transChips.innerHTML = availableTrans.map(tr => {
        return `<div class="anicli-chip" onclick="onAnicliTranslationChange('${tr.replace(/'/g, "\\'")}')">${tr}</div>`;
    }).join('');
}

function onAnicliTranslationChange(transName) {
    window.currentAnicliTrans = transName;
    
    document.querySelectorAll('#anicli-trans-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', c.innerText === transName);
    });

    document.getElementById('wizard-trans-lbl').innerText = `(${transName})`;
    populateAnicliPlayers(window.currentAnicliEp, transName);
    goToAnicliStep(3);
}

function populateAnicliPlayers(epNum, transName) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const playerChips = document.getElementById('anicli-player-chips');
    if (!epData || !epData[transName] || !playerChips) return;

    const players = epData[transName];

    playerChips.innerHTML = players.map((p, idx) => {
        return `<div class="anicli-chip" onclick="onAnicliPlayerChange('${p.url}', this, '${p.player}')">
                    ${p.player}
                </div>`;
    }).join('');
}

function onAnicliPlayerChange(url, element, playerName) {
    window.currentAnicliPlayerName = playerName;
    window.currentAnicliPlayerUrl = url;

    // 1. Show video view
    goToAnicliStep(4);
    
    // 2. Update info text
    const info = document.getElementById('video-active-info');
    if (info) {
        info.innerHTML = `Серия ${window.currentAnicliEp} &bull; ${window.currentAnicliTrans} &bull; ${playerName}`;
    }

    // 3. Render iframe
    updateAnicliIframe(url);

    // 4. Save progress
    if (window.currentPlayingAnimeId) {
        saveWatchProgress(
            window.currentPlayingAnimeId,
            window.currentPlayingTitle,
            window.currentPlayingRussian,
            window.currentPlayingPoster,
            window.currentAnicliEp,
            window.currentAnicliTrans,
            window.currentPlayingTotalEpisodes
        );
    }
}

function updateAnicliIframe(url) {
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && url) {
        iframe.src = url;
    }
}

// User Rate Management helpers
function stepRateCounter(targetId, delta, maxVal = 0) {
    const input = document.getElementById(`rate-episodes-input-${targetId}`);
    if (!input) return;
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 0) val = 0;
    if (maxVal > 0 && val > maxVal) val = maxVal;
    input.value = val;
}
window.stepRateCounter = stepRateCounter;

function setUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    const textEl = document.getElementById(`score-text-${targetId}`);
    if (!container) return;

    const current = parseInt(container.dataset.score) || 0;
    const newScore = (current === score) ? 0 : score;
    container.dataset.score = newScore;

    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('active', starVal <= newScore);
    });

    if (textEl) {
        textEl.textContent = newScore ? `${newScore}/10` : '—';
    }
}
window.setUserRateScore = setUserRateScore;

function previewUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('hover', starVal <= score);
    });
}
window.previewUserRateScore = previewUserRateScore;

function resetPreviewUserRateScore(targetId) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('hover');
    });
}
window.resetPreviewUserRateScore = resetPreviewUserRateScore;

async function submitUserRate(targetId, targetType, rateId, totalCount = 0) {
    const statusSelect = document.getElementById(`rate-status-select-${targetId}`);
    const epInput = document.getElementById(`rate-episodes-input-${targetId}`);
    const starsContainer = document.getElementById(`stars-container-${targetId}`);
    const noteInput = document.getElementById(`rate-note-input-${targetId}`);

    if (!statusSelect) return;

    const status = statusSelect.value;
    const count = parseInt(epInput ? epInput.value : 0) || 0;
    const score = parseInt(starsContainer ? starsContainer.dataset.score : 0) || 0;
    const text = noteInput ? noteInput.value.trim() : '';

    const payload = {
        target_id: parseInt(targetId),
        target_type: targetType,
        status: status,
        score: score,
        text: text
    };
    if (rateId) payload.id = parseInt(rateId);

    if (targetType === 'Anime') {
        payload.episodes = count;
    } else {
        payload.chapters = count;
    }

    try {
        const saveBtn = document.querySelector(`#user-rate-widget-${targetId} .btn-save-rate`);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="ti ti-loader animate-spin"></i> ${i18n('mylist.saving')}`;
        }

        const res = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="ti ti-check"></i> ${i18n('mylist.save')}`;
        }

        if (res.ok && data.success) {
            showToast(i18n('mylist.saved'), 'success');
            tabLoaded['rates'] = false;
        } else {
            showToast(data.error || i18n('mylist.save_error'), 'error');
        }
    } catch (err) {
        console.error('Ошибка сохранения оценки:', err);
        showToast(err.message, 'error');
    }
}
window.submitUserRate = submitUserRate;

async function deleteUserRateAction(targetId, targetType, rateId) {
    if (!confirm(i18n('mylist.delete_confirm'))) return;
    try {
        const res = await fetch(`/api/rate/${rateId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(i18n('mylist.deleted'), 'warning');
            tabLoaded['rates'] = false;
            if (targetType === 'Anime') openAnimeModal(targetId);
            else openMangaModal(targetId);
        } else {
            showToast(data.error || i18n('mylist.delete_error'), 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.deleteUserRateAction = deleteUserRateAction;

function renderAnimeUserRateWidget(a) {
    const rate = a.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentEpisodes = rate ? (rate.episodes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalEpisodes = a.episodes || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${a.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? statusMap[currentStatus].anime : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${a.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.episodes')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${a.id}" class="stepper-input" min="0" max="${totalEpisodes || 9999}" value="${currentEpisodes}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', 1, ${totalEpisodes || 0})"><i class="ti ti-plus"></i></button>
                        ${totalEpisodes ? `<span class="stepper-total">/ ${totalEpisodes}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${a.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${a.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${a.id}', ${s})" onmouseenter="previewUserRateScore('${a.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${a.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${a.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${a.id}', 'Anime', ${rateId ? `'${rateId}'` : 'null'}, ${totalEpisodes || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${a.id}', 'Anime', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderAnimeDetail(a) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    window.currentPlayingAnimeId = a.id;
    window.currentPlayingTitle = a.name;
    window.currentPlayingRussian = a.russian || a.name;
    window.currentPlayingPoster = a.image;
    window.currentPlayingTotalEpisodes = a.episodes || 0;

    const title = a.russian || a.name;
    const origTitle = (a.russian && a.name !== a.russian) ? a.name : '';

    let targetEpisode = 1;
    if (a.user_rate) {
        const watched = a.user_rate.episodes || 0;
        const total = a.episodes || 0;
        const isCompleted = a.user_rate.status === 'completed' || (total > 0 && watched >= total);

        if (!isCompleted) {
            targetEpisode = watched + 1;
        }
    }

    const safeTitle = (a.russian || a.name).replace(/'/g, "\\'");

    const userRateWidgetHTML = renderAnimeUserRateWidget(a);

    const relatedHTML = (a.related && a.related.length) ? `
        <div class="anime-related-section">
            <h3><i class="ti ti-link"></i> ${i18n('anime.related')}</h3>
            <div class="anime-related-list">
                ${a.related.map(r => r.url ? `<a href="${r.url}" class="related-item" data-external="true"><span class="related-kind">${r.kind || ''}</span> ${r.name}</a>` : '').join('')}
            </div>
        </div>
    ` : '';

    const charactersHTML = (a.characters && a.characters.length) ? `
        <div class="anime-characters-section">
            <h3><i class="ti ti-users"></i> ${i18n('anime.characters')}</h3>
            <div class="anime-characters-scroll" id="anime-characters-scroll">
                ${a.characters.map((c, idx) => c.url ? `
                    <a href="${c.url}" class="character-card" target="_blank">
                        <div class="character-avatar-wrapper">
                            ${c.image ? `<img src="${c.image}" alt="${c.name}" class="character-avatar" loading="lazy" decoding="async">` : `<div class="character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                            <span class="character-role">${c.role || ''}</span>
                        </div>
                        <div class="character-name">${c.name}</div>
                        ${c.japanese ? `<div class="character-japanese">${c.japanese}</div>` : ''}
                    </a>
                ` : '').join('')}
            </div>
            ${a.characters.length > 8 ? `
                <button class="characters-toggle-btn" onclick="toggleCharacters()" id="characters-toggle-btn">
                    <i class="ti ti-chevron-down"></i> ${i18n('anime.show_all_characters')}
                </button>
            ` : ''}
        </div>
    ` : '';

    currentScreenshots = a.screenshots || [];
    const screenshotsHTML = (a.screenshots && a.screenshots.length) ? `
        <div class="anime-screenshots-section">
            <h3><i class="ti ti-photo"></i> ${i18n('anime.screenshots')} <span class="badge-count">(${a.screenshots.length})</span></h3>
            <div class="anime-screenshots-scroll">
                ${a.screenshots.map((src, idx) => `
                    <div class="anime-screenshot-card" onclick="openScreenshotLightbox(${idx})" title="${i18n('lightbox.zoom')}">
                        <img src="${src}" class="anime-screenshot" loading="lazy" decoding="async" alt="Screenshot ${idx + 1}">
                        <div class="screenshot-zoom-overlay"><i class="ti ti-zoom-in"></i></div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';


    const videosHTML = (a.video && a.video.length) ? `
        <div class="anime-videos-section">
            <h3><i class="ti ti-video"></i> ${i18n('anime.videos')}</h3>
            <div class="anime-videos-list">
                ${a.video.map(v => `<a href="${v.url || v.player_url || '#'}" target="_blank" class="video-link" data-external="true"><i class="ti ti-player-play"></i> ${v.name || i18n('video.link')}</a>`).join('')}
            </div>
        </div>
    ` : '';


    const externalScoresHTML = (a.external_scores && a.external_scores.length) ? `
        <div class="anime-external-scores">
            ${a.external_scores.map(s => `<span class="external-score-badge">${s.service || ''}: ${s.score || '—'}</span>`).join(' ')}
        </div>
    ` : '';

    const franchiseHTML = a.franchise ? `
        <div class="info-item"><span class="label">${i18n('anime.franchise')}</span> <span>${a.franchise}</span></div>
    ` : '';

    const licensedByHTML = (a.licensed_by && a.licensed_by.length) ? `
        <div class="info-item info-full-row"><span class="label">${i18n('anime.licensed_by')}</span> <span>${a.licensed_by.join(', ')}</span></div>
    ` : '';

    body.innerHTML = `
        <div class="anime-detail-container">
            <!-- Top Hero Section: Poster + Actions on Left, Title + Information Box on Right -->
            <div class="anime-hero-section">
                <!-- Left: Poster + Watch Buttons + My List -->
                <div class="anime-hero-left">
                    <div class="anime-poster-wrapper">
                        ${a.image ? `<img src="${a.image}" alt="${title}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-movie"></i></div>`}
                        ${a.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${a.score}</div>` : ''}
                    </div>

                    <div class="anime-actions-panel">
                        ${a.shikimori_url ? `
                            <button id="watch-toggle-btn" class="btn-kodik-play" onclick="toggleWatchPlayer('${a.shikimori_url}', ${targetEpisode})">
                                <i class="ti ti-player-play"></i> <span>${i18n('anime.player_1')}</span>
                            </button>
                        ` : ''}

                        <button id="anicli-toggle-btn" class="btn-secondary btn-anicli-play" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                            <i class="ti ti-device-tv"></i> <span>${i18n('anime.player_2')}</span>
                        </button>
                        ${a.shikimori_url ? `
                            <a href="${a.shikimori_url}" target="_blank" data-external="true" class="btn-secondary btn-shiki-link">
                                <i class="ti ti-external-link"></i> <span>Shikimori</span>
                            </a>
                        ` : ''}
                    </div>

                    ${userRateWidgetHTML}
                </div>

                <!-- Right: Title + Video Player (Above Info!) + Information Box + Description + Characters + Screenshots + Related + Videos -->
                <div class="anime-hero-right">
                    <div class="anime-header-titles">
                        <h2 class="anime-title">${title}</h2>
                        ${origTitle ? `<div class="anime-orig-title">${origTitle}</div>` : ''}
                        ${a.scored_by ? `<div class="anime-scored-by">${i18n('anime.scored_by')} ${a.scored_by.toLocaleString()}</div>` : ''}
                    </div>

                    <!-- Video Player (Appears directly ABOVE information when clicked!) -->
                    <div id="watch-player-container" class="kodik-player-wrapper hidden"></div>

                    <!-- ИНФОРМАЦИЯ Card: Beside poster, below player -->
                    <div class="anime-meta-details-card">
                        <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                        <div class="anime-info-grid">
                            <div class="info-item"><span class="label">${i18n('anime.type')}</span> <span>${a.kind || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.status')}</span> <span>${a.status || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.episodes')}</span> <span>${a.episodes_aired ? `${a.episodes_aired} / ` : ''}${a.episodes || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.duration')}</span> <span>${a.duration ? `${a.duration} ${i18n('anime.min')}` : '—'}</span></div>

                            <div class="info-item"><span class="label">${i18n('anime.aired')}</span> <span>${a.aired_on || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.rating')}</span> <span>${a.rating || '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.studios')}</span> <span>${a.studios && a.studios.length ? a.studios.join(', ') : '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.genres')}</span> <span>${a.genres && a.genres.length ? a.genres.join(', ') : '—'}</span></div>
                            ${franchiseHTML}
                            ${licensedByHTML}
                        </div>
                    </div>

                    <!-- Description (Directly Below Information Card!) -->
                    <div class="anime-description-section">
                        <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                        <div class="anime-description-content">${a.description}</div>
                    </div>

                    <!-- Characters (Below Description!) -->
                    ${charactersHTML}

                    <!-- Screenshots (Below Characters!) -->
                    ${screenshotsHTML}

                    <!-- Related / Chronology -->
                    ${relatedHTML}

                    <!-- Videos -->
                    ${videosHTML}

                    ${externalScoresHTML}
                </div>
            </div>
        </div>
    `;
}






async function getAnimeData(animeId, source = 'shikimori') {

    try {
        const response = await fetch(`/api/anime/${source}/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch anime data');
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения данных аниме:', error);
        return null;
    }
}

async function searchAnime(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return { anime: [], other: [] };
    }
}

async function getSerialInfo(animeId, source = 'shikimori') {
    try {
        const response = await fetch(`/api/serial/${source}/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch serial info');
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения информации серий:', error);
        return null;
    }
}

// ==================== CHARACTER MODAL ====================

async function openCharacterModal(charId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    pushModalState();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('character.loading') + '</div>';

    try {
        const res = await fetch(`/api/character/${charId}`);
        if (!res.ok) throw new Error(i18n('character.load_error'));
        const char = await res.json();
        renderCharacterDetail(char);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('character.load_error')}: ${err.message}</div>`;
    }
}

function renderCharacterDetail(char) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = char.image || '';
    const animesHTML = (char.animes || []).map(a => `<a href="https://shikimori.io/animes/${a.id}" class="search-tag">${a.name}</a>`).join(' ');
    const mangasHTML = (char.mangas || []).map(m => `<a href="https://shikimori.io/mangas/${m.id}" class="search-tag">${m.name}</a>`).join(' ');

    body.innerHTML = `
        <div class="anime-hero-section">
            <div class="anime-hero-left">
                <div class="anime-poster-wrapper">
                    ${poster ? `<img src="${poster}" alt="${char.russian}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-user"></i></div>`}
                </div>
                <div class="anime-actions-panel">
                    ${char.shikimori_url ? `<a href="${char.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span></a>` : ''}
                </div>
            </div>

            <div class="anime-hero-right">
                <div class="anime-header-titles">
                    <h2 class="anime-title">${char.russian}</h2>
                    <div class="anime-orig-title">${char.name} ${char.japanese ? `(${char.japanese})` : ''}</div>
                </div>

                <div class="anime-meta-details-card">
                    <h4><i class="ti ti-info-circle"></i> ${i18n('character.info')}</h4>
                    <div class="anime-info-grid">
                        ${animesHTML ? `<div class="info-item info-full-row"><span class="label">${i18n('character.anime')}</span><div class="search-item-tags" style="margin-top:4px;">${animesHTML}</div></div>` : ''}
                        ${mangasHTML ? `<div class="info-item info-full-row"><span class="label">${i18n('character.manga')}</span><div class="search-item-tags" style="margin-top:4px;">${mangasHTML}</div></div>` : ''}
                    </div>
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-file-text"></i> ${i18n('character.info')}</h3>
            <div class="anime-description-content">${char.description || '—'}</div>
        </div>
    `;
}

// ==================== CLUB MODAL ====================

async function openClubModal(clubId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    pushModalState();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('club.loading') + '</div>';

    try {
        const res = await fetch(`/api/club/${clubId}`);
        if (!res.ok) throw new Error(i18n('club.load_error'));
        const club = await res.json();
        renderClubDetail(club);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('club.load_error')}: ${err.message}</div>`;
    }
}

function renderClubDetail(club) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const logo = club.image || '';

    body.innerHTML = `
        <div class="anime-hero-section">
            <div class="anime-hero-left">
                <div class="anime-poster-wrapper">
                    ${logo ? `<img src="${logo}" alt="${club.name}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-users"></i></div>`}
                </div>
                <div class="anime-actions-panel">
                    ${club.shikimori_url ? `<a href="${club.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span></a>` : ''}
                </div>
            </div>

            <div class="anime-hero-right">
                <div class="anime-header-titles">
                    <h2 class="anime-title">${club.name}</h2>
                </div>

                <div class="anime-meta-details-card">
                    <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                    <div class="anime-info-grid">
                        <div class="info-item"><span class="label">${i18n('club.members')}</span> <b>${club.members_count}</b></div>
                        <div class="info-item"><span class="label">${i18n('club.type')}</span> <span>${club.is_private ? i18n('friends.private_club') : i18n('friends.public_club')}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-file-text"></i> ${i18n('club.description')}</h3>
            <div class="anime-description-content">${club.description || '—'}</div>
        </div>
    `;
}

;
/* --- js/manga.js --- */
// ==================== MANGA MODAL & DETAILS ====================

async function openMangaModal(mangaId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('manga.loading') + '</div>';

    try {
        const res = await fetch(`/api/manga/${mangaId}`);
        if (!res.ok) throw new Error(i18n('manga.load_error'));
        const manga = await res.json();
        renderMangaDetail(manga);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('manga.load_error')}: ${err.message}</div>`;
    }
}

function renderMangaUserRateWidget(manga) {
    const rate = manga.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentChapters = rate ? (rate.chapters || 0) : 0;
    const currentVolumes = rate ? (rate.volumes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalChapters = manga.chapters || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${manga.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? statusMap[currentStatus].manga : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${manga.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.chapters')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${manga.id}" class="stepper-input" min="0" max="${totalChapters || 9999}" value="${currentChapters}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', 1, ${totalChapters || 0})"><i class="ti ti-plus"></i></button>
                        ${totalChapters ? `<span class="stepper-total">/ ${totalChapters}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${manga.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${manga.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${manga.id}', ${s})" onmouseenter="previewUserRateScore('${manga.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${manga.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${manga.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${manga.id}', 'Manga', ${rateId ? `'${rateId}'` : 'null'}, ${totalChapters || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${manga.id}', 'Manga', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderMangaDetail(manga) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = manga.image || '';
    const genres = (manga.genres || []).join(', ') || '—';
    const publishers = (manga.publishers || []).join(', ') || '—';

    const userRateWidgetHTML = renderMangaUserRateWidget(manga);

    body.innerHTML = `
        <div class="anime-detail-container manga-modal-container">
            <!-- Top Hero Section: Poster on Left, Title + Information Box on Right -->
            <div class="anime-hero-section">
                <!-- Left: Poster + Actions + My List -->
                <div class="anime-hero-left">
                    <div class="anime-poster-wrapper manga-poster-wrapper">
                        ${poster ? `<img src="${poster}" alt="${manga.russian}" class="anime-poster manga-poster-img" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder manga-poster-placeholder"><i class="ti ti-book"></i></div>`}
                        ${manga.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${manga.score}</div>` : ''}
                    </div>

                    <div class="anime-actions-panel">
                        ${manga.shikimori_url ? `
                            <a href="${manga.shikimori_url}" target="_blank" data-external="true" class="btn-secondary btn-shiki-link">
                                <i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span>
                            </a>
                        ` : ''}
                    </div>

                    ${userRateWidgetHTML}
                </div>

                <!-- Right: Title + Information Box -->
                <div class="anime-hero-right">
                    <div class="anime-header-titles">
                        <h2 class="anime-title">${manga.russian}</h2>
                        ${manga.name !== manga.russian ? `<div class="anime-orig-title">${manga.name}</div>` : ''}
                    </div>

                    <!-- Metadata Card: Beside poster -->
                    <div class="anime-meta-details-card">
                        <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                        <div class="anime-info-grid">
                            <div class="info-item"><span class="label">${i18n('manga.type')}</span> <span>${manga.kind || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.status')}</span> <span>${manga.status || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.volumes')}</span> <span>${manga.volumes || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.chapters')}</span> <span>${manga.chapters || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.publisher')}</span> <span>${publishers}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.aired')}</span> <span>${manga.aired_on || '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('manga.genres')}</span> <span>${genres}</span></div>
                        </div>
                    </div>

                    <!-- Description (Directly Below Information Card!) -->
                    <div class="anime-description-section manga-description-section">
                        <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                        <div class="anime-description-content">${manga.description}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}




;
/* --- js/friend.js --- */
// ==================== FRIEND & USER MODAL HANDLERS ====================

async function openFriendModal(userIdOrNick) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('friends.load_error') + '</div>';

    try {
        const res = await fetch(`/api/friend/${encodeURIComponent(userIdOrNick)}`);
        if (!res.ok) throw new Error(i18n('friends.load_error'));
        const user = await res.json();
        renderFriendDetail(user);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('friends.load_error')}: ${err.message}</div>`;
    }
}

// Алиас для обратной совместимости
function openUserModal(userIdOrNick) {
    return openFriendModal(userIdOrNick);
}

function renderFriendDetail(user) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const avatar = user.image || '';
    const isOnline = user.last_online_at && user.last_online_at.includes(new Date().toISOString().slice(0, 10));

    body.innerHTML = `
        <div class="anime-detail-container friend-modal-container">
            <div class="anime-detail-header friend-detail-header">
                <div class="anime-poster-wrapper friend-avatar-wrapper">
                    ${avatar ? `<img src="${avatar}" alt="${user.nickname}" class="friend-avatar-img">` : `<div class="friend-avatar-placeholder"><i class="ti ti-user"></i></div>`}
                    <div class="friend-online-badge ${isOnline ? 'online' : ''}" title="${isOnline ? i18n('friends.online_today') : i18n('friends.last_online') + ' ' + (user.last_online_at || '—')}">
                        <i class="ti ti-circle-filled"></i>
                    </div>
                </div>

                <div class="anime-main-info friend-main-info">
                    <h2 class="anime-title friend-title">${user.name}</h2>
                    <div class="anime-orig-title friend-nickname">@${user.nickname}</div>

                    <div class="anime-info-grid friend-info-grid">
                        <div class="info-item"><span class="label">${i18n('friends.id')}</span> <span>#${user.id}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.sex')}</span> <span>${user.sex || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.age')}</span> <span>${user.age || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.last_online')}</span> <span>${user.last_online_at || '—'}</span></div>
                    </div>

                    <div class="friend-stats-summary">
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-movie"></i> ${i18n('friends.anime')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.watched')} <b>${user.completed_anime || 0}</b></span>
                                <span>${i18n('friends.watching')} <b>${user.watching_anime || 0}</b></span>
                            </div>
                        </div>
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-book"></i> ${i18n('friends.manga')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.read')} <b>${user.completed_manga || 0}</b></span>
                                <span>${i18n('friends.reading')} <b>${user.reading_manga || 0}</b></span>
                            </div>
                        </div>
                    </div>

                    <div class="anime-actions friend-actions">
                        ${user.shikimori_url ? `
                            <a href="${user.shikimori_url}" target="_blank" data-external="true" class="btn-secondary">
                                <i class="ti ti-brand-shikimori"></i> ${i18n('friends.open_shikimori')}
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="anime-description-section friend-about-section">
                <h3><i class="ti ti-id"></i> ${i18n('friends.about')}</h3>
                <div class="anime-description-content">${user.about || i18n('friends.about_empty')}</div>
            </div>
        </div>
    `;
}

;
/* --- js/friends.js --- */
function renderFriends(data) {
    if (typeof openFriendModal === 'function') {
        const container = document.getElementById('friends');
        if (!container) return;
        const friends = data.friends || [], clubs = data.clubs || [];

        const buildGrid = (items, isUser = true) => {
            if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('friends.empty') + '</p>';
            return `<div class="media-grid">` + items.map(item => {
                const name = item.nickname || item.name || '';
                const img = typeof buildImgUrl === 'function' ? buildImgUrl(isUser ? (item.avatar || item.image) : (item.logo || item.image)) : (item.avatar || item.image || '');
                const onclickAttr = isUser ? `onclick="event.preventDefault(); openFriendModal('${name}');"` : `onclick="event.preventDefault(); openClubModal(${item.id});"`;
                const url = isUser ? `https://shikimori.io/${name}` : `https://shikimori.io/clubs/${item.id}`;

                return `
                    <a href="${url}" class="media-item" title="${name}" ${onclickAttr}>
                        <img src="${img}" alt="${name}" loading="lazy" class="${isUser ? 'friend-grid-avatar' : 'club-grid-logo'}">
                        <div class="media-title">${name}</div>
                    </a>`;
            }).join('') + `</div>`;
        };

        container.innerHTML = `
            <div class="card media-section">
                <div class="friends-view-header">
                    <h3><i class="ti ti-users"></i> ${i18n('friends.friends')} (${friends.length})</h3>
                </div>
                ${buildGrid(friends, true)}
            </div>

            <div class="card media-section" style="margin-top: 20px;">
                <div class="friends-view-header">
                    <h3><i class="ti ti-building-community"></i> ${i18n('friends.clubs')} (${clubs.length})</h3>
                </div>
                ${buildGrid(clubs, false)}
            </div>
        `;
    }
}
;
/* --- js/profile.js --- */
function toggleAbout() {
    const container = document.getElementById('about-container');
    const btn = document.getElementById('toggle-about-btn');
    if (!container || !btn) return;

    if (container.classList.contains('collapsed')) {
        container.classList.remove('collapsed');
        btn.innerText = i18n('profile.collapse');
    } else {
        container.classList.add('collapsed');
        btn.innerText = i18n('profile.expand');
    }
}

async function loadRecentHistory(retries = 2) {
    const container = document.getElementById('recent-history-list');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/history');
        const data = await res.json();
        if (Array.isArray(data)) cachedHistoryData = data;

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0;">' + i18n('history.empty') + '</p>';
            return;
        }

        container.innerHTML = data.slice(0, 4).map(renderHistoryItemHtml).join('');
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadRecentHistory(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${i18n('history.load_error')}</p>`;
        }
    }
}

async function loadProfileFriendsClubs(retries = 2) {
    const container = document.getElementById('profile-friends-clubs-preview');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/friends');
        const data = await res.json();
        const friends = data.friends || [];
        const clubs = data.clubs || [];

        if (!friends.length && !clubs.length) {
            if (retries > 0) {
                setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
                return;
            }
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0; font-size: 13px;">' + i18n('friends.empty') + '</p>';
            return;
        }

        let html = '<div class="mini-friends-grid">';
        friends.slice(0, 6).forEach(f => {
            const name = f.nickname || f.name || '';
            html += `<a href="https://shikimori.io/${name}" onclick="event.preventDefault(); openFriendModal('${name}');" class="mini-friend-item" title="${name}">
                <img src="${buildImgUrl(f.avatar || f.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        clubs.slice(0, 2).forEach(c => {
            const name = c.name || '';
            html += `<a href="https://shikimori.io/clubs/${c.id}" onclick="event.preventDefault(); openClubModal(${c.id});" class="mini-friend-item club" title="${name}">
                <img src="${buildImgUrl(c.logo || c.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0; font-size: 13px;">${i18n('friends.load_error')}</p>`;
        }
    }
}

;
/* --- js/history.js --- */
function renderHistoryItemHtml(item) {
    const target = item.target || {};
    const title = target.russian || target.name || '';
    const imgUrl = target.image ? buildImgUrl(target.image) : '';
    const targetUrl = target.url ? (target.url.startsWith('http') ? target.url : 'https://shikimori.io' + target.url) : (target.id ? `https://shikimori.io/animes/${target.id}` : '#');
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `
        <div class="history-item">
            ${imgUrl ? `<a href="${targetUrl}" target="_blank"><img src="${imgUrl}" alt="${title}" class="history-thumb" loading="lazy"></a>` : `<div class="history-thumb-placeholder"></div>`}
            <div class="history-info">
                ${title ? `<a href="${targetUrl}" target="_blank" class="history-target">${title}</a>` : ''}
                <div class="history-desc">${item.description || '—'}</div>
            </div>
            <div class="history-date">${dateStr}</div>
        </div>`;
}

function renderHistory(historyList) {
    const container = document.getElementById('history');
    if (!Array.isArray(historyList) || historyList.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">' + i18n('history.empty') + '</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3><i class="ti ti-clock"></i> ${i18n('history.full')}</h3></div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${historyList.map(renderHistoryItemHtml).join('')}
            </div>
        </div>`;
}
;
/* --- js/favourites.js --- */
function renderFavourites(data) {
    const container = document.getElementById('favourites');
    const chars = data.characters || [], animes = data.animes || [], mangas = data.mangas || [];

    const buildGrid = (items, type) => {
        if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('favourites.empty') + '</p>';
        return `<div class="media-grid">` + items.map(item => {
            const title = item.russian || item.name || '';
            const img = buildImgUrl(item.image);
            const url = item.url ? (item.url.startsWith('http') ? item.url : 'https://shikimori.io' + item.url) : `https://shikimori.io/${type}/${item.id}`;
            return `
                <a href="${url}" target="_blank" class="media-item" title="${title}">
                    <img src="${img}" alt="${title}" loading="lazy">
                    <div class="media-title">${title}</div>
                </a>`;
        }).join('') + `</div>`;
    };

    container.innerHTML = `
        <div class="card media-section">
            <h3><i class="ti ti-user-star"></i> ${i18n('favourites.characters')} (${chars.length})</h3>
            ${buildGrid(chars, 'characters')}
        </div>
        <div class="card media-section">
            <h3><i class="ti ti-movie"></i> ${i18n('favourites.animes')} (${animes.length})</h3>
            ${buildGrid(animes, 'animes')}
        </div>
        ${mangas.length ? `<div class="card media-section">
            <h3><i class="ti ti-book"></i> ${i18n('favourites.mangas')} (${mangas.length})</h3>
            ${buildGrid(mangas, 'mangas')}
        </div>` : ''}
    `;
}

;
/* --- js/rates.js --- */
let currentTargetType = localStorage.getItem('currentTargetType') || 'Anime';
let currentStatusFilter = localStorage.getItem('currentStatusFilter') || 'all';
let currentSortFilter = localStorage.getItem('currentSortFilter') || 'updated_at';
let currentViewMode = localStorage.getItem('ratesViewMode') || 'cards';
let ratesSearchQuery = '';

function getStatusMap() {
    return {
        'watching': { anime: i18n('rates.watching'), manga: i18n('rates.watching'), class: 'badge-watching' },
        'completed': { anime: i18n('rates.completed'), manga: i18n('rates.completed'), class: 'badge-completed' },
        'planned': { anime: i18n('rates.planned'), manga: i18n('rates.planned'), class: 'badge-planned' },
        'on_hold': { anime: i18n('rates.on_hold'), manga: i18n('rates.on_hold'), class: 'badge-on_hold' },
        'dropped': { anime: i18n('rates.dropped'), manga: i18n('rates.dropped'), class: 'badge-dropped' },
        'rewatching': { anime: i18n('rates.rewatching'), manga: i18n('rates.rewatching'), class: 'badge-watching' }
    };
}

async function openTabWithFilter(type, status) {
    currentTargetType = type;
    currentStatusFilter = status;
    localStorage.setItem('currentTargetType', type);
    localStorage.setItem('currentStatusFilter', status);

    await openTab('rates');

    document.querySelectorAll('.type-btn').forEach(b => {
        b.classList.remove('active');
        if ((type === 'Anime' && b.textContent.includes(i18n('rates.anime'))) || (type === 'Manga' && b.textContent.includes(i18n('rates.manga')))) {
            b.classList.add('active');
        }
    });

    updateFilterLabels();
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${status}'`)) b.classList.add('active');
    });

    applyListFilters();
}

function switchListType(type) {
    currentTargetType = type;
    localStorage.setItem('currentTargetType', type);
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
    updateFilterLabels();
    applyListFilters();
}

function filterListStatus(status, btn) {
    currentStatusFilter = status;
    localStorage.setItem('currentStatusFilter', status);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyListFilters();
}

function changeListSort(sortVal) {
    currentSortFilter = sortVal;
    localStorage.setItem('currentSortFilter', sortVal);
    applyListFilters();
}

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('ratesViewMode', mode);
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.view-mode-btn[data-view="${mode}"]`);
    if (btn) btn.classList.add('active');
    const grid = document.getElementById('rates-grid-container');
    if (grid) {
        grid.className = `rates-grid rates-view-${mode}`;
    }
    applyListFilters();
}

function updateFilterLabels() {
    const isAnime = currentTargetType === 'Anime';
    const lblWatching = document.getElementById('lbl-watching');
    const lblCompleted = document.getElementById('lbl-completed');
    if (lblWatching) lblWatching.textContent = isAnime ? i18n('rates.watching') : i18n('rates.watching');
    if (lblCompleted) lblCompleted.textContent = isAnime ? i18n('rates.completed') : i18n('rates.completed');
}

function onRatesSearchInput(val) {
    ratesSearchQuery = val.trim().toLowerCase();
    applyListFilters();
}
window.onRatesSearchInput = onRatesSearchInput;

function clearRatesSearch() {
    ratesSearchQuery = '';
    const input = document.getElementById('rates-local-search');
    if (input) input.value = '';
    applyListFilters();
}
window.clearRatesSearch = clearRatesSearch;

async function quickIncrementRate(targetId, targetType, totalCount, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const rateItem = ratesDataCache.find(r => r.target_id == targetId && r.target_type == targetType);
    if (rateItem) {
        const field = targetType === 'Anime' ? 'episodes' : 'chapters';
        rateItem[field] = (rateItem[field] || 0) + 1;
        if (totalCount && rateItem[field] >= totalCount) {
            rateItem.status = 'completed';
        }
        applyListFilters();
    }

    try {
        const res = await fetch('/api/rate/increment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_id: parseInt(targetId),
                target_type: targetType,
                total_count: totalCount || 0
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`${i18n('mylist.quick_inc')} (${targetType === 'Anime' ? 'эп.' : 'гл.'} ${rateItem ? (targetType === 'Anime' ? rateItem.episodes : rateItem.chapters) : ''})`, 'success', 2000);
        } else {
            showToast(data.error || 'Ошибка обновления', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
window.quickIncrementRate = quickIncrementRate;

function renderRatesView() {
    const container = document.getElementById('rates');
    if (!Array.isArray(ratesDataCache) || ratesDataCache.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">' + i18n('rates.empty') + '</p></div>';
        return;
    }

    const isAnime = currentTargetType === 'Anime';
    container.innerHTML = `
        <div class="list-controls">
            <div class="type-switch">
                <button class="type-btn ${isAnime ? 'active' : ''}" onclick="switchListType('Anime')"><i class="ti ti-movie"></i> ${i18n('rates.anime')}</button>
                <button class="type-btn ${!isAnime ? 'active' : ''}" onclick="switchListType('Manga')"><i class="ti ti-book"></i> ${i18n('rates.manga')}</button>
            </div>
            <div class="rates-search-box">
                <i class="ti ti-search search-icon"></i>
                <input type="text" id="rates-local-search" placeholder="${i18n('mylist.search_placeholder')}" oninput="onRatesSearchInput(this.value)" value="${ratesSearchQuery}">
                ${ratesSearchQuery ? `<button class="search-clear-btn" onclick="clearRatesSearch()"><i class="ti ti-x"></i></button>` : ''}
            </div>
            <div class="filter-sort-bar">
                <div class="rates-filters">
                    <button class="filter-btn ${currentStatusFilter === 'all' ? 'active' : ''}" onclick="filterListStatus('all', this)">${i18n('rates.all')} (<span id="cnt-all">0</span>)</button>
                    <button id="lbl-watching" class="filter-btn ${currentStatusFilter === 'watching' ? 'active' : ''}" onclick="filterListStatus('watching', this)">${i18n('rates.watching')}</button>
                    <button id="lbl-completed" class="filter-btn ${currentStatusFilter === 'completed' ? 'active' : ''}" onclick="filterListStatus('completed', this)">${i18n('rates.completed')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'planned' ? 'active' : ''}" onclick="filterListStatus('planned', this)">${i18n('rates.planned')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'on_hold' ? 'active' : ''}" onclick="filterListStatus('on_hold', this)">${i18n('rates.on_hold')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'dropped' ? 'active' : ''}" onclick="filterListStatus('dropped', this)">${i18n('rates.dropped')}</button>
                </div>
                <select id="rates-sort" class="sort-select" onchange="changeListSort(this.value)">
                    <option value="updated_at" ${currentSortFilter === 'updated_at' ? 'selected' : ''}>${i18n('rates.sort.updated')}</option>
                    <option value="score_desc" ${currentSortFilter === 'score_desc' ? 'selected' : ''}>${i18n('rates.sort.score_desc')}</option>
                    <option value="score_asc" ${currentSortFilter === 'score_asc' ? 'selected' : ''}>${i18n('rates.sort.score_asc')}</option>
                    <option value="name" ${currentSortFilter === 'name' ? 'selected' : ''}>${i18n('rates.sort.name')}</option>
                    <option value="episodes" ${currentSortFilter === 'episodes' ? 'selected' : ''}>${i18n('rates.sort.progress')}</option>
                </select>
            </div>
            <div class="view-mode-bar">
                <button class="view-mode-btn ${currentViewMode === 'list' ? 'active' : ''}" data-view="list" onclick="setViewMode('list')" title="${i18n('rates.view.list')}">
                    <i class="ti ti-list"></i>
                </button>
                <button class="view-mode-btn ${currentViewMode === 'cards' ? 'active' : ''}" data-view="cards" onclick="setViewMode('cards')" title="${i18n('rates.view.cards')}">
                    <i class="ti ti-layout-grid"></i>
                </button>
                <button class="view-mode-btn ${currentViewMode === 'large' ? 'active' : ''}" data-view="large" onclick="setViewMode('large')" title="${i18n('rates.view.large')}">
                    <i class="ti ti-photo"></i>
                </button>
            </div>
        </div>
        <div id="rates-grid-container" class="rates-grid rates-view-${currentViewMode}"></div>
    `;

    updateFilterLabels();
    applyListFilters();
}

function sortRatesList(rates, criterion) {
    return [...rates].sort((a, b) => {
        const targetA = a.target_data || a.anime || a.manga || {};
        const targetB = b.target_data || b.anime || b.manga || {};
        switch (criterion) {
            case 'score_desc': return (b.score || 0) - (a.score || 0);
            case 'score_asc': return (a.score || 0) - (b.score || 0);
            case 'name': return (targetA.russian || targetA.name || '').localeCompare(targetB.russian || targetB.name || '', 'ru');
            case 'episodes': return ((b.episodes ?? b.chapters ?? 0) - (a.episodes ?? a.chapters ?? 0));
            default: return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
        }
    });
}

const RATES_PAGE_SIZE = 28;
let currentFilteredRates = [];
let ratesRenderedCount = 0;
let ratesObserver = null;

function applyListFilters() {
    const byType = ratesDataCache.filter(r => r.target_type === currentTargetType);
    const cntAll = document.getElementById('cnt-all');
    if (cntAll) cntAll.textContent = byType.length;

    let filtered = currentStatusFilter === 'all' ? byType : byType.filter(r => r.status === currentStatusFilter);
    
    if (ratesSearchQuery) {
        filtered = filtered.filter(r => {
            const target = r.target_data || r.anime || r.manga || {};
            const name = (target.name || '').toLowerCase();
            const russian = (target.russian || '').toLowerCase();
            return name.includes(ratesSearchQuery) || russian.includes(ratesSearchQuery);
        });
    }

    filtered = sortRatesList(filtered, currentSortFilter);
    currentFilteredRates = filtered;
    ratesRenderedCount = 0;
    renderListGrid(filtered);
}

function renderRateItemHtml(rate, viewMode) {
    const targetObj = rate.target_data || rate.anime || rate.manga || {};
    const isAnime = rate.target_type === 'Anime';
    const targetUrl = targetObj.url
        ? (targetObj.url.startsWith('http') ? targetObj.url : 'https://shikimori.io' + targetObj.url)
        : `https://shikimori.io/${isAnime ? 'animes' : 'mangas'}/${rate.target_id}`;
    const targetName = targetObj.russian || targetObj.name || `#${rate.target_id}`;
    const statusInfo = getStatusMap()[rate.status] || { anime: rate.status, manga: rate.status, class: 'badge-planned' };
    const totalCount = isAnime ? (targetObj.episodes || 0) : (targetObj.chapters || 0);
    let progressText = isAnime ? `${rate.episodes ?? 0} / ${targetObj.episodes || '?'} ${i18n('rates.progress.anime')}` : `${rate.chapters ?? 0} / ${targetObj.chapters || '?'} ${i18n('rates.progress.manga')}`;
    if (rate.rewatches > 0) progressText += ` (${i18n('rates.rewatches')} ${rate.rewatches})`;
    const onclickAttr = isAnime ? `onclick="event.preventDefault(); openAnimeModal(${rate.target_id});"` : `onclick="event.preventDefault(); openMangaModal(${rate.target_id});"`;
    const showQuickInc = rate.status === 'watching' || rate.status === 'rewatching';

    if (viewMode === 'list') {
        return `
            <div class="rate-list-row">
                <div class="rate-list-info">
                    <a href="${targetUrl}" ${onclickAttr} class="rate-title" title="${targetName}">${targetName}</a>
                    <span class="badge ${statusInfo.class}">${isAnime ? statusInfo.anime : statusInfo.manga}</span>
                </div>
                <div class="rate-list-meta">
                    <span class="label">${i18n('rates.progress')}:</span> <b>${progressText}</b>
                    ${showQuickInc ? `
                        <button type="button" class="btn-quick-inc" onclick="quickIncrementRate('${rate.target_id}', '${rate.target_type}', ${totalCount}, event)" title="${i18n('mylist.quick_inc')}">
                            <i class="ti ti-plus"></i> 1
                        </button>
                    ` : ''}
                    <span class="label">${i18n('rates.score')}:</span> <span class="score-pill">${rate.score ? `<i class="ti ti-star-filled"></i> ${rate.score}/10` : '—'}</span>
                </div>
            </div>`;
    } else {
        const imgUrl = targetObj.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(targetObj.image) : targetObj.image) : '';
        const posterClass = viewMode === 'large' ? 'rate-poster-large' : 'history-thumb';

        return `
            <div class="rate-card">
                ${imgUrl ? `<a href="${targetUrl}" ${onclickAttr}><img src="${imgUrl}" alt="${targetName}" class="${posterClass}" loading="lazy" decoding="async"></a>` : `<div class="history-thumb-placeholder"></div>`}
                <div class="rate-content">
                    <div class="rate-header">
                        <a href="${targetUrl}" ${onclickAttr} class="rate-title" title="${targetName}">${targetName}</a>
                        <span class="badge ${statusInfo.class}">${isAnime ? statusInfo.anime : statusInfo.manga}</span>
                    </div>
                    <div class="info-row" style="padding: 2px 0;">
                        <span class="label">${i18n('rates.progress')}:</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span><b>${progressText}</b></span>
                            ${showQuickInc ? `
                                <button type="button" class="btn-quick-inc" onclick="quickIncrementRate('${rate.target_id}', '${rate.target_type}', ${totalCount}, event)" title="${i18n('mylist.quick_inc')}">
                                    <i class="ti ti-plus"></i> 1
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="info-row" style="padding: 2px 0;"><span class="label">${i18n('rates.score')}:</span><span class="score-pill">${rate.score ? `<i class="ti ti-star-filled"></i> ${rate.score}/10` : '—'}</span></div>
                    ${rate.text ? `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; margin-top: 2px;">"${rate.text}"</div>` : ''}
                </div>
            </div>`;
    }
}

function renderListGrid(items) {
    const grid = document.getElementById('rates-grid-container');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">' + i18n('rates.no_results') + '</p>';
        const sentinel = document.getElementById('rates-scroll-sentinel');
        if (sentinel) sentinel.remove();
        return;
    }

    const firstChunk = items.slice(0, RATES_PAGE_SIZE);
    ratesRenderedCount = firstChunk.length;

    grid.innerHTML = firstChunk.map(r => renderRateItemHtml(r, currentViewMode)).join('');
    setupRatesInfiniteScroll();
}

function loadMoreRatesChunk() {
    const grid = document.getElementById('rates-grid-container');
    if (!grid || ratesRenderedCount >= currentFilteredRates.length) return;

    const nextChunk = currentFilteredRates.slice(ratesRenderedCount, ratesRenderedCount + RATES_PAGE_SIZE);
    ratesRenderedCount += nextChunk.length;

    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = nextChunk.map(r => renderRateItemHtml(r, currentViewMode)).join('');
    while (tempWrapper.firstChild) {
        grid.appendChild(tempWrapper.firstChild);
    }
    setupRatesInfiniteScroll();
}

function setupRatesInfiniteScroll() {
    let sentinel = document.getElementById('rates-scroll-sentinel');
    if (ratesRenderedCount >= currentFilteredRates.length) {
        if (sentinel) sentinel.remove();
        return;
    }

    const grid = document.getElementById('rates-grid-container');
    if (!grid) return;

    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'rates-scroll-sentinel';
        sentinel.style.height = '40px';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.display = 'flex';
        sentinel.style.alignItems = 'center';
        sentinel.style.justifyContent = 'center';
        sentinel.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;"><i class="ti ti-loader animate-spin"></i> Загрузка...</span>';
        grid.after(sentinel);
    }

    if (ratesObserver) ratesObserver.disconnect();
    ratesObserver = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) {
            loadMoreRatesChunk();
        }
    }, { rootMargin: '400px' });

    ratesObserver.observe(sentinel);
}

;
/* --- js/explore.js --- */
let searchDebounceTimer = null;
let currentNewsPage = 1;
let isLoadingNews = false;
let hasMoreNews = true;
let newsObserver = null;
const loadedNewsIds = new Set();

function i18n(key) {
    if (typeof t === 'function') return t(key);
    const dict = TRANSLATIONS && TRANSLATIONS['ru'] ? TRANSLATIONS['ru'] : {};
    return dict[key] || key;
}

function toggleNavbarSearch() {
    const panel = document.getElementById('navbar-search-panel');
    const btn = document.getElementById('search-toggle-btn');
    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (btn) btn.classList.add('active');
        setTimeout(() => {
            const input = document.getElementById('explore-search-input');
            if (input) input.focus();
        }, 50);
    } else {
        panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    }
}

let searchAbortController = null;

function handleExploreSearch(val) {
    const query = val.trim();
    const clearBtn = document.getElementById('search-clear-btn');
    const resultsContainer = document.getElementById('explore-search-results');

    if (clearBtn) {
        if (query.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }

    if (query.length < 2) {
        clearTimeout(searchDebounceTimer);
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
        }
        return;
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.innerHTML = `<div class="search-loading"><i class="ti ti-loader animate-spin"></i> ${i18n('explore.searching')}</div>`;
        }

        searchAbortController = new AbortController();
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: searchAbortController.signal
            });
            const data = await res.json();
            renderSearchResults(data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="search-no-results" style="color: var(--danger);">${i18n('explore.search_error')}</div>`;
            }
        }
    }, 350);
}

function clearExploreSearch() {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }
    const input = document.getElementById('explore-search-input');
    if (input) input.value = '';
    handleExploreSearch('');
}


function renderSearchResults(items) {
    const container = document.getElementById('explore-search-results');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = '<div class="search-no-results">' + i18n('explore.no_results') + '</div>';
        return;
    }

    const statusTranslation = {
        'released': i18n('explore.status.released'),
        'ongoing': i18n('explore.status.ongoing'),
        'anons': i18n('explore.status.anons')
    };

    container.innerHTML = items.map(item => {
        const title = item.russian || item.name;
        const origTitle = (item.russian && item.name !== item.russian) ? item.name : '';
        const img = item.image || '';
        const statusStr = statusTranslation[item.status] || item.status || '';
        const genresStr = (item.genres && item.genres.length) ? item.genres.join(', ') : '';

        return `
            <a href="${item.url}" target="_blank" class="search-result-item">
                ${img ? `<img src="${img}" alt="${title}" class="search-item-thumb" loading="lazy">` : `<div class="search-item-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                <div class="search-item-info">
                    <div class="search-item-title-row">
                        <span class="search-item-title">${title}</span>
                        ${origTitle ? `<span class="search-item-orig-title">/ ${origTitle}</span>` : ''}
                    </div>
                    <div class="search-item-tags">
                        ${item.kind ? `<span class="search-tag tag-kind">${i18n('explore.type')} ${item.kind}</span>` : ''}
                        ${item.year ? `<span class="search-tag tag-year">${item.year} ${i18n('explore.year')}</span>` : ''}
                        ${statusStr ? `<span class="search-tag tag-status">${statusStr}</span>` : ''}
                    </div>
                    ${genresStr ? `<div class="search-item-genres"><span class="label">${i18n('explore.genres')}</span> ${genresStr}</div>` : ''}
                </div>
            </a>`;
    }).join('');
}

function buildNewsItemCard(item) {
    return `
        <a href="${item.url}" target="_blank" class="news-item-card">
            ${item.image ? `<div class="news-thumb"><img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async"></div>` : `<div class="news-thumb placeholder"><i class="ti ti-news"></i></div>`}
            <div class="news-item-body">
                <h4 class="news-item-title">${item.title}</h4>
                ${(item.tags && item.tags.length) ? `<div class="news-tags">${item.tags.map(t => `<span class="news-tag">${t}</span>`).join('')}</div>` : ''}
                <div class="news-item-meta">
                    ${item.author ? `<span class="news-author"><i class="ti ti-user"></i> ${item.author}</span>` : ''}
                    ${item.date ? `<span class="news-date"><i class="ti ti-calendar"></i> ${item.date}</span>` : ''}
                </div>
            </div>
        </a>`;
}

function setupNewsInfiniteScroll() {
    if (newsObserver) newsObserver.disconnect();

    const sentinel = document.getElementById('news-infinite-sentinel');
    if (!sentinel) return;

    newsObserver = new IntersectionObserver((entries) => {
        const profileTab = document.getElementById('profile');
        const isProfileActive = profileTab && profileTab.classList.contains('active');
        if (entries[0].isIntersecting && !isLoadingNews && hasMoreNews && isProfileActive) {
            loadNextNewsPage();
        }
    }, { rootMargin: '200px' });

    newsObserver.observe(sentinel);
}


async function loadNextNewsPage() {
    if (isLoadingNews || !hasMoreNews) return;
    isLoadingNews = true;

    const loader = document.getElementById('news-infinite-loader');
    if (loader) loader.classList.remove('hidden');

    currentNewsPage++;

    try {
        const res = await fetch(`/api/news?page=${currentNewsPage}&limit=10`);
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            hasMoreNews = false;
            if (loader) loader.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">' + i18n('explore.no_more_news') + '</span>';
        } else {
            // Filter duplicates
            const uniqueItems = items.filter(item => {
                const key = item.id || item.url;
                if (loadedNewsIds.has(key)) return false;
                loadedNewsIds.add(key);
                return true;
            });

            if (uniqueItems.length > 0) {
                const listContainer = document.getElementById('other-news-list');
                if (listContainer) {
                    const newHTML = uniqueItems.map(buildNewsItemCard).join('');
                    listContainer.insertAdjacentHTML('beforeend', newHTML);
                }
            }

            if (items.length < 10) {
                hasMoreNews = false;
                if (loader) loader.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">' + i18n('explore.no_more_news') + '</span>';
            } else if (loader) {
                loader.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error(i18n('explore.load_more_error'), err);
        hasMoreNews = false;
    } finally {
        isLoadingNews = false;
    }
}

function renderExplore(data) {
    const container = document.getElementById('explore-news-container');
    if (!container) return;

    currentNewsPage = 1;
    isLoadingNews = false;
    hasMoreNews = true;
    loadedNewsIds.clear();

    if (data.error) {
        container.innerHTML = `<div class="card"><p style="color: var(--danger);">${i18n('error')}: ${data.error}</p></div>`;
        return;
    }

    const contentList = data.content || [];
    const hotList = data.hot || [];
    
    // Filter main news and save their IDs
    const latest = (data.latest || []).filter(item => {
        const key = item.id || item.url;
        if (loadedNewsIds.has(key)) return false;
        loadedNewsIds.add(key);
        return true;
    });

    // Filter remaining news
    const other = (data.other || []).filter(item => {
        const key = item.id || item.url;
        if (loadedNewsIds.has(key)) return false;
        loadedNewsIds.add(key);
        return true;
    });

    const badgeMap = {
        'collection': 'explore.collection',
        'critique': 'explore.review',
        'article': 'explore.article',
        'news': 'explore.article',
        '': 'explore.topic'
    };

    const buildTopicRow = (item) => {
        const badgeKey = badgeMap[(item.tag || '').toLowerCase()] || 'explore.topic';
        return `
        <a href="${item.url}" target="_blank" class="topic-row-item" title="${(item.title || '').replace(/"/g, '&quot;')}">
            <div class="topic-main">
                <span class="topic-title-text">${item.title}</span>
                <span class="topic-badge badge-${(item.tag || '').toLowerCase()}">${i18n(badgeKey)}</span>
            </div>
            <div class="topic-meta">
                <span class="topic-comments"><i class="ti ti-message-circle"></i> ${item.comments_count}</span>
            </div>
        </a>`;
    };

    let html = `
        <div class="explore-two-col">
            <!-- Content Manager -->
            <div class="card" data-section="explore-content">
                <div class="card-header">
                    <h3><i class="ti ti-grid-dots"></i> ${i18n('explore.content')}</h3>
                    <div class="content-sub-links">
                        <a href="https://shikimori.io/collections" target="_blank">${i18n('explore.collections')}</a> /
                        <a href="https://shikimori.io/forum/critiques" target="_blank">${i18n('explore.reviews')}</a> /
                        <a href="https://shikimori.io/articles" target="_blank">${i18n('explore.articles')}</a>
                    </div>
                </div>
                <div class="topics-list">
                    ${contentList.length ? contentList.map(buildTopicRow).join('') : `<p style="color:var(--text-muted)">${i18n('explore.no_content')}</p>`}
                </div>
            </div>

            <!-- Hot Topics -->
            <div class="card" data-section="explore-hot">
                <div class="card-header">
                    <h3><i class="ti ti-flame"></i> ${i18n('explore.hot_topics')}</h3>
                </div>
                <div class="topics-list">
                    ${hotList.length ? hotList.map(buildTopicRow).join('') : `<p style="color:var(--text-muted)">${i18n('explore.no_hot')}</p>`}
                </div>
            </div>
        </div>
    `;

    if (latest.length) {
        html += `<div class="card explore-news-card" data-section="explore-news" style="margin-top: 24px;">
            <div class="card-header"><h3><i class="ti ti-news"></i> ${i18n('explore.main_news')}</h3></div>
            <div class="news-feed-list">${latest.map(buildNewsItemCard).join('')}</div>
        </div>`;
    }

    if (other.length) {
        html += `<div class="card explore-news-card" data-section="explore-news" style="margin-top: 24px;">
            <div class="card-header"><h3><i class="ti ti-layout-grid"></i> ${i18n('explore.more_news')}</h3></div>
            <div id="other-news-list" class="news-feed-list">${other.map(buildNewsItemCard).join('')}</div>
            <div id="news-infinite-sentinel" style="height: 20px; margin-top: 10px;"></div>
            <div id="news-infinite-loader" class="news-infinite-loader hidden">
                <i class="ti ti-loader animate-spin"></i> ${i18n('explore.loading_more')}
            </div>
        </div>`;
    }


    container.innerHTML = html;
    setupNewsInfiniteScroll();
    if (typeof applySectionVisibility === 'function') {
        applySectionVisibility();
    }
}

// ==================== CONTINUE WATCHING ====================

function renderContinueWatching() {
    const container = document.getElementById('continue-watching-container');
    if (!container) return;

    let items = [];
    try {
        items = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
    } catch (e) {
        items = [];
    }

    if (!items || items.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="card continue-watching-card" data-section="continue-watching">
            <div class="card-header">
                <h3><i class="ti ti-player-play"></i> <span>${i18n('player.continue_watching')}</span></h3>
                <span class="badge badge-watching" style="font-size: 11px;">${items.length}</span>
            </div>
            <div class="continue-watching-carousel">
                ${items.map(item => {
                    const total = item.total_episodes || 0;
                    const percent = total > 0 ? Math.min(100, Math.round((item.episode / total) * 100)) : 0;
                    const epText = `${i18n('player.ep_short')} ${item.episode}${total ? ` / ${total}` : ''}`;
                    const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                    const title = item.russian || item.title || 'Anime';

                    return `
                        <div class="continue-watching-item" onclick="openAnimeModal(${item.id})">
                            <div class="continue-thumb-wrap">
                                ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="continue-thumb" loading="lazy" decoding="async">` : `<div class="continue-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                <div class="continue-play-overlay"><i class="ti ti-player-play"></i></div>
                                <span class="continue-ep-badge">${epText}</span>

                                <button type="button" class="continue-remove-btn" onclick="removeContinueWatching(${item.id}, event)" title="${i18n('close')}"><i class="ti ti-x"></i></button>
                            </div>

                            <div class="continue-info">
                                <div class="continue-title" title="${title}">${title}</div>
                                ${percent > 0 ? `
                                    <div class="continue-progress-bar">
                                        <div class="continue-progress-fill" style="width: ${percent}%;"></div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
window.renderContinueWatching = renderContinueWatching;

function removeContinueWatching(animeId, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    try {
        let list = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        list = list.filter(item => item.id != animeId);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));
        renderContinueWatching();
    } catch (err) {}
}
window.removeContinueWatching = removeContinueWatching;


// ==================== AIRING SCHEDULE / CALENDAR ====================

let calendarDataCache = null;
let currentCalendarDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Monday..6=Sunday

async function loadAiringCalendar() {
    const container = document.getElementById('calendar-section-container');
    if (!container) return;

    if (!calendarDataCache) {
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('loading') + '</div>';
        try {
            const res = await fetch('/api/calendar');
            const data = await res.json();
            calendarDataCache = Array.isArray(data) ? data : [];
        } catch (err) {
            container.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
            return;
        }
    }
    renderAiringCalendarUI(currentCalendarDay);
}
window.loadAiringCalendar = loadAiringCalendar;

function setCalendarDay(dayIndex) {
    currentCalendarDay = dayIndex;
    renderAiringCalendarUI(dayIndex);
}
window.setCalendarDay = setCalendarDay;

function renderAiringCalendarUI(activeDay) {
    const container = document.getElementById('calendar-section-container');
    if (!container || !calendarDataCache) return;

    const daysShort = [
        i18n('calendar.mon'),
        i18n('calendar.tue'),
        i18n('calendar.wed'),
        i18n('calendar.thu'),
        i18n('calendar.fri'),
        i18n('calendar.sat'),
        i18n('calendar.sun')
    ];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;


    const filtered = calendarDataCache.filter(item => item.day_of_week === activeDay);

    container.innerHTML = `
        <div class="card calendar-card" data-section="explore-calendar">
            <div class="card-header calendar-card-header">
                <h3><i class="ti ti-calendar-event"></i> <span>${i18n('calendar.title')}</span></h3>
                <div class="calendar-days-tabs">
                    ${daysShort.map((day, idx) => `
                        <button type="button" class="cal-day-btn ${idx === activeDay ? 'active' : ''} ${idx === todayIndex ? 'today' : ''}" onclick="setCalendarDay(${idx})">
                            <span>${day}</span>
                            ${idx === todayIndex ? `<span class="cal-today-dot"></span>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="calendar-items-grid">
                ${filtered.length > 0 ? filtered.map(item => {
                    const title = item.russian || item.name;
                    const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                    const time = item.time_str ? `${item.time_str}` : '';
                    const nextEp = item.next_episode ? `${item.next_episode} ${i18n('calendar.ep_next')}` : '';

                    return `
                        <div class="calendar-item-card" onclick="openAnimeModal(${item.id})">
                            <div class="cal-thumb-wrap">
                                ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="cal-thumb" loading="lazy" decoding="async">` : `<div class="cal-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                ${time ? `<span class="cal-time-badge"><i class="ti ti-clock"></i> ${time}</span>` : ''}
                                ${item.score ? `<span class="cal-score-badge"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                            </div>

                            <div class="cal-item-info">
                                <div class="cal-item-title" title="${title}">${title}</div>
                                <div class="cal-item-meta">
                                    <span class="cal-next-ep">${nextEp}</span>
                                    <span class="badge badge-watching" style="font-size: 10px;">${item.kind}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `<p style="color: var(--text-muted); padding: 16px 0;">${i18n('calendar.empty_day')}</p>`}
            </div>
        </div>
    `;
}


// ==================== CATALOG WITH RICH FILTERS ====================

let catalogPage = 1;
let catalogItemsCache = [];
let catalogGenresCache = [];
let isLoadingCatalog = false;

async function loadGenres() {
    if (catalogGenresCache.length > 0) return catalogGenresCache;
    try {
        const res = await fetch('/api/genres');
        catalogGenresCache = await res.json();
    } catch (e) {
        catalogGenresCache = [];
    }
    return catalogGenresCache;
}

async function loadCatalog(page = 1, append = false) {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    if (isLoadingCatalog) return;
    isLoadingCatalog = true;

    if (!append) {
        catalogPage = 1;
        container.innerHTML = '<div class="loader" style="grid-column: 1 / -1;"><i class="ti ti-loader animate-spin"></i> ' + i18n('loading') + '</div>';
    }

    const genre = document.getElementById('cat-filter-genre')?.value || '';
    const season = document.getElementById('cat-filter-season')?.value || '';
    const kind = document.getElementById('cat-filter-kind')?.value || '';
    const status = document.getElementById('cat-filter-status')?.value || '';
    const score = document.getElementById('cat-filter-score')?.value || '';
    const order = document.getElementById('cat-filter-sort')?.value || 'ranked';

    const params = new URLSearchParams({
        page: page,
        limit: 24,
        order: order
    });
    if (genre) params.append('genre', genre);
    if (season) params.append('season', season);
    if (kind) params.append('kind', kind);
    if (status) params.append('status', status);
    if (score) params.append('score', score);

    try {
        const res = await fetch(`/api/catalog?${params.toString()}`);
        const items = await res.json();

        if (!append) {
            catalogItemsCache = items;
        } else {
            catalogItemsCache = catalogItemsCache.concat(items);
        }

        renderCatalogGrid(catalogItemsCache, items.length >= 24);
    } catch (err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger); grid-column: 1 / -1;">${err.message}</p>`;
    } finally {
        isLoadingCatalog = false;
    }
}
window.loadCatalog = loadCatalog;

function onCatalogFilterChange() {
    catalogPage = 1;
    loadCatalog(1, false);
}
window.onCatalogFilterChange = onCatalogFilterChange;

function loadMoreCatalog() {
    catalogPage++;
    loadCatalog(catalogPage, true);
}
window.loadMoreCatalog = loadMoreCatalog;

function renderCatalogGrid(items, hasMore = false) {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; padding: 24px; text-align: center;">${i18n('catalog.empty')}</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const title = item.russian || item.name;
        const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
        const genres = (item.genres || []).slice(0, 2).join(', ');

        return `
            <div class="catalog-anime-card" onclick="openAnimeModal(${item.id})">
                <div class="catalog-poster-wrap">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="catalog-poster-img" loading="lazy" decoding="async">` : `<div class="catalog-poster-placeholder"><i class="ti ti-movie"></i></div>`}
                    ${item.score ? `<span class="catalog-score-badge"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                    ${item.kind ? `<span class="catalog-kind-badge">${item.kind}</span>` : ''}
                </div>

                <div class="catalog-card-body">
                    <div class="catalog-card-title" title="${title}">${title}</div>
                    <div class="catalog-card-meta">
                        <span class="catalog-meta-year">${item.year || ''}</span>
                        ${genres ? `<span class="catalog-meta-genres" title="${genres}">${genres}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');


    const loadMoreContainer = document.getElementById('catalog-load-more-wrap');
    if (loadMoreContainer) {
        loadMoreContainer.innerHTML = hasMore ? `
            <button type="button" class="btn btn-load-more-catalog" onclick="loadMoreCatalog()">
                <i class="ti ti-reload"></i> ${i18n('catalog.load_more')}
            </button>
        ` : '';
    }
}


// ==================== RANDOMIZER & RECOMMENDATIONS ====================

async function pickRandomAnime() {
    const btn = document.getElementById('btn-random-anime');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ti ti-loader animate-spin"></i> <span>${i18n('random.finding')}</span>`;
    }

    showToast(i18n('random.finding') + ' 🎲', 'info', 2000);

    try {
        const res = await fetch('/api/random');
        const data = await res.json();
        if (res.ok && data.id) {
            openAnimeModal(data.id);
        } else {
            showToast(i18n('random.error'), 'error');
        }

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-sparkles"></i> <span>${i18n('random.btn')}</span>`;
        }
    }
}
window.pickRandomAnime = pickRandomAnime;

async function initExploreExtraSections() {
    // 1. Продолжить просмотр - локальные данные из localStorage (мгновенно)
    renderContinueWatching();

    // 2. Расписание онгоингов - загрузка только при приближении к блоку
    if (typeof setupSectionLazyLoader === 'function') {
        setupSectionLazyLoader('calendar-section-container', () => {
            loadAiringCalendar();
        }, '300px');

        // 3. Каталог и жанры - загрузка только при приближении к блоку
        setupSectionLazyLoader('catalog-section-container', async () => {
            const genreSelect = document.getElementById('cat-filter-genre');
            if (genreSelect) {
                const genres = await loadGenres();
                genreSelect.innerHTML = `<option value="">${i18n('catalog.filter.all_genres')}</option>` +
                    genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            }
            loadCatalog(1, false);
        }, '300px');
    } else {
        loadAiringCalendar();
        loadCatalog(1, false);
    }
}
window.initExploreExtraSections = initExploreExtraSections;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initExploreExtraSections, 100);
});

;
/* --- js/settings.js --- */
/* Настройки сайта: фон (цвет или фото), видимость разделов и вид навигации */

const BG_SETTINGS_KEY = 'app_bg_settings';
const SECTION_VISIBILITY_KEY = 'app_section_visibility';
const NAVBAR_VIEW_KEY = 'app_navbar_view';
const DEFAULT_NAVBAR_VIEW = 'full';
let currentBgMode = 'color';
let uploadedImageDataUrl = '';
let isAuthenticated = false;

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
            const data = await res.json();
            isAuthenticated = data.authenticated || false;
        }
    } catch (err) {
        console.error('Ошибка проверки авторизации:', err);
        isAuthenticated = false;
    }
    return isAuthenticated;
}

async function loadSettingsFromServer() {
    if (!isAuthenticated) return null;
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки настроек с сервера:', err);
    }
    return null;
}

async function saveSettingsToServer(settings) {
    if (!isAuthenticated) return false;
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return res.ok;
    } catch (err) {
        console.error('Ошибка сохранения настроек на сервере:', err);
        return false;
    }
}

function getSavedBgSettings() {
    try {
        const raw = localStorage.getItem(BG_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('Ошибка чтения настроек фона:', err);
        return null;
    }
}

function saveBgSettings(settings) {
    try {
        localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
        console.error('Ошибка сохранения настроек фона:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: settings });
    }
}

function applyBgToPage(settings) {
    if (!settings || settings.mode === 'theme') {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundAttachment = '';
        document.body.style.backgroundPosition = '';
        return;
    }

    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';

    if (settings.mode === 'image' && settings.image) {
        document.body.style.backgroundImage = `url("${settings.image}")`;
        document.body.style.backgroundColor = '';
    } else if (settings.mode === 'color' && settings.color) {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = settings.color;
    }
}

async function syncAndApplySettings() {
    await checkAuthStatus();

    let bgSettings = null;
    let navbarView = null;
    let sectionVis = null;

    if (isAuthenticated) {
        const serverSettings = await loadSettingsFromServer();
        if (serverSettings) {
            if (serverSettings.background) {
                bgSettings = serverSettings.background;
                try { localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(bgSettings)); } catch (e) {}
            }
            if (serverSettings.navbar_view) {
                navbarView = serverSettings.navbar_view;
                try { localStorage.setItem(NAVBAR_VIEW_KEY, navbarView); } catch (e) {}
            }
            if (serverSettings.section_visibility) {
                sectionVis = serverSettings.section_visibility;
                try { localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(sectionVis)); } catch (e) {}
            }
        }
    }

    if (!bgSettings) bgSettings = getSavedBgSettings();
    if (!navbarView) navbarView = getSavedNavbarView();
    if (!sectionVis) sectionVis = getSectionVisibility();

    applyBgToPage(bgSettings);
    applyNavbarView(navbarView);
    applySectionVisibility();
}

async function applySavedBg() {
    let bgSettings = getSavedBgSettings();
    applyBgToPage(bgSettings);
}

function setBgMode(mode) {
    currentBgMode = mode;
    const colorPanel = document.getElementById('bg-color-panel');
    const imagePanel = document.getElementById('bg-image-panel');
    const colorBtn = document.getElementById('bg-mode-color-btn');
    const imageBtn = document.getElementById('bg-mode-image-btn');

    if (colorPanel) colorPanel.classList.toggle('hidden', mode !== 'color');
    if (imagePanel) imagePanel.classList.toggle('hidden', mode !== 'image');
    if (colorBtn) colorBtn.classList.toggle('active', mode === 'color');
    if (imageBtn) imageBtn.classList.toggle('active', mode === 'image');
}

function onBgColorChange(value) {
    const valueEl = document.getElementById('bg-color-value');
    if (valueEl) valueEl.innerText = value || '#2b133d';
    const settings = { mode: 'color', color: value, image: '' };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageUrlChange(value) {
    const url = value.trim();
    if (!url) return;
    uploadedImageDataUrl = '';
    const settings = { mode: 'image', color: '', image: url };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageFileChange(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImageDataUrl = e.target.result;
        const urlInput = document.getElementById('bg-image-url');
        if (urlInput) urlInput.value = '';
        const settings = { mode: 'image', color: '', image: uploadedImageDataUrl };
        saveBgSettings(settings);
        applyBgToPage(settings);
    };
    reader.readAsDataURL(file);
}

function resetBackgroundSettings() {
    uploadedImageDataUrl = '';
    localStorage.removeItem(BG_SETTINGS_KEY);

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput) {
        colorInput.value = colorInput.dataset.default || '#2b133d';
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = colorInput.value;
    }
    const urlInput = document.getElementById('bg-image-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('bg-image-file');
    if (fileInput) fileInput.value = '';

    // Reset on server too if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: { mode: 'theme', color: '', image: '' } });
    }

    applyBgToPage(null);
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput && !colorInput.dataset.default) {
        colorInput.dataset.default = colorInput.value;
    }

    const saved = getSavedBgSettings();
    if (saved && saved.mode === 'image' && saved.image) {
        setBgMode('image');
        if (saved.image.startsWith('data:')) {
            uploadedImageDataUrl = saved.image;
        } else {
            const urlInput = document.getElementById('bg-image-url');
            if (urlInput) urlInput.value = saved.image;
        }
    } else if (saved && saved.mode === 'color' && saved.color) {
        if (colorInput) colorInput.value = saved.color;
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = saved.color;
        setBgMode('color');
    } else {
        setBgMode('color');
    }

    loadSectionVisibilityToggles();
    applyNavbarView(getSavedNavbarView());
}

function closeSettingsModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

/* ---- Видимость разделов ---- */

function getSectionVisibility() {
    try {
        const raw = localStorage.getItem(SECTION_VISIBILITY_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('Ошибка чтения настроек видимости разделов:', err);
        return {};
    }
}

function saveSectionVisibility(visibility) {
    try {
        localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(visibility));
    } catch (err) {
        console.error('Ошибка сохранения настроек видимости разделов:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ section_visibility: visibility });
    }
}

function onSectionToggle(checkbox) {
    const section = checkbox.dataset.section;
    if (!section) return;

    const visibility = getSectionVisibility();
    visibility[section] = checkbox.checked;
    saveSectionVisibility(visibility);
    applySectionVisibility();
}

function applySectionVisibility() {
    const visibility = getSectionVisibility();
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(el => {
        const section = el.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            el.classList.toggle('section-hidden', !visibility[section]);
        }
    });
}

function loadSectionVisibilityToggles() {
    const visibility = getSectionVisibility();
    const toggles = document.querySelectorAll('.settings-toggle input[type="checkbox"][data-section]');
    toggles.forEach(toggle => {
        const section = toggle.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            toggle.checked = visibility[section];
        }
    });
}

/* ---- Вид навигации ---- */

function getSavedNavbarView() {
    try {
        const raw = localStorage.getItem(NAVBAR_VIEW_KEY);
        return raw ? raw : DEFAULT_NAVBAR_VIEW;
    } catch (err) {
        console.error('Ошибка чтения настроек вида навигации:', err);
        return DEFAULT_NAVBAR_VIEW;
    }
}

function saveNavbarView(view) {
    try {
        localStorage.setItem(NAVBAR_VIEW_KEY, view);
    } catch (err) {
        console.error('Ошибка сохранения настроек вида навигации:', err);
    }
    if (isAuthenticated) {
        saveSettingsToServer({ navbar_view: view });
    }
}

function applyNavbarView(view) {
    const header = document.querySelector('.app-header');
    if (!header) return;

    header.classList.remove('navbar-view-full', 'navbar-view-icons', 'navbar-view-titles');
    if (view && view !== DEFAULT_NAVBAR_VIEW) {
        header.classList.add(`navbar-view-${view}`);
    }

    const options = document.querySelectorAll('.navbar-view-option');
    options.forEach(opt => {
        const optView = opt.dataset.navbarView;
        opt.classList.toggle('active', optView === view);
    });
}

function setNavbarView(view) {
    if (!view) return;
    saveNavbarView(view);
    applyNavbarView(view);
}

document.addEventListener('DOMContentLoaded', () => {
    // Immediate local apply to prevent layout shifts
    applyBgToPage(getSavedBgSettings());
    applyNavbarView(getSavedNavbarView());
    applySectionVisibility();

    // Async server sync
    syncAndApplySettings();
});

;
