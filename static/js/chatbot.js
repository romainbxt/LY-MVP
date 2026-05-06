(function () {
    'use strict';

    // ── Role Detection ──
    function detectRole() {
        var navLinks = document.querySelectorAll('.navbar a, .nav-links a');
        for (var i = 0; i < navLinks.length; i++) {
            if (navLinks[i].textContent.trim() === 'Dashboard') return 'merchant';
        }
        if (window.location.pathname.indexOf('/card/') === 0) return 'customer';
        if (window.location.pathname.indexOf('/join/') === 0) return 'customer';
        return 'visitor';
    }

    var WELCOME = {
        visitor: "Hi! I'm the LY assistant. Ask me anything about our smart loyalty platform for independent businesses!",
        merchant: "Hi! I'm your LY assistant. I can help with your dashboard, customer management, rewards, QR scanning, and more.",
        customer: "Hi! I'm the LY assistant. I can help you understand your loyalty card, rewards, and visit history."
    };

    var isOpen = false;
    var isLoading = false;
    var history = [];
    var role = 'visitor';
    var container, btn, win, messagesEl, inputEl, sendBtn;

    function createWidget() {
        role = detectRole();
        container = document.createElement('div');
        container.className = 'ly-chatbot';

        btn = document.createElement('button');
        btn.className = 'ly-chatbot-btn';
        btn.setAttribute('aria-label', 'Open chat');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        btn.addEventListener('click', toggle);

        win = document.createElement('div');
        win.className = 'ly-chatbot-window';

        var header = document.createElement('div');
        header.className = 'ly-chatbot-header';
        header.innerHTML =
            '<div class="ly-chatbot-header-info">' +
                '<span class="ly-chatbot-header-title">LY Assistant</span>' +
                '<span class="ly-chatbot-header-sub">Ask me anything</span>' +
            '</div>';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ly-chatbot-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.addEventListener('click', toggle);
        header.appendChild(closeBtn);

        messagesEl = document.createElement('div');
        messagesEl.className = 'ly-chatbot-messages';

        var inputArea = document.createElement('div');
        inputArea.className = 'ly-chatbot-input';

        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = 'Type your message...';
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn = document.createElement('button');
        sendBtn.setAttribute('aria-label', 'Send');
        sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        sendBtn.addEventListener('click', sendMessage);

        inputArea.appendChild(inputEl);
        inputArea.appendChild(sendBtn);

        win.appendChild(header);
        win.appendChild(messagesEl);
        win.appendChild(inputArea);
        container.appendChild(win);
        container.appendChild(btn);
        document.body.appendChild(container);

        addBotMessage(WELCOME[role] || WELCOME.visitor);
    }

    function toggle() {
        isOpen = !isOpen;
        win.classList.toggle('open', isOpen);
        btn.classList.toggle('open', isOpen);
        if (isOpen) {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            inputEl.focus();
        } else {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        }
    }

    function addBotMessage(text) {
        var wrapper = document.createElement('div');
        wrapper.className = 'ly-chatbot-msg bot';
        var avatar = document.createElement('div');
        avatar.className = 'ly-chatbot-avatar';
        avatar.textContent = 'LY';
        var bubble = document.createElement('div');
        bubble.className = 'ly-chatbot-bubble';
        bubble.textContent = text;
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        messagesEl.appendChild(wrapper);
        scrollToBottom();
    }

    function addUserMessage(text) {
        var wrapper = document.createElement('div');
        wrapper.className = 'ly-chatbot-msg user';
        var bubble = document.createElement('div');
        bubble.className = 'ly-chatbot-bubble';
        bubble.textContent = text;
        wrapper.appendChild(bubble);
        messagesEl.appendChild(wrapper);
        scrollToBottom();
    }

    function showTyping() {
        var wrapper = document.createElement('div');
        wrapper.className = 'ly-chatbot-msg bot';
        wrapper.id = 'ly-chatbot-typing';
        var avatar = document.createElement('div');
        avatar.className = 'ly-chatbot-avatar';
        avatar.textContent = 'LY';
        var dots = document.createElement('div');
        dots.className = 'ly-chatbot-typing';
        dots.innerHTML = '<span></span><span></span><span></span>';
        wrapper.appendChild(avatar);
        wrapper.appendChild(dots);
        messagesEl.appendChild(wrapper);
        scrollToBottom();
    }

    function hideTyping() {
        var el = document.getElementById('ly-chatbot-typing');
        if (el) el.remove();
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function sendMessage() {
        var text = inputEl.value.trim();
        if (!text || isLoading) return;
        addUserMessage(text);
        history.push({ role: 'user', content: text });
        inputEl.value = '';
        inputEl.disabled = true;
        sendBtn.disabled = true;
        isLoading = true;
        showTyping();

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, role: role, history: history.slice(-10) })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            hideTyping();
            var reply = data.reply || "Sorry, I couldn't respond. Please try again.";
            addBotMessage(reply);
            history.push({ role: 'assistant', content: reply });
        })
        .catch(function () {
            hideTyping();
            addBotMessage("Sorry, an error occurred. Please try again.");
        })
        .finally(function () {
            isLoading = false;
            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
