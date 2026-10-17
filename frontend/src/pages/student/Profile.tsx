import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import "../../styles/profile.css";

import { API_URL } from "../../config";
import ritLogo from "../../assets/RIT_logo.jpeg";

import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";

import {
  initializeApp,
  getApps
} from "firebase/app";


interface Student {
  full_name: string;
  prn: string;
  email: string;
  phone: string;
  year: string;
  branch: string;
  division: string;
  gender: string;
  face_folder: string;
}

const firebaseConfig = {
  apiKey:
    "AIzaSyDsJPGm7CwJEE2o2kI",
};

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

export default function Profile() {

  const navigate = useNavigate();
  const [
    student,
    setStudent
  ] = useState<Student | null>(null);
  const [
    loading,
    setLoading
  ] = useState(true);
  const [
    error,
    setError
  ] = useState("");
  const [
    photoFile,
    setPhotoFile
  ] = useState<File | null>(null);
  const [
    photoPreview,
    setPhotoPreview
  ] = useState("");
  const [
    uploading,
    setUploading
  ] = useState(false);
  const [
    photoError,
    setPhotoError
  ] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const prn =
          localStorage.getItem("prn");
        console.log(
          "Logged-in student PRN:",
          prn
        );
        if (!prn) {
          setError(
            "Student PRN not found. Please login again."
          );
          setLoading(false);
          return;
        }
        const response =
          await fetch(
            `${API_URL}/student/profile/${encodeURIComponent(prn)}`
          );
        const data =
          await response.json();
        console.log(
          "Profile API response:",
          data
        );
        if (!response.ok) {
          throw new Error(
            data.message ||
            "Student profile not found."
          );
        }
        setStudent(data);
        setLoading(false);
      } catch (err: any) {
        console.error(
          "Profile error:",
          err
        );
        setError(
          err?.message ||
          "Unable to load student profile."
        );
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handlePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];
    if (!file) {
      return;
    }
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];
    if (!allowedTypes.includes(file.type)) {
      alert(
        "Please select a JPG, PNG or WEBP image."
      );
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Photo size must be less than 5 MB."
      );
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
    const previewUrl =
      URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };
  const handleUploadPhoto = async () => {
    if (!photoFile) {
      alert(
        "Please select a photo first."
      );
      return;
    }
    if (!student) {
      alert(
        "Student profile not loaded."
      );
      return;
    }
    try {
      setUploading(true);
      const auth =
        getAuth(firebaseApp);
      const currentUser =
        auth.currentUser;
      if (!currentUser) {
        alert(
          "Student is not logged in. Please login again."
        );
        return;
      }
      const token =
        await currentUser.getIdToken(true);
      const formData =
        new FormData();
      formData.append(
        "photo",
        photoFile
      );
      formData.append(
        "prn",
        student.prn
      );
      const response =
        await fetch(
          `${API_URL}/student/profile/photo`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`
            },
            body: formData
          }
        );
      const data =
        await response.json();
      console.log(
        "Photo upload response:",
        data
      );
      if (!response.ok) {
        throw new Error(
          data.message ||
          "Photo upload failed."
        );
      }
      setPhotoError(false);
      setPhotoFile(null);
      setPhotoPreview("");
      const newPhotoUrl =
        `${API_URL}/student/photo/${encodeURIComponent(student.prn)}?t=${Date.now()}`;
      const imageElement =
        document.querySelector(
          ".profile-img"
        ) as HTMLImageElement | null;
      if (imageElement) {
        imageElement.src =
          newPhotoUrl;
      }
      alert(
        "Profile photo updated successfully!"
      );
    } catch (err: any) {
      console.error(
        "Photo upload error:",
        err
      );
      alert(
        err?.message ||
        "Unable to upload profile photo."
      );
    } finally {
      setUploading(false);
    }
  };

  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must contain at least 6 characters.");
      return;
    }

    if (currentPassword === newPassword) {
      alert("New password must differ from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    if (!user || !user.email) {
      alert("Please log in again before changing your password.");
      return;
    }

    try {
      setChangingPassword(true);

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      // Verify the student's current password.
      await reauthenticateWithCredential(user, credential);

      // Update the password in Firebase Authentication.
      await updatePassword(user, newPassword);

      alert("Password changed successfully!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch (err: any) {
      console.error("Change password error:", err);

      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        alert("Current password is incorrect.");
      } else if (err.code === "auth/weak-password") {
        alert("Please choose a stronger password.");
      } else if (err.code === "auth/too-many-requests") {
        alert("Too many attempts. Please try again later.");
      } else if (err.code === "auth/requires-recent-login") {
        alert("Your session has expired. Please log in again.");
      } else {
        alert(err.message || "Unable to change password.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const openScanner = () => {
    navigate("/scan");
  };
  const logout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("prn");
    localStorage.removeItem("email");
    localStorage.removeItem("full_name");
    window.location.href = "/";
  };
  if (loading) {
    return (
      <div className="wrapper">
        <h2>
          Loading Profile...
        </h2>
      </div>
    );
  }
  if (!student) {
    return (
      <div className="wrapper">
        <div className="card">
          <div className="card-header">
            <div className="profile-header-left">
              <img
                src={ritLogo}
                alt="RIT Logo"
                className="profile-rit-logo"
              />
              <span>
                Student Profile
              </span>
            </div>
          </div>
          <div className="section center">
            <h2>
              Student Profile Not Found
            </h2>
            <p>
              {error}
            </p>
            <button
              className="btn"
              onClick={() =>
                window.location.href = "/"
              }
            >
              Login Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="wrapper">
      <div className="card">
        <div className="card-header">
          <div className="profile-header-left">
            <img
              src={ritLogo}
              alt="RIT Logo"
              className="profile-rit-logo"
            />
            <span>
              Student Profile
            </span>
          </div>
        </div>
        <div className="profile-banner">
          <img
            src={
              photoPreview
                ? photoPreview
                : !photoError
                  ? `${API_URL}/student/photo/${encodeURIComponent(student.prn)}?t=${Date.now()}`
                  : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
            className="profile-img"
            alt={student.full_name}
            onError={() =>
              setPhotoError(true)
            }
          />
          <div className="profile-info">
            <h3>
              {student.full_name}
            </h3>
            <p>
              <b>PRN:</b>{" "}
              {student.prn}
            </p>
            <p>
              <b>Year:</b>{" "}
              {student.year}
            </p>
            <p>
              <b>Branch:</b>{" "}
              {student.branch}
            </p>
            <p>
              <b>Division:</b>{" "}
              {student.division}
            </p>
          </div>
        </div>
        <div className="section center">
          <button
            className="btn"
            onClick={openScanner}
          >
            📷 Scan QR for Attendance
          </button>
        </div>
        <div className="section">
          <button
            className="btn"
            onClick={() =>
              navigate(
                "/student-attendance"
              )
            }
          >
            📊 View Attendance
          </button>
        </div>
        <div className="section">
          <h4>
            Update Profile Photo
          </h4>
          <input
            id="student-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            style={{
              display: "none"
            }}
          />
          <label
            htmlFor="student-photo-input"
            className="btn"
            style={{
              display: "inline-block",
              cursor: "pointer"
            }}
          >
            📷 Choose Photo
          </label>
          {photoFile && (
            <div
              style={{
                marginTop: "15px"
              }}
            >
              <p>
                Selected:
                {" "}
                <b>
                  {photoFile.name}
                </b>
              </p>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Photo Preview"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "50%",
                    display: "block",
                    margin: "10px auto"
                  }}
                />

              )}
              <button
                className="btn"
                onClick={handleUploadPhoto}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : "⬆️ Upload & Set Profile Photo"}
              </button>
            </div>
          )}
        </div>
        <div className="section">
          <button
            className="btn"
            onClick={logout}
          >
            Logout
          </button>
        </div>
        
        <div className="section">
          <button
            className="btn"
            type="button"
            onClick={() => setShowChangePassword(!showChangePassword)}
          >
            🔒 Change Password
          </button>

          {showChangePassword && (
            <div style={{ marginTop: "20px" }}>
              <h4>Change Your Password</h4>

              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="current-password">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px",
                    marginTop: "6px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px",
                    marginTop: "6px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px",
                    marginTop: "6px"
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  width: "100%",
                  marginTop: "15px"
                }}
              >
                <button
                  className="btn"
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    margin: 0,
                    position: "static"
                  }}
                >
                  {changingPassword
                    ? "Changing Password..."
                    : "Update Password"}
                </button>

                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={changingPassword}
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    margin: 0,
                    position: "static"
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}