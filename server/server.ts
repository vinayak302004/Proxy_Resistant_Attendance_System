import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: 8080,
  host: "0.0.0.0"
});

let clients: WebSocket[] = [];

// 🔥 Store active session + expiry
let currentSession: string | null = null;
let sessionExpiry: number = 0;

wss.on("connection", (ws: WebSocket) => {
  console.log("✅ Client connected");

  clients.push(ws);
  console.log("👥 Total clients:", clients.length);

  ws.on("message", (message: WebSocket.RawData) => {
    try {
      const data = JSON.parse(message.toString());

      // 🟦 Teacher sets session
      if (data.type === "session" && data.sessionId) {
        currentSession = data.sessionId;

        // 🔥 expire after 3 sec
        sessionExpiry = Date.now() + 3000;

        console.log("🟦 New Session:", currentSession);
      }

      // 🟢 Student attendance
      if (data.type === "attendance" && data.sessionId) {
        console.log("📥 Attendance:", data.sessionId);

        // ❌ Wrong session
        if (data.sessionId !== currentSession) {
          console.log("❌ Invalid QR (session mismatch)");
          return;
        }

        // ❌ Expired QR
        if (Date.now() > sessionExpiry) {
          console.log("❌ QR expired (time over)");
          return;
        }

        console.log("📡 Broadcasting attendance...");

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