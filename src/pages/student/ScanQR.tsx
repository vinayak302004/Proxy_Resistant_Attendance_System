import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanQR() {

  const [started, setStarted] = useState(false);

  const loadScanner = async () => {
    try {
      setStarted(true);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const qrScanner = new Html5Qrcode("qr-reader");

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        alert("❌ No camera found");
        return;
      }

      const backCamera = cameras.find((cam: any) =>
        cam.label.toLowerCase().includes("back")
      );

      const cameraId = backCamera ? backCamera.id : cameras[0].id;

      await qrScanner.start(
        cameraId,
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {

          document.getElementById("qr-result")!.innerText =
            `✅ Attendance Marked: ${decodedText}`;

          const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

          ws.onopen = () => {
            ws.send(JSON.stringify({
              type: "attendance",
              sessionId: decodedText
            }));
          };

          qrScanner.stop();
        },
        (errorMessage: string) => {
          // ignore scan errors
        }
      );

    } catch (err) {
      console.error(err);
      alert("❌ Camera error / permission denied");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Scan QR Code to Mark Attendance</h2>

      <button
        onClick={loadScanner}
        disabled={started}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          marginBottom: "15px"
        }}
      >
        {started ? "Starting Camera..." : "▶ Start Scanner"}
      </button>

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