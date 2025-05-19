// login.js
// 로그인 폼 제출 시 Fernet 암호화 후 /login 호출

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const password = document.getElementById('password').value;

    // 최소한의 페이로드
    const userData = {
        user_id:       userId,
        user_password: password
    };

    // 백엔드와 동일한 Base64 키
    const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

    try {
        // (1) URL-safe Base64 → 표준 Base64
        const toStandardBase64 = str => str.replace(/-/g, '+').replace(/_/g, '/');
        // (2) 간단한 Base64 유효성 검증
        const isValidBase64 = str => {
            try {
                const s = toStandardBase64(str);
                return btoa(atob(s)) === s;
            } catch {
                return false;
            }
        };
        if (!isValidBase64(ENCRYPTION_KEY)) {
            throw new Error('암호화 키가 올바르지 않습니다.');
        }

        // (3) JSON → UTF-8 바이트
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(userData));

        // (4) 키 디코딩
        const rawKey = toStandardBase64(ENCRYPTION_KEY);
        const keyData = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
        if (keyData.length !== 32) {
            throw new Error(`키 길이 오류: ${keyData.length} 바이트`);
        }
        const encryptionKey = keyData.slice(16); // AES용은 후반 16바이트
        const signingKey    = keyData.slice(0, 16); // HMAC용은 앞 16바이트

        // (5) Web Crypto Key 임포트
        const aesKey  = await crypto.subtle.importKey('raw', encryptionKey, { name: 'AES-CBC' }, false, ['encrypt']);
        const hmacKey = await crypto.subtle.importKey('raw', signingKey,    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

        // (6) IV 생성 + 암호화
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, aesKey, data);

        // (7) Fernet 스펙에 맞춰 토큰 구성
        const version   = new Uint8Array([0x80]);
        const timestamp = new Uint8Array(8);
        let ts = Math.floor(Date.now() / 1000);
        for (let i = 7; i >= 0; i--) {
            timestamp[i] = ts & 0xff;
            ts >>= 8;
        }
        const toSign = new Uint8Array([
            ...version,
            ...timestamp,
            ...iv,
            ...new Uint8Array(encrypted)
        ]);
        const hmac = await crypto.subtle.sign('HMAC', hmacKey, toSign);

        // (8) 표준 Base64로 인코딩 → URL-safe 변환
        const rawToken = btoa(
            String.fromCharCode(
                ...version,
                ...timestamp,
                ...iv,
                ...new Uint8Array(encrypted),
                ...new Uint8Array(hmac)
            )
        );
        const fernetToken = rawToken.replace(/\+/g, '-').replace(/\//g, '_');
        console.log('🔐 Fernet Token (URL-safe):', fernetToken);

        // (9) /login 호출
        const response = await fetch('http://61.109.236.163:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_data: fernetToken })
        });
        const result = await response.json();
        console.log('👀 로그인 응답:', response.status, result);

        if (!response.ok) {
            throw new Error(result.error || '로그인에 실패했습니다.');
        }

        // 로그인 성공 처리
        localStorage.setItem('user_id', userId);
        await Swal.fire({
            icon: 'success',
            title: '로그인 성공',
            text: '환영합니다!',
        });
        window.location.href = '../templates/index.html';

    } catch (err) {
        console.error('로그인 오류 상세:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: err.message || '로그인 중 오류가 발생했습니다.',
        });
    }
});
