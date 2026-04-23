import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: 8080,
  host: "0.0.0.0"
});

let clients: WebSocket[] = [];

// 🔥 Session data
let currentSession: string | null = null;
let sessionExpiry: number = 0;

// 📍 Teacher location
let teacherLat: number | null = null;
let teacherLng: number | null = null;

// 📐 Distance formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

wss.on("connection", (ws: WebSocket) => {
  console.log("✅ Client connected");

  clients.push(ws);

  ws.on("message", (message: WebSocket.RawData) => {
    try {
      const data = JSON.parse(message.toString());

      // 🟦 Teacher creates session
      if (data.type === "session" && data.sessionId) {
        currentSession = data.sessionId;
        sessionExpiry = Date.now() + 3000;

        teacherLat = data.lat;
        teacherLng = data.lng;

        console.log("🟦 Session:", currentSession);
      }

      // 🟢 Student attendance
      if (data.type === "attendance" && data.sessionId) {
        console.log("📥 Attendance:", data.sessionId);

        // ❌ Invalid session
        if (data.sessionId !== currentSession) {
          console.log("❌ Session mismatch");
          ws.send(JSON.stringify({ type: "attendance-failed" }));
          return;
        }

        // ❌ Expired
        if (Date.now() > sessionExpiry) {
          console.log("❌ QR expired");
          ws.send(JSON.stringify({ type: "attendance-failed" }));
          return;
        }

        // ❌ Missing location
        if (!teacherLat || !teacherLng || !data.lat || !data.lng) {
          console.log("❌ Missing location");
          ws.send(JSON.stringify({ type: "attendance-failed" }));
          return;
        }

        // 📏 Distance check
        const distance = getDistance(
          teacherLat,
          teacherLng,
          data.lat,
          data.lng
        );

        console.log("📏 Distance:", distance);

        if (distance > 50) {
          console.log("❌ Too far");

          // ❌ Send fail ONLY to this student
          ws.send(JSON.stringify({
            type: "attendance-failed"
          }));

          return;
        }

        console.log("✅ Attendance OK");

        // ✅ Send success to THIS student
        ws.send(JSON.stringify({
          type: "attendance-success"
        }));

        // 📡 Broadcast to teacher (count increment)
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "attendance",
              sessionId: data.sessionId
            }));
          }
        });
      }

    } catch (err) {
      console.error("❌ Parse error:", err);
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

console.log("🚀 Server running on ws://0.0.0.0:8080");