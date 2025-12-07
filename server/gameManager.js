

// server/gameManager.js
function makeToken() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

class GameManager {
    constructor() {
        this.sessions = {};
    }

    createSession(masterName) {
        let token = makeToken();
        while (this.sessions[token]) token = makeToken();

        const session = {
            token,
            masterId: null,
            masterName: masterName || null,
            players: [], // ordered list {id,name,score,attemptsLeft}
            started: false,
            question: null,
            answer: null,
            timer: null,
            timeEndsAt: null,
            duration: 60
        };
        this.sessions[token] = session;
        return session;
    }

    getSession(token) {
        if (!token) return null;
        return this.sessions[token.toUpperCase()] || null;
    }

    deleteSession(token) {
        token = token && token.toUpperCase();
        if (!token) return;
        const s = this.sessions[token];
        if (s) {
            if (s.timer) { clearTimeout(s.timer); s.timer = null; }
            delete this.sessions[token];
        }
    }

    addPlayer(token, socketId, name) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (s.players.find(p => p.id === socketId)) return { ok: true };

        s.players.push({ id: socketId, name, score: 0, attemptsLeft: 3 });

        if (!s.masterId) {
            s.masterId = socketId;
            s.masterName = name;
        }
        return { ok: true };
    }

    removePlayer(token, socketId) {
        const s = this.getSession(token);
        if (!s) return;
        const idx = s.players.findIndex(p => p.id === socketId);
        if (idx !== -1) s.players.splice(idx, 1);

        if (s.masterId === socketId) {
            if (s.players.length > 0) {
                // make next the master (first in list)
                s.masterId = s.players[0].id;
                s.masterName = s.players[0].name;
            } else {
                s.masterId = null;
                s.masterName = null;
            }
        }

        if (s.players.length === 0) {
            this.deleteSession(token);
        }
    }

    getPlayers(token) {
        const s = this.getSession(token);
        if (!s) return [];
        return s.players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            attemptsLeft: p.attemptsLeft,
            isMaster: p.id === s.masterId
        }));
    }

    setMaster(token, socketId, name) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };

        if (s.masterId && s.masterId !== socketId) return { error: 'Master already claimed' };

        s.masterId = socketId;
        s.masterName = name;

        if (!s.players.find(p => p.id === socketId)) {
            s.players.unshift({ id: socketId, name, score: 0, attemptsLeft: 3 });
        } else {
            const idx = s.players.findIndex(p => p.id === socketId);
            if (idx > 0) {
                const [p] = s.players.splice(idx, 1);
                s.players.unshift(p);
            }
        }
        return { ok: true };
    }

    createQuestion(token, socketId, question, answer) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (s.masterId !== socketId) return { error: 'Only master can create question' };
        if (!question || !answer) return { error: 'Question and answer required' };

        s.question = question;
        s.answer = answer.trim().toLowerCase();
        // reset attempts for all players (each player has independent attempts)
        s.players.forEach(p => p.attemptsLeft = 3);
        return { ok: true };
    }

    startGame(token, socketId, io) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (s.masterId !== socketId) return { error: 'Only master can start' };
        if (s.started) return { error: 'Game already started' };
        if (!s.question || !s.answer) return { error: 'Create a question first' };
        if (s.players.length < 3) return { error: 'Need at least 3 players to start' }; // you had many players allowed; min 3

        s.started = true;
        const duration = s.duration || 60;
        s.timeEndsAt = Date.now() + duration * 1000;

        // clear any previous timer
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }

        s.timer = setTimeout(() => {
            // on timeout, end round with no winner if no correct guess
            s.started = false;
            const answer = s.answer;
            s.question = null;
            s.answer = null;
            s.timeEndsAt = null;
            s.timer = null;

            // rotate master to next player
            this.rotateMasterNext(token);

            io.to(token).emit('game_ended_timeout', { answer });
            io.to(token).emit('players_update', this.getPlayers(token));
        }, duration * 1000);

        return { ok: true, duration, timeEndsAt: s.timeEndsAt };
    }

    /**
     * Guess handling: each player has independent attemptsLeft.
     * When a player guesses:
     *  - decrement that player's attemptsLeft
     *  - if correct: award +1, end round, rotate master
     *  - if wrong: emit wrong event for that player; if all players attemptsLeft <= 0 -> end round (no winner) and rotate master
     */
    guess(token, socketId, guess) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (!s.started) return { error: 'Game not started' };

        const player = s.players.find(p => p.id === socketId);
        if (!player) return { error: 'Player not in session' };
        if (player.attemptsLeft <= 0) return { error: 'No attempts left' };

        player.attemptsLeft -= 1;
        const normalized = (guess || '').trim().toLowerCase();

        if (normalized === s.answer) {
            // winner
            player.score += 10; // +10 per your updated rule
            s.started = false;
            const winner = { id: player.id, name: player.name };
            const answer = s.answer;

            // clear timer
            if (s.timer) { clearTimeout(s.timer); s.timer = null; }

            // reset question/answer/time
            s.question = null;
            s.answer = null;
            s.timeEndsAt = null;

            // rotate master to next player
            this.rotateMasterNext(token);

            return { ok: true, correct: true, winner, answer };
        } else {
            // wrong guess
            // Check if all players exhausted their attempts
            const allExhausted = s.players.every(p => p.attemptsLeft <= 0);
            if (allExhausted) {
                // end round, reveal answer, rotate master
                s.started = false;
                const answer = s.answer;
                s.question = null;
                s.answer = null;
                s.timeEndsAt = null;
                if (s.timer) { clearTimeout(s.timer); s.timer = null; }

                this.rotateMasterNext(token);
                return { ok: true, correct: false, attemptsLeft: player.attemptsLeft, roundEnded: true, answer };
            } else {
                return { ok: true, correct: false, attemptsLeft: player.attemptsLeft, roundEnded: false };
            }
        }
    }

    rotateMasterNext(token) {
        const s = this.getSession(token);
        if (!s) return;
        if (s.players.length === 0) {
            s.masterId = null;
            s.masterName = null;
            return;
        }

        let idx = s.players.findIndex(p => p.id === s.masterId);
        if (idx === -1) idx = 0;
        const nextIdx = (idx + 1) % s.players.length;
        s.masterId = s.players[nextIdx].id;
        s.masterName = s.players[nextIdx].name;
        const [nextPlayer] = s.players.splice(nextIdx, 1);
        s.players.unshift(nextPlayer);
    }
}

module.exports = GameManager;
