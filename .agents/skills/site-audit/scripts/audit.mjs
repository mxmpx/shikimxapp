#!/usr/bin/env node
/**
 * site-audit runner v2 — обход состояний SPA/сайта + axe-core + DOM-эвристики.
 * Изолированные контексты, реальная эмуляция мобильных устройств, параллельные воркеры,
 * дедупликация, стабильные ID дефектов и генерация структурированного отчёта.
 *
 *   node scripts/audit.mjs
 *   node scripts/audit.mjs --channel chrome --concurrency 2
 *   node scripts/audit.mjs --only catalog --viewport mobile
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/* ---------------- APCA 0.98G Contrast Functions ---------------- */
function sRGBtoY(rgb) {
  const r = Math.pow(rgb[0] / 255, 2.4);
  const g = Math.pow(rgb[1] / 255, 2.4);
  const b = Math.pow(rgb[2] / 255, 2.4);
  return r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
}

function calcAPCA(txtRgb, bgRgb) {
  let txtY = sRGBtoY(txtRgb);
  let bgY = sRGBtoY(bgRgb);
  if (txtY <= 0.022) txtY += Math.pow(0.022 - txtY, 1.414);
  if (bgY <= 0.022) bgY += Math.pow(0.022 - bgY, 1.414);
  if (Math.abs(bgY - txtY) < 0.0005) return 0.0;
  if (bgY > txtY) {
    let SAPC = (Math.pow(bgY, 0.55) - Math.pow(txtY, 0.58)) * 1.14;
    return SAPC < 0.1 ? 0.0 : (SAPC - 0.027) * 100;
  } else {
    let SAPC = (Math.pow(bgY, 0.62) - Math.pow(txtY, 0.57)) * 1.14;
    return SAPC > -0.1 ? 0.0 : (SAPC + 0.027) * 100;
  }
}

function parseCssColor(str) {
  if (!str) return null;
  str = String(str).trim().toLowerCase();
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length >= 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
  }
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return null;
}

const HELP = `site-audit v2 — профессиональный обход UI и сбор дефектов

  node audit.mjs [options]

  --config <file>        JSON с картой состояний (по умолчанию targets.json рядом со скиллом)
  --base <url>           переопределить базовый URL из конфига
  --out <dir>            куда сохранять результаты (по умолчанию ./.audit)
  --only <a,b>           фильтр состояний по подстроке имени
  --viewport <name>      только этот вьюпорт (mobile|tablet|desktop)
  --concurrency <n>      число параллельных потоков браузера (по умолчанию 2, макс 4)
  --channel <name>       использовать системный браузер: chrome | msedge | chromium
  --storage-state <file> путь к файлу авторизационной сессии (cookies/localStorage)
  --no-shots             отключить снятие скриншотов (ускоряет прогон)
  --no-axe               отключить сканирование axe-core (только DOM-эвристики)
  --settle <ms>          пауза стабилизации после шагов, по умолчанию 400 мс
  --state-timeout <ms>   общий таймаут на одно состояние, по умолчанию 35000 мс
  --help, -h             показать эту справку

Формат конфига (targets.json):
{
  "base": "http://localhost:5173",
  "viewports": [
    { "name": "mobile", "width": 390, "height": 844, "dpr": 3 },
    { "name": "tablet", "width": 768, "height": 1024, "dpr": 2 },
    { "name": "desktop", "width": 1440, "height": 900, "dpr": 1 }
  ],
  "states": [
    {
      "name": "catalog",
      "steps": [
        { "action": "click", "selector": ["button:has-text(\\"Каталог\\")", "a[href*=\\"catalog\\"]"] },
        { "action": "expect", "selector": ".card-grid" }
      ]
    }
  ]
}

Шаги: click | hover | fill | press | wait | goto | expect
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = list[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(argv);
const SKILL_DIR = path.resolve(import.meta.dirname, '..');
const configPath = path.resolve(args.config || path.join(SKILL_DIR, 'targets.json'));
const outDir = path.resolve(args.out || '.audit');
const shotsDir = path.join(outDir, 'shots');
const settle = Number(args.settle || 400);
const stateTimeoutMs = Number(args['state-timeout'] || 35000);
const concurrency = Math.max(1, Math.min(4, Number(args.concurrency || 2)));
const storageStatePath = args['storage-state'] ? path.resolve(args['storage-state']) : null;

if (!existsSync(configPath)) {
  console.error(`Нет конфига: ${configPath}\nСкопируй targets.example.json в targets.json и заполни карту состояний.`);
  process.exit(1);
}

const config = JSON.parse((await readFile(configPath, 'utf8')).replace(/^\uFEFF/, ''));
const base = args.base || config.base;
if (!base) {
  console.error('Не указан base (ни в конфиге, ни в --base)');
  process.exit(1);
}

const viewports = (config.viewports || [
  { name: 'mobile', width: 390, height: 844, dpr: 3 },
  { name: 'tablet', width: 768, height: 1024, dpr: 2 },
  { name: 'desktop', width: 1440, height: 900, dpr: 1 },
]).filter((v) => !args.viewport || v.name === args.viewport);

const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const shots = !args['no-shots'];
const channel = args.channel || config.channel || undefined;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'Не установлен playwright.\n  npm i -D playwright @axe-core/playwright\n  npx playwright install chromium',
  );
  process.exit(1);
}

let AxeBuilder = null;
if (!args['no-axe']) {
  try {
    ({ AxeBuilder } = await import('@axe-core/playwright'));
  } catch {
    console.warn('! @axe-core/playwright не найден — a11y-проверки пропущены (npm i -D @axe-core/playwright)');
  }
}

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'state';

const generateStableId = (rule, selector, message) => {
  const normSel = String(selector || '').trim().replace(/\s+/g, ' ');
  const normRule = String(rule || '').trim().toLowerCase();
  const rawKey = `${normRule}|${normSel}|${String(message || '').slice(0, 40)}`;
  const hash = createHash('md5').update(rawKey).digest('hex').slice(0, 6);
  return `A-${hash}`;
};

const estimateEffort = (rule, severity) => {
  if (rule.includes('color-contrast') || rule.includes('select-name') || rule.includes('tap-target')) return 'S';
  if (rule.includes('horizontal-scroll') || rule.includes('heading-order') || rule.includes('console-error')) return 'M';
  if (severity === 'P1') return 'M';
  return 'S';
};

const stateList = (config.states || []).filter(
  (s) => !only || only.some((o) => s.name.toLowerCase().includes(o.toLowerCase())),
);

if (!stateList.length) {
  console.error('В конфиге нет состояний (states) после фильтрации.');
  process.exit(1);
}

await mkdir(shotsDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* DOM-эвристики. Функция сериализуется в браузер — без внешних ссылок. */
/* ------------------------------------------------------------------ */
function domChecks(isTouchDevice) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const issues = [];
  const LIMIT = 8;

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    if (el.classList.contains('sr-only') || el.classList.contains('visually-hidden')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const selectorOf = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part = `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const cls = (node.className && typeof node.className === 'string' && node.className.trim())
        ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      if (cls) part += `.${cls}`;
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const textOf = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

  const push = (rule, severity, message, selector, extra) => {
    issues.push({ rule, severity, message, selector, ...(extra || {}) });
  };

  // 1. Горизонтальный скролл (единое строгое правило для всех вьюпортов)
  const maxScrollWidth = Math.max(
    document.documentElement.scrollWidth || 0,
    document.body ? document.body.scrollWidth : 0
  );
  if (maxScrollWidth > vw + 1) {
    push(
      'horizontal-scroll',
      'P1',
      `Страница шире вьюпорта: ${maxScrollWidth}px > ${vw}px`,
      'html',
    );
  }

  const clippedByAncestor = (el) => {
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const s = getComputedStyle(parent);
      if (/(hidden|auto|scroll|clip)/.test(s.overflowX) || /(hidden|auto|scroll|clip)/.test(s.overflow)) return true;
      parent = parent.parentElement;
    }
    return false;
  };

  // 2. Вылезающие за границы элементы
  const overflowing = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.position === 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 || r.left < -2) {
      if (clippedByAncestor(el)) continue;
      overflowing.push({ sel: selectorOf(el), left: Math.round(r.left), right: Math.round(r.right) });
      if (overflowing.length >= LIMIT) break;
    }
  }
  for (const o of overflowing) {
    push('element-overflow', 'P2', `Элемент выходит за вьюпорт: ${o.left}…${o.right}px при ширине ${vw}px`, o.sel);
  }

  // 3. Мелкие тач-таргеты (проверяются только для мобильных и планшетов с touch)
  if (isTouchDevice) {
    const rawTargets = [];
    const groupedChips = new Map();

    for (const el of document.querySelectorAll('a,button,[role="button"],input[type="checkbox"],input[type="radio"],select,summary')) {
      if (!visible(el)) continue;
      // Исключаем инлайн-ссылки внутри предложений и абзацев (строгое исключение WCAG 2.5.8 Inline Exemption)
      const s = getComputedStyle(el);
      if (s.display === 'inline') continue;
      if (el.closest('.b-text_with_paragraphs, p, blockquote')) continue;

      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);

      // WCAG 2.5.8 AA строгий минимум — 24×24px
      if (w < 24 || h < 24) {
        rawTargets.push({ sel: selectorOf(el), w, h, area: w * h, text: textOf(el), isCritical: true });
      } else if (w < 44 || h < 44) {
        // Компактные кнопки/чипы (24..43px)
        const parent = el.parentElement;
        if (parent && parent.children.length > 2) {
          const parentSel = selectorOf(parent);
          if (!groupedChips.has(parentSel)) {
            groupedChips.set(parentSel, {
              sel: `${parentSel} > ${el.tagName.toLowerCase()}`,
              count: 1,
              minW: w,
              minH: h,
            });
          } else {
            const grp = groupedChips.get(parentSel);
            grp.count++;
            grp.minW = Math.min(grp.minW, w);
            grp.minH = Math.min(grp.minH, h);
          }
        } else {
          rawTargets.push({ sel: selectorOf(el), w, h, area: w * h, text: textOf(el), isCritical: false });
        }
      }
    }

    // 1. Критически мелкие (< 24px)
    const critical = rawTargets.filter((t) => t.isCritical).sort((a, b) => a.area - b.area);
    for (const t of critical.slice(0, LIMIT)) {
      push(
        'tap-target-critical',
        'P2',
        `Критически мелкий тач-таргет (< 24px WCAG 2.5.8): ${t.w}×${t.h} "${t.text}"`,
        t.sel,
      );
    }

    // 2. Сгруппированные компактные чипы (одна запись на группу вместо спама сотней строк)
    for (const [, grp] of groupedChips.entries()) {
      if (grp.count > 1) {
        push(
          'compact-chips',
          'P3',
          `Компактные чипы/фильтры (${grp.minW}×${grp.minH}px, ${grp.count} шт., стандарт ≥24px соблюдён)`,
          grp.sel,
        );
      }
    }

    // 3. Одиночные кнопки с рекомендацией Apple HIG (>= 44px)
    const advisory = rawTargets.filter((t) => !t.isCritical).sort((a, b) => a.area - b.area);
    for (const t of advisory.slice(0, 3)) {
      push(
        'tap-target-advisory',
        'P3',
        `Рекомендация Apple HIG (≥44×44): ${t.w}×${t.h} "${t.text}"`,
        t.sel,
      );
    }
  }

  // 4. Слишком мелкий шрифт
  const smallText = [];
  for (const el of document.querySelectorAll('p,span,a,li,label,button,td,th,div')) {
    if (!visible(el) || !textOf(el)) continue;
    if (el.querySelector('p,span,a,li,label,button,div')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs && fs < 11.5) smallText.push({ sel: selectorOf(el), fs, text: textOf(el) });
    if (smallText.length >= LIMIT) break;
  }
  for (const t of smallText) {
    push('tiny-text', 'P3', `Слишком мелкий шрифт: ${t.fs}px "${t.text}"`, t.sel);
  }

  // 5. Битые картинки
  const broken = [...document.images].filter((img) => img.complete && img.naturalWidth === 0);
  for (const img of broken.slice(0, LIMIT)) {
    push('broken-image', 'P1', `Битое изображение: ${img.currentSrc || img.src}`, selectorOf(img));
  }

  // 6. Обрезанный текст
  const clipped = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,div,li,a,button')) {
    if (!visible(el) || !textOf(el)) continue;
    if (el.children.length) continue;
    const s = getComputedStyle(el);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    if (s.textOverflow === 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      clipped.push({ sel: selectorOf(el), text: textOf(el) });
      if (clipped.length >= LIMIT) break;
    }
  }
  for (const c of clipped) push('clipped-text', 'P2', `Обрезанный текст без ellipsis: "${c.text}"`, c.sel);

  // 7. Технический мусор в UI
  const badText = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 50) continue;
    if (/\b(undefined|null|NaN|\[object Object\])\b/.test(t)) badText.push({ sel: selectorOf(el), text: t });
    if (badText.length >= LIMIT) break;
  }
  for (const b of badText) push('bad-text', 'P2', `Технический мусор в интерфейсе: "${b.text}"`, b.sel);

  // 8. Перехват кликов оверлеями
  const intercepted = [];
  const activeDialog = document.querySelector('[role="dialog"], .mobile-sheet-backdrop, .modal-backdrop, .mobile-search-overlay');
  for (const el of document.querySelectorAll('a,button,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"])')) {
    if (!visible(el)) continue;
    // Если открыто модальное окно/диалог, элементы фоновой страницы за бэкдропом изолированы по стандарту доступности
    if (activeDialog && !activeDialog.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.top < 0 || r.left < 0 || r.bottom > vh || r.right > vw) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || top === el || el.contains(top)) continue;
    
    // Игнорируем инструменты отладки (agentation)
    const tag = top.tagName.toLowerCase();
    const cls = top.className && typeof top.className === 'string' ? top.className : '';
    if (tag.includes('agentation') || cls.includes('agentation') || top.closest('agentation-toolbar')) continue;

    const desc = `${tag}${cls ? '.' + cls.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    intercepted.push({
      sel: selectorOf(el),
      text: textOf(el).slice(0, 30),
      by: desc,
    });
    if (intercepted.length >= LIMIT) break;
  }
  for (const i of intercepted) {
    push('pointer-intercepted', 'P1', `Клик по «${i.text}» перехватывает ${i.by} — элемент не нажимается`, i.sel);
  }

  return { issues, viewport: `${vw}x${vh}`, scrollHeight: document.documentElement.scrollHeight };
}

/* ------------------------------------------------------------------ */

const attachNetworkAndConsole = (page, sink) => {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Download the React DevTools/i.test(text)) return;
    if (/favicon\.ico/i.test(text)) return;
    sink.console.push(text.slice(0, 400));
  });
  page.on('pageerror', (err) => sink.pageErrors.push(String(err.message || err).slice(0, 400)));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (/favicon\.ico|agentation|localhost:4747|chrome-extension:\/\/|googletagmanager/i.test(url)) return;
    if (req.resourceType() === 'image' && !url.startsWith(base)) return;
    sink.failed.push(`${req.method()} ${url} — ${req.failure()?.errorText || 'failed'}`);
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (/favicon\.ico|agentation|localhost:4747/i.test(url)) return;
    const type = res.request().resourceType();
    if (!['document', 'script', 'stylesheet', 'image', 'xhr', 'fetch'].includes(type)) return;
    sink.failed.push(`${res.status()} ${type} ${url}`);
  });
};

const runSteps = async (page, steps = [], sink) => {
  const tryAll = async (candidates, fn) => {
    // 1. Быстрая проверка видимости элементов среди кандидатов
    for (const candidate of candidates) {
      try {
        const loc = page.locator(candidate);
        if (await loc.count() > 0) {
          const isVis = await loc.first().isVisible().catch(() => false);
          if (isVis) {
            await fn(candidate);
            return;
          }
        }
      } catch {
        // переходим к следующему селектору
      }
    }
    // 2. Если ни один не видим сразу, пробуем фильтр :visible
    for (const candidate of candidates) {
      try {
        const visLoc = page.locator(`${candidate}:visible`);
        if (await visLoc.count() > 0) {
          await fn(`${candidate}:visible`);
          return;
        }
      } catch {}
    }
    // 3. Если ни один селектор не найден сразу, пробуем первый с кратким таймаутом для детализации ошибки
    if (candidates.length > 0) {
      await fn(candidates[0]);
    }
  };

  for (const step of steps) {
    const action = step.action || 'click';
    const candidates = Array.isArray(step.selector) ? step.selector : [step.selector].filter(Boolean);
    const label = Array.isArray(step.selector) ? step.selector.join(' | ') : step.selector || step.url || step.ms || '';

    try {
      if (action === 'click') {
        await tryAll(candidates, async (sel) => {
          try {
            await page.locator(sel).first().click({ timeout: 4000 });
          } catch (clickErr) {
            // Фиксируем pointer-intercepted в момент отказа стандартного клика
            sink.pointerFailures.push({
              selector: sel,
              error: clickErr.message.split('\n')[0],
            });
            // Аварийный dispatch через evaluate чтобы продолжить выполнение сценария
            await page.locator(sel).first().evaluate((el) => {
              el.scrollIntoView({ block: 'center' });
              el.click();
            });
          }
        });
      } else if (action === 'expect' || action === 'assert') {
        const waitTimeout = Number(step.timeout || 6000);
        await Promise.any(
          candidates.map((sel) => page.locator(sel).first().waitFor({ state: 'visible', timeout: waitTimeout })),
        );
      } else if (action === 'hover') {
        await tryAll(candidates, (sel) => page.locator(sel).first().hover({ timeout: 4000 }));
      } else if (action === 'fill') {
        await tryAll(candidates, (sel) => page.locator(sel).first().fill(step.value ?? '', { timeout: 4000 }));
      } else if (action === 'press') {
        await tryAll(candidates.length ? candidates : ['body'], (sel) =>
          page.locator(sel).first().press(step.key || 'Enter', { timeout: 4000 }),
        );
      } else if (action === 'wait') {
        await page.waitForTimeout(Number(step.ms || 500));
      } else if (action === 'goto') {
        await page.goto(new URL(step.url, base).href, { timeout: 20000 });
      } else {
        throw new Error(`неизвестное действие: ${action}`);
      }
      await page.waitForTimeout(Number(step.pause ?? 200));
    } catch (err) {
      throw new Error(`шаг "${action} ${label}" не выполнен: ${err.message.split('\n')[0]}`);
    }
  }
};

const issues = [];
const coverage = [];
const seen = new Map();

const addIssue = (issue) => {
  const normSel = String(issue.selector || '').trim();
  const id = generateStableId(issue.rule, normSel, issue.message);
  const found = seen.get(id);

  if (found) {
    if (!found.pages.includes(issue.page)) found.pages.push(issue.page);
    if (issue.viewport && !found.viewports.includes(issue.viewport)) found.viewports.push(issue.viewport);
    return;
  }

  const effort = estimateEffort(issue.rule, issue.severity);
  const record = {
    id,
    pages: [issue.page],
    viewports: issue.viewport ? [issue.viewport] : [],
    effort,
    ...issue,
  };
  delete record.page;
  delete record.viewport;
  seen.set(id, record);
  issues.push(record);
};

/* ---------------------------- crawl ------------------------------- */
if (config.crawl?.enabled) {
  const maxPages = Number(args['max-pages'] || config.crawl.maxPages || 20);
  const maxDepth = Number(config.crawl.maxDepth || 1);
  const exclude = (config.crawl.exclude || []).map((p) => new RegExp(p));
  const browser0 = await chromium.launch({ ...(channel ? { channel } : {}) });
  const ctx0 = await browser0.newContext();
  const p0 = await ctx0.newPage();
  const queue = [{ url: base, depth: 0 }];
  const visited = new Set();
  const found = [];

  while (queue.length && found.length < maxPages) {
    const { url, depth } = queue.shift();
    if (visited.has(url) || depth > maxDepth) continue;
    visited.add(url);
    try {
      await p0.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p0.waitForTimeout(300);
      if (!exclude.some((r) => r.test(new URL(url).pathname))) {
        found.push({ url, depth, title: (await p0.title()).trim() });
      }
      const links = await p0.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith('http')),
      );
      const origin = new URL(base).origin;
      for (const href of links) {
        const clean = href.split('#')[0];
        if (!clean.startsWith(origin) || visited.has(clean)) continue;
        if (/\.(png|jpe?g|svg|pdf|zip|mp4|css|js|webp|avif|woff2?)$/i.test(clean)) continue;
        queue.push({ url: clean, depth: depth + 1 });
      }
    } catch (err) {
      console.warn(`crawl: пропуск ${url} — ${err.message.split('\n')[0]}`);
    }
  }
  await browser0.close();
  for (const f of found) {
    const u = new URL(f.url);
    stateList.push({ name: `url:${u.pathname}`, url: f.url, steps: [], _crawled: true });
  }
  console.log(`crawl: найдено ${found.length} URL`);
}

/* ---------------------------- run -------------------------------- */
console.log(`base: ${base}`);
console.log(`состояний: ${stateList.length} × вьюпортов: ${viewports.length}`);
console.log(`axe: ${AxeBuilder ? 'включён' : 'выключен'}`);
console.log(`параллельность: ${concurrency} потока(ов)`);

const browser = await chromium.launch({ ...(channel ? { channel } : {}) });

// Формируем плоский список всех задач (состояние × вьюпорт)
const taskQueue = [];
for (const state of stateList) {
  for (const vp of viewports) {
    if (state.viewports && !state.viewports.includes(vp.name)) continue;
    taskQueue.push({ state, vp });
  }
}

let completedCount = 0;
const totalTasks = taskQueue.length;

async function executeTask(task) {
  const { state, vp } = task;
  const isMobile = vp.name === 'mobile' || (vp.width && vp.width < 600);
  const isTablet = vp.name === 'tablet' || (vp.width && vp.width >= 600 && vp.width < 1024);
  const isTouchDevice = isMobile || isTablet;

  // Изолированный контекст на каждую пару состояние × вьюпорт
  const contextOpts = {
    viewport: { width: vp.width, height: vp.height },
    isMobile: Boolean(isMobile),
    hasTouch: Boolean(isTouchDevice),
    deviceScaleFactor: vp.dpr || (isMobile ? 3 : isTablet ? 2 : 1),
    ignoreHTTPSErrors: true,
  };

  if (storageStatePath && existsSync(storageStatePath)) {
    contextOpts.storageState = storageStatePath;
  }

  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  const sink = { console: [], pageErrors: [], failed: [], pointerFailures: [] };
  attachNetworkAndConsole(page, sink);

  let error = null;
  let shot = null;
  const started = Date.now();

  const runWithTimeout = async () => {
    await page.goto(state.url ? new URL(state.url, base).href : base, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await runSteps(page, state.steps, sink);
    await page.waitForTimeout(settle);
  };

  try {
    await Promise.race([
      runWithTimeout(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Превышен лимит времени состояния (${stateTimeoutMs} мс)`)), stateTimeoutMs),
      ),
    ]);
  } catch (err) {
    error = err.message.split('\n')[0];
  }

  if (!error) {
    // 1. Выполнение DOM-эвристик
    try {
      const dom = await page.evaluate(domChecks, isTouchDevice);
      for (const i of dom.issues) {
        addIssue({ ...i, page: state.name, viewport: vp.name });
      }
    } catch (err) {
      error = `DOM-проверки: ${err.message.split('\n')[0]}`;
    }

    // 2. Сканирование Axe-core с калиброванной шкалой приоритетов
    if (AxeBuilder) {
      try {
        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();

        for (const v of axe.violations) {
          let severity = 'P2';
          if (v.id === 'color-contrast') {
            const nodes = v.nodes.slice(0, 3);
            for (const node of nodes) {
              let apcaLc = null;
              const data = node.any?.[0]?.data;
              if (data) {
                const fg = parseCssColor(data.fgColor);
                const bg = parseCssColor(data.bgColor);
                if (fg && bg) {
                  apcaLc = Math.abs(Math.round(calcAPCA(fg, bg)));
                }
              }

              // Если перцептивный контраст по APCA Lc >= 60 (для основного текста)
              // или Lc >= 45 (для вспомогательного/вторичного текста):
              // это достаточная человеческая читаемость в тёмной теме, не шумим в P2.
              if (apcaLc !== null && apcaLc >= 60) {
                continue;
              }

              let severity = 'P2';
              let apcaNote = '';
              if (apcaLc !== null) {
                if (apcaLc >= 45) {
                  severity = 'P3';
                  apcaNote = ` [APCA Lc ${apcaLc} ≥ 45: допустимо для вторичного текста]`;
                } else if (apcaLc < 30) {
                  severity = 'P1';
                  apcaNote = ` [APCA Lc ${apcaLc} < 30: критически неразличимо]`;
                } else {
                  severity = 'P2';
                  apcaNote = ` [APCA Lc ${apcaLc} < 45: слабый контраст]`;
                }
              }

              addIssue({
                rule: 'axe:color-contrast',
                severity,
                message: `${v.help}${apcaNote}`,
                selector: (node.target || []).join(' '),
                helpUrl: v.helpUrl,
                page: state.name,
                viewport: vp.name,
              });
            }
            continue;
          } else if (['heading-order', 'page-has-heading-one'].includes(v.id)) {
            severity = 'P2';
          } else if (['critical', 'serious'].includes(v.impact)) {
            severity = 'P1';
          } else if (v.impact === 'minor') {
            severity = 'P3';
          }

          const nodes = v.nodes.slice(0, 3);
          for (const node of nodes) {
            addIssue({
              rule: `axe:${v.id}`,
              severity,
              message: `${v.help}${v.nodes.length > 1 ? ` (+${v.nodes.length - 1})` : ''}`,
              selector: (node.target || []).join(' '),
              helpUrl: v.helpUrl,
              page: state.name,
              viewport: vp.name,
            });
          }
        }
      } catch (err) {
        addIssue({
          rule: 'axe-failed',
          severity: 'P3',
          message: `axe не отработал: ${err.message.split('\n')[0]}`,
          selector: 'axe',
          page: state.name,
          viewport: vp.name,
        });
      }
    }
  }

  // 3. Создание чистого скриншота с отключенными CSS-анимациями (стабильность кадра)
  if (shots) {
    shot = `shots/${slug(state.name)}-${vp.name}.png`;
    try {
      await page.screenshot({
        path: path.join(outDir, shot),
        fullPage: true,
        timeout: 15000,
        animations: 'disabled',
      });
    } catch {
      shot = null;
    }
  }

  // 4. Активные интерактивные UX-проверки (Live UX Heuristics)
  if (!error) {
    try {
      // a) Cumulative Layout Shift (CLS)
      const cls = await page.evaluate(() => {
        let total = 0;
        try {
          const list = performance.getEntriesByType('layout-shift');
          for (const e of list) {
            if (!e.hadRecentInput) total += e.value;
          }
        } catch {}
        return total;
      });
      if (cls > 0.1) {
        addIssue({
          rule: 'high-cls',
          severity: 'P2',
          message: `Высокий сдвиг макета при загрузке (CLS: ${cls.toFixed(3)} > 0.10, визуальное дёрганье)`,
          selector: 'viewport',
          page: state.name,
          viewport: vp.name,
        });
      }

      // b) Проверка живого поведения модальных окон
      const modalInfo = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], .modal-backdrop, .mobile-sheet-backdrop, .mobile-search-overlay');
        if (!d) return null;
        const bodyLocked = getComputedStyle(document.body).overflow === 'hidden';
        const hasCloseBtn = Boolean(d.querySelector('button[aria-label*="акрыть"], button[aria-label*="close" i], button.touch-btn i.ti-x, .mobile-sheet-handle'));
        const dialogSel = d.className ? `.${d.className.trim().split(/\s+/)[0]}` : '[role="dialog"]';
        return { dialogSel, bodyLocked, hasCloseBtn };
      });

      if (modalInfo) {
        if (!modalInfo.bodyLocked) {
          addIssue({
            rule: 'modal-body-scroll-leak',
            severity: 'P2',
            message: 'При открытом модальном окне не заблокирован скролл фона (body overflow != hidden)',
            selector: modalInfo.dialogSel,
            page: state.name,
            viewport: vp.name,
          });
        }
        if (!modalInfo.hasCloseBtn) {
          addIssue({
            rule: 'modal-missing-close-button',
            severity: 'P2',
            message: 'В модальном окне отсутствует явная и доступная кнопка закрытия',
            selector: modalInfo.dialogSel,
            page: state.name,
            viewport: vp.name,
          });
        }

        // Проверка закрытия по Escape
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          const stillOpen = await page.evaluate(() => {
            const d = document.querySelector('[role="dialog"], .modal-backdrop, .mobile-sheet-backdrop');
            return d ? (getComputedStyle(d).display !== 'none' && getComputedStyle(d).visibility !== 'hidden') : false;
          });
          if (stillOpen) {
            addIssue({
              rule: 'modal-escape-dismiss',
              severity: 'P2',
              message: 'Модальное окно не закрывается при нажатии Escape (нарушение доступности клавиатуры)',
              selector: modalInfo.dialogSel,
              page: state.name,
              viewport: vp.name,
            });
          }
        } catch {}
      }
    } catch {}
  }

  // 5. Регистрация перехватов кликов и консольных/сетевых ошибок
  for (const pf of sink.pointerFailures) {
    addIssue({
      rule: 'pointer-intercepted',
      severity: 'P1',
      message: `Отказ клика по селектору ${pf.selector} (${pf.error})`,
      selector: pf.selector,
      page: state.name,
      viewport: vp.name,
    });
  }

  for (const text of sink.console) {
    addIssue({
      rule: 'console-error',
      severity: 'P1',
      message: `Ошибка в консоли: ${text}`,
      selector: 'console',
      page: state.name,
      viewport: vp.name,
    });
  }
  for (const text of sink.pageErrors) {
    addIssue({
      rule: 'page-error',
      severity: 'P1',
      message: `Необработанное исключение: ${text}`,
      selector: 'window.onerror',
      page: state.name,
      viewport: vp.name,
    });
  }
  for (const text of sink.failed.slice(0, 8)) {
    addIssue({
      rule: 'http-error',
      severity: 'P1',
      message: `Упавший запрос: ${text}`,
      selector: 'network',
      page: state.name,
      viewport: vp.name,
    });
  }
  if (error) {
    addIssue({
      rule: 'state-unreachable',
      severity: 'P1',
      message: `Состояние не открылось: ${error}`,
      selector: 'state',
      page: state.name,
      viewport: vp.name,
    });
  }

  if (shot) {
    for (const issue of issues) {
      if (!issue.shot && issue.pages.includes(state.name) && issue.viewports.includes(vp.name)) {
        issue.shot = shot;
      }
    }
  }

  coverage.push({
    state: state.name,
    viewport: vp.name,
    ok: !error,
    shot,
    ms: Date.now() - started,
  });

  await page.close().catch(() => {});
  await context.close().catch(() => {});

  completedCount++;
  console.log(`[${completedCount}/${totalTasks}] ${state.name} @${vp.name} … ${error ? 'ОШИБКА: ' + error : 'ok'}`);
}

// Пул параллельных воркеров
const workerPool = Array.from({ length: concurrency }, async () => {
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) await executeTask(task);
  }
});

await Promise.all(workerPool);
await browser.close();

/* --------------------------- report ------------------------------ */

const order = { P1: 0, P2: 1, P3: 2 };
issues.sort((a, b) => order[a.severity] - order[b.severity] || a.rule.localeCompare(b.rule));

const counts = { P1: 0, P2: 0, P3: 0 };
for (const i of issues) counts[i.severity] = (counts[i.severity] || 0) + 1;

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// Формирование ТОП-5 дефектов
const top5Issues = issues.slice(0, 5).map((iss, idx) => `${idx + 1}) [${iss.severity}] ${iss.message} (\`${iss.selector}\`)`);

const defectsTable = [
  '| ID | P | Состояния | Где | Проблема | Селектор | Усилие | Скрин |',
  '|---|---|---|---|---|---|:---:|:---:|',
  ...issues.map(
    (i) =>
      `| **${i.id}** | **${i.severity}** | ${esc(i.pages.join(', '))}${i.viewports?.length ? ` (${i.viewports.join('/')})` : ''} | ${esc(i.rule)} | ${esc(i.message)} | \`${esc(i.selector)}\` | ${i.effort} | ${i.shot ? `[png](${i.shot})` : '—'} |`,
  ),
].join('\n');

const axeViolations = issues.filter((i) => i.rule.startsWith('axe:'));
const axeTable = axeViolations.length
  ? [
      '| Правило Axe | Приоритет | Селектор | Затронуто состояний | Ссылка на документацию |',
      '|---|:---:|---|:---:|---|',
      ...axeViolations.map(
        (a) =>
          `| \`${a.rule}\` | ${a.severity} | \`${esc(a.selector)}\` | ${a.pages.length} | ${a.helpUrl ? `[WCAG Doc](${a.helpUrl})` : '—'} |`,
      ),
    ].join('\n')
  : '_Нарушений спецификаций Axe-core не обнаружено._';

const md = `# Отчёт UI/UX и Accessibility аудита — ${new URL(base).host || base}

Дата: ${new Date().toISOString().slice(0, 10)}  
Базовый URL: \`${base}\`  
Вьюпорты: ${viewports.map((v) => `${v.name} (${v.width}×${v.height})`).join(', ')}  
Axe-core: ${AxeBuilder ? 'включён (WCAG 2.2 AA)' : 'выключен'}  
Параллельность: ${concurrency} потока(ов)

---

## 1. Сводка результатов

| Приоритет | Количество | Значение |
|---|:---:|---|
| **P1 — Blocker** | **${counts.P1}** | Критические дефекты, ошибки JS/сети, поломка мобильного вида |
| **P2 — Major** | **${counts.P2}** | Существенные проблемы эргономики и доступности |
| **P3 — Minor** | **${counts.P3}** | Мелкие шероховатости интерфейса и полировка |
| **Покрытие** | **${coverage.filter((c) => c.ok).length} / ${coverage.length}** | Успешно протестировано состояний |

${top5Issues.length ? `### Топ-5 дефектов для первоочередного исправления:\n${top5Issues.join('\n')}` : ''}

---

## 2. Детальный реестр дефектов

${defectsTable || '_Дефектов не найдено._'}

---

## 3. Покрытие матрицы состояний

| Состояние | Вьюпорт | Открылось | Время | Скриншот |
|---|---|:---:|---:|:---:|
${coverage
  .map(
    (c) =>
      `| ${esc(c.state)} | ${c.viewport} | ${c.ok ? '✅ да' : '❌ НЕТ'} | ${c.ms} мс | ${c.shot ? `[png](${c.shot})` : '—'} |`,
  )
  .join('\n')}

---

## 4. Приложение: Сводка нарушений Axe-core

${axeTable}

---

## 5. Ограничения прогона

- Автоматика покрывает разметку, контрастность, селекторы и геометрию DOM.
- Пустые состояния, поведение клавиатурного фокуса (Focus Trap, Esc), микрокопия и сложные многошаговые сценарии проверяются по чеклисту \`references/checklist.md\`.
- Скриншоты сохранены в: \`${shotsDir}\`.
`;

await writeFile(path.join(outDir, 'audit.json'), JSON.stringify({ base, viewports, coverage, issues }, null, 2), 'utf8');
await writeFile(path.join(outDir, 'report.md'), md, 'utf8');

console.log(`\nГотово! P1=${counts.P1} P2=${counts.P2} P3=${counts.P3}`);
console.log(`Отчёт: ${path.join(outDir, 'report.md')}`);
console.log(`JSON:  ${path.join(outDir, 'audit.json')}`);
