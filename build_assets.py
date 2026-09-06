import os
import re
import hashlib
import logging

logger = logging.getLogger("shikimxapp.assets")

CSS_FILES = [
    'css/fonts.css',
    'css/tabler-icons.min.css',
    'css/main.css',
    'css/profile.css',
    'css/rates.css',
    'css/explore.css',
    'css/media.css',
    'css/anime.css',
    'css/manga.css',
    'css/friends.css',
    'css/settings.css'
]

JS_FILES = [
    'js/logger.js',
    'js/translations.js',
    'js/core.js',
    'js/anime.js',
    'js/manga.js',
    'js/friends.js',
    'js/profile.js',
    'js/history.js',
    'js/favourites.js',
    'js/rates.js',
    'js/explore.js',
    'js/portal_modules.js',
    'js/settings.js'
]

MOBILE_CSS_FILES = [
    'css/mobile.css'
]

MOBILE_JS_FILES = [
    'js/mobile.js'
]

def minify_css(css_text):
    """Strip comments and unnecessary whitespace from CSS."""
    # Remove CSS comments
    css_text = re.sub(r'/\*[\s\S]*?\*/', '', css_text)
    # Strip whitespace per line and omit empty lines
    lines = []
    for line in css_text.splitlines():
        line = line.strip()
        if line:
            lines.append(line)
    res = "\n".join(lines)
    # Collapse spaces around symbols safely
    res = re.sub(r'\s*([\{\}\;\:\,])\s*', r'\1', res)
    res = re.sub(r'\;\}', '}', res)
    return res


def minify_js(js_text):
    """Strip comments and empty lines from JS safely without breaking syntax."""
    # Strip multi-line comments
    js_text = re.sub(r'/\*[\s\S]*?\*/', '', js_text)
    # Strip single-line comments and trailing spaces
    lines = []
    for line in js_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('//'):
            continue
        lines.append(line.rstrip())
    return "\n".join(lines)


def build_bundles(app_root):
    static_dir = os.path.join(app_root, 'static')
    bundle_css_path = os.path.join(static_dir, 'bundle.css')
    bundle_js_path = os.path.join(static_dir, 'bundle.js')
    mobile_css_path = os.path.join(static_dir, 'mobile.css')
    mobile_js_path = os.path.join(static_dir, 'mobile.js')
    sw_path = os.path.join(static_dir, 'sw.js')

    # Bundle CSS
    css_parts = []
    for fname in CSS_FILES:
        filepath = os.path.join(static_dir, fname)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as infile:
                css_parts.append(infile.read() + "\n\n")

    full_css = minify_css("".join(css_parts))
    with open(bundle_css_path, 'w', encoding='utf-8') as outfile:
        outfile.write(full_css)

    # Bundle JS
    js_parts = []
    for fname in JS_FILES:
        filepath = os.path.join(static_dir, fname)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as infile:
                js_parts.append(infile.read() + "\n;\n")

    full_js = minify_js("".join(js_parts))
    with open(bundle_js_path, 'w', encoding='utf-8') as outfile:
        outfile.write(full_js)

    # Bundle Mobile CSS
    mobile_css_parts = []
    for fname in MOBILE_CSS_FILES:
        filepath = os.path.join(static_dir, fname)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as infile:
                mobile_css_parts.append(infile.read() + "\n\n")
    full_mobile_css = minify_css("".join(mobile_css_parts))
    with open(mobile_css_path, 'w', encoding='utf-8') as outfile:
        outfile.write(full_mobile_css)

    # Bundle Mobile JS
    mobile_js_parts = []
    for fname in MOBILE_JS_FILES:
        filepath = os.path.join(static_dir, fname)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as infile:
                mobile_js_parts.append(infile.read() + "\n;\n")
    full_mobile_js = minify_js("".join(mobile_js_parts))
    with open(mobile_js_path, 'w', encoding='utf-8') as outfile:
        outfile.write(full_mobile_js)

    # Automatically compute hash of all asset contents to version Service Worker
    content_hasher = hashlib.md5()
    content_hasher.update(full_css.encode('utf-8'))
    content_hasher.update(full_js.encode('utf-8'))
    content_hasher.update(full_mobile_css.encode('utf-8'))
    content_hasher.update(full_mobile_js.encode('utf-8'))
    bundle_hash = content_hasher.hexdigest()[:8]
    cache_version = f"shikimx-v2-{bundle_hash}"

    if os.path.exists(sw_path):
        with open(sw_path, 'r', encoding='utf-8') as f:
            sw_content = f.read()

        new_sw_content = re.sub(
            r"const\s+CACHE_NAME\s*=\s*['\"].*?['\"];",
            f"const CACHE_NAME = '{cache_version}';",
            sw_content,
            count=1
        )

        if new_sw_content != sw_content:
            with open(sw_path, 'w', encoding='utf-8') as f:
                f.write(new_sw_content)
            logger.info("Updated Service Worker cache version to: %s", cache_version)
        else:
            logger.debug("Service Worker cache version is up to date: %s", cache_version)

    return cache_version

if __name__ == '__main__':
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ver = build_bundles(current_dir)
    print(f"Bundles generated successfully. Active cache: {ver}")

