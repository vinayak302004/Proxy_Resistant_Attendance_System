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

  // ============================================================
  // START CAMERA
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;

          await videoRef.current.play();
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        console.error("Camera error:", err);

        alert(
          "Unable to access front camera. Please allow camera permission."
        );
      }
    };

    startCamera();

    return () => {
      mounted = false;

      if (videoRef.current) {
        const stream =
          videoRef.current.srcObject as MediaStream | null;

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // ============================================================
  // AUTO CAPTURE
  // ============================================================

  useEffect(() => {
    if (!autoCapture) {
      return;
    }

    const timer = setTimeout(() => {
      capture();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [autoCapture]);

  // ============================================================
  // STOP CAMERA
  // ============================================================

  const stopCamera = () => {
    if (!videoRef.current) {
      return;
    }

    const stream =
      videoRef.current.srcObject as MediaStream | null;

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    videoRef.current.srcObject = null;
  };

  // ============================================================
  // CAPTURE SELFIE
  // ============================================================

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (loading) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // ============================================================
    // CHECK CAMERA
    // ============================================================

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      alert(
        "Camera is not ready. Please keep your face visible and try again."
      );

      return;
    }

    // ============================================================
    // GET PRN
    // ============================================================

    const prn = localStorage.getItem("prn");

    if (!prn) {
      alert(
        "Student PRN not found. Please login again."
      );

      stopCamera();

      onFailed();

      return;
    }

    // ============================================================
    // CHECK SESSION
    // ============================================================

    if (!sessionId) {
      alert(
        "Attendance session not found."
      );

      stopCamera();

      onFailed();

      return;
    }

    setLoading(true);

    // ============================================================
    // SET CANVAS SIZE
    // ============================================================

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert(
        "Unable to process camera image."
      );

      setLoading(false);

      return;
    }

    // ============================================================
    // DRAW VIDEO FRAME
    // ============================================================

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // ============================================================
    // CONVERT IMAGE TO BLOB
    // ============================================================

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          alert(
            "Could not capture selfie."
          );

          setLoading(false);

          return;
        }

        try {
          // ======================================================
          // DEBUG
          // ======================================================

          console.log(
            "======================================"
          );

          console.log(
            "FACE VERIFICATION"
          );

          console.log(
            "Backend:",
            `${API_URL}/verify-face`
          );

          console.log(
            "PRN:",
            prn
          );

          console.log(
            "Session ID:",
            sessionId
          );

          console.log(
            "Image size:",
            blob.size
          );

          console.log(
            "======================================"
          );

          // ======================================================
          // CREATE FORM DATA
          // ======================================================

          const formData = new FormData();

          formData.append(
            "image",
            blob,
            "selfie.jpg"
          );

          formData.append(
            "prn",
            prn
          );

          formData.append(
            "session_id",
            sessionId
          );

          // ======================================================
          // CALL FACE VERIFICATION
          // ======================================================

          const response = await fetch(
            `${API_URL}/verify-face`,
            {
              method: "POST",
              body: formData,
            }
          );

          console.log(
            "Face verification HTTP status:",
            response.status
          );

          // ======================================================
          // READ RESPONSE
          // ======================================================

          const result = await response.json();

          console.log(
            "Face verification response:",
            result
          );

          // ======================================================
          // BACKEND ERROR
          // ======================================================

          if (!response.ok) {
            alert(
              result.message ||
              "Face verification request failed."
            );

            stopCamera();

            onFailed();

            return;
          }

          // ======================================================
          // FACE VERIFICATION FAILED
          // ======================================================

          if (!result.verified) {
            alert(
              result.message ||
              "Face verification failed."
            );

            stopCamera();

            onFailed();

            return;
          }

          // ======================================================
          // FACE VERIFIED
          // ======================================================

          console.log(
            "======================================"
          );

          console.log(
            "FACE VERIFIED SUCCESSFULLY"
          );

          console.log(
            "PRN:",
            result.prn
          );

          console.log(
            "Name:",
            result.name
          );

          console.log(
            "======================================"
          );

          // ======================================================
          // MARK ATTENDANCE
          // ======================================================

          const markResponse = await fetch(
            `${API_URL}/attendance/mark`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                prn: prn,
                session_id: sessionId,
              }),
            }
          );

          console.log(
            "Attendance mark HTTP status:",
            markResponse.status
          );

          const markResult =
            await markResponse.json();

          console.log(
            "Attendance mark response:",
            markResult
          );

          // ======================================================
          // ATTENDANCE MARK FAILED
          // ======================================================

          if (!markResponse.ok || !markResult.success) {
            alert(
              markResult.message ||
              "Unable to mark attendance."
            );

            stopCamera();

            onFailed();

            return;
          }

          // ======================================================
          // SUCCESS
          // ======================================================

          console.log(
            "Attendance marked successfully."
          );

          stopCamera();

          onVerified(
            result.name || prn
          );

        } catch (err: any) {
          console.error(
            "FACE VERIFICATION ERROR:",
            err
          );

          alert(
            "Cannot connect to Flask Server.\n\n" +
            (err?.message || "Failed to fetch")
          );

          stopCamera();

          onFailed();

        } finally {
          setLoading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "30px",
      }}
    >
      <h2>
        Face Verification
      </h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={350}
        style={{
          borderRadius: "10px",
          border: "2px solid #444",
          maxWidth: "90vw",
        }}
      />

      <br />
      <br />

      {!autoCapture && (
        <button
          onClick={capture}
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : "Capture Selfie"}
        </button>
      )}

      {autoCapture && (
        <p>
          {loading
            ? "Verifying Face..."
            : "Looking at camera..."}
          <br />

          Please keep your face clearly visible.
        </p>
      )}

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />
    </div>
  );
}