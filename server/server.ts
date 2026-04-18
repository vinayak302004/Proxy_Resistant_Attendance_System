import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: 8080,
  host: "0.0.0.0"
});

let clients: WebSocket[] = [];
let currentSession: string | null = null;

wss.on("connection", (ws: WebSocket) => {
  console.log("✅ Client connected");
  clients.push(ws);

  console.log("👥 Total clients:", clients.length);

  ws.on("message", (message: WebSocket.RawData) => {
    try {
      const data = JSON.parse(message.toString()) as {
        type: string;
        sessionId?: string;
      };

      // 🔵 Teacher session update
      if (data.type === "session" && data.sessionId) {
        currentSession = data.sessionId;
        console.log("🟦 New Session:", currentSession);
      }

      // 🟢 Student attendance
      if (data.type === "attendance" && data.sessionId) {
        console.log("📥 Attendance:", data.sessionId);

        // ❌ reject expired QR
        if (data.sessionId !== currentSession) {
          console.log("❌ Expired QR");
          return;
        }

        console.log("📡 Broadcasting...");

        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "attendance",
              sessionId: data.sessionId
            }));
          }
        });
      }

    } catch (err) {
      console.error("❌ Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
    console.log("❌ Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("⚠ WS Error:", err);
  });
});

console.log("🚀 WebSocket server running on ws://0.0.0.0:8080");