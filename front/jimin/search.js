const BASE_URL = 'http://61.109.236.163:8000';
let favorites = [];
let notifications = {};
let isSidebarOpen = false;
let isSettingsSidebarOpen = false;
let stocks = [];

// 검색어 가져오기
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 로그인 상태 확인
async function isLoggedIn() {
    const userEmail = localStorage.getItem('user_email');
    const isLoggedInLocal = localStorage.getItem('isLoggedIn');
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const sessionDuration = 24 * 60 * 60 * 1000;

    console.log('Checking login status:', { userEmail, isLoggedInLocal, loginTime });

    if (isLoggedInLocal !== 'true' || !userEmail || (Date.now() - loginTime) >= sessionDuration) {
        console.log('Local session invalid, clearing storage');
        localStorage.removeItem('user_email');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('user_id');
        return false;
    }

    try {
        console.log('Sending /check-auth request');
        const response = await fetch(`${BASE_URL}/check-auth`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const result = await response.json();
        console.log('Auth check response:', { status: response.status, result });

        if (response.ok && result.message === '인증됨') {
            if (result.user_email) localStorage.setItem('user_email', result.user_email);
            if (result.user_id) localStorage.setItem('user_id', result.user_id);
            return true;
        }
        throw new Error(result.error || '인증되지 않음');
    } catch (err) {
        console.error('Error checking auth:', err.message);
        localStorage.removeItem('user_email');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('user_id');
        return false;
    }
}

// 사용자 설정 로드
function loadUserSettings() {
    const userId = localStorage.getItem('user_id') || localStorage.getItem('user_email');
    if (userId) {
        const settings = JSON.parse(localStorage.getItem(`settings_${userId}`) || '{}');
        const defaultRefreshInterval = localStorage.getItem('refresh_time') || '0';
        document.getElementById('default-refresh-interval').value = defaultRefreshInterval;
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('theme-toggle').checked = false;
        }
    }
}

// 사용자 설정 저장
async function saveUserSettings() {
    const userId = localStorage.getItem('user_id') || localStorage.getItem('user_email');
    if (userId) {
        const settings = {
            defaultRefreshInterval: document.getElementById('default-refresh-interval').value,
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
        };
        localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
        try {
            const response = await fetch(`${BASE_URL}/api/user/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, settings })
            });
            if (!response.ok) throw new Error('DB 저장 실패');
        } catch (err) {
            console.error('DB 저장 실패:', err);
        }
    }
}

// 테마 토글
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    saveUserSettings();
}

// UI 업데이트
function updateUI() {
    const signupBtn = document.getElementById('signup-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    if (localStorage.getItem('isLoggedIn') === 'true') {
        signupBtn.style.display = 'none';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        menuToggle.style.display = 'inline-flex';
        settingsToggle.style.display = 'inline-flex';
        loadUserSettings();
    } else {
        signupBtn.style.display = 'inline-block';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        menuToggle.style.display = 'none';
        settingsToggle.style.display = 'none';
        isSidebarOpen = false;
        isSettingsSidebarOpen = false;
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('settings-sidebar').classList.remove('open');
        document.querySelector('header').classList.remove('sidebar-open', 'settings-sidebar-open');
    }
}

// 로그아웃
async function logout() {
    try {
        await fetch(`${BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    saveUserSettings();
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTime');
    favorites = [];
    isSidebarOpen = false;
    isSettingsSidebarOpen = false;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('settings-sidebar').classList.remove('open');
    document.querySelector('header').classList.remove('sidebar-open', 'settings-sidebar-open');
    updateUI();
    Swal.fire({
        icon: 'success',
        title: '로그아웃',
        text: '로그아웃되었습니다.',
    });
}

// 즐겨찾기 목록 조회
async function fetchFavorites() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`즐겨찾기 조회 실패: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            favorites = data
                .filter(fav => fav.subscription)
                .map(fav => fav.ticker || (stocks.find(s => s.name === fav.company_name)?.ticker))
                .filter(ticker => ticker);
        } else {
            favorites = [];
        }
        if (isSidebarOpen) renderFavorites();
    } catch (err) {
        console.error('즐겨찾기 조회 실패:', err);
        if (isSidebarOpen) renderFavorites();
        if (err.message !== '즐겨찾기 조회 실패: 404') {
            Swal.fire({
                icon: 'error',
                title: '오류',
                text: '즐겨찾기 목록을 불러오지 못했습니다.',
            });
        }
    }
}

// 즐겨찾기 토글
async function toggleFavorite(ticker) {
    if (!(await isLoggedIn())) {
        Swal.fire({
            icon: 'warning',
            title: '로그인 필요',
            text: '즐겨찾기 기능은 로그인 후 사용 가능합니다.',
        });
        return;
    }

    const userId = localStorage.getItem('user_id');
    if (!userId) {
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '사용자 ID를 찾을 수 없습니다. 다시 로그인해 주세요.',
        });
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        updateUI();
        window.location.href = 'login.html';
        return;
    }

    const stock = stocks.find(s => s.ticker === ticker) || { ticker, name: ticker };
    const isFavorited = favorites.includes(ticker);
    try {
        const response = await fetch(`${BASE_URL}/update_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: userId,
                ticker: stock.ticker,
                company_name: stock.name,
                subscription: !isFavorited
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 404) {
                Swal.fire({
                    icon: 'error',
                    title: '오류',
                    text: '사용자 계정을 찾을 수 없습니다. 다시 로그인해 주세요.',
                });
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_email');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('loginTime');
                updateUI();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(errorData.error || '즐겨찾기 처리 실패');
        }

        if (isFavorited) {
            favorites = favorites.filter(t => t !== ticker);
        } else {
            favorites.push(ticker);
        }

        renderFavorites();
        await displaySearchResults();

        Swal.fire({
            icon: 'success',
            title: isFavorited ? '즐겨찾기 해제' : '즐겨찾기 등록',
            text: `종목 ${ticker}이 ${isFavorited ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.'}`,
        });
    } catch (err) {
        console.error('즐겨찾기 처리 실패:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: `즐겨찾기 ${isFavorited ? '삭제' : '추가'}에 실패했습니다: ${err.message}`,
        });
    }
}

// 사이드바 즐겨찾기 렌더링
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        const li = document.createElement('li');
        li.textContent = '즐겨찾기한 종목이 없습니다.';
        li.style.color = '#666';
        favoritesList.appendChild(li);
        return;
    }
    favorites.forEach(ticker => {
        const stock = stocks.find(s => s.ticker === ticker) || { ticker, name: ticker };
        const li = document.createElement('li');
        li.className = 'favorite-item';
        li.innerHTML = `
            <span>${stock.name}</span>
            <button class="remove-favorite" onclick="event.stopPropagation(); toggleFavorite('${stock.ticker}')">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z" fill="var(--favorite-active)" stroke="var(--favorite-active)"/>
                </svg>
            </button>
        `;
        favoritesList.appendChild(li);
    });
}

// 알림 상태 토글
async function toggleNotification(ticker, companyName) {
    if (!(await isLoggedIn())) {
        Swal.fire({ icon: 'warning', title: '로그인 필요', text: '알림 설정은 로그인 후 사용 가능합니다.' });
        return;
    }

    const userId = localStorage.getItem('user_id');
    const isNotified = notifications[ticker] || false;

    try {
        const response = await fetch(`${BASE_URL}/update_notification`, {
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

        notifications[ticker] = !isNotified;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        await displaySearchResults();
        Swal.fire({ icon: 'success', title: '알림 설정', text: `알림이 ${isNotified ? '해제' : '설정'}되었습니다.` });
    } catch (err) {
        console.error('알림 설정 실패:', err);
        Swal.fire({ icon: 'error', title: '오류', text: `알림 설정 ${isNotified ? '해제' : '설정'}에 실패했습니다.` });
    }
}

// 검색 데이터 가져오기
async function fetchSearchResults(companyName) {
    try {
        const response = await fetch(`${BASE_URL}/stocks/search?name=${encodeURIComponent(companyName)}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`검색 실패: ${response.status}`);
        const data = await response.json();
        if (!data || Object.keys(data).length === 0) return [];
        const stockData = {
            company_name: data.company_name || 'N/A',
            ticker: data.ticker || 'N/A',
            price: data.info?.['현재 주가'] || 0,
            volume: data.info?.['거래량'] || 0,
            market_cap: data.info?.['시가총액'] || 0,
            per_trailing: data.info?.['PER (Trailing)'] || 0,
            per_forward: data.info?.['PER (Forward)'] || 0,
            previous_close: data.info?.['전일 종가'] || 0,
            open: data.info?.['시가'] || 0,
            high: data.info?.['고가'] || 0,
            low: data.info?.['저가'] || 0,
            year_high: data.info?.['52주 최고'] || 0,
            year_low: data.info?.['52주 최저'] || 0,
            avg_volume: data.info?.['평균 거래량'] || 0,
            dividend_yield: data.info?.['배당 수익률'] || 0
        };
        return [stockData];
    } catch (err) {
        console.error('검색 중 오류:', err);
        Swal.fire('오류', `검색 중 오류가 발생했습니다: ${err.message}`, 'error');
        return [];
    }
}

// 데이터 형식 처리
function formatFieldValue(value, field) {
    if (value === null || value === undefined || value === '') return '-';

    const cleanedValue = String(value).replace(/,/g, '');
    const numValue = field.includes('거래량') || field.includes('평균 거래량')
        ? parseInt(cleanedValue, 10)
        : Number(cleanedValue);

    if (isNaN(numValue)) {
        console.warn(`Invalid value for ${field}: ${value}`);
        return '-';
    }

    if (field.includes('거래량') || field.includes('평균 거래량')) {
        return numValue.toLocaleString();
    }
    if (field === '배당 수익률') return `${(numValue * 100).toFixed(2)}%`;
    if (field === '시가총액') return `${(numValue / 1000000000000).toFixed(2)}조`;
    return numValue.toFixed(2);
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
    const loggedIn = await isLoggedIn();

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
                    <button class="favorite-icon ${isFavorited ? 'favorite' : ''} ${!localStorage.getItem('isLoggedIn') ? 'disabled' : ''}" 
                            onclick="toggleFavorite('${stock.ticker}')">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                        </svg>
                    </button>
                    <button class="notification-icon ${isNotified ? 'notified' : ''} ${!localStorage.getItem('isLoggedIn') ? 'disabled' : ''}" 
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

// 검색바 엔터 키 처리
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        const query = document.getElementById('search-bar').value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        } else {
            Swal.fire({
                icon: 'warning',
                title: '입력 필요',
                text: '검색어를 입력해주세요.',
            });
        }
    }
}

// 사이드바 기본 새로고침 간격 설정
async function setDefaultRefreshInterval() {
    const userId = localStorage.getItem('user_id');
    const defaultRefreshTime = document.getElementById('default-refresh-interval').value;

    if (userId) {
        try {
            const response = await fetch(`${BASE_URL}/update_refresh_time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    refresh_time: parseInt(defaultRefreshTime)
                })
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 404) {
                    Swal.fire({
                        icon: 'error',
                        title: '오류',
                        text: '사용자 계정을 찾을 수 없습니다. 다시 로그인해 주세요.'
                    });
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_email');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('loginTime');
                    updateUI();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(result.error || 'refresh_time 업데이트 실패');
            }

            Swal.fire({
                icon: 'success',
                title: '설정 저장',
                text: '기본 새로고침 간격이 서버에 저장되었습니다.'
            });
        } catch (err) {
            console.error('refresh_time 업데이트 실패:', err);
            Swal.fire({
                icon: 'error',
                title: '오류',
                text: `기본 새로고침 간격 업데이트 실패: ${err.message}`
            });
        }
    } else {
        Swal.fire({
            icon: 'warning',
            title: '로그인 필요',
            text: '기본 새로고침 간격 설정은 로그인 후 가능합니다.'
        });
    }
}

// 사이드바 토글 설정
function setupSidebarToggles() {
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const sidebar = document.getElementById('sidebar');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const header = document.querySelector('header');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            isSidebarOpen = !isSidebarOpen;
            sidebar.classList.toggle('open');
            header.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
            if (isSidebarOpen) fetchFavorites();
        });
    }

    if (settingsToggle && settingsSidebar) {
        settingsToggle.addEventListener('click', () => {
            isSettingsSidebarOpen = !isSettingsSidebarOpen;
            settingsSidebar.classList.toggle('open');
            header.classList.toggle('settings-sidebar-open', settingsSidebar.classList.contains('open'));
        });
    }
}

// 초기화
async function initSearch() {
    notifications = JSON.parse(localStorage.getItem('notifications') || '{}');
    const loggedIn = await isLoggedIn();
    console.log('initSearch: Logged in status:', loggedIn);
    updateUI();
    if (loggedIn) {
        await fetchFavorites();
    }
    setupSidebarToggles();
    await displaySearchResults();
}

document.addEventListener('DOMContentLoaded', initSearch);