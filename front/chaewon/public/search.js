// search.js에서 사용할 상수 (index.js에서 이미 정의되어 있지만 명시적으로 선언)
// const BASE_URL = 'http://61.109.236.163:8000'; // index.js에서 이미 정의됨

// search 페이지 전용 즐겨찾기 배열 (독립적으로 관리)
let searchPageFavorites = [];

// 검색어 가져오기
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}





// 알림 상태 토글 함수
async function toggleNotification(ticker, companyName) {
    if (!isLoggedIn) {
        Swal.fire({ icon: 'warning', title: '로그인 필요', text: '알림 설정은 로그인 후 사용 가능합니다.' });
        return;
    }

    let userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    // user_id가 이메일 형식이면 실제 user_id로 변환
    if (userId && userId.includes('@')) {
        const realUserId = await getUserIdByEmail(userId);
        if (realUserId) {
            userId = realUserId;
            localStorage.setItem('user_id', userId);
        }
    } else if (!userId && userEmail) {
        userId = await getUserIdByEmail(userEmail);
        if (userId) {
            localStorage.setItem('user_id', userId);
        }
    }

    if (!userId) {
        Swal.fire('오류', '사용자 ID를 찾을 수 없습니다. 다시 로그인해 주세요.', 'error');
        return;
    }

    const isNotified = notifications[ticker] || false;

    // 알림 설정을 위해서는 먼저 즐겨찾기에 등록되어 있어야 함
    if (!favorites.includes(ticker)) {
        Swal.fire('오류', '알림 설정을 위해서는 먼저 즐겨찾기에 등록해야 합니다.', 'warning');
        return;
    }

    // 즐겨찾기에서 사용한 실제 company_name 찾기 (toggleFavorite과 동일한 로직)
    const topStocks = await fetchTopStocks();
    const stock = topStocks.find(s => s.ticker === ticker);
    const actualCompanyName = stock ? stock.company_name : companyName;

    console.log('Debug - 알림 설정 요청:', {
        user_id: userId,
        company_name: actualCompanyName,
        original_company_name: companyName,
        ticker: ticker,
        notification: !isNotified,
        favorites: favorites
    });

    try {
        const response = await fetch(`${BASE_URL}/update_notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: userId,
                company_name: actualCompanyName,
                notification: !isNotified
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `서버 오류: ${response.status}`);
        }

        const data = await response.json();

        // 로컬 상태 즉시 업데이트
        notifications[ticker] = !isNotified;
        localStorage.setItem('notifications', JSON.stringify(notifications));

        // 알림 아이콘 즉시 업데이트
        await updateNotificationIcons(ticker, !isNotified);

        // 설정/해제에 따른 메시지 구분
        const actionText = !isNotified ? '설정' : '해제';
        const statusText = !isNotified ? '알림이 설정되었습니다.' : '알림이 해제되었습니다.';

        Swal.fire({
            icon: 'success',
            title: `알림 ${actionText}`,
            text: `${actualCompanyName} ${statusText}`
        });
    } catch (err) {
        console.error('알림 설정 오류:', err);
        Swal.fire({ icon: 'error', title: '오류', text: `알림 설정 ${isNotified ? '해제' : '설정'}에 실패했습니다: ${err.message}` });
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

    console.log('🔍 displaySearchResults called');
    console.log('🔍 Current search page favorites:', searchPageFavorites);
    console.log('🔍 Current global favorites:', favorites);
    console.log('🔍 Search results:', results);

    searchResults.innerHTML = results.map(stock => {
        const isFavorited = searchPageFavorites.includes(stock.ticker);
        const isNotified = notifications[stock.ticker] || false;

        console.log(`🔍 Stock ${stock.ticker}: isFavorited=${isFavorited}, in search page favorites:`, searchPageFavorites.includes(stock.ticker));

        return `
            <tr>
                <td>
                    ${stock.company_name || 'N/A'}
                    <svg class="favorite-icon ${isFavorited ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}"
                         onclick="console.log('Search page favorite clicked:', '${stock.ticker}', '${stock.company_name || 'N/A'}'); toggleFavorite('${stock.ticker}', '${stock.company_name || 'N/A'}')"
                         viewBox="0 0 24 24" width="16" height="16">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"
                              fill="${isFavorited ? 'var(--favorite-active)' : 'var(--favorite-color)'}"
                              stroke="${isFavorited ? 'var(--favorite-active)' : 'var(--favorite-color)'}"/>
                    </svg>
                  
                    <svg class="notification-icon ${isNotified ? 'notified' : ''} ${!isLoggedIn ? 'disabled' : ''}"
                         onclick="toggleNotification('${stock.ticker}', '${stock.company_name || 'N/A'}')"
                         width="16" height="16" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                              fill="${isNotified ? 'var(--notification-active)' : 'var(--notification-color)'}"
                              stroke="none"/>
                    </svg>
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
    // index.js의 init() 함수를 먼저 실행하여 기본 설정 완료
    await init();

    // search 페이지 전용 초기화
    notifications = JSON.parse(localStorage.getItem('notifications') || '{}');

    // search 페이지 전용 즐겨찾기 데이터 로드
    console.log('=== Search page initialization ===');
    console.log('Global favorites before fetchFavorites:', favorites);

    // 서버에서 최신 즐겨찾기 데이터 가져오기
    searchPageFavorites = await fetchFavorites();

    // 전역 favorites도 업데이트 (호환성을 위해)
    favorites = [...searchPageFavorites];
    if (typeof window.favorites !== 'undefined') {
        window.favorites = [...searchPageFavorites];
    }

    console.log('Search page favorites after fetchFavorites:', searchPageFavorites);
    console.log('Global favorites after sync:', favorites);

    await displaySearchResults();

    console.log('Search page initialized with favorites:', favorites);

    // 잘못된 즐겨찾기 데이터 정리 (한 번만 실행)
    if (isLoggedIn && !sessionStorage.getItem('favorites_cleaned')) {
        await cleanupInvalidFavorites();
        sessionStorage.setItem('favorites_cleaned', 'true');
    }

    // 저장된 테마 로드
    loadSearchPageSavedTheme();

    // 새로고침 설정 로드
    if (isLoggedIn) {
        await loadSearchPageRefreshSettings();
    } else {
        await loadSearchPageDefaultSettings();
    }
}



// search 페이지 전용 즐겨찾기 토글 함수
async function toggleFavorite(ticker, companyName = null) {
    console.log('=== Search page toggleFavorite called ===');
    console.log('Ticker:', ticker);
    console.log('Company Name:', companyName);
    console.log('Current favorites before toggle:', favorites);

    if (!(await checkLogin())) {
        Swal.fire('로그인 필요', '즐겨찾기 추가를 위해 로그인이 필요합니다.', 'warning');
        return;
    }

    let userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    // user_id가 이메일 형식이면 실제 user_id로 변환
    if (userId && userId.includes('@')) {
        const realUserId = await getUserIdByEmail(userId);
        if (realUserId) {
            userId = realUserId;
            localStorage.setItem('user_id', userId);
        }
    } else if (!userId && userEmail) {
        userId = await getUserIdByEmail(userEmail);
        if (userId) {
            localStorage.setItem('user_id', userId);
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

    console.log('Final company name for server:', companyName);
    console.log('Ticker for server:', ticker);

    // search 페이지 전용 즐겨찾기 상태 확인 (서버 호출 없이 현재 상태 사용)
    const isFavorited = searchPageFavorites.includes(ticker);
    console.log('Current search page favorites:', searchPageFavorites);
    console.log('Is favorited:', isFavorited);
    console.log('Ticker to toggle:', ticker);

    // search 페이지 전용 favorites 배열 즉시 업데이트 (낙관적 업데이트)
    if (isFavorited) {
        searchPageFavorites = searchPageFavorites.filter(t => t !== ticker);
        console.log('Removing from search page favorites');
    } else {
        searchPageFavorites.push(ticker);
        console.log('Adding to search page favorites');
    }

    console.log('Updated search page favorites:', searchPageFavorites);

    // 전역 favorites와 동기화
    favorites = [...searchPageFavorites];
    if (typeof window.favorites !== 'undefined') {
        window.favorites = [...searchPageFavorites];
    }

    // 즐겨찾기 해제 시 알림도 로컬에서 즉시 해제
    if (isFavorited && notifications[ticker]) {
        console.log('🔔 Immediately disabling notification UI for:', ticker);
        notifications[ticker] = false;
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    // UI 즉시 갱신 - 검색 결과와 사이드바 모두 업데이트
    console.log('🎨 Updating UI with new search page favorites:', searchPageFavorites);
    console.log('🎨 Current notifications state:', notifications);
    await displaySearchResults();
    await displayFavorites(searchPageFavorites);
    console.log('🎨 UI update completed');

    Swal.fire('성공', `${companyName}이 ${isFavorited ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.'}`, 'success');

    // 백그라운드에서 서버 동기화
    try {
        const requestData = {
            user_id: userId,
            company_name: companyName,
            ticker: ticker, // ticker 정보도 함께 전송
            subscription: !isFavorited
        };

        console.log('Debug - API 요청 데이터:', requestData);

        const response = await fetch(`${BASE_URL}/update_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestData)
        });

        console.log('Server response status:', response.status);
        console.log('Server response ok:', response.ok);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error response:', errorData);
            throw new Error(errorData.error || `서버 오류: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Server response data:', responseData);
        console.log('Server sync successful');

        // 서버 업데이트 성공 - 현재 상태 유지
        console.log('✅ Server update completed successfully');
        console.log('Current search page favorites:', searchPageFavorites);
        console.log('Expected ticker in favorites:', ticker);
        console.log('Is ticker in current favorites:', searchPageFavorites.includes(ticker));

        // ticker-companyName 매핑 정보를 localStorage에 저장
        const tickerMappings = JSON.parse(localStorage.getItem('tickerMappings') || '{}');
        if (!isFavorited) { // 추가된 경우
            tickerMappings[companyName] = ticker;
            localStorage.setItem('tickerMappings', JSON.stringify(tickerMappings));
            console.log('💾 Saved ticker mapping:', companyName, '->', ticker);
        }

        // 즐겨찾기 해제 시 알림도 함께 해제
        if (isFavorited && notifications[ticker]) {
            console.log('🔔 Removing notification for unfavorited stock:', ticker);

            try {
                // 서버에서 알림 해제
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
                    // 로컬 알림 상태 업데이트
                    notifications[ticker] = false;
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    console.log('✅ Notification disabled for:', ticker);
                } else {
                    console.error('❌ Failed to disable notification on server');
                }
            } catch (notificationErr) {
                console.error('❌ Error disabling notification:', notificationErr);
            }
        }

        // 상태가 올바른지 확인
        const shouldBeInFavorites = !isFavorited; // 토글 후 예상 상태
        const actuallyInFavorites = searchPageFavorites.includes(ticker);

        if (shouldBeInFavorites === actuallyInFavorites) {
            console.log('✅ Favorites state is correct');
        } else {
            console.error('❌ Favorites state mismatch!');
            console.error('Expected:', shouldBeInFavorites, 'Actual:', actuallyInFavorites);
        }
    } catch (err) {
        console.error('즐겨찾기 서버 동기화 실패:', err);
        // 서버 동기화 실패 시 로컬 상태 되돌리기
        if (isFavorited) {
            favorites.push(ticker);
        } else {
            favorites = favorites.filter(t => t !== ticker);
        }
        // 롤백된 상태로 UI 업데이트 - 검색 결과와 사이드바 모두 업데이트
        await displaySearchResults();
        await displayFavorites(favorites);

        Swal.fire('오류', `즐겨찾기 서버 동기화 실패: ${err.message}`, 'error');
    }
}

// search 페이지용 새로고침 설정 로드 함수
async function loadSearchPageRefreshSettings() {
    console.log('🔄 Loading search page refresh settings...');

    // localStorage에서 저장된 새로고침 설정 가져오기
    const refreshTime = localStorage.getItem('refresh_time') || '0';
    const refreshTimeInt = parseInt(refreshTime);

    console.log(`📋 Search page refresh time: ${refreshTimeInt}초`);

    // 설정 사이드바에 값 설정
    const settingsSelect = document.getElementById('refresh-interval-settings');
    if (settingsSelect) {
        settingsSelect.value = refreshTimeInt;
        console.log(`✅ Search page settings value set to: ${refreshTimeInt}`);
    }

    console.log(`🔄 Search page 새로고침 설정 로드 완료: ${refreshTimeInt}초`);
}

// search 페이지용 기본 설정 로드 함수 (로그인하지 않은 경우)
async function loadSearchPageDefaultSettings() {
    console.log('🔄 Loading search page default settings...');

    // localStorage에서 저장된 설정 가져오기 (없으면 0초)
    const refreshTime = localStorage.getItem('refresh_time') || '0';
    const refreshTimeInt = parseInt(refreshTime);

    console.log(`📋 Search page default refresh time: ${refreshTimeInt}초`);

    // 설정 사이드바에 값 설정
    const settingsSelect = document.getElementById('refresh-interval-settings');
    if (settingsSelect) {
        settingsSelect.value = refreshTimeInt;
        console.log(`✅ Search page default settings value set to: ${refreshTimeInt}`);
    }

    console.log(`🔄 Search page 기본 새로고침 설정 로드 완료: ${refreshTimeInt}초`);
}

// search 페이지용 저장된 테마 로드 함수
function loadSearchPageSavedTheme() {
    console.log('🎨 Loading saved theme for search page...');

    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    console.log(`📋 Search page saved theme: ${savedTheme}`);

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.checked = true;
        }
        console.log('✅ Search page dark mode applied');
    } else {
        body.classList.remove('dark-mode');
        if (themeToggle) {
            themeToggle.checked = false;
        }
        console.log('✅ Search page light mode applied');
    }

    console.log('🎨 Search page theme loading completed');
}

// search 페이지용 테마 토글 함수
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    body.classList.toggle('dark-mode', themeToggle.checked);
    const theme = themeToggle.checked ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    console.log(`🎨 Search page theme changed to: ${theme}`);
}

// 잘못된 즐겨찾기 데이터 정리 함수
async function cleanupInvalidFavorites() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    console.log('🧹 Starting cleanup of invalid favorites...');

    try {
        // 서버에서 현재 즐겨찾기 목록 가져오기
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
            credentials: 'include'
        });

        if (!response.ok) return;

        const serverFavorites = await response.json();
        const topStocks = await fetchTopStocks();

        // 매핑되지 않는 항목들 찾기
        const invalidItems = serverFavorites.filter(fav => {
            if (!fav.subscription) return false;

            // 한국어-영어 매핑 시도
            const koreanToEnglishMap = {
                '삼성전자': 'Samsung Electronics',
                '애플': 'Apple Inc.',
                '카카오': 'Kakao Corp',
                '테슬라': 'Tesla, Inc.',
                '현대자동차': 'Hyundai Motor Company'
            };

            let searchName = koreanToEnglishMap[fav.company_name] || fav.company_name;

            // top stocks에서 찾을 수 있는지 확인
            const found = topStocks.find(s =>
                s.company_name === searchName ||
                s.company_name.toLowerCase() === searchName.toLowerCase()
            );

            return !found; // 찾지 못한 항목들이 invalid
        });

        console.log('Invalid favorites found:', invalidItems);

        // 사용자에게 정리할지 물어보기
        if (invalidItems.length > 0) {
            const result = await Swal.fire({
                title: '즐겨찾기 정리',
                text: `매핑되지 않는 즐겨찾기 항목 ${invalidItems.length}개를 발견했습니다. 정리하시겠습니까?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '정리하기',
                cancelButtonText: '나중에'
            });

            if (result.isConfirmed) {
                // 각 invalid 항목을 서버에서 제거
                for (const item of invalidItems) {
                    await fetch(`${BASE_URL}/update_subscription`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            user_id: userId,
                            company_name: item.company_name,
                            subscription: false
                        })
                    });
                }

                Swal.fire('완료', '즐겨찾기가 정리되었습니다.', 'success');

                // 즐겨찾기 목록 새로고침
                favorites = await fetchFavorites();
                await displayFavorites(favorites);
            }
        }
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

// search 페이지 전용 전역 변수
let notifications = {};

window.onload = initSearch;
