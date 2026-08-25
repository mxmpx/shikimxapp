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
