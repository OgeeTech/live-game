// // server/server.js
// const express = require('express');
// const path = require('path');
// const http = require('http');
// const GameManager = require('./gameManager');

// const app = express();
// const server = http.createServer(app);
// const io = require('socket.io')(server);

// const gm = new GameManager();

// app.use(express.json());
// app.use(express.static(path.join(__dirname, '..', 'public')));

// app.post('/create', (req, res) => {
//     const { name } = req.body;
//     if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Name required' });

//     const session = gm.createSession(name.trim());
//     return res.json({ token: session.token });
// });

// io.on('connection', socket => {
//     socket.on('claim_master', ({ token, name }, cb) => {
//         if (!token || !name) return cb && cb({ error: 'token and name required' });
//         const session = gm.getSession(token);
//         if (!session) return cb && cb({ error: 'Invalid token' });

//         const r = gm.setMaster(token, socket.id, name.trim());
//         if (r.error) return cb && cb(r);

//         socket.join(token);
//         socket.data.token = token;
//         socket.data.name = name.trim();

//         io.to(token).emit('players_update', gm.getPlayers(token));
//         io.to(token).emit('notice', `${name.trim()} is the game master (claimed). Token: ${token.toUpperCase()}`);
//         return cb && cb({ ok: true, token });
//     });

//     socket.on('create_game', ({ name }, cb) => {
//         if (!name || name.trim().length === 0) return cb && cb({ error: 'Name required' });
//         const session = gm.createSession(name.trim());
//         gm.setMaster(session.token, socket.id, name.trim());

//         socket.join(session.token);
//         socket.data.token = session.token;
//         socket.data.name = name.trim();

//         io.to(session.token).emit('players_update', gm.getPlayers(session.token));
//         io.to(session.token).emit('notice', `Game created. Token: ${session.token}`);
//         return cb && cb({ token: session.token });
//     });

//     socket.on('join_game', ({ token, name }, cb) => {
//         if (!token || !name) return cb && cb({ error: 'Token and name required' });
//         const s = gm.getSession(token);
//         if (!s) return cb && cb({ error: 'Invalid token' });
//         if (s.started) return cb && cb({ error: 'Game already in progress' });

//         gm.addPlayer(token, socket.id, name.trim());

//         socket.join(token);
//         socket.data.token = token;
//         socket.data.name = name.trim();

//         io.to(token).emit('players_update', gm.getPlayers(token));
//         io.to(token).emit('notice', `${name.trim()} joined the game.`);
//         return cb && cb({ ok: true });
//     });

//     socket.on('create_question', ({ question, answer }, cb) => {
//         const token = socket.data.token;
//         if (!token) return cb && cb({ error: 'Not in session' });
//         const r = gm.createQuestion(token, socket.id, question, answer);
//         if (r.error) return cb && cb(r);

//         io.to(token).emit('question_ready', { question });
//         return cb && cb({ ok: true });
//     });

//     socket.on('start_game', (cb) => {
//         const token = socket.data.token;
//         if (!token) return cb && cb({ error: 'Not in session' });
//         const r = gm.startGame(token, socket.id, io);
//         if (r.error) return cb && cb(r);

//         io.to(token).emit('game_started', { duration: r.duration, timeEndsAt: r.timeEndsAt });
//         io.to(token).emit('notice', 'Game started! Guess the answer now.');
//         io.to(token).emit('players_update', gm.getPlayers(token));
//         return cb && cb({ ok: true });
//     });

//     socket.on('guess', ({ guess }, cb) => {
//         const token = socket.data.token;
//         if (!token) return cb && cb({ error: 'Not in session' });
//         const before = gm.getSession(token);
//         if (!before) return cb && cb({ error: 'Session not found' });

//         const player = before.players.find(p => p.id === socket.id);
//         if (player) {
//             io.to(token).emit('chat_message', { from: player.name, text: `guessed: ${guess}`, type: 'guess' });
//         }

//         const r = gm.guess(token, socket.id, guess);
//         if (r.error) return cb && cb(r);

//         if (r.correct) {
//             io.to(token).emit('player_won', { winnerId: r.winner.id, winnerName: r.winner.name, answer: r.answer });
//             io.to(token).emit('players_update', gm.getPlayers(token));
//         } else {
//             io.to(token).emit('wrong_guess', { name: player.name, attemptsLeft: r.attemptsLeft });
//             io.to(token).emit('players_update', gm.getPlayers(token));
//         }

//         return cb && cb(r);
//     });

//     socket.on('send_chat', ({ text }, cb) => {
//         const token = socket.data.token;
//         if (!token) return cb && cb({ error: 'Not in session' });
//         const name = socket.data.name || 'Anonymous';
//         io.to(token).emit('chat_message', { from: name, text, type: 'chat' });
//         return cb && cb({ ok: true });
//     });

//     socket.on('leave_game', (cb) => {
//         const token = socket.data.token;
//         if (!token) return cb && cb({ ok: true });
//         const sess = gm.getSession(token);
//         if (!sess) return cb && cb({ ok: true });

//         const player = sess.players.find(p => p.id === socket.id);
//         if (player) {
//             const name = player.name;
//             gm.removePlayer(token, socket.id);
//             socket.leave(token);
//             io.to(token).emit('players_update', gm.getPlayers(token));
//             io.to(token).emit('notice', `${name} left the session.`);
//             return cb && cb({ ok: true });
//         }
//         return cb && cb({ ok: true });
//     });

//     socket.on('disconnect', () => {
//         const token = socket.data.token;
//         if (!token) return;
//         const sess = gm.getSession(token);
//         if (!sess) return;
//         const player = sess.players.find(p => p.id === socket.id);
//         if (player) {
//             const name = player.name;
//             gm.removePlayer(token, socket.id);
//             io.to(token).emit('players_update', gm.getPlayers(token));
//             io.to(token).emit('notice', `${name} disconnected.`);
//         }
//     });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


// server/server.js
const express = require('express');
const path = require('path');
const http = require('http');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    // optional CORS if needed - adjust origin in production
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gm = new GameManager();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// optional REST helper to create a token
app.post('/create', (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Name required' });

    const session = gm.createSession(name.trim());
    return res.json({ token: session.token });
});

io.on('connection', socket => {
    console.log('socket connected', socket.id);

    socket.on('claim_master', ({ token, name }, cb) => {
        if (!token || !name) return cb && cb({ error: 'token and name required' });
        const session = gm.getSession(token);
        if (!session) return cb && cb({ error: 'Invalid token' });

        const r = gm.setMaster(token, socket.id, name.trim());
        if (r.error) return cb && cb(r);

        socket.join(token);
        socket.data.token = token;
        socket.data.name = name.trim();

        io.to(token).emit('players_update', gm.getPlayers(token));
        io.to(token).emit('notice', `${name.trim()} is the game master (claimed). Token: ${token.toUpperCase()}`);
        return cb && cb({ ok: true, token });
    });

    socket.on('create_game', ({ name }, cb) => {
        if (!name || name.trim().length === 0) return cb && cb({ error: 'Name required' });
        const session = gm.createSession(name.trim());
        gm.setMaster(session.token, socket.id, name.trim());

        socket.join(session.token);
        socket.data.token = session.token;
        socket.data.name = name.trim();

        io.to(session.token).emit('players_update', gm.getPlayers(session.token));
        io.to(session.token).emit('notice', `Game created. Token: ${session.token}`);
        return cb && cb({ token: session.token });
    });

    socket.on('join_game', ({ token, name }, cb) => {
        if (!token || !name) return cb && cb({ error: 'Token and name required' });
        const s = gm.getSession(token);
        if (!s) return cb && cb({ error: 'Invalid token' });
        if (s.started) return cb && cb({ error: 'Game already in progress' });

        gm.addPlayer(token, socket.id, name.trim());

        socket.join(token);
        socket.data.token = token;
        socket.data.name = name.trim();

        io.to(token).emit('players_update', gm.getPlayers(token));
        io.to(token).emit('notice', `${name.trim()} joined the game.`);
        return cb && cb({ ok: true });
    });

    socket.on('create_question', ({ question, answer }, cb) => {
        const token = socket.data.token;
        if (!token) return cb && cb({ error: 'Not in session' });
        const r = gm.createQuestion(token, socket.id, question, answer);
        if (r.error) return cb && cb(r);

        // send question to players but keep answer only server-side
        io.to(token).emit('question_ready', { question });
        io.to(token).emit('notice', 'Question created. Master can start the round.');
        io.to(token).emit('players_update', gm.getPlayers(token)); // reset attempts shown
        return cb && cb({ ok: true });
    });

    socket.on('start_game', (cb) => {
        const token = socket.data.token;
        if (!token) return cb && cb({ error: 'Not in session' });
        const r = gm.startGame(token, socket.id, io);
        if (r.error) return cb && cb(r);

        io.to(token).emit('game_started', { duration: r.duration, timeEndsAt: r.timeEndsAt });
        io.to(token).emit('notice', 'Game started! Guess the answer now.');
        io.to(token).emit('players_update', gm.getPlayers(token));
        return cb && cb({ ok: true });
    });

    socket.on('guess', ({ guess }, cb) => {
        const token = socket.data.token;
        if (!token) return cb && cb({ error: 'Not in session' });
        const before = gm.getSession(token);
        if (!before) return cb && cb({ error: 'Session not found' });

        const player = before.players.find(p => p.id === socket.id);
        if (player) {
            io.to(token).emit('chat_message', { from: player.name, text: `guessed: ${guess}`, type: 'guess' });
        }

        const r = gm.guess(token, socket.id, guess);
        if (r.error) return cb && cb(r);

        if (r.correct) {
            // someone guessed right -> announce winner
            io.to(token).emit('player_won', { winnerId: r.winner.id, winnerName: r.winner.name, answer: r.answer });
            io.to(token).emit('players_update', gm.getPlayers(token));
        } else {
            // wrong guess event for that player with their current attemptsLeft
            // if roundEnded true -> reveal answer and notify all
            if (r.roundEnded) {
                io.to(token).emit('wrong_guess', { name: player.name, attemptsLeft: r.attemptsLeft });
                io.to(token).emit('round_ended_no_winner', { answer: r.answer });
                io.to(token).emit('players_update', gm.getPlayers(token));
            } else {
                io.to(token).emit('wrong_guess', { name: player.name, attemptsLeft: r.attemptsLeft });
                io.to(token).emit('players_update', gm.getPlayers(token));
            }
        }

        return cb && cb(r);
    });

    socket.on('send_chat', ({ text }, cb) => {
        const token = socket.data.token;
        if (!token) return cb && cb({ error: 'Not in session' });
        const name = socket.data.name || 'Anonymous';
        io.to(token).emit('chat_message', { from: name, text, type: 'chat' });
        return cb && cb({ ok: true });
    });

    socket.on('leave_game', (cb) => {
        const token = socket.data.token;
        if (!token) return cb && cb({ ok: true });
        const sess = gm.getSession(token);
        if (!sess) return cb && cb({ ok: true });

        const player = sess.players.find(p => p.id === socket.id);
        if (player) {
            const name = player.name;
            gm.removePlayer(token, socket.id);
            socket.leave(token);
            io.to(token).emit('players_update', gm.getPlayers(token));
            io.to(token).emit('notice', `${name} left the session.`);
            return cb && cb({ ok: true });
        }
        return cb && cb({ ok: true });
    });

    socket.on('disconnect', () => {
        const token = socket.data.token;
        if (!token) return;
        const sess = gm.getSession(token);
        if (!sess) return;
        const player = sess.players.find(p => p.id === socket.id);
        if (player) {
            const name = player.name;
            gm.removePlayer(token, socket.id);
            io.to(token).emit('players_update', gm.getPlayers(token));
            io.to(token).emit('notice', `${name} disconnected.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
