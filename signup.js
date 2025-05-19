document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const userName = document.getElementById('user-name').value;
    const userEmail = document.getElementById('user-email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    // 비밀번호 일치 검증
    if (password !== passwordConfirm) {
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '비밀번호와 비밀번호 재확인이 일치하지 않습니다.',
        });
        return;
    }

    // 사용자 데이터
    const userData = {
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        user_password: password
    };

    // 암호화 키 (백엔드와 동일)
    const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

    try {
        // URL-safe Base64를 표준 Base64로 변환
        const toStandardBase64 = (str) => {
            return str.replace(/-/g, '+').replace(/_/g, '/');
        };

        // Base64 키 검증
        const isValidBase64 = (str) => {
            const base64Pattern = /^[A-Za-z0-9+\/\-_=]+$/;
            if (!base64Pattern.test(str)) {
                console.error('Base64 패턴 불일치:', str);
                return false;
            }
            try {
                const standardStr = toStandardBase64(str);
                const decoded = atob(standardStr);
                const reEncoded = btoa(decoded);
                return reEncoded === standardStr;
            } catch (e) {
                console.error('Base64 디코딩 실패:', e.message, '키:', str);
                return false;
            }
        };

        // 디버깅: 키 정보 출력
        console.log('ENCRYPTION_KEY:', ENCRYPTION_KEY);
        console.log('키 길이:', ENCRYPTION_KEY.length);
        console.log('표준 Base64 변환:', toStandardBase64(ENCRYPTION_KEY));

        if (!isValidBase64(ENCRYPTION_KEY)) {
            throw new Error('암호화 키가 유효한 Base64 형식이 아닙니다. 키를 확인해주세요.');
        }

        // JSON 직렬화
        const jsonStr = JSON.stringify(userData);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonStr);
        console.log('data 정의됨:', data.length, '바이트');

        // 키 준비 (Base64 디코딩)
        let keyData;
        try {
            const standardKey = toStandardBase64(ENCRYPTION_KEY);
            console.log('디코딩 시작:', standardKey);
            keyData = Uint8Array.from(atob(standardKey), c => c.charCodeAt(0));
            console.log('keyData 길이:', keyData.length);
        } catch (e) {
            throw new Error('Base64 키 디코딩 실패: ' + e.message);
        }

        if (keyData.length !== 32) {
            throw new Error(`암호화 키 길이가 32바이트가 아닙니다. (현재: ${keyData.length}바이트)`);
        }

        const encryptionKey = keyData.slice(0, 16); // AES-CBC 128비트 키
        const signingKey = keyData.slice(16, 32); // HMAC-SHA256 키
        console.log('encryptionKey 및 signingKey 정의됨');

        // AES-CBC 키 임포트
        const aesKey = await crypto.subtle.importKey(
            'raw',
            encryptionKey,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );
        console.log('aesKey 임포트 완료');

        // HMAC-SHA256 키 임포트
        const hmacKey = await crypto.subtle.importKey(
            'raw',
            signingKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        console.log('hmacKey 임포트 완료');

        // 초기화 벡터(IV) 생성
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // AES-CBC 암호화
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv: iv },
            aesKey,
            data
        );

        // Fernet 토큰 구성: 버전(1바이트) + 타임스탬프(8바이트) + IV(16바이트) + 암호문 + HMAC
        const version = new Uint8Array([0x80]); // Fernet 버전
        const timestamp = new Uint8Array(8);
        let ts = Math.floor(Date.now() / 1000);
        for (let i = 0; i < 8; i++) { // big-endian
            timestamp[i] = (ts >> (56 - i * 8)) & 0xff;
        }
        console.log('타임스탬프 생성 완료:', timestamp);

        // HMAC 계산을 위한 데이터
        const toSign = new Uint8Array([
            ...version,
            ...timestamp,
            ...iv,
            ...new Uint8Array(encrypted)
        ]);

        console.log('toSign 데이터:', Array.from(toSign));

        // HMAC-SHA256 서명
        const hmac = await crypto.subtle.sign(
            'HMAC',
            hmacKey,
            toSign
        );

        console.log('HMAC:', Array.from(new Uint8Array(hmac)));

        // 최종 Fernet 토큰
        const fernetToken = btoa(
            String.fromCharCode(
                ...version,
                ...timestamp,
                ...iv,
                ...new Uint8Array(encrypted),
                ...new Uint8Array(hmac)
            )
        );
        console.log('생성된 Fernet 토큰:', fernetToken);

        // 백엔드 API 호출
        const response = await fetch('http://61.109.236.163:8000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ encrypted_data: fernetToken })
            // 참고: Web Crypto API로 Fernet 구현. 백엔드와 토큰 호환성 테스트 필요.
            // CORS 에러 발생 시, 백엔드에서 Access-Control-Allow-Origin 설정 확인.
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '회원가입에 실패했습니다.');
        }

        // 성공 알림
        await Swal.fire({
            icon: 'success',
            title: '회원가입 완료',
            text: '회원가입을 완료했습니다.',
            confirmButtonText: '확인'
        });

        // 홈 화면으로 이동
        window.location.href = '../templates/index.html';
    } catch (error) {
        console.error('오류 상세:', error);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: error.message || '회원가입 중 오류가 발생했습니다.'
        });
    }
});
