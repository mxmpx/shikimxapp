import { AppConfig, ThemePreset } from './appConfigTypes'
import {
  THEME_PRESETS,
  ANIME_GENRES,
  ANIME_TYPES,
  ANIME_STATUSES,
  ANIME_SORT_ORDERS,
  ANIME_RATINGS,
  MANGA_TYPES,
  MANGA_STATUSES,
  RANOBE_TYPES,
  CALENDAR_DAYS,
} from './catalogFiltersData'

export type { AppConfig, ThemePreset }

export const appConfig: AppConfig = {
  // ── 1. Брендинг ──
  brand: {
    name: 'Shiki',
    suffix: 'MX',
    version: '2.0.0',
    buildDate: 'Октябрь 2026',
    tagline: 'Современный клиент Shikimori с мультиплеером и mxstyle2 дизайном',
    logoIcon: 'ti-device-tv',
    logoGradient: 'linear-gradient(135deg, #d199ff 0%, #7e22ce 100%)',
    logoSize: 32,
    maxPageWidth: 1400,
    contentPaddingX: 32,
    contentPaddingY: 24,
  },

  // ── 2. Цветовая система и пресеты оформления ──
  theme: {
    defaultTheme: 'dark',
    defaultPreset: 'amethyst',
    allowThemeToggle: true,
    presets: THEME_PRESETS,
    darkTokens: {
      bgMain: '#0c0d14',
      bgSecondary: '#12131f',
      cardBg: 'rgba(20, 22, 35, 0.72)',
      textMain: '#ffffff',
      textMuted: '#94a3b8',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      glassBlur: 24,
    },
    lightTokens: {
      bgMain: '#f8fafc',
      bgSecondary: '#ffffff',
      cardBg: 'rgba(255, 255, 255, 0.85)',
      textMain: '#0f172a',
      textMuted: '#64748b',
      borderColor: 'rgba(0, 0, 0, 0.08)',
      glassBlur: 20,
    },
  },

  // ── 3. Кастомизация фона и навигационной панели ──
  backgroundCustomization: {
    allowCustomBg: true,
    defaultBgMode: 'color',
    defaultBgColor: '#0a0a0f',
    defaultBgImageUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80',
    navbarViewModes: [
      { id: 'full', label: 'Иконки и названия' },
      { id: 'icons', label: 'Только иконки' },
      { id: 'titles', label: 'Только текст' },
    ],
    defaultNavbarView: 'full',
  },

  // ── 4. Размеры, геометрия и дизайн-токены ──
  dimensions: {
    headerHeight: 56,
    headerPaddingX: 24,
    headerBlur: 20,
    headerZIndex: 100,

    searchWidth: 360,
    searchFocusWidth: 460,
    searchHeight: 36,
    searchRadius: 10,
    searchPaddingLeft: 12,
    searchPaddingRight: 10,
    searchGap: 8,
    searchIconSize: 15,
    searchKbdWidth: 20,
    searchKbdHeight: 20,
    searchKbdRadius: 5,
    searchKbdFontSize: 11,

    cardMinWidth: 180,
    cardGap: 18,
    cardRadius: 14,
    cardPosterRatio: '2/3',
    cardHoverLift: 6,
    cardHoverScale: 1.02,
    cardHoverShadowBlur: 26,
    cardPosterHoverZoom: 1.06,
    cardTitleLines: 2,
    cardTitleFontSize: 13,
    cardMetaFontSize: 11,
    scoreBadgeRadius: 6,
    scoreBadgeFontSize: 11,
    kindBadgeRadius: 5,
    kindBadgeFontSize: 10,

    modalRadius: 20,
    modalBackdropBlur: 28,
    modalHeaderHeight: 64,
    modalPadding: 24,
    modalMaxWidth: 1200,
    modalMaxHeightVw: 92,

    inputHeight: 38,
    inputRadius: 10,
    inputPaddingX: 12,
    inputFontSize: 13,
    selectHeight: 38,
    selectRadius: 10,
    selectMaxHeight: 280,
    selectMinWidth: 160,
    buttonRadius: 10,
    buttonPaddingX: 16,
    buttonPaddingY: 10,
    buttonFontSize: 13,

    glassBlur: 24,
    glowRadius: 28,
    glowOpacity: 0.35,
    shadowElevation: 30,

    scrollbarWidth: 6,
    scrollbarThumbRadius: 3,
    scrollbarThumbHoverExpand: 8,
  },

  // ── 5. Шрифты и типографика ──
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    monoFontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    titleHero: 32,
    titleLarge: 24,
    titleMedium: 18,
    titleSmall: 15,
    bodyText: 13.5,
    bodySmall: 12,
    captionText: 11,
    badgeText: 10.5,
    lineHeightHeading: 1.25,
    lineHeightBody: 1.5,
  },

  // ── 6. Анимации ──
  animations: {
    durationInstantMs: 80,
    durationFastMs: 150,
    durationNormalMs: 250,
    durationSlowMs: 400,
    easingDefault: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    enablePageTransitions: true,
    enableHoverScale: true,
  },

  // ── 7. Неоновый курсор ──
  cursor: {
    enabled: true,
    freeSize: 14,
    freeBorderWidth: 1.5,
    freeGlowBlur: 12,
    morphPaddingSmall: 3,
    morphPaddingNormal: 4,
    morphClickScale: 0.96,
    morphGlowBlur: 18,
    morphTransitionMs: 160,
    maxTargetWidth: 560,
    maxTargetHeight: 220,
    hideOnMobile: true,
    hideOnIframe: true,
  },

  // ── 8. Поиск ──
  search: {
    placeholder: 'Поиск по базе аниме и манги...',
    hotkey: '/',
    hotkeyLabel: '/',
    debounceMs: 220,
    minQueryLength: 2,
    dropdownLimit: 8,
    dropdownMaxHeight: 420,
    clearButton: true,
    showHotkeyBadge: true,
    showScoreInDropdown: true,
    showKindInDropdown: true,
  },

  // ── 9. Explore ──
  explore: {
    continueWatching: {
      enabled: true,
      title: 'Продолжить просмотр',
      cardMinWidth: 260,
      posterWidth: 80,
      posterHeight: 110,
      maxItems: 12,
      showProgress: true,
      showEpisodeBadge: true,
    },
    heroBanner: {
      enabled: true,
      badgeText: 'ВЫБОР СЕЗОНА',
      title: 'Магическая битва 2',
      description:
        'Инцидент в Сибуе в самом разгаре. Древние проклятия восстают против магов.',
      primaryButtonText: 'Смотреть онлайн',
      primaryButtonAnimeId: 51009,
      luckyButtonText: 'Мне повезёт',
      paddingY: 48,
      paddingX: 40,
      bannerRadius: 20,
      bannerMinHeight: 320,
    },
    newsBlock: {
      enabled: true,
      title: 'Новости и анонсы',
      icon: 'ti-news',
      limit: 6,
      viewAllText: 'Все новости',
    },
    hotTopicsBlock: {
      enabled: true,
      title: 'Горячие обсуждения',
      icon: 'ti-flame',
      limit: 5,
      viewAllText: 'Все темы форума',
    },
    ongoings: {
      enabled: true,
      title: 'Онгоинги сегодня',
      limit: 8,
      indicatorColor: '#22c55e',
      viewScheduleText: 'Полное расписание',
    },
    catalog: {
      enabled: true,
      title: 'Популярное аниме',
      itemsPerPage: 24,
      luckyButton: true,
      luckyButtonText: 'Случайное аниме',
      loadMoreButtonText: 'Показать ещё тайтлы',
    },
    profileSummary: {
      enabled: true,
      title: 'Мой профиль',
      statsTitle: 'Статистика просмотров',
    },
  },

  // ── 10. Каталог Аниме ──
  catalogAnime: {
    title: 'Каталог Аниме',
    subtitle: 'База японской анимации с фильтрами по жанрам, годам и оценкам',
    itemsPerPage: 24,
    defaultSort: 'ranked',
    defaultType: 'all',
    defaultStatus: 'all',
    defaultSeason: 'all',
    defaultRating: 'all',
    types: ANIME_TYPES,
    statuses: ANIME_STATUSES,
    sortOrders: ANIME_SORT_ORDERS,
    ratings: ANIME_RATINGS,
    genres: ANIME_GENRES,
  },

  // ── 11. Каталог Манги ──
  catalogManga: {
    title: 'Каталог Манги',
    subtitle: 'Манга, манхва, маньхуа и ваншоты',
    itemsPerPage: 24,
    defaultSort: 'ranked',
    defaultType: 'all',
    defaultStatus: 'all',
    types: MANGA_TYPES,
    statuses: MANGA_STATUSES,
  },

  // ── 12. Каталог Ранобэ ──
  catalogRanobe: {
    title: 'Каталог Ранобэ и Новелл',
    subtitle: 'Легкие романы и новеллы Японии, Кореи и Китая',
    itemsPerPage: 24,
    defaultSort: 'ranked',
    defaultType: 'all',
    types: RANOBE_TYPES,
  },

  // ── 13. Топ-100 ──
  top100: {
    title: 'Топ 100 лучших аниме',
    subtitle: 'Рейтинг составлен по оценкам сотен тысяч зрителей Shikimori',
    totalLimit: 100,
    perPage: 20,
    showRankBadge: true,
    badgeGradients: {
      first: 'linear-gradient(135deg, #ffd700, #b8860b)',
      second: 'linear-gradient(135deg, #e0e0e0, #9e9e9e)',
      third: 'linear-gradient(135deg, #cd7f32, #8b4513)',
      other: 'rgba(0,0,0,0.75)',
    },
    tabs: [
      { id: 'all', label: 'Все аниме' },
      { id: 'movie', label: 'Фильмы' },
      { id: 'ongoing', label: 'Онгоинги' },
      { id: 'manga', label: 'Манга' },
    ],
  },

  // ── 14. Календарь онгоингов ──
  calendar: {
    title: 'Календарь релизов онгоингов',
    subtitle:
      'Расписание выхода новых серий аниме текущего сезона по дням недели',
    todayHighlightColor: '#a855f7',
    nextEpisodeBadgeBg: 'rgba(74, 222, 128, 0.9)',
    nextEpisodeBadgeColor: '#052e16',
    timeFormat: '24h',
    showAiredBadge: true,
    days: CALENDAR_DAYS,
  },

  // ── 15. Списки и статусы пользователя ──
  rates: {
    defaultType: 'Anime',
    stepIncrement: 1,
    allowQuickScore: true,
    animeStatuses: [
      { id: 'watching', label: 'Смотрю', color: '#a855f7', icon: 'ti-player-play' },
      { id: 'planned', label: 'В планах', color: '#38bdf8', icon: 'ti-clock' },
      { id: 'rewatching', label: 'Пересматриваю', color: '#ec4899', icon: 'ti-repeat' },
      { id: 'completed', label: 'Просмотрено', color: '#22c55e', icon: 'ti-check' },
      { id: 'on_hold', label: 'Отложено', color: '#f59e0b', icon: 'ti-player-pause' },
      { id: 'dropped', label: 'Брошено', color: '#ef4444', icon: 'ti-trash' },
    ],
    mangaStatuses: [
      { id: 'watching', label: 'Читаю', color: '#38bdf8', icon: 'ti-book-2' },
      { id: 'planned', label: 'В планах', color: '#a78bfa', icon: 'ti-clock' },
      { id: 'rereading', label: 'Перечитываю', color: '#ec4899', icon: 'ti-repeat' },
      { id: 'completed', label: 'Прочитано', color: '#4ade80', icon: 'ti-check' },
      { id: 'on_hold', label: 'Отложено', color: '#fbbf24', icon: 'ti-player-pause' },
      { id: 'dropped', label: 'Брошено', color: '#f87171', icon: 'ti-trash' },
    ],
    emptyMessages: {
      watching: 'Вы пока ничего не смотрите',
      planned: 'Ваш список запланированного пуст',
      rewatching: 'Вы пока ничего не пересматриваете',
      completed: 'Список просмотренного пуст',
      on_hold: 'Нет отложенных тайтлов',
      dropped: 'Нет брошенных тайтлов',
    },
  },

  // ── 16. Рекомендации ──
  recommendations: {
    title: 'Персональные рекомендации',
    subtitle: 'Тайтлы, подобранные на основе ваших списков и оценок',
    limit: 24,
    minScore: 7,
    showReasonBadge: true,
    emptyText:
      'Добавьте больше тайтлов в свои списки со статусом «Просмотрено», чтобы получить персональные рекомендации',
  },

  // ── 17. Избранное ──
  favourites: {
    title: 'Моё избранное',
    perPage: 24,
    emptyText: 'В избранном пока ничего нет',
    tabs: [
      { id: 'animes', label: 'Аниме', icon: 'ti-device-tv' },
      { id: 'mangas', label: 'Манга', icon: 'ti-book-2' },
      { id: 'characters', label: 'Персонажи', icon: 'ti-user' },
      { id: 'people', label: 'Авторы и сэйю', icon: 'ti-microphone' },
    ],
  },

  // ── 18. История просмотров ──
  history: {
    title: 'История активности',
    subtitle: 'Хроника открытых вами тайтлов и просмотренных серий',
    maxItemsSaved: 50,
    showClearButton: true,
    clearConfirmationText:
      'Вы уверены, что хотите очистить всю историю просмотров?',
    emptyText: 'История просмотров пока пуста',
  },

  // ── 19. Друзья ──
  friends: {
    title: 'Друзья',
    perPage: 24,
    onlineIndicatorColor: '#22c55e',
    emptyText: 'Список друзей пуст',
    tabs: [
      { id: 'all', label: 'Все друзья' },
      { id: 'online', label: 'В сети' },
      { id: 'incoming', label: 'Заявки' },
    ],
  },

  // ── 20. Пользователи ──
  users: {
    title: 'Пользователи Shikimori',
    subtitle: 'Поиск участников сообщества, их списков и статистики',
    perPage: 24,
    searchPlaceholder: 'Никнейм пользователя...',
    emptyText: 'Пользователи не найдены',
  },

  // ── 21. Форум сообщества ──
  forum: {
    title: 'Форум сообщества',
    perPage: 20,
    hotRepliesThreshold: 10,
    hotViewsThreshold: 100,
    categories: [
      { id: 'all', label: 'Все темы', icon: 'ti-messages' },
      { id: 'animanga', label: 'Аниме и Манга', icon: 'ti-device-tv' },
      { id: 'site', label: 'Работа сайта', icon: 'ti-settings' },
      { id: 'clubs', label: 'Клубы', icon: 'ti-circles-relation' },
      { id: 'critiques', label: 'Рецензии', icon: 'ti-pencil' },
      { id: 'news', label: 'Новости', icon: 'ti-news' },
      { id: 'offtopic', label: 'Оффтопик', icon: 'ti-coffee' },
    ],
  },

  // ── 22. Клубы ──
  clubs: {
    title: 'Клубы по интересам',
    perPage: 20,
    sortOptions: [
      { id: 'members', label: 'По участникам' },
      { id: 'comments', label: 'По активности' },
      { id: 'created', label: 'Новые' },
    ],
  },

  // ── 23. Коллекции ──
  collections: {
    title: 'Тематические коллекции',
    subtitle: 'Подборки аниме и манги от участников сообщества',
    perPage: 18,
  },

  // ── 24. Рецензии ──
  critiques: {
    title: 'Рецензии и обзоры',
    subtitle: 'Подробный анализ тайтлов от критиков сообщества',
    perPage: 15,
  },

  // ── 25. Статьи ──
  articles: {
    title: 'Статьи и гайды',
    perPage: 12,
  },

  // ── 26. Модалка аниме и плеер ──
  animeModal: {
    defaultPlayer: 'kodik',
    playerHeight: 480,
    theaterPlayerHeight: 640,
    autoplay: false,
    skipOpeningSeconds: 85,
    ratingScale: 10,
    starSize: 18,
    starHoverScale: 1.25,
    starActiveColor: '#ffd700',
    screenshotsLimit: 12,
    charactersLimit: 16,
    relatedLimit: 12,
    collapsedSynopsisHeight: 100,
    showTrailer: true,
    showPlayer: true,
    showChronology: true,
    showRelated: true,
    showScreenshots: true,
    showCharacters: true,
    showSimilar: true,
    showRatesButtons: true,
    defaultVoiceoverLanguage: 'ru',
    streamingSources: ['Kodik', 'AniLibria', 'AnimeGo', 'Sibnet', 'Yummy'],
    sidebarWidth: 330,
    containerMaxWidth: 1680,
    externalRatings: {
      shikimori: { label: 'Shikimori', bg: '#ffffff', color: '#111827' },
      worldArt: { label: 'World Art', bg: '#851414', color: '#ffffff' },
      kinopoisk: {
        label: 'Кинопоиск',
        bg: '#0d0d0d',
        color: '#ff7a00',
        border: 'rgba(255, 102, 0, 0.3)',
      },
      mal: {
        label: 'MAL',
        bg: '#2e51a2',
        color: '#ffffff',
        border: 'rgba(46, 81, 162, 0.45)',
      },
    },
  },

  // ── 27. Модальное окно статистики ──
  statsModal: {
    title: 'Детальная статистика',
    showScoreChart: true,
    showGenreChart: true,
    showActivityChart: true,
    chartBarHeight: 18,
    daysTimeMultiplier: 24,
  },

  // ── 28. Модальное окно настроек ──
  settingsModal: {
    title: 'Настройки Shiki MX',
    showThemeSection: true,
    showPlayerSection: true,
    showInterfaceSection: true,
    showSystemSection: true,
    fontScaleMin: 85,
    fontScaleMax: 125,
    fontScaleStep: 5,
    fontScaleDefault: 100,
  },

  // ── 29. О приложении ──
  aboutModal: {
    appName: 'Shiki MX App',
    version: '2.0.0',
    releaseDate: 'Октябрь 2026',
    tagline: 'Современный клиент Shikimori с мультиплеером и mxstyle2 дизайном',
    developer: 'MX Developer',
    githubUrl: 'https://github.com',
    shikimoriUrl: 'https://shikimori.io',
    telegramUrl: 'https://t.me',
    features: [
      'Сверхбыстрый поиск аниме и манги с горячей клавишей /',
      'Мульти-агрегатор видеопотоков Kodik и Anicli с авто-выбором озвучки',
      'Синхронизация списков и отметок с официальным аккаунтом Shikimori',
      'Неоновый футуристичный интерфейс mxstyle2 с адаптивным курсором',
      'Интерактивное расписание онгоингов с таймером до новых эпизодов',
      'Топ 100, Форум, Клубы, Коллекции, Рецензии и Статьи сообщества',
    ],
    techStack: [
      'Python 3.12',
      'Flask',
      'React 18',
      'TypeScript',
      'Vite',
      'mxstyle2 CSS',
      'Shikimori API v1/v2',
      'Kodik & Anicli',
    ],
  },

  // ── 30. Навигация и разделы ──
  tabs: {
    profile: {
      id: 'profile',
      label: 'Главная',
      icon: 'ti-home',
      group: 'misc',
      enabled: true,
      order: 1,
    },
    'catalog-anime': {
      id: 'catalog-anime',
      label: 'Аниме',
      icon: 'ti-player-play',
      group: 'database',
      enabled: true,
      order: 2,
    },
    top100: {
      id: 'top100',
      label: 'Топ 100',
      icon: 'ti-trophy',
      group: 'database',
      enabled: true,
      order: 3,
    },
    'catalog-manga': {
      id: 'catalog-manga',
      label: 'Манга',
      icon: 'ti-book-2',
      group: 'database',
      enabled: true,
      order: 4,
    },
    'catalog-ranobe': {
      id: 'catalog-ranobe',
      label: 'Ранобэ',
      icon: 'ti-notebook',
      group: 'database',
      enabled: true,
      order: 5,
    },
    forum: {
      id: 'forum',
      label: 'Форум',
      icon: 'ti-messages',
      group: 'community',
      enabled: true,
      order: 6,
    },
    clubs: {
      id: 'clubs',
      label: 'Клубы',
      icon: 'ti-circles-relation',
      group: 'community',
      enabled: true,
      order: 7,
    },
    collections: {
      id: 'collections',
      label: 'Коллекции',
      icon: 'ti-layout-grid',
      group: 'community',
      enabled: true,
      order: 8,
    },
    critiques: {
      id: 'critiques',
      label: 'Рецензии',
      icon: 'ti-pencil',
      group: 'community',
      enabled: true,
      order: 9,
    },
    articles: {
      id: 'articles',
      label: 'Статьи',
      icon: 'ti-file-text',
      group: 'community',
      enabled: true,
      order: 10,
    },
    users: {
      id: 'users',
      label: 'Пользователи',
      icon: 'ti-user',
      group: 'community',
      enabled: true,
      order: 11,
    },
    recommendations: {
      id: 'recommendations',
      label: 'Рекомендации',
      icon: 'ti-thumb-up',
      group: 'misc',
      enabled: true,
      order: 12,
    },
    calendar: {
      id: 'calendar',
      label: 'Календарь',
      icon: 'ti-calendar',
      group: 'misc',
      enabled: true,
      order: 13,
    },
    rates: {
      id: 'rates',
      label: 'Списки',
      icon: 'ti-list-check',
      group: 'misc',
      enabled: true,
      order: 14,
    },
    favourites: {
      id: 'favourites',
      label: 'Избранное',
      icon: 'ti-heart',
      group: 'misc',
      enabled: true,
      order: 15,
    },
    friends: {
      id: 'friends',
      label: 'Друзья',
      icon: 'ti-users',
      group: 'misc',
      enabled: true,
      order: 16,
    },
    history: {
      id: 'history',
      label: 'История',
      icon: 'ti-history',
      group: 'misc',
      enabled: true,
      order: 17,
    },
  },

  // ── 31. Сетевые настройки и API ──
  api: {
    shikimoriApiBase: 'https://shikimori.io/api',
    localApiBase: '/api',
    requestTimeoutMs: 12000,
    retryCount: 2,
    defaultPosterPlaceholder: '/static/img/no-poster.png',
    defaultAvatarPlaceholder:
      'https://shikimori.io/assets/globals/missing_avatar.png',
  },

  // ── 32. Общие тексты интерфейса ──
  commonTexts: {
    loadMore: 'Загрузить ещё',
    loading: 'Загрузка...',
    error: 'Произошла ошибка при загрузке',
    retry: 'Повторить попытку',
    empty: 'Ничего не найдено',
    close: 'Закрыть',
    cancel: 'Отмена',
    save: 'Сохранить',
    delete: 'Удалить',
    lucky: 'Мне повезёт!',
    back: 'Назад',
    search: 'Искать',
    viewOnline: 'Смотреть онлайн',
    expandText: '▼ Читать полностью',
    collapseText: '▲ Свернуть',
    myList: 'Мой список',
    saveChanges: 'Сохранить изменения',
    savedSuccess: 'Сохранено!',
    logout: 'Выйти из аккаунта',
    login: 'Войти',
  },
}

const STORAGE_KEY = 'shikimx_user_config_overrides'

export function getUserConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return appConfig
    const parsed = JSON.parse(raw)
    return { ...appConfig, ...parsed }
  } catch {
    return appConfig
  }
}

export function applyConfigToDOM(cfg: AppConfig = getUserConfig()): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(max-width: 768px)').matches
  const headerHeight = isMobile ? 52 : cfg.dimensions.headerHeight
  root.style.setProperty('--header-height', `${headerHeight}px`)
  root.style.setProperty('--search-width', `${cfg.dimensions.searchWidth}px`)
  root.style.setProperty(
    '--search-focus-width',
    `${cfg.dimensions.searchFocusWidth}px`
  )
  root.style.setProperty('--search-height', `${cfg.dimensions.searchHeight}px`)
  root.style.setProperty('--search-radius', `${cfg.dimensions.searchRadius}px`)
  root.style.setProperty('--card-min-width', `${cfg.dimensions.cardMinWidth}px`)
  root.style.setProperty('--card-gap', `${cfg.dimensions.cardGap}px`)
  root.style.setProperty('--card-radius', `${cfg.dimensions.cardRadius}px`)
  root.style.setProperty(
    '--card-hover-lift',
    `-${cfg.dimensions.cardHoverLift}px`
  )
  root.style.setProperty(
    '--card-hover-scale',
    `${cfg.dimensions.cardHoverScale}`
  )
  root.style.setProperty(
    '--card-shadow-blur',
    `${cfg.dimensions.cardHoverShadowBlur}px`
  )
  root.style.setProperty('--modal-radius', `${cfg.dimensions.modalRadius}px`)
  root.style.setProperty(
    '--modal-blur',
    `${cfg.dimensions.modalBackdropBlur}px`
  )
  root.style.setProperty(
    '--modal-max-width',
    `${cfg.dimensions.modalMaxWidth}px`
  )
  root.style.setProperty('--input-height', `${cfg.dimensions.inputHeight}px`)
  root.style.setProperty('--input-radius', `${cfg.dimensions.inputRadius}px`)
  root.style.setProperty('--button-radius', `${cfg.dimensions.buttonRadius}px`)
  root.style.setProperty('--glass-blur', `${cfg.dimensions.glassBlur}px`)
  root.style.setProperty('--glow-radius', `${cfg.dimensions.glowRadius}px`)
  root.style.setProperty('--glow-opacity', `${cfg.dimensions.glowOpacity}`)
  root.style.setProperty(
    '--scrollbar-width',
    `${cfg.dimensions.scrollbarWidth}px`
  )
  root.style.setProperty(
    '--scrollbar-radius',
    `${cfg.dimensions.scrollbarThumbRadius}px`
  )

  root.style.setProperty('--max-page-width', `${cfg.brand.maxPageWidth}px`)
  root.style.setProperty(
    '--content-padding-x',
    `${cfg.brand.contentPaddingX}px`
  )
  root.style.setProperty(
    '--content-padding-y',
    `${cfg.brand.contentPaddingY}px`
  )

  root.style.setProperty('--font-family', cfg.typography.fontFamily)
  root.style.setProperty('--font-mono', cfg.typography.monoFontFamily)
  root.style.setProperty('--font-size-hero', `${cfg.typography.titleHero}px`)
  root.style.setProperty('--font-size-h1', `${cfg.typography.titleLarge}px`)
  root.style.setProperty('--font-size-h2', `${cfg.typography.titleMedium}px`)
  root.style.setProperty('--font-size-h3', `${cfg.typography.titleSmall}px`)
  root.style.setProperty('--font-size-body', `${cfg.typography.bodyText}px`)
  root.style.setProperty(
    '--font-size-caption',
    `${cfg.typography.captionText}px`
  )

  root.style.setProperty(
    '--anim-instant',
    `${cfg.animations.durationInstantMs}ms`
  )
  root.style.setProperty('--anim-fast', `${cfg.animations.durationFastMs}ms`)
  root.style.setProperty(
    '--anim-normal',
    `${cfg.animations.durationNormalMs}ms`
  )
  root.style.setProperty('--anim-slow', `${cfg.animations.durationSlowMs}ms`)
  root.style.setProperty('--easing-default', cfg.animations.easingDefault)
  root.style.setProperty('--easing-spring', cfg.animations.easingSpring)

  root.style.setProperty('--cursor-free-size', `${cfg.cursor.freeSize}px`)
  root.style.setProperty(
    '--cursor-border-width',
    `${cfg.cursor.freeBorderWidth}px`
  )
  root.style.setProperty('--cursor-glow-blur', `${cfg.cursor.freeGlowBlur}px`)

  root.style.setProperty(
    '--anime-sidebar-width',
    `${cfg.animeModal.sidebarWidth || 330}px`
  )
  root.style.setProperty(
    '--anime-container-max-width',
    `${cfg.animeModal.containerMaxWidth || 1680}px`
  )

  if (typeof window !== 'undefined') {
    ;(window as any).__SHIKI_CONFIG__ = cfg
  }
}

export function saveUserConfigOverrides(overrides: Partial<AppConfig>): void {
  try {
    const current = getUserConfig()
    const next = { ...current, ...overrides }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    applyConfigToDOM(next)
  } catch (e) {
    console.error('Failed to save config overrides:', e)
  }
}

export function resetUserConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    applyConfigToDOM(appConfig)
  } catch (e) {
    console.error('Failed to reset config overrides:', e)
  }
}

if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    window.matchMedia('(max-width: 768px)').addEventListener('change', () => {
      applyConfigToDOM()
    })
  } catch {}
}
