// ─────────────────────────────────────────────────────────────
// Типы, повторяющие реальные ответы Flask API (routes/*.py)
// ─────────────────────────────────────────────────────────────

export interface UserRate {
  id?: number
  status: string // 'planned' | 'watching' | 'completed' | 'on_hold' | 'dropped' | 'rewatching'
  episodes?: number
  chapters?: number
  volumes?: number
  score: number
  text?: string
}

export interface ExternalLink {
  id?: number
  kind: string
  url: string
  source?: string
  entry_type?: string
}

export interface CharacterItem {
  id: number
  name: string
  russian?: string
  role?: string
  image: string
  url?: string
}

export interface RelatedItem {
  id: number
  name: string
  original_name?: string
  kind: string
  relation?: string
  year?: string
  meta_text?: string
  is_anime?: boolean
  image: string
  url?: string
}

export interface VideoItem {
  id: number
  name: string
  url: string
  kind?: string
}

export interface StatItem {
  score?: number
  status?: string
  count: number
}

export interface AnimeDetail {
  id: number
  name: string
  russian: string
  image: string
  kind: string
  score: number | string
  status: string
  episodes: number
  episodes_aired?: number
  duration: number
  aired_on?: string
  released_on?: string
  season?: string
  source?: string
  rating?: string
  genres: string[]
  studios: string[]
  franchise?: string
  description: string
  shikimori_url?: string
  user_rate?: UserRate | null
  synonyms?: string[]
  japanese?: string[] | string
  english?: string[] | string
  scores_stats?: StatItem[]
  statuses_stats?: StatItem[]
  characters?: CharacterItem[]
  screenshots?: string[]
  related?: RelatedItem[]
  video?: VideoItem[]
  external_links?: ExternalLink[]
}

export interface AnimeMember {
  id: number
  name: string
  avatar: string
  status: string
  status_color?: string
  score?: number
}

export interface AnimeCommunityData {
  is_authorized: boolean
  friends: AnimeMember[]
  community_watchers: AnimeMember[]
  favorites: AnimeMember[]
  total_favorites?: number
}

export interface StreamSource {
  player: string
  translation?: string
  url: string
  quality?: string
}

export interface AnicliStreamData {
  sources_found: string[]
  total_episodes: number
  episodes: Record<string, Record<string, StreamSource[]>>
}

export interface CatalogItem {
  id: number
  name: string
  russian: string
  image: string
  score?: number | string | null
  kind?: string
  status?: string
  episodes?: number
  episodes_aired?: number
  year?: number | string
  genres?: string[]
  studios?: string
  rating?: string
  updated_at?: string
  rank?: number
  is_manga?: boolean
  volumes?: number
  chapters?: number
}

export interface UserProfile {
  id: number
  nickname: string
  avatar: string
  image?: {
    x160?: string
    x80?: string
  }
  stats?: {
    statuses?: {
      anime?: { name: string; size: number }[]
      manga?: { name: string; size: number }[]
    }
  }
}

export interface MangaItem {
  id: number
  name: string
  russian: string
  image: string
  score?: number | string | null
  kind?: string
  status?: string
  type_and_status?: string
  volumes?: number
  chapters?: number
  year?: string
  authors?: string[]
  publishers?: string[]
  genres?: string[]
  description?: string
  aired_on?: string
  aired_on_formatted?: string
  released_on?: string
  shikimori_url?: string
  user_rate?: UserRate | null
  characters?: CharacterItem[]
  characters_total?: number
  related?: RelatedItem[]
  related_total?: number
  rates_statuses_stats?: { name?: string; size?: number }[]
}

export interface ForumTopic {
  id: number
  title: string
  url: string
  created_at?: string
  comments_count: number
  author: string
  author_avatar?: string
  forum_name?: string
  forum_permalink?: string
  type?: string
}

export interface ClubItem {
  id: number
  name: string
  logo?: string
  url?: string
  members_label?: string
  is_censored?: boolean
  comment_policy?: string
}

export interface CollectionItem {
  id: number
  title: string
  url?: string
  image?: string
  author?: string
  comments_count?: number
  date?: string
}

export interface CritiqueItem {
  id: number
  title: string
  url?: string
  image?: string
  author?: string
  comments_count?: number
  date?: string
  snippet?: string
  linked?: {
    id?: number
    name?: string
    russian?: string
    type?: string
    image?: unknown
  } | null
}

export interface ArticleItem {
  id: number
  title: string
  url?: string
  image?: string
  author?: string
  comments_count?: number
  date?: string
  snippet?: string
}

export interface UserSearchItem {
  id: number
  nickname: string
  avatar?: string
  last_online_at?: string
  url?: string
}

// ─── Explore feed ───

export interface OnScreenItem {
  id: number
  name: string
  russian: string
  image: string
  score?: number | string | null
  kind?: string
  studios?: string
}

export interface AnimeUpdateItem {
  id: number
  name: string
  russian: string
  image: string
  kind?: string
  status?: string
  rating?: string
  updated_at?: string
  genres?: string
}

export interface FeedTopic {
  id: number
  title: string
  url: string
  comments_count?: number
  tag?: string
  author?: string
  date?: string
}

export interface NewsTopic {
  id: number
  title: string
  url: string
  image: string
  author?: string
  date?: string
  tags?: string[]
  comments_count?: number
  is_youtube?: boolean
  linked_anime_id?: number | null
}

export interface ExploreFeed {
  on_screens: OnScreenItem[]
  anime_updates: AnimeUpdateItem[]
  content: FeedTopic[]
  hot: FeedTopic[]
  latest: NewsTopic[]
  other: NewsTopic[]
}

// ─── Calendar ───

export interface CalendarEntry {
  id: number
  name: string
  russian: string
  image: string
  score?: number | string | null
  kind?: string
  status?: string
  episodes?: number
  episodes_aired?: number
  next_episode?: number | null
  next_episode_at?: string | null
  day_of_week?: number | null
  day_name?: string
  time_str?: string
  date_str?: string
}

export interface CalendarDay {
  day_name: string
  day_of_week: number
  date: string
  items: CalendarEntry[]
}

// ─── User lists ───

export interface ContinueWatchingItem {
  id: number
  title: string
  image: string
  episode: number
  total_episodes?: number
  translation?: string
  time?: number
  duration?: number
  updated_at?: string
}

export interface RateTargetData {
  id: number
  name: string
  russian: string
  kind?: string
  score?: number | string | null
  status?: string
  episodes?: number
  episodes_aired?: number
  chapters?: number
  volumes?: number
  duration?: number
  season?: string
  aired_on?: string
  licensors?: string[]
  genres?: string[]
  studios?: string[]
  image?: string
}

export interface RateItem {
  id?: number
  user_id?: number
  target_id: number
  target_type: 'Anime' | 'Manga'
  score: number
  status: string
  episodes: number
  chapters?: number
  volumes?: number
  text?: string
  rewatches?: number
  created_at?: string
  updated_at?: string
  target_data?: RateTargetData
}

export interface AppInfo {
  version: string
  app_name: string
  description: string
  features: string[]
  stack: string[]
  changelog?: { version: string; date: string; changes: string[] }[]
}
