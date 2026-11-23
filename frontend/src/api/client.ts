import {
  AnimeDetail,
  AnimeCommunityData,
  AnicliStreamData,
  CatalogItem,
  UserProfile,
  MangaItem,
  ForumTopic,
  ClubItem,
  CollectionItem,
  CritiqueItem,
  ArticleItem,
  CalendarEntry,
  ContinueWatchingItem,
  ExploreFeed,
  RateItem,
  UserSearchItem,
  AppInfo,
} from '../types/anime'

// ─── ANIME & STREAMS ───

const ANIME_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes client-side memory cache
const _animeDetailsCache = new Map<number, { data: AnimeDetail; exp: number }>()
const _pendingAnimeFetches = new Map<number, Promise<AnimeDetail>>()

export function prefetchAnimeDetails(id: number): void {
  if (!id || typeof id !== 'number') return
  const cached = _animeDetailsCache.get(id)
  if (cached && Date.now() < cached.exp) return
  if (_pendingAnimeFetches.has(id)) return

  fetchAnimeDetails(id).catch(() => {})
}

export async function fetchAnimeDetails(id: number, forceRefresh = false): Promise<AnimeDetail> {
  const now = Date.now()
  if (!forceRefresh) {
    const cached = _animeDetailsCache.get(id)
    if (cached && now < cached.exp) {
      return cached.data
    }
  }

  // Deduplicate in-flight requests (e.g. card hover prefetch + click)
  if (!forceRefresh && _pendingAnimeFetches.has(id)) {
    return _pendingAnimeFetches.get(id)!
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/anime/${id}`)
      if (!res.ok) {
        throw new Error(`Ошибка загрузки аниме #${id}: ${res.statusText}`)
      }
      const data = await res.json()

      // Normalize screenshots
      if (Array.isArray(data.screenshots)) {
        data.screenshots = data.screenshots
          .map((shot: unknown) => {
            if (typeof shot === 'string') return shot
            if (shot && typeof shot === 'object') {
              const obj = shot as Record<string, unknown>
              return (
                obj.original_url ||
                obj.originalUrl ||
                obj.preview ||
                obj.x332Url ||
                ''
              )
            }
            return ''
          })
          .filter((url: string) => Boolean(url))
      } else {
        data.screenshots = []
      }

      const detail = data as AnimeDetail
      _animeDetailsCache.set(id, { data: detail, exp: Date.now() + ANIME_CACHE_TTL_MS })
      return detail
    } finally {
      _pendingAnimeFetches.delete(id)
    }
  })()

  _pendingAnimeFetches.set(id, fetchPromise)
  return fetchPromise
}

export async function fetchAnimeCommunity(id: number): Promise<AnimeCommunityData> {
  const res = await fetch(`/api/anime/${id}/members`)
  if (!res.ok) {
    return {
      is_authorized: false,
      friends: [],
      community_watchers: [],
      favorites: [],
      total_favorites: 0,
    }
  }
  return res.json()
}

export async function fetchAnimeStreams(
  id: number,
  title = ''
): Promise<AnicliStreamData> {
  const query = title ? `?title=${encodeURIComponent(title)}` : ''
  const res = await fetch(`/api/anime/${id}/anicli${query}`)
  if (!res.ok) {
    throw new Error(`Не удалось найти видеопотоки: ${res.statusText}`)
  }
  return res.json()
}

export async function searchAnime(query: string): Promise<CatalogItem[]> {
  if (!query.trim()) return []
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.animes || []
}

export interface FetchCatalogParams {
  page?: number
  genre?: string
  season?: string
  kind?: string
  status?: string
  score?: string
  order?: string
  search?: string
}

const KNOWN_ORDER_VALUES = new Set([
  'popularity',
  'ranked',
  'aired_on',
  'name',
  'id',
  'random',
  'status',
  'episodes',
])

export async function fetchCatalog(
  pageOrParams: number | FetchCatalogParams = 1,
  genre = '',
  season = '',
  kind = '',
  status = '',
  score = '',
  order = 'popularity'
): Promise<CatalogItem[]> {
  const p: FetchCatalogParams =
    typeof pageOrParams === 'object' && pageOrParams !== null
      ? pageOrParams
      : {
          page: pageOrParams,
          genre,
          season,
          kind,
          status,
          score,
          order,
        }

  const page = p.page || 1
  let finalOrder = p.order || 'popularity'
  let finalSeason = p.season || ''

  // If order was accidentally passed in the season position (e.g. fetchCatalog(page, genre, 'popularity'))
  if (finalSeason && KNOWN_ORDER_VALUES.has(finalSeason)) {
    finalOrder = finalSeason
    finalSeason = ''
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: '24',
    order: finalOrder,
  })
  if (p.genre) params.set('genre', p.genre)
  if (finalSeason) params.set('season', finalSeason)
  if (p.kind) params.set('kind', p.kind)
  if (p.status) params.set('status', p.status)
  if (p.score) params.set('score', p.score)
  if (p.search) params.set('search', p.search)

  const res = await fetch(`/api/catalog?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.animes || []
}

let _cachedExplore: { data: ExploreFeed; exp: number } | null = null
let _pendingExplore: Promise<ExploreFeed> | null = null

export async function fetchExplore(forceRefresh = false): Promise<ExploreFeed> {
  const now = Date.now()
  if (!forceRefresh && _cachedExplore && now < _cachedExplore.exp) {
    return _cachedExplore.data
  }
  if (!forceRefresh && _pendingExplore) {
    return _pendingExplore
  }

  const empty: ExploreFeed = {
    on_screens: [],
    anime_updates: [],
    content: [],
    hot: [],
    latest: [],
    other: [],
  }

  const promise = (async () => {
    try {
      const res = await fetch('/api/tab/explore')
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') {
          const feed: ExploreFeed = {
            on_screens: Array.isArray(data.on_screens) ? data.on_screens : [],
            anime_updates: Array.isArray(data.anime_updates) ? data.anime_updates : [],
            content: Array.isArray(data.content) ? data.content : [],
            hot: Array.isArray(data.hot) ? data.hot : [],
            latest: Array.isArray(data.latest) ? data.latest : [],
            other: Array.isArray(data.other) ? data.other : [],
          }
          _cachedExplore = { data: feed, exp: Date.now() + 5 * 60 * 1000 }
          return feed
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки explore:', e)
    } finally {
      _pendingExplore = null
    }
    return empty
  })()

  _pendingExplore = promise
  return promise
}

export async function fetchRandomAnime(): Promise<CatalogItem | null> {
  try {
    const res = await fetch('/api/random')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка случайного аниме:', e)
  }
  return null
}

// ─── DATABASE TABS (Top 100, Manga, Ranobe) ───

export type Top100Type = 'anime' | 'movie' | 'ongoing' | 'manga'

export async function fetchTop100(
  type: Top100Type = 'anime',
  limit = 100
): Promise<CatalogItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const params = new URLSearchParams({ type, limit: String(limit) })
    const res = await fetch(`/api/top100?${params.toString()}`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
  } catch (e) {
    clearTimeout(timer)
    console.error('Ошибка загрузки Топ-100:', e)
  }
  return []
}

export async function fetchMangaCatalog(
  page = 1,
  status = '',
  order = 'ranked',
  query = ''
): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: '24',
      order,
    })
    if (status) params.set('status', status)
    if (query) params.set('search', query)
    const res = await fetch(`/api/manga/catalog?${params.toString()}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка каталога манги:', e)
  }
  return []
}

export async function fetchRanobeCatalog(
  page = 1,
  status = '',
  order = 'ranked',
  query = ''
): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: '24',
      order,
    })
    if (status) params.set('status', status)
    if (query) params.set('search', query)
    const res = await fetch(`/api/ranobe/catalog?${params.toString()}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка каталога ранобэ:', e)
  }
  return []
}

// ─── COMMUNITY TABS (Forum, Clubs, Collections, Critiques, Articles, Users) ───

export async function fetchForumTopics(
  forum = 'all',
  page = 1,
  limit = 30
): Promise<ForumTopic[]> {
  try {
    const params = new URLSearchParams()
    if (forum && forum !== 'all') params.set('forum', forum)
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/forum/topics${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка тем форума:', e)
  }
  return []
}

export async function fetchPopularClubs(
  search = '',
  page = 1,
  limit = 30
): Promise<ClubItem[]> {
  try {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/clubs/popular${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка клубов:', e)
  }
  return []
}

export async function fetchCollections(
  search = '',
  page = 1,
  limit = 60
): Promise<CollectionItem[]> {
  try {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/collections/catalog${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка коллекций:', e)
  }
  return []
}

export async function fetchCritiques(
  page = 1,
  limit = 30
): Promise<CritiqueItem[]> {
  try {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/critiques/catalog${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка рецензий:', e)
  }
  return []
}

export async function fetchArticles(
  page = 1,
  limit = 30
): Promise<ArticleItem[]> {
  try {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/articles/catalog${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка статей:', e)
  }
  return []
}

export async function fetchUsersSearch(
  search = '',
  page = 1,
  limit = 60
): Promise<UserSearchItem[]> {
  try {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/users/search${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка поиска пользователей:', e)
  }
  return []
}

// ─── MISC (Calendar, Recommendations, Continue Watching) ───

const LOCAL_STORAGE_CONTINUE_KEY = 'shikimx_continue_watching'

function getLocalContinueList(): ContinueWatchingItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONTINUE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {}
  return []
}

function saveLocalContinueList(list: ContinueWatchingItem[]) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_CONTINUE_KEY,
      JSON.stringify(list.slice(0, 30))
    )
  } catch {}
}

let _cachedCalendar: { data: CalendarEntry[]; exp: number } | null = null
let _pendingCalendar: Promise<CalendarEntry[]> | null = null

export async function fetchCalendar(forceRefresh = false): Promise<CalendarEntry[]> {
  const now = Date.now()
  if (!forceRefresh && _cachedCalendar && now < _cachedCalendar.exp) {
    return _cachedCalendar.data
  }
  if (!forceRefresh && _pendingCalendar) {
    return _pendingCalendar
  }

  const promise = (async () => {
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) {
        const data = await res.json()
        let items: CalendarEntry[] = []
        if (Array.isArray(data)) items = data
        else if (data && Array.isArray(data.items)) items = data.items
        else if (data && Array.isArray(data.days)) {
          items = data.days.flatMap((d: any) => d.items || [])
        }
        _cachedCalendar = { data: items, exp: Date.now() + 5 * 60 * 1000 }
        return items
      }
      throw new Error(`Ошибка загрузки календаря (${res.status})`)
    } catch (e: any) {
      console.error('Ошибка календаря:', e)
      throw e
    } finally {
      _pendingCalendar = null
    }
  })()

  _pendingCalendar = promise
  return promise
}

export async function fetchRecommendations(
  page = 1,
  limit = 36
): Promise<CatalogItem[]> {
  try {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/recommendations${qs}`)
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка рекомендаций:', e)
  }
  return []
}

export async function fetchContinueWatching(): Promise<ContinueWatchingItem[]> {
  try {
    const res = await fetch('/api/continue_watching')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        saveLocalContinueList(data)
        return data
      }
    }
  } catch (e) {
    console.error('Ошибка продолжения просмотра:', e)
  }
  return getLocalContinueList()
}

export async function saveContinueWatching(
  item: ContinueWatchingItem
): Promise<boolean> {
  const current = getLocalContinueList().filter(
    (x) => String(x.id) !== String(item.id)
  )
  current.unshift(item)
  saveLocalContinueList(current)

  try {
    const res = await fetch('/api/continue_watching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return res.ok
  } catch {
    return true
  }
}

export async function deleteContinueWatching(
  animeId: number
): Promise<boolean> {
  const current = getLocalContinueList().filter(
    (x) => Number(x.id) !== Number(animeId)
  )
  saveLocalContinueList(current)

  try {
    const res = await fetch(`/api/continue_watching/${animeId}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return true
  }
}

// ─── USER RATES, FAVOURITES, FRIENDS, HISTORY ───

export async function fetchRates(): Promise<RateItem[]> {
  try {
    const res = await fetch('/api/tab/rates')
    if (res.ok) {
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
  } catch (e) {
    console.error('Ошибка загрузки списков:', e)
  }
  return []
}

export async function updateUserRate(
  targetId: number,
  status: string,
  episodes: number,
  score: number,
  text = '',
  targetType = 'Anime',
  chapters = 0,
  volumes = 0
): Promise<boolean> {
  try {
    const res = await fetch('/api/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_id: targetId,
        target_type: targetType,
        status,
        episodes,
        chapters,
        volumes,
        score,
        text,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('Ошибка сохранения статуса:', e)
    return false
  }
}

export async function fetchFavourites(): Promise<any> {
  try {
    const res = await fetch('/api/tab/favourites')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка избранного:', e)
  }
  return { animes: [], mangas: [], characters: [], people: [] }
}

export async function fetchFriends(): Promise<{
  friends: any[]
  clubs: any[]
}> {
  try {
    const res = await fetch('/api/tab/friends')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка друзей:', e)
  }
  return { friends: [], clubs: [] }
}

export async function fetchHistory(): Promise<any[]> {
  try {
    const res = await fetch('/api/tab/history')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка истории:', e)
  }
  return []
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/profile')
    if (res.ok) {
      const data = await res.json()
      if (data && data.nickname) {
        return {
          id: data.id,
          nickname: data.nickname,
          avatar:
            data.avatar ||
            (data.image && (data.image.x160 || data.image.x80)) ||
            '',
          stats: data.stats,
        }
      }
    }
  } catch {
    // Не авторизован
  }
  return null
}

// ─── DETAILS & MODALS (Manga, Club, Character, User, About, Settings) ───

const MANGA_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes client cache
const _mangaDetailsCache = new Map<number, { data: MangaItem; exp: number }>()
const _pendingMangaFetches = new Map<number, Promise<MangaItem>>()

export function prefetchMangaDetails(id: number): void {
  if (!id || typeof id !== 'number') return
  const cached = _mangaDetailsCache.get(id)
  if (cached && Date.now() < cached.exp) return
  if (_pendingMangaFetches.has(id)) return

  fetchMangaDetails(id).catch(() => {})
}

export async function fetchMangaDetails(id: number, forceRefresh = false): Promise<MangaItem> {
  const now = Date.now()
  if (!forceRefresh) {
    const cached = _mangaDetailsCache.get(id)
    if (cached && now < cached.exp) {
      return cached.data
    }
  }

  if (!forceRefresh && _pendingMangaFetches.has(id)) {
    return _pendingMangaFetches.get(id)!
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/manga/${id}`)
      if (!res.ok) throw new Error(`Ошибка загрузки манги #${id}`)
      const data = await res.json()
      _mangaDetailsCache.set(id, { data, exp: Date.now() + MANGA_CACHE_TTL_MS })
      return data
    } finally {
      _pendingMangaFetches.delete(id)
    }
  })()

  _pendingMangaFetches.set(id, promise)
  return promise
}

const _characterCache = new Map<number, { data: any; exp: number }>()
const _pendingCharFetches = new Map<number, Promise<any>>()

export async function fetchCharacterDetails(id: number, forceRefresh = false): Promise<any> {
  const now = Date.now()
  if (!forceRefresh) {
    const cached = _characterCache.get(id)
    if (cached && now < cached.exp) return cached.data
  }
  if (!forceRefresh && _pendingCharFetches.has(id)) {
    return _pendingCharFetches.get(id)!
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/character/${id}`)
      if (!res.ok) throw new Error(`Ошибка загрузки персонажа #${id}`)
      const data = await res.json()
      _characterCache.set(id, { data, exp: Date.now() + 10 * 60 * 1000 })
      return data
    } finally {
      _pendingCharFetches.delete(id)
    }
  })()

  _pendingCharFetches.set(id, promise)
  return promise
}

const _clubCache = new Map<number, { data: any; exp: number }>()

export async function fetchClubDetails(id: number): Promise<any> {
  const now = Date.now()
  const cached = _clubCache.get(id)
  if (cached && now < cached.exp) return cached.data

  const res = await fetch(`/api/club/${id}`)
  if (!res.ok) throw new Error(`Ошибка загрузки клуба #${id}`)
  const data = await res.json()
  _clubCache.set(id, { data, exp: now + 10 * 60 * 1000 })
  return data
}

export async function fetchUserDetails(
  idOrName: string | number
): Promise<any> {
  const res = await fetch(`/api/friend/${idOrName}`)
  if (!res.ok) throw new Error(`Ошибка загрузки пользователя #${idOrName}`)
  return res.json()
}

export async function fetchAboutInfo(): Promise<AppInfo> {
  try {
    const res = await fetch('/api/about')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка about:', e)
  }
  return {
    version: '1.0.0',
    app_name: 'Shiki MX App',
    description: '',
    features: [],
    stack: [],
  }
}

export async function fetchSettings(): Promise<any> {
  try {
    const res = await fetch('/api/settings')
    if (res.ok) return res.json()
  } catch (e) {
    console.error('Ошибка settings:', e)
  }
  return {}
}

export async function saveSettings(
  settings: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    return res.ok
  } catch {
    return false
  }
}
