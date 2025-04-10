import json
from flask import Flask, request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from cryptography.fernet import Fernet
from werkzeug.security import generate_password_hash, check_password_hash

from database import Base
from models import User, Favorite

app = Flask(__name__)

# DB 연결 설정
DATABASE_URL = (
    "mysql+pymysql://admin:admin1234@"
    "az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5."
    "mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

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

# 회원가입
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "encrypted_data" not in data:
        return json_response({"error": "encrypted_data가 누락되었습니다."}, 400)

    try:
        encrypted_text = data["encrypted_data"]
        decrypted_str = fernet.decrypt(encrypted_text.encode()).decode("utf-8")
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

# 로그인
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

# 즐겨찾기 조회
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

# 구독 상태 업데이트
@app.route("/update_subscription", methods=["POST"])
def update_subscription():
    data = request.get_json()
    if not data:
        return json_response({"error": "JSON 데이터가 제공되지 않았습니다."}, 400)

    user_id = data.get("user_id")
    company_name = data.get("company_name")
    new_subscription = data.get("subscriptoin")

    if not user_id or not company_name or new_subscription is None:
        return json_response({"error": "user_id, company_name, subscriptoin 필드가 필요합니다."}, 400)

    session = SessionLocal()
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return json_response({"error": f"사용자 {user_id}을(를) 찾을 수 없습니다."}, 404)

        fav = session.query(Favorite).filter_by(user_id=user.user_id, company_name=company_name).first()

        if fav:
            fav.subscriptoin = bool(new_subscription)
        else:
            fav = Favorite(
                user_id=user.user_id,
                company_name=company_name,
                subscriptoin=bool(new_subscription),
                notification=False
            )
            session.add(fav)

        session.commit()
        return json_response({"message": "구독 상태가 업데이트되었습니다."}, 200)
    except Exception as e:
        session.rollback()
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# 알림 설정 업데이트
@app.route("/update_notification", methods=["POST"])
def update_notification():
    data = request.get_json()
    if not data:
        return json_response({"error": "JSON 데이터가 제공되지 않았습니다."}, 400)

    user_id = data.get("user_id")
    company_name = data.get("company_name")
    new_notification = data.get("notification")

    if not user_id or not company_name or new_notification is None:
        return json_response({"error": "user_id, company_name, notification 필드가 필요합니다."}, 400)

    session = SessionLocal()
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return json_response({"error": f"사용자 {user_id}을(를) 찾을 수 없습니다."}, 404)

        fav = session.query(Favorite).filter_by(user_id=user.user_id, company_name=company_name).first()

        if fav:
            fav.notification = bool(new_notification)
        else:
            fav = Favorite(
                user_id=user.user_id,
                company_name=company_name,
                subscriptoin=False,
                notification=bool(new_notification)
            )
            session.add(fav)

        session.commit()
        return json_response({"message": "알림 설정이 업데이트되었습니다."}, 200)
    except Exception as e:
        session.rollback()
        return json_response({"error": str(e)}, 500)
    finally:
        session.close()

# 앱 실행
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
