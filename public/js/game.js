// // public/js/game.js
// (function () {
//     const params = new URLSearchParams(location.search);
//     let token = (params.get('token') || '').toUpperCase();
//     const name = params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
//     const role = params.get('as') || 'player';

//     // DOM
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
//         click: new Audio('./assets/sounds/click.wav'),
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
//         <div class="attempts">${renderAttempts(p.attemptsLeft)}</div>
//       `;
//             playersList.appendChild(li);

//             const sLi = document.createElement('li');
//             sLi.textContent = `${p.name} — ${p.score} pts`;
//             scoresList.appendChild(sLi);

//             if (p.isMaster) masterIndicator.textContent = `Master: ${p.name}`;
//         });
//     }

//     function renderAttempts(n) {
//         if (n <= 0) return 'No attempts';
//         return '❤'.repeat(n);
//     }

//     // ring visual calculations
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

//     // socket interactions
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
//                 // server will broadcast messages and wrong_guess/player_won events
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

//     // socket event handlers
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

//     window.socket.on('player_won', ({ winnerId, winnerName, answer }) => {
//         addChat('System', `Winner: ${winnerName}. Answer: ${answer} — +10 points.`, 'system');
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

    // DOM refs
    const tokenBadge = document.getElementById('token-badge');
    const playerCount = document.getElementById('player-count');
    const masterIndicator = document.getElementById('master-indicator');
    const playersList = document.getElementById('players-list');
    const scoresList = document.getElementById('scores-list');
    const noticeBoard = document.getElementById('notice-board');
    const chatWindow = document.getElementById('chat');
    const inputChat = document.getElementById('input-chat');
    const btnSend = document.getElementById('btn-send');
    const btnCreateQ = document.getElementById('btn-create-question');
    const btnStart = document.getElementById('btn-start');
    const btnLeave = document.getElementById('btn-leave');
    const inputQuestion = document.getElementById('input-question');
    const inputAnswer = document.getElementById('input-answer');

    const timerValueEl = document.getElementById('timer-value');
    const ringCircle = document.getElementById('ring-circle');

    tokenBadge.textContent = `Token: ${token || '—'}`;

    // sound manager
    const sounds = {
        win: new Audio('/assets/sounds/win.wav'),
        timeout: new Audio('/assets/sounds/timeout.mp3'),
        wrong: new Audio('/assets/sounds/wrong.wav'),
        click: new Audio('/assets/sounds/click.wav'),
        start: new Audio('/assets/sounds/start.wav')
    };
    function playSound(key) {
        try { if (sounds[key]) sounds[key].currentTime = 0; sounds[key] && sounds[key].play().catch(() => { }); } catch (e) { }
    }

    let players = [];
    let started = false;
    let timeEndsAt = null;
    let rafId = null;

    function addChat(from, text, type) {
        const el = document.createElement('div');
        if (type === 'system') {
            el.className = 'system-msg';
            el.textContent = text;
        } else {
            el.className = 'chat-bubble' + (from === name ? ' mine' : '');
            el.innerHTML = `<div style="font-weight:700">${from}</div><div style="margin-top:6px">${text}</div>`;
        }
        chatWindow.appendChild(el);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showNotice(text) {
        noticeBoard.textContent = text;
    }

    function renderPlayers(list) {
        players = list;
        playersList.innerHTML = '';
        scoresList.innerHTML = '';
        playerCount.textContent = `Players: ${list.length}`;
        list.forEach((p) => {
            const li = document.createElement('li');
            li.innerHTML = `
        <div class="player-meta">
          ${p.isMaster ? '<span class="crown">👑</span>' : ''}
          <div>
            <div style="font-weight:700">${p.name}</div>
            <div class="text-muted" style="font-size:12px">Score: ${p.score}</div>
          </div>
        </div>
        <div class="attempts" id="attempt-${p.id}">${renderAttempts(p.attemptsLeft)}</div>
      `;
            playersList.appendChild(li);

            const sLi = document.createElement('li');
            sLi.textContent = `${p.name} — ${p.score} pts`;
            scoresList.appendChild(sLi);

            if (p.isMaster) masterIndicator.textContent = `Master: ${p.name}`;
        });

        // show/hide master controls depending on whether this client is master
        const amIMaster = players.some(p => p.id === (window.socket && window.socket.id) && p.isMaster);
        inputQuestion.style.display = amIMaster ? 'block' : 'none';
        inputAnswer.style.display = amIMaster ? 'block' : 'none';
        btnCreateQ.style.display = amIMaster ? 'inline-block' : 'none';
        btnStart.style.display = amIMaster ? 'inline-block' : 'none';
    }

    function renderAttempts(n) {
        if (n <= 0) return 'No attempts';
        return '❤'.repeat(n);
    }

    // ring visual
    const RADIUS = 54;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
    ringCircle.style.strokeDashoffset = '0';

    function setTimerVisual(remaining, duration) {
        const percent = remaining / duration;
        const offset = CIRCUMFERENCE * (1 - percent);
        ringCircle.style.strokeDashoffset = offset;
        timerValueEl.textContent = String(remaining);

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
            if (!timeEndsAt) {
                setTimerVisual(0, 60);
                return;
            }
            const now = Date.now();
            const remaining = Math.max(0, Math.round((timeEndsAt - now) / 1000));
            setTimerVisual(remaining, 60);
            if (remaining > 0) rafId = requestAnimationFrame(tick);
        }
        tick();
    }

    // socket handlers and lifecycle
    window.socket.on('connect', () => {
        if (role === 'master') {
            if (!token) {
                window.socket.emit('create_game', { name }, (res) => {
                    if (res && res.token) {
                        token = res.token;
                        tokenBadge.textContent = `Token: ${token}`;
                        showNotice(`Game created. Share token: ${token}`);
                        playSound('click');
                    } else {
                        alert('Unable to create game');
                        location.href = '/';
                    }
                });
            } else {
                window.socket.emit('claim_master', { token, name }, (res) => {
                    if (res && res.error) {
                        window.socket.emit('create_game', { name }, (r2) => {
                            if (r2 && r2.token) {
                                token = r2.token;
                                tokenBadge.textContent = `Token: ${token}`;
                                showNotice(`Game created. Token: ${token}`);
                            } else { alert('Unable to claim/create game'); location.href = '/'; }
                        });
                    } else {
                        tokenBadge.textContent = `Token: ${token}`;
                        showNotice('You are the game master.');
                    }
                });
            }
        } else {
            if (!token) { alert('Missing token.'); location.href = '/'; return; }
            window.socket.emit('join_game', { token, name }, (res) => {
                if (res && res.error) { alert('Join error: ' + res.error); location.href = '/'; }
                else showNotice(`Joined game: ${token}`);
            });
        }
    });

    btnSend.onclick = () => {
        const txt = inputChat.value.trim();
        if (!txt) return;
        window.socket.emit('guess', { guess: txt }, (res) => {
            if (res && res.error) {
                window.socket.emit('send_chat', { text: txt });
            } else {
                // server will handle proper events
            }
        });
        inputChat.value = '';
        playSound('click');
    };

    inputChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSend.click(); });

    btnCreateQ.onclick = () => {
        const q = inputQuestion.value.trim();
        const a = inputAnswer.value.trim();
        if (!q || !a) { alert('Question and answer required'); return; }
        window.socket.emit('create_question', { question: q, answer: a }, (res) => {
            if (res && res.error) alert(res.error);
            else {
                addChat('System', 'Question created by master. Start when ready.', 'system');
                inputAnswer.value = '';
                playSound('click');
            }
        });
    };

    btnStart.onclick = () => {
        window.socket.emit('start_game', (res) => {
            if (res && res.error) alert(res.error);
            else {
                playSound('start');
            }
        });
    };

    btnLeave.onclick = () => {
        window.socket.emit('leave_game', (res) => { location.href = '/'; });
    };

    // incoming socket events
    window.socket.on('players_update', (list) => {
        renderPlayers(list);
    });

    window.socket.on('notice', (msg) => {
        showNotice(msg);
        addChat('System', msg, 'system');
    });

    window.socket.on('chat_message', (m) => {
        if (m.type === 'chat') addChat(m.from, m.text, 'chat');
        else if (m.type === 'guess') addChat(m.from, m.text, 'chat');
    });

    window.socket.on('question_ready', ({ question }) => {
        addChat('System', `Question prepared: "${question}". Master can start the game.`, 'system');
        showNotice('Question ready. Master can start.');
    });

    window.socket.on('game_started', ({ duration, timeEndsAt: timeEnd }) => {
        started = true;
        timeEndsAt = timeEnd || (Date.now() + (duration || 60) * 1000);
        addChat('System', `Game started — ${duration}s. Guess now!`, 'system');
        showNotice('Game in progress');
        startTimerLoop();
    });

    window.socket.on('wrong_guess', ({ name: who, attemptsLeft }) => {
        addChat('System', `${who} guessed wrong. Attempts left: ${attemptsLeft}`, 'system');
        playSound('wrong');
    });

    window.socket.on('round_ended_no_winner', ({ answer }) => {
        addChat('System', `Round ended. No winner. Answer: ${answer}`, 'system');
        showNotice(`Round ended. Answer: ${answer}`);
        playSound('timeout');
        started = false;
        timeEndsAt = null;
        startTimerLoop();
    });

    window.socket.on('player_won', ({ winnerId, winnerName, answer }) => {
        addChat('System', `Winner: ${winnerName}. Answer: ${answer} — +1 point.`, 'system');
        showNotice(`Winner: ${winnerName}`);
        playSound('win');
        started = false;
        timeEndsAt = null;
        startTimerLoop();
    });

    window.socket.on('game_ended_timeout', ({ answer }) => {
        addChat('System', `Time's up! Answer was: ${answer}`, 'system');
        showNotice(`Time expired. Answer: ${answer}`);
        playSound('timeout');
        started = false;
        timeEndsAt = null;
        startTimerLoop();
    });

    window.socket.on('connect_error', (err) => {
        console.error('Socket connect error', err);
    });

    showNotice('Connecting...');
})();
