// 다크모드 초기화
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    updateThemeIcon(isDarkMode);
}

// 테마 토글
function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateThemeIcon(isDarkMode);
}

// 아이콘 업데이트
function updateThemeIcon(isDarkMode) {
    const icon = document.getElementById('theme-icon');
    if (isDarkMode) {
        // 초승달 아이콘 (다크모드)
        icon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
    } else {
        // 태양 아이콘 (라이트 모드)
        icon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        `;
    }
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});
