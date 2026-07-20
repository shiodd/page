const container = document.getElementById('arrowBlocks');
const toggle = document.getElementById('navToggle');
const dropdown = document.getElementById('navDropdown');

// 色条配置：每个页面对应的颜色和色条类型
const pageConfig = {
    'index.html':       { color: '#c59fda', type: 'vertical' },
    'html/about.html':  { color: '#3498db', type: 'horizontal' },
    'html/card.html':   { color: '#9b59b6', type: 'vertical' },
    'html/friends.html': { color: '#2ecc71', type: 'vertical' },
};

// 获取当前页面的配置
function getCurrentPage() {
    const path = window.location.pathname.replace(/^.*\/page\//, '') || 'index.html';
    return pageConfig[path] || pageConfig['index.html'];
}

// 创建/切换色块
function showArrowBlock(color, type) {
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
            // 横向色条：从右往左飞入，停在底部
            block.style.width = '100vw';
            block.style.height = '44px';
            block.style.left = '100vw';
            block.style.top = 'auto';
            block.style.bottom = '0';
            block.style.background = `linear-gradient(90deg, ${color}, ${color}dd)`;
            block.style.animation = 'barSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards';
        } else {
            // 竖向色条：从上往下飞入，停在图片右侧
            block.style.width = '44px';
            block.style.height = '100vh';
            block.style.left = '420px';
            block.style.top = '-100vh';
            block.style.bottom = 'auto';
            block.style.background = `linear-gradient(180deg, ${color}, ${color}dd)`;
            block.style.animation = 'arrowDrop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards';
        }

        container.appendChild(block);

        // 汉堡按钮同步变色
        if (toggle) {
            toggle.style.background = color;
            toggle.style.setProperty('--toggle-color', '#fff');
        }
    }, 400);
}

// 汉堡菜单开关
toggle.addEventListener('click', () => {
    const isOpen = dropdown.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
});

// 点击导航项
document.querySelectorAll('.nav-dropdown .nav-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
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

        // 同页跳转
        const section = document.getElementById(target);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => showArrowBlock(color, getCurrentPage().type), 400);
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
            window.location.href = page + (target === 'contact' ? '#contact' : '');
        }
    });
});

// 页面加载时显示对应色条（card.html 自己处理）
window.addEventListener('load', () => {
    if (window.location.pathname.includes('card.html')) return;
    const config = getCurrentPage();
    setTimeout(() => showArrowBlock(config.color, config.type), 600);
});
