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
|<a href="https://github.com/yunndaeng" target="_blank"><img src="https://avatars.githubusercontent.com/u/193191038?v=4" height="150px"/><br>yunndaeng</a>|<a href="https://github.com/KOlizer" target="_blank"><img src="https://avatars.githubusercontent.com/u/127844467?v=4" height="150px"/><br>KOlizer</a>|<a href="https://github.com/jimnyy0" target="_blank"><img src="https://avatars.githubusercontent.com/u/204986312?v=4" height="150px"/><br>jimnyy0</a>|<a href="https://github.com/채원님l" target="_blank"><img src="https://avatars.githubusercontent.com/u/133009070?v=4" height="150px"/><br>채원님</a>|

#### 맡은 역할

| 이름&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| 업무 |
|----------------------|------|
| 김윤진 | 백엔드: css / 대시보드의 작업 테이블 / 동료 추가, 조회 버튼 / 작업 추가와 수정 모달 <br>백엔드: 작업 추가, 삭제, 수정, 조회 / 동료 추가, 삭제, 조회 / 동료 이메일 보내기 / 실시간 비동기 처리 <br>기타: 서버 연동 / 요구사항 / Usecase Diagram / Class Diagram / DB 설계 / 간트 차트 / 테스트 케이스 & 시나리오 / 발표 / 발표자료 / 리드미 작성 |
| 이성현 | 백엔드: css / 작업 테이블 디자인 / Calendar / 작업 추가, 삭제, 수정 버튼 / 회원 이름 / 회원 프로필, 정보 수정 모달 <br>백엔드: 작업 추가, 삭제, 수정 / 회원 조회, 수정 / 날짜 조회 <br>기타: 발표자료 / 발표 / Sequence Diagram / Class Diagram |
| 이지민 | 프론트 엔드: css / 로그인, 회원가입 화면 <br>백엔드: 회원 추가, 조회 <br>기타: Class Diagram / UI 정의서 |
| 정채원 | 프론트 엔드: css / 메인 디자인 / 로그인, 회원가입 화면 / 작업 추가, 삭제, 수정 버튼 / 대시보드 목록 / 대시보드 추가와 수정 모달 / AI 챗봇 <br>백엔드: 작업 추가, 삭제, 수정 / 회원 추가, 조회, 탈퇴 / 대시보드 추가, 삭제, 수정, 조회 / 동료 추가, 삭제, 조회 <br>기타: 발표 / 발표자료 / Sequence Diagram / ERD / DB 설계 / SQL문 작성 / 리드미 작성 |

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

<br>

## 실행 및 개발 환경 구축 방법

### 🔧 백엔드 실행 방법
1. Python 3.9 설치 ([https://www.python.org](https://www.python.org))
2. 백엔드 디렉토리 이동 후 가상환경 생성:
   ```bash
   cd back/
   python -m venv venv
   source venv/bin/activate  # Windows는 venv\Scripts\activate
   pip install -r requirements.txt
3. MySQL에서 DB 생성
    ```bash
    CREATE DATABASE stock_data;
4. 백엔드 서버 실행
    ```bash
    python app.py
5. 웹 브라우저에서 확인
    http://localhost:5000 접속


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
