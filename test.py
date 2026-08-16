from anicli_api.source.animego import Extractor

e = Extractor()
res = e.search("Date A Live II")

if res:
    anime = res[0].get_anime()
    eps = anime.get_episodes()
    print(f"Всего серий: {len(eps)}")
    
    sources = eps[2].get_sources() # 3-я серия
    for s in sources:
        name = getattr(s, 'name', 'Источник')
        url = getattr(s, 'url', 'N/A')
        print(f"[{name}] -> {url}")
else:
    print("Ничего не найдено")
    