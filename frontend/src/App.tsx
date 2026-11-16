import React, { useState, useEffect, Suspense, lazy } from 'react'
import { AppHeader, TabKey } from './components/AppHeader'
import { BottomNav } from './components/navigation/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UserProfile } from './types/anime'
import { fetchUserProfile } from './api/client'

// Code splitting: Lazy load views and heavy modals for minimal initial bundle
const ExploreView = lazy(() =>
  import('./views/ExploreView').then((m) => ({ default: m.ExploreView }))
)
const CatalogView = lazy(() =>
  import('./views/CatalogView').then((m) => ({ default: m.CatalogView }))
)
const Top100View = lazy(() =>
  import('./views/Top100View').then((m) => ({ default: m.Top100View }))
)
const MangaView = lazy(() =>
  import('./views/MangaView').then((m) => ({ default: m.MangaView }))
)
const RanobeView = lazy(() =>
  import('./views/RanobeView').then((m) => ({ default: m.RanobeView }))
)
const ForumView = lazy(() =>
  import('./views/ForumView').then((m) => ({ default: m.ForumView }))
)
const ClubsView = lazy(() =>
  import('./views/ClubsView').then((m) => ({ default: m.ClubsView }))
)
const CollectionsView = lazy(() =>
  import('./views/CollectionsView').then((m) => ({ default: m.CollectionsView }))
)
const CritiquesView = lazy(() =>
  import('./views/CritiquesView').then((m) => ({ default: m.CritiquesView }))
)
const ArticlesView = lazy(() =>
  import('./views/ArticlesView').then((m) => ({ default: m.ArticlesView }))
)
const UsersView = lazy(() =>
  import('./views/UsersView').then((m) => ({ default: m.UsersView }))
)
const RecommendationsView = lazy(() =>
  import('./views/RecommendationsView').then((m) => ({
    default: m.RecommendationsView,
  }))
)
const CalendarView = lazy(() =>
  import('./views/CalendarView').then((m) => ({ default: m.CalendarView }))
)
const RatesView = lazy(() =>
  import('./views/RatesView').then((m) => ({ default: m.RatesView }))
)
const FavouritesView = lazy(() =>
  import('./views/FavouritesView').then((m) => ({ default: m.FavouritesView }))
)
const FriendsView = lazy(() =>
  import('./views/FriendsView').then((m) => ({ default: m.FriendsView }))
)
const HistoryView = lazy(() =>
  import('./views/HistoryView').then((m) => ({ default: m.HistoryView }))
)

const AnimeModal = lazy(() =>
  import('./components/AnimeModal').then((m) => ({ default: m.AnimeModal }))
)
const MangaModal = lazy(() =>
  import('./components/MangaModal').then((m) => ({ default: m.MangaModal }))
)
const StatsModal = lazy(() =>
  import('./components/StatsModal').then((m) => ({ default: m.StatsModal }))
)
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
)
const AboutModal = lazy(() =>
  import('./components/AboutModal').then((m) => ({ default: m.AboutModal }))
)

function ViewSkeleton() {
  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '60px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(var(--accent-rgb), 0.2)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 16,
        }}
      />
      <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 500 }}>
        Загрузка раздела...
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem('shikimx_theme') || 'dark'
  )
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [ratesTargetType, setRatesTargetType] = useState<'Anime' | 'Manga'>(
    'Anime'
  )

  // Modals state
  const [modalAnimeId, setModalAnimeId] = useState<number | null>(null)
  const [modalMangaId, setModalMangaId] = useState<number | null>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'color-scheme'
      document.head.appendChild(meta)
    }
    meta.content = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'dark light'
    localStorage.setItem('shikimx_theme', theme)
  }, [theme])

  useEffect(() => {
    fetchUserProfile().then(setUserProfile)
  }, [])

  // Listen to browser URL for deep linking
  useEffect(() => {
    const syncFromLocation = () => {
      const animeMatch = window.location.pathname.match(/\/animes\/(\d+)/)
      const mangaMatch = window.location.pathname.match(/\/mangas\/(\d+)/)
      const rawHash = window.location.hash.replace('#', '')

      if (animeMatch && animeMatch[1]) {
        setModalMangaId(null)
        setModalAnimeId(Number(animeMatch[1]))
      } else if (mangaMatch && mangaMatch[1]) {
        setModalAnimeId(null)
        setModalMangaId(Number(mangaMatch[1]))
      } else {
        setModalAnimeId(null)
        setModalMangaId(null)
      }

      if (rawHash) {
        setActiveTab(rawHash as TabKey)
      }
    }

    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)
    return () => window.removeEventListener('popstate', syncFromLocation)
  }, [])

  const handleOpenAnime = (id: number) => {
    setModalMangaId(null)
    setModalAnimeId(id)
    window.history.pushState({ modal: 'anime', id }, '', `/animes/${id}`)
  }

  const handleCloseAnime = () => {
    setModalAnimeId(null)
    if (window.location.pathname !== '/') {
      const targetUrl = activeTab === 'profile' ? '/' : `/#${activeTab}`
      window.history.pushState(null, '', targetUrl)
    }
  }

  const handleOpenManga = (id: number) => {
    setModalAnimeId(null)
    setModalMangaId(id)
    window.history.pushState({ modal: 'manga', id }, '', `/mangas/${id}`)
  }

  const handleCloseManga = () => {
    setModalMangaId(null)
    if (window.location.pathname !== '/') {
      const targetUrl = activeTab === 'profile' ? '/' : `/#${activeTab}`
      window.history.pushState(null, '', targetUrl)
    }
  }

  const isAnyModalOpen =
    modalAnimeId !== null ||
    modalMangaId !== null ||
    showStatsModal ||
    showSettingsModal ||
    showAboutModal

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open', 'has-modal')
      document.documentElement.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open', 'has-modal')
      document.documentElement.classList.remove('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open', 'has-modal')
      document.documentElement.classList.remove('modal-open')
    }
  }, [isAnyModalOpen])

  const handleTabChange = (tab: TabKey) => {
    if (modalAnimeId !== null) handleCloseAnime()
    if (modalMangaId !== null) handleCloseManga()
    setActiveTab(tab)
    const currentHash = window.location.hash.replace('#', '')
    if (currentHash !== tab) {
      window.history.pushState(
        { tab },
        '',
        tab === 'profile' ? '/' : `/#${tab}`
      )
    }
  }

  const handleOpenRatesWithType = (type: 'Anime' | 'Manga') => {
    if (modalAnimeId !== null) handleCloseAnime()
    if (modalMangaId !== null) handleCloseManga()
    setRatesTargetType(type)
    setActiveTab('rates')
    window.history.pushState({ tab: 'rates' }, '', '/#rates')
  }

  // Global scroll reveal observer across all views
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.01,
        rootMargin: '50px 0px 50px 0px',
      }
    )

    const observeAll = () => {
      const targets = document.querySelectorAll(
        '.reveal-on-scroll:not(.is-revealed), .reveal-item:not(.is-revealed), .reveal-pop:not(.is-revealed), .reveal-slide-left:not(.is-revealed), .reveal-slide-right:not(.is-revealed), .reveal-bar:not(.is-revealed)'
      )
      targets.forEach((el) => observer.observe(el))
    }

    observeAll()

    const mutationObserver = new MutationObserver(() => {
      observeAll()
    })

    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [activeTab, modalAnimeId])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Global Header */}
      <AppHeader
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        setTheme={setTheme}
        userProfile={userProfile}
        onOpenAnime={handleOpenAnime}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAbout={() => setShowAboutModal(true)}
        onOpenRatesWithType={handleOpenRatesWithType}
      />

      {/* Main View Router for All Tabs with Suspense code splitting */}
      <main className="main-content-wrapper" style={{ flex: 1, paddingTop: 'var(--header-height, 56px)' }}>
        <ErrorBoundary key={activeTab}>
          <Suspense fallback={<ViewSkeleton />}>
            {/* 1. Главная / Explore */}
            {activeTab === 'profile' && (
              <ExploreView
                onOpenAnime={handleOpenAnime}
                userProfile={userProfile}
                onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
              />
            )}

            {/* 2. БАЗА ДАННЫХ */}
            {activeTab === 'catalog-anime' && (
              <CatalogView onOpenAnime={handleOpenAnime} />
            )}
            {activeTab === 'top100' && (
              <Top100View
                onOpenAnime={handleOpenAnime}
                onOpenManga={handleOpenManga}
              />
            )}
            {activeTab === 'catalog-manga' && (
              <MangaView onOpenManga={handleOpenManga} />
            )}
            {activeTab === 'catalog-ranobe' && (
              <RanobeView onOpenManga={handleOpenManga} />
            )}

            {/* 3. СООБЩЕСТВО */}
            {activeTab === 'forum' && <ForumView />}
            {activeTab === 'clubs' && <ClubsView />}
            {activeTab === 'collections' && <CollectionsView />}
            {activeTab === 'critiques' && (
              <CritiquesView
                onOpenAnime={handleOpenAnime}
                onOpenManga={handleOpenManga}
              />
            )}
            {activeTab === 'articles' && <ArticlesView />}
            {activeTab === 'users' && <UsersView />}

            {/* 4. РАЗНОЕ */}
            {activeTab === 'recommendations' && (
              <RecommendationsView onOpenAnime={handleOpenAnime} />
            )}
            {activeTab === 'calendar' && (
              <CalendarView onOpenAnime={handleOpenAnime} />
            )}

            {/* 5. ПОЛЬЗОВАТЕЛЬ */}
            {activeTab === 'rates' && (
              <RatesView
                onOpenAnime={handleOpenAnime}
                onOpenManga={handleOpenManga}
                initialTargetType={ratesTargetType}
              />
            )}
            {activeTab === 'favourites' && (
              <FavouritesView
                onOpenAnime={handleOpenAnime}
                onOpenManga={handleOpenManga}
              />
            )}
            {activeTab === 'friends' && <FriendsView />}
            {activeTab === 'history' && (
              <HistoryView onOpenAnime={handleOpenAnime} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Modals with Suspense fallback */}
      <Suspense fallback={null}>
        {/* Anime Modal (mxstyle2) */}
        {modalAnimeId !== null && (
          <ErrorBoundary>
            <AnimeModal animeId={modalAnimeId} onClose={handleCloseAnime} />
          </ErrorBoundary>
        )}

        {/* Manga / Ranobe Modal */}
        {modalMangaId !== null && (
          <ErrorBoundary>
            <MangaModal
              mangaId={modalMangaId}
              onClose={handleCloseManga}
              onOpenAnime={handleOpenAnime}
            />
          </ErrorBoundary>
        )}

        {/* Stats Modal */}
        {showStatsModal && (
          <StatsModal
            userProfile={userProfile}
            onClose={() => setShowStatsModal(false)}
          />
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <SettingsModal
            theme={theme}
            setTheme={setTheme}
            onClose={() => setShowSettingsModal(false)}
            onOpenAbout={() => {
              setShowSettingsModal(false)
              setShowAboutModal(true)
            }}
          />
        )}

        {/* About Modal */}
        {showAboutModal && (
          <AboutModal onClose={() => setShowAboutModal(false)} />
        )}
      </Suspense>

      {/* Mobile Bottom Navigation (shown on <= 768px) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAbout={() => setShowAboutModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
      />
    </div>
  )
}
