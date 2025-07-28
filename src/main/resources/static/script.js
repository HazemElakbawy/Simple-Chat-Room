// WebSocket connection and STOMP client
let stompClient = null;
let username = null;
let typingTimer = null;
let isTyping = false;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const usernameInput = document.getElementById('usernameInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messages = document.getElementById('messages');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');
const messageType = document.getElementById('messageType');
const targetUser = document.getElementById('targetUser');
const onlineUsers = document.getElementById('onlineUsers');
const userList = document.getElementById('userList');

// Track online users
let onlineUsersList = new Set();

/**
 * Establishes WebSocket connection to the Spring Boot server.
 * This demonstrates the client-side connection process.
 */
function connect() {
    username = usernameInput.value.trim();

    if (!username) {
        alert('Please enter your name');
        return;
    }

    // Update UI to show connecting state
    updateConnectionStatus('connecting', 'Connecting...');
    connectBtn.disabled = true;

    // Create SockJS connection - this handles the WebSocket connection with fallbacks
    const socket = new SockJS('http://localhost:8080/ws'); // Adjust URL for your server
    stompClient = Stomp.over(socket);

    // Enable debug logging (disable in production)
    stompClient.debug = (str) => {
        console.log('STOMP: ' + str);
    };

    // Connect to the server
    stompClient.connect({}, onConnected, onError);
}

/**
 * Called when WebSocket connection is successfully established.
 * This is where we set up our message subscriptions.
 */
function onConnected() {
    console.log('Connected to WebSocket server');
    updateConnectionStatus('connected', 'Connected');

    // Enable message input and send button
    messageInput.disabled = false;
    sendBtn.disabled = false;
    disconnectBtn.disabled = false;
    usernameInput.disabled = true;
    messageType.disabled = false;

    // Show online users section
    onlineUsers.style.display = 'block';

    // Subscribe to the public topic for broadcast messages
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Subscribe to private messages addressed to this user
    stompClient.subscribe('/user/queue/private', onPrivateMessageReceived);

    // Subscribe to typing indicators
    stompClient.subscribe('/topic/typing', onTypingReceived);

    // Subscribe to user count updates
    stompClient.subscribe('/topic/usercount', onUserCountReceived);

    // Announce that user has joined
    const joinMessage = {
        sender: username,
        type: 'JOIN',
        content: username + ' joined the chat!'
    };

    stompClient.send('/app/chat.addUser', {}, JSON.stringify(joinMessage));

    // Focus on message input for better UX
    messageInput.focus();
}

/**
 * Called when connection fails or encounters an error.
 */
function onError(error) {
    console.error('WebSocket connection error:', error);
    updateConnectionStatus('disconnected', 'Connection failed');
    connectBtn.disabled = false;

    // Show user-friendly error message
    addSystemMessage('Connection failed. Please check if the server is running and try again.');
}

/**
 * Handles incoming public messages from the /topic/public subscription.
 */
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log('Received message:', message);

    displayMessage(message);

    // Update user list when users join or leave
    if (message.type === 'JOIN') {
        onlineUsersList.add(message.sender);
        updateUserList();
    } else if (message.type === 'LEAVE') {
        onlineUsersList.delete(message.sender);
        updateUserList();
    }
}

/**
 * Handles private messages sent specifically to this user.
 */
function onPrivateMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log('Received private message:', message);

    // Display private messages with special styling
    displayMessage(message, true);
}

/**
 * Handles typing indicator messages.
 */
function onTypingReceived(payload) {
    const message = JSON.parse(payload.body);

    // Don't show our own typing indicator
    if (message.sender !== username) {
        showTypingIndicator(message.sender);
    }
}

/**
 * Handles user count updates from the server.
 */
function onUserCountReceived(payload) {
    const message = JSON.parse(payload.body);
    userCount.textContent = message.content;
}

/**
 * Sends a chat message to the server.
 */
function sendMessage() {
    const messageContent = messageInput.value.trim();
    const isPrivate = messageType.value === 'private';
    const recipient = targetUser.value.trim();

    if (!messageContent) return;

    if (isPrivate && !recipient) {
        alert('Please select a recipient for private messages');
        return;
    }

    if (isPrivate && recipient === username) {
        alert('You cannot send a private message to yourself');
        return;
    }

    if (stompClient) {
        if (isPrivate) {
            // Send private message
            const privateMessage = {
                sender: recipient, // This is the target recipient
                content: messageContent,
                type: 'PRIVATE'
            };

            stompClient.send('/app/chat.sendPrivate', {}, JSON.stringify(privateMessage));

            // Display the message locally for the sender
            const localMessage = {
                sender: username,
                content: `To ${recipient}: ${messageContent}`,
                type: 'PRIVATE',
                timestamp: new Date().toISOString()
            };
            displayMessage(localMessage, true);

        } else {
            // Send public message
            const chatMessage = {
                sender: username,
                content: messageContent,
                type: 'CHAT'
            };

            stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
        }

        messageInput.value = '';

        // Clear typing indicator when message is sent
        clearTypingIndicator();
    }
}

/**
 * Sends typing indicator to other users.
 */
function sendTypingIndicator() {
    if (stompClient && !isTyping && messageType.value === 'public') {
        isTyping = true;
        const typingMessage = {
            sender: username,
            content: '', // Content not needed for typing indicators
            type: 'TYPING'
        };
        stompClient.send('/app/chat.typing', {}, JSON.stringify(typingMessage));
    }
}

/**
 * Clears typing indicator and notifies server.
 */
function clearTypingIndicator() {
    isTyping = false;
    if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
    }
}

/**
 * Shows typing indicator in the UI.
 */
function showTypingIndicator(sender) {
    // Don't show typing indicator if someone is typing a private message
    // or if it's from the current user
    if (sender === username) return;

    typingIndicator.textContent = sender + ' is typing...';

    // Clear indicator after 3 seconds of inactivity
    setTimeout(() => {
        if (typingIndicator.textContent === sender + ' is typing...') {
            typingIndicator.textContent = '';
        }
    }, 3000);
}

/**
 * Displays a message in the chat interface.
 */
function displayMessage(message, isPrivate = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.type.toLowerCase()}`;

    if (isPrivate) {
        messageElement.classList.add('private');
    }

    const headerElement = document.createElement('div');
    headerElement.className = 'message-header';

    const timestamp = new Date().toLocaleTimeString();
    headerElement.textContent = `${message.sender} • ${timestamp}${isPrivate ? ' (Private)' : ''}`;

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.textContent = message.content;

    messageElement.appendChild(headerElement);
    messageElement.appendChild(contentElement);
    messages.appendChild(messageElement);

    // Scroll to bottom to show new message
    messages.scrollTop = messages.scrollHeight;
}

/**
 * Adds a system message to the chat.
 */
function addSystemMessage(content) {
    const systemMessage = {
        sender: 'System',
        content: content,
        type: 'SYSTEM'
    };
    displayMessage(systemMessage);
}

/**
 * Updates the online users list in the UI.
 */
function updateUserList() {
    userList.innerHTML = '';

    // Add current user first
    const currentUserBadge = document.createElement('span');
    currentUserBadge.className = 'user-badge current-user';
    currentUserBadge.textContent = username + ' (you)';
    userList.appendChild(currentUserBadge);

    // Add other users
    onlineUsersList.forEach(user => {
        if (user !== username) {
            const userBadge = document.createElement('span');
            userBadge.className = 'user-badge';
            userBadge.textContent = user;
            userBadge.onclick = () => selectUserForPrivateMessage(user);
            userBadge.title = 'Click to send private message';
            userList.appendChild(userBadge);
        }
    });
}

/**
 * Selects a user for private messaging.
 */
function selectUserForPrivateMessage(user) {
    messageType.value = 'private';
    targetUser.value = user;
    targetUser.style.display = 'inline-block';
    messageInput.placeholder = `Private message to ${user}...`;
    messageInput.focus();
}

/**
 * Updates connection status indicator.
 */
function updateConnectionStatus(status, text) {
    connectionStatus.className = `connection-status ${status}`;
    statusText.textContent = text;
}

/**
 * Disconnects from the WebSocket server.
 */
function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
        console.log('Disconnected from WebSocket server');
    }

    updateConnectionStatus('disconnected', 'Disconnected');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    messageInput.disabled = true;
    sendBtn.disabled = true;
    usernameInput.disabled = false;
    messageType.disabled = true;
    targetUser.disabled = true;

    // Hide online users and reset state
    onlineUsers.style.display = 'none';
    onlineUsersList.clear();
    updateUserList();

    addSystemMessage('You have been disconnected from the chat.');
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', sendMessage);

// Handle message type selection
messageType.addEventListener('change', (e) => {
    if (e.target.value === 'private') {
        targetUser.style.display = 'inline-block';
        targetUser.disabled = false;
        messageInput.placeholder = 'Select a user and type your private message...';
    } else {
        targetUser.style.display = 'none';
        targetUser.disabled = true;
        targetUser.value = '';
        messageInput.placeholder = 'Type your message...';
    }
});

// Send message on Enter key press and handle typing indicators
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
        return;
    }

    // Only send typing indicator for public messages
    if (messageType.value === 'public') {
        sendTypingIndicator();

        // Clear typing indicator after 1.5 seconds of inactivity
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            clearTypingIndicator();
        }, 1500);
    }
});

// Also handle typing on regular keyup for better responsiveness
messageInput.addEventListener('keyup', (e) => {
    // Don't trigger on Enter or special keys
    if (e.key === 'Enter' || e.key === 'Shift' || e.key === 'Ctrl' || e.key === 'Alt') {
        return;
    }

    // Only for public messages
    if (messageType.value === 'public' && messageInput.value.trim() !== '') {
        sendTypingIndicator();

        // Reset the timer
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            clearTypingIndicator();
        }, 1500);
    } else if (messageInput.value.trim() === '') {
        // Clear typing when input is empty
        clearTypingIndicator();
    }
});

// Connect on Enter key press in username field
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        connect();
    }
});

// Handle page unload to properly disconnect
window.addEventListener('beforeunload', () => {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
});

// Auto-focus on username input when page loads
window.addEventListener('load', () => {
    usernameInput.focus();
});
