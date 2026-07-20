const container = document.getElementById('arrowBlocks');
const toggle = document.getElementById('navToggle');
const dropdown = document.getElementById('navDropdown');

// 汉堡菜单开关
toggle.addEventListener('click', () => {
    const isOpen = dropdown.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
});

// 点击导航项
document.querySelectorAll('.nav-dropdown .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.style.getPropertyValue('--btn-color').trim();
        const target = btn.dataset.target;

        // 关闭菜单
        dropdown.classList.remove('open');
        toggle.classList.remove('active');

        // 移除已有的飞出块
        document.querySelectorAll('.arrow-block').forEach(el => {
            el.classList.add('fly-out');
            setTimeout(() => el.remove(), 500);
        });

        // 创建新色块 - 从屏幕最左边飞出
        const block = document.createElement('div');
        block.className = 'arrow-block';
        block.dataset.target = target;
        block.style.setProperty('--block-color', color);
        block.style.background = `linear-gradient(180deg, ${color}, ${color}dd)`;
        block.style.left = '0';
        block.innerHTML = '';

        container.appendChild(block);

        // 滚动到对应区域
        const section = document.getElementById(target);
        if (section) {
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
        }
    });
});


