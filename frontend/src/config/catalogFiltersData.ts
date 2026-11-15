/**
 * Static catalog filters and dictionary data
 */

export const THEME_PRESETS = [
  {
    id: 'theme',
    name: 'По теме',
    accent: '#d199ff',
    rgb: '209, 153, 255',
    glow: 'rgba(209, 153, 255, 0.35)',
    previewColor: '#d199ff',
    bgDarkHex: '',
  },
  {
    id: 'amethyst',
    name: 'Аметист',
    accent: '#c084fc',
    rgb: '192, 132, 252',
    glow: 'rgba(192, 132, 252, 0.35)',
    previewColor: '#c084fc',
    bgDarkHex: '#2b133d',
  },
  {
    id: 'obsidian',
    name: 'Обсидиан',
    accent: '#a855f7',
    rgb: '168, 85, 247',
    glow: 'rgba(168, 85, 247, 0.35)',
    previewColor: '#6b21a8',
    bgDarkHex: '#101116',
  },
  {
    id: 'midnight',
    name: 'Полночь',
    accent: '#818cf8',
    rgb: '129, 140, 248',
    glow: 'rgba(129, 140, 248, 0.35)',
    previewColor: '#4f46e5',
    bgDarkHex: '#0c0f1d',
  },
  {
    id: 'sapphire',
    name: 'Сапфир',
    accent: '#38bdf8',
    rgb: '56, 189, 248',
    glow: 'rgba(56, 189, 248, 0.35)',
    previewColor: '#0284c7',
    bgDarkHex: '#0c1926',
  },
  {
    id: 'emerald',
    name: 'Изумруд',
    accent: '#34d399',
    rgb: '52, 211, 153',
    glow: 'rgba(52, 211, 153, 0.35)',
    previewColor: '#059669',
    bgDarkHex: '#0a1d16',
  },
  {
    id: 'amber',
    name: 'Янтарь',
    accent: '#fbbf24',
    rgb: '251, 191, 36',
    glow: 'rgba(251, 191, 36, 0.35)',
    previewColor: '#d97706',
    bgDarkHex: '#221606',
  },
  {
    id: 'ruby',
    name: 'Рубин',
    accent: '#f87171',
    rgb: '248, 113, 113',
    glow: 'rgba(248, 113, 113, 0.35)',
    previewColor: '#dc2626',
    bgDarkHex: '#230b0b',
  },
  {
    id: 'sakura',
    name: 'Сакура',
    accent: '#f472b6',
    rgb: '244, 114, 182',
    glow: 'rgba(244, 114, 182, 0.35)',
    previewColor: '#db2777',
    bgDarkHex: '#230d19',
  },
]

export const ANIME_GENRES = [
  { id: 1, name: 'Action', russian: 'Экшен' },
  { id: 2, name: 'Adventure', russian: 'Приключения' },
  { id: 4, name: 'Comedy', russian: 'Комедия' },
  { id: 8, name: 'Drama', russian: 'Драма' },
  { id: 10, name: 'Fantasy', russian: 'Фэнтези' },
  { id: 14, name: 'Horror', russian: 'Ужасы' },
  { id: 7, name: 'Mystery', russian: 'Детектив' },
  { id: 22, name: 'Romance', russian: 'Романтика' },
  { id: 24, name: 'Sci-Fi', russian: 'Фантастика' },
  { id: 36, name: 'Slice of Life', russian: 'Повседневность' },
  { id: 30, name: 'Sports', russian: 'Спорт' },
  { id: 37, name: 'Supernatural', russian: 'Сверхъестественное' },
  { id: 40, name: 'Psychological', russian: 'Психологическое' },
  { id: 19, name: 'Music', russian: 'Музыка' },
]

export const ANIME_TYPES = [
  { id: 'all', label: 'Все типы' },
  { id: 'tv', label: 'ТВ Сериал' },
  { id: 'movie', label: 'Фильм' },
  { id: 'ova', label: 'OVA' },
  { id: 'ona', label: 'ONA' },
  { id: 'special', label: 'Спешл' },
]

export const ANIME_STATUSES = [
  { id: 'all', label: 'Все статусы' },
  { id: 'ongoing', label: 'Онгоинг' },
  { id: 'released', label: 'Вышло' },
  { id: 'anons', label: 'Анонс' },
]

export const ANIME_SORT_ORDERS = [
  { id: 'ranked', label: 'По рейтингу' },
  { id: 'popularity', label: 'По популярности' },
  { id: 'name', label: 'По алфавиту' },
  { id: 'aired_on', label: 'По дате выхода' },
  { id: 'episodes', label: 'По сериям' },
  { id: 'random', label: 'Случайно' },
]

export const ANIME_RATINGS = [
  { id: 'all', label: 'Все возрасты' },
  { id: 'none', label: 'Без рейтинга' },
  { id: 'g', label: 'G (Для всех)' },
  { id: 'pg', label: 'PG (Детям)' },
  { id: 'pg_13', label: 'PG-13 (13+)' },
  { id: 'r', label: 'R (17+)' },
  { id: 'r_plus', label: 'R+ (Жестокость)' },
  { id: 'rx', label: 'Rx (Хентай)' },
]

export const MANGA_TYPES = [
  { id: 'all', label: 'Все типы' },
  { id: 'manga', label: 'Манга' },
  { id: 'manhwa', label: 'Манхва' },
  { id: 'manhua', label: 'Маньхуа' },
  { id: 'one_shot', label: 'Ваншот' },
  { id: 'doujin', label: 'Додзинси' },
]

export const MANGA_STATUSES = [
  { id: 'all', label: 'Все статусы' },
  { id: 'ongoing', label: 'Выходит' },
  { id: 'released', label: 'Издано' },
  { id: 'anons', label: 'Анонс' },
  { id: 'paused', label: 'Приостановлено' },
  { id: 'discontinued', label: 'Прекращено' },
]

export const RANOBE_TYPES = [
  { id: 'all', label: 'Все форматы' },
  { id: 'light_novel', label: 'Ранобэ' },
  { id: 'novel', label: 'Новелла' },
]

export const CALENDAR_DAYS = [
  { id: 'monday', name: 'Понедельник', shortName: 'Пн' },
  { id: 'tuesday', name: 'Вторник', shortName: 'Вт' },
  { id: 'wednesday', name: 'Среда', shortName: 'Ср' },
  { id: 'thursday', name: 'Четверг', shortName: 'Чт' },
  { id: 'friday', name: 'Пятница', shortName: 'Пт' },
  { id: 'saturday', name: 'Суббота', shortName: 'Сб' },
  { id: 'sunday', name: 'Воскресенье', shortName: 'Вс' },
]
