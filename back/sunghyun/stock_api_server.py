# -*- coding: utf-8 -*-
# stock_api_server.py

# 표준 라이브러리
import json
import logging
import datetime           # 모듈만 import
import smtplib
from email.mime.text import MIMEText

# 웹 프레임워크
from flask import Flask, request, Response, session
from flask_cors import CORS

# 스케줄러
from apscheduler.schedulers.background import BackgroundScheduler

# HTTP 요청
import requests

# 데이터 처리
import pandas as pd
import numpy as np        # yfinance 내부에서 pd.np 쓰는 문제 임시 해결
pd.np = np

# 금융 데이터
import yfinance as yf

# DB 연동
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 암호화/인증
from cryptography.fernet import Fernet, InvalidToken
from werkzeug.security import generate_password_hash, check_password_hash

# 웹 스크래핑 & 번역
from bs4 import BeautifulSoup
from googletrans import Translator

# 로컬 모듈
from database import Base
from models import User, Favorite, TopStock

# --------------------------------
# Flask 앱 초기화 및 DB 설정
# --------------------------------
app = Flask(__name__)
CORS(app, supports_credentials=True)

logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

DATABASE_URL = (
    "mysql+pymysql://admin:admin1234@"
    "az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5."
    "mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

# 시크릿 및 암호화 객체
app.secret_key = b"253bbcb4631251312d875d474a7e0929dcb591e2249964988115bf51cba04918"
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# -----------------------------
# 헬퍼 함수
# -----------------------------
def json_response(data, status=200):
    return Response(
        response=json.dumps(data, ensure_ascii=False),
        status=status,
        mimetype="application/json"
    )

def normalize_token(raw_token: str) -> str:
    token = raw_token.replace('-', '+').replace('_', '/')
    pad = len(token) % 4
    if pad:
        token += '=' * (4 - pad)
    return token

# -----------------------------
# 회원가입
# -----------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    token = normalize_token(data["encrypted_data"])
    try:
        decrypted = fernet.decrypt(token.encode()).decode()
        payload = json.loads(decrypted)
    except InvalidToken:
        return json_response({"error": "복호화 실패: InvalidToken"}, 400)
    except Exception as e:
        return json_response({"error": f"복호화 실패: {e}"}, 400)

    uid  = payload.get("user_id")
    uname= payload.get("user_name")
    uemail=payload.get("user_email")
    upass =payload.get("user_password")
    if not all([uid, uname, uemail, upass]):
        return json_response({"error": "모든 필드를 입력해주세요."}, 400)

    db = SessionLocal()
    try:
        if db.query(User).filter_by(user_id=uid).first():
            return json_response({"error": "이미 존재하는 user_id"}, 400)
        hashed = generate_password_hash(upass)
        user = User(user_id=uid, user_name=uname, user_email=uemail, user_password=hashed)
        db.add(user); db.commit()
        return json_response({"message": "회원가입 성공"})
    except Exception as e:
        db.rollback()
        return json_response({"error": str(e)}, 500)
    finally:
        db.close()

# -----------------------------
# 로그인
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    token = normalize_token(data["encrypted_data"])
    try:
        decrypted = fernet.decrypt(token.encode()).decode()
        payload = json.loads(decrypted)
    except InvalidToken:
        return json_response({"error": "복호화 실패: InvalidToken"}, 400)
    except Exception as e:
        return json_response({"error": f"복호화 실패: {e}"}, 400)

    email = payload.get("user_email"); pw = payload.get("user_password")
    if not email or not pw:
        return json_response({"error": "이메일/비밀번호 필요"}, 400)

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(user_email=email).first()
        if not user:
            return json_response({"error": "존재하지 않는 이메일"}, 404)
        if not check_password_hash(user.user_password, pw):
            return json_response({"error": "비밀번호 불일치"}, 401)

        # refresh_time 값 확인 (NULL이면 60으로 설정)
        rt = user.refresh_time if user.refresh_time is not None else 60

        session.permanent = True
        session["user_id"] = user.user_id
        return json_response({
            "message": "로그인 성공",
            "user_id": user.user_id,
            "user_email": user.user_email,
            "refresh_time": rt
        })
    except Exception as e:
        return json_response({"error": str(e)}, 500)
    finally:
        db.close()
# -----------------------------
# 즐겨찾기 조회
# -----------------------------
@app.route("/favorites", methods=["GET"])
def get_favorites():
    uid = request.args.get("user_id")
    if not uid:
        return json_response({"error": "user_id 필요"}, 400)
    db = SessionLocal()
    try:
        favs = db.query(Favorite).filter_by(user_id=uid).all()
        data=[{"company_name":f.company_name, "subscription":f.subscription, "notification":f.notification} for f in favs]
        return json_response(data)
    except Exception as e:
        return json_response({"error": str(e)},500)
    finally:
        db.close()

# -----------------------------------
# 거래량 상위 10개 주식 스크래핑 + 저장 (최신 10개만 유지)
# -----------------------------------
def get_top_10_by_volume():
    resp = requests.get(
        "https://finance.yahoo.com/markets/stocks/most-active/",
        headers={"User-Agent":"Mozilla/5.0"}
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    rows = soup.select('table tbody tr')[:10]
    res = []
    for r in rows:
        cols = r.find_all('td')
        res.append({
            "company_name": cols[1].get_text(strip=True),
            "ticker":       cols[0].get_text(strip=True),
            "price":        r.find('fin-streamer', {"data-field":"regularMarketPrice"}).get_text(strip=True),
            "volume":       cols[6].get_text(strip=True)
        })
    return res

def upsert_top_stocks():
    stocks = get_top_10_by_volume()
    today = datetime.datetime.now().date()
    db = SessionLocal()
    try:
        # 1) 기존 데이터 전부 삭제
        db.query(TopStock).delete()
        db.commit()
        # 2) 새로 가져온 10개만 삽입
        for s in stocks:
            db.add(TopStock(
                company_name=s["company_name"],
                ticker      =s["ticker"],
                price       =s["price"],
                volume      =s["volume"],
                date        =today
            ))
        db.commit()
        # 3) 반환값에 ISO 포맷 날짜 추가
        for s in stocks:
            s["date"] = today.isoformat()
    finally:
        db.close()
    return stocks

@app.route("/top_stocks", methods=["GET"])
def top_stocks():
    try:
        return json_response({"top_stocks": upsert_top_stocks()}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)

# -----------------------------
# 주식 검색 및 정보 조회
# -----------------------------
translator=Translator()

def translate_company_name(name_ko:str)->str:
    return translator.translate(name_ko,src='ko',dest='en').text

def search_ticker(company_name_ko:str)->(str,str):
    name_en=translate_company_name(company_name_ko)
    resp=requests.get("https://query2.finance.yahoo.com/v1/finance/search",headers={"User-Agent":"Mozilla/5.0"},params={"q":name_en,"lang":"en-US"})
    resp.raise_for_status()
    quotes=resp.json().get("quotes",[])
    if not quotes: raise ValueError(f"'{company_name_ko}' 검색 결과 없음")
    first=quotes[0]
    return first.get('symbol'), first.get('shortname') or first.get('longname') or company_name_ko

@app.route('/stocks/search',methods=['GET'])
def stock_search():
    name=request.args.get('name')
    if not name: return json_response({"error":"name 필요"},400)
    try:
        ticker,_=search_ticker(name)
        info=yf.Ticker(ticker).info
        data={
            "company_name":name,
            "ticker":ticker,
            "info":{
                "현재 주가":info.get("regularMarketPrice"),
                "시가총액":info.get("marketCap"),
                "PER (Trailing)":info.get("trailingPE"),
                "PER (Forward)":info.get("forwardPE"),
                "전일 종가":info.get("previousClose"),
                "시가":info.get("open"),
                "고가":info.get("dayHigh"),
                "저가":info.get("dayLow"),
                "52주 최고":info.get("fiftyTwoWeekHigh"),
                "52주 최저":info.get("fiftyTwoWeekLow"),
                "거래량":info.get("volume"),
                "평균 거래량":info.get("averageVolume"),
                "배당 수익률":info.get("dividendYield"),
            }
        }
        return json_response(data)
    except ValueError as ve:
        return json_response({"error":str(ve)},404)
    except Exception as e:
        return json_response({"error":str(e)},500)

# -----------------------------
# 구독/알림 업데이트
# -----------------------------
@app.route("/update_subscription",methods=["POST"])
def update_subscription():
    data=request.get_json()
    if not data: return json_response({"error":"JSON 필요"},400)
    uid=data.get('user_id'); cn=data.get('company_name'); sub=data.get('subscription')
    if uid is None or cn is None or sub is None: return json_response({"error":"필드 부족"},400)
    db=SessionLocal()
    try:
        fav=db.query(Favorite).filter_by(user_id=uid,company_name=cn).first()
        if fav:
            fav.subscription=sub; msg="구독 업데이트"
        else:
            db.add(Favorite(user_id=uid,company_name=cn,subscription=sub,notification=False)); msg="구독 생성"
        db.commit()
        return json_response({"message":msg})
    except Exception as e:
        db.rollback(); return json_response({"error":str(e)},500)
    finally: db.close()

@app.route("/update_notification",methods=["POST"])
def update_notification():
    data=request.get_json()
    if not data: return json_response({"error":"JSON 필요"},400)
    uid=data.get('user_id'); cn=data.get('company_name'); notify=data.get('notification')
    if uid is None or cn is None or notify is None: return json_response({"error":"필드 부족"},400)
    db=SessionLocal()
    try:
        fav=db.query(Favorite).filter_by(user_id=uid,company_name=cn).first()
        if not fav: return json_response({"error":"항목 없음"},404)
        fav.notification=notify; db.commit()
        return json_response({"message":"알림 설정 완료"})
    except Exception as e:
        db.rollback(); return json_response({"error":str(e)},500)
    finally: db.close()

# -----------------------------
# refresh_time 업데이트
# -----------------------------
@app.route("/update_refresh_time", methods=["POST"])
def update_refresh_time():
    data = request.get_json()
    uid = data.get("user_id")
    rt  = data.get("refresh_time")

    if not uid or rt is None:
        return json_response({"error": "user_id와 refresh_time이 모두 필요합니다."}, 400)

    # 숫자로 들어온 값을 int로 변환
    try:
        rt_val = int(rt)
    except ValueError:
        return json_response({"error": "refresh_time은 정수여야 합니다."}, 400)

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(user_id=uid).first()
        if not user:
            return json_response({"error": "해당 사용자를 찾을 수 없습니다."}, 404)

        # 받은 값으로 컬럼 업데이트
        user.refresh_time = rt_val
        db.commit()

        return json_response({
            "message": "refresh_time 업데이트 성공",
        }, 200)

    except Exception as e:
        db.rollback()
        return json_response({"error": str(e)}, 500)
    finally:
        db.close()

# --------------------------------
# 아래부터 윤진님 코드
# --------------------------------


# -----------------------------
# 신호 계산 및 이메일 전송
# -----------------------------
def get_stock_signal(ticker):
    try:
        end=int(datetime.datetime.now().timestamp())
        start=end-86400*547
        url=f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={start}&period2={end}&interval=1d"
        headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'}
        res=requests.get(url,headers=headers); data=res.json()
        if data.get('chart',{}).get('error'): return "HOLD", ["❌ Yahoo 오류"]
        result=data['chart']['result'][0]
        timestamps=result['timestamp']; closes=result['indicators']['quote'][0]['close']
        df=pd.DataFrame({'Date':pd.to_datetime(timestamps,unit='s'),'Close':closes}).dropna()
        if len(df)<300: return "HOLD", ["📉 데이터 짧음"]
        df.set_index('Date',inplace=True)
        for w in [5,20,60,110,240]: df[f'SMA{w}']=df['Close'].rolling(w).mean()
        df.dropna(inplace=True)
        prev, latest = df.iloc[-2], df.iloc[-1]
        signal="HOLD"; reasons=[]
        if ((prev['SMA5']<prev['SMA20'] and latest['SMA5']>latest['SMA20']) or
            (prev['SMA20']<prev['SMA60'] and latest['SMA20']>latest['SMA60']) or
            (prev['SMA110']<prev['SMA240'] and latest['SMA110']>latest['SMA240'])):
            signal="BUY"; reasons.append("골든크로스")
        elif ((prev['SMA60']>prev['SMA20'] and latest['SMA60']<latest['SMA20']) or
              (prev['SMA60']>prev['SMA110'] and latest['SMA60']<latest['SMA110'])):
            signal="SELL"; reasons.append("데드크로스")
        else:
            reasons.append("조건 불만족")
        return signal, reasons
    except Exception as e:
        return "HOLD", [f"❌ 에러: {e}"]

def send_email(subject, body, receiver_email):
    msg=MIMEText(body)
    msg['Subject']=subject; msg['From']='rladbswls9024@gmail.com'; msg['To']=receiver_email
    with smtplib.SMTP_SSL('smtp.gmail.com',465) as server:
        server.login('rladbswls9024@gmail.com','lmko ygnl drdb tkll')
        server.send_message(msg)
        
def check_and_notify(ticker, receiver_email):
    sig, rs = get_stock_signal(ticker)
    # BUY 또는 SELL 신호일 때만 메일 전송
    if sig in ['BUY', 'SELL']:
        subj = f"[{ticker}] {sig} 신호"
        body = f"📃 종목: {ticker}\n📈 신호: {sig}\n📝 사유:\n- {'\n- '.join(rs)}"
        try:
            send_email(subj, body, receiver_email)
            return {'status': 'sent', 'signal': sig, 'reasons': rs}
        except Exception as e:
            app.logger.exception(f"이메일 전송 실패 [{ticker}]: {e}")
            return {'status': 'error', 'signal': sig, 'reasons': [f"❌ 이메일 전송 실패: {e}"]}
    # HOLD 또는 에러인 경우 메일 전송하지 않음
    return {'status': 'skipped', 'signal': sig, 'reasons': rs}


# -----------------------------
# 주기적 감지 및 알림
# -----------------------------
def scheduled_check():
    db=SessionLocal()
    try:
        favs=db.query(Favorite).filter(Favorite.notification==True).all()
        for f in favs:
            user=db.query(User).filter_by(user_id=f.user_id).first()
            if not user: continue
            try:
                ticker,_=search_ticker(f.company_name)
                check_and_notify(ticker,user.user_email)
            except:
                app.logger.exception(f"알림 오류: {f.company_name}")
    except:
        app.logger.exception("스케줄 중 오류")
    finally: db.close()

scheduler=BackgroundScheduler()
scheduler.add_job(scheduled_check,'interval',hours=1,id='stock_signal_watcher')
scheduler.start()

# --------------------------------
# 앱 실행
# --------------------------------
if __name__=='__main__':
    try:
        app.run(host='0.0.0.0',port=8000,debug=True)
    finally:
        scheduler.shutdown()
