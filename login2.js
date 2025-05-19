// login.js

// DOM 이 로드된 후에 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) {
    console.error('login-form 이 존재하지 않습니다.');
    return;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // 1) 폼 데이터 수집
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
      // 3) 백엔드 /login 호출
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

      // 4) 성공 알림 및 리다이렉트
      await Swal.fire({ icon: 'success', title: '로그인 성공' });
      window.location.href = '../templates/index.html';
    } catch (err) {
      console.error('로그인 오류:', err);
      Swal.fire({ icon: 'error', title: '오류', text: err.message });
    }
  });
});
