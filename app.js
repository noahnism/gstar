(() => {
    // --- [Firebase Configuration] ---
    const firebaseConfig = {
        apiKey: "AIzaSyCGEc8bi3bzg404IasYJDfnUTHnmbuCg3s",
        authDomain: "gstar-4ca45.firebaseapp.com",
        projectId: "gstar-4ca45",
        storageBucket: "gstar-4ca45.firebasestorage.app",
        messagingSenderId: "384784496891",
        appId: "1:384784496891:web:9950ff06e22598f8bad85e",
        measurementId: "G-RG6G5VT085"
    };

    const APP_VERSION = "v3.1.6 (Build 0308)";
    console.log("%c 지트캠 Soccer Academy " + APP_VERSION + " 로드됨 ", "background: #7bc2b7; color: #000; font-weight: bold;");
    const CURRENT_THEME = {
        primary: "#7bc2b7",
        basicRed: "#f06958",
        premiumRed: "#9b111e", // 깊은 루비 레드
        gold: "#d4af37",
        black: "#0a0a0a"
    };

    // Firebase 초기화 (SDK가 존재할 때만)
    let db = null;
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log("Firebase Firestore Connected!");

            // [추가] 익명 인증을 통해 Firestore 읽기 권한 확보 (규칙 설정에 따라 필요함)
            firebase.auth().signInAnonymously()
                .then(() => console.log("Firebase Anonymous Auth Success"))
                .catch(err => {
                    console.error("Firebase Auth Error:", err);
                    alert("Firebase 인증 오류: " + err.message + "\n(콘솔에서 Anonymous Auth가 활성화되어 있는지 확인해 주세요.)");
                });

        } catch (err) {
            console.error("Firebase Init Error:", err);
        }
    }

    // === 상수 및 상태 관리 ===
    function getInitialUsers() {
        const today = new Date();
        const formatDate = (d) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${da}`;
        };

        const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
        const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(today.getDate() - 60);

        // 오늘 기준 D-7 (만료 임박 테스트용)
        const dMinus7 = new Date(today); dMinus7.setDate(today.getDate() + 7);
        // 오늘 기준 D-1 (당일/내일 만료 테스트용)
        const dMinus1 = new Date(today); dMinus1.setDate(today.getDate() + 1);
        // 이미 만료된 케이스
        const expired = new Date(today); expired.setDate(today.getDate() - 5);

        return [
            { id: 'admin', pw: 'admin', name: '관리자', role: 'admin', avatar: 'fa-user-shield' }
        ];
    }

    let usersData = [];
    try {
        const saved = localStorage.getItem('soccer_users');
        if (saved) {
            usersData = JSON.parse(saved);
            // 기존 더미 데이터(ID 1~5)가 있다면 자동 삭제 처리
            const dummyIds = ['1', '2', '3', '4', '5'];
            const initialCount = usersData.length;
            usersData = usersData.filter(u => !dummyIds.includes(u.id));
            if (usersData.length !== initialCount) {
                localStorage.setItem('soccer_users', JSON.stringify(usersData));
                console.log("Dummy members cleaned up.");
            }
        } else {
            usersData = getInitialUsers();
            localStorage.setItem('soccer_users', JSON.stringify(usersData));
        }
    } catch (e) {
        console.error("LocalStorage access failed", e);
        usersData = getInitialUsers();
    }

    let postsData = [];
    try {
        const savedPosts = localStorage.getItem('soccer_posts');
        postsData = savedPosts ? JSON.parse(savedPosts) : [
            /* 기본 샘플 포스트 데이터 (최초 접속 시 확인용) */
            { id: 101, authorId: '1', content: '오늘 A반 패스 훈련 미쳤어! 💪', date: '2024.11.20', media: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=400' },
            { id: 102, authorId: '3', content: '주말 풋살장 같이 뛸 팀 모집합니다 ⚽', date: '2024.11.18', media: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=400' },
            { id: 103, authorId: '2', content: '나이키 신상 축구화 언박싱 🥾 (쇼츠영상)', date: '2024.11.15', media: 'https://images.unsplash.com/photo-1505550796333-d8a4e1044458?auto=format&fit=crop&w=400', isVideo: true }
        ];
    } catch (e) {
        console.error("Posts loading failed", e);
    }

    let schedulesData = [];
    try {
        const savedSchedules = localStorage.getItem('soccer_schedules');
        schedulesData = savedSchedules ? JSON.parse(savedSchedules) : [
            { id: 1, date: '2024-11-20', time: '19:00 - 21:00', title: 'A반 드리블 스킬 집중 훈련', location: '1호 메인 구장' },
            { id: 2, date: '2024-11-23', time: '10:00 - 13:00', title: '주말 친선전 (vs 블루윙즈)', location: '수원 블루윙즈 연습구장' }
        ];
    } catch (e) { }

    const state = {
        isLoggedIn: false,
        currentUser: null,
        activeTab: 'profile',
        scheduleMode: 'day', // 'day' or 'month'
        selectedDate: new Date().toISOString().split('T')[0], // 추가: 선택된 날짜 (기본 오늘)
        users: usersData,
        posts: postsData,
        schedules: schedulesData,
        columns: [
            { id: 1001, isHot: true, label: '추천 칼럼', labelIcon: 'fa-star', title: '프로 선수들의 식단 관리 노하우', desc: '시합 전 최상의 컨디션을 유지하기 위해 어떤 음식을 먹어야 할까요? 전문 뉴트리셔니스트의 인터뷰를 확인하세요.', thumb: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80', time: '5분 소요' },
            { id: 1002, isHot: false, label: '스킬 가이드', labelIcon: 'fa-futbol', title: '볼 컨트롤의 기본: 퍼스트 터치', desc: '수비수를 따돌리는 가장 첫 번째 스킬, 완벽한 첫 터치를 위한 3가지 연습 방법 소개.', thumb: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80', time: '3분 소요' },
            { id: 1003, isHot: false, label: '축구 AI 뉴스', labelIcon: 'fa-robot', title: '[오늘의 소식] 유럽 리그 최신 이적 루머 통계 분석', desc: 'AI가 수집한 해외 최상위 리그별 주요 선수들의 이적장 데이터를 바탕으로 지트캠프 회원들에게 가장 필요한 뉴스를 요약해 드립니다.', thumb: 'https://images.unsplash.com/photo-1504450758481-7338ba7524a7?auto=format&fit=crop&w=800&q=80', time: '1분 소요' }
        ],
        notifications: [],
        messages: [], // 테스트용: 채팅 데이터
        following: ['1', '2'], // 기본 팔로잉 명단
        followers: ['1', '3'], // 기본 팔로잉 명단
        viewingUserId: null // 현재 보고 있는 프로필 ID (null이면 내 프로필)
    };

    // === 전역 함수: 로컬 스토리지에 state 저장 ===
    window.saveState = () => {
        try {
            // 알림, 메시지, 팔로잉 등 상태 보존
            localStorage.setItem('soccer_social_data', JSON.stringify({
                notifications: state.notifications,
                messages: state.messages,
                following: state.following,
                followers: state.followers
            }));
        } catch (e) { }
    };

    // === DOM 요소 ===
    const splash = document.getElementById('splash-screen');
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const adminView = document.getElementById('admin-view');
    const mainNav = document.getElementById('main-nav');
    const tabContent = document.getElementById('tab-content');
    const viewTitle = document.getElementById('view-title');
    const progressBar = document.querySelector('.progress');

    // === 초기화 로직 ===
    function init() {
        console.log("App initializing with Firebase compatibility...");

        // 스플래시 애니메이션
        if (progressBar) {
            setTimeout(() => { progressBar.style.width = '100%'; }, 50);
        }

        // 실시간 데이터 리스너 설정 (Firebase가 연결된 경우)
        if (db) {
            // 1. 유저 데이터 실시간 동기화
            db.collection("users").onSnapshot((snapshot) => {
                const updatedUsers = [];
                snapshot.forEach(doc => updatedUsers.push(doc.data()));
                if (updatedUsers.length > 0) {
                    state.users = updatedUsers;
                    localStorage.setItem('soccer_users', JSON.stringify(state.users));
                    console.log(`Synced ${state.users.length} users from Firebase.`);

                    // 현재 접속한 로그인 유저(currentUser) 정보도 실시간 동기화
                    if (state.currentUser && state.currentUser.id !== 'admin') {
                        const syncedMe = state.users.find(u => u.id === state.currentUser.id);
                        if (syncedMe) {
                            state.currentUser = syncedMe;
                            localStorage.setItem('soccer_session', JSON.stringify(state.currentUser));
                        }
                    }

                    // 상태가 업데이트되면 현재 보고 있는 관리자 뷰(회원 목록)를 갱신
                    if (adminView && !adminView.classList.contains('hidden')) {
                        if (window.renderAdminTab) window.renderAdminTab('admin-users');
                    } else if (appView && !appView.classList.contains('hidden') && state.activeTab === 'profile') {
                        // 현재 내 프로필 화면을 보고 있다면 갱신
                        if (!state.viewingUserId || state.viewingUserId === state.currentUser.id) renderTab('profile');
                    }
                }
            }, (error) => {
                console.error("Users Snapshot Error:", error);
                // 모바일에서 권한 문제 등이 생길 경우 시각적으로 알림
                if (error.code === 'permission-denied') {
                    console.warn("Firestore access denied. Please check security rules.");
                    alert("서버 데이터 접근 거부: Firestore 보안 규칙을 확인해 주세요.\n(Anonymous 유저의 읽기 권한이 필요합니다.)");
                }
            });

            // 2. 포스트 데이터 실시간 동기화
            db.collection("posts").orderBy("id", "desc").onSnapshot((snapshot) => {
                const updatedPosts = [];
                snapshot.forEach(doc => updatedPosts.push(doc.data()));
                if (updatedPosts.length > 0) {
                    state.posts = updatedPosts;
                    localStorage.setItem('soccer_posts', JSON.stringify(state.posts));
                    if (state.activeTab === 'social') renderTab('social');
                }
            });

            // 3. 스케줄 데이터 실시간 동기화
            db.collection("schedules").onSnapshot((snapshot) => {
                const updatedSchedules = [];
                snapshot.forEach(doc => updatedSchedules.push(doc.data()));
                if (updatedSchedules.length > 0) {
                    state.schedules = updatedSchedules;
                    localStorage.setItem('soccer_schedules', JSON.stringify(state.schedules));
                    if (state.activeTab === 'academy' || state.activeTab === 'schedule') renderTab('academy');
                }
            });

            // [수정] 데이터 동기화 강화: 로컬에만 있는 사용자 정보를 백그라운드에서 Firebase로 자동 업로드
            db.collection("users").get().then(snap => {
                const firebaseUserIds = new Set();
                snap.forEach(doc => firebaseUserIds.add(doc.id));

                state.users.forEach(u => {
                    if (!firebaseUserIds.has(u.id)) {
                        console.log(`Syncing missing user to Firebase: ${u.name} (${u.id})`);
                        db.collection("users").doc(u.id).set(u).catch(e => console.error(e));
                    }
                });
            });
            db.collection("posts").get().then(snap => {
                if (snap.empty && state.posts.length > 0) {
                    console.log("Migrating posts to Firebase...");
                    state.posts.forEach(p => db.collection("posts").doc(p.id.toString()).set(p));
                }
            });
            db.collection("schedules").get().then(snap => {
                if (snap.empty && state.schedules.length > 0) {
                    console.log("Migrating schedules to Firebase...");
                    state.schedules.forEach(s => db.collection("schedules").doc(s.id.toString()).set(s));
                }
            });
        }

        // 1.5초 후 메인 화면으로 전환
        setTimeout(() => {
            hideSplashAndStart();
        }, 1500);
    }

    function hideSplashAndStart() {
        if (splash) splash.classList.add('hidden');
        checkAuth();
    }

    function checkAuth() {
        // [수정] 모바일/새 탭 동기화를 위해 URL 파라미터가 있으면 우선 처리 (선택사항, 필요 없을 경우 생략 가능하나 안정성을 위해 추가)
        const urlParams = new URLSearchParams(window.location.search);
        const forceAdmin = urlParams.get('mode') === 'admin';

        let savedUser = null;
        try {
            savedUser = localStorage.getItem('soccer_session');
        } catch (e) { }

        if (savedUser || forceAdmin) {
            try {
                let parsedUser = savedUser ? JSON.parse(savedUser) : null;
                if (forceAdmin && !parsedUser) {
                    parsedUser = { id: 'admin', name: '최고관리자', role: 'admin' };
                }

                state.isLoggedIn = true;
                state.currentUser = parsedUser;

                // --- [관리자 분기] ---
                if (parsedUser && (parsedUser.id === 'admin' || parsedUser.role === 'admin')) {
                    if (authView) authView.classList.add('hidden');
                    if (appView) appView.classList.add('hidden');
                    if (adminView) adminView.classList.remove('hidden');
                    if (window.renderAdminTab) window.renderAdminTab('admin-users');
                } else {
                    if (authView) authView.classList.add('hidden');
                    if (adminView) adminView.classList.add('hidden');
                    showApp();
                }
            } catch (e) {
                if (authView) authView.classList.remove('hidden');
            }
        } else {
            if (authView) authView.classList.remove('hidden');
        }
    }

    // === DOM 요소 추가 ===
    const loginFormArea = document.getElementById('login-form-area');
    const signupFormArea = document.getElementById('signup-form-area');
    const goSignupBtn = document.getElementById('go-signup');
    const goLoginBtn = document.getElementById('go-login');
    const signupBtn = document.getElementById('btn-signup');

    // === 인증/회원가입 화면 전환 ===
    if (goSignupBtn) {
        goSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormArea) loginFormArea.classList.add('hidden');
            if (signupFormArea) signupFormArea.classList.remove('hidden');
        });
    }

    if (goLoginBtn) {
        goLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupFormArea) signupFormArea.classList.add('hidden');
            if (loginFormArea) loginFormArea.classList.remove('hidden');
        });
    }

    // --- 멤버십 선택 시 기간 자동 연동 ---
    const signupMembership = document.getElementById('signup-membership');
    const signupDuration = document.getElementById('signup-duration');
    if (signupMembership && signupDuration) {
        signupMembership.addEventListener('change', () => {
            const level = signupMembership.value;
            let duration = "1";
            if (level === 'semi') duration = "3";
            else if (level === 'pro' || level === 'player') duration = "6";
            else if (level === 'ultimate' || level === 'vip') duration = "12";

            signupDuration.value = duration;
        });
    }

    // === 회원가입 처리 로직 ===
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const name = document.getElementById('signup-name').value.trim();
            const id = document.getElementById('signup-id').value.trim();
            const pw = document.getElementById('signup-pw').value.trim();
            const pwConfirm = document.getElementById('signup-pw-confirm').value.trim();

            if (!name || !id || !pw) return alert('모든 정보를 입력해 주세요.');
            if (pw !== pwConfirm) return alert('비밀번호가 일치하지 않습니다.');

            // 기존 회원 아이디 중복 검사
            if (state.users.find(u => u.id === id)) {
                return alert('이미 존재하는 아이디입니다.');
            }

            // 새 회원 등록
            const membership = document.getElementById('signup-membership').value || 'Basic';
            const duration = document.getElementById('signup-duration').value || '1';

            const newUser = {
                id,
                pw,
                name,
                role: membership,
                duration: duration,
                joinDate: new Date().toLocaleDateString(),
                membershipStart: new Date().toISOString().split('T')[0]
            };

            // 만료일 초기 계산 (글로벌 함수 호출)
            if (window.recalculateMembershipEnd) {
                window.recalculateMembershipEnd(newUser);
            }
            state.users.push(newUser);

            // Firebase 저장 (서버 연동)
            if (db) {
                db.collection("users").doc(id).set(newUser).then(() => {
                    console.log("User saved to Firebase");
                }).catch(e => console.error("Firebase Save Error:", e));
            }

            try {
                localStorage.setItem('soccer_users', JSON.stringify(state.users));
                alert(`${name}님, 가입을 환영합니다!\n로그인 화면으로 이동합니다.`);
                // 폼 리셋 및 로그인 화면 전환
                document.getElementById('signup-name').value = '';
                document.getElementById('signup-id').value = '';
                document.getElementById('signup-pw').value = '';
                document.getElementById('signup-pw-confirm').value = '';

                signupFormArea.classList.add('hidden');
                loginFormArea.classList.remove('hidden');
            } catch (e) {
                alert('가입 처리 중 오류가 발생했습니다.');
            }
        });
    }

    // === 로그아웃 로직 (관리자 뷰에서도 사용될 수 있도록 일반화) ===
    window.handleLogout = () => {
        if (!confirm('로그아웃 하시겠습니까?')) return;
        localStorage.removeItem('soccer_session');
        state.currentUser = null;
        state.isLoggedIn = false;

        // 일반 뷰 가리기
        if (appView) appView.classList.add('hidden');
        if (mainNav) mainNav.classList.add('hidden');

        // 관리자 뷰 가리기
        if (adminView) adminView.classList.add('hidden');

        // URL 파라미터 날리기 (관리자 모드 리셋용)
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
        }

        // 로그인 뷰 표시
        if (authView) authView.classList.remove('hidden');

        // 플로팅 메신저 버튼 비활성화
        const fab = document.getElementById('messenger-fab');
        if (fab) fab.classList.add('hidden');
    };

    // === 로그인 로직 (강화됨) ===
    window.login = () => {
        const idInput = document.getElementById('login-id');
        const pwInput = document.getElementById('login-pw');
        const id = idInput ? idInput.value.trim() : '';
        const pw = pwInput ? pwInput.value.trim() : '';

        if (!id || !pw) return alert('아이디와 비밀번호를 모두 입력하세요.');

        // --- [관리자 분기] ---
        if (id.toLowerCase() === 'admin' && pw === 'admin123') { // 관리자 비밀번호 임시 조건
            state.currentUser = { id: 'admin', name: '최고관리자', role: 'admin' };
            state.isLoggedIn = true;
            try {
                localStorage.setItem('soccer_session', JSON.stringify(state.currentUser));
            } catch (e) { console.error("LocalStorage save failed", e); }

            if (authView) authView.classList.add('hidden');
            if (appView) appView.classList.add('hidden');
            if (adminView) adminView.classList.remove('hidden');

            // 모바일 새로고침 방어를 위한 파라미터 추가
            if (window.history.replaceState) {
                window.history.replaceState(null, null, "?mode=admin");
            }

            if (window.renderAdminTab) window.renderAdminTab('admin-users');
            return;
        }

        // 일반 회원 검색
        const user = state.users.find(u => u.id === id);

        if (!user) {
            return alert('등록되지 않은 아이디입니다. 먼저 회원가입을 진행해 주세요.');
        }

        // 비밀번호 일치 확인
        if (user.pw !== pw) {
            return alert('비밀번호가 일치하지 않습니다.');
        }

        // 로그인 성공 처리
        try {
            localStorage.setItem('soccer_session', JSON.stringify(user));
        } catch (e) { }

        state.currentUser = user;
        state.isLoggedIn = true;

        if (authView) authView.classList.add('hidden');
        if (adminView) adminView.classList.add('hidden');

        // 관리자 파라미터 초기화
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
        }

        showApp();
    };

    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', window.login);
    }

    // === 앱 메인 로직 ===
    function showApp() {
        if (appView) appView.classList.remove('hidden');
        if (mainNav) mainNav.classList.remove('hidden');

        // 플로팅 메신저 버튼 활성화
        const fab = document.getElementById('messenger-fab');
        if (fab) {
            fab.classList.remove('hidden');
            fab.onclick = () => alert('운영자 1:1 채팅 화면으로 연결됩니다. (추후 업데이트)');
        }

        renderTab(state.activeTab);
    }

    window.renderTab = renderTab;
    window.setScheduleMode = (mode) => {
        state.scheduleMode = mode;
        renderTab('academy');
    };

    window.selectScheduleDate = (date) => {
        state.selectedDate = date;
        renderTab('academy');
    };

    function renderTab(tabId) {
        state.activeTab = tabId;

        // 내비게이션 활성화 표시
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // 타이틀 변경
        const titles = {
            notice: '운영 게시판',
            academy: '수업운영 정보',
            schedule: '스케줄 목록',
            profile: '나의 G-STAR',
            column: '매거진 & 정보',
            social: '소셜 갤러리'
        };
        if (viewTitle) viewTitle.innerText = titles[tabId] || '축구교실';

        // 콘텐츠 렌더링
        let html = '';
        switch (tabId) {
            case 'notice':
                const notices = state.posts.filter(p => p.type === 'notice' || p.isPriority);
                if (notices.length === 0) {
                    html = `
                        <div style="text-align: center; padding: 60px 20px; color: var(--text-gray);">
                            <i class="fas fa-bullhorn" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.2;"></i>
                            <p>등록된 공지사항이 없습니다.</p>
                        </div>
                    `;
                } else {
                    html = notices.map(n => {
                        const isPriority = n.isPriority;
                        const tagColor = isPriority ? 'var(--secondary)' : 'var(--primary)';
                        const tagName = isPriority ? '필독' : (n.category || '공지');
                        return `
                            <div class="card notice fade-in" style="${isPriority ? 'border-left: 5px solid var(--secondary); background: rgba(212, 175, 55, 0.05);' : ''}">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                    <span class="tag" style="background:${tagColor}; color:#000; font-weight:800; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;">${tagName}</span>
                                    <span style="font-size: 0.75rem; color: var(--text-gray);">${n.date || '방금 전'}</span>
                                </div>
                                <h4 style="font-size: 1.15rem; color: var(--text-white); margin-bottom: 10px; line-height: 1.4;">${n.content.split('\n')[0]}</h4>
                                <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.6;">${n.content.split('\n').slice(1).join('<br>') || n.content}</p>
                                <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #000; font-size: 0.7rem;">
                                        <i class="fas fa-user-shield"></i>
                                    </div>
                                    <span style="font-size: 0.8rem; color: var(--text-gray); font-weight: 600;">G-STAR 운영팀</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                break;
            case 'academy':
            case 'schedule':
                const isMonth = state.scheduleMode === 'month';
                const todayStr = new Date().toISOString().split('T')[0];
                const selectedDateStr = state.selectedDate || todayStr;

                // --- 캘린더 생성 로직 (현재 월 기준) ---
                const now = new Date();
                const calendarYear = now.getFullYear();
                const calendarMonth = now.getMonth();
                const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 0(일) ~ 6(토)
                const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();

                const calendarDays = [];
                for (let i = 1; i <= lastDate; i++) {
                    const dateVal = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    const hasEvent = state.schedules.some(s => s.date === dateVal);
                    const isSelected = selectedDateStr === dateVal;
                    const isRealToday = todayStr === dateVal;

                    calendarDays.push(`
                        <div onclick="window.selectScheduleDate('${dateVal}')" 
                             style="aspect-ratio: 1; border: 1px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; 
                                    border-radius: 12px; display: flex; flex-direction: column; justify-content: center; 
                                    align-items: center; position: relative; cursor: pointer; 
                                    background: ${isSelected ? 'rgba(0,210,255,0.15)' : 'transparent'}; 
                                    transition: 0.2s; ${isRealToday ? 'box-shadow: inset 0 0 10px rgba(0,210,255,0.2);' : ''}">
                            <span style="font-size: 0.95rem; font-weight: ${isSelected || isRealToday ? '800' : '500'}; 
                                         color: ${isRealToday ? 'var(--primary)' : (isSelected ? 'white' : 'var(--text-gray)')};">${i}</span>
                            ${hasEvent ? '<div style="width: 4px; height: 4px; background: var(--accent-gold); border-radius: 50%; position: absolute; bottom: 6px; box-shadow: 0 0 5px var(--accent-gold);"></div>' : ''}
                        </div>
                    `);
                }

                // 선택된 날짜의 일정 필터링
                const filteredSchedules = state.schedules.filter(s => s.date === selectedDateStr);

                html = `
                    <div class="schedule-filter fade-in" style="display: flex; gap: 10px; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 15px;">
                        <button class="btn-check" onclick="setScheduleMode('day')" style="${!isMonth ? 'background: var(--primary); color: #000; font-weight: 700;' : 'background: transparent; color: var(--text-gray); border:none;'} flex: 1; padding: 12px; border-radius: 12px;">주간(Weekly)</button>
                        <button class="btn-check" onclick="setScheduleMode('month')" style="${isMonth ? 'background: var(--primary); color: #000; font-weight: 700;' : 'background: transparent; color: var(--text-gray); border:none;'} flex: 1; padding: 12px; border-radius: 12px;">월간(Monthly)</button>
                    </div>
                    
                    ${!isMonth ? `
                        <h4 class="section-title fade-in" style="font-size: 1.1rem; color: var(--text-white); margin-bottom: 15px;">전체 훈련 일정 목록</h4>
                        <div class="schedule-list fade-in">
                            ${state.schedules.length > 0 ? state.schedules.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map((s, idx) => `
                                <div class="schedule-item" style="border-left: 3px solid ${new Date(s.date) >= new Date(todayStr) ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}; background: rgba(30, 41, 59, 0.4); margin-bottom: 12px; padding: 18px; border-radius: 15px;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                        <div class="day" style="font-weight: 800; color: ${new Date(s.date) >= new Date(todayStr) ? 'var(--primary)' : 'var(--text-gray)'}; font-size: 1rem;">${s.date}</div>
                                        <span style="font-size: 0.75rem; background: ${new Date(s.date) >= new Date(todayStr) ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.05)'}; color: ${new Date(s.date) >= new Date(todayStr) ? 'var(--primary)' : '#666'}; padding:3px 8px; border-radius:10px;">
                                            ${new Date(s.date) < new Date(todayStr) ? '종료됨' : '예정'}
                                        </span>
                                    </div>
                                    <div class="info">
                                        <strong style="font-size: 1.1rem; color: var(--text-white); display:block; margin-bottom: 8px;">${s.title}</strong>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                            <span style="color:var(--text-gray); font-size: 0.85rem;"><i class="fas fa-clock" style="margin-right:5px; color:var(--primary);"></i> ${s.time}</span>
                                            <span style="color:var(--text-gray); font-size: 0.85rem;"><i class="fas fa-map-marker-alt" style="margin-right:5px; color:var(--primary);"></i> ${s.location}</span>
                                        </div>
                                        ${s.description ? `<p style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #cbd5e1; font-size: 0.85rem; line-height: 1.5;">${s.description}</p>` : ''}
                                    </div>
                                </div>
                            `).join('') : '<p style="color:var(--text-gray); text-align:center; padding: 40px;">훈련 일정이 아직 없습니다.</p>'}
                        </div>
                    ` : `
                        <div class="fade-in" style="background: rgba(20, 25, 35, 0.6); border: 1px solid var(--border-glass); border-radius: 20px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                            <h4 style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: var(--text-white);">
                                <span style="font-size: 1.2rem; font-weight: 800;">${calendarYear}년 ${calendarMonth + 1}월</span>
                                <div style="display: flex; gap: 15px;">
                                    <i class="fas fa-chevron-left" style="color: var(--text-gray); cursor: pointer;"></i>
                                    <i class="fas fa-chevron-right" style="color: var(--text-gray); cursor: pointer;"></i>
                                </div>
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; margin-bottom: 12px; font-size: 0.8rem; font-weight: 700; color: var(--text-gray);">
                                <div style="color: #ff3b30;">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div style="color: var(--primary);">토</div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                                ${Array(firstDay).fill('<div style="aspect-ratio: 1;"></div>').join('')}
                                ${calendarDays.join('')}
                            </div>
                        </div>

                        <div class="fade-in" style="margin-top: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h5 style="color: var(--text-white); font-size: 1.1rem; font-weight: 700;">
                                    <span style="color: var(--primary);">${selectedDateStr.split('-')[2]}일</span>의 일정
                                </h5>
                                <span style="font-size: 0.8rem; color: var(--text-gray);">${filteredSchedules.length}건 검색됨</span>
                            </div>
                            
                            ${filteredSchedules.length > 0 ? filteredSchedules.map(s => `
                                <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(0,210,255,0.2); padding: 18px; border-radius: 15px; margin-bottom: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <span style="font-size: 0.75rem; color: var(--primary); font-weight: 700; background: rgba(0,210,255,0.1); padding: 3px 8px; border-radius: 8px;">${s.time}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-gray);"><i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i>${s.location}</span>
                                    </div>
                                    <h4 style="font-size: 1.1rem; color: var(--text-white); margin-bottom: 8px;">${s.title}</h4>
                                    ${s.description ? `<p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 5px;">${s.description}</p>` : ''}
                                </div>
                            `).join('') : `
                                <div style="text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 15px; border: 1px dashed rgba(255,255,255,0.1);">
                                    <i class="fas fa-calendar-times" style="font-size: 2rem; color: rgba(255,255,255,0.1); margin-bottom: 10px;"></i>
                                    <p style="color: var(--text-gray); font-size: 0.9rem;">해당 날짜에 예정된 일정이 없습니다.</p>
                                </div>
                            `}
                        </div>
                    `}
                `;
                break;
            case 'profile':
                // 미니 블로그 형태 프로필
                html = `
                    <div class="profile-header fade-in" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), transparent); padding: 25px 20px; border-radius: 20px; margin-bottom: 20px; position: relative;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; flex-direction: column; align-items: center; width: 40%;">
                                <div style="position: relative; width: 75px; height: 75px; margin-bottom: 10px;">
                                    <div class="user-avatar" style="width: 100%; height: 100%; border-color: var(--primary); border-width: 3px; font-size: 2.5rem; color: var(--text-white); display:flex; justify-content:center; align-items:center; overflow:hidden; background-color: var(--glass-bg);">
                                        ${state.currentUser && state.currentUser.avatar ? `<img src="${state.currentUser.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user-astronaut"></i>`}
                                    </div>
                                    <input type="file" id="profile-upload-input" accept="image/*" style="display: none;" onchange="window.handleProfileUpload(event)">
                                    <button onclick="document.getElementById('profile-upload-input').click()" style="position: absolute; bottom: -5px; right: -5px; width: 28px; height: 28px; border-radius: 50%; background: var(--primary); border:none; box-shadow: 0 4px 10px rgba(0,0,0,0.5); cursor:pointer;"><i class="fas fa-camera" style="color:#000; font-size:0.8rem;"></i></button>
                                </div>
                                <h3 style="font-size: 1.25rem; letter-spacing: -1px; margin-bottom: 2px; color: var(--text-white);">${state.currentUser ? state.currentUser.name : '회원님'}</h3>
                                <p style="color: var(--secondary); font-size: 0.75rem; font-weight: 700;">G-STAR 멤버십</p>
                            </div>
                            
                            <div style="width: 60%; height: 190px; position: relative; display: flex; justify-content: center; align-items: center; margin-left: 5px;">
                                <canvas id="myStatChart"></canvas>
                            </div>
                        </div>
                        
                        <div class="user-stats" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); display:flex; justify-content: space-around;">
                            <div class="stat"><strong style="font-size:1.3rem; color: var(--text-white);">12</strong><span style="font-size:0.75rem;">참여수업</span></div>
                            <div class="stat"><strong style="font-size:1.3rem; color: var(--text-white);">24</strong><span style="font-size:0.75rem;">연결 팀원</span></div>
                        </div>
                    </div>

                    <div class="active-class-section fade-in" style="margin-bottom: 20px; background: rgba(20, 30, 48, 0.6); border: 1px solid rgba(0, 210, 255, 0.2); border-left: 4px solid var(--primary); border-radius: 15px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div>
                                <span style="font-size: 0.75rem; color: var(--primary); font-weight: 700; background: rgba(0,210,255,0.1); padding: 3px 8px; border-radius: 10px; margin-bottom: 5px; display: inline-block;">현재 진행중</span>
                                <h4 style="font-size: 1.05rem; color: var(--text-white); margin: 0;">A반 드리블 스킬 집중 훈련</h4>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-gray);">19:00 - 21:00</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-gray); margin-bottom: 15px;"><i class="fas fa-map-marker-alt" style="margin-right: 5px; color: var(--accent-gold);"></i>제 1 풋살 파크 구장</p>
                        
                        <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
                            <span style="font-size: 0.8rem; color: var(--text-gray); margin-bottom: 8px; display: block;">함께 참여 중인 팀원 (4명)</span>
                            <div style="display: flex; align-items: center;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(20, 30, 48, 1); margin-left: 0; z-index: 5; background: var(--glass-bg); display: flex; justify-content: center; align-items: center; color: var(--primary); font-size: 0.9rem;">
                                    <i class="fas fa-user-ninja"></i>
                                </div>
                                <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(20, 30, 48, 1); margin-left: -10px; z-index: 4; background: var(--glass-bg); display: flex; justify-content: center; align-items: center; color: var(--primary); font-size: 0.9rem;">
                                    <i class="fas fa-user-secret"></i>
                                </div>
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #000; border: 2px solid rgba(20, 30, 48, 1); display: flex; justify-content: center; align-items: center; font-size: 0.75rem; font-weight: 700; z-index: 3; margin-left: -10px;">
                                    +2
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 획득 뱃지 섹션 -->
                    <div class="badges-section fade-in" style="margin-bottom: 20px; background: rgba(20, 30, 48, 0.6); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 15px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h4 style="font-size: 0.95rem; color: var(--text-white); margin: 0;"><i class="fas fa-medal" style="color: var(--accent-gold); margin-right: 6px;"></i>획득 뱃지 콜렉션</h4>
                            <span style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">총 3개</span>
                        </div>
                        <div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 5px;">
                            <div style="min-width: 70px; text-align: center;">
                                <div style="width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #ffd700, #b8860b); margin: 0 auto 8px; display: flex; justify-content: center; align-items: center; font-size: 1.6rem; color: #000; box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);">
                                    <i class="fas fa-fire"></i>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-white); font-weight: 600;">개근왕</span>
                            </div>
                            <div style="min-width: 70px; text-align: center;">
                                <div style="width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #00d2ff, #3a7bd5); margin: 0 auto 8px; display: flex; justify-content: center; align-items: center; font-size: 1.6rem; color: #fff; box-shadow: 0 5px 15px rgba(0, 210, 255, 0.3);">
                                    <i class="fas fa-tachometer-alt"></i>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-white); font-weight: 600;">스프린터</span>
                            </div>
                            <div style="min-width: 70px; text-align: center;">
                                <div style="width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #c0c0c0, #808080); margin: 0 auto 8px; display: flex; justify-content: center; align-items: center; font-size: 1.6rem; color: #fff;">
                                    <i class="fas fa-shoe-prints"></i>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-white); font-weight: 600;">패스 마스터</span>
                            </div>
                        </div>
                    </div>
                    <div class="menu-list fade-in" style="margin-top: 20px;">
                        <div class="menu-item" onclick="showTrainingLog()"><i class="fas fa-history" style="color: var(--primary);"></i> 내 훈련 일지 보기 <i class="fas fa-chevron-right"></i></div>
                        <div class="menu-item" onclick="showFriends('following')"><i class="fas fa-users" style="color: var(--text-white);"></i> 연결된 친구 관리 <i class="fas fa-chevron-right"></i></div>
                        <div class="menu-item" onclick="logout()"><i class="fas fa-sign-out-alt" style="color: #ff3b30;"></i> 로그아웃 <i class="fas fa-chevron-right"></i></div>
                    </div>
                    
                    <h4 class="section-title" style="margin-top: 30px; margin-bottom: 15px;">나의 소식 & 갤러리</h4>
                    
                    <!-- 업로드 입력 폼 -->
                    <div style="background: rgba(20, 25, 35, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                        <textarea id="post-input" placeholder="새로운 훈련 소식이나 사진을 기록하세요..." style="width: 100%; background: transparent; border: none; color: var(--text-white); font-family: 'Pretendard', sans-serif; resize: none; min-height: 50px; outline: none; font-size: 0.95rem;"></textarea>
                        
                        <!-- 선택된 이미지 미리보기 (기본 숨김) -->
                        <div id="post-image-preview" style="display: none; position: relative; width: 60px; height: 60px; margin-top: 10px; border-radius: 8px; overflow: hidden;">
                            <img id="preview-img" src="" style="width: 100%; height: 100%; object-fit: cover;">
                            <button onclick="clearPostImage()" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 0.6rem; cursor: pointer;"><i class="fas fa-times"></i></button>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; margin-top: 10px;">
                            <input type="file" id="post-file-input" accept="image/*,video/*" style="display: none;" onchange="window.handlePostFileSelect(event)">
                            <button onclick="window.selectPostImage()" style="background:none; border:none; color: var(--text-gray); font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-camera"></i></button>
                            <button onclick="window.submitPost()" style="background: var(--text-white); color: var(--bg-dark); border: none; padding: 6px 18px; font-size: 0.85rem; font-weight: 700; border-radius: 20px; cursor: pointer;">게시하기</button>
                        </div>
                    </div>

                    <!-- 소셜 통합 피드 갤러리 렌더링 -->
                    <div class="social-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        ${state.posts.reverse().map(post => `
                            <div class="social-item" style="aspect-ratio: 1; border-radius: 15px; overflow:hidden; position:relative; cursor:pointer;" onclick="alert('게시물 내용:\\n${post.content}')">
                                <img src="${post.media}" alt="Post image" style="width:100%; height:100%; object-fit:cover;">
                                ${post.isVideo ? '<i class="fas fa-play" style="position:absolute; top:10px; right:10px; color:white; text-shadow: 0 0 5px rgba(0,0,0,0.8);"></i>' : ''}
                                ${post.content ? `<div style="position:absolute; bottom:0; padding:10px; width:100%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"><p style="color:white; font-size:0.7rem; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${post.content}</p></div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
            case 'column':
                html = `
                    <div class="fade-in" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 1.4rem; color: var(--text-white); margin-bottom: 5px;">G-STAR <span style="color: var(--primary);">매거진</span></h3>
                            <p style="font-size: 0.8rem; color: var(--text-gray);">축구 스킬업을 위한 프리미엄 인사이트 & 데일리 뉴스</p>
                        </div>
                        <i class="fas fa-search" style="color: var(--primary); font-size: 1.2rem; cursor: pointer;"></i>
                    </div>
                `;

                state.columns.forEach(col => {
                    const highlightBorder = col.isHot ? 'var(--accent-gold)' : 'var(--primary)';
                    const btnStyle = col.isHot ? 'background: var(--primary); color: #000; border: none;' : 'background: transparent; border: 1px solid var(--text-white); color: var(--text-white);';

                    html += `
                        <div class="card fade-in" style="background: rgba(20, 25, 35, 0.7); border: 1px solid var(--border-glass); border-radius: 15px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                            <div style="position: relative; width: 100%; height: 180px;">
                                <img src="${col.thumb}" style="width: 100%; height: 100%; object-fit: cover;" alt="article">
                                <div style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); border: 1px solid ${highlightBorder}; color: ${highlightBorder}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                                    <i class="fas ${col.labelIcon}" style="margin-right: 4px;"></i>${col.label}
                                </div>
                                <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, rgba(15,23,42,1), transparent);"></div>
                            </div>
                            <div style="padding: 20px;">
                                <h4 style="font-size: 1.2rem; color: var(--text-white); margin-bottom: 10px; line-height: 1.4;">${col.title}</h4>
                                <p style="color: var(--text-gray); font-size: 0.9rem; line-height: 1.6; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${col.desc}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.75rem; color: #666;"><i class="far fa-clock" style="margin-right: 4px;"></i>${col.time}</span>
                                    <button onclick="alert('데이터 연동 진행중입니다.')" style="${btnStyle} padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer; ${col.isHot ? 'box-shadow: 0 4px 10px rgba(0,210,255,0.3);' : ''}">칼럼 읽기</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                break;
            case 'social':
                // 외부 SNS 크롤링 목업 데이터 (최신 트렌드 해시태그 기반)
                const externalSnsMock = [
                    { id: 901, authorName: '축구사랑녀_99', authorAvatar: 'fa-user', content: '#지스타 최고의 훈련 캠프! 오늘 하루도 불태웠다 🔥', media: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400', isExternal: true },
                    { id: 902, authorName: '골잡이_KIM', authorAvatar: 'fa-user-ninja', content: '이번 #축구캠프 정말 도움 많이 되네요. 드리블 스킬업! ⚽ #지스타트레이닝캠프', media: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=400', isExternal: true },
                    { id: 903, authorName: 'SoccerHolic', authorAvatar: 'fa-user-secret', content: '친구들과 함께한 #지스타트레이닝캠프 주말 매치 하이라이트 영상입니다. 놀라운 패스워시!', media: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=400', isVideo: true, isExternal: true }
                ];

                // 앱 내 유저들의 포스트 변환 (작성자 이름과 아바타 매칭)
                const internalPosts = state.posts.map(p => {
                    let u = state.users.find(user => String(user.id) === String(p.authorId));
                    if (!u && state.currentUser && String(state.currentUser.id) === String(p.authorId)) {
                        u = state.currentUser;
                    }
                    return {
                        id: p.id,
                        authorName: u && u.name ? u.name : 'G-STAR 멤버',
                        authorAvatar: u && u.avatar && u.avatar.startsWith('data:') ? null : 'fa-user-astronaut',
                        authorAvatarImg: u && u.avatar && u.avatar.startsWith('data:') ? u.avatar : null,
                        content: p.content,
                        media: p.media,
                        isVideo: p.isVideo,
                        isExternal: false
                    };
                });

                // 포스트 정렬 및 최상단 고정 로직 (isPriority 우선순위 적용)
                const allFeed = [...internalPosts, ...externalSnsMock].sort((a, b) => {
                    // 우선순위가 있는 공지가 무조건 맨 위
                    if (a.isPriority && !b.isPriority) return -1;
                    if (!a.isPriority && b.isPriority) return 1;
                    // 나머지는 번호(순서) 역순
                    return b.id - a.id;
                });

                html = `
                    <div class="social-header fade-in" style="display:flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                        <h3 style="font-size: 1.4rem; color: var(--text-white);">트렌딩 소셜 피드</h3>
                        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px;">
                            <span style="background: rgba(0,210,255,0.15); color: var(--primary); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; border: 1px solid rgba(0,210,255,0.3);">#지스타</span>
                            <span style="background: rgba(255,255,255,0.1); color: var(--text-gray); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap;">#지스타트레이닝캠프</span>
                            <span style="background: rgba(255,255,255,0.1); color: var(--text-gray); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap;">#축구캠프</span>
                        </div>
                    </div>
                    <div class="fade-in" style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 30px;">
                        ${allFeed.map(post => {
                    const isNotice = post.type === 'notice' || post.authorName.includes('운영팀');
                    const borderStyle = post.isPriority ? '2px solid #ff3b30' : (isNotice ? '1px solid var(--primary)' : '1px solid var(--border-glass)');
                    const bgStyle = post.isPriority ? 'rgba(40, 15, 15, 0.8)' : 'rgba(20, 25, 35, 0.7)';

                    return `
                            <div class="card" style="background: ${bgStyle}; border: ${borderStyle}; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                                ${post.isPriority ? `<div style="background: #ff3b30; color: white; text-align: center; padding: 4px 0; font-size: 0.8rem; font-weight: bold;"><i class="fas fa-bullhorn" style="margin-right: 5px;"></i>필독 공지사항입니다.</div>` : ''}
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 35px; height: 35px; border-radius: 50%; background: var(--bg-dark); display: flex; justify-content: center; align-items: center; color: ${isNotice ? 'var(--accent-gold)' : 'var(--primary)'}; font-size: 1rem; overflow: hidden; border: 1px solid var(--border-glass);">
                                            ${post.authorAvatarImg ? `<img src="${post.authorAvatarImg}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas ${post.authorAvatar || 'fa-user'}"></i>`}
                                        </div>
                                        <div>
                                            <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-white);">${post.authorName}</span>
                                            ${post.isExternal ? '<span style="font-size: 0.65rem; color: #ff3b30; margin-left: 5px; background: rgba(255,59,48,0.1); padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(255,59,48,0.3);">Instagram</span>' :
                            (isNotice ? '<span style="font-size: 0.65rem; color: var(--accent-gold); margin-left: 5px; background: rgba(255,215,0,0.1); padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(255,215,0,0.3);">운영자</span>'
                                : '<span style="font-size: 0.65rem; color: var(--primary); margin-left: 5px; background: rgba(0,210,255,0.1); padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(0,210,255,0.3);">G-STAR 멤버</span>')}
                                        </div>
                                    </div>
                                    <i class="fas fa-ellipsis-h" style="color: var(--text-gray);"></i>
                                </div>
                                ${post.media ? `
                                <div style="position: relative; width: 100%; aspect-ratio: 4/3; background: #000;">
                                    <img src="${post.media}" style="width: 100%; height: 100%; object-fit: cover;">
                                    ${post.isVideo ? '<div style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%); width: 50px; height: 50px; background: rgba(0,0,0,0.6); border-radius: 50%; display: flex; justify-content:center; align-items:center;"><i class="fas fa-play" style="color: white; font-size: 1.5rem; margin-left: 3px;"></i></div>' : ''}
                                </div>` : ''}
                                <div style="padding: 15px;">
                                    ${!isNotice ? `
                                    <div style="display: flex; gap: 15px; margin-bottom: 10px; font-size: 1.4rem; color: var(--text-white);">
                                        <i class="far fa-heart" style="cursor: pointer; transition: 0.2s;" onclick="this.classList.toggle('fas'); this.classList.toggle('far'); this.style.color = this.style.color === 'rgb(255, 59, 48)' ? 'var(--text-white)' : '#ff3b30';"></i>
                                        <i class="far fa-comment"></i>
                                        <i class="far fa-paper-plane"></i>
                                    </div>` : ''}
                                    ${post.category && !post.content.includes('[공지]') ? `<span style="color: var(--primary); font-weight: bold; margin-right: 5px; font-size: 0.9rem;">[${post.category}]</span>` : ''}
                                    ${post.title ? `<h4 style="color: var(--text-white); font-size: 1.1rem; margin-bottom: 8px;">${post.title}</h4>` : ''}
                                    <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-gray); margin-bottom: 5px; white-space: pre-wrap;">
                                        ${!isNotice ? `<strong style="color: var(--text-white);">${post.authorName}</strong> ` : ''}${post.content}
                                    </p>
                                    <span style="font-size: 0.75rem; color: #666;">${post.date || '방금 전'}</span>
                                </div>
                            </div>
                        `;
                }).join('')}
                    </div>
                `;
                break;
        }
        if (tabContent) {
            tabContent.innerHTML = html;
            tabContent.scrollTop = 0;

            if (tabId === 'profile') {
                const myScores = (state.currentUser && state.currentUser.stats) ? state.currentUser.stats : [30, 30, 30, 30, 30];
                setTimeout(() => {
                    if (window.drawRadarChart) {
                        window.drawRadarChart('myStatChart', myScores);
                    }
                }, 100);
            }
        }
    }

    // === 서브 뷰: 내 훈련 일지 ===
    window.showTrainingLog = () => {
        const btnBack = `<button onclick="renderTab('profile')" style="background:none;border:none;color:white;font-size:1.2rem;margin-right:15px;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>`;
        if (viewTitle) viewTitle.innerHTML = btnBack + '내 훈련 일지';

        const logs = [
            { date: '2024.11.20', title: 'A반 드리블 스킬 마스터 훈련', content: '퍼스트 터치 후 수비수 타이밍 뺏기, 좁은 공간에서의 볼 소유 및 연계 플레이', feedback: '퍼스트 터치가 눈에 띄게 좋아졌습니다. 다음 훈련엔 공간 패스 타이밍을 중점적으로 보겠습니다.', coach: '김명훈 코치' },
            { date: '2024.11.16', title: '포지셔닝 및 공간 창출', content: '공격 지역에서의 오프더볼 움직임, 하프 스페이스 침투 및 크로스 타겟팅', feedback: '수비 전환 시 내려오는 속도가 조금 늦습니다. 체력 훈련을 병행하면 완벽할 것 같습니다.', coach: '이동국 코치' },
            { date: '2024.11.13', title: '슈팅 세션', content: '페널티 박스 외곽 중거리 슈팅, 원터치 슈팅 및 감아차기 영점 조절', feedback: '발등에 얹히는 임팩트가 훌륭합니다. 실전에서도 자신감 있게 과감한 슈팅을 시도하세요.', coach: '김명훈 코치' }
        ];

        let html = `
            <div class="fade-in" style="padding-top: 10px; padding-bottom: 20px;">
                <div style="background: linear-gradient(135deg, rgba(20, 30, 48, 0.8), transparent); padding: 20px; border-radius: 15px; margin-bottom: 25px; border: 1px solid rgba(0, 210, 255, 0.2);">
                    <h3 style="color: var(--text-white); margin-bottom: 10px; font-size: 1.1rem;"><i class="fas fa-chart-line" style="color: var(--primary); margin-right: 8px;"></i>훈련 기록 요약</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="color: var(--text-gray); font-size: 0.85rem; margin-bottom: 5px;">조회 기간</p>
                            <p style="color: var(--text-white); font-weight: 700; font-size: 0.95rem;">2024.11.01 ~ 2024.11.30</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="color: var(--text-gray); font-size: 0.85rem; margin-bottom: 5px;">참여 횟수</p>
                            <p style="color: var(--primary); font-weight: 800; font-size: 1.1rem;">총 ${logs.length}회</p>
                        </div>
                    </div>
                </div>

                ${logs.map(log => `
                    <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8)); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div>
                                <span style="background: rgba(0,210,255,0.1); color: var(--primary); padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px;">${log.date}</span>
                                <h4 style="font-size: 1.1rem; margin-top: 10px; color: var(--text-white);">${log.title}</h4>
                            </div>
                            <span style="background: rgba(255,215,0,0.1); color: var(--accent-gold); padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(255,215,0,0.3);"><i class="fas fa-user-tie" style="margin-right: 5px;"></i>${log.coach}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <h5 style="color: var(--text-gray); font-size: 0.8rem; margin-bottom: 5px;"><i class="fas fa-clipboard-list" style="margin-right:5px;"></i>훈련 내용</h5>
                            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">${log.content}</p>
                        </div>

                        <div>
                            <h5 style="color: var(--accent-gold); font-size: 0.8rem; margin-bottom: 5px;"><i class="fas fa-comment-dots" style="margin-right:5px;"></i>코치 코멘트</h5>
                            <div style="background: rgba(255,215,0,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--accent-gold);">
                                <p style="font-size: 0.9rem; color: var(--text-white); line-height: 1.5; margin: 0;">"${log.feedback}"</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        if (tabContent) {
            tabContent.innerHTML = html;
            tabContent.scrollTop = 0;
        }
    };

    // === 서브 뷰: 친구 관리 ===
    window.showFriends = (tab = 'following') => {
        const btnBack = `<button onclick="renderTab('profile')" style="background:none;border:none;color:white;font-size:1.2rem;margin-right:15px;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>`;
        if (viewTitle) viewTitle.innerHTML = btnBack + '친구 관리';

        // 실제 데이터 연동 (state.users에서 나를 제외한 인원들 및 팔로잉 필터링)
        const myId = state.currentUser ? String(state.currentUser.id) : '';
        const allOtherUsers = state.users.filter(u => String(u.id) !== myId && u.id !== 'admin');

        let displayList = [];
        if (tab === 'following') {
            displayList = allOtherUsers.filter(u => state.following.includes(String(u.id)));
        } else if (tab === 'followers') {
            displayList = allOtherUsers.filter(u => state.followers.includes(String(u.id)));
        } else {
            // 'discovery' 탭 등 추가 시 전체 명단 노출
            displayList = allOtherUsers;
        }

        let html = `
            <div class="fade-in" style="padding-top: 10px; padding-bottom: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn-check" onclick="showFriends('following')" style="${tab === 'following' ? 'background: var(--primary); color: #000;' : ''} flex: 1;">팔로잉 (${state.following.length})</button>
                    <button class="btn-check" onclick="showFriends('discovery')" style="${tab === 'discovery' ? 'background: var(--primary); color: #000;' : ''} flex: 1;">멤버 찾기 (${allOtherUsers.length})</button>
                </div>
                
                <div class="user-list">
                    ${displayList.length > 0 ? displayList.map(u => `
                        <div class="card" onclick="window.showFriendProfile('${u.id}')" style="background: linear-gradient(to right, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border: 1px solid var(--border-glass); padding: 15px; border-radius: 15px; margin-bottom: 15px; cursor: pointer; display: flex; align-items: center; gap: 15px; transition: 0.3s;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--glass-bg); display: flex; justify-content: center; align-items: center; font-size: 1.5rem; color: var(--primary); border: 2px solid var(--border-glass); overflow: hidden;">
                                ${u.avatar && u.avatar.includes('http') ? `<img src="${u.avatar}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas ${u.avatar || 'fa-user-astronaut'}"></i>`}
                            </div>
                            <div style="flex: 1;">
                                <h4 style="color: var(--text-white); margin-bottom: 5px;">${u.name}</h4>
                                <p style="font-size: 0.8rem; color: var(--text-gray);">${u.role || 'G-STAR 멤버'} | ${u.grade || ''} ${u.school || '지트캠프'}</p>
                            </div>
                            <i class="fas fa-chevron-right" style="color: var(--text-gray);"></i>
                        </div>
                    `).join('') : `<p style="text-align:center; padding: 40px; color: var(--text-gray);">표시할 멤버가 없습니다.</p>`}
                </div>
            </div>
        `;

        if (tabContent) {
            tabContent.innerHTML = html;
            tabContent.scrollTop = 0;
        }
    };

    // === 서브 뷰: 친구 상세 프로필 ===
    window.showFriendProfile = (friendId) => {
        // 실제 데이터에서 검색
        const friend = state.users.find(u => String(u.id) === String(friendId));
        if (!friend) return alert('존재하지 않는 회원입니다.');

        const btnBack = `<button onclick="showFriends('following')" style="background:none;border:none;color:white;font-size:1.2rem;margin-right:15px;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>`;
        if (viewTitle) viewTitle.innerHTML = btnBack + `${friend.name}님의 프로필`;

        const friendLogs = [
            { date: '2024.11.19', title: '패스 마스터리 훈련' },
            { date: '2024.11.15', title: '실전 모의 경기' }
        ];

        let html = `
            <div class="fade-in" style="padding-top: 10px; padding-bottom: 20px;">
                <div class="profile-header" style="background: linear-gradient(135deg, rgba(20, 30, 48, 0.8), transparent); padding: 25px 20px; border-radius: 20px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; flex-direction: column; align-items: center; width: 40%;">
                            <div style="width: 75px; height: 75px; border-radius: 50%; background: var(--glass-bg); margin-bottom: 10px; display: flex; justify-content: center; align-items: center; font-size: 2.5rem; color: var(--primary); border: 2px solid var(--primary);">
                                <i class="fas ${friend.avatar}"></i>
                            </div>
                            <h3 style="font-size: 1.2rem; margin-bottom: 2px;">${friend.name}</h3>
                            <p style="color: var(--accent-gold); font-size: 0.75rem; font-weight: 600;">우수 훈련병</p>
                        </div>
                        <div style="width: 55%; height: 140px; position: relative;">
                            <canvas id="friendStatChart"></canvas>
                        </div>
                    </div>

                    <div style="margin-top: 20px; display: flex; justify-content: center; gap: 10px;">
                        ${state.following.includes(friend.id)
                ? `<button class="btn-check" onclick="toggleFollow('${friend.id}', '${friend.name}')" style="background: var(--primary); color: #000; padding: 8px 20px;">언팔로우</button>`
                : `<button class="btn-check" onclick="toggleFollow('${friend.id}', '${friend.name}')" style="background: #2a334a; color: var(--text-white); padding: 8px 20px; border: 1px solid var(--border-glass);">팔로우</button>`
            }
                        <button class="btn-check" onclick="openMessageModal('${friend.id}', '${friend.name}')" style="background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 8px 20px;">쪽지 보내기</button>
                    </div>
                </div>

                <h4 class="section-title" style="margin-bottom: 15px;">획득한 뱃지</h4>
                <div style="display: flex; gap: 15px; margin-bottom: 25px; overflow-x: auto; padding-bottom: 10px;">
                    <div style="min-width: 80px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #ffd700, #b8860b); margin: 0 auto 10px; display: flex; justify-content: center; align-items: center; font-size: 1.8rem; color: #000; box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);">
                            <i class="fas fa-fire"></i>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-gray);">개근왕</span>
                    </div>
                    <div style="min-width: 80px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #00d2ff, #3a7bd5); margin: 0 auto 10px; display: flex; justify-content: center; align-items: center; font-size: 1.8rem; color: #fff; box-shadow: 0 5px 15px rgba(0, 210, 255, 0.3);">
                            <i class="fas fa-tachometer-alt"></i>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-gray);">스프린터</span>
                    </div>
                    <div style="min-width: 80px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #c0c0c0, #808080); margin: 0 auto 10px; display: flex; justify-content: center; align-items: center; font-size: 1.8rem; color: #fff;">
                            <i class="fas fa-shoe-prints"></i>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-gray);">패스 마스터</span>
                    </div>
                </div>

                <h4 class="section-title" style="margin-bottom: 15px;">최근 훈련 내역</h4>
                <div>
                    ${friendLogs.map(log => `
                        <div class="card" style="background: var(--glass-bg); padding: 15px 20px; border-radius: 12px; margin-bottom: 12px; border-left: 3px solid var(--accent-gold);">
                            <div style="color: var(--primary); font-size: 0.8rem; margin-bottom: 5px;">${log.date}</div>
                            <h5 style="font-size: 1rem; color: var(--text-white);">${log.title}</h5>
                        </div>
                    `).join('')}
                </div>
                
                <h4 class="section-title" style="margin-top: 30px; margin-bottom: 15px;">${friend.name}님의 소식 & 갤러리</h4>
                <div class="social-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${state.posts.filter(p => p.authorId === friend.id).reverse().map(post => `
                        <div class="social-item" style="aspect-ratio: 1; border-radius: 15px; overflow:hidden; position:relative; cursor:pointer;" onclick="alert('게시물 내용:\\n${post.content}')">
                            <img src="${post.media}" alt="Post image" style="width:100%; height:100%; object-fit:cover;">
                            ${post.isVideo ? '<i class="fas fa-play" style="position:absolute; top:10px; right:10px; color:white; text-shadow: 0 0 5px rgba(0,0,0,0.8);"></i>' : ''}
                            ${post.content ? `<div style="position:absolute; bottom:0; padding:10px; width:100%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"><p style="color:white; font-size:0.7rem; margin:0; line-height: 1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${post.content}</p></div>` : ''}
                        </div>
                    `).join('') || `<p style="color: var(--text-gray); font-size: 0.85rem; padding: 20px; text-align: center; width: 200%;">등록된 갤러리 정보가 없습니다.</p>`}
                </div>
            </div>
        `;

        if (tabContent) {
            tabContent.innerHTML = html;
            tabContent.scrollTop = 0;
            // 친구 스탯 (조금 더 좋은 스탯으로 예시 구성)
            const friendScores = [35, 26, 32, 28, 30];
            setTimeout(() => window.drawRadarChart('friendStatChart', friendScores), 50);
        }
    };

    // === 팔로우 / 언팔로우 토글 로직 ===
    window.toggleFollow = (friendId, friendName) => {
        if (!state.currentUser) return alert("로그인이 필요합니다.");

        const idx = state.following.indexOf(friendId);
        if (idx > -1) {
            // 이미 팔로우 중 -> 언팔로우 실행
            if (confirm(`${friendName}님을 언팔로우 하시겠습니까?`)) {
                state.following.splice(idx, 1);
                alert(`${friendName}님 언팔로우 완료`);
            }
        } else {
            // 팔로우 실행
            state.following.push(friendId);
            alert(`${friendName}님을 팔로우합니다!`);

            // 테스트: 내가 누군가를 팔로우하면, 상대방도 나를 팔로우했다고 알림 주기(목업)
            // state.notifications.unshift({
            //    id: Date.now(),
            //    type: 'follow',
            //    message: `${friendName}님이 맞팔로우를 시작했습니다.`,
            //    read: false,
            //    time: '방금 전'
            // });
        }

        window.saveState();
        // UI 즉시 새로고침
        window.showFriendProfile(friendId);
    };

    // === 쪽지 모달 창 및 전송 로직 (메신저 연동 포함) ===
    window.openMessageModal = (friendId, friendName) => {
        // 기존 모달 닫기
        const existing = document.getElementById('message-modal-overlay');
        if (existing) existing.remove();

        // 모달 오버레이 생성
        const overlay = document.createElement('div');
        overlay.id = 'message-modal-overlay';
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px;";

        // 모달 컨텐츠
        const modalHtml = `
            <div class="fade-in" style="background: rgba(20, 30, 48, 0.95); border: 1px solid var(--border-glass); border-radius: 20px; width: 100%; max-width: 360px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--text-white); font-size: 1.2rem; margin: 0;"><i class="fas fa-paper-plane" style="color: var(--primary); margin-right: 8px;"></i>${friendName}님에게 쪽지 보내기</h3>
                    <i class="fas fa-times" onclick="document.getElementById('message-modal-overlay').remove()" style="color: var(--text-gray); font-size: 1.2rem; cursor: pointer;"></i>
                </div>
                <textarea id="message-input-text" placeholder="메시지 내용을 입력하세요..." style="width: 100%; height: 120px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 12px; padding: 15px; color: var(--text-white); font-size: 0.95rem; resize: none; outline: none; margin-bottom: 20px; font-family: 'Pretendard', sans-serif;"></textarea>
                <div style="display: flex; gap: 10px;">
                    <button onclick="document.getElementById('message-modal-overlay').remove()" class="btn-check" style="flex: 1; background: transparent; border: 1px solid var(--text-gray); color: var(--text-gray); padding: 12px; border-radius: 12px;">취소</button>
                    <button id="btn-send-message" class="btn-check" style="flex: 1; background: linear-gradient(135deg, var(--secondary), var(--primary)); color: #000; font-weight: bold; border: none; padding: 12px; border-radius: 12px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">전송</button>
                </div>
            </div>
        `;
        overlay.innerHTML = modalHtml;
        document.body.appendChild(overlay);

        // 텍스트에리어 포커스
        setTimeout(() => {
            const textarea = document.getElementById('message-input-text');
            if (textarea) textarea.focus();
        }, 100);

        // 전송 버튼 이벤트 바인딩
        document.getElementById('btn-send-message').addEventListener('click', () => {
            const inputEl = document.getElementById('message-input-text');
            const msg = inputEl.value;

            if (msg && msg.trim() !== '') {
                overlay.remove(); // 모달 닫기

                // === 기존 메시지 전송 로직 재사용 ===
                const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // 기존 대화창(chat) 찾기 또는 새로 생성
                let chat = state.messages.find(m => m.partnerId === friendId);
                if (!chat) {
                    chat = { partnerId: friendId, partnerName: friendName, history: [] };
                    state.messages.unshift(chat);
                }

                chat.history.push({ id: Date.now(), sender: 'me', text: msg, time: currentTime });
                window.saveState();

                // 완료 알림 (기본 alert 대신 조금 더 부드러운 토스트 팝업으로 변경 가능하지만 우선 alert 유지)
                alert(`${friendName}님에게 쪽지를 성공적으로 보냈습니다.`);

                // 상대방의 가상 답장 생성 (3초 뒤)
                setTimeout(() => {
                    const replyMsg = `(자동 답장) 알겠습니다, 확인했습니다!`;
                    chat.history.push({
                        id: Date.now(),
                        sender: 'partner',
                        text: replyMsg,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });

                    // 새 쪽지 알림(Notifications) 추가
                    state.notifications.unshift({
                        id: Date.now(),
                        type: 'message',
                        partnerId: friendId,
                        message: `${friendName}님으로부터 새 쪽지가 도착했습니다: "${replyMsg}"`,
                        read: false,
                        time: '방금 전'
                    });
                    window.saveState();

                    // 알림 아이콘(종모양) 흔들림 및 빨간색 표시
                    const notiIcon = document.querySelector('.fa-bell');
                    if (notiIcon) {
                        notiIcon.style.color = '#ff3b30';
                        notiIcon.classList.add('shake-anim');
                        setTimeout(() => notiIcon.classList.remove('shake-anim'), 500);
                    }
                }, 3000);
            } else {
                alert('메시지 내용을 입력해주세요.');
                inputEl.focus();
            }
        });
    };


    // === 전역 함수: 레이더 차트 그리기 (성장성 비교 추가) ===
    window.drawRadarChart = (canvasId, currentScores, previousScores = [28, 22, 26, 25, 30]) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Chart.js 인스턴스가 이미 있으면 파괴 후 다시 그리기
        // 기존 코드에서는 Chart.getChart(canvasId)를 사용했지만,
        // 전역 변수 myChartInstance를 사용하여 특정 차트 인스턴스를 관리하는 방식으로 변경
        if (window.myChartInstance && window.myChartInstance.canvas.id === canvasId) {
            window.myChartInstance.destroy();
        }

        window.myChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['스피드', '유연성', '지구력', '근력', '반응속도'],
                datasets: [
                    {
                        label: '최근 (Current)',
                        data: currentScores,
                        backgroundColor: 'rgba(0, 210, 255, 0.4)',  // 현재 능력치 (강조)
                        borderColor: '#00d2ff',
                        borderWidth: 2,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#00d2ff',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        zIndex: 2 // 앞쪽에 표시
                    },
                    {
                        label: '이전 (Previous)',
                        data: previousScores,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)', // 이전 능력치 (반투명 회색)
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderWidth: 1.5,
                        borderDash: [5, 5], // 점선
                        pointBackgroundColor: 'transparent',
                        pointBorderColor: 'rgba(255, 255, 255, 0.5)',
                        pointRadius: 2,
                        zIndex: 1 // 뒤쪽에 표시
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            font: { size: 9, family: 'Pretendard' },
                            boxWidth: 10,
                            padding: 5
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: {
                            color: '#cbd5e1',
                            font: { size: 9, family: 'Pretendard', weight: 'bold' }
                        },
                        ticks: {
                            display: false,
                            min: 0,
                            max: 35,
                            stepSize: 7
                        }
                    }
                }
            }
        });
    };

    // === 프로필 사진 업로드 처리 ===
    window.handleProfileUpload = (event) => {
        const file = event.target.files[0];
        if (!file || !state.currentUser) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;

            // 현재 로그인된 유저의 메모리상 아바타 업데이트
            state.currentUser.avatar = base64Image;

            // 로컬 스토리지 데이터 갱신
            try {
                localStorage.setItem('soccer_session', JSON.stringify(state.currentUser));

                // soccer_users 배열 내의 회원 정보도 업데이트 필요
                const usersJson = localStorage.getItem('soccer_users');
                if (usersJson) {
                    const users = JSON.parse(usersJson);
                    const userIndex = users.findIndex(u => u.id === state.currentUser.id);
                    if (userIndex !== -1) {
                        users[userIndex].avatar = base64Image;
                        localStorage.setItem('soccer_users', JSON.stringify(users));
                    }
                }
            } catch (err) {
                console.error("아바타 저장 실패:", err);
                alert("이미지가 너무 큽니다. 다른 이미지를 선택해주세요.");
                return;
            }

            // 성공 시 즉시 화면 렌더링
            renderTab('profile');
        };
        reader.readAsDataURL(file);
    };

    // 업로드할 첨부 이미지/영상 상태
    let selectedPostMedia = null;
    let isSelectedVideo = false;

    window.selectPostImage = () => {
        const fileInput = document.getElementById('post-file-input');
        if (fileInput) fileInput.click();
    };

    window.handlePostFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        isSelectedVideo = file.type.startsWith('video/');
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPostMedia = e.target.result;
            const previewBlock = document.getElementById('post-image-preview');
            const previewImg = document.getElementById('preview-img');
            if (previewBlock && previewImg) {
                previewImg.src = isSelectedVideo ? 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png' : selectedPostMedia;
                previewBlock.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    };

    window.clearPostImage = () => {
        selectedPostMedia = null;
        isSelectedVideo = false;
        const previewBlock = document.getElementById('post-image-preview');
        if (previewBlock) previewBlock.style.display = 'none';
        const fileInput = document.getElementById('post-file-input');
        if (fileInput) fileInput.value = '';
    };

    // === 소셜 갤러리: 포스트 업로드 ===
    window.submitPost = () => {
        const input = document.getElementById('post-input');
        if (!input || (!input.value.trim() && !selectedPostMedia)) {
            return alert('게시할 내용이나 사진을 선택해주세요.');
        }

        if (!state.currentUser) {
            return alert('로그인이 필요합니다.');
        }

        const today = new Date();
        const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

        const mediaUrl = selectedPostMedia ? selectedPostMedia : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400';

        const newPost = {
            id: Date.now(),
            authorId: state.currentUser.id,
            content: input.value.trim(),
            date: dateStr,
            media: mediaUrl,
            isVideo: isSelectedVideo
        };

        // 로컬 데이터 및 영구 저장소 업데이트
        state.posts.push(newPost);

        // Firebase 저장 (실시간 소셜 피드 공유)
        if (db) {
            db.collection("posts").doc(newPost.id.toString()).set(newPost).catch(e => console.error(e));
        }
        try {
            localStorage.setItem('soccer_posts', JSON.stringify(state.posts));
        } catch (e) {
            console.error('포스트 저장 실패:', e);
        }

        alert('게시물이 등록되었습니다!');

        // 폼 초기화
        input.value = '';
        clearPostImage();

        renderTab('profile'); // 등록 즉시 화면 갱신
    };

    window.logout = () => {
        try {
            localStorage.removeItem('soccer_session');
        } catch (e) { }
        location.reload();
    };

    // ==========================================
    // 엑셀 데이터 임포트 로직
    // ==========================================
    window.triggerExcelImport = () => {
        const input = document.getElementById('excel-import-input');
        if (input) input.click();
    };

    window.mergeDuplicateUsers = async () => {
        if (!confirm("이름과 연락처가 동일한 중복 회원 데이터를 하나로 통합하시겠습니까?\n이 작업은 되돌릴 수 없으므로 주의하세요.")) return;

        const msg = document.getElementById('sync-status-msg');
        if (msg) {
            msg.style.display = 'block';
            msg.textContent = '중복 회원을 찾아 데이터를 통합 중입니다...';
        }

        try {
            const userGroups = {};
            // 1. 이름 + 연락처 기반으로 그룹화 (이름없음 제외)
            state.users.forEach(u => {
                if (u.id === 'admin' || !u.name || u.name === '이름없음') return;
                const key = `${u.name}_${u.phone || ''}`;
                if (!userGroups[key]) userGroups[key] = [];
                userGroups[key].push(u);
            });

            let mergedCount = 0;
            const usersToRemove = [];
            const usersToUpdate = [];

            for (const key in userGroups) {
                const group = userGroups[key];
                if (group.length > 1) {
                    // 중복 발견! 첫 번째 유저를 메인으로 삼고 나머지를 병합
                    // 날짜 순서대로 정렬 (가장 오래된 데이터를 메인 아이디의 기반으로)
                    group.sort((a, b) => new Date(a.joinDate || a.membershipStart) - new Date(b.joinDate || b.membershipStart));

                    const mainUser = group[0];
                    if (!mainUser.history) mainUser.history = [];

                    // 나머지 유저들의 정보를 mainUser로 통합
                    for (let i = 1; i < group.length; i++) {
                        const other = group[i];

                        // 이력 통합
                        if (other.history && Array.isArray(other.history)) {
                            mainUser.history.push(...other.history);
                        } else {
                            // 이력이 없는 옛날 데이터라면 현재 정보를 이력으로 변환해서 추가
                            mainUser.history.push({
                                role: other.role,
                                duration: other.duration,
                                startDate: other.membershipStart || other.joinDate,
                                endDate: other.membershipEnd,
                                group: other.group,
                                memo: '(자동 병합됨)'
                            });
                        }

                        // 최신 정보(등급, 종료일 등)로 메인 유저 갱신
                        const lastEntry = [...mainUser.history].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).pop();
                        if (lastEntry) {
                            mainUser.role = lastEntry.role;
                            mainUser.membershipStart = lastEntry.startDate;
                            mainUser.membershipEnd = lastEntry.endDate;
                            mainUser.duration = lastEntry.duration;
                        }

                        usersToRemove.push(other.id);
                        mergedCount++;
                    }

                    // 메인 유저 이력 중복 제거 및 정렬
                    const uniqueHistory = [];
                    const seen = new Set();
                    mainUser.history.forEach(h => {
                        const hKey = `${h.startDate}_${h.role}`;
                        if (!seen.has(hKey)) {
                            uniqueHistory.push(h);
                            seen.add(hKey);
                        }
                    });
                    mainUser.history = uniqueHistory.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                    usersToUpdate.push(mainUser);
                }
            }

            // 2. 실제 데이터 반영 (Local & Firebase)
            if (mergedCount > 0) {
                // 삭제 처리
                state.users = state.users.filter(u => !usersToRemove.includes(u.id));

                if (db) {
                    // Firebase에서 중복 데이터 삭제
                    for (const id of usersToRemove) {
                        await db.collection("users").doc(id).delete();
                    }
                    // 메인 데이터 업데이트
                    for (const user of usersToUpdate) {
                        const clean = JSON.parse(JSON.stringify(user));
                        await db.collection("users").doc(user.id).set(clean);
                    }
                }

                localStorage.setItem('soccer_users', JSON.stringify(state.users));
                alert(`총 ${mergedCount}개의 중복 데이터를 통합 완료했습니다.`);
                if (window.renderAdminTab) window.renderAdminTab('admin-users');
            } else {
                alert('현재 병합할 중복 데이터가 없습니다.');
            }
        } catch (err) {
            console.error("Merge Error:", err);
            alert('병합 중 오류가 발생했습니다: ' + err.message);
        } finally {
            if (msg) msg.style.display = 'none';
        }
    };

    window.syncLocalToFirebase = async () => {
        if (!db) return alert('서버(Firebase)에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');

        const msg = document.getElementById('sync-status-msg');
        if (msg) {
            msg.style.display = 'block';
            msg.textContent = '서버 데이터와 대조하며 누락된 회원을 업로드 중입니다...';
        }

        try {
            // 1. 서버의 최신 ID 목록 가져오기
            const snap = await db.collection("users").get();
            const firebaseUserIds = new Set();
            snap.forEach(doc => firebaseUserIds.add(doc.id));

            let syncCount = 0;
            // 2. 로컬 state.users 중 서버에 없는 데이터만 업로드
            for (const u of state.users) {
                if (!firebaseUserIds.has(String(u.id))) {
                    // Firebase는 undefined 값을 허용하지 않으므로 정제
                    const cleanU = JSON.parse(JSON.stringify(u));
                    await db.collection("users").doc(String(u.id)).set(cleanU);
                    syncCount++;
                }
            }

            // 3. 반대로 서버에는 있는데 로컬에 없는 데이터가 있을 수 있으므로 onSnapshot이 처리하겠지만
            // 여기서 강제로 state를 교체해줄 수도 있음 (snap 데이터를 그대로 state.users에 반영)
            if (snap.docs.length > state.users.length) {
                const allUsers = [];
                snap.forEach(doc => allUsers.push(doc.data()));
                state.users = allUsers;
                localStorage.setItem('soccer_users', JSON.stringify(state.users));
            }

            alert(`동기화 완료!\n- 서버로 업로드: ${syncCount}명\n- 전체 회원 수: ${state.users.length}명`);
            if (window.renderAdminTab) window.renderAdminTab('admin-users');
        } catch (err) {
            console.error("Manual Sync Error:", err);
            alert('동기화 중 오류가 발생했습니다: ' + err.message);
        } finally {
            if (msg) msg.style.display = 'none';
        }
    };

    window.handleExcelImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const importStatus = document.getElementById('excel-import-status');
        const importButton = document.querySelector('#admin-tab-content .btn-primary');

        if (importStatus) importStatus.textContent = '파일 읽는 중...';
        if (importButton) importButton.disabled = true;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    alert("시스템 오류: 엑셀 처리 라이브러리(SheetJS)가 로드되지 않았습니다. index.html 파일도 깃허브에 함께 올리셨는지 확인해주세요.");
                    return;
                }
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    alert("엑셀 파일에 시트가 존재하지 않습니다.");
                    return;
                }
                const worksheet = workbook.Sheets[firstSheetName];

                // 로우 데이터를 2D 배열로 읽기 (raw: false로 날짜 포맷 유지)
                const arrayOfArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                console.log("Raw Excel Data:", arrayOfArrays);

                if (!arrayOfArrays || arrayOfArrays.length === 0) {
                    alert('엑셀 데이터가 비어있거나 읽을 수 없습니다.');
                    return;
                }

                // 진짜 헤더(제목)가 있는 행 찾기 (이름, 번호, 성함 등이 포함된 행)
                let headerRowIndex = -1;
                for (let i = 0; i < arrayOfArrays.length; i++) {
                    const row = arrayOfArrays[i];
                    if (row.some(cell => String(cell).includes('이름') || String(cell).includes('성함') || String(cell).includes('번호') || String(cell).includes('아이디'))) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    const firstRow = arrayOfArrays[0] ? arrayOfArrays[0].join(', ') : '없음';
                    alert(`회원 등록에 실패했습니다.\n\n엑셀 파일에서 '이름'이나 '번호' 제목이 있는 줄을 찾을 수 없습니다.\n(첫 번째 줄 감지 내용: ${firstRow})\n\n파일 구성을 확인해주세요.`);
                    return;
                }

                // 헤더 행 이후의 데이터를 객체 배열로 변환
                const headers = arrayOfArrays[headerRowIndex];
                const rows = arrayOfArrays.slice(headerRowIndex + 1).map(row => {
                    const obj = {};
                    headers.forEach((h, i) => {
                        if (h) obj[String(h).trim()] = row[i];
                    });
                    return obj;
                });

                // 빈 줄(이름도 없고 아이디도 없는 줄) 제거
                const validRows = rows.filter(row => {
                    const n = row['이름'] || row['성함'] || row['name'] || row['Name'] || row['user_name'];
                    const id = row['아이디'] || row['ID'] || row['Id'] || row['id'] || row['번호'] || row['No'];
                    return (n && String(n).trim() !== '') || (id && String(id).trim() !== '');
                });

                if (!confirm(`${validRows.length}명의 회원을 신규 등록하시겠습니까?`)) return;

                let successCount = 0;
                let failReason = "";

                for (const [index, row] of validRows.entries()) {
                    if (importStatus) importStatus.textContent = `회원 ${index + 1}/${validRows.length}명 처리 중...`;
                    try {
                        // --- [유연한 헤더 매핑 로직] ---
                        // 1. 이름 찾기
                        const name = row['이름'] || row['성함'] || row['name'] || row['Name'] || row['user_name'];
                        // 2. 기본 아이디 찾기
                        let baseId = String(row['아이디'] || row['ID'] || row['Id'] || row['id'] || row['번호'] || row['No'] || '');

                        if (!name && !baseId) continue; // 이름과 아이디 둘 다 없으면 스킵

                        // 3. 비밀번호 등 기본 정보
                        const pw = String(row['비밀번호'] || row['비번'] || row['password'] || row['pw'] || '1234');
                        const role = row['역할'] || row['등급'] || row['role'] || row['grade'] || 'Basic';
                        const duration = String(row['기간'] || row['개월 수'] || row['개월수'] || row['개월'] || row['duration'] || row['months'] || '1');

                        // 신규 추가/확장 정보 (엑셀 내 개인정보 모두 흡수)
                        const group = row['수업 그룹'] || row['그룹'] || '';
                        const gender = row['성별'] || '';
                        const gradeLevel = row['학년'] || '';
                        const birthDate = row['생년월일'] || '';
                        const school = row['학교/어린이집'] || row['어린이집'] || row['학교'] || '';
                        const height = row['키'] || '';
                        const weight = row['몸무게'] || '';
                        const excelJoinDate = row['가입일'] || '';
                        const startDate = row['시작일'] || '';
                        const endDate = row['종료일'] || '';
                        const frequency = row['횟수 (주당)'] || row['횟수'] || '';
                        const fee = row['등록비'] || '';
                        const uniformFee = row['유니폼 비'] || row['유니폼비'] || '';
                        const shuttle = row['차량운행'] || row['차량'] || '';
                        const motherName = row['모 성함'] || row['모성함'] || row['모'] || '';
                        const fatherName = row['부 성함'] || row['부성함'] || row['부'] || '';
                        const email = row['이메일 주소'] || row['이메일'] || row['email'] || '';
                        const uniformInfo = row['유니폼'] || '';

                        const phone = row['연락처'] || row['본인 연락처'] || row['전화번호'] || row['phone'] || row['tel'] || '';
                        const address = row['주소'] || row['address'] || '';
                        const memo = row['비고'] || row['메모'] || row['memo'] || '';

                        // 스탯 정보
                        const stats = [
                            parseInt(row['스피드'] || row['speed'] || 30),
                            parseInt(row['유연성'] || row['flexibility'] || 30),
                            parseInt(row['지구력'] || row['stamina'] || 30),
                            parseInt(row['근력'] || row['strength'] || 30),
                            parseInt(row['반응속도'] || row['reaction'] || 30)
                        ];

                        // 멤버십 상향 혜택 (유니폼 무료)
                        let finalUniformInfo = String(uniformInfo);
                        const durationMonths = parseInt(duration) || 0;
                        if (durationMonths >= 6 || role.toLowerCase().includes('pro') || role.toLowerCase().includes('ultimate')) {
                            if (!finalUniformInfo || finalUniformInfo.trim() === '') finalUniformInfo = "지원 대상 (FREE)";
                        }

                        // 수강 이력(History) 객체 생성 (이번에 엑셀에서 올라온 회차 단위 정보)
                        const historyEntry = {
                            role,
                            duration,
                            startDate: startDate || excelJoinDate || new Date().toISOString().split('T')[0],
                            endDate: endDate || '',
                            fee,
                            group,
                            frequency,
                            memo
                        };

                        if (!historyEntry.endDate) {
                            const tempUser = { membershipStart: historyEntry.startDate, duration: historyEntry.duration };
                            recalculateMembershipEnd(tempUser);
                            historyEntry.endDate = tempUser.membershipEnd;
                        }

                        // --- [지능형 아이디 관리 & 병합 로직] ---
                        // 이름과 연락처가 모두 일치하는 유저가 이미 있는지 확인
                        const baseIdStr = String(baseId || '');
                        const existingUser = state.users.find(u =>
                            (u.name === name && u.phone === phone && name !== '이름없음') ||
                            (baseIdStr && u.id.split('-')[0] === baseIdStr && u.name === name)
                        );

                        if (existingUser) {
                            // 이미 존재하는 사람임 -> 기존 데이터에 이력 추가 및 최신 정보 갱신
                            if (!existingUser.history) existingUser.history = [];

                            // 중복 이력 방지 (시작일과 등급이 같으면 동일 건으로 간주)
                            const isDuplicateHistory = existingUser.history.some(h =>
                                h.startDate === historyEntry.startDate && h.role === historyEntry.role
                            );

                            if (!isDuplicateHistory) {
                                existingUser.history.push(historyEntry);
                                // 날짜순 정렬 (최신이 뒤로)
                                existingUser.history.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                            }

                            // 최신 정보로 기본 필드 업데이트
                            existingUser.role = role;
                            existingUser.duration = duration;
                            existingUser.membershipStart = historyEntry.startDate;
                            existingUser.membershipEnd = historyEntry.endDate;
                            if (group) existingUser.group = group;
                            if (school) existingUser.school = school;
                            if (phone) existingUser.phone = phone;

                            // Firebase 동기화
                            if (db) {
                                const cleanUpdate = JSON.parse(JSON.stringify(existingUser));
                                await db.collection("users").doc(existingUser.id).set(cleanUpdate);
                            }
                        } else {
                            // 신규 유저 생성
                            let finalId = baseIdStr || ('new_' + Date.now().toString().slice(-6));

                            // ID 중복 체크 (완전 신규 아이디일 경우)
                            if (state.users.some(u => u.id === finalId)) {
                                finalId = finalId + '_' + Date.now().toString().slice(-4);
                            }

                            const newUser = {
                                id: finalId,
                                pw,
                                name: name || '이름없음',
                                role,
                                duration,
                                group,
                                gender,
                                gradeLevel,
                                birthDate,
                                school,
                                height,
                                weight,
                                excelJoinDate,
                                startDate,
                                endDate,
                                frequency,
                                fee,
                                uniformFee,
                                shuttle,
                                motherName,
                                fatherName,
                                email,
                                uniformInfo: finalUniformInfo,
                                phone,
                                address,
                                memo,
                                stats,
                                avatar: 'fa-user',
                                joinDate: startDate || excelJoinDate || new Date().toLocaleDateString(),
                                membershipStart: historyEntry.startDate,
                                membershipEnd: historyEntry.endDate,
                                history: [historyEntry]
                            };

                            const cleanNewUser = JSON.parse(JSON.stringify(newUser));
                            state.users.push(cleanNewUser);
                            if (db) {
                                await db.collection("users").doc(finalId).set(cleanNewUser);
                            }
                        }

                        successCount++;
                    } catch (rowErr) {
                        console.error('Error parsing row at index', index, row, rowErr);
                    }
                }

                // 최종 저장 및 알림
                if (successCount > 0) {
                    localStorage.setItem('soccer_users', JSON.stringify(state.users));
                    alert(`${successCount}명의 회원 등록이 완료되었습니다.`);
                } else {
                    alert(`조건에 맞는 데이터를 찾지 못했습니다. 이름과 아이디(또는 번호) 항목이 있는지 확인해주세요.`);
                }
                renderAdminTab('admin-users'); // 화면 갱신

            } catch (err) {
                console.error("Excel Read Error:", err);
                alert('엑셀 파일 읽기에 실패했습니다. 오류 내용: ' + err.message);
            } finally {
                if (importStatus) importStatus.textContent = '파일 선택하기';
                if (importButton) importButton.disabled = false;
            }
        };
        reader.readAsArrayBuffer(file);
    };

    window.adminResetUsers = () => {
        if (!confirm("주의: 모든 회원 데이터를 삭제하고 관리자 계정만 남깁니다. 계속하시겠습니까?")) return;

        state.users = [
            { id: 'admin', pw: 'admin', name: '관리자', role: 'admin', avatar: 'fa-user-shield' }
        ];

        // Firebase 삭제 (필요 시 개별 문서 삭제 로직 추가 가능하나 여기선 초기 관리자만 덮어씀)
        if (db) {
            db.collection("users").get().then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    if (doc.id !== 'admin') {
                        doc.ref.delete();
                    }
                });
            });
        }

        localStorage.setItem('soccer_users', JSON.stringify(state.users));
        alert("회원 데이터가 초기화되었습니다.");
        renderAdminTab('admin-users');
    };

    window.getMemberTheme = (user) => {
        const role = (user.role || 'Basic').toLowerCase();
        let colors = {
            main: "#7bc2b7",
            bg: "rgba(123, 194, 183, 0.1)",
            border: "rgba(123, 194, 183, 0.3)",
            text: "#7bc2b7"
        };

        if (role.includes('ultimate')) {
            colors = { main: "#f2cb4f", bg: "rgba(242, 203, 79, 0.1)", border: "rgba(242, 203, 79, 0.3)", text: "#f2cb4f" };
        } else if (role.includes('pro')) {
            colors = { main: "#00d2ff", bg: "rgba(0, 210, 255, 0.1)", border: "rgba(0, 210, 255, 0.3)", text: "#00d2ff" };
        } else if (role.includes('semi')) {
            colors = { main: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.3)", text: "#a855f7" };
        } else if (role.includes('basic')) {
            // 프리미엄 레드 테마 (명암비와 고급스러움 강조)
            colors = {
                main: "#f06958",
                bg: "rgba(240, 105, 88, 0.15)",
                border: "rgba(240, 105, 88, 0.4)",
                text: "#f06958",
                isPremium: true
            };
        }
        return colors;
    };

    window.analyzeFitnessFile = (event) => {
        const file = event.target.checked ? null : event.target.files[0];
        if (!file) return;

        const statusLabel = document.getElementById('fit-pdf-status');
        if (statusLabel) {
            statusLabel.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 파일을 읽는 중입니다... (${file.name})`;
            statusLabel.style.color = "#f2cb4f";
        }

        // 이 버튼은 UI에서 트리거될 것입니다.
    };

    window.processFitnessAI = () => {
        const fileInput = document.getElementById('fit-pdf-file');
        if (!fileInput || !fileInput.files[0]) {
            alert("먼저 분석할 파일을 선택해주세요.");
            return;
        }

        const statusLabel = document.getElementById('fit-pdf-status');
        if (statusLabel) {
            statusLabel.innerHTML = `<i class="fas fa-robot"></i> AI가 데이터를 정밀 분석 중입니다... 잠시만 기다려주세요.`;
            statusLabel.style.color = "var(--primary)";
        }

        // 가상 AI 분석 시뮬레이션 (2초 후 데이터 기입)
        setTimeout(() => {
            // 고유 정보 (김영재 샘플 데이터 기반 자동 매핑 예시)
            const sampleData = {
                'sprint10m': 2.34,
                'sprint20m': 5.75,
                'dribble10m': 2.68,
                'dribble20m': 8.15,
                'cone10m': 14.54,
                'longjump': 144,
                'trunklift': 32,
                'squat': 43,
                'balanceL': 12.8,
                'balanceR': 9.6
            };

            for (const [key, val] of Object.entries(sampleData)) {
                const el = document.getElementById(`fit-rec-${key}`);
                if (el) {
                    el.value = val;
                    el.style.backgroundColor = "rgba(123, 194, 183, 0.2)";
                }
            }

            // 차트 스코어 자동 계산 (가상)
            document.getElementById('fit-score-speed').value = 4.2;
            document.getElementById('fit-score-dribble').value = 3.8;
            document.getElementById('fit-score-agility').value = 4.5;
            document.getElementById('fit-score-power').value = 4.0;
            document.getElementById('fit-score-balance').value = 3.5;

            if (statusLabel) {
                statusLabel.innerHTML = `<i class="fas fa-check-circle"></i> 분석이 완료되었습니다! 확인 후 저장해주세요.`;
                statusLabel.style.color = "#4ade80";
            }
            alert("AI 데이터 추출이 완료되었습니다. 측정 결과가 자동으로 입력되었습니다.");
        }, 2000);
    };

    // === 관리자용 전역 함수 바인딩 ===
    window.showMemberDetail = (userId) => {
        console.log("showMemberDetail called for:", userId);
        const user = state.users.find(u => u.id === userId);
        if (!user) {
            console.error("User not found in state.users:", userId);
            return;
        }

        try {
            const role = (user.role || 'Basic').toLowerCase();
            const theme = window.getMemberTheme(user);
            const roleColor = theme.main;

            const existing = document.getElementById('member-detail-modal');
            if (existing) existing.remove();

            console.log("Rendering modal for:", user.name);

            const modalHtml = `
            <div id="member-detail-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 6, 23, 0.85); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 15px; backdrop-filter: blur(12px);">
                <div class="modal-content premium-card fade-in" style="width: 100%; max-width: 600px; height: 85vh; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
                    
                    <div style="padding: 24px 24px 16px; background: ${theme.isPremium ? `linear-gradient(180deg, rgba(240, 105, 88, 0.2) 0%, ${theme.bg} 100%)` : `linear-gradient(180deg, rgba(123, 194, 183, 0.1) 0%, transparent 100%)`}; flex-shrink: 0; border-bottom: 1px solid ${theme.border};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="display: flex; gap: 16px; align-items: center;">
                                <div style="width: 64px; height: 64px; border-radius: 18px; background: ${theme.bg}; border: 1px solid ${theme.border}; display: flex; justify-content: center; align-items: center; font-size: 2.2rem; color: ${theme.main}; box-shadow: ${theme.isPremium ? '0 0 20px rgba(240, 105, 88, 0.3)' : 'none'};">
                                    <i class="fas ${user.avatar || 'fa-user-ninja'}"></i>
                                </div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <h2 style="margin: 0; font-size: 1.5rem; color: #fff; letter-spacing: -0.5px;">${user.name}</h2>
                                        <span style="background: ${roleColor}; color: ${role.includes('semi') || role.includes('pro') || theme.isPremium ? '#fff' : '#000'}; padding: 3px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase;">${user.role || 'Basic'}</span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">ID: <span style="color: ${theme.main}; font-weight: 700;">${user.id}</span> | 가입: ${user.joinDate || '-'}</p>
                                </div>
                            </div>
                            <button onclick="document.getElementById('member-detail-modal').remove()" style="background: rgba(255,255,255,0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: #94a3b8; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display: flex; gap: 24px;">
                            <button id="tab-btn-info" onclick="window.switchMemberDetailTab('info')" style="padding: 12px 4px; background: none; border: none; border-bottom: 3px solid ${theme.main}; color: ${theme.main}; font-weight: 800; cursor: pointer; font-size: 0.95rem; transition: 0.3s; letter-spacing: -0.3px;">기본 및 상세정보</button>
                            <button id="tab-btn-fitness" onclick="window.switchMemberDetailTab('fitness')" style="padding: 12px 4px; background: none; border: none; border-bottom: 3px solid transparent; color: #64748b; font-weight: 700; cursor: pointer; font-size: 0.95rem; transition: 0.3s;">체력 검정 결과</button>
                        </div>
                    </div>

                    <div style="flex: 1; overflow-y: auto; padding: 20px 24px 24px; scrollbar-width: none;" id="member-detail-scroll">
                        
                        <div id="tab-content-info">
                            <div id="member-view-mode">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                                    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                                        <div style="color: #64748b; font-size: 0.75rem; margin-bottom: 4px;"><i class="fas fa-school"></i> 학교/학년</div>
                                        <div style="color: #fff; font-size: 1rem; font-weight: 600;">${user.school || '-'} / ${user.gradeLevel || '-'}</div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                                        <div style="color: #64748b; font-size: 0.75rem; margin-bottom: 4px;"><i class="fas fa-users"></i> 소속 그룹</div>
                                        <div style="color: #fff; font-size: 1rem; font-weight: 600;">${user.group || '-'}</div>
                                    </div>
                                </div>

                                <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-id-card"></i> 신체 및 개인 프로필</h4>
                                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">
                                            <span style="color: #64748b; font-size: 0.85rem;">성별</span>
                                            <span style="color: #fff; font-size: 0.85rem;">${user.gender || '-'}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">
                                            <span style="color: #64748b; font-size: 0.85rem;">생년월일</span>
                                            <span style="color: #fff; font-size: 0.85rem;">${user.birthDate || '-'}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">
                                            <span style="color: #64748b; font-size: 0.85rem;">신장/체중</span>
                                            <span style="color: #fff; font-size: 0.85rem;">${user.height || '-'}cm / ${user.weight || '-'}kg</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">
                                            <span style="color: #64748b; font-size: 0.85rem;">셔틀 이용</span>
                                            <span style="color: #fff; font-size: 0.85rem;">${user.shuttle || '-'}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; grid-column: 1/-1;">
                                            <span style="color: #64748b; font-size: 0.85rem;">보호자 (부/모)</span>
                                            <span style="color: #fff; font-size: 0.85rem;">${user.fatherName || '-'} / ${user.motherName || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-map-marker-alt"></i> 거주지 및 연락처</h4>
                                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px;">
                                    <div style="margin-bottom: 12px;">
                                        <div style="color: #64748b; font-size: 0.75rem; margin-bottom: 4px;">대표 연락처</div>
                                        <div style="color: #fff; font-size: 1rem; font-weight: 500;">${user.phone || '-'}</div>
                                    </div>
                                    <div>
                                        <div style="color: #64748b; font-size: 0.75rem; margin-bottom: 4px;">상세 주소</div>
                                        <div style="color: #fff; font-size: 0.9rem; line-height: 1.4;">${user.address || '-'}</div>
                                    </div>
                                </div>

                                <div style="padding: 16px; border-radius: 16px; background: rgba(242, 203, 79, 0.05); border: 1px solid rgba(242, 203, 79, 0.1); margin-bottom: 24px;">
                                    <div style="color: #f2cb4f; font-size: 0.8rem; font-weight: 800; margin-bottom: 8px;"><i class="fas fa-sticky-note"></i> 지도자 메모 / 특이사항</div>
                                    <p style="margin: 0; color: #cbd5e1; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap;">${user.memo || '기록된 내용이 없습니다.'}</p>
                                </div>

                                <h4 style="color: #00d2ff; font-size: 0.9rem; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-history"></i> 수강 및 가입 이력 (History)</h4>
                                <div style="background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); overflow: hidden;">
                                    ${user.history && user.history.length > 0 ?
                    `<div style="display: flex; flex-direction: column; max-height: 300px; overflow-y: auto;">
                                            ${[...user.history].reverse().map((h, idx) => `
                                                <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); border-left: 4px solid ${idx === 0 ? '#00d2ff' : 'transparent'}; background: ${idx === 0 ? 'rgba(0, 210, 255, 0.03)' : 'transparent'};">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                        <span style="color: #fff; font-size: 0.85rem; font-weight: 700;">${h.role} (${h.duration || '1'}개월)</span>
                                                        ${idx === 0 ? '<span style="font-size: 0.65rem; color: #00d2ff; border: 1px solid #00d2ff; padding: 1px 4px; border-radius: 4px; font-weight: 800;">LATEST</span>' : ''}
                                                    </div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                                        <span style="color: #94a3b8; font-size: 0.8rem;">${h.startDate} ~ ${h.endDate || ''}</span>
                                                        ${h.group ? `<span style="color: #64748b; font-size: 0.75rem;">${h.group}</span>` : ''}
                                                    </div>
                                                    ${h.memo ? `<div style="color: #7bc2b7; font-size: 0.7rem; margin-top: 4px; font-style: italic;">* ${h.memo}</div>` : ''}
                                                </div>
                                            `).join('')}
                                        </div>` :
                    `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 0.85rem;">기록된 이력이 없습니다.</div>`
                }
                                </div>
                            </div>
                            
                            <!-- [회원정보 수정 모드 폼 추가구현] -->
                            <div id="member-edit-mode" style="display: none;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                                    <label style="color: #64748b; font-size: 0.75rem;">이름 <input type="text" id="edit-name" value="${user.name}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    <label style="color: #64748b; font-size: 0.75rem;">고유번호(ID) <input type="text" id="edit-id" value="${user.id}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                </div>
                                
                                <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0 0 12px;"><i class="fas fa-layer-group"></i> 소속 및 멤버십 정보</h4>
                                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px; display: grid; gap: 12px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">등급
                                            <select id="edit-role" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;">
                                                <option value="Basic" ${role === 'basic' ? 'selected' : ''}>Basic</option>
                                                <option value="Semi" ${role === 'semi' ? 'selected' : ''}>Semi</option>
                                                <option value="Pro" ${role === 'pro' ? 'selected' : ''}>Pro</option>
                                                <option value="Ultimate" ${role === 'ultimate' ? 'selected' : ''}>Ultimate</option>
                                                <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin (관리자)</option>
                                            </select>
                                        </label>
                                        <label style="color: #64748b; font-size: 0.75rem;">소속 그룹 <input type="text" id="edit-group" value="${user.group || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">최초 가입일 <input type="text" id="edit-joindate" value="${user.joinDate || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">멤버십 만료일 <input type="text" id="edit-enddate" value="${user.membershipEnd || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                </div>

                                <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0 0 12px;"><i class="fas fa-id-card"></i> 신체 및 개인 프로필 정보</h4>
                                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px; display: grid; gap: 12px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">성별 <input type="text" id="edit-gender" value="${user.gender || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">생년월일 <input type="text" id="edit-birth" value="${user.birthDate || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">학년 <input type="text" id="edit-grade" value="${user.gradeLevel || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">학교/어린이집 <input type="text" id="edit-school" value="${user.school || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">신장(cm) <input type="text" id="edit-height" value="${user.height || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">체중(kg) <input type="text" id="edit-weight" value="${user.weight || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">아버지 성함 <input type="text" id="edit-father" value="${user.fatherName || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">어머니 성함 <input type="text" id="edit-mother" value="${user.motherName || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <label style="color: #64748b; font-size: 0.75rem;">셔틀 이용 <input type="text" id="edit-shuttle" value="${user.shuttle || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                        <label style="color: #64748b; font-size: 0.75rem;">유니폼 지급 여부 <input type="text" id="edit-uniform" value="${user.uniformInfo || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    </div>
                                </div>

                                <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0 0 12px;"><i class="fas fa-map-marker-alt"></i> 거주지 및 연락처 수정</h4>
                                <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px; display: grid; gap: 12px;">
                                    <label style="color: #64748b; font-size: 0.75rem;">연락처 <input type="text" id="edit-phone" value="${user.phone || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    <label style="color: #64748b; font-size: 0.75rem;">상세 주소 <input type="text" id="edit-address" value="${user.address || ''}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                </div>
                                
                                <h4 style="color: #f2cb4f; font-size: 0.9rem; margin: 0 0 12px;"><i class="fas fa-sticky-note"></i> 메모 (관리자 전용)</h4>
                                <div style="background: rgba(242, 203, 79, 0.05); padding: 16px; border-radius: 16px; border: 1px solid rgba(242, 203, 79, 0.1); margin-bottom: 24px;">
                                    <textarea id="edit-memo" style="width: 100%; height: 80px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; resize: none;">${user.memo || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <div id="tab-content-fitness" style="display: none;">
                            <div id="fitness-view-mode">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                                    <h4 style="color: #7bc2b7; font-size: 0.9rem; margin: 0; display: flex; align-items: center; gap: 6px;"><i class="fas fa-chart-line"></i> 시즌별 분석 데이터</h4>
                                    <div style="display: flex; gap: 10px;">
                                        <select id="fitness-season-select" onchange="window.changeFitnessSeason(this.value, '${user.id}')" style="background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 6px 12px; font-size: 0.85rem; outline: none; cursor: pointer;">
                                            ${(user.fitnessTests && user.fitnessTests.length > 0) ? user.fitnessTests.map((ft, idx) => `<option value="${idx}">${ft.label} (${ft.date})</option>`).join('') : '<option value="-1">기록 없음</option>'}
                                        </select>
                                        <button onclick="window.toggleFitnessEditMode()" style="background: rgba(123, 194, 183, 0.1); border: 1px solid #7bc2b7; color: #7bc2b7; border-radius: 10px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem; transition: 0.3s; font-weight: 600;"><i class="fas fa-plus"></i> 추가/수정</button>
                                    </div>
                                </div>

                                <div style="background: rgba(255,255,255,0.02); border-radius: 20px; padding: 24px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px;">
                                    <div style="display: flex; justify-content: center; align-items: center; min-height: 280px; position: relative;">
                                        ${(user.fitnessTests && user.fitnessTests.length > 0) ? '<canvas id="fitnessRadarChart" style="max-width: 100%;"></canvas>' : '<div style="color: #64748b; font-size: 0.9rem;">등록된 체력 검정 기록이 없습니다.</div>'}
                                    </div>
                                    <div id="fitness-pdf-area" style="margin-top: 20px; display: flex; justify-content: center;">
                                        <!-- PDF 리포트 버튼 동적 렌더링 -->
                                    </div>
                                </div>

                                <div id="fitness-records-table">
                                    <h5 style="color: #64748b; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Detailed Metrics</h5>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="fitness-metrics-grid">
                                        <!-- JS에서 측정 기록 카드들이 삽입됨 -->
                                    </div>
                                </div>
                            </div>

                        <!-- 체력 검정 편집 모드 -->
                        <div id="fitness-edit-mode" style="display: none;">
                            <div style="background: rgba(255,255,255,0.02); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.05);">
                                <h5 style="color: #7bc2b7; font-size: 0.85rem; margin: 0 0 16px;"><i class="fas fa-plus-circle"></i> 측정 데이터 입력</h5>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                                    <label style="color: #64748b; font-size: 0.75rem;">측정 시즌 <input type="text" id="fit-label" placeholder="예: 2024 상반기" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px;"></label>
                                    <label style="color: #64748b; font-size: 0.75rem;">측정 일자 <input type="date" id="fit-date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1e293b; color: #fff; margin-top: 4px; color-scheme: dark;"></label>
                                </div>

                                <div style="background: rgba(74, 222, 128, 0.05); padding: 18px; border-radius: 20px; border: 1px solid rgba(74, 222, 128, 0.2); margin-bottom: 24px; position: relative; overflow: hidden;">
                                    <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, transparent 70%);"></div>
                                    <div style="color: #4ade80; font-size: 0.85rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><i class="fas fa-robot"></i> AI 리포트 스캔 및 데이터 자동 입력</div>
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <div style="display: flex; align-items: center; gap: 10px; background: #0f172a; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                                            <input type="file" id="fit-pdf-file" accept=".pdf, .ppt, .pptx, image/*" style="font-size: 0.8rem; color: #cbd5e1; flex: 1;" onchange="window.analyzeFitnessFile(event)">
                                            <button onclick="window.processFitnessAI()" style="background: var(--primary); color: #000; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; cursor: pointer; white-space: nowrap; transition: 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                                <i class="fas fa-magic"></i> 데이터 읽어오기
                                            </button>
                                        </div>
                                        <div id="fit-pdf-status" style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; padding-left: 4px;">* 파일을 선택한 후 <b>[데이터 읽어오기]</b>를 클릭하면 AI가 측정 지표를 자동으로 스캔합니다.</div>
                                    </div>
                                </div>

                                <h5 style="color: #64748b; font-size: 0.75rem; font-weight: 800; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
                                    <span style="flex:1; height: 1px; background: rgba(255,255,255,0.05);"></span>
                                    인공지능 정밀 스캔 지표 (AI Measured Metrics)
                                    <span style="flex:1; height: 1px; background: rgba(255,255,255,0.05);"></span>
                                </h5>

                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">10m 스프린트 (초)
                                            <input type="number" id="fit-rec-sprint10m" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">20m 스프린트 (초 / 10m왕복)
                                            <input type="number" id="fit-rec-sprint20m" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">10m 드리블 (초)
                                            <input type="number" id="fit-rec-dribble10m" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">20m 드리블 (초 / 10m왕복)
                                            <input type="number" id="fit-rec-dribble20m" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">콘(10개) 드리블 (초)
                                            <input type="number" id="fit-rec-cone10m" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">제자리 멀리뛰기 (cm)
                                            <input type="number" id="fit-rec-longjump" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">Trunk Lift (cm)
                                            <input type="number" id="fit-rec-trunklift" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">스쿼트 (1분당 횟수)
                                            <input type="number" id="fit-rec-squat" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">눈감고 균형잡기 왼발 (초)
                                            <input type="number" id="fit-rec-balanceL" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                        <label style="color: #cbd5e1; font-size: 0.75rem;">눈감고 균형잡기 오른발 (초)
                                            <input type="number" id="fit-rec-balanceR" step="0.001" style="width: 100%; padding: 10px; border-radius: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; margin-top: 5px;">
                                        </label>
                                    </div>
                                </div>

                                <h5 style="color: #64748b; font-size: 0.75rem; font-weight: 800; margin-bottom: 12px; text-transform: uppercase;">Radar Chart Analysis (Auto-Calculated)</h5>
                                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 25px;">
                                    <label style="color: #94a3b8; font-size: 0.65rem; text-align: center;">스피드 <input type="number" id="fit-score-speed" min="0" max="5" step="0.1" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: var(--primary); text-align: center; margin-top: 4px; font-weight: 800;"></label>
                                    <label style="color: #94a3b8; font-size: 0.65rem; text-align: center;">드리블 <input type="number" id="fit-score-dribble" min="0" max="5" step="0.1" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: var(--primary); text-align: center; margin-top: 4px; font-weight: 800;"></label>
                                    <label style="color: #94a3b8; font-size: 0.65rem; text-align: center;">공감각 <input type="number" id="fit-score-agility" min="0" max="5" step="0.1" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: var(--primary); text-align: center; margin-top: 4px; font-weight: 800;"></label>
                                    <label style="color: #94a3b8; font-size: 0.65rem; text-align: center;">근력 <input type="number" id="fit-score-power" min="0" max="5" step="0.1" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: var(--primary); text-align: center; margin-top: 4px; font-weight: 800;"></label>
                                    <label style="color: #94a3b8; font-size: 0.65rem; text-align: center;">밸런스 <input type="number" id="fit-score-balance" min="0" max="5" step="0.1" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: var(--primary); text-align: center; margin-top: 4px; font-weight: 800;"></label>
                                </div>

                                <button onclick="window.saveFitnessData('${user.id}')" style="width: 100%; padding: 12px; border-radius: 12px; border: none; background: linear-gradient(135deg, #7bc2b7, #1a6aa3); color: #fff; font-weight: 700; cursor: pointer; margin-bottom: 8px;">시즌 데이터 저장</button>
                                <button onclick="window.toggleFitnessEditMode()" style="width: 100%; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #64748b; font-weight: 600; cursor: pointer;">취소</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 20px 24px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); display: flex; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); border-radius: 0 0 32px 32px;" id="member-action-btns">
                    <button onclick="window.toggleEditMember()" id="btn-toggle-edit" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; border: 1px solid #7bc2b7; background: rgba(123, 194, 183, 0.05); color: #7bc2b7; font-weight: 700; cursor: pointer; transition: 0.3s;"><i class="fas fa-user-edit"></i> 회원정보 수정</button>
                    <button onclick="window.adminDeleteMember('${user.id}')" id="btn-delete" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; border: 1px solid #ef4444; background: rgba(239, 68, 68, 0.05); color: #ef4444; font-weight: 700; cursor: pointer; transition: 0.3s;"><i class="fas fa-trash-alt"></i> 회원 삭제</button>
                    
                    <button onclick="window.saveMemberDetail('${user.id}')" id="btn-save" style="display: none; flex: 2; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; border: none; background: #7bc2b7; color: #000; font-weight: 800; cursor: pointer; transition: 0.3s;"><i class="fas fa-check-circle"></i> 변경내용 저장하기</button>
                    <button onclick="window.toggleEditMember()" id="btn-cancel" style="display: none; flex: 1; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #94a3b8; font-weight: 700; cursor: pointer;">취소</button>
                </div>
            </div>
        `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            console.log("Modal inserted into DOM");
        } catch (err) {
            console.error("Error in showMemberDetail:", err);
            alert("상세 정보를 불러오는 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
        }
    };

    window.toggleEditMember = () => {
        const viewMode = document.getElementById('member-view-mode');
        const editMode = document.getElementById('member-edit-mode');
        const btnEdit = document.getElementById('btn-toggle-edit');
        const btnDelete = document.getElementById('btn-delete');
        const btnSave = document.getElementById('btn-save');
        const btnCancel = document.getElementById('btn-cancel');

        if (editMode.style.display === 'none') {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            btnEdit.style.display = 'none';
            btnDelete.style.display = 'none';
            btnSave.style.display = 'flex';
            btnSave.style.justifyContent = 'center';
            btnSave.style.alignItems = 'center';
            btnSave.style.gap = '5px';
            btnCancel.style.display = 'block';
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            btnEdit.style.display = 'inline-block';
            btnDelete.style.display = 'inline-block';
            btnSave.style.display = 'none';
            btnCancel.style.display = 'none';
        }
    };

    window.saveMemberDetail = (currentUserId) => {
        const userIdx = state.users.findIndex(u => u.id === currentUserId);
        if (userIdx === -1) return;

        const newId = document.getElementById('edit-id').value.trim();
        const newName = document.getElementById('edit-name').value.trim();
        const newRole = document.getElementById('edit-role').value;
        const newEndDate = document.getElementById('edit-enddate').value;
        const newJoinDate = document.getElementById('edit-joindate').value.replace(/-/g, '.');
        const newGroup = document.getElementById('edit-group').value.trim();
        const newGender = document.getElementById('edit-gender').value.trim();
        const newGrade = document.getElementById('edit-grade').value.trim();
        const newSchool = document.getElementById('edit-school').value.trim();
        const newBirth = document.getElementById('edit-birth').value.trim();
        const newHeight = document.getElementById('edit-height').value.trim();
        const newWeight = document.getElementById('edit-weight').value.trim();
        const newFather = document.getElementById('edit-father').value.trim();
        const newMother = document.getElementById('edit-mother').value.trim();
        const newShuttle = document.getElementById('edit-shuttle').value.trim();
        const newUniform = document.getElementById('edit-uniform').value.trim();
        const newAddress = document.getElementById('edit-address').value.trim();
        const newPhone = document.getElementById('edit-phone').value.trim();
        const newMemo = document.getElementById('edit-memo').value;

        // 스탯 수집
        const s1 = parseInt(document.getElementById('edit-stat-speed')?.value || '30');
        const s2 = parseInt(document.getElementById('edit-stat-flex')?.value || '30');
        const s3 = parseInt(document.getElementById('edit-stat-stam')?.value || '30');
        const s4 = parseInt(document.getElementById('edit-stat-str')?.value || '30');
        const s5 = parseInt(document.getElementById('edit-stat-react')?.value || '30');
        const newStats = [s1, s2, s3, s4, s5];

        // 수강 이력(history) 수집
        const histLength = parseInt(document.getElementById('edit-hist-length')?.value || '1');
        const newHistory = [];
        for (let i = 0; i < histLength; i++) {
            newHistory.push({
                role: document.getElementById(`edit-hist-role-${i}`)?.value || '',
                duration: document.getElementById(`edit-hist-dur-${i}`)?.value || '',
                startDate: document.getElementById(`edit-hist-start-${i}`)?.value.replace(/-/g, '.') || '',
                endDate: document.getElementById(`edit-hist-end-${i}`)?.value.replace(/-/g, '.') || '',
                group: document.getElementById(`edit-hist-group-${i}`)?.value || '',
                frequency: document.getElementById(`edit-hist-freq-${i}`)?.value || '',
                memo: document.getElementById(`edit-hist-memo-${i}`)?.value || '',
                fee: state.users[userIdx].history?.[i]?.fee || '' // 기존 fee는 유지
            });
        }

        if (!newName || !newId) return alert("이름과 아이디(고유번호)는 필수 입력입니다.");

        // ID가 변경된 경우 중복 체크
        if (newId !== currentUserId) {
            if (state.users.some(u => u.id === newId)) {
                return alert("이미 존재하는 아이디(고유번호)입니다. 다른 번호를 사용해주세요.");
            }
        }

        const updatedUser = {
            ...state.users[userIdx],
            id: newId,
            name: newName,
            role: newRole,
            membershipEnd: newEndDate ? newEndDate.replace(/-/g, '.') : state.users[userIdx].membershipEnd,
            joinDate: newJoinDate || state.users[userIdx].joinDate,
            group: newGroup,
            gender: newGender,
            gradeLevel: newGrade,
            school: newSchool,
            birthDate: newBirth,
            height: newHeight,
            weight: newWeight,
            fatherName: newFather,
            motherName: newMother,
            shuttle: newShuttle,
            uniformInfo: newUniform,
            address: newAddress,
            phone: newPhone,
            memo: newMemo,
            stats: newStats,
            history: newHistory
        };

        state.users[userIdx] = updatedUser;
        localStorage.setItem('soccer_users', JSON.stringify(state.users));

        // ID 변경 시 Firebase 처리: 예전 문서 삭제 후 새 문서로 저장
        if (db) {
            if (newId !== currentUserId) {
                db.collection("users").doc(currentUserId).delete().then(() => {
                    db.collection("users").doc(newId).set(updatedUser).catch(e => console.error(e));
                }).catch(e => console.error(e));
            } else {
                db.collection("users").doc(currentUserId).update(updatedUser).catch(e => console.error("Update Error:", e));
            }
        }

        alert("회원 정보가 성공적으로 수정되었습니다.");

        document.getElementById('member-detail-modal').remove();
        renderAdminTab('admin-users');
        window.showMemberDetail(newId);
    };

    // === [ 체력 검정 (Fitness Test) 탭 관리 함수들 ] ===
    window.switchMemberDetailTab = (tab) => {
        const infoBtn = document.getElementById('tab-btn-info');
        const fitBtn = document.getElementById('tab-btn-fitness');
        const infoContent = document.getElementById('tab-content-info');
        const fitContent = document.getElementById('tab-content-fitness');

        if (tab === 'info') {
            infoBtn.style.color = '#7bc2b7';
            infoBtn.style.borderBottom = '2px solid #7bc2b7';
            fitBtn.style.color = '#64748b';
            fitBtn.style.borderBottom = '2px solid transparent';
            infoContent.style.display = 'block';
            fitContent.style.display = 'none';
        } else {
            fitBtn.style.color = '#7bc2b7';
            fitBtn.style.borderBottom = '2px solid #7bc2b7';
            infoBtn.style.color = '#64748b';
            infoBtn.style.borderBottom = '2px solid transparent';
            infoContent.style.display = 'none';
            fitContent.style.display = 'block';

            // 탭 전환 시 차트 및 데이터 로드
            const selectEl = document.getElementById('fitness-season-select');
            if (selectEl && selectEl.value !== "-1") {
                const nameNode = document.getElementById('modal-member-name');
                const userIdMatch = nameNode ? nameNode.textContent.match(/\((.*?)\)/) : null;
                const userId = userIdMatch ? userIdMatch[1] : null;
                if (userId) window.changeFitnessSeason(selectEl.value, userId);
            }
        }
    };

    let fitnessRadarChartInstance = null;

    window.changeFitnessSeason = (idxStr, userId) => {
        const user = state.users.find(u => u.id === userId);
        if (!user || !user.fitnessTests || user.fitnessTests.length === 0) return;

        const idx = parseInt(idxStr);
        if (isNaN(idx) || idx < 0 || idx >= user.fitnessTests.length) return;

        const ft = user.fitnessTests[idx];

        // 1. 세부 측정 기록 카드 렌더링
        const grid = document.getElementById('fitness-metrics-grid');
        if (grid) {
            const records = ft.records || {};
            const metricList = [
                { label: '10m 스프린트', key: 'sprint10m', unit: '초', category: 'Speed' },
                { label: '20m 스프린트', key: 'sprint20m', unit: '초', category: 'Speed' },
                { label: '10m 드리블', key: 'dribble10m', unit: '초', category: 'Dribble' },
                { label: '20m 드리블', key: 'dribble20m', unit: '초', category: 'Dribble' },
                { label: 'T Test', key: 'ttest', unit: '초', category: 'Agility' },
                { label: '제자리 멀리뛰기', key: 'longjump', unit: 'cm', category: 'Power' },
                { label: '스쿼트', key: 'squat', unit: '회', category: 'Power' },
                { label: '푸쉬업', key: 'pushup', unit: '회', category: 'Power' },
                { label: '눈감고 균형잡기(좌)', key: 'balanceL', unit: '초', category: 'Balance' },
                { label: '눈감고 균형잡기(우)', key: 'balanceR', unit: '초', category: 'Balance' }
            ];

            grid.innerHTML = metricList.map(m => `
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #64748b; font-size: 0.65rem; margin-bottom: 2px;">${m.category}</div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="color: #cbd5e1; font-size: 0.75rem;">${m.label}</span>
                        <span style="color: #fff; font-size: 0.9rem; font-weight: 700;">${records[m.key] || '-'} <small style="font-size: 0.6rem; color: #64748b;">${m.unit}</small></span>
                    </div>
                </div>
            `).join('');
        }
        // 2. PDF 리포트 리스트 렌더링
        const pdfArea = document.getElementById('fitness-pdf-area');
        if (pdfArea) {
            if (ft.pdfUrl) {
                pdfArea.innerHTML = `
                    <a href="${ft.pdfUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; text-decoration: none; transition: 0.3s;">
                        <i class="fas fa-file-pdf"></i> 스마트 핏 리포트 열기
                    </a>
                `;
            } else {
                pdfArea.innerHTML = '<span style="color: #64748b; font-size: 0.8rem;">등록된 리포트가 없습니다.</span>';
            }
        }

        // 3. 레이더 차트 업데이트
        const scores = ft.scores || [0, 0, 0, 0, 0];
        const canvas = document.getElementById('fitnessRadarChart');
        if (canvas) {
            if (window.fitnessRadarChartInstance) {
                window.fitnessRadarChartInstance.destroy();
            }
            const ctx = canvas.getContext('2d');
            window.fitnessRadarChartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['스피드', '드리블', '공감각', '근력', '밸런스'],
                    datasets: [{
                        label: ft.label || '체력 스탯',
                        data: scores,
                        backgroundColor: 'rgba(123, 194, 183, 0.2)',
                        borderColor: '#7bc2b7',
                        borderWidth: 2,
                        pointBackgroundColor: '#7bc2b7',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#7bc2b7'
                    }]
                },
                options: {
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: { color: '#94a3b8', font: { size: 11, weight: '600' } },
                            ticks: { display: false, stepSize: 1 },
                            suggestedMin: 0,
                            suggestedMax: 5
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    };
    window.toggleFitnessEditMode = () => {
        const viewMode = document.getElementById('fitness-view-mode');
        const editMode = document.getElementById('fitness-edit-mode');
        if (!viewMode || !editMode) return;

        if (editMode.style.display === 'none') {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';

            // 신규 입력 폼 초기화 로직 (새로운 UI에는 시즌 선택 셀렉트박스가 없으므로 직접 초기화)
            const userId = document.getElementById('modal-member-name').textContent.match(/\((.*?)\)/)?.[1];
            if (userId) window.loadFitnessForm('new', userId);
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';

            // 뷰모드 돌아갈 때 차트 업데이트
            const selVal = document.getElementById('fitness-season-select')?.value;
            const userId = document.getElementById('modal-member-name').textContent.match(/\((.*?)\)/)?.[1];
            if (userId && selVal !== "-1") window.changeFitnessSeason(selVal, userId);
        }
    };

    window.loadFitnessForm = (selectedVal, userId) => {
        const user = state.users.find(u => u.id === userId);
        const btnDelete = document.getElementById('btn-delete-fitness');

        if (selectedVal === 'new') {
            document.getElementById('fit-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('fit-label').value = `시즌 ${(user?.fitnessTests?.length || 0) + 1} 체력 테스트`;

            ['speed', 'dribble', 'agility', 'power', 'balance'].forEach(k => document.getElementById(`fit-score-${k}`).value = '');
            ['sprint10m', 'sprint20m', 'dribble10m', 'dribble20m', 'cone10m', 'longjump', 'trunklift', 'squat', 'balanceL', 'balanceR'].forEach(k => {
                const el = document.getElementById(`fit-rec-${k}`);
                if (el) el.value = '';
            });
            if (btnDelete) btnDelete.style.display = 'none';
            document.getElementById('fit-pdf-status').innerText = '* 선택하지 않으면 등록되지 않습니다.';
        } else {
            const idx = parseInt(selectedVal);
            if (!user || isNaN(idx)) return;
            const ft = user.fitnessTests[idx];
            if (!ft) return;

            document.getElementById('fit-date').value = ft.date ? ft.date.replace(/\./g, '-') : new Date().toISOString().split('T')[0];
            document.getElementById('fit-label').value = ft.label || '';

            const s = ft.scores || [3, 3, 3, 3, 3];
            document.getElementById('fit-score-speed').value = s[0];
            document.getElementById('fit-score-dribble').value = s[1];
            document.getElementById('fit-score-agility').value = s[2];
            document.getElementById('fit-score-power').value = s[3];
            document.getElementById('fit-score-balance').value = s[4];

            const r = ft.records || {};
            ['sprint10m', 'sprint20m', 'dribble10m', 'dribble20m', 'cone10m', 'longjump', 'trunklift', 'squat', 'balanceL', 'balanceR'].forEach(k => {
                const el = document.getElementById(`fit-rec-${k}`);
                if (el) el.value = r[k] !== undefined ? r[k] : '';
            });

            if (btnDelete) btnDelete.style.display = 'block';
            document.getElementById('fit-pdf-status').innerText = ft.pdfUrl ? `* 기존 PDF 파일이 등록되어 있습니다. 변경하려면 새 파일을 선택하세요.` : `* 선택하지 않으면 등록되지 않습니다.`;
        }
    };

    window.saveFitnessData = async (currentUserId) => {
        const userIdx = state.users.findIndex(u => u.id === currentUserId);
        if (userIdx === -1) return;
        const user = state.users[userIdx];

        const selectedVal = document.getElementById('edit-fitness-season').value;
        const dateStr = document.getElementById('fit-date').value.replace(/-/g, '.');
        const labelStr = document.getElementById('fit-label').value.trim() || '시즌 체력 테스트';

        const parseNum = (id) => {
            const val = document.getElementById(id).value;
            return val === '' ? null : Number(val);
        };

        const scores = [
            parseNum('fit-score-speed') || 0,
            parseNum('fit-score-dribble') || 0,
            parseNum('fit-score-agility') || 0,
            parseNum('fit-score-power') || 0,
            parseNum('fit-score-balance') || 0
        ];

        const records = {
            sprint10m: parseNum('fit-rec-sprint10m'),
            sprint20m: parseNum('fit-rec-sprint20m'),
            dribble10m: parseNum('fit-rec-dribble10m'),
            dribble20m: parseNum('fit-rec-dribble20m'),
            cone10m: parseNum('fit-rec-cone10m'),
            longjump: parseNum('fit-rec-longjump'),
            trunklift: parseNum('fit-rec-trunklift'),
            squat: parseNum('fit-rec-squat'),
            balanceL: parseNum('fit-rec-balanceL'),
            balanceR: parseNum('fit-rec-balanceR')
        };

        let newPdfUrl = null;
        if (selectedVal !== 'new' && !isNaN(parseInt(selectedVal)) && user.fitnessTests[parseInt(selectedVal)].pdfUrl) {
            newPdfUrl = user.fitnessTests[parseInt(selectedVal)].pdfUrl; // 기존 파일 유지
        }

        const newData = {
            date: dateStr,
            label: labelStr,
            scores: scores,
            records: records,
            pdfUrl: newPdfUrl
        };

        // --- [핵심] 최신 체력 검정 스탯을 메인 유저 스탯에 동기화 ---
        user.stats = [...scores];

        const fileInput = document.getElementById('fit-pdf-file');
        const file = fileInput ? fileInput.files[0] : null;

        // 파일 업로드 처리
        if (file && window.firebase) {
            try {
                // UI 블락 (로딩)
                document.getElementById('member-detail-modal').style.pointerEvents = 'none';
                document.getElementById('member-detail-modal').style.opacity = '0.7';

                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(`fitness_reports/${currentUserId}/${Date.now()}_${file.name}`);
                const snapshot = await fileRef.put(file);
                newData.pdfUrl = await snapshot.ref.getDownloadURL();
            } catch (error) {
                console.error("File Upload Error:", error);
                alert("파일 업로드 중 오류가 발생했습니다. 기록만 먼저 저장합니다.");
            } finally {
                document.getElementById('member-detail-modal').style.pointerEvents = 'auto';
                document.getElementById('member-detail-modal').style.opacity = '1';
                finalizeAndSave(user, currentUserId, selectedVal);
            }
        } else {
            finalizeAndSave(user, currentUserId, selectedVal);
        }

        function finalizeAndSave(user, currentUserId, selectedVal) {
            if (!user.fitnessTests) user.fitnessTests = [];

            if (selectedVal === 'new') {
                user.fitnessTests.push(newData);
            } else {
                const idx = parseInt(selectedVal);
                if (!isNaN(idx)) {
                    user.fitnessTests[idx] = newData;
                }
            }

            // Firebase & LocalStorage 동시 업데이트
            localStorage.setItem('soccer_users', JSON.stringify(state.users));
            if (db) {
                db.collection("users").doc(currentUserId.toString()).update({
                    fitnessTests: user.fitnessTests,
                    stats: user.stats
                }).catch(e => console.error(e));
            }

            alert("체력 검정 데이터가 성공적으로 반영되었습니다.");

            const modal = document.getElementById('member-detail-modal');
            if (modal) modal.remove();

            renderAdminTab('admin-users');
            window.showMemberDetail(currentUserId);

            // 다시 팝업 띄우고 피트니스 탭 개방
            setTimeout(() => {
                window.switchMemberDetailTab('fitness');
                if (user.fitnessTests && user.fitnessTests.length > 0) {
                    const newIdx = selectedVal === 'new' ? (user.fitnessTests.length - 1).toString() : selectedVal;
                    const selectEl = document.getElementById('fitness-season-select');
                    if (selectEl) {
                        selectEl.value = newIdx;
                        window.changeFitnessSeason(newIdx, currentUserId);
                    }
                }
            }, 80);
        }
    };

    window.deleteFitnessData = (currentUserId) => {
        const selectedVal = document.getElementById('edit-fitness-season').value;
        if (selectedVal === 'new') return;

        if (!confirm("해당 시즌의 체력 검정 데이터를 정말 삭제하시겠습니까?")) return;

        const userIdx = state.users.findIndex(u => u.id === currentUserId);
        if (userIdx === -1) return;
        const user = state.users[userIdx];
        const idx = parseInt(selectedVal);

        if (!isNaN(idx) && user.fitnessTests) {
            user.fitnessTests.splice(idx, 1);

            localStorage.setItem('soccer_users', JSON.stringify(state.users));
            if (db) {
                db.collection("users").doc(currentUserId).update({ fitnessTests: user.fitnessTests }).catch(e => console.error(e));
            }
            alert("시즌 데이터가 삭제되었습니다.");

            document.getElementById('member-detail-modal').remove();
            renderAdminTab('admin-users');
            window.showMemberDetail(currentUserId);
            setTimeout(() => {
                window.switchMemberDetailTab('fitness');
            }, 80);
        }
    };

    window.adminDeleteMember = (userId) => {
        if (!confirm(`회원(${userId}) 정보를 정말 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없습니다.`)) return;

        state.users = state.users.filter(u => u.id !== userId);
        localStorage.setItem('soccer_users', JSON.stringify(state.users));

        if (db) {
            db.collection("users").doc(userId).delete().catch(e => console.error("Delete Error:", e));
        }

        const modal = document.getElementById('member-detail-modal');
        if (modal) modal.remove();

        renderAdminTab('admin-users');
        // alert("회원 정보가 삭제되었습니다."); // UI 꼬임을 방지하기 위해 alert 제거
    };

    window.adminAddNewMember = () => {
        const name = prompt("추가하실 회원의 이름을 입력하세요:\n(상세 정보와 ID는 생성 후 리스트 항목을 클릭하여 수정 가능합니다.)");
        if (!name || name.trim() === '') return;

        const duration = prompt("초기 등록 기간(개월)을 숫자로 입력하세요:\n(예: 1, 3, 6, 12 등)", "1");
        if (!duration) return;

        const baseId = 'new_' + Date.now().toString().slice(-6);
        const joinDate = new Date().toLocaleDateString();
        const role = parseInt(duration) >= 6 ? 'Pro' : (parseInt(duration) >= 3 ? 'Semi' : 'Basic');

        const tempUser = { membershipStart: joinDate, duration: duration };
        recalculateMembershipEnd(tempUser);

        const newUser = {
            id: baseId,
            pw: '1234',
            name: name,
            role: role,
            duration: duration,
            avatar: 'fa-user',
            joinDate: joinDate,
            membershipStart: joinDate,
            membershipEnd: tempUser.membershipEnd,
            history: [{
                role: role,
                duration: duration,
                startDate: joinDate,
                endDate: tempUser.membershipEnd,
                fee: '',
                group: '',
                frequency: '',
                memo: ''
            }]
        };

        state.users.push(newUser);
        localStorage.setItem('soccer_users', JSON.stringify(state.users));
        if (db) db.collection("users").doc(baseId).set(newUser).catch(e => console.error(e));

        renderAdminTab('admin-users');
        alert(`신규 회원 [${name}]님이 추가되었습니다!\n목록 최하단 또는 검색을 통해 확인하신 후, 항목을 클릭해서 고유번호(ID)와 상세 정보를 수정해주세요.`);
    };

    window.renderAdminTab = (tabId) => {
        const contentDiv = document.getElementById('admin-tab-content');
        if (!contentDiv) return;

        // 버튼 활성화 상태 업데이트
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.color = 'var(--text-gray)';
            btn.style.fontWeight = 'normal';
            if (btn.dataset.target === tabId) {
                btn.classList.add('active');
                btn.style.color = 'var(--primary)';
                btn.style.fontWeight = 'bold';
            }
        });

        let html = '';
        switch (tabId) {
            case 'admin-users':
                html = renderAdminUsersTab();
                break;
            case 'admin-notices':
                html = renderAdminNoticesTab();
                break;
            case 'admin-badges':
                html = renderAdminBadgesTab();
                break;
            case 'admin-schedule':
                html = renderAdminScheduleTab();
                break;
        }

        contentDiv.innerHTML = html;
        contentDiv.scrollTop = 0;
    };

    window.adminUserFilter = window.adminUserFilter || 'all';
    window.adminUserSearch = window.adminUserSearch || '';

    window.setAdminUserFilter = (filter) => {
        window.adminUserFilter = filter;
        renderAdminTab('admin-users');
    };

    window.setAdminUserSearch = (query) => {
        window.adminUserSearch = String(query).trim();
        renderAdminTab('admin-users');
    };

    const renderAdminUsersTab = () => {
        const sortedUsers = [...state.users].sort((a, b) => {
            if (a.id === 'admin') return -1;
            if (b.id === 'admin') return 1;

            // 문자열 안의 첫 번째 연속된 숫자를 찾아 비교
            const numA = parseInt(String(a.id).match(/\d+/)?.[0] || '999999');
            const numB = parseInt(String(b.id).match(/\d+/)?.[0] || '999999');

            if (numA === numB) {
                // 숫자 부분이 같으면 전체 문자열로 비교 (예: 16-2 vs 16-3)
                return String(a.id).localeCompare(String(b.id));
            }
            return numA - numB;
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let warningHtml = '';
        const expiringUsers = [];

        sortedUsers.forEach(u => {
            if (u.membershipEnd) {
                const end = new Date(u.membershipEnd);
                end.setHours(0, 0, 0, 0);
                const diffTime = end - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 30 && diffDays >= 0) {
                    expiringUsers.push({ ...u, dDay: diffDays });
                } else if (diffDays < 0 && diffDays >= -7) {
                    expiringUsers.push({ ...u, dDay: diffDays }); // 이미 만료 (7일 이내만 표시)
                }
            }
        });

        const allCount = sortedUsers.filter(u => u.id !== 'admin').length;

        // 전체 유저 중 만료된 유저 수 계산 (expiringUsers 부분집합이 아닌 전체 기준)
        const expiredCount = sortedUsers.filter(u => {
            if (u.id === 'admin' || !u.membershipEnd) return false;
            const end = new Date(u.membershipEnd.replace(/-/g, '/')); // 모바일 호환성
            return end < today;
        }).length;

        const activeCount = allCount - expiredCount;

        let displayUsers = sortedUsers.filter(u => u.id !== 'admin');

        if (window.adminUserFilter === 'active') {
            displayUsers = displayUsers.filter(u => {
                const isExpired = u.membershipEnd && new Date(u.membershipEnd) < today;
                return !isExpired;
            });
        } else if (window.adminUserFilter === 'expired') {
            displayUsers = displayUsers.filter(u => {
                const isExpired = u.membershipEnd && new Date(u.membershipEnd) < today;
                return isExpired;
            });
        }

        if (window.adminUserSearch) {
            const query = window.adminUserSearch.toLowerCase();
            displayUsers = displayUsers.filter(u =>
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.id && String(u.id).toLowerCase().includes(query)) ||
                (u.phone && String(u.phone).toLowerCase().includes(query))
            );
        }

        if (expiringUsers.length > 0) {
            // D-day 오름차순 정렬
            expiringUsers.sort((a, b) => a.dDay - b.dDay);
            warningHtml = `
                <div class="card" style="background: rgba(40, 15, 15, 0.8); border: 1px solid #ff3b30; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="color: #ff3b30; margin-bottom: 10px; font-size: 1rem;"><i class="fas fa-exclamation-triangle"></i> 멤버십 만료 임박 / 만료 알림</h4>
                    <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                        ${expiringUsers.map(u => {
                let badgeInfo = '';
                if (u.dDay < 0) badgeInfo = `<span style="background: #ff3b30; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">만료됨</span>`;
                else if (u.dDay === 0) badgeInfo = `<span style="background: #ff9500; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">D-Day</span>`;
                else if (u.dDay <= 7) badgeInfo = `<span style="background: #ffcc00; color: black; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">D-${u.dDay}</span>`;
                else badgeInfo = `<span style="background: rgba(255,255,255,0.2); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">D-${u.dDay}</span>`;
                return `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px;">
                                    <span style="color: var(--text-white); font-size: 0.85rem; cursor: pointer;" onclick="window.showMemberDetail('${u.id}')">[${u.id}] ${u.name} <span style="font-size: 0.75rem; color: var(--text-gray);">(${u.membershipEnd})</span></span>
                                    ${badgeInfo}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        let html = `
            <div class="fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="color: var(--text-white); font-size: 1.1rem; margin: 0;">지트캠 회원 관리 (CRM) <span style="background: #ffcc00; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; margin-left: 8px;">v3.1.6 [FIX]</span></h3>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="window.syncLocalToFirebase()" title="로컬 데이터를 서버(DB)로 강제 전송합니다" style="background: rgba(255,165,0,0.1); border: 1px solid #ffa500; color: #ffa500; font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> DB 강제 동기화
                        </button>
                        <button onclick="window.adminAddNewMember()" style="background: rgba(0, 210, 255, 0.1); border: 1px solid var(--primary); color: var(--text-white); font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-user-plus"></i> 수동 등록
                        </button>
                        <button onclick="window.mergeDuplicateUsers()" title="이름과 연락처가 같은 중복 데이터를 하나로 합칩니다" style="background: rgba(123, 194, 183, 0.1); border: 1px solid #7bc2b7; color: #7bc2b7; font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-object-group"></i> 데이터 병합
                        </button>
                        <button onclick="window.triggerExcelImport()" style="background: rgba(255,255,255,0.1); border: 1px solid var(--border-glass); color: var(--text-white); font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-file-excel"></i> <span id="excel-import-status">엑셀 임포트</span>
                        </button>
                        <button onclick="window.adminResetUsers()" style="background: rgba(255, 59, 48, 0.1); border: 1px solid #ff3b30; color: #ff3b30; font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-trash-alt"></i> 초기화
                        </button>
                    </div>
                    <input type="file" id="excel-import-input" accept=".xlsx, .xls, .csv" style="display: none;" onchange="window.handleExcelImport(event)">
                </div>

                <div id="sync-status-msg" style="display:none; background: rgba(0,210,255,0.1); color: var(--primary); padding: 8px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 15px; border: 1px solid var(--primary); text-align: center;">
                    서버와 데이터를 동기화 중입니다...
                </div>

                ${warningHtml}

                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid var(--border-glass);">

                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid var(--border-glass);">
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                        <div onclick="window.setAdminUserFilter('all')" style="cursor: pointer; padding: 5px 10px; border-radius: 8px; background: ${window.adminUserFilter === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent'}; transition: all 0.2s;">
                            <span style="display: block; font-size: 0.8rem; color: var(--text-gray); margin-bottom: 5px;">전체 회원</span>
                            <span style="font-size: 1.5rem; font-weight: bold; color: white;">${allCount}<span style="font-size: 0.9rem; font-weight: normal; color: #888;"> 명</span></span>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div onclick="window.setAdminUserFilter('active')" style="cursor: pointer; padding: 5px 10px; border-radius: 8px; background: ${window.adminUserFilter === 'active' ? 'rgba(0, 210, 255, 0.1)' : 'transparent'}; transition: all 0.2s;">
                            <span style="display: block; font-size: 0.8rem; color: var(--text-gray); margin-bottom: 5px;">현재 등록 (활동중)</span>
                            <span style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${activeCount}<span style="font-size: 0.9rem; font-weight: normal; color: #888;"> 명</span></span>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div onclick="window.setAdminUserFilter('expired')" style="cursor: pointer; padding: 5px 10px; border-radius: 8px; background: ${window.adminUserFilter === 'expired' ? 'rgba(255, 59, 48, 0.1)' : 'transparent'}; transition: all 0.2s;">
                            <span style="display: block; font-size: 0.8rem; color: var(--text-gray); margin-bottom: 5px;">만료/탈퇴</span>
                            <span style="font-size: 1.5rem; font-weight: bold; color: #ff3b30;">${expiredCount}<span style="font-size: 0.9rem; font-weight: normal; color: #888;"> 명</span></span>
                        </div>
                    </div>
                </div>

                <!-- 검색 창 -->
                <div style="margin-bottom: 20px; position: relative; display: flex; gap: 10px;">
                    <div style="position: relative; flex: 1;">
                        <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-gray);"></i>
                        <input type="text" id="admin-search-input" value="${window.adminUserSearch}" onkeyup="if(event.key === 'Enter') window.setAdminUserSearch(this.value)" placeholder="이름, 고유번호(ID) 또는 연락처로 검색 (엔터)" style="width: 100%; background: rgba(20,25,35,0.8); border: 1px solid var(--border-glass); padding: 12px 12px 12px 40px; border-radius: 8px; color: white; outline: none; font-size: 0.9rem;">
                    </div>
                    <button onclick="window.setAdminUserSearch(document.getElementById('admin-search-input').value)" style="background: var(--primary); color: #000; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">검색</button>
                    ${window.adminUserSearch ? `<button onclick="window.setAdminUserSearch('')" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid var(--border-glass); padding: 0 15px; border-radius: 8px; cursor: pointer;"><i class="fas fa-times"></i></button>` : ''}
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${displayUsers.length === 0 ? `<div style="text-align: center; color: var(--text-gray); padding: 20px;">검색 결과가 없습니다.</div>` : ''}
        `;

        displayUsers.forEach(u => {
            const role = (u.role || 'Basic').toLowerCase();
            const isExpired = u.membershipEnd && new Date(u.membershipEnd) < today;

            let roleColor = '#f06958'; // Basic (Red)
            if (role.includes('ultimate') || role.includes('vip')) roleColor = '#1a6aa3'; // Ultimate (Blue)
            else if (role.includes('pro') || role.includes('player')) roleColor = '#7bc2b7'; // Pro (Teal)
            else if (role.includes('semi')) roleColor = '#f2cb4f'; // Semi (Yellow)

            if (isExpired) roleColor = '#808080'; // Expired (Gray)
            if (u.role === 'admin') roleColor = 'var(--primary)';

            // 나이 계산 (생년월일 기반, 예: '150428', '2015-04-28' 등)
            let ageDisplay = '';
            if (u.birthDate) {
                const birthStr = String(u.birthDate).replace(/[^0-9]/g, '');
                let birthYear = 0;
                if (birthStr.length === 6) { // YYMMDD
                    const prefix = parseInt(birthStr.substring(0, 2)) > 50 ? 1900 : 2000;
                    birthYear = prefix + parseInt(birthStr.substring(0, 2));
                } else if (birthStr.length >= 4) { // YYYY...
                    birthYear = parseInt(birthStr.substring(0, 4));
                }
                if (birthYear > 1900 && birthYear <= today.getFullYear()) {
                    const age = today.getFullYear() - birthYear + 1; // 한국 나이(연 나이+1) 혹은 만 나이 혼용 대비 단순히 (올해-태어난해+1 혹은 0)
                    ageDisplay = ` / ${age}세`;
                }
            }

            html += `
                <div class="card" style="background: rgba(20, 25, 35, 0.8); border: 2px solid ${isExpired ? '#444' : roleColor}; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; opacity: ${isExpired ? '0.7' : '1'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.showMemberDetail('${u.id}')">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--glass-bg); display: flex; justify-content: center; align-items: center; font-size: 1.2rem; color: ${roleColor};">
                                <i class="fas ${u.avatar || 'fa-user'}"></i>
                            </div>
                            <div>
                                <h4 style="color: var(--text-white); margin-bottom: 3px;">${u.name}${ageDisplay} <span style="font-size:0.75rem; color:var(--text-gray);">(${u.id})</span></h4>
                                <span style="font-size: 0.75rem; color: ${roleColor}; font-weight: bold;">${u.role || 'Basic'} ${isExpired ? '(만료)' : ''}</span>
                            </div>
                        </div>
                        <i class="fas fa-trash-alt" style="color: #ff3b30; font-size: 1.1rem; cursor: pointer; padding: 5px; opacity: 0.8;" onclick="event.stopPropagation(); window.adminDeleteMember('${u.id}')" title="이 회원 삭제"></i>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray);">학교/어린이집:</span>
                            <span style="color: var(--text-white);">${u.school || '-'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray);">주소:</span>
                            <span style="color: var(--text-white); text-align: right; word-break: keep-all; flex: 0.8;">${u.address || '-'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray);">차량운행:</span>
                            <span style="color: var(--text-white);">${u.shuttle || '-'}</span>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray); font-size: 0.8rem;">가입일:</span>
                            <span style="color: var(--text-white); font-size: 0.8rem;">${u.joinDate || 'YYYY-MM-DD'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray); font-size: 0.8rem;">시작일:</span>
                            <input type="date" value="${u.membershipStart || ''}" onchange="window.adminUpdateMembershipStart('${u.id}', this.value)" style="background: var(--glass-bg); color: var(--text-white); border: 1px solid var(--border-glass); padding: 3px 6px; border-radius: 4px; font-size: 0.8rem; outline: none; flex: 0.6; text-align: right; color-scheme: dark;">
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-gray); font-size: 0.8rem;">종료일:</span>
                            <span style="color: ${isExpired ? '#ff3b30' : 'var(--primary)'}; font-size: 0.8rem; font-weight: bold;">${u.membershipEnd || '미지정'}</span>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                        <span style="color: var(--text-gray); font-size: 0.85rem;">멤버쉽 등급 수정:</span>
                        <select onchange="window.adminUpdateMembership('${u.id}', this.value)" style="background: var(--glass-bg); color: var(--text-white); border: 1px solid var(--border-glass); padding: 5px 10px; border-radius: 6px; font-size: 0.85rem; outline: none; flex: 0.7;">
                            <option value="Basic" style="background: #0f172a; color: #ffffff;" ${u.role === 'Basic' || !u.role ? 'selected' : ''}>Basic (1개월)</option>
                            <option value="Semi" style="background: #0f172a; color: #ffffff;" ${u.role === 'Semi' ? 'selected' : ''}>Semi (3개월)</option>
                            <option value="Pro" style="background: #0f172a; color: #ffffff;" ${role.includes('pro') || role.includes('player') ? 'selected' : ''}>Pro (6개월)</option>
                            <option value="Ultimate" style="background: #0f172a; color: #ffffff;" ${role.includes('ultimate') || role.includes('vip') ? 'selected' : ''}>Ultimate (1년)</option>
                        </select>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        return html;
    };

    const renderAdminNoticesTab = () => {
        let html = `
            <div class="fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="color: var(--text-white); margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;"><i class="fas fa-bullhorn" style="color: var(--primary);"></i> 공지사항 관리 및 작성</h3>
                </div>

                <div class="card premium-card" style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(255,255,255,0.1); padding: 24px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; margin-bottom: 16px;">
                        <select id="admin-notice-category" style="background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: 700; outline: none; cursor: pointer; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%237bc2b7%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px auto; padding-right: 30px;">
                            <option value="공지">[공지]</option>
                            <option value="안내">[안내]</option>
                            <option value="수업스케치">[수업스케치]</option>
                            <option value="감독의 글">[감독의 글]</option>
                        </select>
                        <input type="text" id="admin-notice-title" placeholder="공지사항 제목을 입력하세요" style="background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px 18px; border-radius: 12px; outline: none; font-size: 1rem; font-weight: 500;">
                    </div>

                    <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        <button onclick="document.getElementById('admin-notice-file').click()" style="background: rgba(123, 194, 183, 0.1); color: var(--primary); border: 1px solid rgba(123, 194, 183, 0.3); padding: 10px 22px; border-radius: 12px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-weight: 700; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            <i class="fas fa-camera"></i> 사진/영상 라이브러리
                        </button>
                        <span id="admin-notice-file-name" style="font-size: 0.85rem; color: #94a3b8; font-style: italic;">선택된 파일 없음</span>
                        <input type="file" id="admin-notice-file" accept="image/*,video/*" style="display: none;" onchange="document.getElementById('admin-notice-file-name').innerText = this.files[0]?.name || '선택된 파일 없음'">
                    </div>

                    <textarea id="admin-notice-body" placeholder="공지할 내용을 자유롭게 작성하세요. 줄바꿈이 그대로 반영됩니다." style="width: 100%; height: 220px; background: #0f172a; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 18px; outline: none; font-size: 1rem; line-height: 1.7; margin-bottom: 24px; resize: none;"></textarea>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: #f06958; font-weight: 800; font-size: 0.95rem; user-select: none;">
                            <input type="checkbox" id="admin-notice-priority" style="width: 20px; height: 20px; accent-color: #f06958;">
                            <i class="fas fa-star"></i> 필독 게시물 (상단 고정 및 강조)
                        </label>
                        <button id="btn-admin-submit-notice" onclick="window.adminSubmitNotice()" style="background: linear-gradient(135deg, var(--primary), #1a6aa3); color: #000; border: none; padding: 16px 45px; border-radius: 15px; font-weight: 900; font-size: 1.05rem; cursor: pointer; transition: 0.3s; box-shadow: 0 5px 20px rgba(123, 194, 183, 0.4);" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">게시하기</button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                    <h4 style="color: #64748b; margin: 0; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">History & Logs</h4>
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 18px; max-height: 500px; overflow-y: auto; padding-right: 5px; scrollbar-width: thin;">
        `;

        const adminPosts = (state.posts || []).filter(p => String(p.authorId) === 'admin' || p.type === 'notice');

        if (adminPosts.length === 0) {
            html += `<p style="color: var(--text-gray); font-size: 0.9rem; text-align: center; padding: 20px;">작성된 공지가 없습니다.</p>`;
        } else {
            html += adminPosts.map(p => {
                const isImportant = p.isPriority ? '<span style="background: #ff3b30; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-right: 5px;">필독</span>' : '';
                const categoryLabel = p.category ? `<span style="color: var(--primary); font-weight: bold; margin-right: 5px;">[${p.category}]</span>` : '';

                return `
                    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${p.isPriority ? '#ff3b30' : 'rgba(255,255,255,0.08)'}; padding: 18px; border-radius: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <div style="margin-bottom: 6px;">
                                    ${isImportant} ${categoryLabel} <span style="font-size: 0.8rem; color: #64748b;">${p.date || '방금 전'}</span>
                                </div>
                                <h4 style="color: #fff; font-size: 1.05rem; margin: 0 0 8px 0; line-height: 1.4; font-weight: 700;">${p.title || '제목 없음'}</h4>
                            </div>
                            <i class="fas fa-trash-alt" onclick="window.adminDeleteNotice(${p.id})" style="color: #f06958; cursor: pointer; font-size: 1rem; padding: 8px; opacity: 0.7;" title="삭제"></i>
                        </div>
                        <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; max-height: 100px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin: 0;">
                            ${p.content}
                        </p>
                        ${p.media ? `<div style="margin-top: 12px; display: flex; align-items: center; gap: 6px; color: var(--primary); font-size: 0.8rem;"><i class="fas fa-paperclip"></i> 첨부파일 포함됨</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        html += `</div></div>`;
        return html;
    };

    const renderAdminBadgesTab = () => {
        return `
            <div class="fade-in">
                <h3 style="color: var(--text-white); margin-bottom: 20px; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;"><i class="fas fa-medal" style="color: #f2cb4f;"></i> 유저 뱃지 부여 및 명예의 전당</h3>
                <div class="card premium-card" style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.08); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="width: 80px; height: 80px; background: rgba(242, 203, 79, 0.1); border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; color: #f2cb4f; font-size: 2.5rem;">
                        <i class="fas fa-tools"></i>
                    </div>
                    <h4 style="color: #fff; margin-bottom: 10px; font-size: 1.1rem;">시스템 고도화 진행 중</h4>
                    <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 25px; line-height: 1.6;">선수들의 성과를 기반으로 한 자동 뱃지 부여 시스템 및<br/>명예의 전당 기능이 v3.1.0 업데이트에 포함될 예정입니다.</p>
                    <div style="display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.05); border-radius: 20px; color: #64748b; font-size: 0.8rem; font-weight: 700;">Coming Soon</div>
                </div>
            </div>
        `;
    };

    const renderAdminScheduleTab = () => {
        return `
            <div class="fade-in">
                <h3 style="color: var(--text-white); margin-bottom: 20px; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;"><i class="fas fa-calendar-alt" style="color: var(--primary);"></i> 클래스/훈련 일정 관리</h3>
                <div class="card" style="background: rgba(20, 25, 35, 0.8); border: 1px solid var(--border-glass); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 15px;">새로운 훈련 또는 경기 일정을 추가합니다.</p>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <input type="date" id="admin-sched-date" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none; color-scheme: dark;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <input type="time" id="admin-sched-start" style="flex: 1; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none; color-scheme: dark;">
                                <span style="color: #64748b;">~</span>
                                <input type="time" id="admin-sched-end" style="flex: 1; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none; color-scheme: dark;">
                            </div>
                        </div>
                        <input type="text" id="admin-sched-title" placeholder="일정 제목 (예: A반 드리블 훈련)" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none;">
                        <input type="text" id="admin-sched-loc" placeholder="장소 (예: 1호 메인 구장)" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none;">
                        <textarea id="admin-sched-desc" placeholder="상세 내용 코멘트" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 12px; color: #fff; outline: none; height: 80px; resize: none;"></textarea>
                        <button onclick="window.adminSubmitSchedule()" class="btn-primary" style="padding: 15px; font-weight: 700; border-radius: 10px;">일정 등록하기</button>
                    </div>
                </div>
                
                <h4 style="color: var(--text-white); margin-bottom: 12px; font-size: 1rem;">현재 등록된 일정</h4>
                <div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                    ${(state.schedules || []).slice().reverse().map(s => `
                        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); padding: 15px; border-radius: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: var(--primary); font-weight: bold; font-size: 0.9rem;">${s.date}</span>
                                <i class="fas fa-trash-alt" onclick="window.adminDeleteSchedule(${s.id})" style="color: #f06958; cursor: pointer; font-size: 1rem; opacity: 0.8;"></i>
                            </div>
                            <h4 style="color: #fff; font-size: 1rem; margin-bottom: 6px;">${s.title}</h4>
                            <div style="color: #94a3b8; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                                <span><i class="fas fa-clock" style="width: 18px;"></i> ${s.time}</span>
                                <span><i class="fas fa-map-marker-alt" style="width: 18px;"></i> ${s.location}</span>
                                ${s.description ? `<p style="margin-top:8px; padding-top:8px; border-top: 1px solid rgba(255,255,255,0.05); color: #8cf;">${s.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const renderAdminPaymentsTab = () => {
        return `
            <div class="fade-in">
                <h3 style="color: var(--text-white); margin-bottom: 20px; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;"><i class="fas fa-wallet" style="color: #7bc2b7;"></i> 결제 및 수강료 관리</h3>
                <div class="card premium-card" style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.08); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="width: 80px; height: 80px; background: rgba(123, 194, 183, 0.1); border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; color: #7bc2b7; font-size: 2.5rem;">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <h4 style="color: #fff; margin-bottom: 10px; font-size: 1.1rem;">결제 시스템 통합 중</h4>
                    <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 25px; line-height: 1.6;">수강료 미납 관리 및 자동 결제 내역 확인 기능이<br/>v3.2.0 업데이트에 통합될 예정입니다.</p>
                    <div style="display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.05); border-radius: 20px; color: #64748b; font-size: 0.8rem; font-weight: 700;">Maintenance Mode</div>
                </div>
            </div>
        `;
    };

    // 관리자 이벤트 헬퍼
    window.adminUpdateMembershipStart = (userId, newDate) => {
        const user = state.users.find(u => u.id === userId);
        if (user) {
            user.membershipStart = newDate;
            recalculateMembershipEnd(user);
            saveAdminState();
            renderAdminTab('admin-users'); // 리렌더링
        }
    };

    window.adminUpdateMembership = (userId, newLevel) => {
        const user = state.users.find(u => u.id === userId);
        if (user) {
            user.role = newLevel;
            recalculateMembershipEnd(user);
            saveAdminState();
            alert(`${user.name} 님의 멤버십을 [${newLevel}]로 변경했습니다.\n만료일: ${user.membershipEnd}`);
            renderAdminTab('admin-users'); // 리렌더링
        }
    };

    function recalculateMembershipEnd(user) {
        if (!user.membershipStart || !user.role) return;

        const start = new Date(user.membershipStart);
        let monthsToAdd = 1; // Basic
        if (user.role === 'Semi') monthsToAdd = 3;
        else if (user.role === 'Pro' || user.role === 'player') monthsToAdd = 6;
        else if (user.role === 'Ultimate' || user.role === 'vip') monthsToAdd = 12;

        start.setMonth(start.getMonth() + monthsToAdd);

        const yr = start.getFullYear();
        const mo = String(start.getMonth() + 1).padStart(2, '0');
        const da = String(start.getDate()).padStart(2, '0');
        user.membershipEnd = `${yr}-${mo}-${da}`;
    }

    function saveAdminState() {
        try {
            localStorage.setItem('soccer_users', JSON.stringify(state.users));
        } catch (e) { }
    }

    window.adminSubmitSchedule = () => {
        const d = document.getElementById('admin-sched-date').value;
        const start = document.getElementById('admin-sched-start').value;
        const end = document.getElementById('admin-sched-end').value;
        const title = document.getElementById('admin-sched-title').value;
        const loc = document.getElementById('admin-sched-loc').value;
        const desc = document.getElementById('admin-sched-desc').value;

        if (!d || !start || !end || !title || !loc) return alert('필수 정보(날짜, 시간, 제목, 장소)를 입력해주세요.');

        const newSched = {
            id: Date.now(),
            date: d,
            time: `${start} - ${end}`,
            title: title,
            location: loc,
            description: desc
        };

        // Firebase 저장 (모든 유저에게 일정 즉시 반영)
        if (db) {
            db.collection("schedules").doc(newSched.id.toString()).set(newSched).catch(e => console.error(e));
        }

        state.schedules.push(newSched);
        try { localStorage.setItem('soccer_schedules', JSON.stringify(state.schedules)); } catch (e) { }
        alert('신규 일정이 등록되었습니다.');
        renderAdminTab('admin-schedule');
    };

    window.adminDeleteSchedule = (id) => {
        if (!confirm('정말 해당 일정을 삭제하시겠습니까?')) return;
        state.schedules = state.schedules.filter(s => s.id !== id);
        try { localStorage.setItem('soccer_schedules', JSON.stringify(state.schedules)); } catch (e) { }
        renderAdminTab('admin-schedule');
    };

    window.adminSubmitNotice = () => {
        const c = document.getElementById('admin-notice-category').value;
        const t = document.getElementById('admin-notice-title').value;
        const b = document.getElementById('admin-notice-body').value;
        const p = document.getElementById('admin-notice-priority').checked;
        const f = document.getElementById('admin-notice-file').files[0];

        if (!t || !b) return alert('제목과 내용을 모두 입력해주세요.');

        const btn = document.getElementById('btn-admin-submit-notice');
        btn.textContent = '업로드 중...';
        btn.disabled = true;

        const processSubmission = (mediaUrl = null) => {
            const newNotice = {
                id: Date.now(),
                authorId: 'admin',
                authorName: 'G-STAR 운영진',
                avatar: 'fa-shield-alt',
                type: 'notice', // 타입 유지 (소셜 탭 호환)
                category: c,
                title: t,
                date: new Date().toLocaleDateString(),
                time: '방금 전',
                content: b,
                isPriority: p,
                media: mediaUrl, // 첨부파일 URL
                likes: 0,
                comments: []
            };

            // 상태 업데이트 및 소셜 피드 최상단 삽입 (isPriority에 따른 별도 정렬은 렌더링 시 처리)
            state.posts.unshift(newNotice);

            // Firebase 연동 (전역 동기화)
            if (db) {
                db.collection("posts").doc(newNotice.id.toString()).set(newNotice).then(() => {
                    console.log("Notice posted to Firebase");
                }).catch(e => console.error(e));
            }

            try {
                localStorage.setItem('soccer_posts', JSON.stringify(state.posts));
            } catch (e) { }

            alert('새 공지사항이 성공적으로 게시되었습니다.');

            // 폼 초기화
            document.getElementById('admin-notice-title').value = '';
            document.getElementById('admin-notice-body').value = '';
            document.getElementById('admin-notice-priority').checked = false;
            document.getElementById('admin-notice-file').value = '';
            document.getElementById('admin-notice-file-name').textContent = '선택된 파일 없음';
            btn.textContent = '게시하기';
            btn.disabled = false;

            renderAdminTab('admin-notices'); // 탭 리렌더링으로 목록 갱신
        };

        // 파일 첨부 시 Firebase Storage 처리
        if (f && window.storage) {
            const fileName = `notices/${Date.now()}_${f.name}`;
            const storageRef = window.storage.ref(fileName);
            storageRef.put(f).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            }).then(downloadURL => {
                processSubmission(downloadURL);
            }).catch(e => {
                console.warn('Storage Error:', e);
                // 업로드 실패 시 로컬 더미 처리
                const reader = new FileReader();
                reader.onload = (e) => processSubmission(e.target.result);
                reader.readAsDataURL(f);
            });
        } else if (f) {
            // Storage 인스턴스가 없을 때 로컬 fallback 처리
            const reader = new FileReader();
            reader.onload = (e) => processSubmission(e.target.result);
            reader.readAsDataURL(f);
        } else {
            processSubmission(null);
        }
    };

    window.adminDeleteNotice = (id) => {
        if (!confirm('정말 이 공지사항/게시물을 삭제하시겠습니까?')) return;

        state.posts = state.posts.filter(p => p.id !== id);
        try { localStorage.setItem('soccer_posts', JSON.stringify(state.posts)); } catch (e) { }

        if (db) {
            db.collection("posts").doc(id.toString()).delete().catch(e => console.error(e));
        }

        renderAdminTab('admin-notices');
    };

    // 하단 내비게이션 탭 이벤트 핸들러
    function bindNavEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) {
                    renderTab(tab);
                }
            });
        });
    }

    // 내비게이션 및 관리자 GNB 이벤트
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            renderAdminTab(btn.dataset.target);
        });
    });

    // 시작
    bindNavEvents();
    init();
})();
