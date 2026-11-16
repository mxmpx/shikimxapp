import React, { useState, useEffect } from 'react'
import {
  CatalogItem,
  UserProfile,
  ContinueWatchingItem,
  OnScreenItem,
  AnimeUpdateItem,
  NewsTopic,
  FeedTopic,
} from '../types/anime'
import {
  fetchExplore,
  fetchCatalog,
  fetchRandomAnime,
  fetchContinueWatching,
  deleteContinueWatching,
} from '../api/client'
import { ContinueWatchingBanner } from '../components/explore/ContinueWatchingBanner'
import { SeasonalHeroBanner } from '../components/explore/SeasonalHeroBanner'
import { NewsAndTopicsRow } from '../components/explore/NewsAndTopicsRow'
import { OngoingSection } from '../components/explore/OngoingSection'
import { CatalogFilterBar } from '../components/explore/CatalogFilterBar'
import { CatalogGrid } from '../components/explore/CatalogGrid'
import { ProfileSummarySection } from '../components/explore/ProfileSummarySection'

interface ExploreViewProps {
  onOpenAnime: (id: number) => void
  userProfile?: UserProfile | null
  onNavigateTab?: (tab: string) => void
}

export function ExploreView({
  onOpenAnime,
  userProfile,
  onNavigateTab,
}: ExploreViewProps) {
  // Explore tab data
  const [onScreens, setOnScreens] = useState<OnScreenItem[]>([])
  const [updates, setUpdates] = useState<AnimeUpdateItem[]>([])
  const [communityContent, setCommunityContent] = useState<FeedTopic[]>([])
  const [hotTopics, setHotTopics] = useState<FeedTopic[]>([])
  const [news, setNews] = useState<NewsTopic[]>([])
  const [continueList, setContinueList] = useState<ContinueWatchingItem[]>([])
  const [loadingExplore, setLoadingExplore] = useState(true)

  // Inline catalog with 6 filters
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [genre, setGenre] = useState('')
  const [season, setSeason] = useState('')
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const [score, setScore] = useState('')
  const [order, setOrder] = useState('popularity')

  // Load explore & continue watching
  useEffect(() => {
    Promise.all([fetchExplore(), fetchContinueWatching()])
      .then(([exp, cont]) => {
        setOnScreens(exp.on_screens)
        setUpdates(exp.anime_updates)
        setCommunityContent(exp.content)
        setHotTopics(exp.hot)
        setNews([...exp.latest, ...exp.other])
        setContinueList(Array.isArray(cont) ? cont : [])
      })
      .finally(() => setLoadingExplore(false))
  }, [])

  // Load inline catalog
  const loadCatalog = async (page = 1, append = false) => {
    setCatalogLoading(true)
    try {
      const items = await fetchCatalog(
        page,
        genre,
        season,
        kind,
        status,
        score,
        order
      )
      if (append) {
        setCatalogItems((prev) => [...prev, ...items])
      } else {
        setCatalogItems(items)
      }
      setCatalogPage(page)
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    loadCatalog(1, false)
  }, [genre, season, kind, status, score, order])

  // Random anime button
  const handleRandomAnime = async () => {
    const item = await fetchRandomAnime()
    if (item && item.id) {
      onOpenAnime(item.id)
    }
  }

  const handleDeleteContinue = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteContinueWatching(id)
    setContinueList((prev) => prev.filter((item) => item.id !== id))
  }

  const featuredAnime = onScreens[0] || {
    id: 55701,
    russian: 'Реинкарнация бездельника 2',
    name: 'Mushoku Tensei II',
  }

  return (
    <div className="page-container">
      {/* 1. Continue Watching Banner */}
      <ContinueWatchingBanner
        continueList={continueList}
        onOpenAnime={onOpenAnime}
        onDeleteContinue={handleDeleteContinue}
      />

      {/* 2. Seasonal Hero Banner */}
      <SeasonalHeroBanner
        featuredAnime={featuredAnime}
        onOpenAnime={onOpenAnime}
        onRandomAnime={handleRandomAnime}
      />

      {/* 3. News & Hot Topics Row */}
      <NewsAndTopicsRow
        news={news}
        hotTopics={hotTopics}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. On-screens / seasonal ongoings & community content */}
      <OngoingSection
        loadingExplore={loadingExplore}
        onScreens={onScreens}
        updates={updates}
        communityContent={communityContent}
        onOpenAnime={onOpenAnime}
        onNavigateTab={onNavigateTab}
      />

      {/* 5. Complete Anime Catalog with Filters */}
      <section style={{ marginBottom: 40 }}>
        <CatalogFilterBar
          genre={genre}
          setGenre={setGenre}
          season={season}
          setSeason={setSeason}
          kind={kind}
          setKind={setKind}
          status={status}
          setStatus={setStatus}
          score={score}
          setScore={setScore}
          order={order}
          setOrder={setOrder}
          onRandomAnime={handleRandomAnime}
        />

        <CatalogGrid
          catalogLoading={catalogLoading}
          catalogItems={catalogItems}
          catalogPage={catalogPage}
          onLoadMore={() => loadCatalog(catalogPage + 1, true)}
          onOpenAnime={onOpenAnime}
        />
      </section>

      {/* 6. User Profile Card Section (if logged in) */}
      <ProfileSummarySection
        userProfile={userProfile}
        onNavigateTab={onNavigateTab}
      />
    </div>
  )
}
