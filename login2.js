// login.js
// (사전에 fernet-js 라이브러리 로드 필요)
// <script src="https://cdn.jsdelivr.net/npm/fernet@0.8.0/fernet.min.js"></script>

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();

  // 1) 폼 데이터
  const payload = {
    user_email:    document.getElementById('user-email').value,
    user_password: document.getElementById('password').value
  };

  // 2) Fernet 암호화
  const KEY    = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';
  const secret = new fernet.Secret(KEY);
  const token  = new fernet.Token({
    secret: secret,
    time:   Date.now() / 1000,
    iv:     fernet.generateIv()
  });
  const encrypted_data = token.encode(JSON.stringify(payload));
  console.log('🔐 로그인 암호문:', encrypted_data);

  try {
    // 3) /login 호출
    const res  = await fetch('http://61.109.236.163:8000/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ encrypted_data })
    });
    const json = await res.json();
    console.log('👀 서버 응답:', res.status, json);

    if (!res.ok) throw new Error(json.error || '로그인에 실패했습니다.');

    await Swal.fire({ icon: 'success', title: '로그인 성공' });
    window.location.href = '../templates/index.html';
  } catch (err) {
    console.error('로그인 오류:', err);
    Swal.fire({ icon: 'error', title: '오류', text: err.message });
  }
});
