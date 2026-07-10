import { useEffect, useRef, useState } from "react";
import { API_URL } from "../../src/config";

type Props = {
  sessionId: string;
  onVerified: (name: string) => void;
  onFailed: () => void;
  autoCapture?: boolean;
};

export default function SelfieCapture({
  sessionId,
  onVerified,
  onFailed,
  autoCapture = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(false);


  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!autoCapture) return;

    const timer = setTimeout(() => {
      capture();
    }, 2500);

    return () => clearTimeout(timer);
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

      try {

        // Get logged in student's UID
        const uid = localStorage.getItem("uid");

        if (!uid) {
          alert("User not logged in.");
          setLoading(false);
          return;
        }

        const formData = new FormData();

        // Send image
        formData.append("image", blob, "selfie.jpg");

        // Send Firebase UID
        formData.append("uid", uid);

        formData.append("session_id", sessionId);

        console.log("Backend:", `${API_URL}/verify-face`);
        console.log("UID:", uid);

        const response = await fetch(`${API_URL}/verify-face`, {
          method: "POST",
          body: formData,
        });

        console.log("Status:", response.status);

        const result = await response.json();

        console.log(result);

        if (result.verified) {

            const uid = localStorage.getItem("uid");

            const markResponse = await fetch(`${API_URL}/attendance/mark`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    student_uid: uid,
                    teacher_uid: result.teacher_uid,
                    department: result.department,
                    year: result.year,
                    subject: result.subject,
                }),
            });

            const markResult = await markResponse.json();

            if (!markResult.success) {
                alert(markResult.message);
                onFailed();
                return;
            }

            stopCamera();
            onVerified(result.name);
        }
        else {
          alert(result.message);
          onFailed();
        }

      } catch (err: any) {
        console.error(err);

        alert(
          "Cannot connect to Flask Server.\n\n" +
          err.message
        );

        onFailed();
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

      {!autoCapture && (
        <button onClick={capture} disabled={loading}>
          {loading ? "Verifying..." : "Capture Selfie"}
        </button>
      )}

      {autoCapture && (
        <p>
          Looking at camera...
          <br />
          Verifying Face...
        </p>
      )}

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />
    </div>
  );
}