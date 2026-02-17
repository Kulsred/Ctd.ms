// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyCWa1-vHlf9hudb-YuNUJv0Oy5Nrp3Cu8g",
    authDomain: "ctdms-7d91d.firebaseapp.com",
    projectId: "ctdms-7d91d",
    storageBucket: "ctdms-7d91d.firebasestorage.app",
    messagingSenderId: "249841224587",
    appId: "1:249841224587:web:8b9bda8ce1ea4edcf3bd8e"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Добавьте в начало файла после существующих переменных

// Переменные для звонков
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCall = null;
let callTimer = null;
let callStartTime = null;
const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Настройки пользователя
let userSettings = {
    notifySound: true,
    callNotifications: true,
    popupNotifications: false,
    showOnlineStatus: true,
    blockStrangers: false,
    readReceipts: true,
    videoQuality: '720',
    theme: 'light',
    fontSize: 'medium',
    autoDownloadMedia: false,
    dataSaver: false
};

// Звуки
const sounds = {
    incomingCall: new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8AAD8////AACAfwAAgD8AAIA/AAAAAAAAAAAAAAAAAAAAAAA='),
    message: new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8AAD8////AACAfwAAgD8AAIA/AAAAAAAAAAAAAAAAAAAAAAA='),
    callEnd: new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8AAD8////AACAfwAAgD8AAIA/AAAAAAAAAAAAAAAAAAAAAAA=')
};

// Инициализация настроек
function initSettings() {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
        userSettings = JSON.parse(savedSettings);
        applySettings();
    }
    
    // Заполняем списки устройств
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const microphones = devices.filter(d => d.kind === 'audioinput');
        const cameras = devices.filter(d => d.kind === 'videoinput');
        
        const micSelect = document.getElementById('microphoneSelect');
        const camSelect = document.getElementById('cameraSelect');
        
        microphones.forEach((mic, index) => {
            const option = document.createElement('option');
            option.value = mic.deviceId;
            option.text = mic.label || `Микрофон ${index + 1}`;
            micSelect.appendChild(option);
        });
        
        cameras.forEach((cam, index) => {
            const option = document.createElement('option');
            option.value = cam.deviceId;
            option.text = cam.label || `Камера ${index + 1}`;
            camSelect.appendChild(option);
        });
    });
}

// Применить настройки
function applySettings() {
    // Тема
    if (userSettings.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (userSettings.theme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        // Системная тема
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
    
    // Размер шрифта
    const root = document.documentElement;
    switch(userSettings.fontSize) {
        case 'small':
            root.style.fontSize = '14px';
            break;
        case 'medium':
            root.style.fontSize = '16px';
            break;
        case 'large':
            root.style.fontSize = '18px';
            break;
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
}

// Показать настройки
function showSettings() {
    const modal = document.getElementById('settingsModal');
    
    // Загружаем текущие настройки в форму
    document.getElementById('notifySound').checked = userSettings.notifySound;
    document.getElementById('callNotifications').checked = userSettings.callNotifications;
    document.getElementById('popupNotifications').checked = userSettings.popupNotifications;
    document.getElementById('showOnlineStatus').checked = userSettings.showOnlineStatus;
    document.getElementById('blockStrangers').checked = userSettings.blockStrangers;
    document.getElementById('readReceipts').checked = userSettings.readReceipts;
    document.getElementById('videoQuality').value = userSettings.videoQuality;
    document.getElementById('themeSelect').value = userSettings.theme;
    document.getElementById('fontSize').value = userSettings.fontSize;
    document.getElementById('autoDownloadMedia').checked = userSettings.autoDownloadMedia;
    document.getElementById('dataSaver').checked = userSettings.dataSaver;
    
    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.transition = 'all 0.3s ease-out';
        modal.style.opacity = '1';
    }, 10);
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSettings();
        }
    });
}

// Закрыть настройки
function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Сохранить настройки
function saveSettings() {
    userSettings = {
        notifySound: document.getElementById('notifySound').checked,
        callNotifications: document.getElementById('callNotifications').checked,
        popupNotifications: document.getElementById('popupNotifications').checked,
        showOnlineStatus: document.getElementById('showOnlineStatus').checked,
        blockStrangers: document.getElementById('blockStrangers').checked,
        readReceipts: document.getElementById('readReceipts').checked,
        videoQuality: document.getElementById('videoQuality').value,
        theme: document.getElementById('themeSelect').value,
        fontSize: document.getElementById('fontSize').value,
        autoDownloadMedia: document.getElementById('autoDownloadMedia').checked,
        dataSaver: document.getElementById('dataSaver').checked
    };
    
    applySettings();
    
    // Обновляем статус онлайн в Firebase
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            showOnlineStatus: userSettings.showOnlineStatus,
            status: userSettings.showOnlineStatus ? 'online' : 'offline'
        });
    }
    
    closeSettings();
    showMessage('success', 'Настройки сохранены');
}

// Добавить пункт настроек в выпадающее меню
function updateDropdownMenu() {
    const dropdown = document.getElementById('dropdownMenu');
    const settingsItem = document.createElement('div');
    settingsItem.className = 'dropdown-item';
    settingsItem.onclick = showSettings;
    settingsItem.innerHTML = `
        <div class="dropdown-icon">
            <svg viewBox="0 0 24 24">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
        </div>
        <span>Настройки</span>
    `;
    
    dropdown.insertBefore(settingsItem, dropdown.children[2]);
}

// Функции для звонков
async function startAudioCall() {
    if (!currentChatId) {
        showMessage('error', 'Сначала выберите чат');
        return;
    }
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
        });
        
        startCall('audio');
    } catch (error) {
        console.error('Ошибка доступа к микрофону:', error);
        showMessage('error', 'Не удалось получить доступ к микрофону');
    }
}

async function startVideoCall() {
    if (!currentChatId) {
        showMessage('error', 'Сначала выберите чат');
        return;
    }
    
    try {
        const constraints = {
            audio: true,
            video: {
                width: { ideal: parseInt(userSettings.videoQuality) },
                height: { ideal: parseInt(userSettings.videoQuality) * 0.5625 }
            }
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        startCall('video');
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        showMessage('error', 'Не удалось получить доступ к камере');
    }
}

async function startCall(type) {
    const otherUserId = getOtherUserId();
    const user = users[otherUserId];
    
    if (!user) return;
    
    // Создаем запись о звонке в Firestore
    const callRef = await db.collection('calls').add({
        callerId: currentUser.uid,
        calleeId: otherUserId,
        type: type,
        status: 'calling',
        startTime: new Date(),
        chatId: currentChatId
    });
    
    currentCall = {
        id: callRef.id,
        type: type,
        status: 'calling',
        otherUserId: otherUserId
    };
    
    // Показываем модальное окно звонка
    showCallModal(user, type, 'outgoing');
    
    // Создаем peer connection
    createPeerConnection();
    
    // Добавляем локальный поток
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    // Создаем offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Отправляем offer через Firestore
    await db.collection('calls').doc(callRef.id).update({
        offer: {
            type: offer.type,
            sdp: offer.sdp
        }
    });
    
    // Подписываемся на изменения звонка
    subscribeToCall(callRef.id);
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentCall) {
            db.collection('calls').doc(currentCall.id).update({
                iceCandidates: firebase.firestore.FieldValue.arrayUnion(event.candidate)
            });
        }
    };
    
    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
            endCall();
        }
    };
}

function subscribeToCall(callId) {
    db.collection('calls').doc(callId).onSnapshot((doc) => {
        if (!doc.exists) return;
        
        const data = doc.data();
        
        if (data.status === 'accepted' && currentCall && currentCall.status === 'calling') {
            // Звонок принят
            currentCall.status = 'active';
            startCallTimer();
            
            if (data.answer) {
                const answer = new RTCSessionDescription(data.answer);
                peerConnection.setRemoteDescription(answer);
            }
            
            if (data.iceCandidates) {
                data.iceCandidates.forEach(candidate => {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                });
            }
            
            updateCallModalStatus('active');
            
        } else if (data.status === 'rejected') {
            // Звонок отклонен
            showMessage('info', 'Пользователь отклонил звонок');
            endCall();
            
        } else if (data.status === 'ended') {
            // Звонок завершен
            endCall();
        }
        
        // Обработка входящего звонка
        if (data.calleeId === currentUser.uid && data.status === 'calling' && !currentCall) {
            handleIncomingCall(data);
        }
    });
}

function handleIncomingCall(callData) {
    const caller = users[callData.callerId];
    if (!caller) return;
    
    if (userSettings.callNotifications) {
        sounds.incomingCall.play().catch(() => {});
    }
    
    currentCall = {
        id: callData.id,
        type: callData.type,
        status: 'incoming',
        callerId: callData.callerId,
        offer: callData.offer
    };
    
    // Показываем модальное окно входящего звонка
    showCallModal(caller, callData.type, 'incoming');
    
    // Показываем уведомление
    if (userSettings.popupNotifications && Notification.permission === 'granted') {
        new Notification('Входящий звонок', {
            body: `${caller.name} звонит вам (${callData.type === 'audio' ? 'аудио' : 'видео'})`,
            icon: '/favicon.ico'
        });
    }
}

function showCallModal(user, type, direction) {
    const modal = document.getElementById('callModal');
    const statusEl = document.getElementById('callStatus');
    const avatarEl = document.getElementById('callAvatar');
    const nameEl = document.getElementById('callName');
    const acceptBtn = document.getElementById('acceptCallBtn');
    const videoContainer = document.getElementById('videoContainer');
    const localVideo = document.getElementById('localVideo');
    
    if (direction === 'incoming') {
        statusEl.textContent = `Входящий ${type === 'audio' ? 'аудио' : 'видео'}звонок...`;
        acceptBtn.style.display = 'flex';
    } else {
        statusEl.textContent = `Исходящий ${type === 'audio' ? 'аудио' : 'видео'}звонок...`;
        acceptBtn.style.display = 'none';
    }
    
    avatarEl.textContent = user.avatar;
    nameEl.textContent = user.name;
    
    if (type === 'video' && localStream) {
        videoContainer.classList.add('active');
        localVideo.srcObject = localStream;
    }
    
    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.transition = 'all 0.3s ease-out';
        modal.style.opacity = '1';
    }, 10);
}

function updateCallModalStatus(status) {
    const statusEl = document.getElementById('callStatus');
    const timerEl = document.getElementById('callTimer');
    const videoContainer = document.getElementById('videoContainer');
    
    if (status === 'active') {
        statusEl.textContent = 'Разговор...';
        if (currentCall.type === 'video') {
            videoContainer.classList.add('active');
        }
    }
}

async function acceptCall() {
    if (!currentCall) return;
    
    try {
        const constraints = {
            audio: true,
            video: currentCall.type === 'video'
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        createPeerConnection();
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(currentCall.offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        await db.collection('calls').doc(currentCall.id).update({
            status: 'accepted',
            answer: {
                type: answer.type,
                sdp: answer.sdp
            }
        });
        
        currentCall.status = 'active';
        startCallTimer();
        updateCallModalStatus('active');
        
    } catch (error) {
        console.error('Ошибка при принятии звонка:', error);
        showMessage('error', 'Не удалось принять звонок');
        endCall();
    }
}

function startCallTimer() {
    callStartTime = Date.now();
    const timerEl = document.getElementById('callTimer');
    
    callTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

async function endCall() {
    // Останавливаем таймер
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Закрываем peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Останавливаем локальный стрим
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Обновляем статус звонка в Firestore
    if (currentCall) {
        await db.collection('calls').doc(currentCall.id).update({
            status: 'ended',
            endTime: new Date()
        });
        currentCall = null;
    }
    
    // Закрываем модальное окно
    const modal = document.getElementById('callModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('videoContainer').classList.remove('active');
    }, 300);
    
    // Воспроизводим звук завершения
    if (userSettings.notifySound) {
        sounds.callEnd.play().catch(() => {});
    }
}

// Запрос разрешения на уведомления
function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Обновляем инициализацию
window.addEventListener('load', () => {
    // Запрашиваем разрешение на уведомления
    requestNotificationPermission();
    
    // Инициализируем настройки
    initSettings();
    
    // Добавляем пункт настроек в меню
    setTimeout(() => {
        updateDropdownMenu();
    }, 1000);
    
    // Анимация появления
    authContainer.style.animation = 'fadeIn 0.8s ease-out';
    
    // Показываем экран аутентификации
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    
    // Добавляем анимацию частицам
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        particle.style.animationDelay = `${index * 2}s`;
    });
    
    // Фокус на первое поле ввода
    setTimeout(() => {
        const firstInput = document.querySelector('.form-control');
        if (firstInput) firstInput.focus();
    }, 500);
});

// Текущий пользователь и данные
let currentUser = null;
let currentChatId = null;
let users = {};
let chats = [];
let unsubscribeChats = null;
let unsubscribeMessages = null;

// DOM элементы
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessages = document.getElementById('authMessages');
const userAvatar = document.getElementById('userAvatar');
const contactsList = document.getElementById('contactsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const searchContacts = document.getElementById('searchContacts');
const currentChatName = document.getElementById('currentChatName');
const currentChatAvatar = document.getElementById('currentChatAvatar');
const currentChatStatus = document.getElementById('currentChatStatus');

// Анимации CSS (добавляем динамически)
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    
    @keyframes scaleIn {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideInLeft {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes floatUp {
        from { transform: translateY(30px) scale(0.8); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(37, 99, 235, 0.3); }
        50% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.6); }
    }
    
    .profile-modal, .chat-info-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }
    
    .modal-content {
        background: white;
        border-radius: var(--radius-lg);
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: var(--shadow-lg);
        animation: scaleIn 0.3s ease-out;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border);
    }
    
    .modal-header h3 {
        font-size: 18px;
        color: var(--dark);
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--gray);
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: var(--transition);
    }
    
    .modal-close:hover {
        background: var(--light);
        color: var(--error);
    }
    
    .modal-body {
        animation: floatUp 0.3s ease-out;
    }
    
    .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        font-size: 32px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        animation: pulse 2s infinite;
    }
    
    .profile-info {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .info-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--light-gray);
    }
    
    .info-label {
        color: var(--gray);
        font-weight: 500;
    }
    
    .info-value {
        color: var(--dark);
        font-weight: 600;
    }
    
    .status-online {
        color: var(--success);
    }
    
    .status-offline {
        color: var(--gray);
    }
    
    .empty-state, .error-state {
        text-align: center;
        padding: 60px 20px;
        animation: fadeIn 0.5s ease-out;
    }
    
    .empty-icon, .error-icon {
        font-size: 48px;
        margin-bottom: 20px;
        animation: bounce 2s infinite;
    }
    
    .empty-state h4, .error-state h4 {
        font-size: 18px;
        color: var(--dark);
        margin-bottom: 8px;
    }
    
    .empty-state p, .error-state p {
        color: var(--gray);
        margin-bottom: 20px;
    }
    
    .empty-btn, .retry-btn {
        padding: 10px 24px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .empty-btn:hover, .retry-btn:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .new-contact {
        background: rgba(37, 99, 235, 0.05) !important;
        border: 1px solid rgba(37, 99, 235, 0.2) !important;
        animation: glow 2s infinite;
    }
`;
document.head.appendChild(style);

// Анимация ripple эффекта
function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('btn-ripple');
    
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Показать вкладку аутентификации с анимацией
function showAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginTab = tabs[0];
    const registerTab = tabs[1];
    
    // Анимация перехода
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        
        // Анимация появления
        setTimeout(() => {
            loginForm.style.animation = 'slideInRight 0.3s ease-out';
        }, 10);
    } else {
        registerTab.classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        
        setTimeout(() => {
            registerForm.style.animation = 'slideInLeft 0.3s ease-out';
        }, 10);
    }
}

// Показать сообщение с анимацией
function showMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = text;
    messageDiv.style.animation = 'slideIn 0.3s ease-out';
    
    authMessages.innerHTML = '';
    authMessages.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0.9';
        setTimeout(() => {
            messageDiv.style.transform = 'translateY(-10px)';
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                authMessages.innerHTML = '';
            }, 300);
        }, 4000);
    }, 100);
}

// Анимация загрузки кнопки
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        if (button.querySelector('.btn-text')) {
            button.querySelector('.btn-text').style.opacity = '0.5';
        }
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.querySelector('.btn-text')) {
            button.querySelector('.btn-text').style.opacity = '1';
        }
    }
}

// Регистрация с анимациями
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const registerBtn = document.getElementById('registerBtn');
    
    // Анимация ripple
    createRipple(e, registerBtn);
    
    try {
        setButtonLoading(registerBtn, true);
        showMessage('success', 'Создание аккаунта...');
        
        // Анимация ввода
        const inputs = registerForm.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.style.transform = 'translateY(-2px)';
            setTimeout(() => {
                input.style.transform = 'translateY(0)';
            }, 200);
        });

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await db.collection('users').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            name: name,
            email: email,
            avatar: name.charAt(0).toUpperCase(),
            status: 'online',
            lastSeen: new Date(),
            createdAt: new Date()
        });
        
        // Анимация успеха
        showMessage('success', '✅ Аккаунт создан! Входим...');
        registerBtn.style.background = 'var(--success)';
        
        setTimeout(() => {
            login(email, password);
        }, 1500);
        
    } catch (error) {
        // Анимация ошибки
        registerBtn.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            registerBtn.style.animation = '';
        }, 500);
        
        showMessage('error', getErrorMessage(error.code));
        setButtonLoading(registerBtn, false);
    }
});

// Вход с анимациями
function login(email, password) {
    const loginBtn = document.getElementById('loginBtn');
    setButtonLoading(loginBtn, true);
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Успешный вход
            loginBtn.style.background = 'var(--success)';
        })
        .catch(error => {
            // Анимация ошибки
            loginBtn.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                loginBtn.style.animation = '';
            }, 500);
            
            showMessage('error', getErrorMessage(error.code));
            setButtonLoading(loginBtn, false);
        });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    createRipple(e, loginBtn);
    login(email, password);
});

// Обработчик изменения состояния аутентификации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                users[user.uid] = userDoc.data();
                
                await db.collection('users').doc(user.uid).update({
                    status: 'online',
                    lastSeen: new Date()
                });
                
                // Анимация перехода
                authContainer.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => {
                    authContainer.classList.add('hidden');
                    appContainer.classList.remove('hidden');
                    appContainer.style.animation = 'fadeIn 0.5s ease-out';
                    
                    initMessenger();
                }, 500);
                
            } else {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: user.email.split('@')[0],
                    email: user.email,
                    avatar: user.email.charAt(0).toUpperCase(),
                    status: 'online',
                    lastSeen: new Date(),
                    createdAt: new Date()
                });
                
                authContainer.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => {
                    authContainer.classList.add('hidden');
                    appContainer.classList.remove('hidden');
                    appContainer.style.animation = 'fadeIn 0.5s ease-out';
                    
                    initMessenger();
                }, 500);
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            showMessage('error', 'Ошибка загрузки данных пользователя');
        }
    } else {
        if (unsubscribeChats) {
            unsubscribeChats();
        }
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }
        
        appContainer.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            appContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            authContainer.style.animation = 'fadeIn 0.5s ease-out';
            currentUser = null;
            users = {};
            chats = [];
        }, 500);
    }
});

// Инициализация мессенджера с анимациями
async function initMessenger() {
    // Устанавливаем аватар с анимацией
    const userData = users[currentUser.uid];
    userAvatar.textContent = userData?.avatar || 'U';
    userAvatar.style.animation = 'pulse 2s ease-in-out';
    
    // Загружаем контакты с анимацией
    await loadContacts();
    
    // Подписываемся на изменения в чатах
    subscribeToChats();
    
    // Анимация появления элементов
    const elements = document.querySelectorAll('.sidebar > *');
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => {
            el.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Загрузка контактов с анимацией
async function loadContacts() {
    try {
        const usersSnapshot = await db.collection('users').get();
        users = {};
        usersSnapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });
        
        if (Object.keys(users).length <= 1) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👋</div>
                    <h4>Пока никого нет</h4>
                    <p>Пригласите друзей по email!</p>
                    <button class="empty-btn" onclick="showNewChat()">Добавить контакт</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        contactsList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">😕</div>
                <p>Не удалось загрузить контакты</p>
                <button class="retry-btn" onclick="loadContacts()">Повторить</button>
            </div>
        `;
    }
}

// Подписка на чаты с анимацией
function subscribeToChats() {
    if (unsubscribeChats) unsubscribeChats();
    
    unsubscribeChats = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot(async (snapshot) => {
            chats = [];
            snapshot.forEach(doc => {
                chats.push({ id: doc.id, ...doc.data() });
            });
            
            updateContactsList();
        }, (error) => {
            console.error('Ошибка подписки на чаты:', error);
            contactsList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">📡</div>
                    <p>Проблемы с подключением</p>
                    <button class="retry-btn" onclick="subscribeToChats()">Переподключиться</button>
                </div>
            `;
        });
}

// Обновление списка контактов с анимацией
function updateContactsList() {
    if (chats.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <h4>Нет чатов</h4>
                <p>Начните новый диалог!</p>
                <button class="empty-btn pulse" onclick="showNewChat()">Начать чат</button>
            </div>
        `;
        return;
    }
    
    let html = '';
    let delay = 0;
    
    chats.forEach(chat => {
        const otherUserId = chat.participants.find(id => id !== currentUser.uid);
        const user = users[otherUserId];
        
        if (user) {
            const lastMessage = chat.lastMessage || 'Начните общение';
            const time = chat.lastMessageTime ? formatTime(chat.lastMessageTime.toDate()) : '';
            const unread = chat.unread && chat.unread[currentUser.uid] || 0;
            
            html += `
                <div class="contact-item" 
                     onclick="selectChat('${chat.id}', '${otherUserId}')"
                     style="animation-delay: ${delay}ms">
                    <div class="avatar ${user.status === 'online' ? 'pulse' : ''}">${user.avatar}</div>
                    <div class="contact-info">
                        <div class="contact-name">${user.name}</div>
                        <div class="last-message">${lastMessage}</div>
                    </div>
                    <div class="message-info">
                        <div class="time">${time}</div>
                        ${unread > 0 ? `<div class="unread-count">${unread}</div>` : ''}
                    </div>
                </div>
            `;
            delay += 50;
        }
    });
    
    contactsList.innerHTML = html;
    
    // Анимация появления контактов
    const contactItems = contactsList.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        const itemDelay = parseInt(item.style.animationDelay) || 0;
        setTimeout(() => {
            item.style.transition = 'all 0.3s ease-out';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, itemDelay);
    });
}

// Выбор чата с анимацией
async function selectChat(chatId, otherUserId) {
    // Сбрасываем предыдущие подписки на сообщения
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    // Анимация выбора
    const prevActive = document.querySelector('.contact-item.active');
    if (prevActive) {
        prevActive.classList.remove('active');
        prevActive.style.transform = 'scale(0.98)';
        setTimeout(() => {
            prevActive.style.transform = '';
        }, 200);
    }
    
    const newActive = document.querySelector(`[onclick*="${chatId}"]`);
    if (newActive) {
        newActive.classList.add('active');
        newActive.style.transform = 'scale(1.02)';
        setTimeout(() => {
            newActive.style.transform = '';
        }, 200);
    }
    
    currentChatId = chatId;
    const user = users[otherUserId];
    
    if (user) {
        // Анимация смены чата
        currentChatName.style.opacity = '0';
        currentChatName.style.transform = 'translateY(-10px)';
        
        currentChatAvatar.style.transform = 'scale(0.8)';
        currentChatAvatar.style.opacity = '0.5';
        
        setTimeout(() => {
            currentChatName.textContent = user.name;
            currentChatAvatar.textContent = user.avatar;
            
            const statusText = user.status === 'online' ? 'онлайн' : 'был(а) ' + formatTime(user.lastSeen?.toDate());
            currentChatStatus.innerHTML = `
                <span class="status-dot ${user.status === 'online' ? 'pulse' : 'offline'}"></span>
                ${statusText}
            `;
            
            currentChatName.style.transition = 'all 0.3s ease-out';
            currentChatAvatar.style.transition = 'all 0.3s ease-out';
            
            currentChatName.style.opacity = '1';
            currentChatName.style.transform = 'translateY(0)';
            currentChatAvatar.style.transform = 'scale(1)';
            currentChatAvatar.style.opacity = '1';
        }, 200);
    }
    
    // Анимация активации поля ввода
    messageInput.disabled = false;
    sendButton.disabled = false;
    
    messageInput.style.opacity = '0.5';
    sendButton.style.opacity = '0.5';
    
    setTimeout(() => {
        messageInput.style.transition = 'all 0.3s ease-out';
        sendButton.style.transition = 'all 0.3s ease-out';
        
        messageInput.style.opacity = '1';
        sendButton.style.opacity = '1';
        sendButton.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            sendButton.style.transform = 'scale(1)';
        }, 300);
    }, 300);
    
    // Загружаем сообщения
    loadMessages(chatId);
    
    // Помечаем как прочитанные
    await markMessagesAsRead(chatId);
    
    // Фокус на поле ввода
    setTimeout(() => {
        messageInput.focus();
    }, 400);
}

// Загрузка сообщений с анимацией
function loadMessages(chatId) {
    messagesContainer.innerHTML = '<div class="loader"></div>';
    
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    unsubscribeMessages = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">✏️</div>
                        <h4>Пока пусто</h4>
                        <p>Напишите первое сообщение!</p>
                    </div>
                `;
                return;
            }
            
            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            
            // Анимация появления сообщений
            messages.forEach((message, index) => {
                setTimeout(() => {
                    addMessageToUI(message);
                    
                    // Автоскролл к последнему сообщению
                    if (index === messages.length - 1) {
                        setTimeout(() => {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }, 100);
                    }
                }, index * 50);
            });
            
        }, (error) => {
            console.error('Ошибка загрузки сообщений:', error);
            messagesContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Не удалось загрузить сообщения</p>
                </div>
            `;
        });
}

// Добавление сообщения с анимацией
function addMessageToUI(message) {
    const isOutgoing = message.senderId === currentUser.uid;
    const time = formatTime(message.timestamp?.toDate());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    messageDiv.innerHTML = `
        <div class="message-content">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    // Анимация появления
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = isOutgoing 
        ? 'translateX(20px) translateY(10px)' 
        : 'translateX(-20px) translateY(10px)';
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0) translateY(0)';
    }, 10);
}

// Отправка сообщения с анимацией
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;
    
    // Анимация отправки
    createRipple(new Event('click'), sendButton);
    sendButton.style.transform = 'scale(0.9)';
    setTimeout(() => {
        sendButton.style.transform = 'scale(1)';
    }, 200);
    
    const message = {
        text: text,
        senderId: currentUser.uid,
        timestamp: new Date(),
        read: false
    };
    
    try {
        await db.collection('chats').doc(currentChatId).collection('messages').add(message);
        
        await db.collection('chats').doc(currentChatId).update({
            lastMessage: text.length > 30 ? text.substring(0, 30) + '...' : text,
            lastMessageTime: new Date()
        });
        
        // Анимация успешной отправки
        messageInput.style.transform = 'translateY(-5px)';
        setTimeout(() => {
            messageInput.style.transform = 'translateY(0)';
        }, 200);
        
        // Очистка с анимацией
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        
        // Анимация ошибки
        messageInput.style.animation = 'shake 0.5s ease-in-out';
        sendButton.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            messageInput.style.animation = '';
            sendButton.style.animation = '';
        }, 500);
        
        showMessage('error', 'Не удалось отправить сообщение');
    }
}

// Пометить сообщения как прочитанные
async function markMessagesAsRead(chatId) {
    const otherUserId = getOtherUserId();
    if (!otherUserId) return;
    
    try {
        await db.collection('chats').doc(chatId).update({
            [`unread.${currentUser.uid}`]: 0
        });
    } catch (error) {
        console.error('Ошибка при отметке сообщений как прочитанных:', error);
    }
}

// Получение ID другого пользователя
function getOtherUserId() {
    if (!currentChatId) return null;
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        return chat.participants.find(id => id !== currentUser.uid);
    }
    return null;
}

// Форматирование времени с анимацией
function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} мин назад`;
    }
    if (diff < 86400000) {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}

// Получение понятного сообщения об ошибке
function getErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Некорректный email адрес',
        'auth/user-disabled': 'Аккаунт отключен',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Email уже используется',
        'auth/weak-password': 'Пароль слишком слабый',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение',
        'permission-denied': 'Доступ запрещен'
    };
    
    return messages[errorCode] || 'Произошла ошибка. Попробуйте еще раз.';
}

// Показать/скрыть выпадающее меню с анимацией
function toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.classList.toggle('hidden');
    
    if (!dropdown.classList.contains('hidden')) {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px) scale(0.95)';
        
        setTimeout(() => {
            dropdown.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0) scale(1)';
        }, 10);
    }
}

// Выход с анимацией
async function logout() {
    try {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).update({
                status: 'offline',
                lastSeen: new Date()
            });
        }
        
        // Анимация выхода
        appContainer.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(async () => {
            await auth.signOut();
        }, 400);
        
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        showMessage('error', 'Ошибка при выходе');
    }
}

// Показать новый чат с анимацией
function showNewChat() {
    const email = prompt('Введите email пользователя для начала чата:');
    if (!email) return;
    
    // Анимация поиска
    searchContacts.value = email;
    searchContacts.style.borderColor = 'var(--primary)';
    searchContacts.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
    
    setTimeout(() => {
        searchContacts.style.borderColor = '';
        searchContacts.style.boxShadow = '';
    }, 1000);
    
    db.collection('users')
        .where('email', '==', email)
        .get()
        .then(async (usersSnapshot) => {
            if (usersSnapshot.empty) {
                // Анимация ошибки
                const searchBox = document.querySelector('.search-box');
                searchBox.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    searchBox.style.animation = '';
                }, 500);
                
                showMessage('error', 'Пользователь не найден');
                return;
            }
            
            const otherUser = usersSnapshot.docs[0].data();
            const existingChat = chats.find(chat => 
                chat.participants.includes(otherUser.uid)
            );
            
            if (existingChat) {
                selectChat(existingChat.id, otherUser.uid);
                return;
            }
            
            try {
                const chatRef = await db.collection('chats').add({
                    participants: [currentUser.uid, otherUser.uid],
                    createdAt: new Date(),
                    lastMessage: '',
                    lastMessageTime: null,
                    unread: {
                        [currentUser.uid]: 0,
                        [otherUser.uid]: 0
                    }
                });
                
                // Анимация создания чата
                const newContact = document.createElement('div');
                newContact.className = 'contact-item new-contact';
                newContact.innerHTML = `
                    <div class="avatar pulse">${otherUser.avatar}</div>
                    <div class="contact-info">
                        <div class="contact-name">${otherUser.name}</div>
                        <div class="last-message">Новый чат</div>
                    </div>
                `;
                
                contactsList.prepend(newContact);
                newContact.style.opacity = '0';
                newContact.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    newContact.style.transition = 'all 0.3s ease-out';
                    newContact.style.opacity = '1';
                    newContact.style.transform = 'scale(1)';
                    
                    setTimeout(() => {
                        selectChat(chatRef.id, otherUser.uid);
                        newContact.remove();
                    }, 300);
                }, 100);
                
            } catch (error) {
                console.error('Ошибка при создании чата:', error);
                showMessage('error', 'Не удалось создать чат');
            }
        })
        .catch(error => {
            console.error('Ошибка поиска пользователя:', error);
            showMessage('error', 'Ошибка поиска пользователя');
        });
    
    toggleDropdown();
}

// Показать профиль с анимацией
function showProfile() {
    const user = users[currentUser.uid];
    if (user) {
        // Удаляем существующие модалки
        document.querySelectorAll('.profile-modal, .chat-info-modal').forEach(modal => modal.remove());
        
        // Анимация появления модального окна
        const modal = document.createElement('div');
        modal.className = 'profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>👤 Мой профиль</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="profile-avatar">${user.avatar}</div>
                    <div class="profile-info">
                        <div class="info-item">
                            <span class="info-label">Имя:</span>
                            <span class="info-value">${user.name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${user.email}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Статус:</span>
                            <span class="info-value status-${user.status}">${user.status === 'online' ? 'онлайн' : 'офлайн'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease-out';
            modal.style.opacity = '1';
        }, 10);
        
        // Закрытие по клику вне модалки
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
    
    toggleDropdown();
}

// Показать информацию о чате с анимацией
function showChatInfo() {
    if (!currentChatId) {
        // Анимация пульсации
        currentChatName.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            currentChatName.style.animation = '';
        }, 500);
        return;
    }
    
    const otherUserId = getOtherUserId();
    const user = users[otherUserId];
    
    if (user) {
        // Удаляем существующие модалки
        document.querySelectorAll('.profile-modal, .chat-info-modal').forEach(modal => modal.remove());
        
        const modal = document.createElement('div');
        modal.className = 'chat-info-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💬 Информация о чате</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="chat-avatar">${user.avatar}</div>
                    <div class="chat-info">
                        <div class="info-item">
                            <span class="info-label">Имя:</span>
                            <span class="info-value">${user.name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${user.email}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Статус:</span>
                            <span class="info-value status-${user.status}">${user.status === 'online' ? 'онлайн' : 'офлайн'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease-out';
            modal.style.opacity = '1';
        }, 10);
        
        // Закрытие по клику вне модалки
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
}

// Прикрепить файл
function attachFile() {
    // Анимация кнопки
    const btn = document.querySelector('.attachment-btn');
    btn.style.transform = 'rotate(15deg) scale(1.1)';
    setTimeout(() => {
        btn.style.transform = 'rotate(0) scale(1)';
    }, 300);
    
    showMessage('info', 'Отправка файлов скоро будет доступна!');
}

// Автоматическое изменение высоты текстового поля
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Отправка сообщения по Enter (без Shift)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    
    // Анимация при вводе
    if (e.key.length === 1) {
        this.style.transform = 'scale(1.01)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 100);
    }
});

// Поиск контактов с анимацией
searchContacts.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        const name = item.querySelector('.contact-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'flex';
            item.style.animation = 'slideInRight 0.3s ease-out';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Анимация при поиске
    if (searchTerm) {
        this.style.borderColor = 'var(--primary)';
    } else {
        this.style.borderColor = '';
    }
});

// Обработка нажатия вне выпадающего меню
document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('dropdownMenu');
        if (!dropdown.classList.contains('hidden')) {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => {
                dropdown.classList.add('hidden');
            }, 200);
        }
    }
    
    // Закрытие модалок по ESC
    if (e.key === 'Escape') {
        document.querySelectorAll('.profile-modal, .chat-info-modal').forEach(modal => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        });
    }
});

// Инициализация при загрузке страницы
window.addEventListener('load', () => {
    // Анимация появления
    authContainer.style.animation = 'fadeIn 0.8s ease-out';
    
    // Показываем экран аутентификации
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    
    // Добавляем анимацию частицам
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        particle.style.animationDelay = `${index * 2}s`;
    });
    
    // Фокус на первое поле ввода
    setTimeout(() => {
        const firstInput = document.querySelector('.form-control');
        if (firstInput) firstInput.focus();
    }, 500);
});

// Автоматическая переподписка при восстановлении соединения
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
    if (!isOnline && currentUser) {
        showMessage('success', 'Соединение восстановлено');
        isOnline = true;
        // Переподписываемся на чаты
        if (currentUser) {
            subscribeToChats();
            if (currentChatId) {
                loadMessages(currentChatId);
            }
        }
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    showMessage('warning', 'Отсутствует интернет-соединение');
});