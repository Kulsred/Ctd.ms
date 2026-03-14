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

const giftsCatalog = [
    { id: 'rose', name: 'Роза', price: 10, icon: 'fa-solid fa-rose', image: 'https://showtg.ru/images/gifts/5168103777563050263.png' },
    { id: 'cake', name: 'Торт', price: 50, icon: 'fa-solid fa-cake-candles', image: 'https://showtg.ru/images/gifts/5170144170496491616.png' },
    { id: 'diamond', name: 'Бриллиант', price: 100, icon: 'fa-solid fa-gem', image: 'https://showtg.ru/images/gifts/5170521118301225164.png' },
    { id: 'heart', name: 'Сердце', price: 20, icon: 'fa-solid fa-heart', image: 'https://showtg.ru/images/gifts/5170145012310081615.png' },
    { id: 'crown', name: 'Кубок', price: 200, icon: 'fa-solid fa-crown', image: 'https://showtg.ru/images/gifts/5168043875654172773.png' },
    { id: 'rocket', name: 'Ракета', price: 150, icon: 'fa-solid fa-rocket', image: 'https://showtg.ru/images/gifts/5170564780938756245.png' }
];
const admins = ['M42iVvDOKwXLUcy33yWwVqF8qYm1'];

function isAdmin() {
    return admins.includes(currentUser?.uid);
}

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
        showMessage('success', `Подарок выдан`);
    } catch (error) {
        console.error('Give gift error:', error);
        alert('Ошибка выдачи');
    }
}

function showAdminPanel() {
    if (!isAdmin()) {
        alert('Доступ запрещен');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>👑 Админ панель</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <p><strong>Ваш UID:</strong> ${currentUser?.uid}</p>
                <hr>
                <h4>Выдача подарков</h4>
                <input type="text" id="targetUserId" placeholder="User ID">
                <select id="giftToGive">
                    ${giftsCatalog.map(g => `<option value="${g.id}">${g.name} (${g.price} 🌙)</option>`).join('')}
                </select>
                <input type="number" id="giftAmount" value="1" min="1">
                <button onclick="executeGiveGift()">Выдать</button>
                
                <hr>
                <h4>Начисление Moon</h4>
                <input type="text" id="moonUserId" placeholder="User ID">
                <input type="number" id="moonAmount" placeholder="Количество">
                <button onclick="addMoonToUser(
                    document.getElementById('moonUserId').value,
                    parseInt(document.getElementById('moonAmount').value)
                )">Начислить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function addMoonToUser(userId, amount) {
    if (!isAdmin()) {
        alert('Только администратор может начислять Moon');
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            moonBalance: firebase.firestore.FieldValue.increment(amount)
        });
        showMessage('success', `Начислено ${amount} Moon`);
    } catch (error) {
        console.error('Add moon error:', error);
        alert('Ошибка начисления');
    }
}

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

// ===== ПОПОЛНЕНИЕ MOON (КРАСИВАЯ МОДАЛКА) =====
function buyMoon() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fa-solid fa-moon" style="margin-right: 10px; color: #667eea;"></i>Пополнение Moon</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🌙</div>
                    <p style="color: #666;">Покупка через Telegram @Kulsred</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div onclick="buyMoonPackage(100, '100 ₽')" style="border: 2px solid #eee; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#667eea';" onmouseout="this.style.borderColor='#eee';">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: 600; font-size: 18px;">100 Moon</span>
                            </div>
                            <span style="font-weight: 600; color: #667eea;">100 ₽</span>
                        </div>
                    </div>
                    
                    <div onclick="buyMoonPackage(500, '400 ₽')" style="border: 2px solid #eee; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#667eea';" onmouseout="this.style.borderColor='#eee';">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: 600; font-size: 18px;">500 Moon</span>
                                <span style="background: #10b981; color: white; font-size: 12px; padding: 2px 8px; border-radius: 12px; margin-left: 10px;">-20%</span>
                            </div>
                            <span style="font-weight: 600; color: #667eea;">400 ₽</span>
                        </div>
                    </div>
                    
                    <div onclick="buyMoonPackage(1000, '700 ₽')" style="border: 2px solid #eee; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#667eea';" onmouseout="this.style.borderColor='#eee';">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: 600; font-size: 18px;">1000 Moon</span>
                                <span style="background: #10b981; color: white; font-size: 12px; padding: 2px 8px; border-radius: 12px; margin-left: 10px;">-30%</span>
                            </div>
                            <span style="font-weight: 600; color: #667eea;">700 ₽</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #f0f7ff; border-radius: 8px; font-size: 13px; color: #666;">
                    <i class="fa-solid fa-telegram" style="color: #0088cc; margin-right: 5px;"></i>
                    После оплаты напишите @Kulsred с указанием вашего UID: <strong>${currentUser?.uid}</strong>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </div>
        </div>
    `;
    
    // Удаляем предыдущую модалку магазина
    document.querySelector('.modal')?.remove();
    document.body.appendChild(modal);
}
function buyMoonPackage(amount, price) {
    const message = encodeURIComponent(
        `Хочу купить ${amount} Moon за ${price}\nUser ID: ${currentUser?.uid}`
    );
    window.open(`https://t.me/Kulsred?text=${message}`, '_blank');
    document.querySelector('.modal').remove();
}

// ===== МАГАЗИН ПОДАРКОВ (КРАСИВАЯ МОДАЛКА) =====
function showGiftsShop() {
    const user = users[currentUser.uid];
    const moonBalance = user.moonBalance || 0;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fa-solid fa-gift" style="margin-right: 10px; color: #667eea;"></i>Магазин подарков</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 5px;">🌙</div>
                    <h2 style="font-size: 32px; margin-bottom: 5px;">${moonBalance}</h2>
                    <p style="opacity: 0.9; margin-bottom: 15px;">Moon на счету</p>
                    <button onclick="buyMoon()" style="background: white; color: #667eea; border: none; padding: 10px 25px; border-radius: 25px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">Пополнить Moon</button>
                </div>
                
                ${isAdmin() ? `
                <div style="margin-bottom: 20px;">
                    <button onclick="showAdminPanel()" style="width:100%; padding: 12px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fa-solid fa-crown" style="margin-right: 8px; color: gold;"></i> Админ панель
                    </button>
                </div>
                ` : ''}
                
                <h4 style="margin-bottom: 15px;">🎁 Доступные подарки</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px;">
                    ${giftsCatalog.map(gift => `
                        <div onclick="buyGift('${gift.id}')" style="border: 1px solid #eee; border-radius: 12px; padding: 15px 10px; text-align: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                            <img src="${gift.image}" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 8px;">
                            <div style="font-weight: 600; font-size: 14px; margin-bottom: 5px;">${gift.name}</div>
                            <div style="color: #667eea; font-weight: 600;">${gift.price} 🌙</div>
                        </div>
                    `).join('')}
                </div>
                
                <h4 style="margin-bottom: 15px;">📦 Мои подарки</h4>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; min-height: 80px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${user.gifts?.map(giftId => {
                        const gift = giftsCatalog.find(g => g.id === giftId);
                        return gift ? `
                            <div onclick="sendGift('${gift.id}')" style="text-align: center; cursor: pointer; width: 70px;">
                                <img src="${gift.image}" style="width: 40px; height: 40px; object-fit: contain; margin-bottom: 3px;">
                                <div style="font-size: 10px;">${gift.name}</div>
                            </div>
                        ` : '';
                    }).join('') || '<div style="color: #999; text-align: center; width:100%; padding: 20px;">У вас пока нет подарков</div>'}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    toggleDropdown();
}

async function buyGift(giftId) {
    const gift = giftsCatalog.find(g => g.id === giftId);
    if (!gift) return;
    
    const user = users[currentUser.uid];
    if ((user.moonBalance || 0) < gift.price) {
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

async function sendGift(giftId) {
    if (!currentChatId || currentChatType !== 'chat') {
        alert('Выберите личный чат');
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
            
            await db.collection('chats').doc(currentChatId).collection('messages').add({
                senderId: currentUser.uid,
                text: `Подарил ${gift.name}`,
                image: gift.image,
                timestamp: new Date(),
                isGift: true
            });
            
            users[currentUser.uid].gifts = users[currentUser.uid].gifts?.filter(g => g !== gift.id) || [];
            
            showGiftsShop();
            showMessage('success', 'Подарок отправлен!');
        } catch (error) {
            console.error('Send gift error:', error);
            alert('Ошибка отправки');
        }
    }
}

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

function updateMenu() {
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.innerHTML = '';
    
    const items = [
        { icon: 'user', text: 'Профиль', click: showProfile },
        { icon: 'gift', text: 'Магазин подарков', click: showGiftsShop },
        { icon: 'plus', text: 'Новый чат', click: showNewChat },
        { icon: 'bullhorn', text: 'Создать канал', click: showCreateChannel }
    ];
    
    if (isAdmin()) {
        items.push({ icon: 'crown', text: 'Админ панель', click: showAdminPanel });
    }
    
    items.push({ icon: 'sign-out-alt', text: 'Выйти', click: logout });
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.onclick = item.click;
        div.innerHTML = `<i class="fa-solid fa-${item.icon}"></i> ${item.text}`;
        dropdown.appendChild(div);
    });
}

async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        snapshot.forEach(doc => users[doc.id] = doc.data());
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function subscribeToChats() {
    if (unsubscribeChats) unsubscribeChats();
    
    unsubscribeChats = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot(snapshot => {
            chats = [];
            snapshot.forEach(doc => chats.push({ id: doc.id, type: 'chat', ...doc.data() }));
            updateContactsList();
        }, error => console.error('Chats error:', error));
}

function subscribeToChannels() {
    db.collection('channels').onSnapshot(snapshot => {
        channels = [];
        snapshot.forEach(doc => channels.push({ id: doc.id, type: 'channel', ...doc.data() }));
        updateContactsList();
    }, error => console.error('Channels error:', error));
}

function updateContactsList() {
    const list = document.getElementById('contactsList');
    const items = currentTab === 'chats' ? chats : channels;
    
    if (items.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">${currentTab === 'chats' ? '💬' : '📢'}</div>
            <h4>Нет ${currentTab === 'chats' ? 'чатов' : 'каналов'}</h4>
            <button class="empty-btn" onclick="${currentTab === 'chats' ? 'showNewChat()' : 'showSubscribeChannel()'}">
                ${currentTab === 'chats' ? 'Новый чат' : 'Подписаться'}
            </button>
        </div>`;
        return;
    }
    
    let html = '';
    items.forEach(item => {
        if (currentTab === 'chats') {
            const otherId = item.participants.find(id => id !== currentUser.uid);
            const user = users[otherId];
            if (user) {
                html += `<div class="contact-item ${item.id === currentChatId ? 'active' : ''}" onclick="selectChat('${item.id}', '${otherId}', 'chat')">
                    <div class="avatar ${user.status === 'online' ? 'pulse' : ''}">${user.avatar}</div>
                    <div class="contact-info">
                        <div class="contact-name">${user.name}</div>
                        <div class="last-message">@${user.username} • ${item.lastMessage || '...'}</div>
                    </div>
                    <div class="message-info">
                        <div class="time">${item.lastMessageTime ? formatTime(item.lastMessageTime.toDate()) : ''}</div>
                    </div>
                </div>`;
            }
        } else {
            html += `<div class="contact-item ${item.id === currentChatId ? 'active' : ''}" onclick="selectChat('${item.id}', null, 'channel')">
                <div class="avatar" style="background: var(--secondary);">${item.avatar || '📢'}</div>
                <div class="contact-info">
                    <div class="contact-name">${item.name}</div>
                    <div class="last-message">@${item.username} • ${item.lastMessage || ''}</div>
                </div>
                <div class="message-info">
                    <div class="time">${item.lastMessageTime ? formatTime(item.lastMessageTime.toDate()) : ''}</div>
                </div>
            </div>`;
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
                <span class="status-dot ${user.status === 'online' ? '' : 'offline'}"></span> @${user.username}`;
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
    
    if (window.innerWidth <= 768) closeMobileMenu();
}

function loadMessages(id, type) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<div class="loader"></div>';
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    const collection = type === 'chat' ? 'chats' : 'channels';
    
    unsubscribeMessages = db.collection(collection).doc(id).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon">✏️</div><h4>Нет сообщений</h4></div>';
                return;
            }
            
            snapshot.forEach(doc => addMessageToUI({ id: doc.id, ...doc.data() }));
            container.scrollTop = container.scrollHeight;
        }, error => {
            console.error('Messages error:', error);
            container.innerHTML = '<div class="empty-state">⚠️ Ошибка загрузки</div>';
        });
}

function addMessageToUI(message) {
    const isOutgoing = message.senderId === currentUser.uid;
    const time = message.timestamp ? formatTime(message.timestamp.toDate()) : '';
    const sender = users[message.senderId];
    
    const div = document.createElement('div');
    div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    let content = '';
    if (message.image) {
        content = `<div><img src="${message.image}" style="width:50px; height:50px; object-fit:contain;"></div>
                   <div>${message.text || ''}</div>`;
    } else {
        content = `<div>${message.text || ''}</div>`;
    }
    
    div.innerHTML = `
        ${!isOutgoing && currentChatType === 'channel' && sender ? `<div class="message-sender">@${sender.username}</div>` : ''}
        <div class="message-content">${content}</div>
        <div class="message-time">${time}</div>
    `;
    
    document.getElementById('messagesContainer').appendChild(div);
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    
    try {
        const collection = currentChatType === 'chat' ? 'chats' : 'channels';
        
        await db.collection(collection).doc(currentChatId).collection('messages').add({
            senderId: currentUser.uid,
            text: text,
            timestamp: new Date()
        });
        
        await db.collection(collection).doc(currentChatId).update({
            lastMessage: text.length > 30 ? text.substring(0,30)+'...' : text,
            lastMessageTime: new Date()
        });
        
        input.value = '';
        input.style.height = 'auto';
    } catch (error) {
        console.error('Send error:', error);
        alert('Ошибка отправки');
    }
}

function formatTime(date) {
    if (!date) return '';
    const diff = new Date() - date;
    if (diff < 60000) return 'сейчас';
    if (diff < 3600000) return `${Math.floor(diff/60000)} мин`;
    return date.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[tab === 'chats' ? 0 : 1].classList.add('active');
    updateContactsList();
}

function toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.classList.toggle('hidden');
}

// ===== МОБИЛЬНОЕ МЕНЮ =====

function toggleMobileMenu(event) {
    if (event) event.stopPropagation();

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// закрытие только при клике на серый фон
document.getElementById('sidebarOverlay').addEventListener('click', function () {
    closeMobileMenu();
});

// запрет закрытия при клике внутри меню
document.getElementById('sidebar').addEventListener('click', function (e) {
    e.stopPropagation();
});

// закрывать меню если экран стал большим
window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

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

// ===== НОВЫЙ ЧАТ (КРАСИВАЯ МОДАЛКА) =====
function showNewChat() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fa-solid fa-plus" style="margin-right: 10px; color: var(--primary);"></i>Новый чат</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">💬</div>
                    <p style="color: #666; margin-bottom: 5px;">Введите username пользователя</p>
                    <p style="color: #999; font-size: 13px;">например: @ivan или ivan</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">Имя пользователя</label>
                    <input type="text" id="newChatUsername" placeholder="@username" style="width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; transition: all 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='#eee'">
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        <i class="fa-solid fa-info-circle" style="color: var(--primary); margin-right: 5px;"></i>
                        Можно найти пользователей через поиск в левой панели
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                <button class="btn primary" onclick="createNewChatFromModal()">Начать чат</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    toggleDropdown();
    
    // Автофокус на поле ввода
    setTimeout(() => {
        document.getElementById('newChatUsername')?.focus();
    }, 100);
}

// ===== СОЗДАНИЕ ЧАТА ИЗ МОДАЛКИ =====
async function createNewChatFromModal() {
    const input = document.getElementById('newChatUsername');
    const username = input?.value.toLowerCase().replace('@', '').trim();
    
    if (!username) {
        alert('Введите имя пользователя');
        return;
    }
    
    // Показываем загрузку
    input.style.borderColor = 'var(--primary)';
    input.disabled = true;
    
    try {
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (userSnapshot.empty) {
            alert('Пользователь не найден');
            input.style.borderColor = '#ff4444';
            input.disabled = false;
            input.focus();
            return;
        }
        
        const otherUser = userSnapshot.docs[0].data();
        
        if (otherUser.uid === currentUser.uid) {
            alert('Нельзя начать чат с самим собой');
            input.style.borderColor = '#ff4444';
            input.disabled = false;
            input.focus();
            return;
        }
        
        // Проверяем существующий чат
        const existingChat = chats.find(chat => 
            chat.participants.includes(otherUser.uid)
        );
        
        if (existingChat) {
            // Закрываем модалку и открываем чат
            document.querySelector('.modal').remove();
            selectChat(existingChat.id, otherUser.uid, 'chat');
            return;
        }
        
        // Создаем новый чат
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
        
        // Закрываем модалку и открываем новый чат
        document.querySelector('.modal').remove();
        selectChat(chatRef.id, otherUser.uid, 'chat');
        
    } catch (error) {
        console.error('Chat creation error:', error);
        alert('Ошибка создания чата');
        input.style.borderColor = '#ff4444';
        input.disabled = false;
    }
}

async function createNewChat(username) {
    try {
        const user = await db.collection('users').where('username','==',username).get();
        if (user.empty) {
            alert('Пользователь не найден');
            return;
        }
        
        const otherUser = user.docs[0].data();
        if (otherUser.uid === currentUser.uid) {
            alert('Нельзя с собой');
            return;
        }
        
        const existing = chats.find(c => c.participants.includes(otherUser.uid));
        if (existing) {
            selectChat(existing.id, otherUser.uid, 'chat');
            toggleDropdown();
            return;
        }
        
        const chatRef = await db.collection('chats').add({
            participants: [currentUser.uid, otherUser.uid],
            createdAt: new Date(),
            lastMessage: '',
            unread: { [currentUser.uid]: 0, [otherUser.uid]: 0 }
        });
        
        selectChat(chatRef.id, otherUser.uid, 'chat');
        toggleDropdown();
    } catch (error) {
        console.error('Chat error:', error);
        alert('Ошибка создания чата');
    }
}

function showCreateChannel() {
    document.getElementById('createChannelModal').classList.remove('hidden');
    toggleDropdown();
}

function closeCreateChannel() {
    document.getElementById('createChannelModal').classList.add('hidden');
}

async function createChannel() {
    const name = document.getElementById('channelName').value;
    const username = document.getElementById('channelUsername').value.toLowerCase().replace('@','');
    const desc = document.getElementById('channelDescription').value;
    
    if (!name || !username) {
        alert('Заполните поля');
        return;
    }
    
    try {
        const existing = await db.collection('channels').where('username','==',username).get();
        if (!existing.empty) {
            alert('Имя занято');
            return;
        }
        
        await db.collection('channels').add({
            name, username, description: desc,
            avatar: name.charAt(0).toUpperCase(),
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            createdAt: new Date()
        });
        
        closeCreateChannel();
        switchTab('channels');
        showMessage('success', 'Канал создан');
    } catch (error) {
        console.error('Channel error:', error);
        alert('Ошибка создания');
    }
}

function showSubscribeChannel() {
    document.getElementById('subscribeChannelModal').classList.remove('hidden');
}

function closeSubscribeChannel() {
    document.getElementById('subscribeChannelModal').classList.add('hidden');
}

async function subscribeToChannel() {
    const username = document.getElementById('channelLink').value.toLowerCase().replace('@','');
    
    try {
        const channel = await db.collection('channels').where('username','==',username).get();
        if (channel.empty) {
            alert('Канал не найден');
            return;
        }
        
        const doc = channel.docs[0];
        const data = doc.data();
        
        if (data.members.includes(currentUser.uid)) {
            alert('Уже подписаны');
            closeSubscribeChannel();
            return;
        }
        
        await db.collection('channels').doc(doc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        
        alert('Подписка оформлена');
        closeSubscribeChannel();
    } catch (error) {
        console.error('Subscribe error:', error);
        alert('Ошибка подписки');
    }
}

// ===== ПРОФИЛЬ (КРАСИВАЯ МОДАЛКА) =====
function showProfile() {
    const user = users[currentUser.uid];
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fa-solid fa-user" style="margin-right: 10px;"></i>Мой профиль</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin: 0 auto;">${user.avatar}</div>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666;">Имя:</span>
                        <span style="font-weight: 600;">${user.name}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666;">Username:</span>
                        <span style="font-weight: 600;">@${user.username}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666;">Email:</span>
                        <span style="font-weight: 600;">${user.email}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666;">Moon:</span>
                        <span style="font-weight: 600; color: #667eea;">${user.moonBalance || 0} 🌙</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span style="color: #666;">UID:</span>
                        <span style="font-size: 11px; background: #eee; padding: 3px 6px; border-radius: 4px;">${user.uid}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    toggleDropdown();
}

function showChatInfo() {
    if (!currentChatId) return;
    
    if (currentChatType === 'chat') {
        const otherId = getOtherUserId();
        const user = users[otherId];
        if (user) alert(`Чат с ${user.name}\n@${user.username}`);
    } else {
        const channel = channels.find(c => c.id === currentChatId);
        if (channel) alert(`Канал ${channel.name}\n@${channel.username}\nУчастников: ${channel.members?.length || 0}`);
    }
}

function getOtherUserId() {
    const chat = chats.find(c => c.id === currentChatId);
    return chat?.participants.find(id => id !== currentUser.uid);
}

function attachFile() {
    alert('Файлы скоро будут');
}

document.getElementById('searchContacts').addEventListener('input', function() {
    const term = this.value.toLowerCase();
    document.querySelectorAll('.contact-item').forEach(item => {
        const name = item.querySelector('.contact-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(term) ? 'flex' : 'none';
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
        const existing = await db.collection('users').where('username','==',username).get();
        if (!existing.empty) {
            showMessage('error', 'Имя занято');
            return;
        }
        
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        
        await db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            name, username, email,
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
        const user = await db.collection('users').where('username','==',username).get();
        if (user.empty) {
            showMessage('error', 'Пользователь не найден');
            return;
        }
        
        await auth.signInWithEmailAndPassword(user.docs[0].data().email, password);
    } catch (error) {
        showMessage('error', error.message);
    }
});

window.addEventListener('load', () => {
    document.getElementById('authContainer').classList.remove('hidden');
});
