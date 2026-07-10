import { useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

import { useNavigate } from "react-router-dom";
import SelfieCapture from "../../components/SelfieCapture";

export default function ScanQR() {
  const navigate = useNavigate();
  const [showSelfie, setShowSelfie] = useState(false);
  const [started, setStarted] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const [sessionId, setSessionId] = useState("");

  // 🛑 STOP SCANNER + CAMERA
  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }

    const reader = document.getElementById("qr-reader");
    if (reader) reader.innerHTML = "";

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

          const currentSessionId = decodedText;
          setSessionId(currentSessionId);
          await stopScanner();

          setStarted(false);

          navigator.geolocation.getCurrentPosition(
  async (pos) => {
    try {
      const studentUid = localStorage.getItem("uid");

      const response = await fetch(
        `http://${window.location.hostname}:5000/attendance/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            student_uid: studentUid,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message);
        scannedRef.current = false;
        navigate("/profile");
        return;
      }
      setShowSelfie(true);

    } catch (err) {
      console.error(err);
      alert("Server Error");
      navigate("/profile");
    }
  },
  () => {
    alert("Location permission required");
    navigate("/profile");
  }
);
         
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

      {showSelfie && sessionId ? (

    <SelfieCapture
        sessionId={sessionId}
        autoCapture={true}
        onVerified={(name) => {
            alert("✅ Attendance Marked");
            setShowSelfie(false);
            navigate("/profile");
        }}
        onFailed={() => {
            alert("❌ Face Verification Failed");
            setShowSelfie(false);
            navigate("/profile");
        }}
    />

) : !started ? (

    <button onClick={loadScanner}>
        ▶ Start Scanner
    </button>

) : (

    <div
        id="qr-reader"
        style={{
            maxWidth: "350px",
            margin: "auto"
        }}
    />

)}

    </div>
  );
}