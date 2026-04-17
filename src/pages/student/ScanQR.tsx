import { useEffect } from "react";

export default function ScanQR() {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";

    script.onload = () => {
      const Html5Qrcode = (window as any).Html5Qrcode;

      const html5QrcodeScanner = new Html5Qrcode("qr-reader");

      Html5Qrcode.getCameras()
        .then((cameras: any) => {
          if (cameras.length) {
            html5QrcodeScanner.start(
              cameras[0].id,
              { fps: 10, qrbox: 250 },
              (decodedText: string) => {
                document.getElementById("qr-result")!.innerText =
                  `Attendance Marked for ${decodedText}`;

                ws.send(JSON.stringify({
                  type: "attendance",
                  sessionId: decodedText
                }));

                html5QrcodeScanner.clear();
              }
            );
          } else {
            document.getElementById("qr-result")!.innerText = "No camera found!";
          }
        })
        .catch(() => {
          document.getElementById("qr-result")!.innerText =
            "Camera access denied or not supported!";
        });
    };

    document.body.appendChild(script);
  }, []);

  return (
    <div>
      <h2>Scan QR Code to Mark Attendance</h2>

      <div id="qr-reader" style={{ width: "100%", maxWidth: "400px", margin: "auto" }}></div>

      <div id="qr-result" style={{ textAlign: "center", marginTop: "10px", fontWeight: "bold" }}></div>
    </div>
  );
}