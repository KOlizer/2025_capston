import json
import re
import logging
from flask import Flask, request, Response
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from cryptography.fernet import Fernet, InvalidToken
from werkzeug.security import generate_password_hash, check_password_hash
from bs4 import BeautifulSoup
import requests
from googletrans import Translator
from datetime import datetime
import yfinance as yf

from database import Base
from models import User, Favorite, TopStock

# Flask 앱 초기화
app = Flask(__name__)
CORS(app)

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

# DB 연결 설정
DATABASE_URL = (
    "mysql+pymysql://admin:admin1234@"
    "az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5."
    "mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

# 암호화 키 & Fernet 객체
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# JSON 응답 헬퍼
def json_response(data, status=200):
    return Response(
        response=json.dumps(data, ensure_ascii=False),
        status=status,
        mimetype="application/json"
    )

# -----------------------------
# 회원가입 엔드포인트
# -----------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        app.logger.debug("Missing encrypted_data: %s", data)
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    raw_token = data["encrypted_data"]
    app.logger.debug("Received token: %s", raw_token)
    # URL-safe -> 표준 Base64
    token = raw_token.replace('-', '+').replace('_', '/')
    # 패딩
    pad = len(token) % 4
    if pad:
        token += '=' * (4 - pad)
    app.logger.debug("Normalized token: %s", token)

    try:
        decrypted_str = fernet.decrypt(token.encode()).decode('utf-8')
        app.logger.debug("Decrypted payload: %s", decrypted_str)
        payload = json.loads(decrypted_str)
    except InvalidToken as e:
        app.logger.exception("InvalidToken during decryption")
        return json_response({"error": f"복호화 실패: InvalidToken"}, 400)
    except Exception as e:
        app.logger.exception("Error during decryption")
        return json_response({"error": f"복호화 실패: {type(e).__name__} {str(e)}"}, 400)

    # 필수 필드
    user_id       = payload.get("user_id")
    user_name     = payload.get("user_name")
    user_email    = payload.get("user_email")
    user_password = payload.get("user_password")
    if not all([user_id, user_name, user_email, user_password]):
        return json_response({"error": "user_id, user_name, user_email, user_password 필수 입력"}, 400)

    password_hash = generate_password_hash(user_password)
    session = SessionLocal()
    try:
        if session.query(User).filter_by(user_id=user_id).first():
            return json_response({"error": "이미 사용 중인 user_id입니다."}, 400)
        new_user = User(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            user_password=password_hash
        )
        session.add(new_user)
        session.commit()
        return json_response({"message": "회원가입 성공"}, 200)
    except Exception as e:
        session.rollback()
        app.logger.exception("DB commit error")
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# -----------------------------
# 로그인 엔드포인트
# -----------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)
    try:
        decrypted_str = fernet.decrypt(data["encrypted_data"].encode()).decode('utf-8')
        payload = json.loads(decrypted_str)
    except Exception as e:
        return json_response({"error": "복호화 실패: " + str(e)}, 400)

    user_id       = payload.get("user_id")
    user_password = payload.get("user_password")
    if not user_id or not user_password:
        return json_response({"error": "user_id와 user_password는 필수 입력입니다."}, 400)

    session = SessionLocal()
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return json_response({"error": "사용자가 존재하지 않습니다."}, 404)
        if not check_password_hash(user.user_password, user_password):
            return json_response({"error": "비밀번호가 올바르지 않습니다."}, 401)
        return json_response({"message": "로그인 성공"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# -----------------------------
# 즐겨찾기 조회
# -----------------------------
@app.route("/favorites", methods=["GET"])
def get_favorites():
    user_id = request.args.get("user_id")
    if not user_id:
        return json_response({"error": "user_id 파라미터가 필요합니다."}, 400)
    session = SessionLocal()
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return json_response({"error": f"사용자 {user_id}을(를) 찾을 수 없습니다."}, 404)
        favorites = session.query(Favorite).filter_by(user_id=user.user_id).all()
        result = [
            {"company_name": f.company_name, "subscription": f.subscription, "notification": f.notification}
            for f in favorites
        ]
        return json_response(result)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# -----------------------------------
# 거래량 상위 10개 주식 스크래핑 + 저장
# -----------------------------------
def get_top_10_by_volume():
    url = "https://finance.yahoo.com/markets/stocks/most-active/"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.select("table tbody tr")[:10]
    stocks = []
    for row in rows:
        cols = row.find_all("td")
        ticker  = cols[0].get_text(strip=True)
        company = cols[1].get_text(strip=True)
        price   = row.find("fin-streamer", {"data-field": "regularMarketPrice"}).get_text(strip=True)
        volume  = cols[6].get_text(strip=True)
        stocks.append({"company_name": company, "ticker": ticker, "price": price, "volume": volume})
    return stocks

def upsert_top_stocks():
    stocks = get_top_10_by_volume()
    today = datetime.now().date()
    session = SessionLocal()
    try:
        for s in stocks:
            obj = session.get(TopStock, s["company_name"])
            if obj:
                obj.ticker = s["ticker"]
                obj.price  = s["price"]
                obj.volume = s["volume"]
                obj.date   = today
            else:
                obj = TopStock(**{**s, "date": today})
                session.add(obj)
        session.commit()
        for s in stocks:
            s["date"] = today.isoformat()
    finally:
        session.close()
    return stocks

@app.route("/top_stocks", methods=["GET"])
def top_stocks():
    try:
        stocks = upsert_top_stocks()
        return json_response({"top_stocks": stocks}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)

# ----------------------------
# 주식 검색 및 정보 조회
# ----------------------------
translator = Translator()
def translate_company_name(name_ko: str) -> str:
    return translator.translate(name_ko, src='ko', dest='en').text

def search_ticker(company_name_ko: str) -> (str, str):
    name_en = translate_company_name(company_name_ko)
    resp = requests.get(
        "https://query2.finance.yahoo.com/v1/finance/search",
        headers={"User-Agent": "Mozilla/5.0"},
        params={"q": name_en, "lang": "en-US"}
    )
    resp.raise_for_status()
    quotes = resp.json().get("quotes", [])
    if not quotes:
        raise ValueError(f"'{company_name_ko}' 검색 결과가 없습니다.")
    first = quotes[0]
    return first.get("symbol"), first.get("shortname") or first.get("longname") or company_name_ko

@app.route('/stocks/search', methods=['GET'])
def stock_search():
    name_ko = request.args.get('name')
    if not name_ko:
        return json_response({"error": "name 파라미터가 필요합니다."}, 400)
    try:
        ticker, _ = search_ticker(name_ko)
        stock = yf.Ticker(ticker)
        info  = stock.info
        return json_response({
            "company_name": name_ko,
            "ticker":       ticker,
            "info":         {
                "현재 주가":      info.get("regularMarketPrice"),
                "시가총액":       info.get("marketCap"),
                "PER (Trailing)":info.get("trailingPE"),
                "PER (Forward)": info.get("forwardPE"),
                "전일 종가":      info.get("previousClose"),
                "시가":          info.get("open"),
                "고가":          info.get("dayHigh"),
                "저가":          info.get("dayLow"),
                "52주 최고":     info.get("fiftyTwoWeekHigh"),
                "52주 최저":     info.get("fiftyTwoWeekLow"),
                "거래량":        info.get("volume"),
                "평균 거래량":   info.get("averageVolume"),
                "배당 수익률":   info.get("dividendYield"),
            }
        }, 200)
    except ValueError as ve:
        return json_response({"error": str(ve)}, 404)
    except Exception as e:
        return json_response({"error": str(e)}, 500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
