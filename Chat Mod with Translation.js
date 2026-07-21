// ==UserScript==
// @name         Chat Mod with Translation v2.0
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Transparent chat styling, real-time contrast-aware text color, and chat/input translation. Dual-engine (Google + Microsoft) racing, player-name translation, and a language-change indicator. [\] translate, [_] settings.
// @author       Lumos & vyrin
// @match        *://narrow.one/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      translate.googleapis.com
// @connect      api-edge.cognitive.microsofttranslator.com
// @connect      edge.microsoft.com
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234a90d9'%3E%3Cpath d='M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l4.1-2.3c.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z'/%3E%3C/svg%3E
// ==/UserScript==

/*
Originally by N1CNmod. Translation & adaptive-color features by Lumos.
v2.0: dual-engine racing (Google + Microsoft), player-name translation,
      and a "language changed" indicator — engine work by vyrin, integrated & trimmed.

Credit to N1CNmod for the original UI code! (https://github.com/N1CNmod/narrowone-mod)
Shared with love for the Narrow.One community :)
*/

/* eslint-disable no-console */
(function () {
    'use strict';

    const TAG = '[N1CT]';
    const PW = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const VERSION = '2.0';

    /* ============================================================
     * ★ 사용자 설정 구역 ★
     * "Translating…" 라벨의 기본 위치.
     * ============================================================ */
    const INDICATOR_DEFAULT = {
        left: '50%',    // 가로: 화면 중앙
        bottom: '13%',  // 세로: 화면 아래에서 13%
        fontSize: '17px'
    };

    /* ============================================================
     * DOM 셀렉터 (narrow.one 실측 구조)
     *   .chat-log-container
     *     └ .chat-message-container
     *         └ .chat-message-content
     *             ├ h3.chat-message-name   ← 닉네임
     *             └ div                    ← 메시지 본문
     * ============================================================ */
    const SEL_LOG = '.chat-log-container';
    const SEL_MSG = '.chat-message-container';
    const SEL_BODY = '.chat-message-content';
    const SEL_LINE = '.chat-message-content > div';
    const SEL_NAME = '.chat-message-content > h3.chat-message-name';
    const SEL_INPUT = 'input.chat-input';
    const SEL_TEXT = SEL_LINE + ', ' + SEL_NAME + ', ' + SEL_INPUT; // 적응형 색상 대상

    /* ============================================================
     * 0. WebGL canvas patch (게임이 컨텍스트를 만들기 전에 실행되어야 함)
     *    적응형 색상이 배경 픽셀을 읽으려면 preserveDrawingBuffer 필요.
     * ============================================================ */
    (function patchCanvas() {
        try {
            const proto = PW.HTMLCanvasElement.prototype;
            const orig = proto.getContext;
            const hook = function (type, attrs) {
                if (/webgl/i.test(String(type))) {
                    attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
                }
                return orig.call(this, type, attrs);
            };
            if (typeof exportFunction === 'function') proto.getContext = exportFunction(hook, PW);
            else proto.getContext = hook;
            console.log(TAG, 'canvas readback enabled');
        } catch (e) {
            console.warn(TAG, 'canvas patch failed -> outline fallback', e);
        }
    })();

    /* ============================================================
     * 1. Config
     * ============================================================ */
    const CFG_KEY = 'n1ct_config_v2';
    const DEFAULTS = {
        myLang: (navigator.language || 'en').split('-')[0],
        friendLang: 'en',
        adaptive: true,
        autoTranslate: false,   // 기본 꺼짐
        translateNames: false,  // 닉네임 번역 (친구 기능, opt-in)
        showLangChange: true,   // 감지 언어가 바뀔 때만 언어 표시 (신규 규칙)
        indicator: null         // {x,y} 뷰포트 비율. null이면 기본 위치
    };
    let cfg = Object.assign({}, DEFAULTS);
    try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { /* ignore */ }
    const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };

    /* ============================================================
     * 2. Language table (영어 언어명 + 국가 별칭으로 검색)
     * ============================================================ */
    const LANGS = [
        { c: 'en', n: 'English', a: ['england', 'united kingdom', 'uk', 'usa', 'united states', 'america', 'australia', 'canada', 'ireland', 'new zealand'] },
        { c: 'ko', n: 'Korean', a: ['korea', 'south korea'] },
        { c: 'ja', n: 'Japanese', a: ['japan'] },
        { c: 'zh-CN', n: 'Chinese (Simplified)', a: ['china', 'mainland china', 'prc'] },
        { c: 'zh-TW', n: 'Chinese (Traditional)', a: ['taiwan', 'hong kong'] },
        { c: 'fr', n: 'French', a: ['france', 'belgium', 'quebec', 'senegal', 'ivory coast', 'switzerland'] },
        { c: 'de', n: 'German', a: ['germany', 'austria', 'switzerland'] },
        { c: 'es', n: 'Spanish', a: ['spain', 'mexico', 'argentina', 'colombia', 'chile', 'peru', 'venezuela', 'cuba'] },
        { c: 'pt', n: 'Portuguese', a: ['portugal', 'brazil', 'angola', 'mozambique'] },
        { c: 'it', n: 'Italian', a: ['italy'] },
        { c: 'ru', n: 'Russian', a: ['russia', 'belarus', 'kazakhstan'] },
        { c: 'uk', n: 'Ukrainian', a: ['ukraine'] },
        { c: 'pl', n: 'Polish', a: ['poland'] },
        { c: 'nl', n: 'Dutch', a: ['netherlands', 'holland', 'belgium', 'flanders'] },
        { c: 'tr', n: 'Turkish', a: ['turkey', 'turkiye'] },
        { c: 'ar', n: 'Arabic', a: ['saudi arabia', 'egypt', 'uae', 'iraq', 'morocco', 'algeria', 'jordan', 'qatar'] },
        { c: 'he', n: 'Hebrew', a: ['israel'] },
        { c: 'hi', n: 'Hindi', a: ['india'] },
        { c: 'bn', n: 'Bengali', a: ['bangladesh'] },
        { c: 'ur', n: 'Urdu', a: ['pakistan'] },
        { c: 'id', n: 'Indonesian', a: ['indonesia'] },
        { c: 'ms', n: 'Malay', a: ['malaysia', 'brunei'] },
        { c: 'th', n: 'Thai', a: ['thailand'] },
        { c: 'vi', n: 'Vietnamese', a: ['vietnam'] },
        { c: 'tl', n: 'Filipino', a: ['philippines', 'tagalog'] },
        { c: 'sv', n: 'Swedish', a: ['sweden'] },
        { c: 'no', n: 'Norwegian', a: ['norway'] },
        { c: 'da', n: 'Danish', a: ['denmark'] },
        { c: 'fi', n: 'Finnish', a: ['finland'] },
        { c: 'is', n: 'Icelandic', a: ['iceland'] },
        { c: 'cs', n: 'Czech', a: ['czechia', 'czech republic'] },
        { c: 'sk', n: 'Slovak', a: ['slovakia'] },
        { c: 'hu', n: 'Hungarian', a: ['hungary'] },
        { c: 'ro', n: 'Romanian', a: ['romania', 'moldova'] },
        { c: 'bg', n: 'Bulgarian', a: ['bulgaria'] },
        { c: 'el', n: 'Greek', a: ['greece', 'cyprus'] },
        { c: 'sr', n: 'Serbian', a: ['serbia'] },
        { c: 'hr', n: 'Croatian', a: ['croatia'] },
        { c: 'bs', n: 'Bosnian', a: ['bosnia', 'herzegovina'] },
        { c: 'sl', n: 'Slovenian', a: ['slovenia'] },
        { c: 'mk', n: 'Macedonian', a: ['north macedonia'] },
        { c: 'sq', n: 'Albanian', a: ['albania', 'kosovo'] },
        { c: 'lt', n: 'Lithuanian', a: ['lithuania'] },
        { c: 'lv', n: 'Latvian', a: ['latvia'] },
        { c: 'et', n: 'Estonian', a: ['estonia'] },
        { c: 'fa', n: 'Persian', a: ['iran', 'farsi'] },
        { c: 'ps', n: 'Pashto', a: ['afghanistan'] },
        { c: 'ka', n: 'Georgian', a: ['georgia'] },
        { c: 'hy', n: 'Armenian', a: ['armenia'] },
        { c: 'az', n: 'Azerbaijani', a: ['azerbaijan'] },
        { c: 'kk', n: 'Kazakh', a: ['kazakhstan'] },
        { c: 'uz', n: 'Uzbek', a: ['uzbekistan'] },
        { c: 'mn', n: 'Mongolian', a: ['mongolia'] },
        { c: 'ne', n: 'Nepali', a: ['nepal'] },
        { c: 'si', n: 'Sinhala', a: ['sri lanka'] },
        { c: 'my', n: 'Myanmar (Burmese)', a: ['myanmar', 'burma'] },
        { c: 'km', n: 'Khmer', a: ['cambodia'] },
        { c: 'lo', n: 'Lao', a: ['laos'] },
        { c: 'sw', n: 'Swahili', a: ['kenya', 'tanzania', 'uganda'] },
        { c: 'am', n: 'Amharic', a: ['ethiopia'] },
        { c: 'af', n: 'Afrikaans', a: ['south africa'] },
        { c: 'zu', n: 'Zulu', a: ['south africa'] },
        { c: 'ta', n: 'Tamil', a: ['india', 'sri lanka'] },
        { c: 'te', n: 'Telugu', a: ['india'] },
        { c: 'ml', n: 'Malayalam', a: ['india'] },
        { c: 'mr', n: 'Marathi', a: ['india'] },
        { c: 'gu', n: 'Gujarati', a: ['india'] },
        { c: 'pa', n: 'Punjabi', a: ['india', 'pakistan'] },
        { c: 'ca', n: 'Catalan', a: ['catalonia', 'spain', 'andorra'] },
        { c: 'eu', n: 'Basque', a: ['spain'] },
        { c: 'gl', n: 'Galician', a: ['spain'] },
        { c: 'ga', n: 'Irish', a: ['ireland'] },
        { c: 'cy', n: 'Welsh', a: ['wales'] },
        { c: 'la', n: 'Latin', a: ['vatican', 'rome'] },
        { c: 'eo', n: 'Esperanto', a: [] },
        { c: 'yi', n: 'Yiddish', a: [] },
        { c: 'ha', n: 'Hausa', a: ['nigeria', 'niger'] },
        { c: 'yo', n: 'Yoruba', a: ['nigeria'] },
        { c: 'ig', n: 'Igbo', a: ['nigeria'] },
        { c: 'so', n: 'Somali', a: ['somalia'] },
        { c: 'mt', n: 'Maltese', a: ['malta'] },
        { c: 'lb', n: 'Luxembourgish', a: ['luxembourg'] },
        { c: 'be', n: 'Belarusian', a: ['belarus'] },
        { c: 'ky', n: 'Kyrgyz', a: ['kyrgyzstan'] },
        { c: 'tg', n: 'Tajik', a: ['tajikistan'] },
        { c: 'tk', n: 'Turkmen', a: ['turkmenistan'] },
        { c: 'ku', n: 'Kurdish', a: ['kurdistan'] },
        { c: 'haw', n: 'Hawaiian', a: ['hawaii'] },
        { c: 'mi', n: 'Maori', a: ['new zealand'] },
        { c: 'sm', n: 'Samoan', a: ['samoa'] },
        { c: 'jw', n: 'Javanese', a: ['indonesia', 'java'] },
        { c: 'su', n: 'Sundanese', a: ['indonesia'] },
        { c: 'ceb', n: 'Cebuano', a: ['philippines'] }
    ];
    const langByCode = (code) => LANGS.find(l => l.c.toLowerCase() === String(code).toLowerCase()) || null;
    const langName = (code) => (langByCode(code) || { n: code }).n;
    const baseCode = (code) => String(code || '').toLowerCase().split('-')[0];

    function searchLangs(q) {
        q = q.trim().toLowerCase();
        if (!q) return LANGS.slice(0, 8);
        const scored = [];
        for (const l of LANGS) {
            const name = l.n.toLowerCase();
            let s = -1;
            if (l.c.toLowerCase() === q) s = 0;
            else if (name.startsWith(q)) s = 1;
            else if (name.includes(q)) s = 2;
            else if (l.a.some(x => x.startsWith(q))) s = 3;
            else if (l.a.some(x => x.includes(q))) s = 4;
            if (s >= 0) scored.push([s, l]);
        }
        scored.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n));
        return scored.slice(0, 8).map(x => x[1]);
    }

    /* ============================================================
     * 3. Translation backend — Google + Microsoft 병렬 경쟁 (racing)
     *    두 엔진에 동시에 요청 → 먼저 "성공"한 응답을 채택.
     *    한쪽이 다운되어도 사용자는 못 느낌 (가용성 확보).
     * ============================================================ */
    const cache = new Map();

    // 공통 요청 헬퍼 (GET/POST, anonymous=쿠키 미포함으로 프라이버시 보호)
    function gmRequest(url, opts = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: opts.method || 'GET',
                url,
                headers: opts.headers || {},
                data: opts.data || undefined,
                timeout: opts.timeout || 8000,
                anonymous: true,
                onload: r => (r.status >= 200 && r.status < 300)
                    ? resolve(r.responseText)
                    : reject(new Error('HTTP ' + r.status)),
                onerror: () => reject(new Error('network error')),
                ontimeout: () => reject(new Error('timeout'))
            });
        });
    }

    // --- 엔진 A: Google gtx (API 키 불필요, 요청 1회) ---
    async function translateGoogle(text, target) {
        const url = 'https://translate.googleapis.com/translate_a/single'
            + '?client=gtx&sl=auto&tl=' + encodeURIComponent(target)
            + '&dt=t&q=' + encodeURIComponent(text);
        const raw = await gmRequest(url, { timeout: 6000 });
        const data = JSON.parse(raw);
        const out = (data[0] || []).map(s => (s && s[0]) ? s[0] : '').join('');
        return { text: out || text, detected: data[2] || 'auto' };
    }

    // --- 엔진 B: Microsoft (Edge/Bing 무료 엔드포인트, 토큰 필요) ---
    // 주의: 비공식 엔드포인트라 MS가 막으면 이 엔진만 실패한다.
    //       그래도 racing 덕분에 Google이 받아주므로 전체 번역은 계속 동작함.
    const MS_LANG_MAP = { 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'tl': 'fil', 'jw': 'jv', 'no': 'nb' };
    const MS_LANG_REVERSE = { 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', 'fil': 'tl', 'jv': 'jw', 'nb': 'no' };
    const toMicrosoftLang = c => MS_LANG_MAP[c] || c;
    const fromMicrosoftLang = c => MS_LANG_REVERSE[c] || c;

    const MS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0';
    let msToken = null, msTokenExpiry = 0;

    async function getMicrosoftToken() {
        const now = Date.now();
        if (msToken && now < msTokenExpiry) return msToken;  // 8분 캐싱된 토큰 재사용
        const token = await gmRequest('https://edge.microsoft.com/translate/auth', {
            method: 'GET',
            headers: { 'User-Agent': MS_UA, 'Origin': 'https://www.bing.com', 'Referer': 'https://www.bing.com/' },
            timeout: 6000
        });
        if (!token || token.length < 20) throw new Error('Microsoft: bad token');
        msToken = token;
        msTokenExpiry = now + 8 * 60 * 1000;  // 토큰 유효(~10분)보다 짧게 잡아 안전 마진
        return msToken;
    }

    async function translateMicrosoft(text, target) {
        const msTarget = toMicrosoftLang(target);
        const token = await getMicrosoftToken();
        const url = 'https://api-edge.cognitive.microsofttranslator.com/translate'
            + '?api-version=3.0&to=' + encodeURIComponent(msTarget);
        const raw = await gmRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'User-Agent': MS_UA,
                'Origin': 'https://www.bing.com',
                'Referer': 'https://www.bing.com/'
            },
            data: JSON.stringify([{ Text: text }]),
            timeout: 6000
        });
        const data = JSON.parse(raw);
        if (!Array.isArray(data) || !data[0]) throw new Error('Microsoft: empty response');
        const item = data[0];
        const translated = (item.translations && item.translations[0]) ? item.translations[0].text : text;
        const detected = (item.detectedLanguage && item.detectedLanguage.language)
            ? fromMicrosoftLang(item.detectedLanguage.language) : 'auto';
        return { text: translated, detected };
    }

    // Promise.any 폴리필 (구형 브라우저 대응): 하나라도 성공하면 즉시 반환, 전부 실패해야 reject
    function promiseAny(promises) {
        if (typeof Promise.any === 'function') return Promise.any(promises);
        return new Promise((resolve, reject) => {
            const errors = []; let count = 0;
            for (const p of promises) {
                Promise.resolve(p).then(resolve).catch(e => {
                    errors.push(e);
                    if (++count === promises.length) reject(new Error('all engines failed'));
                });
            }
        });
    }

    async function translateText(text, target) {
        const key = target + '\u0000' + text;
        if (cache.has(key)) return cache.get(key);
        const result = await promiseAny([
            translateGoogle(text, target),
            translateMicrosoft(text, target)
        ]);
        cache.set(key, result);
        if (cache.size > 600) cache.delete(cache.keys().next().value);
        return result;
    }

    // 동시 요청 수 제한 (슬라이딩 윈도우): 한 번에 최대 limit개만 처리
    async function mapLimit(items, limit, fn) {
        let i = 0;
        await Promise.all(new Array(Math.min(limit, items.length)).fill(0).map(async () => {
            while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
        }));
    }

    /* ============================================================
     * 4. Styles  (★ 채팅 UI·라벨·설정창·아이콘 모두 원본 디자인 그대로 ★)
     * ============================================================ */
    function applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ---------- 원본 transparent chat mod ---------- */
.chat-log-container {
  font-size: 20pt !important;
  padding: 0px !important;
  overflow: hidden !important;
  max-height: min(800px, 50vh) !important;
  max-width: min(800px, 50vw) !important;
}
.chat-container {
  padding: 0px !important;
  background: none !important;
  position: absolute !important;
  left: 20px !important;
  bottom: 70px !important;
  transform: none !important;
}
.chat-input { font-size: 15pt !important; padding: 0px !important; }
.chat-message-name { font-size: 12pt !important; }
input::placeholder {
  font-family: Ubuntu !important;
  font-size: 14px !important;
  text-transform: capitalize;
  visibility: hidden;
}
.chat-container.wrinkledPaper.up,
input.dialog-text-input.wrinkledPaper.chat-input,
.chat-message-container,
.chat-message-content { padding: 0px !important; background: none !important; }

/* ---------- 적응형 색상 (줄 단위) ---------- */
${SEL_TEXT} {
  color: var(--n1ct-fg, #ffffff) !important;
  text-shadow:
     0 0 3px var(--n1ct-halo, rgba(0,0,0,.95)),
     0 0 6px var(--n1ct-halo, rgba(0,0,0,.75)),
     1px 1px 0 var(--n1ct-halo, rgba(0,0,0,.55)) !important;
  transition: color .18s linear, text-shadow .18s linear;
}
/* 캔버스를 못 읽을 때: 흰 글씨 + 강한 외곽선 */
body.n1ct-fallback ${SEL_LINE},
body.n1ct-fallback ${SEL_NAME},
body.n1ct-fallback ${SEL_INPUT} {
  color: #ffffff !important;
  -webkit-text-stroke: .6px rgba(0,0,0,.9);
  text-shadow: 0 0 4px #000, 0 0 8px #000, 1px 1px 0 #000 !important;
}

/* ---------- 언어 변경 배지 (신규) : 채팅 톤에 맞춰 원본 폰트 사용 ---------- */
.n1ct-langbadge {
  display: inline-block; margin-left: 8px;
  font-family: Ubuntu, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11pt; opacity: .6; vertical-align: baseline; cursor: help;
  color: #ffffff;
  text-shadow: 0 0 3px rgba(0,0,0,.95), 0 0 6px rgba(0,0,0,.7);
}

/* ---------- "Translating…" 라벨 (원본 디자인) ---------- */
#n1ct-indicator {
  position: fixed;
  z-index: 999998;
  transform: translateX(-50%);
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(6px);
  color: #fff;
  font-family: Ubuntu, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: ${INDICATOR_DEFAULT.fontSize};
  font-weight: 600;
  letter-spacing: .3px;
  pointer-events: none;
  display: none;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0,0,0,.35);
}
#n1ct-indicator.err { background: rgba(150,20,20,.75); }
#n1ct-indicator .dots::after { content: ''; animation: n1ct-dots 1.2s steps(4, end) infinite; }
@keyframes n1ct-dots {
  0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; }
  75% { content: '...'; } 100% { content: '...'; }
}

/* ---------- 설정 창 (게임 네이티브 종이 패널 스타일 재사용, 원본 디자인) ---------- */
#n1ct-curtain {
  position: fixed; inset: 0; z-index: 99998;
  transition: opacity .2s ease, visibility .2s ease;
}
#n1ct-menu {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 480px; max-width: calc(100% - 20px);
  box-sizing: border-box; padding: 30px;
  z-index: 99999;
  transition: transform .2s cubic-bezier(0.3,-0.8,0.7,1.8),
              opacity .2s cubic-bezier(0.3,-0.8,0.7,1.8),
              visibility .2s cubic-bezier(0.3,-0.8,0.7,1.8);
  max-height: calc(100vh - 40px); overflow-y: auto;
}
#n1ct-menu.n1ct-hidden {
  transform: translate(-50%, -50%) scale(.6);
  opacity: 0; visibility: hidden; pointer-events: none;
}
#n1ct-curtain.n1ct-hidden { opacity: 0; visibility: hidden; pointer-events: none; }

#n1ct-menu .dialogTitle { margin: 0 0 20px; }
#n1ct-menu .settings-group-header { margin: 18px 0 10px; }
#n1ct-menu .settings-group-header:first-of-type { margin-top: 0; }

#n1ct-menu .n1ct-field { position: relative; margin: 0 0 6px; }
#n1ct-menu input.n1ct-search {
  width: 100%; box-sizing: border-box; height: 34px;
  padding: 0 10px; margin-top: 4px;
  border: 2px solid currentColor; border-radius: 4px;
  background: transparent; color: inherit;
  font-family: sans-serif; font-size: 15px; outline: none; user-select: text;
  opacity: .9;
}
#n1ct-menu input.n1ct-search::placeholder {
  visibility: visible !important;
  color: currentColor !important;
  opacity: .45 !important;
  font-family: sans-serif !important;
  font-size: 15px !important;
  text-transform: none !important;
}
#n1ct-menu input.n1ct-search:focus { opacity: 1; }
#n1ct-menu .n1ct-current {
  margin-top: 4px; font-family: sans-serif; font-size: 13px;
  font-weight: 700; opacity: .75;
}
#n1ct-menu .n1ct-results {
  position: absolute; left: 0; right: 0; top: 100%;
  margin-top: 2px;
  background: var(--default-ui-bg-color, #fff);
  color: var(--default-text-color, #000);
  border: 2px solid currentColor; border-radius: 6px;
  max-height: 200px; overflow-y: auto; z-index: 5; display: none;
  box-shadow: 0 6px 16px rgba(0,0,0,.25);
}
#n1ct-menu .n1ct-results div {
  padding: 7px 10px; cursor: pointer; font-family: sans-serif; font-size: 14px;
  display: flex; justify-content: space-between; gap: 8px;
}
#n1ct-menu .n1ct-results div:hover { background: rgba(128,128,128,.2); }
#n1ct-menu .n1ct-results span.code { opacity: .55; font-size: 12px; }

#n1ct-menu .n1ct-toggle {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; font-family: sans-serif; font-size: 16px;
}
#n1ct-menu .n1ct-toggle input { width: 18px; height: 18px; cursor: pointer; accent-color: currentColor; }

#n1ct-menu .n1ct-keys {
  margin-top: 6px; font-family: sans-serif; font-size: 13px;
  line-height: 1.9; opacity: .7;
}
#n1ct-menu .n1ct-keys kbd {
  border: 1px solid currentColor; border-bottom-width: 2px;
  border-radius: 4px; padding: 0 5px; font-family: sans-serif; font-weight: 700;
}

#n1ct-menu .dialogButtonsContainer {
  display: flex; justify-content: center; margin-top: 22px;
}
#n1ct-menu .dialog-button { cursor: pointer; }

/* 왼쪽 메뉴에 넣는 CHAT TRANSLATION 버튼 아이콘 (원본) */
#n1ct-menu-btn .buttonImage {
  background-image: var(--n1ct-icon) !important;
  background-size: 66% !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
`;
        (document.head || document.documentElement).appendChild(style);
    }

    /* ============================================================
     * 5. Adaptive color engine  (★ 샘플링 간격 300ms ★)
     * ============================================================ */
    const SAMPLE = 12;
    let sampler = null, sctx = null;
    let displayCanvas = null, pixelCanvas = null, lastResolve = 0;
    let failStreak = 0, fallbackMode = false;

    function ensureSampler() {
        if (sctx) return true;
        try {
            sampler = document.createElement('canvas');
            sampler.width = SAMPLE; sampler.height = SAMPLE;
            sctx = sampler.getContext('2d', { willReadFrequently: true });
            return !!sctx;
        } catch (e) { return false; }
    }

    // 캔버스가 2개라서 화면에 보이는 쪽과 픽셀이 읽히는 쪽이 다를 수 있음
    function probeReadable(cv) {
        if (!cv || !cv.width || !cv.height || !ensureSampler()) return false;
        try {
            sctx.clearRect(0, 0, 4, 4);
            sctx.drawImage(cv, (cv.width >> 1) - 8, (cv.height >> 1) - 8, 16, 16, 0, 0, 4, 4);
            const d = sctx.getImageData(0, 0, 4, 4).data;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true;
            return false;
        } catch (e) { return false; }
    }

    function resolveCanvases() {
        const now = performance.now();
        const ok = displayCanvas && displayCanvas.isConnected && displayCanvas.clientWidth > 0
            && pixelCanvas && pixelCanvas.isConnected;
        if (ok && now - lastResolve < 3000) return;
        lastResolve = now;

        const all = Array.prototype.slice.call(document.querySelectorAll('canvas'));
        const visible = all.filter(c => c.clientWidth > 0 && c.clientHeight > 0)
            .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
        displayCanvas = visible[0] || null;
        if (!displayCanvas) { pixelCanvas = null; return; }

        if (pixelCanvas && pixelCanvas.isConnected && probeReadable(pixelCanvas)) return;
        const candidates = [displayCanvas].concat(all.filter(c => c !== displayCanvas));
        pixelCanvas = candidates.find(probeReadable) || null;
    }

    // rect 뒤 배경의 평균 휘도 0..1, 실패 시 null
    function sampleLuma(rect) {
        resolveCanvases();
        if (!displayCanvas || !pixelCanvas || !ensureSampler()) return null;
        const cr = displayCanvas.getBoundingClientRect();
        if (!cr.width || !cr.height) return null;

        const kx = pixelCanvas.width / cr.width;
        const ky = pixelCanvas.height / cr.height;
        let sx = (rect.left - cr.left) * kx;
        let sy = (rect.top - cr.top) * ky;
        let sw = rect.width * kx;
        let sh = rect.height * ky;

        if (sx < 0) { sw += sx; sx = 0; }
        if (sy < 0) { sh += sy; sy = 0; }
        if (sx + sw > pixelCanvas.width) sw = pixelCanvas.width - sx;
        if (sy + sh > pixelCanvas.height) sh = pixelCanvas.height - sy;
        if (sw < 1 || sh < 1) return null;

        try {
            sctx.clearRect(0, 0, SAMPLE, SAMPLE);
            sctx.drawImage(pixelCanvas, sx, sy, sw, sh, 0, 0, SAMPLE, SAMPLE);
            const d = sctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
            let sum = 0, n = 0;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 8) continue;
                sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
                n++;
            }
            if (!n) return null;
            return (sum / n) / 255;
        } catch (e) { return null; }
    }

    const darkState = new WeakMap();
    function paint(el, luma) {
        let dark = darkState.get(el);
        if (dark === undefined) dark = luma < 0.5;
        if (dark && luma > 0.58) dark = false;          // 히스테리시스: 깜빡임 방지
        else if (!dark && luma < 0.42) dark = true;
        darkState.set(el, dark);
        el.style.setProperty('--n1ct-fg', dark ? '#ffffff' : '#0d0d0d');
        el.style.setProperty('--n1ct-halo', dark ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.9)');
    }

    function adaptiveTick() {
        if (!cfg.adaptive) return;
        const targets = Array.prototype.slice.call(document.querySelectorAll(SEL_TEXT));
        if (!targets.length) return;
        let ok = 0;
        for (const el of targets) {
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            const luma = sampleLuma(r);
            if (luma === null) continue;
            paint(el, luma);
            ok++;
        }
        if (ok === 0) {
            if (++failStreak > 12 && !fallbackMode) {
                fallbackMode = true;
                document.body.classList.add('n1ct-fallback');
                console.warn(TAG, 'canvas readback unavailable -> outline fallback');
            }
        } else {
            failStreak = 0;
            if (fallbackMode) { fallbackMode = false; document.body.classList.remove('n1ct-fallback'); }
        }
    }
    setInterval(adaptiveTick, 300);   // ★ 120ms → 300ms

    /* ============================================================
     * 6. "Translating…" 라벨 (원본 디자인, 드래그 배치 코드는 제거)
     * ============================================================ */
    let ind = null;

    function ensureIndicator() {
        if (ind && ind.isConnected) return ind;
        ind = document.createElement('div');
        ind.id = 'n1ct-indicator';
        ind.innerHTML = '<span class="txt">Translating</span><span class="dots"></span>';
        document.body.appendChild(ind);
        return ind;
    }

    function positionIndicator() {
        const el = ensureIndicator();
        if (cfg.indicator) {
            el.style.left = (cfg.indicator.x * window.innerWidth) + 'px';
            el.style.top = (cfg.indicator.y * window.innerHeight) + 'px';
            el.style.bottom = 'auto';
        } else {
            el.style.left = INDICATOR_DEFAULT.left;
            el.style.top = 'auto';
            el.style.bottom = INDICATOR_DEFAULT.bottom;
        }
    }

    let indTimer = null;
    function showIndicator(msg, isError) {
        const el = ensureIndicator();
        el.querySelector('.txt').textContent = msg || 'Translating';
        el.querySelector('.dots').style.display = isError ? 'none' : '';
        el.classList.toggle('err', !!isError);
        positionIndicator();
        el.style.display = 'block';
        clearTimeout(indTimer);
        if (isError) indTimer = setTimeout(hideIndicator, 2500);
    }
    function hideIndicator() { if (ind) ind.style.display = 'none'; }
    window.addEventListener('resize', positionIndicator);

    /* ============================================================
     * 7. 채팅 로그 번역  ( '\' 또는 '-' )
     * ============================================================ */
    let busy = false;
    const origMap = new WeakMap();     // el -> 원문 텍스트
    let lastDetectedLang = null;       // 최근 감지된 언어(base code)
    let lastBadgeEl = null;            // 그 언어를 마지막으로 표시했던 메시지의 부모 요소 (소멸 여부 추적용)

    const chatLines = () => Array.prototype.slice.call(document.querySelectorAll(SEL_LINE));
    const chatNames = () => Array.prototype.slice.call(document.querySelectorAll(SEL_NAME));

    function restoreAll() {
        for (const el of [...chatLines(), ...chatNames()]) {
            if (origMap.has(el)) {
                el.textContent = origMap.get(el);
                origMap.delete(el);
                el.removeAttribute('title');
            }
        }
        // 언어 배지 전부 제거 + 추적 상태 초기화 (다음 번역 때 첫 언어부터 다시 표시)
        document.querySelectorAll('.n1ct-langbadge').forEach(b => b.remove());
        lastDetectedLang = null;
        lastBadgeEl = null;
    }

    // ★ 규칙: 감지된 언어가 "직전과 다를 때" 표시한다.
    //   추가로, 언어가 같더라도 "직전에 그 언어를 표시했던 메시지가 채팅에서 이미 사라졌다면" 다시 표시한다.
    //   narrow.one 채팅은 일정 시간 뒤 메시지가 통째로 DOM에서 제거되므로,
    //   그 메시지가 사라졌다는 건 = 화면에 "이게 무슨 언어인지" 알려주는 유일한 단서가 없어졌다는 뜻이다.
    //   이걸 놓치면, 같은 언어가 계속 올라올 때 정작 화면엔 배지가 하나도 안 보이는 상태가 될 수 있다.
    function markLangIfChanged(el, detected) {
        if (!cfg.showLangChange) return;
        const d = baseCode(detected);
        if (!d || d === 'auto') return;

        const sameLang = (d === lastDetectedLang);
        const evidenceStillVisible = lastBadgeEl && lastBadgeEl.isConnected;
        if (sameLang && evidenceStillVisible) return;   // 안 바뀌었고 + 이전 배지가 아직 화면에 있음 → 생략

        lastDetectedLang = d;

        const parent = el.parentElement;       // .chat-message-content (textContent 교체에 안 지워지도록 부모에 부착)
        if (!parent) return;
        let badge = parent.querySelector('.n1ct-langbadge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'n1ct-langbadge';
            parent.appendChild(badge);
        }
        badge.textContent = '(' + langName(detected) + ')';
        badge.title = 'detected language: ' + langName(detected);
        lastBadgeEl = parent;   // 이 메시지가 사라지는 순간을 다음 판단 때 감지하기 위해 기억해둠
    }

    async function translateLine(el, target) {
        const isName = el.matches(SEL_NAME);
        const src = (el.textContent || '').trim();
        if (!src) return;
        origMap.set(el, el.textContent);        // 요청 전에 먼저 표시 (중복 요청 방지)
        const { text, detected } = await translateText(src, target);
        if (!el.isConnected) return;            // 번역 도중 메시지가 사라졌으면 중단
        if (baseCode(detected) === baseCode(target) || text === src) { origMap.delete(el); return; }
        el.textContent = text;
        el.title = src + '  (' + langName(detected) + ')';
        if (!isName) markLangIfChanged(el, detected);   // 언어 배지는 본문에만
    }

    async function translateChatLog() {
        if (busy) return;
        const lines = chatLines();
        const names = cfg.translateNames ? chatNames() : [];
        const all = [...lines, ...names];
        if (!all.length) { showIndicator('No messages on screen', true); return; }
        const pending = all.filter(el => !origMap.has(el));
        if (!pending.length) { restoreAll(); return; }   // 다시 누르면 원문 복원

        busy = true;
        showIndicator('Translating');
        let failed = 0;
        try {
            await mapLimit(pending, 3, async (el) => {
                try { await translateLine(el, cfg.myLang); }
                catch (e) { failed++; origMap.delete(el); console.warn(TAG, e); }
            });
        } finally {
            busy = false;
            hideIndicator();
            if (failed) showIndicator('Translation failed (' + failed + ')', true);
        }
    }

    // 새 메시지 자동 번역 — 원본의 채팅 로그 옵저버 (좁은 범위, 원래 오류 없던 코드)
    const chatObserver = new MutationObserver((muts) => {
        if (!cfg.autoTranslate) return;
        for (const m of muts) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                const els = [];
                if (node.matches && node.matches(SEL_LINE)) els.push(node);
                if (node.querySelectorAll) Array.prototype.push.apply(els, node.querySelectorAll(SEL_LINE));
                if (cfg.translateNames) {
                    if (node.matches && node.matches(SEL_NAME)) els.push(node);
                    if (node.querySelectorAll) Array.prototype.push.apply(els, node.querySelectorAll(SEL_NAME));
                }
                for (const el of els) {
                    if (origMap.has(el)) continue;
                    translateLine(el, cfg.myLang).catch(e => { origMap.delete(el); console.warn(TAG, e); });
                }
            }
        }
    });
    function watchChat() {
        const log = document.querySelector(SEL_LOG);
        if (log && !log.dataset.n1ctWatched) {
            log.dataset.n1ctWatched = '1';
            chatObserver.observe(log, { childList: true, subtree: true });
            console.log(TAG, 'chat log observed');
        }
    }
    setInterval(watchChat, 1000);

    /* ============================================================
     * 8. 입력 중인 내용 번역  ( '\' 키, 입력창에 포커스가 있을 때 )
     * ============================================================ */
    const chatInput = () => document.querySelector(SEL_INPUT) || document.querySelector('.chat-input');

    function setInputValue(input, v) {
        try {
            const desc = Object.getOwnPropertyDescriptor(PW.HTMLInputElement.prototype, 'value');
            if (desc && desc.set) desc.set.call(input, v); else input.value = v;
        } catch (e) { input.value = v; }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        try { input.focus(); input.setSelectionRange(v.length, v.length); } catch (e) { /* ignore */ }
    }

    async function translateInput() {
        if (busy) return;
        const input = chatInput();
        if (!input) return;
        let src = (input.value || '').replace(/\\+$/, '').trim();   // 트리거 키 '\' 제거 후 번역
        if (!src) return;
        busy = true;
        showIndicator('Translating');
        try {
            const { text } = await translateText(src, cfg.friendLang);
            setInputValue(input, text);
            hideIndicator();
        } catch (e) {
            console.warn(TAG, e);
            showIndicator('Translation failed', true);
        } finally { busy = false; }
    }

    /* ============================================================
     * 9. 설정 창  ( '_' )  — 원본 디자인 + 친구 구성요소(엔진/Esc/T 제외)
     * ============================================================ */
    let menu = null, curtain = null;
    const rndSeed = () => Math.floor(Math.random() * 99999) + 1;

    function buildLangField(fieldEl, which) {
        const search = fieldEl.querySelector('.n1ct-search');
        const results = fieldEl.querySelector('.n1ct-results');
        const current = fieldEl.querySelector('.n1ct-current');
        const refresh = () => { current.textContent = 'Selected: ' + langName(cfg[which]) + ' (' + cfg[which] + ')'; };
        refresh();

        const render = (list) => {
            results.innerHTML = '';
            if (!list.length) {
                const d = document.createElement('div');
                d.textContent = 'No language matches that search.';
                d.style.color = '#8e8e93'; d.style.cursor = 'default';
                results.appendChild(d);
            }
            for (const l of list) {
                const d = document.createElement('div');
                d.innerHTML = '<span></span><span class="code"></span>';
                d.children[0].textContent = l.n;
                d.children[1].textContent = l.c;
                d.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    cfg[which] = l.c; saveCfg(); refresh();
                    search.value = ''; results.style.display = 'none';
                });
                results.appendChild(d);
            }
            results.style.display = 'block';
        };

        search.addEventListener('focus', () => render(searchLangs(search.value)));
        search.addEventListener('input', () => render(searchLangs(search.value)));
        search.addEventListener('blur', () => setTimeout(() => { results.style.display = 'none'; }, 120));
        search.addEventListener('keydown', (e) => {
            e.stopPropagation();  // 게임으로 키 입력이 새지 않게
            if (e.key === 'Enter') {
                const list = searchLangs(search.value);
                if (list.length) { cfg[which] = list[0].c; saveCfg(); refresh(); search.value = ''; results.style.display = 'none'; search.blur(); }
            } else if (e.key === 'Escape') { results.style.display = 'none'; search.blur(); }
        });
    }

    function createMenu() {
        if (menu) return menu;

        curtain = document.createElement('div');
        curtain.id = 'n1ct-curtain';
        curtain.className = 'dialogCurtain fullScreen n1ct-hidden';
        curtain.addEventListener('click', () => closeMenu());
        document.body.appendChild(curtain);

        menu = document.createElement('div');
        menu.id = 'n1ct-menu';
        menu.className = 'dialog wrinkledPaper n1ct-hidden';
        menu.style.setProperty('--wrinkled-paper-seed', rndSeed());
        menu.innerHTML = `
      <h2 class="dialogTitle blueNight">Chat Translation <span style="font-size:14px;opacity:.5">v${VERSION}</span></h2>

      <h3 class="settings-group-header">My language</h3>
      <div class="n1ct-field" data-which="myLang">
        <input class="n1ct-search" type="text" placeholder="Search a language or country..." spellcheck="false">
        <div class="n1ct-results"></div>
        <div class="n1ct-current"></div>
      </div>

      <h3 class="settings-group-header">My friend's language</h3>
      <div class="n1ct-field" data-which="friendLang">
        <input class="n1ct-search" type="text" placeholder="Search a language or country..." spellcheck="false">
        <div class="n1ct-results"></div>
        <div class="n1ct-current"></div>
      </div>

      <h3 class="settings-group-header">Options</h3>
      <div class="n1ct-toggle"><span class="settings-item-text">Adaptive text color</span><input type="checkbox" id="n1ct-adaptive"></div>
      <div class="n1ct-toggle"><span class="settings-item-text">Auto-translate new messages</span><input type="checkbox" id="n1ct-auto"></div>
      <div class="n1ct-toggle"><span class="settings-item-text">Translate player names</span><input type="checkbox" id="n1ct-names"></div>
      <div class="n1ct-toggle"><span class="settings-item-text">Show language when it changes</span><input type="checkbox" id="n1ct-langchange"></div>

      <h3 class="settings-group-header">Shortcuts</h3>
      <div class="n1ct-keys">
        <kbd>\\</kbd> translate:<br>
        &nbsp;&nbsp;&bull; while typing &rarr; your message to friend's language<br>
        &nbsp;&nbsp;&bull; otherwise &rarr; the chat log to your language (press again for originals)<br>
        <kbd>_</kbd> open or close this panel
      </div>

      <div class="dialogButtonsContainer">
        <button class="dialog-button blueNight wrinkledPaper" id="n1ct-close">Close</button>
      </div>
    `;
        document.body.appendChild(menu);

        const closeBtn = menu.querySelector('#n1ct-close');
        closeBtn.style.setProperty('--wrinkled-paper-seed', rndSeed());
        closeBtn.addEventListener('click', () => closeMenu());

        menu.querySelectorAll('.n1ct-field').forEach(f => buildLangField(f, f.dataset.which));

        const adaptiveBox = menu.querySelector('#n1ct-adaptive');
        adaptiveBox.checked = cfg.adaptive;
        adaptiveBox.addEventListener('change', () => {
            cfg.adaptive = adaptiveBox.checked; saveCfg();
            if (!cfg.adaptive) {
                document.querySelectorAll(SEL_TEXT).forEach(el => {
                    el.style.removeProperty('--n1ct-fg'); el.style.removeProperty('--n1ct-halo');
                });
            }
        });

        const autoBox = menu.querySelector('#n1ct-auto');
        autoBox.checked = cfg.autoTranslate;
        autoBox.addEventListener('change', () => { cfg.autoTranslate = autoBox.checked; saveCfg(); });

        const namesBox = menu.querySelector('#n1ct-names');
        namesBox.checked = cfg.translateNames;
        namesBox.addEventListener('change', () => { cfg.translateNames = namesBox.checked; saveCfg(); });

        const langChangeBox = menu.querySelector('#n1ct-langchange');
        langChangeBox.checked = cfg.showLangChange;
        langChangeBox.addEventListener('change', () => {
            cfg.showLangChange = langChangeBox.checked; saveCfg();
            if (!cfg.showLangChange) {
                document.querySelectorAll('.n1ct-langbadge').forEach(b => b.remove());
            }
        });

        return menu;
    }

    function openMenu() {
        const m = createMenu();
        m.style.setProperty('--wrinkled-paper-seed', rndSeed());
        void m.offsetWidth;   // reflow 후 hidden 제거해야 전환 애니메이션 재생
        curtain.classList.remove('n1ct-hidden');
        m.classList.remove('n1ct-hidden');
    }
    function closeMenu() {
        if (!menu) return;
        menu.classList.add('n1ct-hidden');
        if (curtain) curtain.classList.add('n1ct-hidden');
        try { document.activeElement.blur(); } catch (e) { /* ignore */ }
    }
    function toggleMenu() {
        const m = createMenu();
        m.classList.contains('n1ct-hidden') ? openMenu() : closeMenu();
    }

    /* ============================================================
     * 9.5 왼쪽 메뉴에 "CHAT TRANSLATION" 버튼 삽입 (원본, 인터벌 방식)
     * ============================================================ */
    // 게임 톤에 맞는 흑백 아이콘 (말풍선 + 번역 화살표), 외부 파일 없이 data-URI로 삽입.
    const MENU_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" ' +
        'stroke="#000000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M14 20 h44 a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-24 l-16 14 v-14 h-4 a8 8 0 0 1 -8 -8 v-24 a8 8 0 0 1 8 -8 z"/>' +
        '<path d="M24 34 h24 M36 34 v18 M28 52 q8 -12 16 0"/>' +
        '<path d="M62 60 h24 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-4 v10 l-12 -10 h-8 a6 6 0 0 1 -6 -6 v-14 a6 6 0 0 1 6 -6 z"/>' +
        '<path d="M66 74 h16 M74 70 v2 M78 74 q-4 8 -10 10 M70 74 q4 8 10 10"/>' +
        '</svg>'
    );
    const MENU_BTN_ID = 'n1ct-menu-btn';

    function findFullScreenContainer() {
        const conts = document.querySelectorAll('.main-menu-button-container');
        for (const c of conts) {
            const btn = c.querySelector('button.main-menu-button');
            const aria = btn && (btn.getAttribute('aria-label') || '').toLowerCase();
            if (aria === 'full screen') return c;
        }
        return null;
    }

    function injectMenuButton() {
        if (document.getElementById(MENU_BTN_ID)) return true;
        const fsCont = findFullScreenContainer();
        if (!fsCont || !fsCont.parentElement) return false;

        // Full Screen 컨테이너를 복제해 아이콘/텍스트만 교체 → 게임과 동일한 외형
        const ours = fsCont.cloneNode(true);
        ours.id = MENU_BTN_ID;
        ours.style.setProperty('--n1ct-icon', 'url("' + MENU_ICON + '")');

        const btn = ours.querySelector('button.main-menu-button');
        if (btn) {
            btn.setAttribute('aria-label', 'Chat Translation');
            const img = btn.querySelector('.buttonImage');   // 복제로 딸려온 인라인 배경 제거
            if (img) { img.style.backgroundImage = ''; img.style.backgroundSize = ''; }
        }
        const label = ours.querySelector('.main-menu-button-text');
        if (label) label.textContent = 'Chat Translation';

        ours.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        }, true);

        fsCont.parentElement.insertBefore(ours, fsCont.nextSibling);
        console.log(TAG, 'menu button injected');
        return true;
    }
    // 게임이 메뉴를 다시 그리면 버튼이 사라질 수 있으니 주기적으로 재확인 (버튼 있으면 즉시 종료)
    setInterval(injectMenuButton, 1000);

    /* ============================================================
     * 10. 키 바인딩  (원본 그대로: \, -, _/shift+-, Esc는 패널 닫기만)
     * ============================================================ */
    function isTyping(el) {
        if (!el) return false;
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    }

    window.addEventListener('keydown', (e) => {
        const el = document.activeElement;

        // 패널이 열려 있을 때 ESC → 닫기 (게임 ESC보다 먼저 가로챔)
        if (e.key === 'Escape' && menu && !menu.classList.contains('n1ct-hidden')) {
            e.preventDefault(); e.stopPropagation(); closeMenu(); return;
        }
        if (menu && menu.contains(el)) return;   // 우리 UI 내부 입력은 각자 처리
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const typing = isTyping(el);
        const inChat = typing && el.classList && el.classList.contains('chat-input');

        // '\' : 통합 번역 키. 입력창 포커스면 내 문장 번역, 아니면 채팅 로그 번역(다시 누르면 복원)
        if (e.key === '\\') {
            e.preventDefault(); e.stopPropagation();
            if (inChat) translateInput();
            else if (!typing) translateChatLog();
            return;
        }

        if (typing) return;   // 아래 키들은 입력창 밖에서만

        // '_' (shift + '-') : 설정 창
        if (e.key === '_' || (e.key === '-' && e.shiftKey)) {
            e.preventDefault(); e.stopPropagation(); toggleMenu(); return;
        }
        // '-' : 채팅 로그 번역 (기존 사용자용 유지)
        if (e.key === '-') {
            e.preventDefault(); e.stopPropagation(); translateChatLog(); return;
        }
    }, true);

    /* ============================================================
     * 11. Boot
     * ============================================================ */
    function boot() {
        applyStyles();
        ensureIndicator();
        positionIndicator();
        watchChat();
        injectMenuButton();
        console.log(TAG, 'v' + VERSION, 'ready | my=' + cfg.myLang, 'friend=' + cfg.friendLang,
            'auto=' + cfg.autoTranslate, 'names=' + cfg.translateNames, '| engines: google + microsoft (racing)');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
