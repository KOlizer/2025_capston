# register_login.py
import json
from flask import Flask, request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date
from cryptography.fernet import Fernet
from werkzeug.security import generate_password_hash, check_password_hash

from database import Base   # 미리 정의된 Base
from models import User      # User 모델 예시: 
#   class User(Base):
#       __tablename__ = "user"
#       user_name = Column(String(50), primary_key=True)
#       user_passworkd = Column(String(255), nullable=False)
#       user_email = Column(String(100), unique=True, nullable=False)
#       created_at = Column(DateTime, default=datetime.utcnow)

app = Flask(__name__)

# DB 연결 설정 (예: DB 이름 stock_data)
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
#  회원가입 API
# ------------------------------
@app.route("/register", methods=["POST"])
def register():
    """
    클라이언트는 암호화된 JSON 데이터를 전송합니다.
    
    예시 - 암호화 전 원본 데이터:
    {
      "user_name": "john_doe",
      "user_email": "john@example.com",
      "user_password": "mypassword"
    }
    
    클라이언트는 이 데이터를 암호화하여 다음과 같이 전송합니다.
    {
      "encrypted_data": "<암호화된 문자열>"
    }
    """
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)
    
    try:
        # 암호화된 문자열을 복호화하여 원본 JSON 문자열을 얻음
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
        # 중복 체크
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
#  로그인 API
# ------------------------------
@app.route("/login", methods=["POST"])
def login():
    """
    클라이언트는 암호화된 JSON 데이터를 전송합니다.
    
    예시 - 암호화 전 원본 데이터:
    {
      "user_name": "john_doe",
      "user_password": "mypassword"
    }
    
    클라이언트는 이 데이터를 암호화하여 다음과 같이 전송합니다.
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
