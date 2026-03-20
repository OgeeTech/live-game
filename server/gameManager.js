const AVATARS = ['🦊', '🐉', '🤖', '👽', '👻', '👾', '🦄', '🦖', '🦁', '🐙', '🥷', '🧙‍♂️'];
function getRandomAvatar() { return AVATARS[Math.floor(Math.random() * AVATARS.length)]; }

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
            players: [],
            started: false,
            question: null,
            answer: null,
            timer: null,
            timeEndsAt: null,
            duration: 60,
            roundWinners: [], 
            targetScore: 50 
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

        // NEW: Assign random avatar and initial streak
        s.players.push({ id: socketId, name, score: 0, attemptsLeft: 3, avatar: getRandomAvatar(), streak: 0 });

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
                s.masterId = s.players[0].id;
                s.masterName = s.players[0].name;
            } else {
                s.masterId = null;
                s.masterName = null;
            }
        }
        if (s.players.length === 0) this.deleteSession(token);
    }

    getPlayers(token) {
        const s = this.getSession(token);
        if (!s) return [];
        return s.players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            attemptsLeft: p.attemptsLeft,
            isMaster: p.id === s.masterId,
            avatar: p.avatar, // NEW
            streak: p.streak  // NEW
        }));
    }

    setMaster(token, socketId, name) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (s.masterId && s.masterId !== socketId) return { error: 'Master already claimed' };

        s.masterId = socketId;
        s.masterName = name;

        if (!s.players.find(p => p.id === socketId)) {
            s.players.unshift({ id: socketId, name, score: 0, attemptsLeft: 3, avatar: getRandomAvatar(), streak: 0 });
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
        s.players.forEach(p => p.attemptsLeft = 3);
        return { ok: true };
    }

    checkMatchOver(token) {
        const s = this.getSession(token);
        if (!s) return { matchOver: false };
        const winner = s.players.find(p => p.score >= s.targetScore);
        if (winner) {
            const sorted = [...s.players].sort((a,b) => b.score - a.score);
            return {
                matchOver: true,
                podium: sorted.slice(0, 3).map(p => ({ name: p.name, score: p.score, avatar: p.avatar }))
            };
        }
        return { matchOver: false };
    }

    resetScores(token) {
        const s = this.getSession(token);
        if (!s) return;
        s.players.forEach(p => { p.score = 0; p.streak = 0; });
        s.roundWinners = [];
    }

    // NEW: Helper to clean up round and break streaks for losers
    _processRoundEnd(s) {
        s.started = false;
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }
        
        // Break streaks for anyone who didn't guess correctly this round
        s.players.forEach(p => {
            if (p.id !== s.masterId && !s.roundWinners.includes(p.id)) {
                p.streak = 0;
            }
        });

        s.question = null; s.answer = null; s.timeEndsAt = null;
    }

    startGame(token, socketId, io) {
        const s = this.getSession(token);
        if (!s) return { error: 'Session not found' };
        if (s.masterId !== socketId) return { error: 'Only master can start' };
        if (s.started) return { error: 'Game already started' };
        if (!s.question || !s.answer) return { error: 'Create a question first' };
        if (s.players.length < 3) return { error: 'Need at least 3 players to start' };

        s.started = true;
        s.roundWinners = []; 
        const duration = s.duration || 60;
        s.timeEndsAt = Date.now() + duration * 1000;

        if (s.timer) { clearTimeout(s.timer); s.timer = null; }

        s.timer = setTimeout(() => {
            const answer = s.answer;
            this._processRoundEnd(s); // Handle streaks
            
            io.to(token).emit('game_ended_timeout', { answer });
            io.to(token).emit('players_update', this.getPlayers(token));
            
            const matchCheck = this.checkMatchOver(token);
            if (matchCheck.matchOver) io.to(token).emit('match_ended', matchCheck);

        }, duration * 1000);

        return { ok: true, duration, timeEndsAt: s.timeEndsAt };
    }

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
            if (s.roundWinners.includes(socketId)) return { error: 'You already guessed the answer!' };

            const now = Date.now();
            const timeRemaining = Math.max(0, s.timeEndsAt - now);
            const totalDuration = s.duration * 1000; 
            
            // NEW: Streak Math
            player.streak += 1;
            const isHot = player.streak >= 3;
            const basePoints = Math.max(1, Math.ceil((timeRemaining / totalDuration) * 10));
            const earned = isHot ? basePoints + 2 : basePoints; // +2 Bonus if on fire!
            
            player.score += earned; 
            s.roundWinners.push(socketId);
            const winner = { id: player.id, name: player.name };
            const answer = s.answer;

            const guessers = s.players.filter(p => p.id !== s.masterId);
            const allDone = guessers.every(p => s.roundWinners.includes(p.id) || p.attemptsLeft <= 0);

            if (allDone) {
                this._processRoundEnd(s);
                return { ok: true, correct: true, earned, isHot, winner, answer, roundEnded: true, ...this.checkMatchOver(token) };
            }

            return { ok: true, correct: true, earned, isHot, winner, answer, roundEnded: false };
            
        } else {
            const allExhausted = s.players.every(p => p.id === s.masterId || s.roundWinners.includes(p.id) || p.attemptsLeft <= 0);
            if (allExhausted) {
                const answer = s.answer;
                this._processRoundEnd(s);
                return { ok: true, correct: false, attemptsLeft: player.attemptsLeft, roundEnded: true, answer, ...this.checkMatchOver(token) };
            } else {
                return { ok: true, correct: false, attemptsLeft: player.attemptsLeft, roundEnded: false };
            }
        }
    }
}

module.exports = GameManager;