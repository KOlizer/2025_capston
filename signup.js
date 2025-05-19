<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock App - 홈</title>
    <link rel="stylesheet" href="/static/css/styles.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<header>
    <div class="left-section">
        <a href="../templates/index.html" class="home-icon" title="홈으로 이동">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
        </a>
        <button id="menu-toggle" class="menu-icon" style="display: none;" title="즐겨찾기 메뉴">
            <svg class="favorite-icon" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
            </svg>
        </button>
    </div>
    <div class="right-section">
        <input type="text" id="search-bar" placeholder="주식 검색..." oninput="searchStocks()">
        <a href="../templates/signup.html" class="btn signup-btn" id="signup-btn">회원가입</a>
        <a href="../templates/login.html" class="btn login-btn" id="login-btn">로그인</a>
        <button class="btn logout-btn" id="logout-btn" style="display: none;" onclick="logout()">로그아웃</button>
        <button id="settings-toggle" class="menu-icon" style="display: none;" title="설정">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="menu-icon-svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M13.8 3h-3.6v2.027c-.66.17-1.285.431-1.858.77L6.91 4.363 4.363 6.91l1.434 1.433a7.157 7.157 0 00-.77 1.858H3v3.6h2.027c.17.66.431 1.285.77 1.858L4.363 17.09l2.546 2.546 1.433-1.434c.573.339 1.197.6 1.858.77V21h3.6v-2.027a7.157 7.157 0 001.858-.77l1.433 1.434 2.546-2.546-1.434-1.434a7.16 7.16 0 00.77-1.857H21v-3.6h-2.027a7.158 7.158 0 00-.77-1.858l1.434-1.433-2.546-2.546-1.434 1.434a7.156 7.156 0 00-1.857-.77V3zm-4.5 9a2.7 2.7 0 115.4 0 2.7 2.7 0 01-5.4 0z" fill="currentColor"/>
            </svg>
        </button>
    </div>
</header>
<aside id="sidebar">
    <h2>즐겨찾기</h2>
    <ul id="favorites-list"></ul>
</aside>
<aside id="settings-sidebar">
    <h2>설정</h2>
    <div class="settings-item">
        <label for="theme-toggle">다크 모드:</label>
        <label class="theme-toggle">
            <input type="checkbox" id="theme-toggle" onchange="toggleTheme()">
            <span class="slider"></span>
        </label>
    </div>
    <div class="settings-item">
        <label for="default-refresh-interval">기본 새로고침:</label>
        <select id="default-refresh-interval" onchange="setDefaultRefreshInterval()">
            <option value="10">10초</option>
            <option value="30">30초</option>
            <option value="60">1분</option>
            <option value="0" selected>끄기</option>
        </select>
    </div>
</aside>
<main>
    <div class="controls">
        <label>정렬:</label>
        <select id="sort-option" onchange="sortStocks()">
            <option value="volume">거래량순</option>
            <option value="price">가격순</option>
        </select>
        <label>새로고침:</label>
        <select id="refresh-interval" onchange="setRefreshInterval()">
            <option value="10">10초</option>
            <option value="30">30초</option>
            <option value="60">1분</option>
            <option value="0" selected>끄기</option>
        </select>
    </div>
    <table class="stock-table">
        <thead>
        <tr>
            <th>종목명</th>
            <th>가격</th>
            <th>거래량</th>
            <th>즐겨찾기</th>
        </tr>
        </thead>
        <tbody id="stock-list"></tbody>
    </table>
    <div class="pagination">
        <button onclick="prevPage()" id="prev-btn" disabled>이전</button>
        <span id="page-info">1 / 1</span>
        <button onclick="nextPage()" id="next-btn">다음</button>
    </div>
</main>
<script src="/static/js/index.js"></script>
</body>
</html>
