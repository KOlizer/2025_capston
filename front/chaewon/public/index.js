const BASE_URL = 'http://61.109.236.163:8000';
let favorites = [];
let isLoggedIn = false;

async function checkLogin() {
    const userEmail = localStorage.getItem('user_email');
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (!userEmail || (Date.now() - loginTime) >= sessionDuration) {
        localStorage.removeItem('user_email');
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
}

async function fetchFavorites() {
    const userId = localStorage.getItem('user_email');
    if (!userId) return [];

    try {
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('즐겨찾기 조회 실패');
        return await response.json();
    } catch (err) {
        console.error('Error:', err);
        return [];
    }
}

function displayFavorites(favorites) {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) {
        console.error('Element with id "favorites-list" not found');
        return;
    }
    if (!favorites || favorites.length === 0) {
        favoritesList.innerHTML = '<li>즐겨찾기가 없습니다.</li>';
        return;
    }

    favoritesList.innerHTML = favorites.map(ticker => `
        <li>${ticker}</li>
    `).join('');
}

async function fetchTopStocks() {
    try {
        const response = await fetch(`${BASE_URL}/top_stocks`);
        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            throw new Error(`상위 주식 조회 실패: ${response.status}`);
        }
        const data = await response.json();
        console.log('Top stocks data:', data);
        return data.top_stocks || [];
    } catch (err) {
        console.error('Error fetching top stocks:', err);
        Swal.fire('오류', `상위 주식 데이터를 불러오지 못했습니다: ${err.message}`, 'error');
        return [];
    }
}

async function fetchSearchResults(companyName) {
    try {
        console.log(`Fetching search results for: ${companyName}`);
        const response = await fetch(`${BASE_URL}/stocks/search?name=${encodeURIComponent(companyName)}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`검색 실패: ${response.status}`);
        }
        const data = await response.json();
        console.log('Search results data:', data);
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

function displayTopStocks(stocks) {
    const stockList = document.getElementById('stock-list');
    if (stockList) {
        if (!stocks || stocks.length === 0) {
            stockList.innerHTML = '<tr><td colspan="4">데이터를 불러올 수 없습니다.</td></tr>';
            return;
        }

        stockList.innerHTML = stocks.map(stock => `
            <tr>
                <td>
                    <a href="#" class="company-name-clickable" onclick="showStockPopup('${encodeURIComponent(stock.company_name)}')">
                        ${stock.company_name || 'N/A'}
                    </a>
                </td>
                <td>${formatFieldValue(stock.price, '현재 주가')}</td>
                <td>${formatFieldValue(stock.volume, '거래량')}</td>
                <td>
                    <button class="favorite-icon ${favorites.includes(stock.ticker) ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}" 
                            onclick="toggleFavorite('${stock.ticker}')">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        console.log('stock-list 요소가 없습니다. 이 페이지는 stock-list를 사용하지 않을 수 있습니다.');
    }
}

function formatFieldValue(value, field) {
    if (value === null || value === undefined || value === '') return '-';
    if (field.includes('거래량') || field.includes('평균 거래량')) {
        return Number(value).toLocaleString();
    }
    if (field === '배당 수익률') return `${(Number(value) * 100).toFixed(2)}%`;
    if (field === '시가총액') return `${(Number(value) / 1000000000000).toFixed(2)}조`;
    return Number(value).toFixed(2);
}

async function toggleFavorite(ticker) {
    if (!(await checkLogin())) {
        Swal.fire('로그인 필요', '즐겨찾기 추가를 위해 로그인이 필요합니다.', 'warning');
        return;
    }

    const userId = localStorage.getItem('user_email');
    const isFavorited = favorites.includes(ticker);

    try {
        const response = await fetch(`${BASE_URL}/update_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                company_name: ticker,
                subscription: !isFavorited
            })
        });

        if (!response.ok) throw new Error('처리 실패');
        favorites = isFavorited
            ? favorites.filter(t => t !== ticker)
            : [...favorites, ticker];

        displayTopStocks(await fetchTopStocks());
        displayFavorites(favorites);
    } catch (err) {
        Swal.fire('오류', `즐겨찾기 처리 중 오류: ${err.message}`, 'error');
    }
}

function searchStocks() {
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const companyName = searchBar.value.trim();
            if (!companyName) {
                Swal.fire('오류', '회사명을 입력해주세요.', 'warning');
                return;
            }
            const redirectUrl = `search.html?q=${encodeURIComponent(companyName)}`;
            console.log('Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }
    });
}

function setupSidebarToggles() {
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const sidebar = document.getElementById('sidebar');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const header = document.querySelector('header');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            console.log('Toggling favorites sidebar');
            sidebar.classList.toggle('open');
            header.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
        });
    } else {
        console.error('Menu toggle or sidebar element not found');
    }

    if (settingsToggle && settingsSidebar) {
        settingsToggle.addEventListener('click', () => {
            console.log('Toggling settings sidebar');
            settingsSidebar.classList.toggle('open');
            header.classList.toggle('settings-sidebar-open', settingsSidebar.classList.contains('open'));
        });
    } else {
        console.error('Settings toggle or settings sidebar element not found');
    }
}

function sortStocks() {
    const sortOption = document.getElementById('sort-option').value;
    console.log(`Sorting by ${sortOption}`);
    // TODO: Implement sorting logic
}

async function setRefreshInterval(source) {
    let interval;
    let selectElement;

    if (source === 'settings') {
        selectElement = document.getElementById('refresh-interval-settings');
    } else {
        selectElement = document.getElementById('refresh-interval');
    }

    if (!selectElement) {
        console.error(`Element with id "${source === 'settings' ? 'refresh-interval-settings' : 'refresh-interval'}" not found`);
        return;
    }

    interval = selectElement.value;

    if (source === 'settings') {
        const userId = localStorage.getItem('user_email');

        if (!userId) {
            Swal.fire('오류', '로그인이 필요합니다.', 'warning');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/update_refresh_time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    refresh_time: parseInt(interval)
                })
            });

            if (!response.ok) throw new Error('기본 새로고침 간격 업데이트 실패');

            const data = await response.json();
            Swal.fire('성공', data.message, 'success');

            // main 섹션의 드롭다운과 동기화
            const mainSelect = document.getElementById('refresh-interval');
            if (mainSelect) {
                mainSelect.value = interval;
            }
        } catch (err) {
            console.error('기본 새로고침 간격 설정 오류:', err);
            Swal.fire('오류', `기본 새로고침 간격 설정에 실패했습니다: ${err.message}`, 'error');
        }
    } else {
        // main 섹션에서 호출된 경우 (기존 로직 유지)
        console.log(`Refresh interval set to ${interval}`);
        // TODO: 실제 새로고침 로직 구현
    }
}

function prevPage() {
    console.log('Previous page');
    // TODO: Implement pagination logic
}

function nextPage() {
    console.log('Next page');
    // TODO: Implement pagination logic
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    body.classList.toggle('dark-mode', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
}

function setDefaultRefreshInterval() {
    const interval = document.getElementById('default-refresh-interval').value;
    console.log(`Default refresh interval set to ${interval}`);
    // TODO: Implement default refresh logic
}

function logout() {
    localStorage.removeItem('user_email');
    localStorage.removeItem('loginTime');
    isLoggedIn = false;
    document.getElementById('signup-btn').style.display = 'inline-block';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('menu-toggle').style.display = 'none';
    document.getElementById('settings-toggle').style.display = 'none';
    Swal.fire('로그아웃', '성공적으로 로그아웃했습니다.', 'success');
}

async function showStockPopup(companyName) {
    const stockData = await fetchSearchResults(decodeURIComponent(companyName));
    console.log('Stock data in popup:', stockData);
    if (!stockData || stockData.length === 0) {
        Swal.fire('오류', '주식 정보를 불러올 수 없습니다.', 'error');
        return;
    }

    const stock = stockData[0] || {};
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';

    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';

    const closeButton = document.createElement('button');
    closeButton.className = 'close-popup';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => popupOverlay.remove());

    const title = document.createElement('h2');
    title.textContent = stock.company_name || 'N/A';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>항목</th>
                <th>값</th>
            </tr>
        </thead>
        <tbody>
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
        </tbody>
    `;

    popupContent.appendChild(closeButton);
    popupContent.appendChild(title);
    popupContent.appendChild(table);
    popupOverlay.appendChild(popupContent);
    document.body.appendChild(popupOverlay);
    popupOverlay.classList.add('active'); // 즉시 활성화
}

async function init() {
    isLoggedIn = await checkLogin();
    favorites = await fetchFavorites();

    if (isLoggedIn) {
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('menu-toggle').style.display = 'inline-flex';
        document.getElementById('settings-toggle').style.display = 'inline-flex';
    }

    searchStocks();
    setupSidebarToggles();
    displayFavorites(favorites);
    const topStocks = await fetchTopStocks();
    displayTopStocks(topStocks);
}

document.addEventListener('DOMContentLoaded', init);
