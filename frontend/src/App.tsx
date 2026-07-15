import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/teacher/Dashboard";
import Reports from "./pages/teacher/Reports";
import ScanQR from "./pages/student/ScanQR";
import Profile from "./pages/student/Profile";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import StudentAttendance from "./pages/student/StudentAttendance";

/* 🔐 Route Protection */
const PrivateRoute = ({ children, role }: any) => {
  const userRole = localStorage.getItem("role");

  if (!userRole) return <Navigate to="/" />;
  if (role && userRole !== role) return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* Teacher */}
        <Route
          path="/teacher"
          element={
            <PrivateRoute role="teacher">
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/teacher/attendance"
          element={
            <PrivateRoute role="teacher">
              <TeacherAttendance />
            </PrivateRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <PrivateRoute role="teacher">
              <Reports />
            </PrivateRoute>
          }
        />

        {/* Student */}
        <Route
          path="/profile"
          element={
            <PrivateRoute role="student">
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/scan"
          element={
            <PrivateRoute role="student">
              <ScanQR />
            </PrivateRoute>
          }
        />

        <Route
          path="/student-attendance"
          element={<StudentAttendance />}
        />

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;