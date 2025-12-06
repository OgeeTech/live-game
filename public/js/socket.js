// // public/js/socket.js

// const socket = io({
//     transports: ["websocket"],   // Required for Render hosting
// });

// // make it accessible globally if needed
// window.socket = socket;


// public/js/socket.js
const socket = io(window.location.origin, {
    transports: ["websocket"],
    path: "/socket.io"
});
window.socket = socket;
