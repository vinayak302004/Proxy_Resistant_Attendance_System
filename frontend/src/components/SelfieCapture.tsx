import { useEffect, useRef, useState } from "react";

type Props = {
  onVerified: (name: string) => void;
  onFailed: () => void;
};

export default function SelfieCapture({
  onVerified,
  onFailed,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(false);

  // ✅ Dynamic backend URL
  const backendUrl = `http://${window.location.hostname}:5000`;

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Unable to access front camera.");
    }
  };

  const stopCamera = () => {
    if (!videoRef.current) return;

    const stream = videoRef.current.srcObject as MediaStream;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setLoading(false);
      return;
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "selfie.jpg");

      try {
        console.log("Sending to:", `${backendUrl}/verify-face`);

        const response = await fetch(`${backendUrl}/verify-face`, {
          method: "POST",
          body: formData,
        });

        console.log("Status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        console.log(result);

        if (result.verified) {
          stopCamera();
          onVerified(result.name);
        } else {
          alert(result.message);
          onFailed();
        }
      } catch (err: any) {
        console.error(err);
        alert(
          "Cannot connect to Flask Server.\n\n" +
          "Backend URL:\n" +
          `${backendUrl}\n\n` +
          err.message
        );
      }

      setLoading(false);
    }, "image/jpeg");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "30px" }}>
      <h2>Face Verification</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        width={350}
        style={{
          borderRadius: "10px",
          border: "2px solid #444",
        }}
      />

      <br />
      <br />

      <button
        onClick={capture}
        disabled={loading}
      >
        {loading ? "Verifying..." : "Capture Selfie"}
      </button>

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />
    </div>
  );
}