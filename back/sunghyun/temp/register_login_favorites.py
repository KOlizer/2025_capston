# register_login_favorites.py
import json
from flask import Flask, request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date
from cryptography.fernet import Fernet
from werkzeug.security import generate_password_hash, check_password_hash

from database import Base   # 미리 정의된 Base
from models import User, Favorite  # User, Favorite 모델 (Favorite는 TopStock과의 관계를 통해 company_name 필드를 갖습니다.)

app = Flask(__name__)

# DB 연결 설정 (예: DB 이름 capston)
DATABASE_URL = (
    "mysql+pymysql://admin:admin1234@"
    "az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5."
    "mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# 암호화 키 및 객체 (프론트엔드와 공유하는 키)
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# JSON 응답 처리 함수 (한글 깨짐 방지)
def json_response(data, status=200):
    return Response(
        response=json.dumps(data, ensure_ascii=False),
        status=status,
        mimetype="application/json"
    )

# ------------------------------
# 회원가입 API (/register)
# ------------------------------
@app.route("/register", methods=["POST"])
def register():
    """
    클라이언트는 암호화된 JSON 데이터를 전송합니다.
    
    원본 데이터 예시 (암호화 대상):
    {
      "user_name": "john_doe_new",
      "user_email": "john_new@example.com",
      "user_password": "mypassword"
    }
    
    전송 데이터 예시:
    {
      "encrypted_data": "<암호화된 문자열>"
    }
    """
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)
    
    try:
        encrypted_text = data["encrypted_data"]
        decrypted_bytes = fernet.decrypt(encrypted_text.encode())
        decrypted_str = decrypted_bytes.decode("utf-8")
        payload = json.loads(decrypted_str)
    except Exception as e:
        return json_response({"error": "복호화 실패: " + str(e)}, 400)
    
    user_name = payload.get("user_name")
    user_email = payload.get("user_email")
    user_password = payload.get("user_password")
    
    if not user_name or not user_email or not user_password:
        return json_response({"error": "user_name, user_email, user_password 필수 입력"}, 400)
    
    # 비밀번호 해싱
    password_hash = generate_password_hash(user_password)
    
    session = SessionLocal()
    try:
        # user_name 중복 체크
        existing_user = session.query(User).filter_by(user_name=user_name).first()
        if existing_user:
            return json_response({"error": "이미 사용 중인 user_name입니다."}, 400)
        
        new_user = User(
            user_name=user_name,
            user_email=user_email,
            user_passworkd=password_hash  # 모델의 필드명이 user_passworkd임에 주의
        )
        session.add(new_user)
        session.commit()
        return json_response({"message": "회원가입 성공"}, 200)
    
    except Exception as e:
        session.rollback()
        return json_response({"error": str(e)}, 500)
    
    finally:
        session.close()

# ------------------------------
# 로그인 API (/login)
# ------------------------------
@app.route("/login", methods=["POST"])
def login():
    """
    클라이언트는 암호화된 JSON 데이터를 전송합니다.
    
    원본 데이터 예시 (암호화 대상):
    {
      "user_name": "john_doe_new",
      "user_password": "mypassword"
    }
    
    전송 데이터 예시:
    {
      "encrypted_data": "<암호화된 문자열>"
    }
    """
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)
    
    try:
        encrypted_text = data["encrypted_data"]
        decrypted_bytes = fernet.decrypt(encrypted_text.encode())
        decrypted_str = decrypted_bytes.decode("utf-8")
        payload = json.loads(decrypted_str)
    except Exception as e:
        return json_response({"error": "복호화 실패: " + str(e)}, 400)
    
    user_name = payload.get("user_name")
    user_password = payload.get("user_password")
    
    if not user_name or not user_password:
        return json_response({"error": "user_name과 user_password는 필수 입력입니다."}, 400)
    
    session = SessionLocal()
    try:
        user = session.query(User).filter_by(user_name=user_name).first()
        if not user:
            return json_response({"error": "사용자가 존재하지 않습니다."}, 404)
        
        if not check_password_hash(user.user_passworkd, user_password):
            return json_response({"error": "비밀번호가 올바르지 않습니다."}, 401)
        
        return json_response({"message": "로그인 성공"}, 200)
    
    except Exception as e:
        return json_response({"error": str(e)}, 500)
    
    finally:
        session.close()

# ------------------------------
# 즐겨찾기 조회 API (/favorites)
# ------------------------------
@app.route("/favorites", methods=["GET"])
def get_favorites():
    """
    프론트엔드는 쿼리 파라미터로 user_name을 전송합니다.
    
    요청 예시:
      GET /favorites?user_name=john_doe_new
    
    반환 예시:
    [
      {
        "company_name": "Apple Inc.",
        "subscriptoin": true,
        "notification": false
      },
      {
        "company_name": "Tesla Inc.",
        "subscriptoin": true,
        "notification": true
      }
    ]
    """
    user_name = request.args.get("user_name")
    if not user_name:
        return json_response({"error": "user_name 파라미터가 필요합니다."}, 400)
    
    session = SessionLocal()
    try:
        # user_name으로 사용자 조회
        user = session.query(User).filter_by(user_name=user_name).first()
        if not user:
            return json_response({"error": f"사용자 {user_name}을(를) 찾을 수 없습니다."}, 404)
        
        # Favorite 테이블에서 해당 사용자의 즐겨찾기 정보 조회
        favorites = session.query(Favorite).filter_by(user_id=user.id).all()
        
        result = []
        for fav in favorites:
            result.append({
                "company_name": fav.company_name,
                "subscriptoin": fav.subscriptoin,
                "notification": fav.notification
            })
        
        return json_response(result)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# ------------------------------
# 즐겨찾기 구독 상태 업데이트 API (/update_subscription)
# ------------------------------
@app.route("/update_subscription", methods=["POST"])
def update_subscription():
    """
    원본 데이터 예시 (JSON):
    {
      "user_name": "john_doe",
      "company_name": "Apple Inc.",
      "subscriptoin": true
    }
    
    해당 사용자의 Favorite 레코드에서 subscriptoin 값을 업데이트합니다.
    """
    data = request.get_json()
    if not data:
        return json_response({"error": "JSON 데이터가 제공되지 않았습니다."}, 400)
    
    user_name = data.get("user_name")
    company_name = data.get("company_name")
    new_subscription = data.get("subscriptoin")
    
    if user_name is None or company_name is None or new_subscription is None:
        return json_response(
            {"error": "user_name, company_name, 및 subscriptoin 필드가 필요합니다."},
            400
        )
    
    session = SessionLocal()
    try:
        # user_name에 해당하는 User 조회
        user = session.query(User).filter_by(user_name=user_name).first()
        if not user:
            return json_response({"error": f"사용자 {user_name}을(를) 찾을 수 없습니다."}, 404)
        
        # 해당 사용자의 특정 회사의 Favorite 레코드 조회
        fav = session.query(Favorite).filter_by(user_id=user.id, company_name=company_name).first()
        if not fav:
            return json_response({"error": f"회사 {company_name}에 대한 즐겨찾기 기록이 없습니다."}, 404)
        
        # subscriptoin 필드 업데이트
        fav.subscriptoin = bool(new_subscription)
        session.commit()
        return json_response({"message": "구독 상태가 업데이트되었습니다."}, 200)
    
    except Exception as e:
        session.rollback()
        return json_response({"error": str(e)}, 500)
    
    finally:
        session.close()


# ------------------------------
# 알림 설정 업데이트 API (/update_notification)
# ------------------------------
@app.route("/update_notification", methods=["POST"])
def update_notification():
    """
    원본 데이터 예시 (JSON):
    {
      "user_name": "john_doe",
      "company_name": "Apple Inc.",
      "notification": false
    }
    
    해당 사용자의 Favorite 레코드에서 notification 값을 업데이트합니다.
    """
    data = request.get_json()
    if not data:
        return json_response({"error": "JSON 데이터가 제공되지 않았습니다."}, 400)
    
    user_name = data.get("user_name")
    company_name = data.get("company_name")
    new_notification = data.get("notification")
    
    if user_name is None or company_name is None or new_notification is None:
        return json_response(
            {"error": "user_name, company_name, 및 notification 필드가 필요합니다."},
            400
        )
    
    session = SessionLocal()
    try:
        # user_name으로 사용자 조회
        user = session.query(User).filter_by(user_name=user_name).first()
        if not user:
            return json_response({"error": f"사용자 {user_name}을(를) 찾을 수 없습니다."}, 404)
        
        # Favorite 레코드 조회 (user_id와 company_name으로)
        fav = session.query(Favorite).filter_by(user_id=user.id, company_name=company_name).first()
        if not fav:
            return json_response({"error": f"회사 {company_name}에 대한 즐겨찾기 기록이 없습니다."}, 404)
        
        # notification 필드 업데이트
        fav.notification = bool(new_notification)
        session.commit()
        return json_response({"message": "알림 설정이 업데이트되었습니다."}, 200)
    
    except Exception as e:
        session.rollback()
        return json_response({"error": str(e)}, 500)
    
    finally:
        session.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
