
// public/js/socket.js
const socket = io(window.location.origin, {
    transports: ["websocket"],
    path: "/socket.io"
});
window.socket = socket;
