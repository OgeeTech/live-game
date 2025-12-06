

// // public/js/game.js
// (function () {
//     const params = new URLSearchParams(location.search);
//     let token = (params.get('token') || '').toUpperCase();
//     const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
//     const role = params.get('as') || 'player';

//     // DOM refs
//     const tokenBadge = document.getElementById('token-badge');
//     const playerCount = document.getElementById('player-count');
//     const masterIndicator = document.getElementById('master-indicator');
//     const playersList = document.getElementById('players-list');
//     const scoresList = document.getElementById('scores-list');
//     const noticeBoard = document.getElementById('notice-board');
//     const chatWindow = document.getElementById('chat');
//     const inputChat = document.getElementById('input-chat');
//     const btnSend = document.getElementById('btn-send');
//     const btnCreateQ = document.getElementById('btn-create-question');
//     const btnStart = document.getElementById('btn-start');
//     const btnLeave = document.getElementById('btn-leave');
//     const inputQuestion = document.getElementById('input-question');
//     const inputAnswer = document.getElementById('input-answer');

//     const timerValueEl = document.getElementById('timer-value');
//     const ringCircle = document.getElementById('ring-circle');

//     tokenBadge.textContent = `Token: ${token || '—'}`;

//     // sound manager
//     const sounds = {
//         win: new Audio('/assets/sounds/win.wav'),
//         timeout: new Audio('/assets/sounds/timeout.mp3'),
//         wrong: new Audio('/assets/sounds/wrong.wav'),
//         click: new Audio('/assets/sounds/click.wav'),
//         start: new Audio('/assets/sounds/start.wav')
//     };
//     function playSound(key) {
//         try { if (sounds[key]) sounds[key].currentTime = 0; sounds[key] && sounds[key].play().catch(() => { }); } catch (e) { }
//     }

//     let players = [];
//     let started = false;
//     let timeEndsAt = null;
//     let rafId = null;

//     function addChat(from, text, type) {
//         const el = document.createElement('div');
//         if (type === 'system') {
//             el.className = 'system-msg';
//             el.textContent = text;
//         } else {
//             el.className = 'chat-bubble' + (from === name ? ' mine' : '');
//             el.innerHTML = `<div style="font-weight:700">${from}</div><div style="margin-top:6px">${text}</div>`;
//         }
//         chatWindow.appendChild(el);
//         chatWindow.scrollTop = chatWindow.scrollHeight;
//     }

//     function showNotice(text) {
//         noticeBoard.textContent = text;
//     }

//     function renderPlayers(list) {
//         players = list;
//         playersList.innerHTML = '';
//         scoresList.innerHTML = '';
//         playerCount.textContent = `Players: ${list.length}`;
//         list.forEach((p) => {
//             const li = document.createElement('li');
//             li.innerHTML = `
//         <div class="player-meta">
//           ${p.isMaster ? '<span class="crown">👑</span>' : ''}
//           <div>
//             <div style="font-weight:700">${p.name}</div>
//             <div class="text-muted" style="font-size:12px">Score: ${p.score}</div>
//           </div>
//         </div>
//         <div class="attempts" id="attempt-${p.id}">${renderAttempts(p.attemptsLeft)}</div>
//       `;
//             playersList.appendChild(li);

//             const sLi = document.createElement('li');
//             sLi.textContent = `${p.name} — ${p.score} pts`;
//             scoresList.appendChild(sLi);

//             if (p.isMaster) masterIndicator.textContent = `Master: ${p.name}`;
//         });

//         // show/hide master controls depending on whether this client is master
//         const amIMaster = players.some(p => p.id === (window.socket && window.socket.id) && p.isMaster);
//         inputQuestion.style.display = amIMaster ? 'block' : 'none';
//         inputAnswer.style.display = amIMaster ? 'block' : 'none';
//         btnCreateQ.style.display = amIMaster ? 'inline-block' : 'none';
//         btnStart.style.display = amIMaster ? 'inline-block' : 'none';
//     }

//     function renderAttempts(n) {
//         if (n <= 0) return 'No attempts';
//         return '❤'.repeat(n);
//     }

//     // ring visual
//     const RADIUS = 54;
//     const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
//     ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
//     ringCircle.style.strokeDashoffset = '0';

//     function setTimerVisual(remaining, duration) {
//         const percent = remaining / duration;
//         const offset = CIRCUMFERENCE * (1 - percent);
//         ringCircle.style.strokeDashoffset = offset;
//         timerValueEl.textContent = String(remaining);

//         if (remaining > 30) {
//             ringCircle.classList.add('ring-green'); ringCircle.classList.remove('ring-yellow', 'ring-red');
//         } else if (remaining > 10) {
//             ringCircle.classList.add('ring-yellow'); ringCircle.classList.remove('ring-green', 'ring-red');
//         } else {
//             ringCircle.classList.add('ring-red'); ringCircle.classList.remove('ring-green', 'ring-yellow');
//         }
//     }

//     function startTimerLoop() {
//         cancelAnimationFrame(rafId);
//         function tick() {
//             if (!timeEndsAt) {
//                 setTimerVisual(0, 60);
//                 return;
//             }
//             const now = Date.now();
//             const remaining = Math.max(0, Math.round((timeEndsAt - now) / 1000));
//             setTimerVisual(remaining, 60);
//             if (remaining > 0) rafId = requestAnimationFrame(tick);
//         }
//         tick();
//     }

//     // socket handlers and lifecycle
//     window.socket.on('connect', () => {
//         if (role === 'master') {
//             if (!token) {
//                 window.socket.emit('create_game', { name }, (res) => {
//                     if (res && res.token) {
//                         token = res.token;
//                         tokenBadge.textContent = `Token: ${token}`;
//                         showNotice(`Game created. Share token: ${token}`);
//                         playSound('click');
//                     } else {
//                         alert('Unable to create game');
//                         location.href = '/';
//                     }
//                 });
//             } else {
//                 window.socket.emit('claim_master', { token, name }, (res) => {
//                     if (res && res.error) {
//                         window.socket.emit('create_game', { name }, (r2) => {
//                             if (r2 && r2.token) {
//                                 token = r2.token;
//                                 tokenBadge.textContent = `Token: ${token}`;
//                                 showNotice(`Game created. Token: ${token}`);
//                             } else { alert('Unable to claim/create game'); location.href = '/'; }
//                         });
//                     } else {
//                         tokenBadge.textContent = `Token: ${token}`;
//                         showNotice('You are the game master.');
//                     }
//                 });
//             }
//         } else {
//             if (!token) { alert('Missing token.'); location.href = '/'; return; }
//             window.socket.emit('join_game', { token, name }, (res) => {
//                 if (res && res.error) { alert('Join error: ' + res.error); location.href = '/'; }
//                 else showNotice(`Joined game: ${token}`);
//             });
//         }
//     });

//     btnSend.onclick = () => {
//         const txt = inputChat.value.trim();
//         if (!txt) return;
//         window.socket.emit('guess', { guess: txt }, (res) => {
//             if (res && res.error) {
//                 window.socket.emit('send_chat', { text: txt });
//             } else {
//                 // server will handle proper events
//             }
//         });
//         inputChat.value = '';
//         playSound('click');
//     };

//     inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSend.click(); });

//     btnCreateQ.onclick = () => {
//         const q = inputQuestion.value.trim();
//         const a = inputAnswer.value.trim();
//         if (!q || !a) { alert('Question and answer required'); return; }
//         window.socket.emit('create_question', { question: q, answer: a }, (res) => {
//             if (res && res.error) alert(res.error);
//             else {
//                 addChat('System', 'Question created by master. Start when ready.', 'system');
//                 inputAnswer.value = '';
//                 playSound('click');
//             }
//         });
//     };

//     btnStart.onclick = () => {
//         window.socket.emit('start_game', (res) => {
//             if (res && res.error) alert(res.error);
//             else {
//                 playSound('start');
//             }
//         });
//     };

//     btnLeave.onclick = () => {
//         window.socket.emit('leave_game', (res) => { location.href = '/'; });
//     };

//     // incoming socket events
//     window.socket.on('players_update', (list) => {
//         renderPlayers(list);
//     });

//     window.socket.on('notice', (msg) => {
//         showNotice(msg);
//         addChat('System', msg, 'system');
//     });

//     window.socket.on('chat_message', (m) => {
//         if (m.type === 'chat') addChat(m.from, m.text, 'chat');
//         else if (m.type === 'guess') addChat(m.from, m.text, 'chat');
//     });

//     window.socket.on('question_ready', ({ question }) => {
//         addChat('System', `Question prepared: "${question}". Master can start the game.`, 'system');
//         showNotice('Question ready. Master can start.');
//     });

//     window.socket.on('game_started', ({ duration, timeEndsAt: timeEnd }) => {
//         started = true;
//         timeEndsAt = timeEnd || (Date.now() + (duration || 60) * 1000);
//         addChat('System', `Game started — ${duration}s. Guess now!`, 'system');
//         showNotice('Game in progress');
//         startTimerLoop();
//     });

//     window.socket.on('wrong_guess', ({ name: who, attemptsLeft }) => {
//         addChat('System', `${who} guessed wrong. Attempts left: ${attemptsLeft}`, 'system');
//         playSound('wrong');
//     });

//     window.socket.on('round_ended_no_winner', ({ answer }) => {
//         addChat('System', `Round ended. No winner. Answer: ${answer}`, 'system');
//         showNotice(`Round ended. Answer: ${answer}`);
//         playSound('timeout');
//         started = false;
//         timeEndsAt = null;
//         startTimerLoop();
//     });

//     window.socket.on('player_won', ({ winnerId, winnerName, answer }) => {
//         addChat('System', `Winner: ${winnerName}. Answer: ${answer} — +1 point.`, 'system');
//         showNotice(`Winner: ${winnerName}`);
//         playSound('win');
//         started = false;
//         timeEndsAt = null;
//         startTimerLoop();
//     });

//     window.socket.on('game_ended_timeout', ({ answer }) => {
//         addChat('System', `Time's up! Answer was: ${answer}`, 'system');
//         showNotice(`Time expired. Answer: ${answer}`);
//         playSound('timeout');
//         started = false;
//         timeEndsAt = null;
//         startTimerLoop();
//     });

//     window.socket.on('connect_error', (err) => {
//         console.error('Socket connect error', err);
//     });

//     showNotice('Connecting...');
// })();


// public/js/game.js
(function () {
    const params = new URLSearchParams(location.search);
    let token = (params.get('token') || '').toUpperCase();
    const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
    const role = params.get('as') || 'player';

    // DOM Elements
    const tokenBadge = document.getElementById('token-badge');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const chatWindow = document.getElementById('chat');
    const inputChat = document.getElementById('input-chat');
    const btnSend = document.getElementById('btn-send');

    // Master Controls
    const masterPanel = document.getElementById('master-controls');
    const inputQuestion = document.getElementById('input-question');
    const inputAnswer = document.getElementById('input-answer');
    const btnCreateQ = document.getElementById('btn-create-question');
    const btnStart = document.getElementById('btn-start');
    const btnLeave = document.getElementById('btn-leave');

    // Timer
    const timerValueEl = document.getElementById('timer-value');
    const ringCircle = document.getElementById('ring-circle');

    // Overlays
    const flashCard = document.getElementById('flash-card');
    const flashTitle = document.getElementById('flash-title');
    const flashBody = document.getElementById('flash-body');
    const btnFlashClose = document.getElementById('btn-flash-close');

    // Instructions
    const modal = document.getElementById('instructions-modal');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');

    tokenBadge.textContent = `Token: ${token}`;

    // Sound Setup
    const sounds = {
        win: new Audio('/assets/sounds/win.wav'),
        timeout: new Audio('/assets/sounds/timeout.mp3'),
        wrong: new Audio('/assets/sounds/wrong.wav'),
        click: new Audio('/assets/sounds/click.wav'),
        start: new Audio('/assets/sounds/start.wav')
    };
    function playSound(key) {
        try { if (sounds[key]) { sounds[key].currentTime = 0; sounds[key].play().catch(() => { }); } } catch (e) { }
    }

    // --- FLASH CARD SYSTEM ---
    let flashTimeout;
    function showFlash(title, text, duration = 3000, isWinner = false) {
        clearTimeout(flashTimeout);
        flashTitle.textContent = title;
        flashBody.innerHTML = text; // allow html
        flashCard.classList.add('active');

        if (isWinner) flashBody.classList.add('winner-anim');
        else flashBody.classList.remove('winner-anim');

        if (duration > 0) {
            flashTimeout = setTimeout(() => {
                flashCard.classList.remove('active');
            }, duration);
        }
    }
    btnFlashClose.onclick = () => flashCard.classList.remove('active');

    // Instructions Logic
    if (!localStorage.getItem('seen_instructions')) {
        modal.classList.add('open');
    }
    btnHelp.onclick = () => modal.classList.add('open');
    btnCloseHelp.onclick = () => {
        modal.classList.remove('open');
        localStorage.setItem('seen_instructions', 'true');
        playSound('click');
    };

    // --- GAME LOGIC ---
    let players = [];
    let started = false;
    let timeEndsAt = null;
    let rafId = null;

    function addChat(from, text, type) {
        const el = document.createElement('div');
        if (type === 'system') {
            el.className = 'system-msg';
            el.textContent = `> ${text}`;
        } else {
            el.className = 'chat-bubble' + (from === name ? ' mine' : '');
            el.innerHTML = `<div style="font-weight:700; font-size:0.8em; margin-bottom:4px; opacity:0.7">${from}</div><div>${text}</div>`;
        }
        chatWindow.appendChild(el);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function renderPlayers(list) {
        // Detect if master changed to me
        const oldMaster = players.find(p => p.isMaster);
        const newMaster = list.find(p => p.isMaster);

        // If there was a master, and it changed, and I am the new one
        if (oldMaster && newMaster && oldMaster.id !== newMaster.id) {
            if (newMaster.id === window.socket.id) {
                showFlash("YOU ARE MASTER", "It's your turn! Create a question.", 4000);
            } else {
                showFlash("NEW MASTER", `${newMaster.name} is now the Master.`, 3000);
            }
        }

        players = list;
        playerCount.textContent = `Players: ${list.length}`;
        playersList.innerHTML = '';

        list.forEach((p) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px">
                    ${p.isMaster ? '<span class="crown">👑</span>' : ''}
                    <div>
                        <div style="font-weight:700; color:${p.isMaster ? 'gold' : 'inherit'}">${p.name}</div>
                        <div style="font-size:0.8em; opacity:0.6">Score: ${p.score}</div>
                    </div>
                </div>
                <div class="attempts">${renderAttempts(p.attemptsLeft)}</div>
            `;
            playersList.appendChild(li);
        });

        // Show controls if I am master
        const amIMaster = list.some(p => p.id === window.socket.id && p.isMaster);
        masterPanel.style.display = amIMaster ? 'block' : 'none';
    }

    function renderAttempts(n) {
        if (n <= 0) return '💀';
        return '❤'.repeat(n);
    }

    // Timer Visuals
    const CIRCUMFERENCE = 2 * Math.PI * 54;
    function startTimerLoop() {
        cancelAnimationFrame(rafId);
        function tick() {
            if (!timeEndsAt) {
                ringCircle.style.strokeDashoffset = 0;
                timerValueEl.textContent = "IDLE";
                return;
            }
            const now = Date.now();
            const remaining = Math.max(0, Math.round((timeEndsAt - now) / 1000));
            const percent = remaining / 60; // assuming 60s max
            const offset = CIRCUMFERENCE * (1 - percent);

            ringCircle.style.strokeDashoffset = offset;
            timerValueEl.textContent = remaining;

            if (remaining > 0) rafId = requestAnimationFrame(tick);
        }
        tick();
    }

    // SOCKET EVENTS
    window.socket.on('connect', () => {
        if (role === 'master' && !token) {
            // Logic handled in home.js mostly, but here if reload
            window.socket.emit('create_game', { name }, handleJoin);
        } else {
            if (role === 'master') window.socket.emit('claim_master', { token, name }, handleJoin);
            else window.socket.emit('join_game', { token, name }, handleJoin);
        }
    });

    function handleJoin(res) {
        if (res && res.error) { alert(res.error); location.href = '/'; }
        else {
            if (res.token) token = res.token;
            tokenBadge.textContent = `Token: ${token}`;
            playSound('click');
        }
    }

    btnSend.onclick = () => {
        const txt = inputChat.value.trim();
        if (!txt) return;
        window.socket.emit('guess', { guess: txt });
        // Optimistic chat add is handled by server event
        inputChat.value = '';
    };
    inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSend.click(); });

    btnCreateQ.onclick = () => {
        const q = inputQuestion.value.trim();
        const a = inputAnswer.value.trim();
        if (!q || !a) return alert('Fill both fields');

        window.socket.emit('create_question', { question: q, answer: a }, (res) => {
            if (res.ok) {
                // FIX 3: Clear inputs
                inputQuestion.value = '';
                inputAnswer.value = '';
                playSound('click');
            }
        });
    };

    btnStart.onclick = () => window.socket.emit('start_game');
    btnLeave.onclick = () => window.socket.emit('leave_game', () => location.href = '/');

    // Server Events
    window.socket.on('players_update', renderPlayers);

    window.socket.on('notice', (msg) => addChat('System', msg, 'system'));

    window.socket.on('chat_message', (m) => addChat(m.from, m.text, m.type));

    // FIX 1: Flash Card for Question
    window.socket.on('question_ready', ({ question }) => {
        showFlash("QUESTION READY", `"${question}"<br><span style="font-size:0.5em; opacity:0.7">Master is ready to start.</span>`, 0);
        playSound('click');
    });

    window.socket.on('game_started', ({ duration, timeEndsAt: te }) => {
        started = true;
        timeEndsAt = te || (Date.now() + duration * 1000);
        showFlash("GO!", "Guess the answer now!", 1500); // Quick flash then hide
        playSound('start');
        startTimerLoop();
        inputChat.focus();
    });

    window.socket.on('wrong_guess', ({ name: pName, attemptsLeft }) => {
        addChat('System', `${pName} wrong guess. (${attemptsLeft} left)`, 'system');
        playSound('wrong');
    });

    window.socket.on('round_ended_no_winner', ({ answer }) => {
        showFlash("TIME'S UP", `No winner.<br>Answer was: <span style="color:var(--accent1)">${answer}</span>`, 4000);
        resetRound();
        playSound('timeout');
    });

    // FIX 4: Flashy Winner
    window.socket.on('player_won', ({ winnerName, answer }) => {
        showFlash("WINNER!", `<span style="font-size:1.5em">${winnerName}</span><br>Answer: ${answer}`, 5000, true);
        resetRound();
        playSound('win');
    });

    window.socket.on('game_ended_timeout', ({ answer }) => {
        showFlash("ROUND OVER", `Answer: ${answer}`, 4000);
        resetRound();
        playSound('timeout');
    });

    function resetRound() {
        started = false;
        timeEndsAt = null;
        startTimerLoop();
    }
})();