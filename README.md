## 미국 주식 가격 수집기 Project
<div style="text-align: center;">
    <img width="1500" alt="image" src="https://github.com/user-attachments/assets/71533676-4a79-454d-86b0-63ef74f4c290" />
</div>

##### 프로젝트 소개  
미국 주식 시장의 주가 데이터를 주시적으로 수집하여, 이를 데이터베이스에 저장한 후 사용자에게 웹 기반 인터페이스를 통해 시각화 된 정보를 제공하는 시스템입니다.  
크롤링으로 주식 정보를 데이터 베이스에 저장하고, 서버를 구축하여 사용자가 요청하는 정보를 보여줍니다. 
<br><br>

## 팀원 
|김윤진|이성현|이지민|정채원|
|:---:|:---:|:---:|:---:|
|<a href="https://github.com/yunndaeng" target="_blank"><img src="https://avatars.githubusercontent.com/u/193191038?v=4" height="150px"/><br>yunndaeng</a>|<a href="https://github.com/KOlizer" target="_blank"><img src="https://avatars.githubusercontent.com/u/127844467?v=4" height="150px"/><br>KOlizer</a>|<a href="https://github.com/jimnyy0" target="_blank"><img src="https://avatars.githubusercontent.com/u/204986312?v=4" height="150px"/><br>jimnyy0</a>|<a href="https://github.com/gqwerty" target="_blank"><img src="https://avatars.githubusercontent.com/u/128346343?v=4" height="150px"/><br>gqwerty</a>|

#### 맡은 역할

| 이름&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| 업무 |
|----------------------|------|
| 김윤진 | 백엔드: 주식 데이터 크롤링 (Yahoo Finance API 사용) / 서버 연동 및 API 서버 구현 (Flask) / 주식 데이터 분석 및 계산 (이동 평균선, 골든크로스/데드크로스 신호) / 실시간 비동기 처리 / 주식 가격 한국 원화 변환 기능 구현 (환율 API 연동) <br>이메일 알림 시스템: 주식 목표가 도달, 급등/급락, 거래량 급증 등의 알림 시스템 구현 / 이메일 발송 로직 (smtplib) / 신호 변경 시 알림 발송 로직 구현 <br>기타: Usecase Diagram 작성 / Class Diagram 작성 / 리드미 작성 / 발표 자료 작성 / 프로젝트 전체 설계 및 구현 참여 |
| 이성현 | 백엔드: 주식 데이터 DB 저장 및 관리 (MySQL) / 주식 정보 API 설계 및 구축 / DB 연결 및 데이터 처리 / 로그인/회원가입 시스템 구현 <br>기타: Usecase Diagram 작성 / 요구사항 분석 / Class Diagram 작성 / DB 설계 / 테스트 케이스 작성 및 수행 / 발표 자료 작성 / 발표 자료 준비 / 시스템 흐름도 설계 / API 문서화 / 프로젝트 전체 설계 및 구현 참여 |
| 이지민 | 프론트엔드: 메인홈, 로그인, 회원가입 화면 디자인 및 구현 / 주식 데이터 표시 UI 개발 (차트 및 테이블) / 사용자 대시보드 UI 구현 / 데이터 시각화 (차트) / 설정 다크모드 구현 / 사용자의 즐겨찾기 및 알림 UI / 즐겨찾기 등록 기능 구현 / 전체적인 UI 개발 <br>기타: Usecase Diagram 작성 / Class Diagram 작성 / UI 디자인 및 구현 / Class Diagram / UI 정의서 작성 / Flowchart 작성 / 발표 자료 작성 / 프로젝트 전체 설계 및 구현 참여 |
| 정채원 | 프론트엔드: 상세내역, 설정칸, 검색 화면 디자인 및 구현 / 주식 종목 검색 UI 구현 / 주식 종목 세부 정보 페이지 디자인 및 구현 / 주식 알림 기능 구현 <br>기타: Usecase Diagram 작성 / Class Diagram 작성 / Flowchart 작성 / 발표 자료 작성 / 테스트 케이스 작성 / 프로젝트 전체 설계 및 구현 참여 |



<br><br>

## 개발환경

|         OS          |         Server         |      CSP      |     IDE     |
|:-------------------:|:----------------------:|:-------------:|:-----------:|
| <img src="https://img.icons8.com/color/64/windows-10.png"/> &nbsp;&nbsp;&nbsp; <img src="https://img.icons8.com/color/64/ubuntu--v1.png"/> | <img src="https://img.icons8.com/ios-filled/64/docker.png"/> | <img src="https://img.icons8.com/?size=64&id=32fUGrUStbEu&format=png&color=FAB005"/> | <img src="https://img.icons8.com/?size=64&id=9OGIyU8hrxW5&format=png"/> |
| Windows, Ubuntu     | Flask / FastAPI        | Kakao Cloud   | VS Code     |

<br>

|            Language            |      DB      |    VCS    |
|:------------------------------:|:------------:|:---------:|
| <img src="https://img.icons8.com/color/64/python.png"/> &nbsp; <img src="https://img.icons8.com/color/64/javascript--v1.png"/> &nbsp; <img src="https://img.icons8.com/color/64/html-5--v1.png"/> &nbsp; <img src="https://img.icons8.com/color/64/css3.png"/> | <img src="https://img.icons8.com/color/64/mysql-logo.png"/> | <img src="https://img.icons8.com/ios-filled/64/github.png"/> |
| Python, JavaScript, HTML, CSS | MySQL        | GitHub     |

#### 개발환경 상세     
| 환경 | 사용 | 버전 |
|:---:|---|---|
| OS | <img src="https://img.shields.io/badge/Ubuntu-E95420?style=for-the-badge&logo=ubuntu&logoColor=white"/> | Ubuntu 20.04 |
| Language | <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/> | Python 3.9 |
| Library | <img src="https://img.shields.io/badge/BeautifulSoup-4B8BBE?style=for-the-badge&logo=beautifulsoup&logoColor=white"/> | BeautifulSoup 4 <br> yfinance <br> pandas <br> numpy <br> smtplib |
| Server Framework | <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white"/> <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/> | Flask (메인), FastAPI (일부 테스트용) |
| DB | <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/> | MySQL 8.0.41 |
| IDE | <img src="https://img.shields.io/badge/VSCode-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white"/> | Visual Studio Code |
| CSP | <img src="https://img.shields.io/badge/Kakao_Cloud-FFCD00?style=for-the-badge&logo=kakao&logoColor=black"/> | Kakao Cloud |

<br><br>
#### 요구사항 분석(기능 정리)
| 기능 구분           | 상세 내용 |
|--------------------|-----------|
| 로그인 & 회원가입  | 이메일 기반 회원가입 및 로그인 <br> 중복 방지 로직 적용 / 비밀번호 재확인 입력 |
| 사용자 관리         | 회원 정보 조회, 수정, 탈퇴 가능 <br> 사용자별 즐겨찾기 및 알람 설정 저장 |
| 주식 데이터 크롤링 | Yahoo Finance에서 실시간 주가 및 재무 정보 수집 <br> 상위 거래량/가격 10종목 자동 표시 |
| 즐겨찾기           | 사용자가 선택한 종목을 사이드바에 등록 / 해제 가능 <br> 등록 시 팝업 알림 제공 |
| 주식 검색           | 검색창 입력 시 해당 종목 상세 정보 페이지로 이동 <br> 종목명 자동완성 기능 포함 |
| 알람 기능           | 종목별 가격 또는 거래량 조건 만족 시 이메일 알림 발송 |
| 자동 새로고침 설정 | 사용자 설정값에 따라 주기적으로 데이터 새로고침 <br> 설정은 로그인 시 자동 적용 |
| 대시보드 UI         | 메인화면에 상위 종목, 즐겨찾기, 검색 결과 등 시각적으로 구성된 대시보드 표시 |
| 다크모드           | 버튼 클릭 시 다크모드 전환 <br> 사용자 설정 유지 |


<br><br>

## 실행 및 개발 환경 구축 방법
### 📁 DB 설정 정보

- DB 엔진: MySQL 8.0.41  
- DB 이름: capston  


### 🔧 백엔드 실행 방법
1. Python 3.9 설치 ([https://www.python.org](https://www.python.org))
2. 백엔드 디렉토리 이동 후 가상환경 생성:
   ```bash
   cd back/
   python -m venv venv
   source venv/bin/activate  # Windows는 venv\Scripts\activate
   pip install flask flask-cors mysql-connector-python yfinance pandas numpy beautifulsoup4
3. 백엔드 서버 실행
    ```bash
    python stock_api_server.py
4. 웹 브라우저에서 확인
    http://localhost:8000 접속


### 💻 프론트엔드 실행 방법
1. 프론트엔드 디렉토리 이동  
   ```bash
   cd front/
2. HTML 파일 직접 실행
→ login2.html 파일을 더블클릭하거나 브라우저에서 열기
3. 또는 로컬 서버 실행
python -m http.server 3000
4. 웹 브라우저에서 확인
http://localhost:3000/login2.html 접속

