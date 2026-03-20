(() => {
    // --- AUTO-INJECT PRODUCTION UI (Bubbles, Modals & PODIUM) ---
    const uiContainer = document.createElement('div');
    uiContainer.innerHTML = `
        <div id="bubbles-container"></div>
        <div id="custom-alert-modal" class="modal">
            <div class="modal-content" style="text-align: center; margin:auto;">
                <h3 style="color:var(--danger); margin-bottom: 15px;">NOTICE</h3>
                <p id="custom-alert-msg" style="margin-bottom: 20px; font-size:1.1rem;"></p>
                <button id="btn-custom-alert-close" class="btn-glow" style="width:100%">CLOSE</button>
            </div>
        </div>
        
        <div id="podium-modal" class="modal" style="z-index: 10000;">
            <div class="modal-content" style="text-align: center; margin:auto;">
                <h1 style="color:var(--accent1); text-shadow: 0 0 15px var(--accent1); font-size:2.5rem; margin-bottom: 5px;">MATCH OVER!</h1>
                <p style="opacity: 0.8; margin-bottom: 20px;">First to 50 Points wins.</p>
                
                <div class="podium-container" id="podium-display">
                    </div>

                <div id="podium-host-controls" style="display:none; margin-top: 20px;">
                    <button id="btn-play-again" class="btn-glow" style="width:100%; font-size:1.2rem; padding: 15px;">PLAY AGAIN</button>
                </div>
                <div id="podium-guest-msg" style="margin-top: 20px; font-style: italic; opacity: 0.7;">
                    Waiting for Host to start a new match...
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(uiContainer);

    // Override default alert
    window.alert = function(msg) {
        document.getElementById('custom-alert-msg').textContent = msg;
        document.getElementById('custom-alert-modal').classList.add('open');
    };
    document.getElementById('btn-custom-alert-close').onclick = () => {
        document.getElementById('custom-alert-modal').classList.remove('open');
    };

    // Play Again Button Logic
    document.getElementById('btn-play-again').onclick = () => {
        window.socket.emit('play_again');
    };

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
    let started = false;
    let timeEndsAt = null;
    let rafId = null;

    if (tokenBadge) tokenBadge.textContent = `Token: ${token || '—'}`;

    const sounds = {
        win: new Audio('/assets/sounds/win.wav'),
        timeout: new Audio('/assets/sounds/timeout.wav'),
        wrong: new Audio('/assets/sounds/wrong.wav'),
        click: new Audio('/assets/sounds/click.wav'),
        start: new Audio('/assets/sounds/start.wav')
    };
    function playSound(key) {
        try { const s = sounds[key]; if (!s) return; s.currentTime = 0; s.play().catch(() => {}); } catch (e) {}
    }

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

    function setQuestionCard(text) {
        if (!questionBoard || !questionTextEl) return;
        questionTextEl.textContent = text;
        questionBoard.classList.add('active');
    }
    function hideQuestionCard() {
        if (!questionBoard) return;
        questionBoard.classList.remove('active');
    }

    function checkInstructions() { if (modal) modal.classList.add('open'); }
    if (btnHelp) btnHelp.onclick = () => { modal.classList.add('open'); playSound('click'); };
    if (btnCloseHelp) btnCloseHelp.onclick = () => { modal.classList.remove('open'); playSound('click'); };

    function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }

    function addChat(from, text, type = 'chat') {
        if (!chatWindow) return;
        const el = document.createElement('div');
        if (type === 'system') {
            el.className = 'system-msg';
            el.innerHTML = `> ${text}`;
        } else {
            el.className = 'chat-bubble' + (from === name ? ' mine' : '');
            el.innerHTML = `<div style="font-weight:700;font-size:0.8em;margin-bottom:6px;opacity:0.75">${esc(from)}</div><div>${esc(text)}</div>`;
        }
        chatWindow.appendChild(el);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function spawnBubble(playerName) {
        const container = document.getElementById('bubbles-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'join-bubble';
        el.textContent = `${playerName} joined!`;
        const colors = ['#00f2ff', '#bc13fe', '#00ff6a', '#ff0055', '#ffaa00'];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.left = Math.random() * 60 + 20 + '%'; 
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    function renderPlayers(list) {
        players = list || [];
        if (playerCount) playerCount.textContent = `Players: ${players.length}`;
        if (!playersList) return;

        const newMasterObj = players.find(p => p.isMaster);
        const newMasterId = newMasterObj ? newMasterObj.id : null;

        if (currentMasterId && newMasterId && currentMasterId !== newMasterId) {
            const isMe = (window.socket && window.socket.id === newMasterId);
            setTimeout(() => {
                if (isMe) showFlash("YOU ARE HOST", "It is your turn to create a question!", 3000);
                else showFlash("NEW HOST", `<span style="color:var(--accent1)">${esc(newMasterObj.name)}</span> is now the Host.`, 3000);
                playSound('click');
            }, 500);
        }
        currentMasterId = newMasterId;

        players.sort((a, b) => b.score - a.score);

        playersList.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            
            // NEW: Render the Avatar and the Fire Streak icon if applicable
            const streakHtml = p.streak >= 3 ? `<span class="fire-streak" title="On a ${p.streak} streak!">🔥</span>` : '';
            
            const nameHtml = `<div style="display:flex;align-items:center;gap:10px">
                          <div class="avatar">${p.avatar || '👤'}</div>
                          <div>
                            <div class="player-name" style="font-weight:700;color:${p.isMaster ? 'gold' : 'inherit'}">
                                ${p.isMaster ? `<span class="crown" title="Master">👑</span> ` : ''}
                                ${esc(p.name)} ${streakHtml}
                            </div>
                            <div style="font-size:0.8rem;opacity:0.7">Score: ${p.score}</div>
                          </div>
                        </div>`;
            
            const attemptsHtml = p.isMaster 
                ? `<div class="attempts" style="color: gold; font-weight: bold; font-size: 0.8rem;">HOST</div>` 
                : `<div class="attempts" id="attempt-${p.id}">${renderAttempts(p.attemptsLeft)}</div>`;
            
            li.innerHTML = `${nameHtml}${attemptsHtml}`;
            playersList.appendChild(li);
        });

        const meId = window.socket && window.socket.id;
        const amIMaster = players.some(p => p.id === meId && p.isMaster);
        if (masterPanel) masterPanel.style.display = amIMaster ? 'block' : 'none';
        
        const chatInputContainer = document.querySelector('.chat-input-container');
        if (chatInputContainer) { chatInputContainer.style.display = amIMaster ? 'none' : 'flex'; }
    }

    function renderAttempts(n) {
        if (n <= 0) return 'No attempts';
        return '❤'.repeat(Math.max(0, n));
    }

    const RADIUS = 54;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    if (ringCircle) ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;

    function setTimerVisual(remaining, duration = 60) {
        if (!ringCircle || !timerTextEl) return;
        const pct = Math.max(0, Math.min(1, remaining / duration));
        const offset = CIRCUMFERENCE * (1 - pct);
        ringCircle.style.strokeDashoffset = offset;
        timerTextEl.textContent = String(Math.ceil(remaining));

        if (remaining > 30) { ringCircle.classList.add('ring-green'); ringCircle.classList.remove('ring-yellow', 'ring-red'); } 
        else if (remaining > 10) { ringCircle.classList.add('ring-yellow'); ringCircle.classList.remove('ring-green', 'ring-red'); } 
        else { ringCircle.classList.add('ring-red'); ringCircle.classList.remove('ring-green', 'ring-yellow'); }
    }

    function startTimerLoop(duration) {
        cancelAnimationFrame(rafId);
        setTimerVisual(duration, duration);
        function tick() {
            if (!timeEndsAt) return;
            const now = Date.now();
            const remainingSeconds = Math.max(0, (timeEndsAt - now) / 1000);
            setTimerVisual(remainingSeconds, duration);
            if (remainingSeconds > 0) rafId = requestAnimationFrame(tick);
            else setTimerVisual(0, duration);
        }
        tick();
    }

    function stopTimerLoop() {
        cancelAnimationFrame(rafId);
        timeEndsAt = null;
        setTimerVisual(0, 60);
    }

    if (btnSend) btnSend.addEventListener('click', sendChatOrGuess);
    if (inputChat) inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatOrGuess(); });

    function sendChatOrGuess() {
        const txt = (inputChat && inputChat.value || '').trim();
        if (!txt) return;

        if (!started) window.socket.emit('send_chat', { text: txt });
        else {
            window.socket.emit('guess', { guess: txt }, (res) => {
                if (res && res.error) {
                    if (res.error === 'You already guessed the answer!') alert(res.error);
                    else window.socket.emit('send_chat', { text: txt });
                }
            });
        }
        if (inputChat) inputChat.value = '';
        playSound('click');
    }

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
        if (res.error) { alert(res.error); setTimeout(()=>location.href = '/', 2000); return; }
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
                showFlash('Question Saved', 'Host has set a question. Start when ready.', 2200);
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

    if (window.socket && window.socket.on) {
        window.socket.off('players_update');
        window.socket.off('notice');
        window.socket.off('chat_message');
        window.socket.off('question_ready');
        window.socket.off('game_started');
        window.socket.off('wrong_guess');
        window.socket.off('round_ended_no_winner');
        window.socket.off('player_won');
        window.socket.off('round_ended_all_done');
        window.socket.off('game_ended_timeout');
        window.socket.off('match_ended');
        window.socket.off('match_restarted');

        window.socket.on('players_update', (list) => renderPlayers(list));
        
        window.socket.on('notice', (msg) => { 
            addChat('System', msg, 'system'); 
            showNotice(msg); 
            if (msg.includes('joined')) {
                const joinName = msg.split(' ')[0];
                spawnBubble(joinName);
            }
        });
        
        window.socket.on('chat_message', (m) => addChat(m.from, m.text, m.type));

        window.socket.on('question_ready', ({ question }) => {
            showFlash('QUESTION READY', `<div style="font-size:0.95rem">${esc(question)}</div><div style="font-size:0.8rem;opacity:0.8">Host can start the round</div>`, 3000);
            setQuestionCard(question); 
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
            showFlash("ROUND OVER", `No winner — answer: <span style="color:var(--accent1)">${esc(answer)}</span>`, 3000);
            playSound('timeout');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); 
        });

       window.socket.on('player_won', ({ winnerId, winnerName, earned, isHot }) => {
            const streakMsg = isHot ? `<br><span style="color:#ffaa00; font-size:0.8rem;">🔥 STREAK BONUS INCLUDED!</span>` : '';
            
            if (window.socket.id === winnerId) {
                showFlash("CORRECT!", `You earned <span style="color:var(--success)">+${earned} Points</span>!${streakMsg}`, 2500, true);
                playSound('win');
            } else {
                addChat('System', `<span style="color:var(--success)">${esc(winnerName)} guessed correctly! (+${earned} pts)</span>`, 'system');
                playSound('click');
            }
        });

        window.socket.on('round_ended_all_done', ({ answer }) => {
            showFlash("ALL DONE!", `Everyone finished! Answer was: <br><span style="color:var(--accent1)">${esc(answer)}</span>`, 3000);
            playSound('win');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); 
        });

        window.socket.on('game_ended_timeout', ({ answer }) => {
            showFlash("TIME'S UP", `Answer was: <span style="color:var(--accent1)">${esc(answer)}</span>`, 3000);
            playSound('timeout');
            started = false;
            stopTimerLoop();
            hideQuestionCard(); 
        });

        
        // NEW: ENDGAME PODIUM LOGIC
        
        window.socket.on('match_ended', ({ podium }) => {
            // Wait 3.5 seconds so the "Round Over" flash card has time to clear
            setTimeout(() => {
                const podiumModal = document.getElementById('podium-modal');
                const display = document.getElementById('podium-display');
                const hostControls = document.getElementById('podium-host-controls');
                const guestMsg = document.getElementById('podium-guest-msg');
                
                playSound('win'); // Optional: Add a huge cheer sound effect if you have one
                display.innerHTML = ''; 

                // Order for visual display: 2nd place, 1st place, 3rd place
                const order = [1, 0, 2]; 
                const colors = ['podium-silver', 'podium-gold', 'podium-bronze'];
                const trophies = ['🥈', '🏆', '🥉'];

                order.forEach(idx => {
                    if (podium[idx]) {
                        const p = podium[idx];
                        display.innerHTML += `
                            <div class="podium-bar ${colors[idx]}">
                                <div class="p-name"><div class="podium-1st">${trophies[idx]}</div>${esc(p.name)}</div>
                                <div class="p-score">${p.score}</div>
                            </div>
                        `;
                    }
                });

                // Show host button if applicable
                const amIMaster = players.some(p => p.id === window.socket.id && p.isMaster);
                hostControls.style.display = amIMaster ? 'block' : 'none';
                guestMsg.style.display = amIMaster ? 'none' : 'block';

                podiumModal.classList.add('open');
            }, 3500); 
        });

        window.socket.on('match_restarted', () => {
            document.getElementById('podium-modal').classList.remove('open');
            playSound('start');
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