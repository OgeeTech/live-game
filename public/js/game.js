

// // public/js/game.js
// (function () {
//     const params = new URLSearchParams(location.search);
//     let token = (params.get('token') || '').toUpperCase();
//     const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
//     const role = params.get('as') || 'player';

//     // DOM Elements
//     const tokenBadge = document.getElementById('token-badge');
//     const playerCount = document.getElementById('player-count');
//     const playersList = document.getElementById('players-list');
//     const chatWindow = document.getElementById('chat');
//     const inputChat = document.getElementById('input-chat');
//     const btnSend = document.getElementById('btn-send');

//     // Master Controls
//     const masterPanel = document.getElementById('master-controls');
//     const inputQuestion = document.getElementById('input-question');
//     const inputAnswer = document.getElementById('input-answer');
//     const btnCreateQ = document.getElementById('btn-create-question');
//     const btnStart = document.getElementById('btn-start');
//     const btnLeave = document.getElementById('btn-leave');

//     // Timer
//     const timerValueEl = document.getElementById('timer-value');
//     const ringCircle = document.getElementById('ring-circle');

//     // Overlays
//     const flashCard = document.getElementById('flash-card');
//     const flashTitle = document.getElementById('flash-title');
//     const flashBody = document.getElementById('flash-body');
//     const btnFlashClose = document.getElementById('btn-flash-close');

//     // Instructions
//     const modal = document.getElementById('instructions-modal');
//     const btnHelp = document.getElementById('btn-help');
//     const btnCloseHelp = document.getElementById('btn-close-help');

//     tokenBadge.textContent = `Token: ${token}`;

//     // Sound Setup
//     const sounds = {
//         win: new Audio('/assets/sounds/win.wav'),
//         timeout: new Audio('/assets/sounds/timeout.mp3'),
//         wrong: new Audio('/assets/sounds/wrong.wav'),
//         click: new Audio('/assets/sounds/click.wav'),
//         start: new Audio('/assets/sounds/start.wav')
//     };
//     function playSound(key) {
//         try { if (sounds[key]) { sounds[key].currentTime = 0; sounds[key].play().catch(() => { }); } } catch (e) { }
//     }

//     // --- FLASH CARD SYSTEM ---
//     let flashTimeout;
//     function showFlash(title, text, duration = 3000, isWinner = false) {
//         clearTimeout(flashTimeout);
//         flashTitle.textContent = title;
//         flashBody.innerHTML = text; // allow html
//         flashCard.classList.add('active');

//         if (isWinner) flashBody.classList.add('winner-anim');
//         else flashBody.classList.remove('winner-anim');

//         if (duration > 0) {
//             flashTimeout = setTimeout(() => {
//                 flashCard.classList.remove('active');
//             }, duration);
//         }
//     }
//     btnFlashClose.onclick = () => flashCard.classList.remove('active');

//     // Instructions Logic
//     if (!localStorage.getItem('seen_instructions')) {
//         modal.classList.add('open');
//     }
//     btnHelp.onclick = () => modal.classList.add('open');
//     btnCloseHelp.onclick = () => {
//         modal.classList.remove('open');
//         localStorage.setItem('seen_instructions', 'true');
//         playSound('click');
//     };

//     // --- GAME LOGIC ---
//     let players = [];
//     let started = false;
//     let timeEndsAt = null;
//     let rafId = null;

//     function addChat(from, text, type) {
//         const el = document.createElement('div');
//         if (type === 'system') {
//             el.className = 'system-msg';
//             el.textContent = `> ${text}`;
//         } else {
//             el.className = 'chat-bubble' + (from === name ? ' mine' : '');
//             el.innerHTML = `<div style="font-weight:700; font-size:0.8em; margin-bottom:4px; opacity:0.7">${from}</div><div>${text}</div>`;
//         }
//         chatWindow.appendChild(el);
//         chatWindow.scrollTop = chatWindow.scrollHeight;
//     }

//     function renderPlayers(list) {
//         // Detect if master changed to me
//         const oldMaster = players.find(p => p.isMaster);
//         const newMaster = list.find(p => p.isMaster);

//         // If there was a master, and it changed, and I am the new one
//         if (oldMaster && newMaster && oldMaster.id !== newMaster.id) {
//             if (newMaster.id === window.socket.id) {
//                 showFlash("YOU ARE MASTER", "It's your turn! Create a question.", 4000);
//             } else {
//                 showFlash("NEW MASTER", `${newMaster.name} is now the Master.`, 3000);
//             }
//         }

//         players = list;
//         playerCount.textContent = `Players: ${list.length}`;
//         playersList.innerHTML = '';

//         list.forEach((p) => {
//             const li = document.createElement('li');
//             li.innerHTML = `
//                 <div style="display:flex; align-items:center; gap:10px">
//                     ${p.isMaster ? '<span class="crown">👑</span>' : ''}
//                     <div>
//                         <div style="font-weight:700; color:${p.isMaster ? 'gold' : 'inherit'}">${p.name}</div>
//                         <div style="font-size:0.8em; opacity:0.6">Score: ${p.score}</div>
//                     </div>
//                 </div>
//                 <div class="attempts">${renderAttempts(p.attemptsLeft)}</div>
//             `;
//             playersList.appendChild(li);
//         });

//         // Show controls if I am master
//         const amIMaster = list.some(p => p.id === window.socket.id && p.isMaster);
//         masterPanel.style.display = amIMaster ? 'block' : 'none';
//     }

//     function renderAttempts(n) {
//         if (n <= 0) return '💀';
//         return '❤'.repeat(n);
//     }

//     // Timer Visuals
//     const CIRCUMFERENCE = 2 * Math.PI * 54;
//     function startTimerLoop() {
//         cancelAnimationFrame(rafId);
//         function tick() {
//             if (!timeEndsAt) {
//                 ringCircle.style.strokeDashoffset = 0;
//                 timerValueEl.textContent = "IDLE";
//                 return;
//             }
//             const now = Date.now();
//             const remaining = Math.max(0, Math.round((timeEndsAt - now) / 1000));
//             const percent = remaining / 60; // assuming 60s max
//             const offset = CIRCUMFERENCE * (1 - percent);

//             ringCircle.style.strokeDashoffset = offset;
//             timerValueEl.textContent = remaining;

//             if (remaining > 0) rafId = requestAnimationFrame(tick);
//         }
//         tick();
//     }

//     // SOCKET EVENTS
//     window.socket.on('connect', () => {
//         if (role === 'master' && !token) {
//             // Logic handled in home.js mostly, but here if reload
//             window.socket.emit('create_game', { name }, handleJoin);
//         } else {
//             if (role === 'master') window.socket.emit('claim_master', { token, name }, handleJoin);
//             else window.socket.emit('join_game', { token, name }, handleJoin);
//         }
//     });

//     function handleJoin(res) {
//         if (res && res.error) { alert(res.error); location.href = '/'; }
//         else {
//             if (res.token) token = res.token;
//             tokenBadge.textContent = `Token: ${token}`;
//             playSound('click');
//         }
//     }

//     btnSend.onclick = () => {
//         const txt = inputChat.value.trim();
//         if (!txt) return;
//         window.socket.emit('guess', { guess: txt });
//         // Optimistic chat add is handled by server event
//         inputChat.value = '';
//     };
//     inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSend.click(); });

//     btnCreateQ.onclick = () => {
//         const q = inputQuestion.value.trim();
//         const a = inputAnswer.value.trim();
//         if (!q || !a) return alert('Fill both fields');

//         window.socket.emit('create_question', { question: q, answer: a }, (res) => {
//             if (res.ok) {
//                 // FIX 3: Clear inputs
//                 inputQuestion.value = '';
//                 inputAnswer.value = '';
//                 playSound('click');
//             }
//         });
//     };

//     btnStart.onclick = () => window.socket.emit('start_game');
//     btnLeave.onclick = () => window.socket.emit('leave_game', () => location.href = '/');

//     // Server Events
//     window.socket.on('players_update', renderPlayers);

//     window.socket.on('notice', (msg) => addChat('System', msg, 'system'));

//     window.socket.on('chat_message', (m) => addChat(m.from, m.text, m.type));

//     // FIX 1: Flash Card for Question
//     window.socket.on('question_ready', ({ question }) => {
//         showFlash("QUESTION READY", `"${question}"<br><span style="font-size:0.5em; opacity:0.7">Master is ready to start.</span>`, 0);
//         playSound('click');
//     });

//     window.socket.on('game_started', ({ duration, timeEndsAt: te }) => {
//         started = true;
//         timeEndsAt = te || (Date.now() + duration * 1000);
//         showFlash("GO!", "Guess the answer now!", 1500); // Quick flash then hide
//         playSound('start');
//         startTimerLoop();
//         inputChat.focus();
//     });

//     window.socket.on('wrong_guess', ({ name: pName, attemptsLeft }) => {
//         addChat('System', `${pName} wrong guess. (${attemptsLeft} left)`, 'system');
//         playSound('wrong');
//     });

//     window.socket.on('round_ended_no_winner', ({ answer }) => {
//         showFlash("TIME'S UP", `No winner.<br>Answer was: <span style="color:var(--accent1)">${answer}</span>`, 4000);
//         resetRound();
//         playSound('timeout');
//     });

//     // FIX 4: Flashy Winner
//     window.socket.on('player_won', ({ winnerName, answer }) => {
//         showFlash("WINNER!", `<span style="font-size:1.5em">${winnerName}</span><br>Answer: ${answer}`, 5000, true);
//         resetRound();
//         playSound('win');
//     });

//     window.socket.on('game_ended_timeout', ({ answer }) => {
//         showFlash("ROUND OVER", `Answer: ${answer}`, 4000);
//         resetRound();
//         playSound('timeout');
//     });

//     function resetRound() {
//         started = false;
//         timeEndsAt = null;
//         startTimerLoop();
//     }
// })();


// public/js/game.js
(() => {
    const params = new URLSearchParams(location.search);
    let token = (params.get('token') || '').toUpperCase();
    const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
    const role = params.get('as') || 'player';

    // DOM refs (defensive)
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

    const flashCard = document.getElementById('flash-card');
    const flashTitle = document.getElementById('flash-title');
    const flashBody = document.getElementById('flash-body');
    const btnFlashClose = document.getElementById('btn-flash-close');

    const modal = document.getElementById('instructions-modal');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');

    if (tokenBadge) tokenBadge.textContent = `Token: ${token || '—'}`;

    // Sounds (ensure files exist)
    const sounds = {
        win: new Audio('/assets/sounds/win.wav'),
        timeout: new Audio('/assets/sounds/timeout.wav'),
        wrong: new Audio('/assets/sounds/wrong.wav'),
        click: new Audio('/assets/sounds/click.wav'),
        start: new Audio('/assets/sounds/start.wav')
    };
    function playSound(key) {
        try {
            const s = sounds[key];
            if (!s) return;
            s.currentTime = 0;
            s.play().catch(() => { /* may be blocked until user interact */ });
        } catch (e) { }
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

    // Instructions modal
    if (!localStorage.getItem('seen_instructions') && modal) modal.classList.add('open');
    if (btnHelp) btnHelp.onclick = () => modal.classList.add('open');
    if (btnCloseHelp) btnCloseHelp.onclick = () => {
        modal.classList.remove('open');
        localStorage.setItem('seen_instructions', '1');
        playSound('click');
    };

    // State
    let players = [];
    let started = false;
    let timeEndsAt = null;
    let rafId = null;

    // Helper: escape HTML
    function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }

    // Add chat messages
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

    // Render list of players & create per-player attempt element ids
    function renderPlayers(list) {
        players = list || [];
        if (playerCount) playerCount.textContent = `Players: ${players.length}`;
        if (!playersList) return;

        // detect master change to show flash
        const oldMaster = document.querySelector('.crown.current-master-id');
        const newMasterId = players.find(p => p.isMaster)?.id;
        if (oldMaster && oldMaster.dataset && oldMaster.dataset.mid !== newMasterId) {
            // master rotated - show a flash (handled below)
        }

        playersList.innerHTML = '';
        players.forEach(p => {
            // Build element with attempt badge having stable id
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

        // Show master panel if I am master
        const meId = window.socket && window.socket.id;
        const amIMaster = players.some(p => p.id === meId && p.isMaster);
        if (masterPanel) masterPanel.style.display = amIMaster ? 'block' : 'none';
    }

    function renderAttempts(n) {
        if (n <= 0) return 'No attempts';
        return '❤'.repeat(Math.max(0, n));
    }

    // Timer visuals (smooth)
    const RADIUS = 54;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    if (ringCircle) ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;

    function setTimerVisual(remaining, duration = 60) {
        if (!ringCircle || !timerTextEl) return;
        const pct = Math.max(0, Math.min(1, remaining / duration));
        const offset = CIRCUMFERENCE * (1 - pct);
        ringCircle.style.strokeDashoffset = offset;
        timerTextEl.textContent = String(remaining);
        if (remaining > 30) {
            ringCircle.classList.add('ring-green'); ringCircle.classList.remove('ring-yellow', 'ring-red');
        } else if (remaining > 10) {
            ringCircle.classList.add('ring-yellow'); ringCircle.classList.remove('ring-green', 'ring-red');
        } else {
            ringCircle.classList.add('ring-red'); ringCircle.classList.remove('ring-green', 'ring-yellow');
        }
    }

    function startTimerLoop() {
        cancelAnimationFrame(rafId);
        function tick() {
            if (!timeEndsAt) { setTimerVisual(0); return; }
            const rem = Math.max(0, Math.round((timeEndsAt - Date.now()) / 1000));
            setTimerVisual(rem);
            if (rem > 0) rafId = requestAnimationFrame(tick);
        }
        tick();
    }
    function stopTimerLoop() { cancelAnimationFrame(rafId); timeEndsAt = null; setTimerVisual(0); }

    // JOIN / CREATE logic on connect
    if (window.socket && window.socket.on) {
        window.socket.on('connect', () => {
            if (role === 'master' && !token) {
                window.socket.emit('create_game', { name }, (res) => {
                    if (res && res.token) { token = res.token; if (tokenBadge) tokenBadge.textContent = `Token: ${token}`; showNotice(`Game created. Token: ${token}`); playSound('click'); }
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
        playSound('click');
    }

    // send guess or chat
    if (btnSend) btnSend.addEventListener('click', sendChatOrGuess);
    if (inputChat) inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatOrGuess(); });

    function sendChatOrGuess() {
        const txt = (inputChat && inputChat.value || '').trim();
        if (!txt) return;
        window.socket.emit('guess', { guess: txt }, (res) => {
            // server will broadcast players_update / wrong_guess / player_won etc.
            if (res && res.error) {
                // fallback to chat if server rejects as guess
                window.socket.emit('send_chat', { text: txt });
            }
        });
        if (inputChat) inputChat.value = '';
        playSound('click');
    }

    // Master controls
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
            } else if (res && res.error) {
                alert(res.error);
            }
        });
    });
    if (btnStart) btnStart.addEventListener('click', () => {
        window.socket.emit('start_game', (res) => {
            if (res && res.error) return alert(res.error);
            playSound('start');
        });
    });
    if (btnLeave) btnLeave.addEventListener('click', () => {
        window.socket.emit('leave_game', () => location.href = '/');
    });

    // Socket event handlers
    if (window.socket && window.socket.on) {
        window.socket.on('players_update', (list) => {
            renderPlayers(list);
        });

        window.socket.on('notice', (msg) => {
            addChat('System', msg, 'system');
            showNotice(msg);
        });

        window.socket.on('chat_message', (m) => {
            addChat(m.from, m.text, m.type);
        });

        window.socket.on('question_ready', ({ question }) => {
            showFlash('QUESTION READY', `<div style="font-size:0.95rem">${esc(question)}</div><div style="font-size:0.8rem;opacity:0.8">Master can start the round</div>`, 3000);
            playSound('click');
        });

        window.socket.on('game_started', ({ duration, timeEndsAt }) => {
            started = true;
            timeEndsAt = timeEndsAt || (Date.now() + (duration || 60) * 1000);
            showFlash('ROUND START', 'Guess the answer — Good luck!', 1500);
            playSound('start');
            startTimerLoop();
            if (inputChat) inputChat.focus();
        });

        // wrong_guess: server currently sends { name, attemptsLeft } — if possible include player id on server for precise badge update
        window.socket.on('wrong_guess', (payload) => {
            // payload may be { name, attemptsLeft, id } depending on server
            const who = payload && payload.name;
            const attemptsLeft = payload && payload.attemptsLeft;
            addChat('System', `${who} guessed wrong. Attempts left: ${attemptsLeft}`, 'system');
            playSound('wrong');
            // update specific badge if id provided
            if (payload && payload.id) {
                const el = document.getElementById(`attempt-${payload.id}`);
                if (el) el.innerText = (attemptsLeft <= 0 ? 'No attempts' : '❤'.repeat(attemptsLeft));
            }
        });

        // Round ended with no winner
        window.socket.on('round_ended_no_winner', ({ answer }) => {
            showFlash("ROUND OVER", `No winner — answer: <span style="color:var(--accent1)">${esc(answer)}</span>`, 4000);
            playSound('timeout');
            started = false;
            stopTimerLoop();
        });

        window.socket.on('player_won', ({ winnerId, winnerName, answer }) => {
            showFlash("WE HAVE A WINNER", `<strong>${esc(winnerName)}</strong><br>Answer: ${esc(answer)}`, 4500, true);
            playSound('win');
            started = false;
            stopTimerLoop();
        });

        window.socket.on('game_ended_timeout', ({ answer }) => {
            showFlash("TIME'S UP", `Answer was: <span style="color:var(--accent1)">${esc(answer)}</span>`, 3500);
            playSound('timeout');
            started = false;
            stopTimerLoop();
        });

        window.socket.on('connect_error', (err) => {
            addChat('System', 'Socket connection error', 'system');
            console.error('socket connect error', err);
        });
    }

    // small utility: show notice briefly
    let noticeTimer = null;
    function showNotice(txt) {
        const nb = document.getElementById('notice-board');
        if (!nb) return;
        nb.style.display = txt ? 'block' : 'none';
        nb.textContent = txt || '';
        clearTimeout(noticeTimer);
        if (txt) noticeTimer = setTimeout(() => { nb.style.display = 'none'; }, 5000);
    }

    // keep flash dismiss on outside click
    const overlay = document.getElementById('overlay-layer');
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) flashCard.classList.remove('active');
    });

    // initial UI state
    showNotice('');
    addChat('System', 'Connecting to server...', 'system');
})();
