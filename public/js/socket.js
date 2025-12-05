// public/js/socket.js

const socket = io({
    transports: ["websocket"],   // Required for Render hosting
});

// make it accessible globally if needed
window.socket = socket;
