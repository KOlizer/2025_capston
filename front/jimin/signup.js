// signup.js
// 회원가입 폼 제출 이벤트 핸들러

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const userName = document.getElementById('user-name').value;
    const userEmail = document.getElementById('user-email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    // 비밀번호 일치 검증
    if (password !== passwordConfirm) {
        return Swal.fire({ icon: 'error', title: '오류', text: '비밀번호와 비밀번호 재확인이 일치하지 않습니다.' });
    }

    // 사용자 데이터
    const userData = { user_id: userId, user_name: userName, user_email: userEmail, user_password: password };

    // 암호화 키 (백엔드와 동일한 URL-safe Base64)
    const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

    try {
        const toStandardBase64 = str => str.replace(/-/g, '+').replace(/_/g, '/');
        const isValidBase64 = str => {
            const pattern = /^[A-Za-z0-9+/=_-]+$/;
            try { return btoa(atob(toStandardBase64(str))) === toStandardBase64(str); } catch { return false; }
        };
        if (!isValidBase64(ENCRYPTION_KEY)) throw new Error('암호화 키가 유효한 Base64 형식이 아닙니다.');

        // JSON → UTF-8 bytes
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(userData));

        // 키 디코딩 및 분리
        const rawKey = toStandardBase64(ENCRYPTION_KEY);
        const keyData = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
        if (keyData.length !== 32) throw new Error(`키 길이 오류: ${keyData.length} 바이트`);

        // **핵심 수정**: Fernet key [signing(0:16) | encryption(16:32)] 순서
        const signingKey    = keyData.slice(0, 16);
        const encryptionKey = keyData.slice(16, 32);
        console.log('signingKey, encryptionKey:', signingKey, encryptionKey);

        // Web Crypto Key 임포트
        const aesKey  = await crypto.subtle.importKey('raw', encryptionKey, { name: 'AES-CBC' }, false, ['encrypt']);
        const hmacKey = await crypto.subtle.importKey('raw', signingKey,    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

        // IV 생성 및 암호화
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, aesKey, data);

        // Fernet header
        const version   = new Uint8Array([0x80]);
        const timestamp = new Uint8Array(8);
        let ts = Math.floor(Date.now()/1000);
        for (let i=7; i>=0; i--) { timestamp[i] = ts & 0xff; ts >>= 8; }

        // HMAC 대상
        const toSign = new Uint8Array([ ...version, ...timestamp, ...iv, ...new Uint8Array(encrypted) ]);
        const signature = await crypto.subtle.sign('HMAC', hmacKey, toSign);

        // raw Base64 생성
        const rawToken = btoa(String.fromCharCode(
            ...version, ...timestamp, ...iv,
            ...new Uint8Array(encrypted), ...new Uint8Array(signature)
        ));
        // URL-safe 인코딩
        const fernetToken = rawToken.replace(/\+/g,'-').replace(/\//g,'_');
        console.log('🔐 Fernet Token (URL-safe):', fernetToken);

        // 회원가입 요청
        const response = await fetch('http://61.109.236.163:8000/register', {
            method: 'POST', headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ encrypted_data: fernetToken })
        });
        const result = await response.json();
        console.log('👀 서버 응답:', response.status, result);

        if (!response.ok) throw new Error(result.error || JSON.stringify(result));
        await Swal.fire({ icon:'success', title:'회원가입 완료', text:'가입이 완료되었습니다.' });
        window.location.href='../templates/index.html';

    } catch (err) {
        console.error('오류 상세:', err);
        Swal.fire({ icon:'error', title:'오류', text:err.message });
    }
});
