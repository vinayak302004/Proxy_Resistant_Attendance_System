import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/teacher/Dashboard";
import Reports from "./pages/teacher/Reports";
import ScanQR from "./pages/student/ScanQR";
import Profile from "./pages/student/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Teacher */}
        <Route path="/teacher" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />

        {/* Student */}
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;