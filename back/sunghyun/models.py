import json
from flask import Flask, request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from cryptography.fernet import Fernet
from werkzeug.security import generate_password_hash, check_password_hash
from bs4 import BeautifulSoup
import requests
from datetime import datetime

from database import Base
from models import User, Favorite, TopStock

app = Flask(__name__)

# DB 연결 설정
DATABASE_URL = (
    "mysql+pymysql://admin:admin1234@"
    "az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5."
    "mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# 테이블 자동 생성 (User, Favorite, TopStock 등)
Base.metadata.create_all(bind=engine)

# 암호화 키
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# 응답 함수
def json_response(data, status=200):
    return Response(
        response=json.dumps(data, ensure_ascii=False),
        status=status,
        mimetype="application/json"
    )

# -----------------------------
# 기존 회원가입/로그인/즐겨찾기 로직
# -----------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    try:
        decrypted_str = fernet.decrypt(data["encrypted_data"].encode()).decode("utf-8")
        payload = json.loads(decrypted_str)
    except Exception as e:
        return json_response({"error": "복호화 실패: " + str(e)}, 400)

    user_id = payload.get("user_id")
    user_name = payload.get("user_name")
    user_email = payload.get("user_email")
    user_password = payload.get("user_password")

    if not user_id or not user_name or not user_email or not user_password:
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
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    try:
        decrypted_str = fernet.decrypt(data["encrypted_data"].encode()).decode("utf-8")
        payload = json.loads(decrypted_str)
    except Exception as e:
        return json_response({"error": "복호화 실패: " + str(e)}, 400)

    user_id = payload.get("user_id")
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
        result = [{
            "company_name": fav.company_name,
            "subscriptoin": fav.subscriptoin,
            "notification": fav.notification
        } for fav in favorites]
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
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
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
        stocks.append({
            "company_name": company,
            "ticker": ticker,
            "price": price,
            "volume": volume
        })
    return stocks

def upsert_top_stocks():
    stocks = get_top_10_by_volume()
    today = datetime.now().date()
    session = SessionLocal()
    try:
        for s in stocks:
            obj = session.get(TopStock, s["company_name"] )
            if obj:
                obj.ticker = s["ticker"]
                obj.price  = s["price"]
                obj.volume = s["volume"]
                obj.date   = today
            else:
                obj = TopStock(
                    company_name=s["company_name"],
                    ticker=s["ticker"],
                    price=s["price"],
                    volume=s["volume"],
                    date=today
                )
                session.add(obj)
        session.commit()
        # date 필드를 JSON에도 포함
        for s in stocks:
            s["date"] = today.isoformat()
    finally:
        session.close()
    return stocks

@app.route("/top_stocks/refresh", methods=["GET"])
def refresh_top_stocks():
    try:
        stocks = upsert_top_stocks()
        return json_response({"top_stocks": stocks}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)

@app.route("/top_stocks", methods=["GET"])
def get_top_stocks():
    session = SessionLocal()
    try:
        today = datetime.now().date()
        rows = session.query(TopStock).filter(TopStock.date == today).all()
        result = [{
            "company_name": r.company_name,
            "ticker":       r.ticker,
            "price":        r.price,
            "volume":       r.volume,
            "date":         r.date.isoformat()
        } for r in rows]
        return json_response(result, 200)
    finally:
        session.close()

# 앱 실행
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
