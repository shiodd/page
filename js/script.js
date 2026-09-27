// ========== 统一导航栏 ==========

const NAV_ITEMS = [
    { label: '首页',   href: 'index.html' },
    { label: '关于',   href: 'html/about.html' },
    { label: '记录',   href: 'html/record.html' },
    { label: '名片',   href: 'html/card.html' },
    { label: '友链', href: 'html/friends.html', hidden: true }, // 暂时屏蔽，去掉 hidden 即可恢复
];

const NAV_COLORS = ['#c59fda', '#006AB6', '#D162CB', '#ffbad6', '#F3983B'];

const ICON_MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

// 音效图标（开 / 关）
const ICON_SOUND_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

// ========== 音效 ==========
const SFX_BASE = /\/html\//.test(window.location.pathname) ? '../sound/sfx/' : 'sound/sfx/';
const sfxClick = new Audio(SFX_BASE + 'click.mp3');
const sfxSelect = new Audio(SFX_BASE + 'select.mp3');
// 提前缓存音效
[sfxClick, sfxSelect].forEach(a => {
    a.preload = 'auto';
    a.load();
});

// 音效开关：从未设置过时默认静音（尊重首次访客），用户选择后被记住
const SFX_KEY = 'sfx';
let sfxEnabled = (function () {
    try {
        const v = localStorage.getItem(SFX_KEY);
        return v === null ? false : v === '1';
    } catch (e) { return false; }
})();

function playSfx(audio) {
    if (!sfxEnabled) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// ========== 迷你播放列表 ==========
const MUSIC_BASE = /\/html\//.test(window.location.pathname) ? '../sound/music/' : 'sound/music/';
// 兜底列表：自动检测失败时使用（file:// 打开、或服务器未开启目录列表）
const MUSIC_LIST = [
    { title: '秋山裕和,むにょっ - ★サティジムノペディ', file: '秋山裕和,むにょっ - ★サティジムノペディ.mp3' },
    { title: 'Elements Garden - ハッピートゥモロー (Title Version)', file: 'Elements Garden - ハッピートゥモロー (Title Version).mp3' },
    { title: '上松範康(Elements Garden) - スカーレット', file: '上松範康(Elements Garden) - スカーレット.mp3' },
    { title: '水月陵 - 恋×シンアイ彼女 メインテーマ', file: '水月陵 - 恋×シンアイ彼女 メインテーマ.mp3' },
    // 新增歌曲也可以往这里加一行 { title: '显示名', file: '文件名.mp3' }
];

// 实时频谱只在 http(s) 下启用：file:// 下媒体被视为跨域，
// 接入 Web Audio 会被静音，因此那种情况自动降级为 CSS 波动动画
const CAN_ANALYSE = window.location.protocol === 'http:' || window.location.protocol === 'https:';

// 播放状态：首页自动色条据此判断是否需要暂停
let musicPlaying = false;

// ---- 水波颜色：切换页面时平滑过渡到新主题色，避免颜色突变 ----
let waveRGB = null;                    // 当前显示色
let waveTargetRGB = [197, 159, 218];   // 目标色

// 取主题色的 RGB；夜间模式按站内 brightness(0.62) 的逻辑压暗
function themeRGB(hex) {
    const h = String(hex || '#c59fda').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    let r = parseInt(full.slice(0, 2), 16);
    let g = parseInt(full.slice(2, 4), 16);
    let b = parseInt(full.slice(4, 6), 16);
    if (document.documentElement.dataset.theme === 'dark') {
        r = Math.round(r * 0.62);
        g = Math.round(g * 0.62);
        b = Math.round(b * 0.62);
    }
    return [r, g, b];
}

// 每帧向目标色靠近一点，形成渐变（首帧直接取目标色，不做入场渐变）
// WAVE_LERP 越小，切页/切主题时水波颜色过渡越慢越柔和（0.05 ≈ 1.3s 完成）
const WAVE_LERP = 0.05;
function stepWaveColor() {
    const cfg = getCurrentPage();
    waveTargetRGB = themeRGB((cfg && cfg.color) || '#c59fda');
    if (!waveRGB) { waveRGB = waveTargetRGB.slice(); return; }
    for (let i = 0; i < 3; i++) {
        waveRGB[i] += (waveTargetRGB[i] - waveRGB[i]) * WAVE_LERP;
    }
}

function waveRgba(alpha) {
    return `rgba(${Math.round(waveRGB[0])},${Math.round(waveRGB[1])},${Math.round(waveRGB[2])},${alpha})`;
}

function initMusicPlayer() {
    if (!MUSIC_LIST.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'mini-player';
    wrap.innerHTML = `
        <button class="mp-btn mp-prev" id="mpPrev" aria-label="上一首" type="button">&#9198;</button>
        <button class="mp-btn mp-play" id="mpPlay" aria-label="播放/暂停" type="button">
            <span class="icon icon-play">&#9654;</span>
            <span class="icon icon-pause">&#10073;&#10073;</span>
        </button>
        <button class="mp-btn mp-next" id="mpNext" aria-label="下一首" type="button">&#9197;</button>
        <div class="mp-info">
            <button class="mp-title" id="mpTitle" type="button"></button>
            <div class="mp-bar" id="mpBar"><span id="mpProgress"></span></div>
        </div>
        <div class="mp-list" id="mpList"></div>
    `;
    // 只有一首歌时隐藏上/下一首（避免点了没反应），换歌用列表
    if (MUSIC_LIST.length < 2) wrap.classList.add('is-single');

    // hover 用的强调色：与导航栏按钮一样取当前页面主题色
    const pageCfg = getCurrentPage();
    wrap.style.setProperty('--btn-color', (pageCfg && pageCfg.color) || '#c59fda');
    // 放在顶部导航按钮组的最左边
    const nav = document.getElementById('topNav');
    if (nav) nav.insertBefore(wrap, nav.firstChild);
    else document.body.appendChild(wrap);

    const audio = new Audio();
    audio.preload = 'metadata';

    const playBtn = wrap.querySelector('#mpPlay');
    const titleEl = wrap.querySelector('#mpTitle');
    const barEl = wrap.querySelector('#mpBar');
    const progEl = wrap.querySelector('#mpProgress');
    let index = 0;
    let tracks = MUSIC_LIST.slice(); // 实际使用的列表，自动检测成功后会被替换

    // 播放条内的水波：波幅随音乐能量起伏（取不到频谱时也有轻微荡漾）
    const WAVE_H = 18;
    const waveCanvas = document.createElement('canvas');
    waveCanvas.className = 'mp-wave';
    wrap.appendChild(waveCanvas);
    const wctx = waveCanvas.getContext('2d');

    let audioCtx = null, analyser = null, freqData = null;
    let rafId = null, phase = 0, energy = 0, targetEnergy = 0;
    let settleProgress = -1; // >=0 表示正在播放“暂停落水”动画（0→1 进度）

    // 接入 Web Audio 读取真实频谱（一个 audio 元素只能创建一次 source）
    function ensureAudioGraph() {
        if (audioCtx || !CAN_ANALYSE) return false;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try {
            audioCtx = new AC();
            const src = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;            // 128 个频段，波形细节更丰富
            analyser.smoothingTimeConstant = 0.8;
            src.connect(analyser);
            analyser.connect(audioCtx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
            return true;
        } catch (e) {
            audioCtx = null;
            return false;
        }
    }

    function resizeWave() {
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth || 180;
        waveCanvas.width = Math.round(w * dpr);
        waveCanvas.height = Math.round(WAVE_H * dpr);
        wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 横向采样点数：把频谱按“低频→高频”铺在播放条的横向位置上
    const WAVE_BINS = 40;
    const rawSpec = new Float32Array(WAVE_BINS);
    const spec = new Float32Array(WAVE_BINS);

    // 读取频谱并归一化到 0..1（取中低频段，那里能量最集中）
    function sampleSpectrum() {
        if (!analyser || !freqData) {
            // 取不到频谱（如 file://）时用缓慢起伏的正弦，保持水面在动
            for (let i = 0; i < WAVE_BINS; i++) {
                rawSpec[i] = Math.max(0,
                    0.10 + Math.sin(i * 0.45 + phase * 1.2) * 0.06 +
                           Math.sin(i * 0.17 - phase * 0.7) * 0.04);
            }
            return;
        }
        analyser.getByteFrequencyData(freqData);
        const usable = Math.max(1, Math.floor(freqData.length * 0.7));
        for (let i = 0; i < WAVE_BINS; i++) {
            const start = Math.floor((i / WAVE_BINS) * usable);
            const end = Math.max(start + 1, Math.floor(((i + 1) / WAVE_BINS) * usable));
            let sum = 0, count = 0;
            for (let j = start; j < end && j < freqData.length; j++) { sum += freqData[j]; count++; }
            rawSpec[i] = count ? (sum / count) / 255 : 0;
        }
    }

    // 取任意横向位置的频谱值，相邻点线性插值，避免台阶感
    function specAt(t) {
        const pos = t * (WAVE_BINS - 1);
        const i0 = Math.floor(pos);
        const i1 = Math.min(WAVE_BINS - 1, i0 + 1);
        const f = pos - i0;
        return spec[i0] * (1 - f) + spec[i1] * f;
    }

    // 由频谱塑形的水面，再叠一层行进涟漪让它像水在流
    function fillSpecWave(w, ph, color, lift, scale) {
        const baseY = WAVE_H - lift;
        wctx.beginPath();
        wctx.moveTo(0, WAVE_H);
        for (let x = 0; x <= w; x += 2) {
            const t = x / w;
            // 频谱决定起伏高低；pow<1 会抬高弱信号，避免安静段“看不出动静”
            const bump = Math.pow(specAt(t), 0.75) * 14 * scale;
            const ripple = Math.sin(t * Math.PI * 4 + ph) * 1.2; // 水的行进感
            wctx.lineTo(x, baseY - bump + ripple);
        }
        wctx.lineTo(w, WAVE_H);
        wctx.closePath();
        wctx.fillStyle = color;
        wctx.fill();
    }

    // 暂停时让水波整块下沉滑出，避免“啪”地一下消失
    function fadeSettle() {
        const w = wrap.clientWidth || 180;
        wctx.clearRect(0, 0, w, WAVE_H);

        if (settleProgress < 1) {
            const p = settleProgress;
            const sink = p * p * (WAVE_H + 6); // 加速下落，像水沉下去
            const fade = 1 - p;
            stepWaveColor();
            phase += 0.02;
            wctx.save();
            wctx.translate(0, sink);           // 整块水面下移，滑出播放条
            fillSpecWave(w, phase, waveRgba(0.55 * fade), 4, 1);
            fillSpecWave(w, phase * 1.4 + 1.9, waveRgba(0.26 * fade), 2, 0.62);
            wctx.restore();
            rafId = requestAnimationFrame(drawFrame);
        } else {
            settleProgress = -1;
            rafId = null;
            spec.fill(0);
            wctx.clearRect(0, 0, w, WAVE_H);
        }
    }

    function drawFrame() {
        // 暂停后的落水动画：水面整块下沉滑出、波幅平息、逐渐透明，最后清空
        if (settleProgress >= 0) {
            settleProgress += 0.035;                            // 约 0.5s 落完
            for (let i = 0; i < WAVE_BINS; i++) spec[i] *= 0.88; // 波幅迅速平息
            fadeSettle();
            return;
        }

        sampleSpectrum();

        // 空间平滑（去毛刺）+ 时间平滑（去抖动）
        let sum = 0;
        for (let i = 0; i < WAVE_BINS; i++) {
            const prev = rawSpec[Math.max(0, i - 1)];
            const next = rawSpec[Math.min(WAVE_BINS - 1, i + 1)];
            const smooth = (prev + rawSpec[i] * 2 + next) / 4;
            spec[i] += (smooth - spec[i]) * 0.3;
            sum += spec[i];
        }
        const energyNow = sum / WAVE_BINS;

        const w = wrap.clientWidth || 180;
        wctx.clearRect(0, 0, w, WAVE_H);
        phase += 0.04 + energyNow * 0.05; // 声音越大，水流动越快

        // 水波颜色跟随当前页面主题色，并平滑过渡
        stepWaveColor();
        fillSpecWave(w, phase, waveRgba(0.55), 4, 1);
        fillSpecWave(w, phase * 1.4 + 1.9, waveRgba(0.26), 2, 0.62);

        rafId = requestAnimationFrame(drawFrame);
    }

    function startVisual() {
        resizeWave();
        ensureAudioGraph();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (rafId) cancelAnimationFrame(rafId);
        settleProgress = -1; // 取消可能正在进行的落水动画
        drawFrame();
    }

    function stopVisual() {
        // 正在动：交给 drawFrame 播放落水动画，结束后自行停止
        if (rafId && settleProgress < 0) {
            settleProgress = 0;
            return;
        }
        // 本来就没在动：直接归静
        energy = 0;
        targetEnergy = 0;
        spec.fill(0);
        wctx.clearRect(0, 0, wrap.clientWidth || 180, WAVE_H);
    }

    // 用 rAF 合并 resize 处理，避免连续 resize 时反复重分配 canvas 与重排曲名
    let resizePending = false;
    window.addEventListener('resize', () => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => {
            resizePending = false;
            if (rafId) resizeWave();
            const span = titleEl.querySelector('.mp-title-text');
            if (span) setupMarquee(span);
        });
    });

    function loadTrack(i) {
        index = (i + tracks.length) % tracks.length;
        const t = tracks[index];
        audio.src = encodeURI(MUSIC_BASE + t.file);

        // 曲名放进内层 span，过长时才滚动
        titleEl.textContent = '';
        const span = document.createElement('span');
        span.className = 'mp-title-text';
        span.textContent = t.title;
        titleEl.appendChild(span);
        setupMarquee(span);

        progEl.style.width = '0%';
        renderList();
    }

    // 曲名超出播放条宽度时来回滚动，短的保持静止
    function setupMarquee(span) {
        span.classList.remove('is-marquee');
        span.style.removeProperty('--marquee-shift');
        span.style.removeProperty('animation-duration');

        const overflow = span.scrollWidth - titleEl.clientWidth;
        if (overflow <= 2) return;

        span.style.setProperty('--marquee-shift', overflow + 'px');
        span.style.animationDuration = Math.min(18, 7 + overflow / 18) + 's';
        void span.offsetWidth; // 强制重排后再启动动画
        span.classList.add('is-marquee');
    }

    // 用 play / pause 事件驱动 UI，比依赖 play() 的 promise 更可靠
    function play() {
        audio.play().catch(() => {});
    }

    function pause() {
        audio.pause();
    }

    playBtn.addEventListener('click', () => { audio.paused ? play() : pause(); });
    wrap.querySelector('#mpPrev').addEventListener('click', () => { loadTrack(index - 1); play(); });
    wrap.querySelector('#mpNext').addEventListener('click', () => { loadTrack(index + 1); play(); });

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        progEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
    });
    audio.addEventListener('play', () => {
        playBtn.classList.add('is-playing'); // 切换到暂停图标
        musicPlaying = true;
        startVisual();
    });
    audio.addEventListener('ended', () => { stopVisual(); loadTrack(index + 1); play(); });
    audio.addEventListener('pause', () => {
        playBtn.classList.remove('is-playing'); // 切回播放图标
        musicPlaying = false;
        stopVisual();
    });

    // 点击进度条跳转
    barEl.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const r = barEl.getBoundingClientRect();
        audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });

    // ---- 歌曲列表：点标题展开 ----
    const listEl = wrap.querySelector('#mpList');

    function renderList() {
        listEl.innerHTML = tracks.map((t, i) =>
            `<button class="mp-item${i === index ? ' is-current' : ''}" type="button" data-i="${i}">${t.title}</button>`
        ).join('');
        listEl.querySelectorAll('.mp-item').forEach(btn => {
            btn.addEventListener('click', () => {
                loadTrack(Number(btn.dataset.i));
                play();
                listEl.classList.remove('open');
            });
        });
    }

    titleEl.addEventListener('click', () => listEl.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) listEl.classList.remove('open');
    });

    // ---- 跨页面续播 ----
    // 换页是整页刷新，音频对象会被销毁，所以把进度存进 sessionStorage，
    // 新页面再据此恢复到原来的位置继续播
    const STORE_KEY = 'musicState';

    function saveState() {
        try {
            sessionStorage.setItem(STORE_KEY, JSON.stringify({
                index: index,
                time: audio.currentTime,
                playing: !audio.paused
            }));
        } catch (e) {}
    }

    window.addEventListener('pagehide', saveState);
    window.addEventListener('beforeunload', saveState);
    audio.addEventListener('pause', saveState);
    audio.addEventListener('play', saveState);
    audio.addEventListener('timeupdate', () => {
        // 每约 5 秒记一次进度，防止 pagehide 没触发
        if (!audio.duration) return;
        if (!saveState._last || Date.now() - saveState._last > 5000) {
            saveState._last = Date.now();
            saveState();
        }
    });

    function restore() {
        let s = null;
        try { s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
        loadTrack(s && typeof s.index === 'number' ? s.index : 0);
        if (!s) return;

        if (s.time > 0) {
            const seek = () => { try { audio.currentTime = s.time; } catch (e) {} };
            if (audio.readyState >= 1) seek();
            else audio.addEventListener('loadedmetadata', seek, { once: true });
        }

        if (s.playing) {
            // 自动续播可能被浏览器的自动播放策略拦截；
            // 被拦时改为“用户首次点击页面任意处再接着播”
            audio.play().catch(() => {
                const resume = () => audio.play().catch(() => {});
                document.addEventListener('click', resume, { once: true });
            });
        }
    }

    // 自动检测：服务器开启目录列表时（如 python -m http.server）解析出所有音频，
    // 这样往文件夹里丢歌就会自动出现；取不到（file:// 或未开列表）则沿用 MUSIC_LIST
    function discoverTracks() {
        const audioExt = /\.(mp3|m4a|ogg|wav|flac)$/i;
        return fetch(MUSIC_BASE)
            .then(r => (r.ok ? r.text() : Promise.reject(new Error('no listing'))))
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const found = [];
                doc.querySelectorAll('a[href]').forEach(a => {
                    const name = decodeURIComponent((a.getAttribute('href') || '').split('/').pop() || '');
                    if (audioExt.test(name)) {
                        found.push({ title: name.replace(audioExt, ''), file: name });
                    }
                });
                return found;
            })
            .catch(() => []);
    }

    discoverTracks().then(found => {
        if (found.length) tracks = found;
        if (tracks.length >= 2) wrap.classList.remove('is-single');
        restore();
    });
}

// 各页面对应的色条配置
const pageConfig = {
    'index.html':        { color: '#c59fda', type: 'vertical',   left: '420px' },
    'html/about.html':   { color: '#006AB6', type: 'horizontal' },
    'html/card.html':    { color: '#ffbad6', type: 'vertical',   left: '0' },
    'html/friends.html': { color: '#F3983B', type: 'vertical',   left: '0' },
    'html/record.html':  { color: '#D162CB', type: 'vertical',   left: '0' },
};

// 根据当前页面把“相对根目录的 href”解析为真实的相对路径
function resolveHref(href) {
    const inHtml = /\/html\//.test(window.location.pathname);
    if (inHtml) {
        // html/ 下的页面：同目录文件去掉 html/ 前缀，根目录文件加 ../
        return href.startsWith('html/') ? href.slice('html/'.length) : '../' + href;
    }
    return href;
}

// 注入导航 DOM
function injectNav() {
    const nav = document.createElement('nav');
    nav.className = 'top-nav';
    nav.id = 'topNav';
    // 主题/音效按钮 hover 用的强调色：当前页面主题色
    const navCfg = getCurrentPage();
    nav.style.setProperty('--btn-color', (navCfg && navCfg.color) || '#c59fda');
    nav.innerHTML = `
        <button class="theme-toggle-btn" id="themeToggle" aria-label="切换主题">
            <span class="icon icon-moon">${ICON_MOON}</span>
            <span class="icon icon-sun">${ICON_SUN}</span>
        </button>
        <button class="sfx-toggle-btn" id="sfxToggle" aria-label="音效开关" aria-pressed="false">
            <span class="icon icon-sound-on">${ICON_SOUND_ON}</span>
            <span class="icon icon-sound-off">${ICON_SOUND_OFF}</span>
        </button>
        <button class="nav-toggle" id="navToggle" aria-label="菜单">
            <span></span><span></span><span></span>
        </button>
        <div class="nav-dropdown" id="navDropdown">
            ${NAV_ITEMS.filter(item => !item.hidden).map((item, i) => {
                const attr = item.href
                    ? `data-href="${item.href}"`
                    : `data-target="${item.target}"`;
                return `<button class="nav-btn" style="--btn-color:${NAV_COLORS[i]}" ${attr}><span>${item.label}</span></button>`;
            }).join('')}
        </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);

    if (!document.getElementById('arrowBlocks')) {
        const blocks = document.createElement('div');
        blocks.className = 'arrow-blocks';
        blocks.id = 'arrowBlocks';
        document.body.insertBefore(blocks, document.body.firstChild);
    }
}

// ========== 飞出色块 ==========
function getCurrentPage() {
    const path = window.location.pathname.replace(/^.*\/page\//, '') || 'index.html';
    return pageConfig[path] || pageConfig['index.html'];
}

function showArrowBlock(color, type, leftPos) {
    document.querySelectorAll('.arrow-block').forEach(el => {
        el.classList.remove('stay');
        el.classList.add('fly-out');
        const dir = el.dataset.entry || 'down';
        el.classList.add('fly-out-' + dir);
        // 锁定原模式外观，避免被当前主题滤镜染色
        el.style.filter = el.dataset.dim === '1' ? 'brightness(0.62) saturate(0.85)' : 'none';
    });

    setTimeout(() => {
        document.querySelectorAll('.arrow-block').forEach(el => el.remove());

        const block = document.createElement('div');
        const isHomeBar = leftPos === '420px';
        block.className = 'arrow-block stay ' + (type || 'vertical') + (isHomeBar ? ' home-bar' : '');
        const isDark = document.documentElement.dataset.theme === 'dark';
        block.dataset.entry = (type === 'horizontal')
            ? (isDark ? 'right' : 'left')
            : (isDark ? 'up' : 'down');
        // 记录是否暗色，飞出时锁定原外观，不被当前主题滤镜染色
        block.dataset.dim = isDark ? '1' : '0';
        block.style.setProperty('--block-color', color);
        block.style.background = `linear-gradient(${type === 'horizontal' ? '90deg' : '180deg'}, ${color}, ${color}dd)`;

        // 基础定位始终在屏内，飞入/飞出完全由 transform 动画控制
        if (type === 'horizontal') {
            block.style.width = '100vw';
            block.style.height = '44px';
            block.style.left = '0';
            block.style.top = 'auto';
            block.style.bottom = '0';
        } else {
            block.style.width = '44px';
            block.style.height = '100vh';
            let barLeft = leftPos || '420px';
            
            if (document.documentElement.dataset.theme === 'dark' && barLeft === '420px') {
                barLeft = 'calc(100vw - 500px)';
            }
            block.style.left = barLeft;
            block.style.top = '0';
            block.style.bottom = 'auto';
        }

        document.getElementById('arrowBlocks').appendChild(block);

        const toggle = document.getElementById('navToggle');
        if (toggle) {
            toggle.style.background = color;
            toggle.style.setProperty('--toggle-color', '#fff');
        }
    }, 400);
}

function flyOutCurrentBlock() {
    document.querySelectorAll('.arrow-block').forEach(el => {
        el.classList.remove('stay');
        el.classList.add('fly-out');
        const dir = el.dataset.entry || 'down';
        el.classList.add('fly-out-' + dir);
        // 锁定原模式外观，避免被当前主题滤镜染色
        el.style.filter = el.dataset.dim === '1' ? 'brightness(0.62) saturate(0.85)' : 'none';
    });
    const toggle = document.getElementById('navToggle');
    if (toggle) {
        toggle.style.background = '';
        toggle.style.removeProperty('--toggle-color');
    }
}

function goPage(url) {
    flyOutCurrentBlock();
    setTimeout(() => { pjaxNavigate(url); }, 450);
}

// 给所有 .card-flip 绑定点击翻转：点左半往右翻，点右半往左翻，再次点击复位。
function bindCardFlip() {
    document.querySelectorAll('.card-flip').forEach(el => {
        el.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const isLeft = x < rect.width / 2;
            const isFlipped = this.classList.contains('flipped-right') || this.classList.contains('flipped-left');
            this.classList.remove('flipped-right', 'flipped-left');
            if (!isFlipped) {
                this.classList.add(isLeft ? 'flipped-right' : 'flipped-left');
            }
        });
    });
}

// ========== 导航交互 ==========
function initNav() {
    const toggle = document.getElementById('navToggle');
    const dropdown = document.getElementById('navDropdown');

    toggle.addEventListener('click', () => {
        const isOpen = dropdown.classList.toggle('open');
        toggle.classList.toggle('active', isOpen);
        // 点击汉堡按钮：播放 click 音
        playSfx(sfxClick);
    });

    // 点击汉堡/下拉区域以外时收回菜单
    document.addEventListener('click', (e) => {
        const nav = document.getElementById('topNav');
        if (dropdown.classList.contains('open') && nav && !nav.contains(e.target)) {
            dropdown.classList.remove('open');
            toggle.classList.remove('active');
        }
    });

    document.querySelectorAll('.nav-dropdown .nav-btn').forEach(btn => {
        // 鼠标移到子按钮上播放 select 音
        btn.addEventListener('mouseenter', () => playSfx(sfxSelect));

        btn.addEventListener('click', function () {
            // 点击子按钮：播放 click 音
            playSfx(sfxClick);

            const color = this.style.getPropertyValue('--btn-color').trim();
            const target = this.dataset.target;
            const href = this.dataset.href;

            // 关闭菜单
            dropdown.classList.remove('open');
            toggle.classList.remove('active');

            if (target && document.getElementById(target)) {
                document.getElementById(target).scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => showArrowBlock(color, getCurrentPage().type, getCurrentPage().left), 400);
                return;
            }

            // 跨页跳转
            let url = null;
            if (href) {
                url = resolveHref(href);
            } else if (target) {
                const pageMap = {
                    home: 'index.html',
                    about: 'html/about.html',
                friends: 'html/friends.html',
                contact: 'html/card.html',
                };
                url = pageMap[target] || null;
            }

            if (url) {
                goPage(url);
            }
        });
    });

    // 主题切换按钮：必须放在 forEach 外，否则每个导航按钮都会挂一次监听
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            playSfx(sfxClick);
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            const cfg = getCurrentPage();
            if (cfg) {
                showArrowBlock(cfg.color, cfg.type, cfg.left);
            }
            document.body.classList.remove('theme-switch');
            void document.body.offsetWidth;
            document.body.classList.add('theme-switch');
        });
    }

    // 音效开关（同样必须在 forEach 外，只绑定一次）
    const sfxBtn = document.getElementById('sfxToggle');
    if (sfxBtn) {
        const syncSfxBtn = () => {
            sfxBtn.classList.toggle('is-on', sfxEnabled);
            sfxBtn.setAttribute('aria-pressed', sfxEnabled ? 'true' : 'false');
        };
        syncSfxBtn();
        sfxBtn.addEventListener('click', () => {
            sfxEnabled = !sfxEnabled;
            try { localStorage.setItem(SFX_KEY, sfxEnabled ? '1' : '0'); } catch (e) {}
            syncSfxBtn();
            if (sfxEnabled) playSfx(sfxClick); // 开启时给一声反馈
        });
    }
}

function setThemeAttr(theme) {
    document.documentElement.dataset.theme = theme;
}

// 预加载首页另一主题的配图，切换时无需重新从网络拉取
const HOME_IMAGES = {
    light: 'image/index/index.png',
    dark: 'image/index/index_night.png'
};
function preloadAltHomeImage(theme) {
    const alt = theme === 'dark' ? HOME_IMAGES.light : HOME_IMAGES.dark;
    const img = new Image();
    img.src = alt;
}

function applyTheme(theme) {
    setThemeAttr(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    preloadAltHomeImage(theme);
}

function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    setThemeAttr(theme);
    preloadAltHomeImage(theme);
}

// ========== 移动端访问提示 ==========
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent);
}

function initMobileNotice() {
    if (!isMobileDevice()) return;
    if (sessionStorage.getItem('mobileNoticeShown')) return;
    if (document.querySelector('.mobile-notice')) return; // 已存在则跳过，避免 PJAX 切页重复叠加

    const overlay = document.createElement('div');
    overlay.className = 'mobile-notice';
    overlay.innerHTML = `
        <div class="mobile-notice__card">
            <h2 class="mobile-notice__title">使用 PC 获取更好体验</h2>
            <p class="mobile-notice__desc">当前页面在手机上可能无法完整呈现，建议使用电脑浏览器访问以获得最佳浏览效果。</p>
            <button class="mobile-notice__btn" type="button">继续访问</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
        sessionStorage.setItem('mobileNoticeShown', '1');
        overlay.classList.add('is-hide');
        document.body.style.overflow = '';
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };
    overlay.querySelector('.mobile-notice__btn').addEventListener('click', close);
}

// ========== 初始化 ==========
window.addEventListener('load', () => {
    injectNav();
    initNav();
    initMusicPlayer();
    initTheme();
    bindCardFlip();
    initClickBars();
    initMobileNotice();

    const config = getCurrentPage();
    if (config) {
        setTimeout(() => showArrowBlock(config.color, config.type, config.left), 600);
    }
});

// ========== PJAX：切换页面但保留播放器（音乐不断） ==========
// 说明：file:// 下浏览器禁止 fetch，会自动退回整页跳转（配合已有的续播逻辑）
const PJAX_ENABLED = window.location.protocol === 'http:' || window.location.protocol === 'https:';

// 已加载过的外部脚本（如 data/records.js）：重复加载会因 const 重复声明报错，
// 而它定义的全局数据（recordData 等）本来就在，跳过即可
const loadedScripts = new Set();

function absoluteUrl(rel, base) {
    try { return new URL(rel, base).href; } catch (e) { return rel; }
}

function loadScript(src) {
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = resolve; // 加载失败也继续，避免卡住整个流程
        document.head.appendChild(s);
    });
}

function runInlineScript(code) {
    if (!code || !code.trim()) return;
    try {
        const s = document.createElement('script');
        // 包一层 IIFE：让脚本里的顶层 const/let 成为局部绑定，
        // 否则 PJAX 第二次执行同一段脚本会报 “Identifier 'xxx' has already been declared”
        s.textContent = '(function(){\n' + code + '\n})();';
        document.head.appendChild(s);
    } catch (e) {}
}

async function pjaxNavigate(url, isPop) {
    if (!PJAX_ENABLED) { window.location.href = url; return; }

    const target = absoluteUrl(url, window.location.href);
    let html;
    try {
        const res = await fetch(target);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        html = await res.text();
    } catch (e) {
        window.location.href = url; // 兜底：退回整页跳转
        return;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nav = document.getElementById('topNav');
    const blocks = document.getElementById('arrowBlocks');
    const player = document.querySelector('.mini-player');

    // 按文档顺序收集脚本，稍后统一执行（保证 data/*.js 先于内联脚本）
    const scripts = Array.from(doc.querySelectorAll('script'));

    if (doc.title) document.title = doc.title;

    // 先换地址，之后注入的相对资源才会按新页面解析
    if (!isPop) window.history.pushState({ pjax: true }, '', target);

    // 清空内容，保留常驻元素：导航 / 色条容器 / 播放器
    Array.from(document.body.children).forEach(el => {
        if (el === nav || el === blocks || el === player) return;
        el.remove();
    });

    // 注入新页面内容（脚本剥离，交给下面统一执行）
    Array.from(doc.body.children).forEach(el => {
        if (el.tagName === 'SCRIPT') return;
        const node = document.importNode(el, true);
        if (node.querySelectorAll) node.querySelectorAll('script').forEach(s => s.remove());
        document.body.appendChild(node);
    });

    // 注入新页面的内联样式，先清掉上一页留下的
    document.head.querySelectorAll('style[data-pjax-style]').forEach(s => s.remove());
    Array.from(doc.head.querySelectorAll('style')).forEach(st => {
        const s = document.createElement('style');
        s.setAttribute('data-pjax-style', '1');
        s.textContent = st.textContent;
        document.head.appendChild(s);
    });

    // 依次执行脚本；跳过 script.js，避免重复注入导航与播放器
    for (const s of scripts) {
        const src = s.getAttribute('src');
        if (src) {
            if (/js\/script\.js$/.test(src)) continue;
            const abs = absoluteUrl(src, target);
            if (loadedScripts.has(abs)) continue; // 已加载过，全局数据仍在
            loadedScripts.add(abs);
            await loadScript(abs);
        } else {
            runInlineScript(s.textContent);
        }
    }

    afterPjax();
}

function afterPjax() {
    // 新页面的主题色（导航 hover、播放器 hover 用）
    const cfg = getCurrentPage();
    const color = (cfg && cfg.color) || '#c59fda';
    const nav = document.getElementById('topNav');
    if (nav) nav.style.setProperty('--btn-color', color);
    const player = document.querySelector('.mini-player');
    if (player) player.style.setProperty('--btn-color', color);

    // 重新绑定新页面的交互
    bindCardFlip();
    initClickBars();
    initMobileNotice();

    const cfg2 = getCurrentPage();
    if (cfg2) showArrowBlock(cfg2.color, cfg2.type, cfg2.left);

    window.scrollTo(0, 0);
}

// 浏览器前进 / 后退
window.addEventListener('popstate', () => {
    pjaxNavigate(window.location.href, true);
});

// ========== 首页点击色条 ==========
const CLICK_BAR_COLORS = [
    '#E60012', '#0060A8', '#B0CA00', '#D9E5E6', '#F39800', '#000000',
    '#FC8A82', '#A4005B', '#007536', '#920783', '#FFE200', '#00A0E9', '#79C06E',
];

let clickBarsBound = false;
let autoBarTimer = null;

function initClickBars() {
    // 点击出色条只绑定一次，PJAX 切换页面不会重复叠加监听
    if (!clickBarsBound) {
        bindClickBars();
        clickBarsBound = true;
    }
    // 自动色条只在首页开启；离开首页时停掉定时器
    if (document.querySelector('.home-sub')) {
        startAutoClickBars();
    } else if (autoBarTimer) {
        clearTimeout(autoBarTimer);
        autoBarTimer = null;
    }
}

function bindClickBars() {
    const pool = NAV_COLORS.concat(CLICK_BAR_COLORS);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.top-nav')) return;
        if (e.target.closest('.profile-side')) return;
        if (!e.target.closest('.content-side')) return;
        const ab = document.querySelector('.arrow-block');
        if (ab) {
            const r = ab.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right) return;
        }

        const color = pool[Math.floor(Math.random() * pool.length)];
        const bar = document.createElement('div');

        const isUpper = e.clientY < window.innerHeight / 2;
        bar.className = 'click-bar ' + (isUpper ? 'fly-down' : 'fly-up');
        bar.style.background = `linear-gradient(180deg, ${color}, ${color}cc)`;

        const host = document.querySelector('.content-side') || document.body;
        const rect = host.getBoundingClientRect();
        bar.style.top = (-rect.top) + 'px';                 
        bar.style.left = (e.clientX - rect.left - 22) + 'px'; 
        host.appendChild(bar);

        bar.addEventListener('animationend', () => bar.remove());
    });
}

function spawnClickBar(x, y) {
    const pool = NAV_COLORS.concat(CLICK_BAR_COLORS);
    const color = pool[Math.floor(Math.random() * pool.length)];
    const bar = document.createElement('div');
    const isUpper = y < window.innerHeight / 2;
    bar.className = 'click-bar ' + (isUpper ? 'fly-down' : 'fly-up');
    bar.style.background = `linear-gradient(180deg, ${color}, ${color}cc)`;

    const host = document.querySelector('.content-side') || document.body;
    const rect = host.getBoundingClientRect();
    bar.style.top = (-rect.top) + 'px';
    bar.style.left = (x - rect.left - 22) + 'px';
    host.appendChild(bar);
    bar.addEventListener('animationend', () => bar.remove());
}

function startAutoClickBars() {
    if (autoBarTimer) clearTimeout(autoBarTimer); // 避免叠加多个定时器
    const schedule = () => {
        const delay = 5000 + Math.random() * 5000;
        autoBarTimer = setTimeout(() => {
            spawnAutoBar();
            schedule();
        }, delay);
    };
    schedule();
}

function spawnAutoBar() {
    if (musicPlaying) return; // 播放音乐时暂停自动色条，避免画面太乱
    const host = document.querySelector('.content-side') || document.body;
    const rect = host.getBoundingClientRect();
    const ab = document.querySelector('.arrow-block');
    let x = 0;
    for (let i = 0; i < 20; i++) {
        x = rect.left + Math.random() * rect.width;
        if (!ab) break;
        const r = ab.getBoundingClientRect();
        if (x < r.left || x > r.right) break;
    }
    const y = Math.random() * window.innerHeight;
    spawnClickBar(x, y);
}

