# create_table.py
from cryptography.fernet import Fernet
import json

# 암호화 키
ENCRYPTION_KEY = b'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8='
fernet = Fernet(ENCRYPTION_KEY)

# 회원가입용 또는 로그인용 데이터 입력
data = {
    "user_id": "postman01",
    "user_name": "포스트맨유저",
    "user_email": "postman01@example.com",
    "user_password": "secure123"
}
endpoint = "register"  # "register" 또는 "login"

# 암호화 처리
json_str = json.dumps(data, ensure_ascii=False)
encrypted = fernet.encrypt(json_str.encode()).decode()

# 출력
print("Encrypted Data:")
print(encrypted)
print()
print("curl Command:")
print(f"curl -X POST http://localhost:8000/{endpoint} \\")
print('  -H "Content-Type: application/json" \\')
print(f'  -d \'{{\"encrypted_data\": \"{encrypted}\"}}\'')
