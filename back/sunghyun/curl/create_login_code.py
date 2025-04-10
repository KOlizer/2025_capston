# create_login_code.py
from cryptography.fernet import Fernet
import json

# 서버와 공유한 키
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# 로그인 정보 입력
login_data = {
    "user_id": "user003",
    "user_password": "test1234"
}

# 암호화
encrypted = fernet.encrypt(json.dumps(login_data).encode()).decode()

#curl 명령어 자동 출력
print("\n curl 테스트용 명령어:")
print("curl -X POST http://localhost:8000/login \\")
print("  -H \"Content-Type: application/json\" \\")
print(f"  -d '{{\"encrypted_data\": \"{encrypted}\"}}'")
