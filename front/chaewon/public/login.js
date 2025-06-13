document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        user_email: document.getElementById('user-email').value.trim(),
        user_password: document.getElementById('password').value.trim()
    };

    const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

    try {
        // Base64 유효성 & 표준화
        const toStandardBase64 = str => str.replace(/-/g, '+').replace(/_/g, '/');
        const isValidBase64 = str => {
            const std = toStandardBase64(str);
            try { return btoa(atob(std)) === std; }
            catch { return false; }
        };
        if (!isValidBase64(ENCRYPTION_KEY)) {
            throw new Error('암호화 키가 유효한 Base64 형식이 아닙니다.');
        }

        // JSON → UTF-8 바이트
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));

        // 키 디코딩 및 분리 (HMAC | AES)
        const rawKey = toStandardBase64(ENCRYPTION_KEY);
        const keyData = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
        if (keyData.length !== 32) {
            throw new Error(`키 길이 오류: ${keyData.length}바이트`);
        }
        const signingKey = keyData.slice(0, 16);  // HMAC-SHA256 용
        const encryptionKey = keyData.slice(16, 32); // AES-CBC 용

        // Web Crypto Key 임포트
        const aesKey = await crypto.subtle.importKey('raw', encryptionKey,
            { name: 'AES-CBC' }, false, ['encrypt']);
        const hmacKey = await crypto.subtle.importKey('raw', signingKey,
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

        // IV 생성 & AES-CBC 암호화
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv }, aesKey, data
        );

        // Fernet 헤더 생성
        const version = new Uint8Array([0x80]);
        const timestamp = new Uint8Array(8);
        let ts = Math.floor(Date.now() / 1000);
        for (let i = 7; i >= 0; i--) {
            timestamp[i] = ts & 0xff;
            ts >>= 8;
        }

        // HMAC 대상 바이트 배열
        const toSign = new Uint8Array([
            ...version,
            ...timestamp,
            ...iv,
            ...new Uint8Array(encrypted)
        ]);
        const signature = await crypto.subtle.sign('HMAC', hmacKey, toSign);

        // raw Base64 토큰 생성
        const rawToken = btoa(String.fromCharCode(
            ...version,
            ...timestamp,
            ...iv,
            ...new Uint8Array(encrypted),
            ...new Uint8Array(signature)
        ));
        const fernetToken = rawToken.replace(/\+/g, '-').replace(/\//g, '_');

        console.log('🔐 Login Fernet Token:', fernetToken);

        // 로그인 API 호출 (프록시 사용)
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_data: fernetToken }),
            credentials: 'include'
        });

        const result = await response.json();
        console.log('👀 /login response status:', response.status);
        console.log('👀 /login response data:', result);
        console.log('👀 /login response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            if (response.status === 400) {
                throw new Error(result.error || 'encrypted_data가 누락되었습니다.');
            } else if (response.status === 404) {
                throw new Error(result.error || '사용자가 존재하지 않습니다.');
            } else if (response.status === 401) {
                throw new Error(result.error || '비밀번호가 올바르지 않습니다.');
            }
            throw new Error('로그인 실패');
        }

        if (result.message !== '로그인 성공') {
            throw new Error('로그인 실패');
        }

        console.log('👀 Login result data:', result);

        // 백엔드에서 받은 데이터 검증
        if (!result.user_id || !result.user_email) {
            throw new Error('서버에서 사용자 정보를 받지 못했습니다.');
        }

        // 로컬 상태 저장 - 백엔드에서 받은 실제 데이터 사용
        localStorage.setItem('user_id', result.user_id);
        localStorage.setItem('user_email', result.user_email);
        localStorage.setItem('refresh_time', result.refresh_time || 0);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginTime', Date.now().toString());

        console.log('✅ 로그인 정보 저장 완료:', {
            user_id: result.user_id,
            user_email: result.user_email,
            refresh_time: result.refresh_time
        });

        await Swal.fire({
            icon: 'success',
            title: '로그인 성공',
            text: '환영합니다!'
        });
        window.location.href = '/index.html';

    } catch (err) {
        console.error('로그인 중 오류:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: err.message || '로그인에 실패했습니다.'
        });
    }
});
