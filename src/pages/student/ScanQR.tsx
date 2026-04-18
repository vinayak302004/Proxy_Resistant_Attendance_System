import { useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanQR() {

  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false); // 🔥 prevent multiple scans

  const loadScanner = async () => {
    try {
      setStarted(true);
      scannedRef.current = false;

      // ask permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const qrScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrScanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        alert("❌ No camera found");
        setStarted(false);
        return;
      }

      // ✅ back camera
      const backCamera = cameras.find((cam: any) =>
        cam.label.toLowerCase().includes("back")
      );

      const cameraId = backCamera ? backCamera.id : cameras[0].id;

      await qrScanner.start(
        cameraId,
        { fps: 10, qrbox: 250 },

        async (decodedText: string) => {

          // 🔥 STOP MULTIPLE TRIGGERS
          if (scannedRef.current) return;
          scannedRef.current = true;

          // ✅ show result
          const resultEl = document.getElementById("qr-result");
          if (resultEl) {
            resultEl.innerText = `✅ Attendance Marked: ${decodedText}`;
          }

          // ✅ send attendance
          const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

          ws.onopen = () => {
            ws.send(JSON.stringify({
              type: "attendance",
              sessionId: decodedText
            }));
          };

          try {
            // ✅ STOP CAMERA PROPERLY
            await qrScanner.stop();
            await qrScanner.clear();

            // ✅ REMOVE VIDEO UI
            const reader = document.getElementById("qr-reader");
            if (reader) reader.innerHTML = "";

          } catch (err) {
            console.error("Stop error:", err);
          }

          // ✅ show button again
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
      <h2>Scan QR Code to Mark Attendance</h2>

      {/* ✅ Button comes back after scan */}
      {!started && (
        <button
          onClick={loadScanner}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            marginBottom: "15px"
          }}
        >
          ▶ Start Scanner
        </button>
      )}

      <div
        id="qr-reader"
        style={{
          width: "100%",
          maxWidth: "350px",
          margin: "auto"
        }}
      ></div>

      <div
        id="qr-result"
        style={{
          marginTop: "15px",
          fontWeight: "bold"
        }}
      ></div>
    </div>
  );
}