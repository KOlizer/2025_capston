// 검색어 가져오기
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 사이드바 토글 설정 함수
function setupSidebarToggles() {
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const sidebar = document.getElementById('sidebar');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const header = document.querySelector('header');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (header) header.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
        });
    }

    if (settingsToggle && settingsSidebar) {
        settingsToggle.addEventListener('click', () => {
            settingsSidebar.classList.toggle('open');
            if (header) header.classList.toggle('settings-sidebar-open', settingsSidebar.classList.contains('open'));
        });
    }
}

// 알림 상태 토글 함수
async function toggleNotification(ticker, companyName) {
    if (!isLoggedIn) {
        Swal.fire({ icon: 'warning', title: '로그인 필요', text: '알림 설정은 로그인 후 사용 가능합니다.' });
        return;
    }

    const userId = localStorage.getItem('user_id');
    const isNotified = notifications[ticker] || false;

    try {
        const response = await fetch('http://61.109.236.163:8000/update_notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: userId,
                company_name: companyName,
                notification: !isNotified
            })
        });

        if (!response.ok) throw new Error('알림 설정 업데이트 실패');

        const data = await response.json();
        notifications[ticker] = !isNotified;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        await displaySearchResults(); // UI 갱신
        Swal.fire({ icon: 'success', title: '알림 설정', text: data.message });
    } catch (err) {
        Swal.fire({ icon: 'error', title: '오류', text: `알림 설정 ${isNotified ? '해제' : '설정'}에 실패했습니다.` });
    }
}

// 검색 결과 표시
async function displaySearchResults() {
    const companyName = getQueryParam('q');
    if (!companyName) {
        document.getElementById('search-results').innerHTML = '<tr><td colspan="2">검색어가 없습니다.</td></tr>';
        return;
    }

    const results = await fetchSearchResults(decodeURIComponent(companyName));
    const searchResults = document.getElementById('search-results');

    if (!results || results.length === 0) {
        searchResults.innerHTML = '<tr><td colspan="2">검색 결과가 없습니다.</td></tr>';
        return;
    }

    searchResults.innerHTML = results.map(stock => {
        const isFavorited = favorites.includes(stock.ticker);
        const isNotified = notifications[stock.ticker] || false;

        return `
            <tr>
                <td>
                    ${stock.company_name || 'N/A'}
                    <button class="favorite-icon ${isFavorited ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}" 
                            onclick="toggleFavorite('${stock.ticker}')">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                        </svg>
                    </button>
                  
                    <button class="notification-icon ${isNotified ? 'notified' : ''} ${!isLoggedIn ? 'disabled' : ''}" 
                        onclick="toggleNotification('${stock.ticker}', '${stock.company_name || 'N/A'}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-4H6V6h12v2z"/>
</svg>
                </button>
                </td>
                <td>
                    <table class="detail-table">
                        <tr><td>티커</td><td>${stock.ticker || 'N/A'}</td></tr>
                        <tr><td>현재 주가</td><td>${formatFieldValue(stock.price, '현재 주가')}</td></tr>
                        <tr><td>시가총액</td><td>${formatFieldValue(stock.market_cap, '시가총액')}</td></tr>
                        <tr><td>PER (Trailing)</td><td>${formatFieldValue(stock.per_trailing, 'PER (Trailing)')}</td></tr>
                        <tr><td>PER (Forward)</td><td>${formatFieldValue(stock.per_forward, 'PER (Forward)')}</td></tr>
                        <tr><td>전일 종가</td><td>${formatFieldValue(stock.previous_close, '전일 종가')}</td></tr>
                        <tr><td>시가</td><td>${formatFieldValue(stock.open, '시가')}</td></tr>
                        <tr><td>고가</td><td>${formatFieldValue(stock.high, '고가')}</td></tr>
                        <tr><td>저가</td><td>${formatFieldValue(stock.low, '저가')}</td></tr>
                        <tr><td>52주 최고</td><td>${formatFieldValue(stock.year_high, '52주 최고')}</td></tr>
                        <tr><td>52주 최저</td><td>${formatFieldValue(stock.year_low, '52주 최저')}</td></tr>
                        <tr><td>거래량</td><td>${formatFieldValue(stock.volume, '거래량')}</td></tr>
                        <tr><td>평균 거래량</td><td>${formatFieldValue(stock.avg_volume, '평균 거래량')}</td></tr>
                        <tr><td>배당 수익률</td><td>${formatFieldValue(stock.dividend_yield, '배당 수익률')}</td></tr>
                    </table>
                </td>
            </tr>
        `;
    }).join('');
}

// 초기화
async function initSearch() {
    notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    setupSidebarToggles();
    await displaySearchResults();
}

window.onload = initSearch;

// 전역 변수 (index.js에서 선언된 변수를 사용하므로 여기서 제거)
// let isLoggedIn = false;
// let favorites = [];
let notifications = {};
