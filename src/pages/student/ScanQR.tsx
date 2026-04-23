import { useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanQR() {

  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  const loadScanner = async () => {
    try {
      setStarted(true);
      scannedRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const qrScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrScanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras.length) {
        alert("❌ No camera found");
        setStarted(false);
        return;
      }

      const cameraId = cameras[0].id;

      await qrScanner.start(
  { facingMode: "environment" }, // 🔥 FORCE BACK CAMERA
  { fps: 10, qrbox: 250 },

  async (decodedText: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    const [sessionId, expiry] = decodedText.split("|");

    if (Date.now() > Number(expiry)) {
      alert("❌ QR Expired!");
      scannedRef.current = false;
      return;
    }

    document.getElementById("qr-result")!.innerText =
      "✅ Attendance Marked";

    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "attendance",
        sessionId: decodedText
      }));
    };

    await qrScanner.stop();
    await qrScanner.clear();

    document.getElementById("qr-reader")!.innerHTML = "";

    setStarted(false);
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

      {!started && (
        <button onClick={loadScanner}>
          ▶ Start Scanner
        </button>
      )}

      <div id="qr-reader" style={{ maxWidth: "350px", margin: "auto" }}></div>

      <div id="qr-result" style={{ marginTop: "10px" }}></div>
    </div>
  );
}