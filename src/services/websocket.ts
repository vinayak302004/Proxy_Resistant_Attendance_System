export const socket = new WebSocket("ws://localhost:8080");

socket.onopen = () => console.log("WS Connected");