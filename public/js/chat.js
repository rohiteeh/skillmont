/**
 * SkillMint Real-Time Socket.io Chat Client
 * Connects with authenticated JWT and handles live direct messaging
 */

let socket = null;
let currentChatPartnerId = null;
let currentChatPartnerName = 'Chat';
let typingTimer = null;
const SOCKET_BASE = (window.location.protocol === 'file:')
  ? 'http://localhost:3000'
  : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '3000' && window.location.port !== '5000'
      ? 'http://localhost:3000'
      : (window.location.origin || ''));

function initSocketConnection(token) {
  if (socket) {
    socket.disconnect();
  }

  // Socket.io loaded via CDN in index.html
  if (typeof io === 'undefined') {
    console.warn('Socket.io library not loaded yet.');
    return;
  }

  socket = io(SOCKET_BASE, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to SkillMint Socket.io server.');
    const dot = document.getElementById('chatStatusDot');
    if (dot) dot.style.background = 'var(--success)';
  });

  socket.on('receive_message', (msg) => {
    console.log('📩 Real-time message received:', msg);

    // Show unread indicator on chat trigger button
    const unreadDot = document.getElementById('chatUnreadDot');
    if (unreadDot) unreadDot.style.display = 'block';

    // If chat is open with this sender, render message immediately
    if (currentChatPartnerId && (Number(msg.SenderID) === Number(currentChatPartnerId))) {
      appendChatMessage(msg.MessageText, 'received', msg.SentDate);
      // Mark as read
      socket.emit('mark_as_read', { senderId: msg.SenderID });
    } else {
      showToast(`💬 New message from ${msg.SenderName || 'User'}: "${msg.MessageText.substring(0, 30)}..."`, 'info');
    }
  });

  socket.on('user_typing', (data) => {
    const indicator = document.getElementById('chatTypingIndicator');
    if (!indicator) return;

    if (currentChatPartnerId && Number(data.senderId) === Number(currentChatPartnerId)) {
      indicator.textContent = data.isTyping ? `${data.senderName} is typing...` : '';
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from Socket.io server.');
    const dot = document.getElementById('chatStatusDot');
    if (dot) dot.style.background = 'var(--danger)';
  });
}

function openChatWithUser(userId, userName) {
  currentChatPartnerId = Number(userId);

  if (!userName && typeof projectsData !== 'undefined' && Array.isArray(projectsData)) {
    const project = projectsData.find(p => Number(p.ClientID) === Number(userId));
    if (project && project.ClientName) {
      userName = project.ClientName;
    }
  }

  currentChatPartnerName = userName || `User #${userId}`;

  const drawer = document.getElementById('chatDrawer');
  const partnerNameEl = document.getElementById('chatPartnerName');
  const partnerRoleEl = document.getElementById('chatPartnerRole');
  const unreadDot = document.getElementById('chatUnreadDot');

  if (partnerNameEl) partnerNameEl.textContent = currentChatPartnerName;
  if (partnerRoleEl) partnerRoleEl.textContent = 'Active Partner';
  if (unreadDot) unreadDot.style.display = 'none';

  if (drawer) {
    drawer.classList.add('active');
  }

  loadChatHistory(currentChatPartnerId);
}

function closeChat() {
  const drawer = document.getElementById('chatDrawer');
  if (drawer) drawer.classList.remove('active');
}

async function loadChatHistory(otherUserId) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">Loading conversation...</div>';

  try {
    const token = localStorage.getItem('skillmint_token');
    const res = await fetch(`${SOCKET_BASE}/api/messages/${otherUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    messagesContainer.innerHTML = '';

    if (data.success && data.data && data.data.length > 0) {
      const currentUserId = JSON.parse(localStorage.getItem('skillmint_user') || '{}').UserID;
      data.data.forEach(msg => {
        const type = Number(msg.SenderID) === Number(currentUserId) ? 'sent' : 'received';
        appendChatMessage(msg.MessageText, type, msg.SentDate);
      });
    } else {
      messagesContainer.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">No messages yet. Send a message to start collaborating!</div>';
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (err) {
    console.error('Failed to load chat history:', err);
    messagesContainer.innerHTML = '<div style="text-align:center; color:var(--danger); padding:20px;">Failed to load messages.</div>';
  }
}

function appendChatMessage(text, type, timestamp) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;

  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

  bubble.innerHTML = `
    <div>${escapeHtml(text)}</div>
    <div class="chat-time">${timeStr}</div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function handleSendMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim() || !currentChatPartnerId) return;

  const text = input.value.trim();
  input.value = '';

  // Stop typing event
  if (socket) {
    socket.emit('typing', { receiverId: currentChatPartnerId, isTyping: false });
  }

  // If socket is connected, emit real-time message
  if (socket && socket.connected) {
    socket.emit('send_message', {
      receiverId: currentChatPartnerId,
      messageText: text
    }, (ack) => {
      if (!ack || !ack.success) {
        showToast('Message delivery failed.', 'error');
      }
    });
    appendChatMessage(text, 'sent', new Date());
  } else {
    // Fallback to REST API
    const token = localStorage.getItem('skillmint_token');
    fetch(`${SOCKET_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ReceiverID: currentChatPartnerId, MessageText: text })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        appendChatMessage(text, 'sent', new Date());
      } else {
        showToast(data.message || 'Failed to send message.', 'error');
      }
    });
  }
}

function handleTypingEvent() {
  if (!socket || !currentChatPartnerId) return;

  socket.emit('typing', { receiverId: currentChatPartnerId, isTyping: true });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing', { receiverId: currentChatPartnerId, isTyping: false });
  }, 1200);
}
