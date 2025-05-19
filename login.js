
// 암호화 키 (SHA256용)
const ENCRYPTION_KEY = 'q5kq0nckcmfJsXvCx-P-nU3IOcT_odDndllXhcnyrY8=';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userEmail = document.getElementById('user-email').value;
    const password = document.getElementById('password').value;

    try {
        // 사용자 데이터 조회
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const hashedPassword = CryptoJS.SHA256(password + ENCRYPTION_KEY).toString();
        const user = users.find(u => u.user_email === userEmail && u.password === hashedPassword);

        if (!user) {
            throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        // 로그인 상태 저장
        localStorage.setItem('user_id', user.user_id);

        // 성공 알림
        await Swal.fire({
            icon: 'success',
            title: '로그인 성공',
            text: '로그인에 성공했습니다.',
            confirmButtonText: '확인',
        });

        // 홈 화면으로 이동
        window.location.href = '../templates/index.html';
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: error.message || '로그인 중 오류가 발생했습니다.',
        });
    }
});
