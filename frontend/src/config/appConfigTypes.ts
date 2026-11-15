/**
 * Universal configuration interfaces for Shiki MX App
 */

export interface ThemePreset {
  id: string
  name: string
  accent: string
  rgb: string
  glow: string
  previewColor: string
  bgDarkHex?: string
}

export interface AppConfig {
  brand: {
    name: string
    suffix: string
    version: string
    buildDate: string
    tagline: string
    logoIcon: string
    logoGradient: string
    logoSize: number
    maxPageWidth: number
    contentPaddingX: number
    contentPaddingY: number
  }

  theme: {
    defaultTheme: 'dark' | 'light'
    defaultPreset: string
    allowThemeToggle: boolean
    presets: ThemePreset[]
    darkTokens: {
      bgMain: string
      bgSecondary: string
      cardBg: string
      textMain: string
      textMuted: string
      borderColor: string
      glassBlur: number
    }
    lightTokens: {
      bgMain: string
      bgSecondary: string
      cardBg: string
      textMain: string
      textMuted: string
      borderColor: string
      glassBlur: number
    }
  }

  backgroundCustomization: {
    allowCustomBg: boolean
    defaultBgMode: 'color' | 'image'
    defaultBgColor: string
    defaultBgImageUrl: string
    navbarViewModes: { id: 'full' | 'icons' | 'titles'; label: string }[]
    defaultNavbarView: 'full' | 'icons' | 'titles'
  }

  dimensions: {
    headerHeight: number
    headerPaddingX: number
    headerBlur: number
    headerZIndex: number

    searchWidth: number
    searchFocusWidth: number
    searchHeight: number
    searchRadius: number
    searchPaddingLeft: number
    searchPaddingRight: number
    searchGap: number
    searchIconSize: number
    searchKbdWidth: number
    searchKbdHeight: number
    searchKbdRadius: number
    searchKbdFontSize: number

    cardMinWidth: number
    cardGap: number
    cardRadius: number
    cardPosterRatio: string
    cardHoverLift: number
    cardHoverScale: number
    cardHoverShadowBlur: number
    cardPosterHoverZoom: number
    cardTitleLines: number
    cardTitleFontSize: number
    cardMetaFontSize: number
    scoreBadgeRadius: number
    scoreBadgeFontSize: number
    kindBadgeRadius: number
    kindBadgeFontSize: number

    modalRadius: number
    modalBackdropBlur: number
    modalHeaderHeight: number
    modalPadding: number
    modalMaxWidth: number
    modalMaxHeightVw: number

    inputHeight: number
    inputRadius: number
    inputPaddingX: number
    inputFontSize: number
    selectHeight: number
    selectRadius: number
    selectMaxHeight: number
    selectMinWidth: number
    buttonRadius: number
    buttonPaddingX: number
    buttonPaddingY: number
    buttonFontSize: number

    glassBlur: number
    glowRadius: number
    glowOpacity: number
    shadowElevation: number

    scrollbarWidth: number
    scrollbarThumbRadius: number
    scrollbarThumbHoverExpand: number
  }

  typography: {
    fontFamily: string
    monoFontFamily: string
    titleHero: number
    titleLarge: number
    titleMedium: number
    titleSmall: number
    bodyText: number
    bodySmall: number
    captionText: number
    badgeText: number
    lineHeightHeading: number
    lineHeightBody: number
  }

  animations: {
    durationInstantMs: number
    durationFastMs: number
    durationNormalMs: number
    durationSlowMs: number
    easingDefault: string
    easingSpring: string
    enablePageTransitions: boolean
    enableHoverScale: boolean
  }

  cursor: {
    enabled: boolean
    freeSize: number
    freeBorderWidth: number
    freeGlowBlur: number
    morphPaddingSmall: number
    morphPaddingNormal: number
    morphClickScale: number
    morphGlowBlur: number
    morphTransitionMs: number
    maxTargetWidth: number
    maxTargetHeight: number
    hideOnMobile: boolean
    hideOnIframe: boolean
  }

  search: {
    placeholder: string
    hotkey: string
    hotkeyLabel: string
    debounceMs: number
    minQueryLength: number
    dropdownLimit: number
    dropdownMaxHeight: number
    clearButton: boolean
    showHotkeyBadge: boolean
    showScoreInDropdown: boolean
    showKindInDropdown: boolean
  }

  explore: {
    continueWatching: {
      enabled: boolean
      title: string
      cardMinWidth: number
      posterWidth: number
      posterHeight: number
      maxItems: number
      showProgress: boolean
      showEpisodeBadge: boolean
    }
    heroBanner: {
      enabled: boolean
      badgeText: string
      title: string
      description: string
      primaryButtonText: string
      primaryButtonAnimeId: number
      luckyButtonText: string
      paddingY: number
      paddingX: number
      bannerRadius: number
      bannerMinHeight: number
    }
    newsBlock: {
      enabled: boolean
      title: string
      icon: string
      limit: number
      viewAllText: string
    }
    hotTopicsBlock: {
      enabled: boolean
      title: string
      icon: string
      limit: number
      viewAllText: string
    }
    ongoings: {
      enabled: boolean
      title: string
      limit: number
      indicatorColor: string
      viewScheduleText: string
    }
    catalog: {
      enabled: boolean
      title: string
      itemsPerPage: number
      luckyButton: boolean
      luckyButtonText: string
      loadMoreButtonText: string
    }
    profileSummary: {
      enabled: boolean
      title: string
      statsTitle: string
    }
  }

  catalogAnime: {
    title: string
    subtitle: string
    itemsPerPage: number
    defaultSort: string
    defaultType: string
    defaultStatus: string
    defaultSeason: string
    defaultRating: string
    types: { id: string; label: string }[]
    statuses: { id: string; label: string }[]
    sortOrders: { id: string; label: string }[]
    ratings: { id: string; label: string }[]
    genres: { id: number; name: string; russian: string }[]
  }

  catalogManga: {
    title: string
    subtitle: string
    itemsPerPage: number
    defaultSort: string
    defaultType: string
    defaultStatus: string
    types: { id: string; label: string }[]
    statuses: { id: string; label: string }[]
  }

  catalogRanobe: {
    title: string
    subtitle: string
    itemsPerPage: number
    defaultSort: string
    defaultType: string
    types: { id: string; label: string }[]
  }

  top100: {
    title: string
    subtitle: string
    totalLimit: number
    perPage: number
    showRankBadge: boolean
    badgeGradients: {
      first: string
      second: string
      third: string
      other: string
    }
    tabs: { id: string; label: string }[]
  }

  calendar: {
    title: string
    subtitle: string
    todayHighlightColor: string
    nextEpisodeBadgeBg: string
    nextEpisodeBadgeColor: string
    timeFormat: '24h' | '12h'
    showAiredBadge: boolean
    days: { id: string; name: string; shortName: string }[]
  }

  rates: {
    defaultType: 'Anime' | 'Manga'
    stepIncrement: number
    allowQuickScore: boolean
    animeStatuses: {
      id: string
      label: string
      color: string
      icon: string
    }[]
    mangaStatuses: {
      id: string
      label: string
      color: string
      icon: string
    }[]
    emptyMessages: Record<string, string>
  }

  recommendations: {
    title: string
    subtitle: string
    limit: number
    minScore: number
    showReasonBadge: boolean
    emptyText: string
  }

  favourites: {
    title: string
    perPage: number
    emptyText: string
    tabs: { id: string; label: string; icon: string }[]
  }

  history: {
    title: string
    subtitle: string
    maxItemsSaved: number
    showClearButton: boolean
    clearConfirmationText: string
    emptyText: string
  }

  friends: {
    title: string
    perPage: number
    onlineIndicatorColor: string
    emptyText: string
    tabs: { id: string; label: string }[]
  }

  users: {
    title: string
    subtitle: string
    perPage: number
    searchPlaceholder: string
    emptyText: string
  }

  forum: {
    title: string
    perPage: number
    hotRepliesThreshold: number
    hotViewsThreshold: number
    categories: { id: string; label: string; icon: string }[]
  }

  clubs: {
    title: string
    perPage: number
    sortOptions: { id: string; label: string }[]
  }

  collections: {
    title: string
    subtitle: string
    perPage: number
  }

  critiques: {
    title: string
    subtitle: string
    perPage: number
  }

  articles: {
    title: string
    perPage: number
  }

  animeModal: {
    defaultPlayer: 'kodik' | 'anicli'
    playerHeight: number
    theaterPlayerHeight: number
    autoplay: boolean
    skipOpeningSeconds: number
    ratingScale: number
    starSize: number
    starHoverScale: number
    starActiveColor: string
    screenshotsLimit: number
    charactersLimit: number
    relatedLimit: number
    collapsedSynopsisHeight: number
    showTrailer: boolean
    showPlayer: boolean
    showChronology: boolean
    showRelated: boolean
    showScreenshots: boolean
    showCharacters: boolean
    showSimilar: boolean
    showRatesButtons: boolean
    defaultVoiceoverLanguage: string
    streamingSources: string[]
    sidebarWidth: number
    containerMaxWidth: number
    externalRatings: {
      kinopoisk: { label: string; bg: string; color: string; border: string }
      mal: { label: string; bg: string; color: string; border: string }
      shikimori: { label: string; bg: string; color: string }
      worldArt?: { label: string; bg: string; color: string }
    }
  }

  statsModal: {
    title: string
    showScoreChart: boolean
    showGenreChart: boolean
    showActivityChart: boolean
    chartBarHeight: number
    daysTimeMultiplier: number
  }

  settingsModal: {
    title: string
    showThemeSection: boolean
    showPlayerSection: boolean
    showInterfaceSection: boolean
    showSystemSection: boolean
    fontScaleMin: number
    fontScaleMax: number
    fontScaleStep: number
    fontScaleDefault: number
  }

  aboutModal: {
    appName: string
    version: string
    releaseDate: string
    tagline: string
    developer: string
    githubUrl: string
    shikimoriUrl: string
    telegramUrl: string
    features: string[]
    techStack: string[]
  }

  tabs: Record<
    string,
    {
      id: string
      label: string
      icon: string
      group: 'database' | 'community' | 'misc'
      enabled: boolean
      order: number
    }
  >

  api: {
    shikimoriApiBase: string
    localApiBase: string
    requestTimeoutMs: number
    retryCount: number
    defaultPosterPlaceholder: string
    defaultAvatarPlaceholder: string
  }

  commonTexts: {
    loadMore: string
    loading: string
    error: string
    retry: string
    empty: string
    close: string
    cancel: string
    save: string
    delete: string
    lucky: string
    back: string
    search: string
    viewOnline: string
    expandText: string
    collapseText: string
    myList: string
    saveChanges: string
    savedSuccess: string
    logout: string
    login: string
  }
}
