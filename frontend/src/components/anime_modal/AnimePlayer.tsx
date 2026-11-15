import React, { useState, useEffect, useRef } from 'react'
import { MxSelect, MxSelectOption, MxSelectGroup } from '../MxSelect'
import { PlayIcon } from '../AnimeModalIcons'
import { AnicliStreamData } from '../../types/anime'

interface AnimePlayerProps {
  playerOpen: boolean
  setPlayerOpen: (open: boolean) => void
  activePlayerType: 'anicli' | 'kodik'
  setActivePlayerType: (t: 'anicli' | 'kodik') => void
  selectedEpisode: number
  onEpisodeChange: (ep: number | string) => void
  totalEpisodes: number
  episodeOptions: MxSelectOption[]
  selectedDub: string
  onDubChange: (dub: string | number) => void
  dubGroups: MxSelectGroup[]
  selectedSource: string
  setSelectedSource: (src: string) => void
  sourceOptions: MxSelectOption[]
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  miniPlayerActive: boolean
  setMiniPlayerActive: (active: boolean) => void
  iframeSrc: string
  loadingStream: boolean
  streamData: AnicliStreamData | null
  animeImage?: string
  shikiUrl: string
}

export function AnimePlayer({
  playerOpen,
  setPlayerOpen,
  activePlayerType,
  setActivePlayerType,
  selectedEpisode,
  onEpisodeChange,
  totalEpisodes,
  episodeOptions,
  selectedDub,
  onDubChange,
  dubGroups,
  selectedSource,
  setSelectedSource,
  sourceOptions,
  isPlaying,
  setIsPlaying,
  miniPlayerActive,
  setMiniPlayerActive,
  iframeSrc,
  loadingStream,
  streamData,
  animeImage,
  shikiUrl,
}: AnimePlayerProps) {
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false)
  const videoViewportRef = useRef<HTMLDivElement>(null)

  const togglePlayerFullscreen = () => {
    if (!isPlaying) {
      setIsPlaying(true)
    }
    setIsPlayerFullscreen((prev) => !prev)
  }

  useEffect(() => {
    if (isPlayerFullscreen) {
      document.body.classList.add('has-fullscreen-player')
      const el = videoViewportRef.current
      if (el && document.fullscreenEnabled && !document.fullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {})
        } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
          ;(el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen()
        }
      }
    } else {
      document.body.classList.remove('has-fullscreen-player')
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
    return () => {
      document.body.classList.remove('has-fullscreen-player')
    }
  }, [isPlayerFullscreen])

  useEffect(() => {
    const handleFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element })
          .webkitFullscreenElement
      if (!fsEl && isPlayerFullscreen) {
        setIsPlayerFullscreen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayerFullscreen) {
        setIsPlayerFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlayerFullscreen])
  return (
    <div
      id="player-section"
      className="reveal-on-scroll stagger-2"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 20,
        overflow: playerOpen ? 'visible' : 'hidden',
        boxShadow: 'var(--card-shadow)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setPlayerOpen(!playerOpen)}
        aria-expanded={playerOpen}
        aria-label="Свернуть или развернуть блок онлайн-плеера"
        style={{
          width: '100%',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--sub-bg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <PlayIcon size={18} color="var(--accent)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                ОНЛАЙН ПРОСМОТР
              </span>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10.5,
                  background: 'rgba(74, 222, 128, 0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(74, 222, 128, 0.35)',
                }}
              >
                ● Агрегатор активен
              </span>
            </div>
            <div
              style={{
                color: 'var(--text-dim)',
                fontSize: 12,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Серия {selectedEpisode}</span>
              <span>•</span>
              <span>{selectedDub || 'AniLibria'}</span>
              <span>•</span>
              <span>{selectedSource || 'Kodik'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 999,
              background:
                activePlayerType === 'kodik'
                  ? 'rgba(var(--accent-rgb), 0.14)'
                  : 'rgba(56,189,248,0.14)',
              color:
                activePlayerType === 'kodik'
                  ? 'var(--accent)'
                  : '#38bdf8',
              border: `1px solid ${activePlayerType === 'kodik' ? 'rgba(var(--accent-rgb), 0.3)' : 'rgba(56,189,248,0.3)'}`,
            }}
          >
            {activePlayerType === 'kodik'
              ? 'Плеер 1 (Shikimori iFrame)'
              : 'Плеер 2 (Anicli / Мульти-стрим)'}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              transition: 'transform 0.25s ease',
              transform: playerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <i
              className="ti ti-chevron-down"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>
      </button>

      {/* Expanded Player Body */}
      {playerOpen && (
        <div
          style={{
            borderTop: '1px solid var(--card-border)',
            background: 'rgba(0,0,0,0.12)',
          }}
        >
          {/* Top Mode Tabs */}
          <div
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--card-border)',
              background: 'rgba(0,0,0,0.2)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setActivePlayerType('anicli')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background:
                    activePlayerType === 'anicli'
                      ? 'var(--accent-btn-bg)'
                      : 'transparent',
                  color:
                    activePlayerType === 'anicli'
                      ? '#fff'
                      : 'var(--text-muted)',
                  border:
                    activePlayerType === 'anicli'
                      ? 'none'
                      : '1px solid var(--input-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ti ti-device-tv" />
                <span>Мульти-агрегатор (Kodik, AnimeGo)</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePlayerType('kodik')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background:
                    activePlayerType === 'kodik'
                      ? 'var(--accent-btn-bg)'
                      : 'transparent',
                  color:
                    activePlayerType === 'kodik'
                      ? '#fff'
                      : 'var(--text-muted)',
                  border:
                    activePlayerType === 'kodik'
                      ? 'none'
                      : '1px solid var(--input-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <PlayIcon size={12} color="currentColor" />
                <span>Зеркало плеера</span>
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: 'var(--text-muted)',
              }}
            >
              <i
                className="ti ti-circle-check"
                style={{ color: '#4ade80' }}
              />
              <span>
                Источники: Kodik, AniLibria, AnimeGo, Sibnet, Yummy
              </span>
            </div>
          </div>

          <div style={{ padding: '16px 20px 22px' }}>
            {/* Compact Dropdowns Bar ABOVE Player */}
            <div
              className="player-dropdowns-bar"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 14,
                padding: '12px 16px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--card-border)',
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 35,
              }}
            >
              {/* 1. Серия Custom Dropdown */}
              <MxSelect
                label="Серия"
                icon="ti ti-layout-grid"
                sublabel={`(${totalEpisodes} эп.)`}
                value={selectedEpisode}
                onChange={onEpisodeChange}
                options={episodeOptions}
                searchable={totalEpisodes > 10}
                searchPlaceholder="Номер серии..."
                flex="1 1 180px"
                minWidth={170}
              />

              {/* 2. Озвучка / Перевод Custom Dropdown */}
              <MxSelect
                label="Озвучка / Перевод"
                icon="ti ti-headphones"
                value={selectedDub}
                onChange={onDubChange}
                groups={dubGroups}
                searchable={true}
                searchPlaceholder="Поиск озвучки..."
                flex="2 1 240px"
                minWidth={220}
              />

              {/* 3. Источник / Зеркало Custom Dropdown */}
              <MxSelect
                label="Источник / Зеркало"
                icon="ti ti-server"
                value={selectedSource}
                onChange={(val) => setSelectedSource(String(val))}
                options={sourceOptions}
                flex="1 1 180px"
                minWidth={180}
              />
            </div>

            {/* Recently Watched / Active Playback Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: isPlaying
                  ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.12) 0%, rgba(20, 10, 35, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.16) 0%, rgba(20, 10, 35, 0.7) 100%)',
                border: isPlaying
                  ? '1px solid rgba(74, 222, 128, 0.35)'
                  : '1px solid rgba(var(--accent-rgb), 0.35)',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isPlaying
                      ? 'rgba(74, 222, 128, 0.2)'
                      : 'rgba(var(--accent-rgb), 0.25)',
                    border: isPlaying
                      ? '1px solid rgba(74, 222, 128, 0.45)'
                      : '1px solid rgba(var(--accent-rgb), 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isPlaying ? '#4ade80' : 'var(--accent)',
                  }}
                >
                  <i
                    className={
                      isPlaying
                        ? 'ti ti-player-play-filled'
                        : 'ti ti-history'
                    }
                    style={{ fontSize: 20 }}
                  />
            </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isPlaying ? 'Сейчас играет:' : 'Вы остановились на:'}
            </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontSize: 14,
                      }}
                    >
                      Серия {selectedEpisode}
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>•</span>
                    <span
                      style={{
                        color: 'var(--accent)',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {selectedDub || 'AniLibria'}
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>•</span>
                    <span
                      style={{
                        color: 'var(--text-dim)',
                        fontSize: 12,
                      }}
                    >
                      {selectedSource || 'Kodik'}
                    </span>
            </div>
            </div>
            </div>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={
                  isPlaying
                    ? 'Остановить воспроизведение'
                    : 'Продолжить просмотр'
                }
                style={{
                  padding: '8px 18px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: isPlaying
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : 'none',
                  background: isPlaying
                    ? 'rgba(239, 68, 68, 0.18)'
                    : 'var(--accent)',
                  color: isPlaying ? '#fca5a5' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.opacity = '0.9')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = '1')
                }
              >
                <i
                  className={
                    isPlaying
                      ? 'ti ti-player-stop-filled'
                      : 'ti ti-player-play-filled'
                  }
                  style={{ fontSize: 13 }}
                />
                <span>
                  {isPlaying
                    ? 'Остановить воспроизведение'
                    : 'Продолжить просмотр'}
                </span>
              </button>
            </div>

            {/* Video Player Viewport */}
            <div
              ref={videoViewportRef}
              style={{
                ...(isPlayerFullscreen
                  ? {
                      position: 'fixed',
                      inset: 0,
                      width: '100vw',
                      height: '100dvh',
                      zIndex: 999999,
                      background: '#000',
                      borderRadius: 0,
                      border: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }
                  : {
                      aspectRatio: '16/9',
                      borderRadius: 16,
                      background: '#030107',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow:
                        '0 12px 36px rgba(0,0,0,0.7), inset 0 0 60px rgba(0,0,0,0.85)',
                    }),
              }}
            >
              {isPlayerFullscreen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    padding:
                      'max(12px, env(safe-area-inset-top, 12px)) max(16px, env(safe-area-inset-right, 16px)) 12px max(16px, env(safe-area-inset-left, 16px))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background:
                      'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 14px',
                      borderRadius: 999,
                      background: 'rgba(15, 10, 25, 0.75)',
                      backdropFilter: 'blur(14px)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: '#fff',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <span>Серия {selectedEpisode}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                    <span style={{ color: 'var(--accent)' }}>
                      {selectedDub || 'AniLibria'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      {selectedSource || 'AnimeGo CDN'}
                    </span>
            </div>

                  <button
                    type="button"
                    onClick={() => setIsPlayerFullscreen(false)}
                    aria-label="Выйти из полноэкранного режима"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.14)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <i
                      className="ti ti-arrows-minimize"
                      style={{ fontSize: 15 }}
                    />
                    <span>Выйти</span>
                  </button>
            </div>
              )}

              {isPlaying ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    flex: isPlayerFullscreen ? 1 : undefined,
                    display: isPlayerFullscreen ? 'flex' : undefined,
                    alignItems: isPlayerFullscreen ? 'center' : undefined,
                    justifyContent: isPlayerFullscreen ? 'center' : undefined,
                  }}
                >
                  {iframeSrc ? (
                    <iframe
                      key={iframeSrc}
                      src={iframeSrc}
                      title="Видеопоток"
                      allowFullScreen
                      allow="autoplay; fullscreen; picture-in-picture"
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        textAlign: 'center',
                        background:
                          'radial-gradient(ellipse at center, rgba(30,15,45,0.95) 0%, #030107 100%)',
                      }}
                    >
                      {loadingStream ? (
                        <>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              border:
                                '3px solid rgba(var(--accent-rgb), 0.2)',
                              borderTopColor: 'var(--accent)',
                              animation: 'spin 0.8s linear infinite',
                              marginBottom: 14,
                            }}
                          />
                          <h3
                            style={{
                              color: '#fff',
                              fontSize: 16,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            Поиск видеопотока...
                          </h3>
                          <p
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: 13,
                              maxWidth: 360,
                            }}
                          >
                            Опрашиваем базы Kodik, AnimeGo, AniLibria
                            и Sibnet для серии {selectedEpisode}
                          </p>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border:
                                '1px solid rgba(239, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              fontSize: 24,
                              marginBottom: 12,
                            }}
                          >
                            <i className="ti ti-video-off" />
            </div>
                          <h3
                            style={{
                              color: '#fff',
                              fontSize: 16,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            Видеопоток для серии {selectedEpisode}{' '}
                            пока недоступен
                          </h3>
                          <p
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: 13,
                              maxWidth: 400,
                              marginBottom: 16,
                              lineHeight: 1.5,
                            }}
                          >
                            В мульти-агрегаторе пока нет прямой ссылки
                            на эту серию. Вы можете переключить серию,
                            озвучку или открыть внешний источник.
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              gap: 10,
                              flexWrap: 'wrap',
                              justifyContent: 'center',
                            }}
                          >
                            {streamData?.episodes &&
                              Object.keys(streamData.episodes).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstAvail = Number(
                                      Object.keys(streamData.episodes)[0]
                                    )
                                    if (firstAvail)
                                      onEpisodeChange(firstAvail)
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    background: 'var(--accent-btn-bg)',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                  }}
                                >
                                  Включить доступную серию (
                                  {Object.keys(streamData.episodes)[0]})
                                </button>
                              )}
                            <a
                              href={shikiUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid var(--border-default)',
                                color: 'var(--text-primary)',
                                fontSize: 12.5,
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span>На страницу тайтла</span>
                              <i
                                className="ti ti-external-link"
                                style={{ fontSize: 13 }}
                              />
                            </a>
            </div>
                          <button
                            type="button"
                            onClick={() => setIsPlaying(false)}
                            aria-label="Закрыть плеер"
                            title="Закрыть плеер"
                            style={{
                              position: 'absolute',
                              top: 12,
                              right: 14,
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <i
                              className="ti ti-x"
                              style={{ fontSize: 15 }}
                            />
                          </button>
                        </>
                      )}
            </div>
                  )}
            </div>
              ) : (
                <>
                  {/* Poster Art blurred background */}
                  {animeImage && (
                    <img
                      src={animeImage}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(20px) brightness(0.28)',
                        transform: 'scale(1.1)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <div
                      onClick={() => setIsPlaying(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setIsPlaying(true)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Запустить воспроизведение"
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <PlayIcon size={30} color="#fff" />
            </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 999,
                          background: 'rgba(255, 255, 255, 0.09)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          color: '#ffffff',
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <i
                          className="ti ti-player-play-filled"
                          style={{
                            fontSize: 11,
                            color: 'var(--accent)',
                          }}
                        />
                        <span>Серия {selectedEpisode}</span>
            </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 999,
                          background: 'rgba(var(--accent-rgb), 0.16)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(var(--accent-rgb), 0.35)',
                          color: 'var(--accent)',
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <i
                          className="ti ti-microphone"
                          style={{ fontSize: 12 }}
                        />
                        <span>{selectedDub || 'AniLibria'}</span>
            </div>
            </div>
            </div>
                </>
              )}
            </div>

            {/* Quick Actions Toolbar under player */}
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  disabled={selectedEpisode <= 1}
                  onClick={() =>
                    onEpisodeChange(Math.max(1, selectedEpisode - 1))
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color:
                      selectedEpisode <= 1
                        ? 'rgba(255,255,255,0.25)'
                        : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor:
                      selectedEpisode <= 1
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-player-skip-back" />
                  <span>Пред. серия ({selectedEpisode - 1})</span>
                </button>
                <button
                  type="button"
                  disabled={selectedEpisode >= totalEpisodes}
                  onClick={() =>
                    onEpisodeChange(Math.min(totalEpisodes, selectedEpisode + 1))
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color:
                      selectedEpisode >= totalEpisodes
                        ? 'rgba(255,255,255,0.25)'
                        : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor:
                      selectedEpisode >= totalEpisodes
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-player-skip-forward" />
                  <span>След. серия ({selectedEpisode + 1})</span>
                </button>
            </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMiniPlayerActive(!miniPlayerActive)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-picture-in-picture-top" />
                  <span>
                    {miniPlayerActive ? 'Обычный вид' : 'Мини-плеер'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={togglePlayerFullscreen}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: isPlayerFullscreen
                      ? 'rgba(var(--accent-rgb), 0.2)'
                      : 'rgba(255,255,255,0.06)',
                    border: isPlayerFullscreen
                      ? '1px solid var(--accent)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: isPlayerFullscreen
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i
                    className={
                      isPlayerFullscreen
                        ? 'ti ti-arrows-minimize'
                        : 'ti ti-arrows-maximize'
                    }
                  />
                  <span>
                    {isPlayerFullscreen ? 'Обычный экран' : 'Во весь экран'}
                  </span>
                </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
