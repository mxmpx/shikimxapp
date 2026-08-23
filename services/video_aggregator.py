import os
import re
import time
import difflib
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from importlib import import_module
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("shikimxapp.video")

STREAM_CACHE = {}
STREAM_CACHE_MAX_ENTRIES = 200
_STREAM_CACHE_CLEANUP_INTERVAL = 300
_last_stream_cache_cleanup = 0


def _cleanup_stream_cache(force=False):
    global _last_stream_cache_cleanup
    now = time.time()
    if not force and now - _last_stream_cache_cleanup < _STREAM_CACHE_CLEANUP_INTERVAL:
        return
    _last_stream_cache_cleanup = now
    expired = [k for k, (_, exp) in STREAM_CACHE.items() if now >= exp]
    for k in expired:
        del STREAM_CACHE[k]
    if len(STREAM_CACHE) > STREAM_CACHE_MAX_ENTRIES:
        sorted_items = sorted(STREAM_CACHE.items(), key=lambda x: x[1][1])
        keep = dict(sorted_items[-STREAM_CACHE_MAX_ENTRIES:])
        STREAM_CACHE.clear()
        STREAM_CACHE.update(keep)

AVAILABLE_ANICLI_MODULES = [
    'animego',
    'yummy_anime',
    'anilibria',
    'anilibme'
]

_ROMAN_MAP = {'i': 1, 'v': 5, 'x': 10, 'l': 50}

_STOPWORDS = {
    'the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'is', 'are',
    'wa', 'ni', 'de', 'wo', 'ga', 'no', 'to', 'kara', 'desu', 'san', 'kun', 'chan',
    'sama', 'senpai', 'sensei', 'kun', 'chan', 'san'
}

def roman_to_int(s: str) -> int:
    s = s.lower()
    total = 0
    prev = 0
    for ch in reversed(s):
        val = _ROMAN_MAP.get(ch, 0)
        if val < prev:
            total -= val
        else:
            total += val
        prev = val
    return total

def clean_title(title: str) -> str:
    """Нормализация названия для сравнения."""
    if not title:
        return ""
    t = title.lower()
    # Раскрываем римские цифры
    t = re.sub(r'\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b', lambda m: str(roman_to_int(m.group(1))), t)
    # Убираем содержимое скобок
    t = re.sub(r'\[.*?\]|\(.*?\)', ' ', t)
    # Нормализуем формы сезонов: "2nd Season", "2-й сезон" -> "сезон 2"
    t = re.sub(r'(\d+)(?:-й|-й|\s*nd|\s*rd|\s*th)\s*(?:season|сезон)?', r' сезон \1 ', t)
    # Оставляем только буквы, цифры и пробелы
    t = re.sub(r'[^a-zа-яё0-9\s]', ' ', t)
    return ' '.join(t.split())

def clean_translation_name(trans: str) -> str:
    if not trans:
        return "Основной перевод"
    t = re.sub(r'^[^\w]+', '', str(trans), flags=re.UNICODE).strip()
    return t or str(trans).strip()

def is_valid_embed_player_url(url_str: str) -> bool:
    if not url_str or url_str.strip() in ("_", ""):
        return False
    u_lower = url_str.lower()
    
    # Блокируем домены с анти-ботом (Anubis/Cloudflare iframe block) и сырые API-ссылки
    blocked_patterns = [
        "aniboom",
        "hdrezka",
        "api.animevost",
        "sameband.studio",
        "dreamcast"
    ]
    if any(p in u_lower for p in blocked_patterns):
        return False

    # Разрешаем проверенные iframe-плееры
    valid_patterns = [
        "kodik",
        "sibnet",
        "aksor",
        "cdn-iframe",
        "yummyani.me/iframe",
        "player",
        "embed",
        "/video/"
    ]
    if any(p in u_lower for p in valid_patterns):
        return True

    # Проверяем, что это не просто главная страница сайта без пути
    path_part = re.sub(r'^https?://[^/]+', '', url_str).strip('/')
    if not path_part:
        return False

    return True

def extract_season_num(text: str) -> int:
    """Извлечение номера сезона из названия. Возвращает 1, если сезон не указан."""
    if not text:
        return 1
    t = ' ' + text.lower() + ' '

    # Явные маркеры сезона / части
    m = re.search(r'(?:season|сезон|tv series|тв сериал)[\s:—–-]*(\d+)', t)
    if m:
        return int(m.group(1))

    m = re.search(r'(?:part|часть)[\s:—–-]*(\d+)', t)
    if m:
        return int(m.group(1))

    # Порядковые числительные с сезоном
    m = re.search(r'(\d+)(?:-й|-й|\s*nd|\s*rd|\s*th)\s*(?:season|сезон)', t)
    if m:
        return int(m.group(1))

    # Римские цифры как отдельные слова
    m = re.search(r'\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b', t)
    if m:
        return roman_to_int(m.group(1))

    # Цифра 2-9 в конце многословного названия (часто номер сезона/сиквела)
    words = t.split()
    if len(words) >= 3:
        m = re.search(r'\b([2-9])\s*$', t)
        if m:
            return int(m.group(1))

    return 1

def match_score(target_title: str, candidate_title: str) -> float:
    """
    Расчёт схожести названий на основе токенов и символов.
    Учитывает сезон, штрафует за различие в сезонах.
    """
    c_target = clean_title(target_title)
    c_cand = clean_title(candidate_title)
    if not c_target or not c_cand:
        return 0.0

    target_season = extract_season_num(target_title)
    cand_season = extract_season_num(candidate_title)
    season_penalty = 0.45 if target_season != cand_season else 0.0

    # Token-based Jaccard similarity
    t_tokens = set(c_target.split()) - _STOPWORDS
    c_tokens = set(c_cand.split()) - _STOPWORDS
    if not t_tokens or not c_tokens:
        return 0.0

    intersection = t_tokens & c_tokens
    union = t_tokens | c_tokens
    jaccard = len(intersection) / len(union) if union else 0.0

    # Coverage of the smaller title
    min_tokens = min(len(t_tokens), len(c_tokens))
    coverage = len(intersection) / min_tokens if min_tokens else 0.0

    # Character-level similarity
    char_sim = difflib.SequenceMatcher(None, c_target, c_cand).ratio()

    # Weighted score: coverage (subset match) and Jaccard are most important
    score = 0.35 * jaccard + 0.40 * coverage + 0.25 * char_sim

    # Boost for abbreviations / short forms: candidate fully contained in target
    if coverage >= 0.999 and len(c_tokens) <= len(t_tokens):
        score = max(score, 0.60 + 0.40 * jaccard)

    # Prefix + suffix anchor match with enough shared tokens
    # (same series with translated middle part, e.g. Kaguya-sama ... Ultra Romantic)
    def first_word(words):
        for w in words:
            if w not in _STOPWORDS:
                return w
        return words[0] if words else ''
    def last_word(words):
        for w in reversed(words):
            if w not in _STOPWORDS:
                return w
        return words[-1] if words else ''

    t_words = c_target.split()
    c_words = c_cand.split()
    if len(t_words) > 1 and len(c_words) > 1:
        prefix_match = first_word(t_words) == first_word(c_words)
        suffix_match = last_word(t_words) == last_word(c_words)
        if prefix_match and suffix_match and len(intersection) >= 3:
            score = max(score, 0.70 + 0.15 * jaccard)

    # Penalty for extra tokens in candidate (often indicates sequel/spinoff)
    if len(c_tokens) > len(t_tokens):
        surplus = len(c_tokens) - len(t_tokens)
        score *= max(0.55, 1.0 - 0.18 * surplus)

    # Length penalty: mild, less strict for valid abbreviations
    max_len = max(len(c_target), len(c_cand))
    len_ratio = min(len(c_target), len(c_cand)) / max_len if max_len else 0
    if coverage >= 0.85:
        score *= (0.90 + 0.10 * len_ratio)
    elif coverage >= 0.5:
        score *= (0.85 + 0.15 * len_ratio)
    else:
        score *= (0.70 + 0.30 * len_ratio)

    return max(0.0, score - season_penalty)

def get_best_match_score(target_titles: list, candidate_title: str) -> float:
    scores = [match_score(t, candidate_title) for t in target_titles if t]
    return max(scores) if scores else 0.0


class VideoAggregator:
    def __init__(self):
        self.kodik_token = os.getenv("KODIK_TOKEN")
        self.extractors = {}
        self._init_extractors()

    def _init_extractors(self):
        for mod_name in AVAILABLE_ANICLI_MODULES:
            try:
                mod = import_module(f"anicli_api.source.{mod_name}")
                extractor_cls = getattr(mod, "Extractor", None)
                if extractor_cls:
                    self.extractors[mod_name] = extractor_cls
            except Exception as e:
                logger.warning("Could not load anicli source %s: %s", mod_name, e)

    def fetch_kodik_direct(self, shikimori_id: int, target_titles: list) -> dict:
        token = self.kodik_token or os.getenv("KODIK_API_KEY")
        if not token:
            logger.debug("Kodik token not configured — skipping direct API")
            return {}

        hosts = ["https://kodik-api.com/search", "https://kodikapi.com/search"]
        data = None

        for host in hosts:
            try:
                # 1. Поиск по shikimori_id
                r = requests.get(host, params={
                    "token": token,
                    "shikimori_id": str(shikimori_id),
                    "with_episodes": "true",
                    "with_material_data": "true"
                }, timeout=4)
                if r.status_code == 200:
                    resp_json = r.json()
                    if resp_json.get("results"):
                        data = resp_json
                        break
            except Exception:
                continue

        if not data and target_titles:
            logger.debug("Kodik shikimori_id lookup failed for %s, fallback to title search: %s", shikimori_id, target_titles[0])
            for host in hosts:
                try:
                    r = requests.get(host, params={
                        "token": token,
                        "title": target_titles[0],
                        "with_episodes": "true"
                    }, timeout=4)
                    if r.status_code == 200:
                        resp_json = r.json()
                        if resp_json.get("results"):
                            data = resp_json
                            break
                except Exception:
                    continue

        if not data or not data.get("results"):
            return {}

        episodes_map = {}
        total_eps = 0

        for res in data.get("results", []):
            translation_info = res.get("translation") or {}
            trans_title = clean_translation_name(translation_info.get("title") or "Оригинал")
            
            seasons = res.get("seasons", {})
            if seasons:
                # Сериалы
                for s_num, s_data in seasons.items():
                    eps = s_data.get("episodes", {})
                    for ep_num, ep_link in eps.items():
                        ep_key = str(ep_num)
                        if ep_key not in episodes_map:
                            episodes_map[ep_key] = {}
                        if trans_title not in episodes_map[ep_key]:
                            episodes_map[ep_key][trans_title] = []
                        
                        full_url = ep_link if ep_link.startswith("http") else f"https:{ep_link}"
                        episodes_map[ep_key][trans_title].append({
                            "player": "Kodik",
                            "url": full_url,
                            "source": "kodik_api"
                        })
                        total_eps = max(total_eps, int(ep_num) if ep_num.isdigit() else 1)
            else:
                # Полнометражный фильм / OVA
                link = res.get("link")
                if link:
                    ep_key = "1"
                    if ep_key not in episodes_map:
                        episodes_map[ep_key] = {}
                    if trans_title not in episodes_map[ep_key]:
                        episodes_map[ep_key][trans_title] = []
                    
                    full_url = link if link.startswith("http") else f"https:{link}"
                    episodes_map[ep_key][trans_title].append({
                        "player": "Kodik",
                        "url": full_url,
                        "source": "kodik_api"
                    })
                    total_eps = max(total_eps, 1)

        return {
            "source_name": "Kodik API",
            "episodes": episodes_map,
            "total_episodes": total_eps
        }

    def _process_episodes(self, mod_name: str, anime) -> dict:
        episodes = anime.get_episodes()
        if not episodes:
            return {}

        episodes_map = {}
        for ep_idx, ep in enumerate(episodes, start=1):
            ep_key = str(ep_idx)
            try:
                sources = ep.get_sources()
            except Exception:
                continue

            for src in sources:
                url = getattr(src, 'url', None) or getattr(src, 'player', None)
                url_str = str(url).strip() if url else ""

                if not is_valid_embed_player_url(url_str):
                    continue

                raw_trans = (
                    getattr(src, 'title', None) or
                    getattr(src, 'translation', None) or
                    getattr(src, 'name', None) or
                    f"Озвучка ({mod_name})"
                )
                trans_title = clean_translation_name(str(raw_trans))

                # Определение типа плеера
                u_lower = url_str.lower()
                if "kodik" in u_lower:
                    player_name = "Kodik"
                elif "sibnet" in u_lower:
                    player_name = "Sibnet"
                elif "aksor" in u_lower:
                    player_name = "Aksor TV"
                elif "cdn-iframe" in u_lower:
                    player_name = "AnimeGo CDN"
                elif "anilib" in u_lower or mod_name == "anilibria":
                    player_name = "AniLibria"
                elif "yummyani" in u_lower:
                    player_name = "Yummy Player"
                elif "animelib" in u_lower or mod_name == "anilibme":
                    player_name = "AnimeLib"
                else:
                    player_name = mod_name.capitalize()

                if ep_key not in episodes_map:
                    episodes_map[ep_key] = {}
                if trans_title not in episodes_map[ep_key]:
                    episodes_map[ep_key][trans_title] = []

                # Избегаем дублей URL
                if not any(item["url"] == url_str for item in episodes_map[ep_key][trans_title]):
                    episodes_map[ep_key][trans_title].append({
                        "player": player_name,
                        "url": url_str,
                        "source": mod_name
                    })

        return {
            "source_name": mod_name,
            "episodes": episodes_map,
            "total_episodes": len(episodes)
        }

    def fetch_single_anicli_source(self, mod_name: str, titles: list, expected_episodes: int = None) -> dict:
        extractor_cls = self.extractors.get(mod_name)
        if not extractor_cls:
            return {}

        try:
            extractor = extractor_cls()
            search_results = []
            seen_titles = set()

            # Поиск по всем доступным названиям, собираем все уникальные результаты
            for query in titles:
                if not query or len(query.strip()) < 2:
                    continue
                try:
                    res = extractor.search(query.strip())
                    if not res:
                        continue
                    for cand in res:
                        cand_title = getattr(cand, "title", None) or getattr(cand, "name", None) or str(cand)
                        if cand_title and cand_title not in seen_titles:
                            seen_titles.add(cand_title)
                            search_results.append(cand)
                except Exception:
                    continue

            if not search_results:
                return {}

            # Поиск лучшего совпадения через Fuzzy Matcher
            scored_candidates = []
            for cand in search_results:
                cand_title = getattr(cand, "title", None) or getattr(cand, "name", None) or str(cand)
                score = get_best_match_score(titles, cand_title)
                if score >= 0.60:
                    scored_candidates.append((score, cand, cand_title))

            if not scored_candidates:
                logger.debug("No good fuzzy match for %s in titles %s", mod_name, titles[:3])
                return {}

            scored_candidates.sort(key=lambda x: x[0], reverse=True)

            # Пробуем кандидатов по порядку, проверяя episode count и alternateName
            for best_score, best_cand, best_title in scored_candidates:
                try:
                    anime = best_cand.get_anime()
                    raw_json = getattr(anime, "raw_json", None)

                    # Проверка по alternateName и name из raw_json
                    if isinstance(raw_json, dict):
                        for field in ("alternateName", "name"):
                            alt_name = raw_json.get(field)
                            if alt_name:
                                alt_score = get_best_match_score(titles, alt_name)
                                if alt_score > best_score:
                                    best_score = alt_score
                                    logger.debug("Re-scored %s via %s: %.3f", mod_name, field, alt_score)

                    # Проверка episode count
                    if expected_episodes and isinstance(raw_json, dict):
                        candidate_eps = raw_json.get("numberOfEpisodes")
                        if candidate_eps is not None:
                            try:
                                cand_eps = int(candidate_eps)
                                exp_eps = int(expected_episodes)
                                if exp_eps > 0 and abs(cand_eps - exp_eps) > max(2, int(exp_eps * 0.2)):
                                    logger.debug(
                                        "Episode count mismatch for %s: expected %s, got %s ('%s')",
                                        mod_name, exp_eps, cand_eps, best_title
                                    )
                                    continue
                            except (ValueError, TypeError):
                                pass

                    if best_score < 0.60:
                        logger.debug("Score too low after validation for %s: %.3f", mod_name, best_score)
                        continue

                    logger.info("Best fuzzy match for %s: '%s' score=%.3f", mod_name, best_title, best_score)

                    result = self._process_episodes(mod_name, anime)
                    if result:
                        return result
                except Exception as e:
                    logger.debug("Error validating candidate '%s' for %s: %s", best_title, mod_name, e)
                    continue

            logger.debug("No valid candidate passed validation for %s", mod_name)
            return {}
        except Exception as e:
            logger.warning("Error in anicli extractor %s: %s", mod_name, e)
            return {}

    def get_aggregated_streams(self, anime_id: int, titles: list, expected_episodes: int = None) -> dict:
        cache_key = f"anime_stream_{anime_id}"
        now = time.time()
        _cleanup_stream_cache()

        if cache_key in STREAM_CACHE:
            cached_data, expire = STREAM_CACHE[cache_key]
            if now < expire:
                return cached_data

        merged_episodes = {}
        sources_found = set()
        max_episodes = 0

        # Пул параллельных задач
        tasks = []
        with ThreadPoolExecutor(max_workers=6) as executor:
            # 1. Kodik Direct
            tasks.append(executor.submit(self.fetch_kodik_direct, anime_id, titles))
            
            # 2. Пул anicli парсеров с валидными iframe плеерами
            for mod_name in self.extractors.keys():
                tasks.append(executor.submit(self.fetch_single_anicli_source, mod_name, titles, expected_episodes))

            try:
                for future in as_completed(tasks, timeout=12):
                    try:
                        res = future.result(timeout=1)
                        if not res or not res.get("episodes"):
                            continue

                        source_label = res.get("source_name", "Unknown")
                        sources_found.add(source_label)
                        max_episodes = max(max_episodes, res.get("total_episodes", 0))

                        # Объединяем серии и переводы
                        for ep_num, translations in res["episodes"].items():
                            if ep_num not in merged_episodes:
                                merged_episodes[ep_num] = {}

                            for trans_name, player_list in translations.items():
                                if trans_name not in merged_episodes[ep_num]:
                                    merged_episodes[ep_num][trans_name] = []

                                for p in player_list:
                                    if not any(existing["url"] == p["url"] for existing in merged_episodes[ep_num][trans_name]):
                                        merged_episodes[ep_num][trans_name].append(p)

                    except Exception as e:
                        logger.warning("Video aggregation task failed: %s", e)
            except Exception as e:
                logger.warning("Video aggregation timeout or error: %s", e)

        # Сортировка зеркал: Kodik, Aksor TV, Sibnet, AnimeGo CDN всегда первыми
        priority_order = {"Kodik": 1, "Aksor TV": 2, "AnimeGo CDN": 3, "Sibnet": 4, "AniLibria": 5}
        
        sorted_episodes = {}
        for ep_key in sorted(merged_episodes.keys(), key=lambda x: int(x) if x.isdigit() else 9999):
            sorted_episodes[ep_key] = {}
            for trans_name, players in merged_episodes[ep_key].items():
                sorted_players = sorted(players, key=lambda p: priority_order.get(p.get("player"), 10))
                sorted_episodes[ep_key][trans_name] = sorted_players

        payload = {
            "episodes": sorted_episodes,
            "total_episodes": max_episodes or len(sorted_episodes),
            "sources_found": list(sources_found)
        }

        if sorted_episodes:
            STREAM_CACHE[cache_key] = (payload, now + 14400) # 4 часа TTL

        return payload


video_aggregator = VideoAggregator()
