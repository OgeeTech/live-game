// public/js/game.js
(() => {
    const params = new URLSearchParams(location.search);
    let token = (params.get('token') || '').toUpperCase();
    const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
    const role = params.get('as') || 'player';

    // DOM refs
    const tokenBadge = document.getElementById('token-badge');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const chatWindow = document.getElementById('chat');
    const inputChat = document.getElementById('input-chat');
    const btnSend = document.getElementById('btn-send');

    const masterPanel = document.getElementById('master-controls');
    const inputQuestion = document.getElementById('input-question');
    const inputAnswer = document.getElementById('input-answer');
    const btnCreateQ = document.getElementById('btn-create-question');
    const btnStart = document.getElementById('btn-start');
    const btnLeave = document.getElementById('btn-leave');

    const timerTextEl = document.getElementById('timer-value');
    const ringCircle = document.getElementById('ring-circle');

    // REFS FOR QUESTION CARD
    const questionBoard = document.getElementById('question-board');
    const questionTextEl = document.getElementById('q-text');

    const flashCard = document.getElementById('flash-card');
    const flashTitle = document.getElementById('flash-title');
    const flashBody = document.getElementById('flash-body');
    const btnFlashClose = document.getElementById('btn-flash-close');

    const modal = document.getElementById('instructions-modal');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');

    // STATE TRACKING
    let currentMasterId = null;
    let players = [];
    let started = false; // Tracks if game is live
    let timeEndsAt = null;
    let rafId = null;

    if (tokenBadge) tokenBadge.textContent = `Token: ${token || '—'}`;

    // Sounds
    const sounds = {
        win: new Audio('/assets/sounds/win.wav'),
        timeout: new Audio('/assets/sounds/timeout.wav'),
        wrong: new Audio('/assets/sounds/wrong.wav'),
        click: new Audio('/assets/sounds/click.wav'),
        start: new Audio('/assets/sounds/start.wav')
    };
    function playSound(key) {
        try { const s = sounds[key]; if (!s) return; s.currentTime = 0; s.play().catch(() => { }); } catch (e) { }
    }

    // Flash card utility
    let flashTimeout = null;
    function showFlash(title, html, ms = 2500, isWinner = false) {
        if (!flashCard) return;
        clearTimeout(flashTimeout);
        flashTitle.textContent = title;
        flashBody.innerHTML = html;
        flashCard.classList.add('active');
        if (isWinner) flashBody.classList.add('winner-anim'); else flashBody.classList.remove('winner-anim');
        if (ms > 0) flashTimeout = setTimeout(() => flashCard.classList.remove('active'), ms);
    }
    if (btnFlashClose) btnFlashClose.onclick = () => flashCard.classList.remove('active');

    // --- QUESTION CARD UTILS ---
    function setQuestionCard(text) {
        if (!questionBoard || !questionTextEl) return;
        questionTextEl.textContent = text;
        questionBoard.classList.add('active');
    }
    function hideQuestionCard() {
        if (!questionBoard) return;
        questionBoard.classList.remove('active');
    }

    // --- INSTRUCTIONS LOGIC ---
    function checkInstructions() {
        if (modal) {
            modal.classList.add('open');
        }
    }

    if (btnHelp) {
        btnHelp.onclick = () => { modal.classList.add('open'); playSound('click'); };
    }
    if (btnCloseHelp) {
        btnCloseHelp.onclick = () => { modal.classList.remove('open'); playSound('click'); };
    }

    // --- UTILS ---
    function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }

    function addChat(from, text, type = 'chat') {
        if (!chatWindow) return;
        const el = document.createElement('div');
        if (type === 'system') {
            el.className = 'system-msg';
            el.textContent = `> ${text}`;
        } else {
            el.className = 'chat-bubble' + (from === name ? ' mine' : '');
            el.innerHTML = `<div style="font-weight:700;font-size:0.8em;margin-bottom:6px;opacity:0.75">${esc(from)}</div><div>${esc(text)}</div>`;
        }
        chatWindow.appendChild(el);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function renderPlayers(list) {
        players = list || [];
        if (playerCount) playerCount.textContent = `Players: ${players.length}`;
        if (!playersList) return;

        // Detect Master Change
        const newMasterObj = players.find(p => p.isMaster);
        const newMasterId = newMasterObj ? newMasterObj.id : null;

        if (currentMasterId && newMasterId && currentMasterId !== newMasterId) {
            const isMe = (window.socket && window.socket.id === newMasterId);
            setTimeout(() => {
                if (isMe) {
                    showFlash("YOU ARE MASTER", "It is your turn to create a question!", 3000);
                } else {
                    showFlash("NEW MASTER", `<span style="color:var(--accent1)">${esc(newMasterObj.name)}</span> is now the Master.`, 3000);
                }
                playSound('click');
            }, 500);
        }
        currentMasterId = newMasterId;

        playersList.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            const nameHtml = `<div style="display:flex;align-items:center;gap:10px">
                          ${p.isMaster ? `<span class="crown" title="Master">👑</span>` : ''}
                          <div>
                            <div class="player-name" style="font-weight:700;color:${p.isMaster ? 'gold' : 'inherit'}">${esc(p.name)}</div>
                            <div style="font-size:0.8rem;opacity:0.7">Score: ${p.score}</div>
                          </div>
                        </div>`;
            const attemptsHtml = `<div class="attempts" id="attempt-${p.id}">${renderAttempts(p.attemptsLeft)}</div>`;
            li.innerHTML = `${nameHtml}${attemptsHtml}`;
            playersList.appendChild(li);
        });

        const meId = window.socket && window.socket.id;
        const amIMaster = players.some(p => p.id === meId && p.isMaster);
        if (masterPanel) masterPanel.style.display = amIMaster ? 'block' : 'none';
    }

    function renderAttempts(n) {
        if (n <= 0) return 'No attempts';
        return '❤'.repeat(Math.max(0, n));
    }

    // --- TIMER LOGIC ---
    const RADIUS = 54;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    if (ringCircle) ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;

    function setTimerVisual(remaining, duration = 60) {
        if (!ringCircle || !timerTextEl) return;
        const pct = Math.max(0, Math.min(1, remaining / duration));
        const offset = CIRCUMFERENCE * (1 - pct);
        ringCircle.style.strokeDashoffset = offset;
        timerTextEl.textContent = String(Math.ceil(remaining));

        if (remaining > 30) {
            ringCircle.classList.add('ring-green'); ringCircle.classList.remove('ring-yellow', 'ring-red');
        } else if (remaining > 10) {
            ringCircle.classList.add('ring-yellow'); ringCircle.classList.remove('ring-green', 'ring-red');
        } else {
            ringCircle.classList.add('ring-red'); ringCircle.classList.remove('ring-green', 'ring-yellow');
        }
    }

    function startTimerLoop(duration) {
        cancelAnimationFrame(rafId);
        setTimerVisual(duration, duration);
        function tick() {
            if (!timeEndsAt) return;
            const now = Date.now();
            const remainingSeconds = Math.max(0, (timeEndsAt - now) / 1000);
            setTimerVisual(remainingSeconds, duration);
            if (remainingSeconds > 0) {
                rafId = requestAnimationFrame(tick);
            } else {
                setTimerVisual(0, duration);
            }
        }
        tick();
    }

    function stopTimerLoop() {
        cancelAnimationFrame(rafId);
        timeEndsAt = null;
        setTimerVisual(0, 60);
    }

    // --- SEND LOGIC (FIX FOR DOUBLE BUBBLES) ---
    if (btnSend) btnSend.addEventListener('click', sendChatOrGuess);
    if (inputChat) inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatOrGuess(); });

    function sendChatOrGuess() {
        const txt = (inputChat && inputChat.value || '').trim();
        if (!txt) return;

        // FIX: If game is NOT started, send directly as chat.
        // This prevents the client from trying to guess, failing, and then echoing.
        if (!started) {
            window.socket.emit('send_chat', { text: txt });
        } else {
            window.socket.emit('guess', { guess: txt }, (res) => {
                // If the server rejects the guess (e.g. game error), fallback to chat
                if (res && res.error) window.socket.emit('send_chat', { text: txt });
            });
        }

        if (inputChat) inputChat.value = '';
        playSound('click');
    }

    // --- SOCKETS ---
    if (window.socket && window.socket.on) {
        window.socket.on('connect', () => {
            if (role === 'master' && !token) {
                window.socket.emit('create_game', { name }, (res) => {
                    if (res && res.token) {
                        token = res.token;
                        if (tokenBadge) tokenBadge.textContent = `Token: ${token}`;
                        showNotice(`Game created. Token: ${token}`);
                        playSound('click');
                        checkInstructions();
                    }
                });
            } else {
                if (role === 'master') window.socket.emit('claim_master', { token, name }, joinCB);
                else window.socket.emit('join_game', { token, name }, joinCB);
            }
        });
    }

    function joinCB(res) {
        if (!res) return;
        if (res.error) { alert(res.error); location.href = '/'; return; }
        if (res.token) { token = res.token; if (tokenBadge) tokenBadge.textContent = `Token: ${token}`; }
        checkInstructions();
        playSound('click');
    }

    if (btnCreateQ) btnCreateQ.addEventListener('click', () => {
        const q = (inputQuestion && inputQuestion.value || '').trim();
        const a = (inputAnswer && inputAnswer.value || '').trim();
        if (!q || !a) return alert('Both question and answer required');
        window.socket.emit('create_question', { question: q, answer: a }, (res) => {
            if (res && res.ok) {
                if (inputQuestion) inputQuestion.value = '';
                if (inputAnswer) inputAnswer.value = '';
                showFlash('Question Saved', 'Master has set a question. Start when ready.', 2200);
                playSound('click');
            } else if (res && res.error) alert(res.error);
        });
    });

    if (btnStart) btnStart.addEventListener('click', () => {
        window.socket.emit('start_game', (res) => {
            if (res && res.error) return alert(res.error);
            playSound('start');
        });
    });

    if (btnLeave) btnLeave.addEventListener('click', () => window.socket.emit('leave_game', () => location.href = '/'));

    // --- SOCKET EVENT HANDLERS (WITH CLEANUP) ---
    if (window.socket && window.socket.on) {
        // FIX: Remove old listeners to prevent "echoes" if script re-runs
        window.socket.off('players_update');
        window.socket.off('notice');
        window.socket.off('chat_message');
        window.socket.off('question_ready');
        window.socket.off('game_started');
        window.socket.off('wrong_guess');
        window.socket.off('round_ended_no_winner');
        window.socket.off('player_won');
        window.socket.off('game_ended_timeout');

        window.socket.on('players_update', (list) => renderPlayers(list));
        window.socket.on('notice', (msg) => { addChat('System', msg, 'system'); showNotice(msg); });
        window.socket.on('chat_message', (m) => addChat(m.from, m.text, m.type));

        window.socket.on('question_ready', ({ question }) => {
            showFlash('QUESTION READY', `<div style="font-size:0.95rem">${esc(question)}</div><div style="font-size:0.8rem;opacity:0.8">Master can start the round</div>`, 3000);
            setQuestionCard(question); // <--- Show Card
            playSound('click');
        });

        window.socket.on('game_started', ({ duration }) => {
            started = true;
            const d = duration || 60;
            timeEndsAt = Date.now() + (d * 1000);
            showFlash('ROUND START', 'Guess the answer!', 1500);
            playSound('start');
            startTimerLoop(d);
            if (inputChat) inputChat.focus();
        });

        window.socket.on('wrong_guess', (payload) => {
            const who = payload && payload.name;
            const attemptsLeft = payload && payload.attemptsLeft;
            addChat('System', `${who} guessed wrong. Attempts left: ${attemptsLeft}`, 'system');
            playSound('wrong');
            if (payload && payload.id) {
                const el = document.getElementById(`attempt-${payload.id}`);
                if (el) el.innerText = (attemptsLeft <= 0 ? 'No attempts' : '❤'.repeat(attemptsLeft));
            }
        });

        window.socket.on('round_ended_no_winner', ({ answer }) => {
            showFlash("ROUND OVER", `No winner — answer: <span style="color:var(--accent1)">${esc(answer)}</span>`, 4000);
            playSound('timeout');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); // <--- Hide Card
        });

        window.socket.on('player_won', ({ winnerId, winnerName, answer }) => {
            showFlash("WE HAVE A WINNER", `<strong>${esc(winnerName)}</strong><br>Answer: ${esc(answer)}`, 4500, true);
            playSound('win');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); // <--- Hide Card
        });

        window.socket.on('game_ended_timeout', ({ answer }) => {
            showFlash("TIME'S UP", `Answer was: <span style="color:var(--accent1)">${esc(answer)}</span>`, 3500);
            playSound('timeout');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); // <--- Hide Card
        });
    }

    let noticeTimer = null;
    function showNotice(txt) {
        const nb = document.getElementById('notice-board');
        if (!nb) return;
        nb.style.display = txt ? 'block' : 'none';
        nb.textContent = txt || '';
        clearTimeout(noticeTimer);
        if (txt) noticeTimer = setTimeout(() => { nb.style.display = 'none'; }, 5000);
    }
    const overlay = document.getElementById('overlay-layer');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) flashCard.classList.remove('active'); });

    showNotice('');
    addChat('System', 'Connecting to server...', 'system');
})();