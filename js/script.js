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
    // 只有真正的点击音才扩散波纹，悬停音不触发，避免过于晃动
    if (audio === sfxClick) rippleSfxBtn();
}

// 让音效按钮扩散一圈波纹（重新触发需先移除类并强制重排）
// 动画结束后移除类，这样音乐播放时的循环波纹能继续
function rippleSfxBtn() {
    const btn = document.getElementById('sfxToggle');
    if (!btn) return;
    btn.classList.remove('is-playing');
    void btn.offsetWidth;
    btn.classList.add('is-playing');
    clearTimeout(btn._rippleTimer);
    btn._rippleTimer = setTimeout(() => btn.classList.remove('is-playing'), 900);
}

// ========== 迷你播放列表 ==========
const MUSIC_BASE = /\/html\//.test(window.location.pathname) ? '../sound/music/' : 'sound/music/';
const MUSIC_LIST = [
    { title: '秋山裕和,むにょっ - ★サティジムノペディ', file: '秋山裕和,むにょっ - ★サティジムノペディ.mp3' },
    // 新增歌曲：往这里加一行 { title: '显示名', file: '文件名.mp3' }
];

function initMusicPlayer() {
    if (!MUSIC_LIST.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'mini-player';
    wrap.innerHTML = `
        <button class="mp-btn" id="mpPrev" aria-label="上一首" type="button">&#9198;</button>
        <button class="mp-btn mp-play" id="mpPlay" aria-label="播放/暂停" type="button">&#9654;</button>
        <button class="mp-btn" id="mpNext" aria-label="下一首" type="button">&#9197;</button>
        <div class="mp-info">
            <div class="mp-title" id="mpTitle"></div>
            <div class="mp-bar" id="mpBar"><span id="mpProgress"></span></div>
        </div>
    `;
    document.body.appendChild(wrap);

    const audio = new Audio();
    audio.preload = 'metadata';

    const playBtn = wrap.querySelector('#mpPlay');
    const titleEl = wrap.querySelector('#mpTitle');
    const barEl = wrap.querySelector('#mpBar');
    const progEl = wrap.querySelector('#mpProgress');
    let index = 0;

    // 播放时在音效按钮上持续扩散波纹，作为“正在出声”的视觉反馈
    function setMusicVisual(on) {
        const btn = document.getElementById('sfxToggle');
        if (btn) btn.classList.toggle('is-music', on);
    }

    function loadTrack(i) {
        index = (i + MUSIC_LIST.length) % MUSIC_LIST.length;
        const t = MUSIC_LIST[index];
        audio.src = encodeURI(MUSIC_BASE + t.file);
        titleEl.textContent = t.title;
        progEl.style.width = '0%';
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
        playBtn.innerHTML = '&#10073;&#10073;'; // 暂停图标
        setMusicVisual(true);
    });
    audio.addEventListener('ended', () => { loadTrack(index + 1); play(); });
    audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;'; setMusicVisual(false); });

    // 点击进度条跳转
    barEl.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const r = barEl.getBoundingClientRect();
        audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });

    loadTrack(0);
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
    nav.innerHTML = `
        <button class="theme-toggle-btn" id="themeToggle" aria-label="切换主题">
            <span class="icon icon-moon">${ICON_MOON}</span>
            <span class="icon icon-sun">${ICON_SUN}</span>
        </button>
        <button class="sfx-toggle-btn" id="sfxToggle" aria-label="音效开关" aria-pressed="false">
            <span class="wave wave-1"></span>
            <span class="wave wave-2"></span>
            <span class="wave wave-3"></span>
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
    setTimeout(() => { window.location.href = url; }, 450);
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

// ========== 首页点击色条 ==========
const CLICK_BAR_COLORS = [
    '#E60012', '#0060A8', '#B0CA00', '#D9E5E6', '#F39800', '#000000',
    '#FC8A82', '#A4005B', '#007536', '#920783', '#FFE200', '#00A0E9', '#79C06E',
];

function initClickBars() {
    if (!document.querySelector('.home-sub')) return;

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

    startAutoClickBars();
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
    const schedule = () => {
        const delay = 5000 + Math.random() * 5000;
        setTimeout(() => {
            spawnAutoBar();
            schedule();
        }, delay);
    };
    schedule();
}

function spawnAutoBar() {
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
