import { useEffect } from "react";

export default function ScanQR() {

  useEffect(() => {

  const ws = new WebSocket("ws://localhost:8080");

  const loadScanner = async () => {
    try {
      // ✅ FORCE CAMERA PERMISSION
      await navigator.mediaDevices.getUserMedia({ video: true });

      const Html5Qrcode = (window as any).Html5Qrcode;
      const scanner = new Html5Qrcode("qr-reader");

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        document.getElementById("qr-result")!.innerText = "❌ No camera found!";
        return;
      }

      scanner.start(
        cameras[0].id,
        {
          fps: 10,
          qrbox: 250
        },
        (decodedText: string) => {

          document.getElementById("qr-result")!.innerText =
            `✅ Attendance Marked for ${decodedText}`;

          ws.send(JSON.stringify({
            type: "attendance",
            sessionId: decodedText
          }));

          scanner.stop();
        }
      );

    } catch (err) {
      document.getElementById("qr-result")!.innerText =
        "❌ Camera permission denied!";
      console.error(err);
    }
  };

  if (!(window as any).Html5Qrcode) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";
    script.onload = loadScanner;
    document.body.appendChild(script);
  } else {
    loadScanner();
  }

}, []);

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Scan QR Code to Mark Attendance</h2>

      <div
        id="qr-reader"
        style={{ width: "100%", maxWidth: "350px", margin: "auto" }}
      ></div>

      <div
        id="qr-result"
        style={{ marginTop: "15px", fontWeight: "bold" }}
      ></div>
    </div>
  );
}