const firebaseConfig = {
    apiKey: "AIzaSyCWa1-vHlf9hudb-YuNUJv0Oy5Nrp3Cu8g",
    authDomain: "ctdms-7d91d.firebaseapp.com",
    projectId: "ctdms-7d91d",
    storageBucket: "ctdms-7d91d.firebasestorage.app",
    messagingSenderId: "249841224587",
    appId: "1:249841224587:web:8b9bda8ce1ea4edcf3bd8e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentChatId = null;
let currentChatType = 'chat';
let users = {};
let chats = [];
let channels = [];
let unsubscribeChats = null;
let unsubscribeMessages = null;
let currentTab = 'chats';

// ===== ПОДАРКИ С КАРТИНКАМИ =====
const giftsCatalog = [
    { id: 'rose', name: 'Роза', price: 10, icon: 'fa-solid fa-rose', image: 'https://showtg.ru/images/gifts/5168103777563050263.png' },
    { id: 'cake', name: 'Торт', price: 50, icon: 'fa-solid fa-cake-candles', image: 'https://showtg.ru/images/gifts/5170144170496491616.png' },
    { id: 'diamond', name: 'Бриллиант', price: 100, icon: 'fa-solid fa-gem', image: 'https://showtg.ru/images/gifts/5170521118301225164.png' },
    { id: 'heart', name: 'Сердце', price: 20, icon: 'fa-solid fa-heart', image: 'https://showtg.ru/images/gifts/5170145012310081615.png' },
    { id: 'crown', name: 'Кубок', price: 200, icon: 'fa-solid fa-crown', image: 'https://showtg.ru/images/gifts/5168043875654172773.png' },
    { id: 'rocket', name: 'Ракета', price: 150, icon: 'fa-solid fa-rocket', image: 'https://showtg.ru/images/gifts/5170564780938756245.png' }
];

// ===== АДМИН ПАНЕЛЬ =====
const admins = ['M42iVvDOKwXLUcy33yWwVqF8qYm1'];

function isAdmin() {
    return admins.includes(currentUser?.uid);
}

// ===== ВЫДАЧА ПОДАРКОВ АДМИНОМ =====
async function giveGiftToUser(userId, giftId, amount = 1) {
    if (!isAdmin()) {
        alert('Только администратор может выдавать подарки');
        return;
    }
    
    try {
        for (let i = 0; i < amount; i++) {
            await db.collection('users').doc(userId).update({
                gifts: firebase.firestore.FieldValue.arrayUnion(giftId)
            });
        }
        
        showMessage('success', `Подарок ${giftsCatalog.find(g => g.id === giftId)?.name} выдан`);
    } catch (error) {
        console.error('Give gift error:', error);
        alert('Ошибка выдачи подарка');
    }
}

// ===== АДМИН ПАНЕЛЬ =====
function showAdminPanel() {
    if (!isAdmin()) {
        alert('Доступ запрещен');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>👑 Админ панель</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="background: #f0f0f0; padding: 10px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>Ваш UID:</strong> ${currentUser?.uid}</p>
                    <p style="color: green;">✓ Админ режим активирован</p>
                </div>
                
                <h4>Выдача подарков</h4>
                
                <div class="form-group">
                    <label>User ID получателя</label>
                    <input type="text" id="targetUserId" class="form-control" placeholder="Введите UID пользователя">
                </div>
                
                <div class="form-group">
                    <label>Подарок</label>
                    <select id="giftToGive" class="form-control">
                        ${giftsCatalog.map(g => `<option value="${g.id}">${g.name} (${g.price} 🌙)</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Количество</label>
                    <input type="number" id="giftAmount" class="form-control" value="1" min="1" max="100">
                </div>
                
                <button class="btn primary" style="width: 100%; margin-bottom: 20px;" onclick="executeGiveGift()">Выдать подарок</button>
                
                <hr>
                
                <h4>Поиск пользователя</h4>
                <div class="form-group">
                    <input type="text" id="searchUserForAdmin" class="form-control" placeholder="@username" oninput="searchUserForAdmin()">
                </div>
                
                <div id="adminSearchResults" style="max-height: 200px; overflow-y: auto; margin-top: 10px;"></div>
                
                <div style="margin-top: 20px;">
                    <h4>Начисление Moon</h4>
                    <input type="text" id="moonUserId" class="form-control" placeholder="User ID" style="margin-bottom: 10px;">
                    <input type="number" id="moonAmount" class="form-control" placeholder="Количество" style="margin-bottom: 10px;">
                    <button class="btn primary" onclick="addMoonToUser(
                        document.getElementById('moonUserId').value,
                        parseInt(document.getElementById('moonAmount').value)
                    )">Начислить Moon</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== НАЧИСЛЕНИЕ MOON АДМИНОМ =====
async function addMoonToUser(userId, amount) {
    if (!isAdmin()) {
        alert('Только администратор может начислять Moon');
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            moonBalance: firebase.firestore.FieldValue.increment(amount)
        });
        
        showMessage('success', `Начислено ${amount} Moon пользователю`);
    } catch (error) {
        console.error('Add moon error:', error);
        alert('Ошибка начисления');
    }
}
// ===== ПОИСК ПОЛЬЗОВАТЕЛЯ ДЛЯ АДМИНА =====
async function searchUserForAdmin() {
    const username = document.getElementById('searchUserForAdmin')?.value.toLowerCase().replace('@', '');
    const resultsDiv = document.getElementById('adminSearchResults');
    
    if (!username || username.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }
    
    try {
        const snapshot = await db.collection('users')
            .where('username', '>=', username)
            .where('username', '<=', username + '\uf8ff')
            .limit(5)
            .get();
        
        if (snapshot.empty) {
            resultsDiv.innerHTML = '<p style="color: #999;">Пользователи не найдены</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 5px; background: white;">
                    <div>
                        <div><strong>${user.name}</strong></div>
                        <div style="font-size: 12px; color: #666;">@${user.username}</div>
                        <div style="font-size: 10px; color: #999;">${doc.id}</div>
                    </div>
                    <button class="btn secondary" style="padding: 5px 10px;" onclick="copyToClipboard('${doc.id}')">Копировать</button>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        console.error('Search error:', error);
    }
}

// ===== КОПИРОВАНИЕ В БУФЕР =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('ID скопирован');
    });
}

// ===== ВЫПОЛНЕНИЕ ВЫДАЧИ ПОДАРКА =====
async function executeGiveGift() {
    const targetUserId = document.getElementById('targetUserId')?.value;
    const giftId = document.getElementById('giftToGive')?.value;
    const amount = parseInt(document.getElementById('giftAmount')?.value) || 1;
    
    if (!targetUserId || !giftId) {
        alert('Заполните все поля');
        return;
    }
    
    await giveGiftToUser(targetUserId, giftId, amount);
    document.querySelector('.modal').remove();
}

// ===== ПОКУПКА MOON =====
function buyMoon() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>🌙 Пополнение Moon</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px;">🌙</div>
                    <p>Покупка Moon через Telegram</p>
                </div>
                
                <div style="display: grid; gap: 10px;">
                    <div style="border: 1px solid var(--border); border-radius: 8px; padding: 15px; cursor: pointer;" onclick="buyMoonPackage(100, '100 ₽')">
                        <div style="display: flex; justify-content: space-between;">
                            <span><strong>100 Moon</strong></span>
                            <span>100 ₽</span>
                        </div>
                    </div>
                    <div style="border: 1px solid var(--border); border-radius: 8px; padding: 15px; cursor: pointer;" onclick="buyMoonPackage(500, '400 ₽')">
                        <div style="display: flex; justify-content: space-between;">
                            <span><strong>500 Moon</strong> <span style="color: #10b981;">(скидка)</span></span>
                            <span>400 ₽</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== ПОКУПКА ПАКЕТА MOON =====
function buyMoonPackage(amount, price) {
    const message = encodeURIComponent(
        `Хочу купить ${amount} Moon за ${price}\nUser ID: ${currentUser?.uid}`
    );
    window.open(`https://t.me/Kulsred?text=${message}`, '_blank');
    document.querySelector('.modal').remove();
}

// ===== МАГАЗИН ПОДАРКОВ =====
function showGiftsShop() {
    const user = users[currentUser.uid];
    const moonBalance = user.moonBalance || 0;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>🎁 Магазин подарков</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 32px;">🌙</div>
                    <h2 style="font-size: 36px;">${moonBalance}</h2>
                    <p>Moon на счету</p>
                    <button class="btn" style="background: white; color: #667eea; margin-top: 10px;" onclick="buyMoon()">Пополнить Moon</button>
                </div>
                
                ${isAdmin() ? `
                <div style="margin-bottom: 20px;">
                    <button class="btn primary" onclick="showAdminPanel()">👑 Админ панель</button>
                </div>
                ` : ''}
                
                <h4>Доступные подарки:</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
                    ${giftsCatalog.map(gift => `
                        <div style="border: 1px solid var(--border); border-radius: 12px; padding: 15px; text-align: center; cursor: pointer;" 
                             onclick="buyGift('${gift.id}')">
                            <img src="${gift.image}" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 10px;">
                            <div style="font-weight: 600;">${gift.name}</div>
                            <div style="color: #667eea; font-weight: 600;">${gift.price} 🌙</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 30px;">
                    <h4>Мои подарки:</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; min-height: 80px; padding: 15px; background: #f5f5f5; border-radius: 12px;">
                        ${user.gifts?.map(giftId => {
                            const gift = giftsCatalog.find(g => g.id === giftId);
                            return gift ? `
                                <div style="text-align: center; cursor: pointer;" onclick="sendGift('${gift.id}')" title="Нажмите чтобы подарить">
                                    <img src="${gift.image}" style="width: 48px; height: 48px; object-fit: contain;">
                                    <div style="font-size: 12px;">${gift.name}</div>
                                </div>
                            ` : '';
                        }).join('') || 'Нет подарков'}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== ПОКУПКА ПОДАРКА =====
async function buyGift(giftId) {
    const gift = giftsCatalog.find(g => g.id === giftId);
    if (!gift) return;
    
    const user = users[currentUser.uid];
    const moonBalance = user.moonBalance || 0;
    
    if (moonBalance < gift.price) {
        alert(`Недостаточно Moon. Нужно ${gift.price} 🌙`);
        return;
    }
    
    if (confirm(`Купить ${gift.name} за ${gift.price} 🌙?`)) {
        try {
            await db.collection('users').doc(currentUser.uid).update({
                moonBalance: firebase.firestore.FieldValue.increment(-gift.price),
                gifts: firebase.firestore.FieldValue.arrayUnion(gift.id)
            });
            
            users[currentUser.uid].moonBalance = (users[currentUser.uid].moonBalance || 0) - gift.price;
            users[currentUser.uid].gifts = [...(users[currentUser.uid].gifts || []), gift.id];
            
            showGiftsShop();
            showMessage('success', `Куплен ${gift.name}`);
            
        } catch (error) {
            console.error('Buy gift error:', error);
            alert('Ошибка покупки');
        }
    }
}

// ===== ОТПРАВКА ПОДАРКА =====
async function sendGift(giftId) {
    if (!currentChatId || currentChatType !== 'chat') {
        alert('Выберите личный чат для отправки подарка');
        return;
    }
    
    const gift = giftsCatalog.find(g => g.id === giftId);
    if (!gift) return;
    
    const otherId = getOtherUserId();
    const otherUser = users[otherId];
    
    if (confirm(`Отправить ${gift.name} пользователю ${otherUser?.name}?`)) {
        try {
            await db.collection('users').doc(currentUser.uid).update({
                gifts: firebase.firestore.FieldValue.arrayRemove(gift.id)
            });
            
            await db.collection('users').doc(otherId).update({
                gifts: firebase.firestore.FieldValue.arrayUnion(gift.id)
            });
            
            const message = {
                senderId: currentUser.uid,
                text: `Подарил ${gift.name}`,
                image: gift.image,
                timestamp: new Date(),
                isGift: true,
                giftId: gift.id
            };
            
            await db.collection('chats').doc(currentChatId).collection('messages').add(message);
            
            users[currentUser.uid].gifts = users[currentUser.uid].gifts?.filter(g => g !== gift.id) || [];
            
            showGiftsShop();
            showMessage('success', `Подарок отправлен!`);
            
        } catch (error) {
            console.error('Send gift error:', error);
            alert('Ошибка отправки');
        }
    }
}

// ===== АУТЕНТИФИКАЦИЯ =====
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
                
                document.getElementById('authContainer').classList.add('hidden');
                document.getElementById('appContainer').classList.remove('hidden');
                
                document.getElementById('userAvatar').innerHTML = users[user.uid]?.avatar || 'U';
                
                updateMenu();
                
                await loadUsers();
                subscribeToChats();
                subscribeToChannels();
            }
        } catch (error) {
            console.error('Auth error:', error);
            showMessage('error', 'Ошибка загрузки');
        }
    } else {
        if (unsubscribeChats) unsubscribeChats();
        if (unsubscribeMessages) unsubscribeMessages();
        
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        currentUser = null;
        users = {};
        chats = [];
        channels = [];
    }
});

// ===== ОБНОВЛЕНИЕ МЕНЮ =====
function updateMenu() {
    const dropdown = document.getElementById('dropdownMenu');
    
    // Очищаем меню
    dropdown.innerHTML = '';
    
    // Профиль
    const profileItem = document.createElement('div');
    profileItem.className = 'dropdown-item';
    profileItem.onclick = showProfile;
    profileItem.innerHTML = `<i class="fa-solid fa-user"></i><span>Профиль</span>`;
    dropdown.appendChild(profileItem);
    
    // Магазин подарков
    const giftsItem = document.createElement('div');
    giftsItem.className = 'dropdown-item';
    giftsItem.onclick = showGiftsShop;
    giftsItem.innerHTML = `<i class="fa-solid fa-gift"></i><span>Магазин подарков</span>`;
    dropdown.appendChild(giftsItem);
    
    // Новый чат
    const newChatItem = document.createElement('div');
    newChatItem.className = 'dropdown-item';
    newChatItem.onclick = showNewChat;
    newChatItem.innerHTML = `<i class="fa-solid fa-plus"></i><span>Новый чат</span>`;
    dropdown.appendChild(newChatItem);
    
    // Создать канал
    const newChannelItem = document.createElement('div');
    newChannelItem.className = 'dropdown-item';
    newChannelItem.onclick = showCreateChannel;
    newChannelItem.innerHTML = `<i class="fa-solid fa-bullhorn"></i><span>Создать канал</span>`;
    dropdown.appendChild(newChannelItem);
    
    // Админ панель (только для админа)
    if (isAdmin()) {
        const adminItem = document.createElement('div');
        adminItem.className = 'dropdown-item';
        adminItem.onclick = showAdminPanel;
        adminItem.innerHTML = `<i class="fa-solid fa-crown"></i><span>Админ панель</span>`;
        dropdown.appendChild(adminItem);
    }
    
    // Выход
    const logoutItem = document.createElement('div');
    logoutItem.className = 'dropdown-item';
    logoutItem.onclick = logout;
    logoutItem.innerHTML = `<i class="fa-solid fa-sign-out-alt"></i><span>Выйти</span>`;
    dropdown.appendChild(logoutItem);
}

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====
async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        snapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });
    } catch (error) {
        console.error('Load users error:', error);
    }
}

// ===== ПОДПИСКИ =====
function subscribeToChats() {
    if (unsubscribeChats) unsubscribeChats();
    
    unsubscribeChats = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            chats = [];
            snapshot.forEach(doc => {
                chats.push({ id: doc.id, type: 'chat', ...doc.data() });
            });
            updateContactsList();
        }, (error) => {
            console.error('Chats error:', error);
        });
}

function subscribeToChannels() {
    db.collection('channels')
        .onSnapshot((snapshot) => {
            channels = [];
            snapshot.forEach(doc => {
                channels.push({ id: doc.id, type: 'channel', ...doc.data() });
            });
            updateContactsList();
        }, (error) => {
            console.error('Channels error:', error);
        });
}

// ===== ОБНОВЛЕНИЕ СПИСКА КОНТАКТОВ =====
function updateContactsList() {
    const list = document.getElementById('contactsList');
    const items = currentTab === 'chats' ? chats : channels;
    
    if (items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${currentTab === 'chats' ? '💬' : '📢'}</div>
                <h4>Нет ${currentTab === 'chats' ? 'чатов' : 'каналов'}</h4>
                <button class="empty-btn" onclick="${currentTab === 'chats' ? 'showNewChat()' : 'showSubscribeChannel()'}">
                    ${currentTab === 'chats' ? 'Новый чат' : 'Подписаться на канал'}
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    items.forEach(item => {
        if (currentTab === 'chats') {
            const otherId = item.participants.find(id => id !== currentUser.uid);
            const user = users[otherId];
            
            if (user) {
                const lastMessage = item.lastMessage || 'Начните общение';
                const time = item.lastMessageTime ? formatTime(item.lastMessageTime.toDate()) : '';
                const unread = item.unread?.[currentUser.uid] || 0;
                
                html += `
                    <div class="contact-item ${item.id === currentChatId ? 'active' : ''}" onclick="selectChat('${item.id}', '${otherId}', 'chat')">
                        <div class="avatar">${user.avatar}</div>
                        <div class="contact-info">
                            <div class="contact-name">${user.name}</div>
                            <div class="last-message">@${user.username} • ${lastMessage}</div>
                        </div>
                        <div class="message-info">
                            <div class="time">${time}</div>
                            ${unread > 0 ? `<div class="unread-count">${unread}</div>` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            const lastMessage = item.lastMessage || 'Добро пожаловать';
            const time = item.lastMessageTime ? formatTime(item.lastMessageTime.toDate()) : '';
            
            html += `
                <div class="contact-item ${item.id === currentChatId ? 'active' : ''}" onclick="selectChat('${item.id}', null, 'channel')">
                    <div class="avatar" style="background: var(--secondary);">${item.avatar || '📢'}</div>
                    <div class="contact-info">
                        <div class="contact-name">${item.name}</div>
                        <div class="last-message">@${item.username} • ${lastMessage}</div>
                    </div>
                    <div class="message-info">
                        <div class="time">${time}</div>
                    </div>
                </div>
            `;
        }
    });
    
    list.innerHTML = html;
}

// ===== ВЫБОР ЧАТА =====
async function selectChat(id, otherId, type) {
    if (unsubscribeMessages) unsubscribeMessages();
    
    currentChatId = id;
    currentChatType = type;
    
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`[onclick*="${id}"]`);
    if (active) active.classList.add('active');
    
    if (type === 'chat' && otherId) {
        const user = users[otherId];
        if (user) {
            document.getElementById('currentChatAvatar').innerHTML = user.avatar;
            document.getElementById('currentChatName').textContent = user.name;
            document.getElementById('currentChatStatus').innerHTML = `
                <span class="status-dot ${user.status === 'online' ? '' : 'offline'}"></span>
                @${user.username}
            `;
        }
    } else {
        const channel = channels.find(c => c.id === id);
        if (channel) {
            document.getElementById('currentChatAvatar').innerHTML = channel.avatar || '📢';
            document.getElementById('currentChatName').textContent = channel.name;
            document.getElementById('currentChatStatus').innerHTML = `@${channel.username}`;
        }
    }
    
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
    
    loadMessages(id, type);
    
    if (type === 'chat') {
        await markMessagesAsRead(id);
    }
}

// ===== ЗАГРУЗКА СООБЩЕНИЙ =====
function loadMessages(id, type) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<div class="loader"></div>';
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    const collection = type === 'chat' ? 'chats' : 'channels';
    
    unsubscribeMessages = db.collection(collection).doc(id).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(async (snapshot) => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">✏️</div>
                        <h4>Нет сообщений</h4>
                        <p>Напишите первое сообщение</p>
                    </div>
                `;
                return;
            }
            
            for (const doc of snapshot.docs) {
                const message = { id: doc.id, ...doc.data() };
                await addMessageToUI(message);
            }
            
            container.scrollTop = container.scrollHeight;
        }, (error) => {
            console.error('Messages error:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Не удалось загрузить сообщения</p>
                </div>
            `;
        });
}

// ===== ДОБАВЛЕНИЕ СООБЩЕНИЯ =====
async function addMessageToUI(message) {
    const isOutgoing = message.senderId === currentUser.uid;
    const time = message.timestamp ? formatTime(message.timestamp.toDate()) : '';
    const sender = users[message.senderId];
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    let senderInfo = '';
    if (!isOutgoing && currentChatType === 'channel' && sender) {
        senderInfo = `<div class="message-sender">@${sender.username}</div>`;
    }
    
    let content = '';
    if (message.image) {
        content = `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <img src="${message.image}" style="width: 64px; height: 64px; object-fit: contain;">
                <div>${message.text || ''}</div>
            </div>
        `;
    } else {
        content = `<div>${message.text || ''}</div>`;
    }
    
    messageDiv.innerHTML = `
        ${senderInfo}
        <div class="message-content">${content}</div>
        <div class="message-time">${time}</div>
    `;
    
    document.getElementById('messagesContainer').appendChild(messageDiv);
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    
    const message = {
        senderId: currentUser.uid,
        text: text,
        timestamp: new Date()
    };
    
    try {
        const collection = currentChatType === 'chat' ? 'chats' : 'channels';
        
        await db.collection(collection).doc(currentChatId).collection('messages').add(message);
        
        let displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
        
        await db.collection(collection).doc(currentChatId).update({
            lastMessage: displayText,
            lastMessageTime: new Date()
        });
        
        input.value = '';
        input.style.height = 'auto';
        
    } catch (error) {
        console.error('Send error:', error);
        showMessage('error', 'Не удалось отправить сообщение');
    }
}

// ===== ПОМЕТИТЬ КАК ПРОЧИТАННОЕ =====
async function markMessagesAsRead(chatId) {
    try {
        await db.collection('chats').doc(chatId).update({
            [`unread.${currentUser.uid}`]: 0
        });
    } catch (error) {
        console.error('Mark read error:', error);
    }
}

// ===== ФОРМАТИРОВАНИЕ ВРЕМЕНИ =====
function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
    if (diff < 86400000) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (tab === 'chats') {
        document.querySelectorAll('.tab')[0].classList.add('active');
        document.getElementById('searchContacts').placeholder = 'Поиск пользователей...';
    } else {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('searchContacts').placeholder = 'Поиск каналов...';
    }
    
    updateContactsList();
}

// ===== МЕНЮ =====
function toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.classList.toggle('hidden');
    
    if (!dropdown.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!e.target.closest('.user-menu')) {
                    dropdown.classList.add('hidden');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 10);
    }
}

// ===== ВЫХОД =====
async function logout() {
    try {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).update({
                status: 'offline',
                lastSeen: new Date()
            });
        }
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ===== НОВЫЙ ЧАТ =====
function showNewChat() {
    const username = prompt('Введите имя пользователя:');
    if (!username) return;
    
    createNewChat(username.replace('@', ''));
}

async function createNewChat(username) {
    try {
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (userSnapshot.empty) {
            alert('Пользователь не найден');
            return;
        }
        
        const otherUser = userSnapshot.docs[0].data();
        
        if (otherUser.uid === currentUser.uid) {
            alert('Нельзя начать чат с собой');
            return;
        }
        
        const existingChat = chats.find(chat => 
            chat.participants.includes(otherUser.uid)
        );
        
        if (existingChat) {
            selectChat(existingChat.id, otherUser.uid, 'chat');
            toggleDropdown();
            return;
        }
        
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
        
        selectChat(chatRef.id, otherUser.uid, 'chat');
        toggleDropdown();
        
    } catch (error) {
        console.error('Chat creation error:', error);
        alert('Ошибка создания чата');
    }
}

// ===== СОЗДАНИЕ КАНАЛА =====
function showCreateChannel() {
    document.getElementById('createChannelModal').classList.remove('hidden');
    toggleDropdown();
}

function closeCreateChannel() {
    document.getElementById('createChannelModal').classList.add('hidden');
}

async function createChannel() {
    const name = document.getElementById('channelName').value;
    const username = document.getElementById('channelUsername').value.toLowerCase().replace('@', '');
    const description = document.getElementById('channelDescription').value;
    
    if (!name || !username) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const channelSnapshot = await db.collection('channels')
            .where('username', '==', username)
            .get();
        
        if (!channelSnapshot.empty) {
            alert('Имя канала уже занято');
            return;
        }
        
        await db.collection('channels').add({
            name: name,
            username: username,
            description: description,
            avatar: name.charAt(0).toUpperCase(),
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            createdAt: new Date(),
            lastMessage: '',
            lastMessageTime: null
        });
        
        closeCreateChannel();
        switchTab('channels');
        showMessage('success', 'Канал создан');
        
    } catch (error) {
        console.error('Channel creation error:', error);
        alert('Ошибка создания канала');
    }
}

// ===== ПОДПИСКА НА КАНАЛ =====
function showSubscribeChannel() {
    document.getElementById('subscribeChannelModal').classList.remove('hidden');
}

function closeSubscribeChannel() {
    document.getElementById('subscribeChannelModal').classList.add('hidden');
}

async function subscribeToChannel() {
    const username = document.getElementById('channelLink').value.toLowerCase().replace('@', '');
    
    try {
        const channelSnapshot = await db.collection('channels')
            .where('username', '==', username)
            .get();
        
        if (channelSnapshot.empty) {
            alert('Канал не найден');
            return;
        }
        
        const channelDoc = channelSnapshot.docs[0];
        const channel = channelDoc.data();
        
        if (channel.members.includes(currentUser.uid)) {
            alert('Вы уже подписаны');
            closeSubscribeChannel();
            return;
        }
        
        await db.collection('channels').doc(channelDoc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        
        alert('Вы подписались на канал');
        closeSubscribeChannel();
        
    } catch (error) {
        console.error('Subscribe error:', error);
        alert('Ошибка подписки');
    }
}

// ===== НАСТРОЙКИ ПРОФИЛЯ =====
function showProfile() {
    const user = users[currentUser.uid];
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Мой профиль</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div class="profile-avatar" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto;">${user.avatar}</div>
                    <div style="margin-top: 10px; font-size: 18px;">🌙 ${user.moonBalance || 0}</div>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Имя:</span>
                    <span class="info-value">${user.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Username:</span>
                    <span class="info-value">@${user.username}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${user.email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Статус:</span>
                    <span class="info-value">${user.status === 'online' ? '🟢 Онлайн' : '⚫ Офлайн'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🆔 UID:</span>
                    <span class="info-value" style="font-size: 11px; user-select: all;">${user.uid}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn primary" onclick="saveProfile()">Сохранить</button>
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    toggleDropdown();
}

// ===== СОХРАНЕНИЕ ПРОФИЛЯ =====
async function saveProfile() {
    const name = document.getElementById('profileName')?.value;
    
    if (!name) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            avatar: name.charAt(0).toUpperCase()
        });
        
        users[currentUser.uid].name = name;
        users[currentUser.uid].avatar = name.charAt(0).toUpperCase();
        
        document.getElementById('userAvatar').innerHTML = name.charAt(0).toUpperCase();
        
        document.querySelector('.modal').remove();
        showMessage('success', 'Профиль обновлен');
        
    } catch (error) {
        console.error('Save profile error:', error);
        alert('Ошибка сохранения');
    }
}

// ===== ИНФОРМАЦИЯ О ЧАТЕ =====
function showChatInfo() {
    if (!currentChatId) return;
    
    if (currentChatType === 'chat') {
        const otherId = getOtherUserId();
        const user = users[otherId];
        if (user) {
            alert(`Чат с ${user.name}\nUsername: @${user.username}`);
        }
    } else {
        const channel = channels.find(c => c.id === currentChatId);
        if (channel) {
            alert(`Канал ${channel.name}\nСсылка: @${channel.username}\nУчастников: ${channel.members?.length || 0}`);
        }
    }
}

function getOtherUserId() {
    const chat = chats.find(c => c.id === currentChatId);
    return chat?.participants.find(id => id !== currentUser.uid);
}

function attachFile() {
    alert('Отправка файлов будет доступна позже');
}

document.getElementById('searchContacts').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('.contact-item').forEach(item => {
        const name = item.querySelector('.contact-name')?.textContent.toLowerCase() || '';
        const username = item.querySelector('.last-message')?.textContent.toLowerCase() || '';
        item.style.display = (name.includes(searchTerm) || username.includes(searchTerm)) ? 'flex' : 'none';
    });
});

document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function showMessage(type, text) {
    const div = document.createElement('div');
    div.className = type === 'error' ? 'error-message' : 'success-message';
    div.textContent = text;
    
    document.getElementById('authMessages').innerHTML = '';
    document.getElementById('authMessages').appendChild(div);
    
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => {
            document.getElementById('authMessages').innerHTML = '';
        }, 300);
    }, 3000);
}

function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    
    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const username = document.getElementById('registerUsername').value.toLowerCase();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const usernameSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (!usernameSnapshot.empty) {
            showMessage('error', 'Имя пользователя занято');
            return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await db.collection('users').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            name: name,
            username: username,
            email: email,
            avatar: name.charAt(0).toUpperCase(),
            status: 'online',
            lastSeen: new Date(),
            createdAt: new Date(),
            moonBalance: 0,
            gifts: []
        });
        
        showMessage('success', 'Аккаунт создан');
        
    } catch (error) {
        showMessage('error', error.message);
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (userSnapshot.empty) {
            showMessage('error', 'Пользователь не найден');
            return;
        }
        
        const userData = userSnapshot.docs[0].data();
        await auth.signInWithEmailAndPassword(userData.email, password);
        
    } catch (error) {
        showMessage('error', error.message);
    }
});

window.addEventListener('load', () => {
    document.getElementById('authContainer').classList.remove('hidden');
});

window.addEventListener('online', () => {
    if (currentUser) {
        subscribeToChats();
        subscribeToChannels();
    }
});

window.addEventListener('offline', () => {
    showMessage('warning', 'Нет соединения');
});
