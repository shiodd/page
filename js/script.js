// ========== 统一导航栏 ==========
// 各页面只需引入本脚本，导航与飞出色块会自动注入；无需再手写 nav DOM。

// 导航项（label + 跳转目标）。带 data-target 的同页跳转由脚本处理；其余跨页跳转。
const NAV_ITEMS = [
    { label: '首页',   href: 'index.html' },
    { label: '关于',   href: 'html/about.html' },
    { label: '记录',   href: 'html/record.html' },
    { label: '名片',   href: 'html/card.html' },
    { label: '友链', href: 'html/friends.html' },
];

const NAV_COLORS = ['#c59fda', '#006AB6', '#D162CB', '#ffbad6', '#F3983B'];

// 主题切换图标（用 currentColor，自动跟随主题深浅）
const ICON_MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

// ========== 音效 ==========
// 根据当前所在目录解析音频相对路径（与 resolveHref 逻辑一致）
const SFX_BASE = /\/html\//.test(window.location.pathname) ? '../sound/sfx/' : 'sound/sfx/';
const sfxClick = new Audio(SFX_BASE + 'click.mp3');
const sfxSelect = new Audio(SFX_BASE + 'select.mp3');
// 提前缓存音效：强制预加载，避免首次点击才去网络拉取、解码导致延迟
[sfxClick, sfxSelect].forEach(a => {
    a.preload = 'auto';
    a.load();
});

function playSfx(audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
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
        <button class="nav-toggle" id="navToggle" aria-label="菜单">
            <span></span><span></span><span></span>
        </button>
        <div class="nav-dropdown" id="navDropdown">
            ${NAV_ITEMS.map((item, i) => {
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
    // 旧色块先沿各自进入方向飞走（用于同页刷新色条）
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
        // 记录进入方向，供切主题/刷新时沿同方向飞出（不退回）
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

// 让当前色块播放飞走动画（由多到少 + 飞出），并复位汉堡按钮颜色
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

// 先播放飞走动画，再跳转（用于切换页面）
function goPage(url) {
    flyOutCurrentBlock();
    setTimeout(() => { window.location.href = url; }, 450);
}

// ========== 名片翻转（可复用） ==========
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

            // 同页锚点跳转（存在对应区块时）
            if (target && document.getElementById(target)) {
                document.getElementById(target).scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => showArrowBlock(color, getCurrentPage().type, getCurrentPage().left), 400);
                return;
            }

            // 跨页跳转：先飞走色块，再跳转
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

        // 主题切换按钮（夜间模式）
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                playSfx(sfxClick);
                const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                // 切换主题后刷新当前页色条，使其反向飞入（夜间模式镜像到右侧）
                const cfg = getCurrentPage();
                if (cfg) {
                    showArrowBlock(cfg.color, cfg.type, cfg.left);
                }
                // 切换主题：整页淡入（字与图片）
                document.body.classList.remove('theme-switch');
                void document.body.offsetWidth;
                document.body.classList.add('theme-switch');
            });
        }
    });
}

// ========== 主题切换（夜间模式） ==========
function setThemeAttr(theme) {
    document.documentElement.dataset.theme = theme;
}

function applyTheme(theme) {
    setThemeAttr(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
}

function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setThemeAttr(saved || (prefersDark ? 'dark' : 'light'));
}

// ========== 初始化 ==========
window.addEventListener('load', () => {
    injectNav();
    initNav();
    initTheme();
    bindCardFlip();
    initClickBars();

    const config = getCurrentPage();
    if (config) {
        setTimeout(() => showArrowBlock(config.color, config.type, config.left), 600);
    }
});

// ========== 首页点击色条 ==========
// 点击页面任意位置，从点击的 x 坐标落下一条贯穿全屏高度的色条，停留后从右侧飞走。
// 颜色池 = 所有主题色（NAV_COLORS）+ 额外色，不写死在 CSS 里。
const CLICK_BAR_COLORS = [
    '#E60012', '#0060A8', '#B0CA00', '#D9E5E6', '#F39800', '#000000',
    '#FC8A82', '#A4005B', '#007536', '#920783', '#FFE200', '#00A0E9', '#79C06E',
];

function initClickBars() {
    // 仅首页（含 .home-sub）启用
    if (!document.querySelector('.home-sub')) return;

    const pool = NAV_COLORS.concat(CLICK_BAR_COLORS);

    document.addEventListener('click', (e) => {
        // 点到导航/菜单时不触发，避免与导航交互冲突
        if (e.target.closest('.top-nav')) return;
        // 限定在文字内容区（.content-side），图片区（.profile-side）不可点
        if (e.target.closest('.profile-side')) return;
        if (!e.target.closest('.content-side')) return;
        // 原色条（.arrow-block）所在横向位置不可点
        const ab = document.querySelector('.arrow-block');
        if (ab) {
            const r = ab.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right) return;
        }

        const color = pool[Math.floor(Math.random() * pool.length)];
        const bar = document.createElement('div');
        // 点击位置在屏幕上半 → 从顶部落下、从下方飞走；下半 → 从底部升起、从上方飞走
        const isUpper = e.clientY < window.innerHeight / 2;
        bar.className = 'click-bar ' + (isUpper ? 'fly-down' : 'fly-up');
        bar.style.background = `linear-gradient(180deg, ${color}, ${color}cc)`;

        // 色条放进内容区内部，定位相对内容区（避免被其半透明面板冲淡，又不遮挡文字）
        const host = document.querySelector('.content-side') || document.body;
        const rect = host.getBoundingClientRect();
        bar.style.top = (-rect.top) + 'px';                 // 对齐到视口顶部
        bar.style.left = (e.clientX - rect.left - 22) + 'px'; // 22 = 宽度一半，居中于点击点
        host.appendChild(bar);

        bar.addEventListener('animationend', () => bar.remove());
    });
}
