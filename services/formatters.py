import re
from markupsafe import Markup, escape


def parse_shikimori_bbcode(text: str) -> Markup:
    """Parse Shikimori BBCode tags into sanitized, styled HTML markup."""
    if not text:
        return Markup("")
    escaped_text = str(escape(text))
    escaped_text = re.sub(
        r'\[center\](.*?)\[/center\]',
        r'<div style="text-align: center;">\1</div>',
        escaped_text,
        flags=re.DOTALL
    )
    escaped_text = re.sub(
        r'\[size=(\d{1,3})\](.*?)\[/size\]',
        r'<span style="font-size: \1px;">\2</span>',
        escaped_text,
        flags=re.DOTALL
    )

    def replace_shiki_tag(m):
        tag_type, attr_str = m.group(1), m.group(2)
        ids_match = re.search(r'ids=([\d,]+)', attr_str)
        cols_match = re.search(r'columns=(\d+)', attr_str)
        ids = ids_match.group(1) if ids_match else ''
        ids = re.sub(r'[^0-9,]', '', ids)
        cols = cols_match.group(1) if cols_match else ('8' if tag_type == 'characters' else '5')
        cols = re.sub(r'[^0-9]', '', cols)
        wall_class = ' wall-grid' if 'wall' in attr_str else ''
        return f'<div class="shiki-grid{wall_class}" data-type="{tag_type}" data-ids="{ids}" style="--cols: {cols}"></div>'

    escaped_text = re.sub(r'\[(animes|characters)\s+([^\]]+)\]', replace_shiki_tag, escaped_text)
    return Markup(escaped_text)
