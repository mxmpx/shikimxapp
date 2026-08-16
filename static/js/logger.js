(function (global) {
    'use strict';

    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

    class ApiError extends Error {
        constructor(message, status, data = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    const AppLogger = {
        _minLevel: LEVELS[localStorage.getItem('logLevel') || 'debug'] ?? LEVELS.debug,

        setLevel(level) {
            if (LEVELS[level] === undefined) return;
            this._minLevel = LEVELS[level];
            localStorage.setItem('logLevel', level);
            this.info('logger', `Log level set to "${level}"`);
        },

        _emit(level, module, args) {
            if (LEVELS[level] < this._minLevel) return;
            const prefix = `[ShikiMX:${module}]`;
            const fn = level === 'error'
                ? console.error
                : level === 'warn'
                    ? console.warn
                    : level === 'info'
                        ? console.info
                        : console.debug;
            fn(prefix, ...args);
        },

        debug(module, ...args) { this._emit('debug', module, args); },
        info(module, ...args) { this._emit('info', module, args); },
        warn(module, ...args) { this._emit('warn', module, args); },

        error(module, err, context = null) {
            const message = err instanceof Error ? err.message : String(err);
            const payload = context ? [message, context] : [message];
            if (err instanceof Error && err !== message) payload.push(err);
            this._emit('error', module, payload);
        },
    };

    async function apiFetch(url, options = {}) {
        const module = options.module || 'api';
        const fetchOptions = { ...options };
        delete fetchOptions.module;
        delete fetchOptions.silent;

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const start = performance.now();

        AppLogger.debug(module, `${method} ${url}`);

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (err) {
            AppLogger.error(module, err, { url, method, phase: 'network' });
            throw err;
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseErr) {
                AppLogger.warn(module, `Invalid JSON response from ${url}`, parseErr);
            }
        } else if (!response.ok) {
            try {
                data = { error: await response.text() };
            } catch (_) {
                data = null;
            }
        }

        const elapsed = Math.round(performance.now() - start);

        if (!response.ok) {
            const message = (data && data.error) || `HTTP ${response.status}`;
            if (!options.silent) {
                AppLogger.warn(module, `${method} ${url} → ${response.status} (${elapsed}ms)`, message);
            }
            throw new ApiError(message, response.status, data);
        }

        AppLogger.debug(module, `${method} ${url} → ${response.status} (${elapsed}ms)`);
        return data;
    }

    function showFetchError(container, err, fallback = 'Ошибка загрузки') {
        const message = err instanceof ApiError
            ? err.message
            : (err && err.message) || fallback;

        AppLogger.error('ui', err instanceof Error ? err : new Error(message), { fallback });

        if (container) {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${message}</p>`;
        }
        return message;
    }

    function showModalError(body, err, fallback = 'Ошибка загрузки') {
        const message = showFetchError(null, err, fallback);
        if (body) {
            body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${message}</div>`;
        }
        return message;
    }

    window.addEventListener('unhandledrejection', (event) => {
        AppLogger.error('global', event.reason || new Error('Unhandled promise rejection'), {
            type: 'unhandledrejection',
        });
    });

    window.addEventListener('error', (event) => {
        AppLogger.error('global', event.error || new Error(event.message), {
            type: 'error',
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
        });
    });

    global.AppLogger = AppLogger;
    global.ApiError = ApiError;
    global.apiFetch = apiFetch;
    global.showFetchError = showFetchError;
    global.showModalError = showModalError;

    AppLogger.info('logger', 'Initialized', { level: localStorage.getItem('logLevel') || 'debug' });
})(window);
