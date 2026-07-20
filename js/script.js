// ========== 统一导航栏 ==========
// 各页面只需引入本脚本，导航与飞出色块会自动注入；无需再手写 nav DOM。

// 导航项（label + 跳转目标）。带 data-target 的同页跳转（项目/博客）由脚本处理；
// 其余用 window.location.href 跳转。
const NAV_ITEMS = [
    { label: '首页',   href: 'index.html' },
    { label: '关于',   href: 'html/about.html' },
    { label: '名片墙', href: 'html/friends.html' },
    { label: '项目',   target: 'projects' },
    { label: '名片',   href: 'html/card.html' },
];

// 各页面对应的色条配置
const pageConfig = {
    'index.html':        { color: '#c59fda', type: 'vertical',   left: '420px' },
    'about.html':        { color: '#3498db', type: 'horizontal' },
    'html/about.html':   { color: '#3498db', type: 'horizontal' },
    'html/card.html':    { color: '#9b59b6', type: 'vertical',   left: '0' },
    'html/friends.html': { color: '#2ecc71', type: 'vertical',   left: '0' },
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
        <button class="nav-toggle" id="navToggle" aria-label="菜单">
            <span></span><span></span><span></span>
        </button>
        <div class="nav-dropdown" id="navDropdown">
            ${NAV_ITEMS.map(item => {
                const attr = item.href
                    ? `onclick="window.location.href='${resolveHref(item.href)}'"`
                    : `data-target="${item.target}"`;
                return `<button class="nav-btn" style="--btn-color:${item.color}" ${attr}><span>${item.label}</span></button>`;
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

// 各按钮颜色（注入时写入，便于脚本读取）
NAV_ITEMS.forEach((it, i) => {
    it.color = ['#c59fda', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'][i];
});

// ========== 飞出色块 ==========
function getCurrentPage() {
    const path = window.location.pathname.replace(/^.*\/page\//, '') || 'index.html';
    return pageConfig[path] || pageConfig['index.html'];
}

function showArrowBlock(color, type, leftPos) {
    document.querySelectorAll('.arrow-block').forEach(el => {
        el.classList.remove('stay');
        el.classList.add('fly-out');
    });

    setTimeout(() => {
        document.querySelectorAll('.arrow-block').forEach(el => el.remove());

        const block = document.createElement('div');
        block.className = 'arrow-block stay';
        block.style.setProperty('--block-color', color);
        block.innerHTML = '';

        if (type === 'horizontal') {
            block.style.width = '100vw';
            block.style.height = '44px';
            block.style.left = '100vw';
            block.style.top = 'auto';
            block.style.bottom = '0';
            block.style.background = `linear-gradient(90deg, ${color}, ${color}dd)`;
            block.style.animation = 'barSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards';
        } else {
            block.style.width = '44px';
            block.style.height = '100vh';
            block.style.left = leftPos || '420px';
            block.style.top = '-100vh';
            block.style.bottom = 'auto';
            block.style.background = `linear-gradient(180deg, ${color}, ${color}dd)`;
            block.style.animation = 'arrowDrop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards';
        }

        document.getElementById('arrowBlocks').appendChild(block);

        const toggle = document.getElementById('navToggle');
        if (toggle) {
            toggle.style.background = color;
            toggle.style.setProperty('--toggle-color', '#fff');
        }
    }, 400);
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
    });

    document.querySelectorAll('.nav-dropdown .nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const color = this.style.getPropertyValue('--btn-color').trim();
            const target = this.dataset.target;

            // 关闭菜单
            dropdown.classList.remove('open');
            toggle.classList.remove('active');

            // 旧色块立即飞走
            document.querySelectorAll('.arrow-block').forEach(el => {
                el.classList.remove('stay');
                el.classList.add('fly-out');
            });
            setTimeout(() => {
                document.querySelectorAll('.arrow-block').forEach(el => el.remove());
            }, 500);

            // 同页跳转（项目/博客）
            const section = document.getElementById(target);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => showArrowBlock(color, getCurrentPage().type, getCurrentPage().left), 400);
                return;
            }

            // 跨页跳转
            const pageMap = {
                home: 'index.html',
                about: 'html/about.html',
                friends: 'html/friends.html',
                projects: 'projects.html',
                contact: 'html/card.html',
            };
            const page = pageMap[target];
            if (page) {
                window.location.href = page;
            }
        });
    });
}

// ========== 初始化 ==========
window.addEventListener('load', () => {
    injectNav();
    initNav();
    bindCardFlip();

    const config = getCurrentPage();
    if (config) {
        setTimeout(() => showArrowBlock(config.color, config.type, config.left), 600);
    }
});
