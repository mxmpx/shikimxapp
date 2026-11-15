import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimeDetail,
  AnimeCommunityData,
  AnicliStreamData,
} from '../types/anime'
import {
  fetchAnimeDetails,
  fetchAnimeCommunity,
  fetchAnimeStreams,
  updateUserRate,
  saveContinueWatching,
} from '../api/client'
import { MxSelectOption, MxSelectGroup } from './MxSelect'
import {
  ShikimoriIcon,
  WorldArtIcon,
  KinopoiskIcon,
  MalIcon,
  StarIcon,
  Pill,
  ExternalSiteIcon,
  MOCK_COLLECTIONS,
} from './AnimeModalIcons'
import { AnimeCommunitySection } from './anime_modal/AnimeCommunitySection'
import { AnimeListTracker } from './anime_modal/AnimeListTracker'
import { AnimePlayer } from './anime_modal/AnimePlayer'
import { AnimeInfoDetails } from './anime_modal/AnimeInfoDetails'
import { AnimeCharacters } from './anime_modal/AnimeCharacters'
import { AnimeScreenshotsGallery } from './anime_modal/AnimeScreenshotsGallery'
import { AnimeRelatedTimeline } from './anime_modal/AnimeRelatedTimeline'

interface AnimeModalProps {
  animeId: number
  onClose: () => void
}

export function AnimeModal({ animeId, onClose }: AnimeModalProps) {
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [community, setCommunity] = useState<AnimeCommunityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Player state
  const [playerOpen, setPlayerOpen] = useState(true)
  const [activePlayerType, setActivePlayerType] = useState<'anicli' | 'kodik'>('anicli')
  const [streamData, setStreamData] = useState<AnicliStreamData | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [selectedDub, setSelectedDub] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [miniPlayerActive, setMiniPlayerActive] = useState(false)

  // User Rate state
  const [userStatus, setUserStatus] = useState('planned')
  const [userEpisode, setUserEpisode] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [userNote, setUserNote] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  // UI state
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [showAllCollections, setShowAllCollections] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const topVignetteRef = useRef<HTMLDivElement>(null)
  const bottomVignetteRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const activeThumbRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (lightbox !== null && activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [lightbox])

  // Vignette scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isTop = el.scrollTop > 8
    const canBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 14

    if (topVignetteRef.current) {
      topVignetteRef.current.style.opacity = isTop ? '1' : '0'
    }
    if (bottomVignetteRef.current) {
      bottomVignetteRef.current.style.opacity = canBottom ? '1' : '0'
    }
  }

  // Keyboard navigation (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox !== null) {
          setLightbox(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox, onClose])

  // Load Anime Data
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    fetchAnimeDetails(animeId)
      .then((data) => {
        if (!isMounted) return
        setAnime(data)
        if (data.user_rate) {
          setUserStatus(data.user_rate.status || 'planned')
          setUserEpisode(data.user_rate.episodes || 0)
          setUserRating(data.user_rate.score || 0)
          setUserNote(data.user_rate.text || '')
          setSelectedEpisode(Math.max(1, data.user_rate.episodes || 1))
        }
        setLoading(false)

        // Load community members & real Shikimori avatars
        fetchAnimeCommunity(animeId)
          .then((cData) => {
            if (!isMounted) return
            setCommunity(cData)
          })
          .catch(() => {})

        // Load stream sources for this anime
        setLoadingStream(true)
        fetchAnimeStreams(animeId, data.russian || data.name)
          .then((sData) => {
            if (!isMounted) return
            setStreamData(sData)
            const availableEpKeys = sData.episodes
              ? Object.keys(sData.episodes)
              : []
            const userEpKey = String(
              data.user_rate?.episodes
                ? Math.max(1, data.user_rate.episodes)
                : 1
            )
            let targetEpKey = userEpKey
            if (
              !sData.episodes?.[targetEpKey] &&
              !sData.episodes?.['1'] &&
              availableEpKeys.length > 0
            ) {
              const sortedKeys = availableEpKeys
                .map(Number)
                .filter((n) => !isNaN(n))
                .sort((a, b) => a - b)
              targetEpKey = String(sortedKeys[0] ?? availableEpKeys[0])
              setSelectedEpisode(Number(targetEpKey))
            }
            const epDubs =
              sData.episodes?.[targetEpKey] ||
              sData.episodes?.['1'] ||
              (availableEpKeys.length > 0
                ? sData.episodes?.[availableEpKeys[0]]
                : undefined)
            if (epDubs) {
              const dubNames = Object.keys(epDubs)
              if (dubNames.length > 0) {
                const firstDub = dubNames[0]
                setSelectedDub(firstDub)
                const sources = epDubs[firstDub] || []
                if (sources.length > 0) {
                  setSelectedSource(sources[0].player)
                }
              }
            }
          })
          .catch((err) =>
            console.log('Стримы не найдены или загружаются:', err)
          )
          .finally(() => {
            if (isMounted) setLoadingStream(false)
          })
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [animeId])

  // Auto-sync selected episode, dub, and player source when streamData updates
  useEffect(() => {
    if (!streamData?.episodes) return
    const epKeys = Object.keys(streamData.episodes)
    if (epKeys.length === 0) return

    const currentKey = String(selectedEpisode)
    if (!streamData.episodes[currentKey]) {
      const sortedKeys = epKeys
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b)
      const fallbackEp = sortedKeys[0] ?? Number(epKeys[0])
      if (fallbackEp && fallbackEp !== selectedEpisode) {
        setSelectedEpisode(fallbackEp)
      }
    } else {
      const epDubs = streamData.episodes[currentKey]
      const dubNames = Object.keys(epDubs)
      if (dubNames.length > 0) {
        if (!selectedDub || !epDubs[selectedDub]) {
          const firstDub = dubNames[0]
          setSelectedDub(firstDub)
          const sources = epDubs[firstDub] || []
          if (sources.length > 0) {
            setSelectedSource(sources[0].player)
          }
        } else {
          const sources = epDubs[selectedDub] || []
          if (
            sources.length > 0 &&
            (!selectedSource ||
              !sources.some((s) => s.player === selectedSource))
          ) {
            setSelectedSource(sources[0].player)
          }
        }
      }
    }
  }, [streamData, selectedEpisode, selectedDub, selectedSource])

  // Scroll reveal observer
  useEffect(() => {
    if (loading || !anime) return
    const scrollContainer = scrollRef.current
    const targets = scrollContainer?.querySelectorAll(
      '.reveal-on-scroll, .reveal-item, .reveal-pop, .reveal-slide-left, .reveal-bar'
    )
    if (!targets) return

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
        root: scrollContainer,
        threshold: 0.02,
      }
    )

    const timer = setTimeout(() => {
      targets.forEach((el) => {
        if (!el.classList.contains('is-revealed')) {
          observer.observe(el)
        }
      })
    }, 40)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [loading, anime, playerOpen])

  // Save / Delete User Rate Handlers
  const handleSaveRate = async () => {
    try {
      const ok = await updateUserRate(
        animeId,
        userStatus,
        userEpisode,
        userRating,
        userNote,
        'Anime'
      )
      if (ok) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Ошибка сохранения:', err)
    }
  }

  const handleDeleteRate = async () => {
    try {
      setUserStatus('planned')
      setUserEpisode(0)
      setUserRating(0)
      setUserNote('')
      await updateUserRate(animeId, 'planned', 0, 0, '', 'Anime')
    } catch (err) {
      console.error('Ошибка сброса:', err)
    }
  }

  // Persist "continue watching" progress
  useEffect(() => {
    if (!anime || !isPlaying) return
    const payload = {
      id: anime.id,
      title: anime.russian || anime.name,
      image: anime.image,
      episode: selectedEpisode,
      total_episodes: anime.episodes || 0,
      translation: selectedDub || selectedSource || '',
      updated_at: new Date().toISOString(),
    }
    saveContinueWatching(payload).catch(() => {})
  }, [anime, isPlaying, selectedEpisode, selectedDub, selectedSource])

  if (loading) {
    return (
      <div
        className="modal-shell"
        style={{
          position: 'fixed',
          top: 'var(--header-height, 56px)',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100vh - var(--header-height, 56px))',
          zIndex: 90,
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '3px solid rgba(var(--accent-rgb), 0.2)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Загрузка информации об аниме...
          </span>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div
        className="modal-shell"
        style={{
          position: 'fixed',
          top: 'var(--header-height, 56px)',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100vh - var(--header-height, 56px))',
          zIndex: 90,
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <i
            className="ti ti-alert-triangle"
            style={{ fontSize: 48, color: '#ef4444', marginBottom: 12 }}
          />
          <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>
            Не удалось загрузить аниме
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error || 'Аниме не найдено'}
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--accent-btn-bg)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Вернуться назад
          </button>
        </div>
      </div>
    )
  }

  // Derive title presentation
  const title = anime.russian || anime.name
  const origTitle = (() => {
    const rawJa = Array.isArray(anime.japanese)
      ? anime.japanese.filter(Boolean).join(' • ')
      : typeof anime.japanese === 'string' && anime.japanese.trim()
        ? anime.japanese.trim()
        : ''
    const rawEn = Array.isArray(anime.english)
      ? anime.english.filter(Boolean).join(' • ')
      : typeof anime.english === 'string' && anime.english.trim()
        ? anime.english.trim()
        : ''
    const parts = [rawJa, rawEn || anime.name].filter(Boolean)
    return parts.length > 0 ? parts.join(' • ') : anime.name
  })()

  const totalEpisodes =
    anime.episodes || anime.episodes_aired || streamData?.total_episodes || 12

  // Multi-aggregator player options
  const episodeOptions: MxSelectOption[] = Array.from(
    { length: totalEpisodes },
    (_, i) => i + 1
  ).map((ep) => {
    const epStr = String(ep)
    const hasStream = Boolean(streamData?.episodes?.[epStr])
    return {
      value: ep,
      label: `Серия ${ep}`,
      sublabel:
        ep === userEpisode
          ? 'Текущая по списку'
          : hasStream
            ? 'Доступна для просмотра'
            : undefined,
      badge:
        ep <= userEpisode
          ? '✓ Просмотрено'
          : hasStream
            ? '● Онлайн'
            : undefined,
      badgeColor: ep <= userEpisode ? ('green' as const) : ('accent' as const),
    }
  })

  const currentEpKey = String(selectedEpisode)
  const currentEpDubs =
    streamData?.episodes?.[currentEpKey] ||
    (streamData?.episodes && Object.keys(streamData.episodes).length > 0
      ? streamData.episodes[Object.keys(streamData.episodes)[0]] || {}
      : {})
  const dubList = Object.keys(currentEpDubs)

  const dubGroups: MxSelectGroup[] = [
    {
      label: 'Озвучка',
      options: (dubList.length > 0
        ? dubList
        : ['AniLibria', 'Studio Band', 'SHIZA Project', 'Dream Cast']
      ).map((d) => ({
        value: d,
        label: d,
        sublabel: currentEpDubs[d]
          ? `${currentEpDubs[d].length} источника`
          : 'HD качество',
        badge: d === 'AniLibria' ? 'Рекомендуем' : undefined,
        badgeColor: 'accent' as const,
      })),
    },
    {
      label: 'Субтитры',
      options: [
        {
          value: 'Субтитры (SR)',
          label: 'Субтитры (Sovet Romantica)',
          sublabel: 'Русские сабы',
        },
        {
          value: 'Субтитры (CR)',
          label: 'Субтитры (Crunchyroll)',
          sublabel: 'Официальные сабы',
        },
      ],
    },
  ]

  const currentSources =
    currentEpDubs[selectedDub] ||
    (dubList.length > 0 ? currentEpDubs[dubList[0]] : []) ||
    []
  const sourceOptions: MxSelectOption[] =
    currentSources.length > 0
      ? currentSources.map((s) => ({
          value: s.player,
          label: s.player,
          sublabel: s.quality || '1080p',
          badge: 'HD',
          badgeColor: 'accent' as const,
        }))
      : [
          {
            value: 'Kodik',
            label: 'Kodik',
            sublabel: 'Стабильный поток • 1080p',
            badge: 'HD',
            badgeColor: 'accent' as const,
          },
          {
            value: 'AniLibria (Direct)',
            label: 'AniLibria (Direct)',
            sublabel: 'Прямой видеосервер',
          },
          {
            value: 'AnimeGo CDN',
            label: 'AnimeGo CDN',
            sublabel: 'Зеркало плеера',
          },
        ]

  const handleDubChange = (newDub: string | number) => {
    const dubStr = String(newDub)
    setSelectedDub(dubStr)
    const sources = currentEpDubs[dubStr] || []
    if (sources.length > 0) {
      const hasSource = sources.some((s) => s.player === selectedSource)
      setSelectedSource(hasSource ? selectedSource : sources[0].player)
    }
  }

  const handleEpisodeChange = (newEp: string | number) => {
    const epNum = Number(newEp)
    setSelectedEpisode(epNum)
    setIsPlaying(true)
    if (streamData?.episodes) {
      const epDubs = streamData.episodes[String(epNum)]
      if (epDubs) {
        const dubNames = Object.keys(epDubs)
        if (dubNames.length > 0) {
          const targetDub = epDubs[selectedDub] ? selectedDub : dubNames[0]
          setSelectedDub(targetDub)
          const srcs = epDubs[targetDub] || []
          if (srcs.length > 0) {
            const hasSource = srcs.some((s) => s.player === selectedSource)
            setSelectedSource(hasSource ? selectedSource : srcs[0].player)
          }
        }
      }
    }
  }

  // Active stream iframe URL
  const activeStreamSource =
    currentSources.find((s) => s.player === selectedSource) || currentSources[0]

  const rawIframeSrc =
    activePlayerType === 'kodik'
      ? currentSources.find((s) => s.player === 'Kodik')?.url || currentSources[1]?.url || activeStreamSource?.url || ''
      : activeStreamSource?.url || ''

  // Normalization for AnimeGo CDN and embed players voice priority
  const iframeSrc = (() => {
    if (!rawIframeSrc) return ''
    if (rawIframeSrc.includes('cdn-iframe')) {
      let fixed = rawIframeSrc
        .replace(/\/AnilibriaTV\//gi, '/AniLibria/')
        .replace(/([?&]dubbing=)AnilibriaTV/gi, '$1AniLibria')
      if (selectedDub) {
        const dubParam = selectedDub.toLowerCase().includes('anilibria')
          ? 'AniLibria'
          : selectedDub
        fixed = fixed
          .replace(/\/cdn-iframe\/([^/]+)\/[^/]+\//, `/cdn-iframe/$1/${encodeURIComponent(dubParam)}/`)
          .replace(/([?&]dubbing=)[^&]+/, `$1${encodeURIComponent(dubParam)}`)
        if (!fixed.includes('dubbing=')) {
          fixed += (fixed.includes('?') ? '&' : '?') + `dubbing=${encodeURIComponent(dubParam)}`
        }
      }
      return fixed
    }
    return rawIframeSrc
  })()

  // Fullscreen Gallery for Lightbox
  const galleryItems = [
    {
      id: 'poster',
      type: 'poster' as const,
      title: 'Обложка тайтла',
      url: anime.image,
      thumb: anime.image,
    },
    ...(
      anime.screenshots || [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&h=675&fit=crop',
      ]
    ).map((url, idx) => ({
      id: `screenshot-${idx}`,
      type: 'screenshot' as const,
      title: `Кадр ${idx + 1}`,
      url,
      thumb: url,
    })),
  ]

  // External ratings values
  const shikiScore = anime.score ? Number(anime.score).toFixed(2) : '8.64'
  const kpScore = anime.score
    ? Math.max(6.5, Number(anime.score) - 0.26).toFixed(2)
    : '8.30'
  const malScore = anime.score
    ? Math.min(9.5, Number(anime.score) + 0.04).toFixed(2)
    : '8.66'
  const topRank = Math.max(1, Math.round(100 - Number(anime.score || 8) * 10))

  // Direct External Links
  const extLinks = anime.external_links || []
  const shikiUrl = (
    anime.shikimori_url || `https://shikimori.one/animes/${anime.id}`
  ).replace('shikimori.io', 'shikimori.one')
  const kpDirect = extLinks.find((l) => l.kind === 'kinopoisk')?.url
  const kpUrl =
    kpDirect ||
    `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(title)}`
  const malDirect = extLinks.find((l) => l.kind === 'myanimelist')?.url
  const malUrl = malDirect || `https://myanimelist.net/anime/${anime.id}`
  const waDirect = extLinks.find((l) => l.kind === 'world_art')?.url
  const waUrl =
    waDirect ||
    `https://yandex.ru/search/?text=${encodeURIComponent(`site:world-art.ru ${title}`)}`
  const crDirect = extLinks.find((l) => l.kind === 'crunchyroll')?.url
  const officialSite = extLinks.find((l) => l.kind === 'official_site')?.url
  const ruWiki = extLinks.find(
    (l) => l.kind === 'wikipedia' && l.url.includes('ru.wikipedia.org')
  )?.url
  const enWiki = extLinks.find(
    (l) => l.kind === 'wikipedia' && l.url.includes('en.wikipedia.org')
  )?.url
  const wikiUrl =
    ruWiki || enWiki || extLinks.find((l) => l.kind === 'wikipedia')?.url
  const aniDbDirect = extLinks.find((l) => l.kind === 'anime_db')?.url
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' трейлер')}`

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-modal-title"
      style={{
        position: 'fixed',
        top: 'var(--header-height, 56px)',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100vh - var(--header-height, 56px))',
        zIndex: 90,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(28px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Floating Close Button */}
      <button
        onClick={onClose}
        className="modal-close-floating"
        aria-label="Закрыть модальное окно аниме"
        title="Закрыть (Esc)"
        style={{
          position: 'absolute',
          top: 18,
          right: 28,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--subtle-bg)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'var(--subtle-hover-bg)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'var(--subtle-bg)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 18 }} />
      </button>

      {/* Top scroll vignette */}
      <div
        ref={topVignetteRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          background:
            'linear-gradient(to bottom, var(--modal-bg) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ════════════ UNIFIED SCROLL CONTAINER (FULL AREA) ════════════ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="modal-unified-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div className="modal-columns-layout">
          {/* ════════════ LEFT COLUMN (330px SIDEBAR) ════════════ */}
          <div
            className="modal-sidebar"
            style={{
              width: 'var(--anime-sidebar-width, 330px)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              className="sidebar-header-row"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Poster with Zoom Trigger */}
              <div
                className="sidebar-poster-box reveal-on-scroll stagger-1"
                onClick={() => setLightbox(0)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setLightbox(0)
                  }
                }}
                title="Нажмите, чтобы открыть обложку на весь экран"
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  overflow: 'hidden',
                  aspectRatio: '2/3',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                  cursor: 'zoom-in',
                }}
              >
                <img
                  className="sidebar-poster-img"
                  src={anime.image}
                  alt={title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  className="poster-zoom-btn"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 3,
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: 'rgba(10, 5, 20, 0.78)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <i
                    className="ti ti-arrows-maximize"
                    style={{ fontSize: 13, color: 'var(--accent)' }}
                  />
                  <span>На весь экран</span>
                </div>
                {/* Score badge at poster bottom */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    right: 10,
                    borderRadius: 12,
                    padding: '8px 12px',
                    background: 'rgba(10, 5, 20, 0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StarIcon filled={true} size={16} />
                    <span
                      style={{
                        color: '#ffd700',
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      {shikiScore}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                      / 10
                    </span>
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    Shikimori
                  </div>
                </div>
              </div>

              {/* External Scores Badges */}
              <div
                className="reveal-on-scroll stagger-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '2px 0',
                }}
              >
                {/* Shikimori Badge */}
                <div
                  className="reveal-pop stagger-1"
                  title={`Shikimori: ${shikiScore}`}
                  onClick={() => window.open(shikiUrl, '_blank')}
                  style={{
                    flex: 1.05,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '5px 6px',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#111827',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'translateY(-1px)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'none')
                  }
                >
                  <ShikimoriIcon size={16} color="#111827" />
                  <span>{shikiScore}</span>
                </div>

                {/* World Art Badge */}
                <div
                  className="reveal-pop stagger-2"
                  title="World Art"
                  onClick={() => waUrl && window.open(waUrl, '_blank')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#851414',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(133, 20, 20, 0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'translateY(-1px)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'none')
                  }
                >
                  <WorldArtIcon width={28} height={14} color="#ffffff" />
                </div>

                {/* КиноПоиск Badge */}
                <div
                  className="reveal-pop stagger-3"
                  title={`КиноПоиск: ${kpScore}`}
                  onClick={() => kpUrl && window.open(kpUrl, '_blank')}
                  style={{
                    flex: 1.1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '5px 6px',
                    borderRadius: 8,
                    background: '#0d0d0d',
                    border: '1px solid rgba(255, 102, 0, 0.3)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'translateY(-1px)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'none')
                  }
                >
                  <KinopoiskIcon size={16} />
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      background:
                        'linear-gradient(90deg, #ff7a00 0%, #a3e635 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {kpScore}
                  </span>
                </div>

                {/* MyAnimeList Badge */}
                <div
                  className="reveal-pop stagger-4"
                  title={`MyAnimeList: ${malScore}`}
                  onClick={() => malUrl && window.open(malUrl, '_blank')}
                  style={{
                    flex: 1.18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '5px 6px',
                    borderRadius: 8,
                    background: '#2e51a2',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(46, 81, 162, 0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'translateY(-1px)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'none')
                  }
                >
                  <MalIcon width={26} height={12} color="#ffffff" />
                  <span>{malScore}</span>
                </div>
              </div>

              {/* Top Rank Delta Row */}
              <div
                className="reveal-on-scroll stagger-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Позиция в топе
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 800,
                      fontSize: 12.5,
                    }}
                  >
                    #{topRank} в топе
                  </span>
                  <span
                    style={{
                      color: '#4ade80',
                      fontWeight: 800,
                      fontSize: 11.5,
                    }}
                  >
                    ▲ 2
                  </span>
                </div>
              </div>

              {/* Watch Action Buttons */}
              <div
                className="sidebar-actions-col reveal-on-scroll stagger-3"
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <button
                  onClick={() => {
                    setPlayerOpen(true)
                    setIsPlaying(true)
                    document
                      .getElementById('player-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <i
                    className="ti ti-player-play-filled"
                    style={{ fontSize: 16 }}
                  />
                  <span>Смотреть онлайн</span>
                </button>

                <button
                  onClick={() => {
                    setPlayerOpen(true)
                    setIsPlaying(true)
                    document
                      .getElementById('player-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <i
                    className="ti ti-movie"
                    style={{ fontSize: 16, color: 'var(--accent)' }}
                  />
                  <span>Смотреть трейлер</span>
                </button>

                {anime.shikimori_url && (
                  <a
                    href={anime.shikimori_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '6px 0',
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    <i
                      className="ti ti-arrow-up-right"
                      style={{ fontSize: 13 }}
                    />
                    <span>Открыть на Shikimori</span>
                  </a>
                )}
              </div>
            </div>

            {/* ── My List Tracker Subcomponent ── */}
            <AnimeListTracker
              userStatus={userStatus}
              setUserStatus={setUserStatus}
              userEpisode={userEpisode}
              setUserEpisode={setUserEpisode}
              totalEpisodes={totalEpisodes}
              userRating={userRating}
              setUserRating={setUserRating}
              hoverRating={hoverRating}
              setHoverRating={setHoverRating}
              userNote={userNote}
              setUserNote={setUserNote}
              savedSuccess={savedSuccess}
              onSaveRate={handleSaveRate}
              onDeleteRate={handleDeleteRate}
            />

            {/* ── Friends & Community Avatars Subcomponent ── */}
            <AnimeCommunitySection community={community} />

            {/* ── In Collections (В КОЛЛЕКЦИЯХ) ── */}
            <div
              className="reveal-on-scroll"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 16,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    color: '#818cf8',
                    fontWeight: 800,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  В КОЛЛЕКЦИЯХ
                </span>
                <span
                  style={{ color: '#d97706', fontWeight: 700, fontSize: 13 }}
                >
                  (12)
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                {(showAllCollections
                  ? MOCK_COLLECTIONS
                  : MOCK_COLLECTIONS.slice(0, 3)
                ).map((c) => (
                  <a
                    key={c.id}
                    href="#"
                    className="reveal-item"
                    style={{
                      color: '#818cf8',
                      textDecoration: 'none',
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {c.title}
                  </a>
                ))}
                <button
                  onClick={() => setShowAllCollections(!showAllCollections)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '4px 0 0 0',
                    fontWeight: 600,
                  }}
                >
                  {showAllCollections ? '▲ скрыть' : '+ еще 9 коллекций'}
                </button>
              </div>
            </div>

            {/* ── External Links (НА ДРУГИХ САЙТАХ) ── */}
            <div
              className="reveal-on-scroll"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 16,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  color: '#9ca3af',
                  fontWeight: 800,
                  fontSize: 12.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 4,
                }}
              >
                НА ДРУГИХ САЙТАХ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { id: 'shiki', name: 'Shikimori', url: shikiUrl },
                  { id: 'kp', name: 'КиноПоиск', url: kpUrl },
                  { id: 'mal', name: 'MyAnimeList', url: malUrl },
                  { id: 'wa', name: 'World Art', url: waUrl },
                  officialSite
                    ? {
                        id: 'official',
                        name: 'Официальный сайт',
                        url: officialSite,
                      }
                    : null,
                  wikiUrl
                    ? { id: 'wiki', name: 'Википедия', url: wikiUrl }
                    : null,
                  aniDbDirect
                    ? { id: 'anidb', name: 'AniDB', url: aniDbDirect }
                    : null,
                  {
                    id: 'cr',
                    name: 'Crunchyroll',
                    url:
                      crDirect ||
                      `https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.name || title)}`,
                  },
                  { id: 'yt', name: 'YouTube', url: ytUrl },
                ]
                  .filter(
                    (
                      link
                    ): link is { id: string; name: string; url: string } =>
                      Boolean(link && link.url)
                  )
                  .map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="reveal-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '5px 4px',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: 12.5,
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.04)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <ExternalSiteIcon name={link.name} />
                      <span style={{ flex: 1 }}>{link.name}</span>
                      <i
                        className="ti ti-arrow-up-right"
                        style={{
                          fontSize: 11,
                          color: 'var(--text-dim)',
                          opacity: 0.6,
                        }}
                      />
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {/* ════════════ RIGHT COLUMN (MAIN CONTENT AREA) ════════════ */}
          <div
            className="modal-main-content"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            {/* ── Title Header ── */}
            <div className="header-spacer reveal-on-scroll stagger-1">
              <h1
                id="anime-modal-title"
                className="title-main"
                style={{
                  fontWeight: 800,
                  fontSize: 32,
                  lineHeight: 1.16,
                  margin: 0,
                }}
              >
                {title}
              </h1>
              {origTitle && (
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  {origTitle}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 14,
                }}
                className="stagger-children"
              >
                {[
                  anime.kind,
                  `${totalEpisodes} эп. по ${anime.duration || 24} мин.`,
                  anime.status,
                  anime.aired_on ? anime.aired_on.split('-')[0] : 'Лето',
                  anime.rating || 'R-17',
                ]
                  .filter(Boolean)
                  .map((p, idx) => (
                    <span
                      key={String(p)}
                      className={`reveal-pop stagger-${(idx % 6) + 1}`}
                    >
                      <Pill>{p}</Pill>
                    </span>
                  ))}
              </div>
            </div>

            {/* ── Video Player & Streaming Subcomponent ── */}
            <AnimePlayer
              playerOpen={playerOpen}
              setPlayerOpen={setPlayerOpen}
              activePlayerType={activePlayerType}
              setActivePlayerType={setActivePlayerType}
              selectedEpisode={selectedEpisode}
              onEpisodeChange={handleEpisodeChange}
              totalEpisodes={totalEpisodes}
              episodeOptions={episodeOptions}
              selectedDub={selectedDub}
              onDubChange={handleDubChange}
              dubGroups={dubGroups}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              sourceOptions={sourceOptions}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              miniPlayerActive={miniPlayerActive}
              setMiniPlayerActive={setMiniPlayerActive}
              iframeSrc={iframeSrc}
              loadingStream={loadingStream}
              streamData={streamData}
              animeImage={anime.image}
              shikiUrl={shikiUrl}
            />

            {/* ── Specifications & Description Subcomponent ── */}
            <AnimeInfoDetails anime={anime} />

            {/* ── Characters & Seiyuu Subcomponent ── */}
            <AnimeCharacters characters={anime.characters} />

            {/* ── Screenshots Gallery Subcomponent ── */}
            <AnimeScreenshotsGallery
              screenshots={anime.screenshots}
              onOpenLightbox={setLightbox}
            />

            {/* ── Related / Franchise Timeline Subcomponent ── */}
            <AnimeRelatedTimeline related={anime.related} />
          </div>
        </div>
      </div>

      {/* Bottom scroll vignette */}
      <div
        ref={bottomVignetteRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          background:
            'linear-gradient(to top, var(--modal-bg) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ── Fullscreen Lightbox Modal (Poster / Screenshots) ── */}
      {lightbox !== null &&
        createPortal(
          (() => {
            const currentMedia = galleryItems[lightbox] || galleryItems[0]
            const isPoster = currentMedia.type === 'poster'

            return (
              <div
                className="lightbox-overlay"
                onClick={() => setLightbox(null)}
                role="dialog"
                aria-modal="true"
                aria-label="Полноэкранный просмотр медиа"
                onTouchStart={(e) => {
                  touchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                  }
                }}
                onTouchEnd={(e) => {
                  if (!touchStartRef.current) return
                  const dx =
                    e.changedTouches[0].clientX - touchStartRef.current.x
                  const dy =
                    e.changedTouches[0].clientY - touchStartRef.current.y
                  touchStartRef.current = null
                  // Swipe down to dismiss
                  if (dy > 70 && Math.abs(dx) < 60) {
                    setLightbox(null)
                    return
                  }
                  // Swipe left -> next
                  if (dx < -45 && lightbox < galleryItems.length - 1) {
                    setLightbox(lightbox + 1)
                  } else if (dx > 45 && lightbox > 0) {
                    setLightbox(lightbox - 1)
                  }
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999999,
                  background: 'rgba(5, 2, 10, 0.96)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
                  paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
                  paddingLeft: 'max(14px, env(safe-area-inset-left, 14px))',
                  paddingRight: 'max(14px, env(safe-area-inset-right, 14px))',
                  boxSizing: 'border-box',
                  animation: 'fadeIn 0.2s ease',
                  userSelect: 'none',
                }}
              >
                {/* Top Controls Bar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="lightbox-top-bar"
                  style={{
                    width: '100%',
                    maxWidth: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    zIndex: 10,
                    padding: '0 8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentMedia.title}
                    </span>
                    <span
                      style={{
                        color: 'var(--text-dim)',
                        fontSize: 12.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {title}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <a
                      href={currentMedia.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      title="Открыть оригинал"
                      aria-label="Открыть оригинал в новой вкладке"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                      }}
                    >
                      <i className="ti ti-external-link" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setLightbox(null)}
                      aria-label="Закрыть полноэкранный просмотр"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>

                {/* Media Image Container with flex center */}
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 0,
                    padding: '8px 0',
                  }}
                >
                  <img
                    key={currentMedia.url}
                    src={currentMedia.url}
                    alt={currentMedia.title}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      maxWidth: 'min(96vw, 1200px)',
                      maxHeight: 'calc(100dvh - 160px)',
                      borderRadius: 14,
                      objectFit: 'contain',
                      boxShadow: isPoster
                        ? '0 0 100px rgba(var(--accent-rgb), 0.3), 0 30px 80px rgba(0,0,0,0.95)'
                        : '0 0 90px rgba(var(--accent-rgb), 0.2), 0 30px 70px rgba(0,0,0,0.9)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'block',
                    }}
                  />

                  {/* Prev button (desktop / large screens) */}
                  {lightbox > 0 && (
                    <button
                      type="button"
                      className="lightbox-nav-arrow"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLightbox(lightbox - 1)
                      }}
                      aria-label="Предыдущий слайд"
                      style={{
                        position: 'absolute',
                        left: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(var(--accent-rgb), 0.25)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(var(--accent-rgb), 0.45)',
                        color: 'var(--accent)',
                        fontSize: 24,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <i className="ti ti-chevron-left" />
                    </button>
                  )}

                  {/* Next button (desktop / large screens) */}
                  {lightbox < galleryItems.length - 1 && (
                    <button
                      type="button"
                      className="lightbox-nav-arrow"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLightbox(lightbox + 1)
                      }}
                      aria-label="Следующий слайд"
                      style={{
                        position: 'absolute',
                        right: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(var(--accent-rgb), 0.25)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(var(--accent-rgb), 0.45)',
                        color: 'var(--accent)',
                        fontSize: 24,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <i className="ti ti-chevron-right" />
                    </button>
                  )}
                </div>

                {/* Bottom Controls: Pill + Thumbnail Switcher */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 10,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      padding: '4px 14px',
                      borderRadius: 999,
                      background: 'rgba(10, 5, 20, 0.75)',
                      backdropFilter: 'blur(14px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>
                      {isPoster
                        ? 'Обложка тайтла'
                        : `Кадр ${lightbox} из ${galleryItems.length - 1}`}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>•</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Всего {galleryItems.length}
                    </span>
                  </div>

                  {/* Quick thumbnail switcher */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 10px',
                      borderRadius: 14,
                      background: 'rgba(10, 5, 20, 0.75)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      maxWidth: 'min(92vw, 840px)',
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {galleryItems.map((item, idx) => {
                      const isActive = lightbox === idx
                      return (
                        <button
                          key={item.id}
                          ref={isActive ? activeThumbRef : null}
                          type="button"
                          onClick={() => setLightbox(idx)}
                          title={item.title}
                          aria-label={`Перейти к слайду: ${item.title}`}
                          style={{
                            position: 'relative',
                            width: item.type === 'poster' ? 24 : 38,
                            height: 28,
                            flexShrink: 0,
                            borderRadius: 6,
                            overflow: 'hidden',
                            padding: 0,
                            cursor: 'pointer',
                            border: isActive
                              ? '2px solid var(--accent)'
                              : '1px solid rgba(255, 255, 255, 0.15)',
                            opacity: isActive ? 1 : 0.6,
                            transition:
                              'opacity 0.15s ease, border-color 0.15s ease',
                            background: 'var(--bg-page)',
                            boxShadow: isActive
                              ? '0 2px 8px rgba(0, 0, 0, 0.5)'
                              : 'none',
                          }}
                        >
                          <img
                            src={item.thumb}
                            alt={item.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })(),
          document.body
        )}
    </div>
  )
}
