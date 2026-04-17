import { useState } from "react";
import "../../styles/login.css";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsJPGm7CwJEE2o2kI0NAiSKia0YQxEvMs",
  authDomain: "smart-attendance-login.firebaseapp.com",
  projectId: "smart-attendance-login",
  storageBucket: "smart-attendance-login.firebasestorage.app",
  messagingSenderId: "198869708642",
  appId: "1:198869708642:web:b762ec97baf3bb9c97863b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function Login() {
  const [role, setRole] = useState("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setMsg("");

    if (!email || !password) {
      setMsg("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (!snap.exists()) throw new Error("User role not found in database");

      if (snap.data().role !== role) throw new Error("Role mismatch");

      localStorage.setItem("role", role);

      if (role === "teacher") window.location.href = "/teacher";
      else window.location.href = "/profile";

    } catch (err: any) {
      setMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-box">
      <h2>Proxy-Resistant Smart Attendance System</h2>

      <div className="tabs">
        <button
          className={role === "teacher" ? "active" : ""}
          onClick={() => setRole("teacher")}
        >
          Teacher Login
        </button>

        <button
          className={role === "student" ? "active" : ""}
          onClick={() => setRole("student")}
        >
          Student Login
        </button>
      </div>

      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

      <button className="login-btn" onClick={login} disabled={loading}>
        {loading ? "Please wait..." : "Login"}
      </button>

      {loading && <div className="loading"><p>Logging in...</p></div>}

      <p>{msg}</p>
    </div>
  );
}