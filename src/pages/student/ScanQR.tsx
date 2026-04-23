import { useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanQR() {
  const [started, setStarted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionText, setSessionText] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  // 🛑 STOP SCANNER + CAMERA
  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }

    // Remove scanner UI
    const reader = document.getElementById("qr-reader");
    if (reader) reader.innerHTML = "";

    // Stop all camera tracks (important for mobile)
    document.querySelectorAll("video").forEach((video: any) => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    });
  };

  // ▶ START SCANNER
  const loadScanner = async () => {
    try {
      setStarted(true);
      setSuccess(false);
      scannedRef.current = false;

      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const qrScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },

        async (decodedText: string) => {
          if (scannedRef.current) return;
          scannedRef.current = true;

          console.log("✅ SCANNED:", decodedText);

          // Handle QR formats
          let sessionId = decodedText;
          let expiry: number | null = null;

          if (decodedText.includes("|")) {
            const parts = decodedText.split("|");
            sessionId = parts[0];
            expiry = Number(parts[1]);

            if (Date.now() > expiry) {
              alert("❌ QR Expired!");
              scannedRef.current = false;
              return;
            }
          }

          // ✅ SHOW SUCCESS FIRST (IMPORTANT FIX)
          setSessionText(sessionId);
          setSuccess(true);

          // 🛑 STOP SCANNER AFTER UI UPDATE
          await stopScanner();
          setStarted(false);

          // 📡 SEND TO SERVER
          const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
          ws.onopen = () => {
            ws.send(JSON.stringify({
              type: "attendance",
              sessionId: sessionId
            }));
          };
        },

        () => {}
      );

    } catch (err) {
      console.error(err);
      alert("❌ Camera error");
      setStarted(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Scan QR Code</h2>

      {/* ✅ SUCCESS UI (priority) */}
      {success ? (
        <div style={{ marginTop: "30px" }}>
          <h1 style={{ fontSize: "60px", color: "green" }}>✅</h1>
          <h2>Attendance Marked</h2>
          <p style={{ fontSize: "14px" }}>{sessionText}</p>

          <button
            style={{ marginTop: "20px" }}
            onClick={() => {
              setSuccess(false);
              setStarted(false);
            }}
          >
            🔁 Scan Again
          </button>
        </div>
      ) : !started ? (
        /* ▶ START BUTTON */
        <button onClick={loadScanner}>
          ▶ Start Scanner
        </button>
      ) : (
        /* 📷 SCANNER */
        <div
          id="qr-reader"
          style={{ maxWidth: "350px", margin: "auto" }}
        />
      )}
    </div>
  );
}