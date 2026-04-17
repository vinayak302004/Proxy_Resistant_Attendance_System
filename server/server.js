const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Broadcast to all (teacher will receive)
    if (data.type === "attendance") {
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