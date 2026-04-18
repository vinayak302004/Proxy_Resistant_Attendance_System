const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let clients = [];
let currentSession = null;

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // ✅ Teacher updates session
    if (data.type === "session") {
      currentSession = data.sessionId;
    }

    // ✅ Student sends attendance
    if (data.type === "attendance") {

      // ❌ Reject old QR
      if (data.sessionId !== currentSession) {
        console.log("❌ Expired QR scanned");
        return;
      }

      // ✅ Broadcast valid attendance
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "attendance",
            sessionId: data.sessionId
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

console.log("WebSocket server running on port 8080");