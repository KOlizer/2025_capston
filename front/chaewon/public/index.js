const BASE_URL = 'http://61.109.236.163:8000';
let favorites = [];
let isLoggedIn = false;
let refreshIntervalId = null; // 자동 새로고침 타이머 ID

async function checkLogin() {
    const userEmail = localStorage.getItem('user_email');
    const userId = localStorage.getItem('user_id');
    const isLoggedInLocal = localStorage.getItem('isLoggedIn');
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (isLoggedInLocal !== 'true' || (!userEmail && !userId) || (Date.now() - loginTime) >= sessionDuration) {
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
}

async function fetchFavorites() {
    // user_id가 이메일 형식이면 실제 user_id로 변환
    let userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    if (userId && userId.includes('@')) {
        // user_id가 이메일 형식이면 실제 user_id로 변환
        const realUserId = await getUserIdByEmail(userId);
        if (realUserId) {
            userId = realUserId;
            localStorage.setItem('user_id', userId);
        }
    } else if (!userId && userEmail) {
        // user_email로 실제 user_id 찾기 (임시 해결책)
        userId = await getUserIdByEmail(userEmail);
        if (userId) {
            localStorage.setItem('user_id', userId);
        }
    }

    if (!userId) return [];

    try {
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            if (response.status === 404) {
                console.log('사용자의 즐겨찾기가 없습니다.');
                return [];
            }
            throw new Error(`즐겨찾기 조회 실패: ${response.status}`);
        }
        const data = await response.json();
        console.log('=== fetchFavorites server response ===');
        console.log('Raw server data:', data);

        // 서버에서 받은 데이터가 배열인지 확인하고 company_name을 기반으로 ticker 찾기
        if (Array.isArray(data) && data.length > 0) {
            const topStocks = await fetchTopStocks();
            console.log('Top stocks for mapping:', topStocks);
            console.log('Apple-related stocks in top stocks:', topStocks.filter(s =>
                s.company_name.toLowerCase().includes('apple') ||
                s.ticker === 'AAPL'
            ));

            const subscribedFavorites = data.filter(fav => fav.subscription);
            console.log('Subscribed favorites from server:', subscribedFavorites);

            // 한국어-영어 회사명 매핑 테이블 (실제 top stocks 데이터에 맞게 수정)
            const koreanToEnglishMap = {};

            // 동적으로 매핑 테이블 생성 (top stocks에서 실제 이름 찾기)
            const appleStock = topStocks.find(s => s.ticker === 'AAPL');
            const teslaStock = topStocks.find(s => s.ticker === 'TSLA');
            const nvidiaStock = topStocks.find(s => s.ticker === 'NVDA');
            const microsoftStock = topStocks.find(s => s.ticker === 'MSFT');
            const googleStock = topStocks.find(s => s.ticker === 'GOOGL' || s.ticker === 'GOOG');
            const amazonStock = topStocks.find(s => s.ticker === 'AMZN');

            if (appleStock) koreanToEnglishMap['애플'] = appleStock.company_name;
            if (teslaStock) koreanToEnglishMap['테슬라'] = teslaStock.company_name;
            if (nvidiaStock) koreanToEnglishMap['엔비디아'] = nvidiaStock.company_name;
            if (microsoftStock) koreanToEnglishMap['마이크로소프트'] = microsoftStock.company_name;
            if (googleStock) koreanToEnglishMap['구글'] = googleStock.company_name;
            if (amazonStock) koreanToEnglishMap['아마존'] = amazonStock.company_name;

            console.log('Dynamic Korean-English mapping:', koreanToEnglishMap);

            // localStorage에서 저장된 ticker 매핑 정보 가져오기
            const tickerMappings = JSON.parse(localStorage.getItem('tickerMappings') || '{}');
            console.log('Stored ticker mappings:', tickerMappings);

            const tickers = subscribedFavorites
                .map(fav => {
                    // 1차: localStorage에서 저장된 매핑 정보 확인
                    if (tickerMappings[fav.company_name]) {
                        console.log(`Using stored mapping: ${fav.company_name} -> ${tickerMappings[fav.company_name]}`);
                        return tickerMappings[fav.company_name];
                    }

                    let companyNameToSearch = fav.company_name;

                    // 2차: 한국어 회사명이면 영어명으로 변환
                    if (koreanToEnglishMap[fav.company_name]) {
                        companyNameToSearch = koreanToEnglishMap[fav.company_name];
                        console.log(`Korean name converted: ${fav.company_name} -> ${companyNameToSearch}`);
                    }

                    // 3차: top stocks에서 정확한 company_name 매칭
                    let stock = topStocks.find(s => s.company_name === companyNameToSearch);

                    // 4차: 대소문자 무시하고 매칭
                    if (!stock) {
                        stock = topStocks.find(s =>
                            s.company_name.toLowerCase() === companyNameToSearch.toLowerCase()
                        );
                    }

                    // 5차: 부분 문자열 매칭 (영어명에 대해서만, 한국어는 제외)
                    if (!stock && !/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(companyNameToSearch)) {
                        const cleanSearchName = companyNameToSearch.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        if (cleanSearchName.length > 3) { // 너무 짧은 문자열은 제외
                            stock = topStocks.find(s => {
                                const cleanStockName = s.company_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                return cleanStockName.includes(cleanSearchName) || cleanSearchName.includes(cleanStockName);
                            });
                        }
                    }

                    const ticker = stock ? stock.ticker : null;

                    // 매핑에 성공한 경우 localStorage에 저장
                    if (ticker) {
                        tickerMappings[fav.company_name] = ticker;
                        localStorage.setItem('tickerMappings', JSON.stringify(tickerMappings));
                    }

                    console.log(`Mapping ${fav.company_name} -> ${ticker || 'NOT FOUND'}`);
                    return ticker;
                })
                .filter(ticker => ticker);

            // 중복 제거
            const uniqueTickers = [...new Set(tickers)];

            console.log('Final mapped tickers (before dedup):', tickers);
            console.log('Final mapped tickers (after dedup):', uniqueTickers);
            return uniqueTickers;
        } else {
            console.warn('No valid favorites data from server, retaining local favorites:', favorites);
            return favorites; // 기존 로컬 favorites 유지
        }
    } catch (err) {
        console.error('즐겨찾기 조회 오류:', err);
        return favorites; // 오류 시 기존 favorites 유지
    }
}

// user_email로 실제 user_id를 찾는 헬퍼 함수
async function getUserIdByEmail(email) {
    // 테스트 데이터를 기반으로 한 임시 매핑
    const emailToUserIdMap = {
        'postman01@example.com': 'postman01'
    };

    return emailToUserIdMap[email] || null;
}

async function displayFavorites(favorites) {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) {
        console.error('Element with id "favorites-list" not found');
        return;
    }
    if (!favorites || favorites.length === 0) {
        favoritesList.innerHTML = '<li>즐겨찾기가 없습니다.</li>';
        return;
    }

    // ticker를 company_name으로 변환하여 표시
    const topStocks = await fetchTopStocks();
    favoritesList.innerHTML = favorites.map(ticker => {
        const stock = topStocks.find(s => s.ticker === ticker);
        const displayName = stock ? stock.company_name : ticker;
        return `<li><a href="#" class="company-name-clickable" onclick="showStockPopup('${encodeURIComponent(displayName)}')">${displayName}</a></li>`;
    }).join('');
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

        // 각 주식의 volume 데이터 확인
        if (data.top_stocks && data.top_stocks.length > 0) {
            console.log('첫 번째 주식의 volume 데이터:', data.top_stocks[0].volume);
            console.log('volume 타입:', typeof data.top_stocks[0].volume);
        }

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
        console.log('배당 수익률 원본 데이터:', data.info?.['배당 수익률']);
        console.log('배당 수익률 타입:', typeof data.info?.['배당 수익률']);
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
            dividend_yield: data.info?.['배당 수익률'] // null 유지 (0으로 변환하지 않음)
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
                    <svg class="favorite-icon ${favorites.includes(stock.ticker) ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}"
                         onclick="toggleFavorite('${stock.ticker}')"
                         viewBox="0 0 24 24" width="16" height="16">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"
                              fill="${favorites.includes(stock.ticker) ? 'var(--favorite-active)' : 'var(--favorite-color)'}"
                              stroke="${favorites.includes(stock.ticker) ? 'var(--favorite-active)' : 'var(--favorite-color)'}"/>
                    </svg>
                </td>
            </tr>
        `).join('');
    } else {
        console.log('stock-list 요소가 없습니다. 이 페이지는 stock-list를 사용하지 않을 수 있습니다.');
    }
}

function formatFieldValue(value, field) {
    // null, undefined, 빈 문자열, NaN 체크
    if (value === null || value === undefined || value === '' ||
        (typeof value === 'number' && isNaN(value)) ||
        (typeof value === 'string' && (value.toLowerCase() === 'nan' || value.toLowerCase() === 'null'))) {
        return '-';
    }

    // 거래량 필드의 경우 이미 포맷된 문자열일 수 있음 (예: "170.977M")
    if (field.includes('거래량') || field.includes('평균 거래량')) {
        if (typeof value === 'string') {
            // 이미 포맷된 문자열이면 그대로 반환
            if (value.match(/^[\d,.]+(K|M|B|T)$/i)) {
                return value;
            }
            // 단위가 없는 문자열 숫자면 변환 시도
            const numValue = parseFloat(value.replace(/,/g, ''));
            if (!isNaN(numValue)) {
                return numValue.toLocaleString();
            }
        } else if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return '-';
    }

    // 다른 필드들은 숫자로 변환 시도
    const numValue = Number(value);
    if (isNaN(numValue)) {
        return '-';
    }

    // 배당 수익률 특별 처리: null이거나 0이면 '-' 표시 (배당 없음)
    if (field === '배당 수익률') {
        if (value === null || value === undefined || numValue === 0) {
            return '-';
        }
        return `${(numValue * 100).toFixed(2)}%`;
    }

    if (field === '시가총액') return `${(numValue / 1000000000000).toFixed(2)}조`;
    return numValue.toFixed(2);
}

// 특정 ticker의 즐겨찾기 아이콘만 업데이트하는 효율적인 함수
async function updateFavoriteIcons(ticker, isFavorited) {
    // 페이지의 모든 즐겨찾기 아이콘을 찾아서 해당 ticker만 업데이트
    const favoriteIcons = document.querySelectorAll(`svg.favorite-icon[onclick*="'${ticker}'"]`);

    favoriteIcons.forEach(icon => {
        const path = icon.querySelector('path');
        if (path) {
            const color = isFavorited ? 'var(--favorite-active)' : 'var(--favorite-color)';
            path.setAttribute('fill', color);
            path.setAttribute('stroke', color);
        }

        // CSS 클래스도 업데이트
        if (isFavorited) {
            icon.classList.add('favorite');
        } else {
            icon.classList.remove('favorite');
        }
    });
}

// 특정 ticker의 알림 아이콘만 업데이트하는 효율적인 함수
async function updateNotificationIcons(ticker, isNotified) {
    // 페이지의 모든 알림 아이콘을 찾아서 해당 ticker만 업데이트
    const notificationIcons = document.querySelectorAll(`svg.notification-icon[onclick*="'${ticker}'"]`);

    notificationIcons.forEach(icon => {
        const path = icon.querySelector('path');
        if (path) {
            const color = isNotified ? 'var(--notification-active)' : 'var(--notification-color)';
            path.setAttribute('fill', color);
        }

        // CSS 클래스도 업데이트
        if (isNotified) {
            icon.classList.add('notified');
        } else {
            icon.classList.remove('notified');
        }
    });
}

async function toggleFavorite(ticker, companyName = null) {
    if (!(await checkLogin())) {
        Swal.fire('로그인 필요', '즐겨찾기 추가를 위해 로그인이 필요합니다.', 'warning');
        return;
    }

    let userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    console.log('Debug - user_id:', userId);
    console.log('Debug - user_email:', userEmail);

    // user_id가 이메일 형식이면 실제 user_id로 변환
    if (userId && userId.includes('@')) {
        console.log('Debug - user_id is email, converting...');
        const realUserId = await getUserIdByEmail(userId);
        if (realUserId) {
            userId = realUserId;
            localStorage.setItem('user_id', userId);
            console.log('Debug - Converted to real user_id:', userId);
        }
    } else if (!userId && userEmail) {
        userId = await getUserIdByEmail(userEmail);
        if (userId) {
            localStorage.setItem('user_id', userId);
            console.log('Debug - Found user_id:', userId);
        }
    }

    if (!userId) {
        Swal.fire('오류', '사용자 ID를 찾을 수 없습니다. 다시 로그인해 주세요.', 'error');
        return;
    }

    // companyName이 제공되지 않은 경우에만 top stocks에서 검색
    if (!companyName) {
        const topStocks = await fetchTopStocks();
        const stock = topStocks.find(s => s.ticker === ticker);
        if (stock) {
            companyName = stock.company_name;
        } else {
            Swal.fire('오류', '해당 종목을 찾을 수 없습니다.', 'error');
            return;
        }
    }

    const isFavorited = favorites.includes(ticker);

    // 지민님 방식: 로컬 favorites 배열 즉시 업데이트 (낙관적 업데이트)
    if (isFavorited) {
        favorites = favorites.filter(t => t !== ticker);
    } else {
        favorites.push(ticker);
    }

    // 즐겨찾기 해제 시 알림도 로컬에서 즉시 해제
    if (isFavorited && typeof notifications !== 'undefined' && notifications[ticker]) {
        console.log('🔔 Immediately disabling notification for unfavorited stock:', ticker);
        notifications[ticker] = false;
        localStorage.setItem('notifications', JSON.stringify(notifications));

        // 알림 아이콘 업데이트
        await updateNotificationIcons(ticker, false);
    }

    // UI 즉시 갱신 - 현재 페이지에 맞는 요소만 업데이트
    await updateFavoriteIcons(ticker, !isFavorited);
    await displayFavorites(favorites);

    // search 페이지에서도 검색 결과 갱신
    if (typeof displaySearchResults === 'function') {
        await displaySearchResults();
    }

    Swal.fire('성공', `${companyName}이 ${isFavorited ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.'}`, 'success');

    // 백그라운드에서 서버 동기화
    try {
        const requestData = {
            user_id: userId,
            company_name: companyName,
            subscription: !isFavorited
        };

        console.log('Debug - API 요청 데이터:', requestData);

        const response = await fetch(`${BASE_URL}/update_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `서버 오류: ${response.status}`);
        }

        // 즐겨찾기 해제 시 서버에서도 알림 해제
        if (isFavorited && typeof notifications !== 'undefined' && notifications[ticker]) {
            try {
                const notificationResponse = await fetch(`${BASE_URL}/update_notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        user_id: userId,
                        company_name: companyName,
                        notification: false
                    })
                });

                if (notificationResponse.ok) {
                    console.log('✅ Notification disabled on server for:', ticker);
                } else {
                    console.error('❌ Failed to disable notification on server');
                }
            } catch (notificationErr) {
                console.error('❌ Error disabling notification:', notificationErr);
            }
        }

        // 백그라운드에서 즐겨찾기 목록 동기화
        setTimeout(fetchFavorites, 0);
    } catch (err) {
        console.error('즐겨찾기 서버 동기화 실패:', err);
        // 서버 동기화 실패 시 로컬 상태 되돌리기
        if (isFavorited) {
            favorites.push(ticker);
        } else {
            favorites = favorites.filter(t => t !== ticker);
        }
        // 롤백된 상태로 아이콘 업데이트
        await updateFavoriteIcons(ticker, !isFavorited);
        await displayFavorites(favorites);

        // search 페이지에서도 검색 결과 갱신
        if (typeof displaySearchResults === 'function') {
            await displaySearchResults();
        }

        Swal.fire('오류', `즐겨찾기 서버 동기화 실패: ${err.message}`, 'error');
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

// 좌측 사이드바 토글
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const header = document.querySelector('header');
    if (sidebar) {
        sidebar.classList.toggle('open');
        if (header) header.classList.toggle('sidebar-open', sidebar.classList.contains('open'));

        // 사이드바가 열릴 때 즐겨찾기 새로고침
        if (sidebar.classList.contains('open')) {
            fetchFavorites().then(newFavorites => {
                favorites = newFavorites;
                displayFavorites(favorites);
            });
        }
    }
}

// 우측 사이드바 토글
function toggleSettingsSidebar() {
    const settingsSidebar = document.getElementById('settings-sidebar');
    const header = document.querySelector('header');
    if (settingsSidebar) {
        settingsSidebar.classList.toggle('open');
        if (header) header.classList.toggle('settings-sidebar-open', settingsSidebar.classList.contains('open'));
    }
}

async function sortStocks() {
    const sortOption = document.getElementById('sort-option').value;
    console.log(`Sorting by ${sortOption}`);

    // 현재 표시된 주식 데이터 가져오기
    const topStocks = await fetchTopStocks();
    if (!topStocks || topStocks.length === 0) {
        console.log('정렬할 주식 데이터가 없습니다.');
        return;
    }

    // 정렬 로직
    let sortedStocks = [...topStocks]; // 원본 배열 복사

    switch (sortOption) {
        case 'name':
            sortedStocks.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
            break;
        case 'price':
            sortedStocks.sort((a, b) => {
                const priceA = parseFloat(a.price) || 0;
                const priceB = parseFloat(b.price) || 0;
                return priceB - priceA; // 높은 가격부터 (내림차순)
            });
            break;
        case 'volume':
            sortedStocks.sort((a, b) => {
                const volumeA = parseVolumeString(a.volume) || 0;
                const volumeB = parseVolumeString(b.volume) || 0;
                return volumeB - volumeA; // 높은 거래량부터 (내림차순)
            });
            break;
        default:
            console.log('알 수 없는 정렬 옵션:', sortOption);
            return;
    }

    // 정렬된 데이터로 테이블 업데이트
    displayTopStocks(sortedStocks);
    console.log(`✅ ${sortOption}으로 정렬 완료`);
}

// 거래량 문자열을 숫자로 변환하는 헬퍼 함수
function parseVolumeString(volume) {
    if (typeof volume === 'number') return volume;
    if (typeof volume !== 'string') return 0;

    // "170.977M" 형태의 문자열 처리
    const match = volume.match(/^([\d,.]+)([KMBT]?)$/i);
    if (!match) return 0;

    const number = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();

    switch (unit) {
        case 'K': return number * 1000;
        case 'M': return number * 1000000;
        case 'B': return number * 1000000000;
        case 'T': return number * 1000000000000;
        default: return number;
    }
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
        const userId = localStorage.getItem('user_id');

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

            // localStorage에 새로운 refresh_time 저장
            localStorage.setItem('refresh_time', interval);
            console.log(`💾 Refresh time saved to localStorage: ${interval}초`);

            // main 섹션의 드롭다운과 동기화
            const mainSelect = document.getElementById('refresh-interval');
            if (mainSelect) {
                mainSelect.value = interval;
                console.log(`🔄 Main dropdown synced to: ${interval}초`);
            }

            // 설정된 간격으로 자동 새로고침 시작
            startAutoRefresh(parseInt(interval), 'settings');

            console.log(`✅ 새로고침 설정이 모든 페이지에 적용됩니다: ${interval}초`);
        } catch (err) {
            console.error('기본 새로고침 간격 설정 오류:', err);
            Swal.fire('오류', `기본 새로고침 간격 설정에 실패했습니다: ${err.message}`, 'error');
        }
    } else {
        // main 섹션에서 호출된 경우 - 실제 새로고침 로직 구현
        console.log(`Refresh interval set to ${interval} (임시 설정)`);

        // 세션 저장소에 임시 설정 저장 (페이지 이동 시 유지)
        sessionStorage.setItem('temp_refresh_interval', interval);

        startAutoRefresh(parseInt(interval), 'main');
    }
}

// 자동 새로고침 시작/중지 함수
function startAutoRefresh(intervalSeconds, source = 'unknown') {
    // 기존 타이머가 있다면 중지
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }

    // 0초이면 새로고침 중지
    if (intervalSeconds === 0) {
        console.log('🛑 자동 새로고침이 중지되었습니다.');
        return;
    }

    const sourceText = source === 'settings' ? '기본 설정' :
                      source === 'main' ? '임시 설정' : '설정';

    console.log(`🔄 자동 새로고침이 ${intervalSeconds}초 간격으로 시작되었습니다. (${sourceText})`);

    // 메인 드롭다운에서 변경한 경우 사용자에게 알림
    if (source === 'main') {
        // 설정 사이드바의 값과 다른지 확인
        const settingsSelect = document.getElementById('refresh-interval-settings');
        const settingsValue = settingsSelect ? parseInt(settingsSelect.value) : 0;

        if (settingsValue !== intervalSeconds) {
            console.log(`💡 임시 설정: ${intervalSeconds}초 (기본값: ${settingsValue}초)`);
            console.log('💡 페이지 새로고침 시 기본값으로 돌아갑니다.');
        }
    }

    // 새로운 타이머 시작
    refreshIntervalId = setInterval(async () => {
        console.log('🔄 자동 새로고침 실행 중...');
        try {
            // Top Stocks 데이터 새로고침
            const topStocks = await fetchTopStocks();
            displayTopStocks(topStocks);

            // 즐겨찾기 데이터 새로고침 (로그인 상태일 때만)
            if (isLoggedIn) {
                favorites = await fetchFavorites();
                await displayFavorites(favorites);
            }

            console.log('✅ 자동 새로고침 완료');
        } catch (error) {
            console.error('❌ 자동 새로고침 오류:', error);
        }
    }, intervalSeconds * 1000);
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
    const theme = themeToggle.checked ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    console.log(`🎨 Theme changed to: ${theme}`);
}

// 저장된 테마 로드 함수
function loadSavedTheme() {
    console.log('🎨 Loading saved theme...');

    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    console.log(`📋 Saved theme: ${savedTheme}`);

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.checked = true;
        }
        console.log('✅ Dark mode applied');
    } else {
        body.classList.remove('dark-mode');
        if (themeToggle) {
            themeToggle.checked = false;
        }
        console.log('✅ Light mode applied');
    }

    console.log('🎨 Theme loading completed');
}

// 사용자의 기본 새로고침 설정 불러오기 (로그인 응답에서 받은 값 사용)
async function loadUserRefreshSettings() {
    console.log('🔄 Loading user refresh settings...');

    // 로그인 시 받은 refresh_time 값을 localStorage에서 가져오기
    let refreshTime = localStorage.getItem('refresh_time');

    // localStorage에 값이 없으면 서버에서 가져오기
    if (!refreshTime) {
        const userId = localStorage.getItem('user_id');
        if (userId) {
            try {
                const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
                    credentials: 'include'
                });
                // 실제로는 사용자 정보를 가져오는 별도 API가 필요하지만,
                // 현재는 localStorage의 기본값 사용
                refreshTime = '0';
            } catch (err) {
                console.error('Failed to fetch user settings:', err);
                refreshTime = '0';
            }
        } else {
            refreshTime = '0';
        }
    }

    const refreshTimeInt = parseInt(refreshTime);
    console.log(`📋 Loaded refresh time: ${refreshTimeInt}초`);

    // 설정 사이드바와 메인 드롭다운에 값 설정
    const settingsSelect = document.getElementById('refresh-interval-settings');
    const mainSelect = document.getElementById('refresh-interval');

    if (settingsSelect) {
        settingsSelect.value = refreshTimeInt;
        console.log(`✅ Settings sidebar value set to: ${refreshTimeInt}`);
    }
    if (mainSelect) {
        mainSelect.value = refreshTimeInt;
        console.log(`✅ Main dropdown value set to: ${refreshTimeInt}`);
    }

    // 자동 새로고침 시작
    startAutoRefresh(refreshTimeInt, 'settings');

    console.log(`🔄 사용자 새로고침 설정 로드 완료: ${refreshTimeInt}초`);
}

// 기본 새로고침 설정 로드 (로그인하지 않은 경우)
async function loadDefaultRefreshSettings() {
    console.log('🔄 Loading default refresh settings...');

    // localStorage에서 저장된 설정 가져오기 (없으면 0초)
    const refreshTime = localStorage.getItem('refresh_time') || '0';
    const refreshTimeInt = parseInt(refreshTime);

    console.log(`📋 Default refresh time: ${refreshTimeInt}초`);

    // 설정 사이드바와 메인 드롭다운에 값 설정
    const settingsSelect = document.getElementById('refresh-interval-settings');
    const mainSelect = document.getElementById('refresh-interval');

    if (settingsSelect) {
        settingsSelect.value = refreshTimeInt;
        console.log(`✅ Default settings value set to: ${refreshTimeInt}`);
    }
    if (mainSelect) {
        mainSelect.value = refreshTimeInt;
        console.log(`✅ Default main dropdown value set to: ${refreshTimeInt}`);
    }

    console.log(`🔄 기본 새로고침 설정 로드 완료: ${refreshTimeInt}초`);
}

function setDefaultRefreshInterval() {
    const interval = document.getElementById('default-refresh-interval').value;
    console.log(`Default refresh interval set to ${interval}`);
    // TODO: Implement default refresh logic
}

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

    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTime');
    favorites = [];
    isLoggedIn = false;

    // 자동 새로고침 중지
    startAutoRefresh(0);

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
    await displayFavorites(favorites);
    const topStocks = await fetchTopStocks();
    displayTopStocks(topStocks);

    // 사이드바 토글 이벤트 리스너 추가
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('settings-toggle').addEventListener('click', toggleSettingsSidebar);

    // 저장된 테마 로드
    loadSavedTheme();

    // 로그인 상태라면 사용자의 기본 새로고침 설정 불러오기
    if (isLoggedIn) {
        await loadUserRefreshSettings();
    } else {
        // 로그인하지 않은 경우에도 기본 설정 로드
        await loadDefaultRefreshSettings();
    }
}

document.addEventListener('DOMContentLoaded', init);
