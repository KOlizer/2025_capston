// login.js
// signup.js 와 동일한 WebCrypto + HMAC/AES-CBC 방식으로 "Fernet" 토큰 생성

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1) 폼 데이터 수집
  const payload = {
    user_email:    document.getElementById('user-email').value,
    user_password: document.getElementById('password').value
  };

  // 2) 암호화 키 (backend와 동일한 URL-safe Base64)
  const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

  try {
    // ─────────────── Base64 유효성 & 표준화 ───────────────
    const toStandardBase64 = str => str.replace(/-/g, '+').replace(/_/g, '/');
    const isValidBase64 = str => {
      const std = toStandardBase64(str);
      try { return btoa(atob(std)) === std; }
      catch { return false; }
    };
    if (!isValidBase64(ENCRYPTION_KEY)) {
      throw new Error('암호화 키가 유효한 Base64 형식이 아닙니다.');
    }

    // ─────────────── JSON → UTF-8 바이트 ───────────────
    const encoder = new TextEncoder();
    const data    = encoder.encode(JSON.stringify(payload));

    // ─────────── 키 디코딩 및 분리 (HMAC | AES) ──────────
    const rawKey = toStandardBase64(ENCRYPTION_KEY);
    const keyData = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
    if (keyData.length !== 32) {
      throw new Error(`키 길이 오류: ${keyData.length}바이트`);
    }
    const signingKey    = keyData.slice(0, 16);  // HMAC-SHA256 용
    const encryptionKey = keyData.slice(16, 32); // AES-CBC 용

    // ───────── Web Crypto Key 임포트 ─────────
    const aesKey  = await crypto.subtle.importKey('raw', encryptionKey,
                       { name: 'AES-CBC' }, false, ['encrypt']);
    const hmacKey = await crypto.subtle.importKey('raw', signingKey,
                       { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    // ─────────── IV 생성 & AES-CBC 암호화 ──────────
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv }, aesKey, data
    );

    // ──────────── Fernet 헤더 생성 ────────────
    const version = new Uint8Array([0x80]);
    const timestamp = new Uint8Array(8);
    let ts = Math.floor(Date.now() / 1000);
    for (let i = 7; i >= 0; i--) {
      timestamp[i] = ts & 0xff;
      ts >>= 8;
    }

    // ────────── HMAC 대상 바이트 배열 ──────────
    const toSign = new Uint8Array([
      ...version,
      ...timestamp,
      ...iv,
      ...new Uint8Array(encrypted)
    ]);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, toSign);

    // ────────── raw Base64 토큰 생성 ──────────
    const rawToken = btoa(String.fromCharCode(
      ...version,
      ...timestamp,
      ...iv,
      ...new Uint8Array(encrypted),
      ...new Uint8Array(signature)
    ));
    // URL-safe Base64로 변환
    const fernetToken = rawToken.replace(/\+/g, '-').replace(/\//g, '_');

    console.log('🔐 Login Fernet Token:', fernetToken);

    // ─────────── 로그인 API 호출 ────────────
    const response = await fetch('http://61.109.236.163:8000/login', {
      method:
