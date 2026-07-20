const container = document.getElementById('arrowBlocks');
const toggle = document.getElementById('navToggle');
const dropdown = document.getElementById('navDropdown');

// 创建/切换色块
function showArrowBlock(color, target) {
    // 移除旧的色块
    document.querySelectorAll('.arrow-block').forEach(el => el.remove());

    // 创建新色块 - 从屏幕最左边飞出，常驻
    const block = document.createElement('div');
    block.className = 'arrow-block stay';
    block.style.setProperty('--block-color', color);
    block.style.background = `linear-gradient(180deg, ${color}, ${color}dd)`;
    block.style.left = '0';
    block.innerHTML = '';

    container.appendChild(block);

    // 汉堡按钮同步变色
    if (toggle) {
        toggle.style.background = color;
        toggle.style.setProperty('--toggle-color', '#fff');
    }
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

        // 飞出色块并保留
        showArrowBlock(color, target);

        // 检查目标是否在当前页面
        const section = document.getElementById(target);
        if (section) {
            // 同页滚动
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        } else if (target) {
            const basePath = window.location.pathname.includes('/html/') ? '../' : '';
            // 名片特殊处理
            if (target === 'contact') {
                // 如果已经在名片页面，滚动到顶部；否则跳转
                if (window.location.pathname.includes('card.html')) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = `${basePath}html/card.html#contact`;
                }
            } else {
                window.location.href = `${basePath}index.html#${target}`;
            }
        }
    });
});

// 页面加载时检查 hash，恢复色块（跨页跳转后）
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    const colorMap = {
        home: '#c59fda',
        about: '#3498db',
        blog: '#2ecc71',
        projects: '#f39c12',
        contact: '#9b59b6'
    };
    const color = hash ? colorMap[hash] : colorMap.home;
    if (color) showArrowBlock(color, hash || 'home');
});


