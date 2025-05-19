// login.js
// 이 스크립트를 불러오기 전에 반드시 fernet-js를 먼저 로드해야 합니다.
// <script src="https://cdn.jsdelivr.net/npm/fernet@0.8.0/fernet.min.js"></script>
// <script src="/static/js/login.js"></script>

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1) 폼 데이터 수집
  const userId   = document.getElementById('user-id').value;
  const password = document.getElementById('password').value;

  // 2) 페이로드 구성 (백엔드 /login 엔드포인트 스펙)
  const payload = {
    user_id:       userId,
    user_password: password
  };

  // 3) Fernet 암호화 준비
  const KEY    = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';  // 백엔드와 동일
  const secret = new fernet.Secret(KEY);
  const token  = new fernet.Token({
    secret: secret,
    time:   Date.now() / 1000,
    iv:     fernet.generateIv()
  });

  // 4) 암호화
  const encrypted_data = token.encode(JSON.stringify(payload));
  console.log('🔐 로그인 암호문:', encrypted_data);

  try {
    // 5) 백엔드 /login 호출
    const res  = await fetch('http://61.109.236.163:8000/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ encrypted_data })
    });
    const json = await res.json();
    console.log('👀 서버 응답:', res.status, json);

    if (!res.ok) {
      throw new Error(json.error || '로그인에 실패했습니다.');
    }

    // 6) 성공 알림 및 리다이렉트
    await Swal.fire({
      icon:  'success',
      title: '로그인 성공',
      text:  '환영합니다!',
    });
    // 로그인 후 홈으로 이동
    window.location.href = '../templates/index.html';

  } catch (err) {
    console.error('로그인 오류:', err);
    Swal.fire({
      icon:  'error',
      title: '오류',
      text:  err.message,
    });
  }
});
