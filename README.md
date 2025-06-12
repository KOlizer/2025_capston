## 미국 주식 가격 수집기 Project
<div style="text-align: center;">
    <img width="1500" alt="image" src="https://github.com/user-attachments/assets/71533676-4a79-454d-86b0-63ef74f4c290" />

</div>

##### 프로젝트 소개
미국 주식 시장의 주가 데이터를 주시적으로 수집하여, 이를 데이터베이스에 저장한 후 사용자에게 웹 기반 인터페이스를 통해 시각화 된 정보를 제공하는 시스템입니다.  크롤링으로 주식 정보를 데이터 베이스에 저장하고, 서버를 구축하여 사용자가 요청하는 정보를 보여줍니다. 
<br>
<br>
<br>

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



<br><br>
## 요구사항

<div style="text-align: center;">
    <img height="500px" src="/docs/소프트웨어 설계/요구 사항.png" alt="alt text" />
</div>

#### 요구사항 분석(기능 정리)
|요구사항|상세내용|
|:---:|---|
| 로그인 & 회원가입 | 회원 조회, 추가, 삭제, 수정 |
| 작업 | 회원 조회, 추가, 삭제, 수정 |
| 백로그 | 진행"완료"인 작업들의 모음 |
| 대시보드 | 대시보드 추가, 삭제, 수정 |
| 동료 | 동료 추가, 삭제, 조회 |
| 캘린더 | 작업의 시작일을 캘린더의 표시, 작업 삭제 시 해당 작업을 캘린더에서 삭제 |

<br><br>
## 우리 프로젝트

#### 회원가입
<div style="text-align: center;">
  <img width="1500" alt="image" src="https://github.com/user-attachments/assets/bbd5532f-40b5-4b95-a743-6d7f55261b30" />
</div> 

<br>

#### 로그인
<div style="text-align: center;">
  <img width="1500" alt="image" src="https://github.com/user-attachments/assets/7e62ca95-2f4a-4737-9567-b0c485c3360c" />
</div> 

<br>

#### 로그인 후 홈 화면
<div style="text-align: center;">
  <img width="1500" alt="image" src="https://github.com/user-attachments/assets/7e5d2cdd-be81-4175-a309-1ed5898b6470" />
</div> 

<br>

#### 즐겨찾기
<div style="text-align: center;">
  <img width="1500" alt="image" src="https://github.com/user-attachments/assets/1164a4ff-192e-416a-b3fa-4be542c2cc83" />
</div> 

<br>

#### 주식 정보
<div style="text-align: center;">
  <img width="1500" alt="image" src="https://github.com/user-attachments/assets/3bcdeda6-a765-41d2-b5d2-8041dfbb2d70" />
</div> 

<br>

<br><br>

## 구현 사진
<a href="/docs/구현 사진/README.md" target="_blank">구현 사진</a>

<br><br>

## 소프트웨어 설계
<a href="/docs/소프트웨어 설계/README.md" target="_blank">소프트웨어 설계</a>

<br><br>

## PMS 레퍼런스 (Monday.dev)
<a href="/docs/PMS 레퍼런스 사진 모음/README.md" target="_blank">PMS 레퍼런스 (Monday.dev)</a>
