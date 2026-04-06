import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import ClassScheduler from "./ClassScheduler";
import ScheduleList from "./pages/ScheduleList";
import UserManagement from "./pages/UserManagement";
import ManageRecords from "./pages/ManageRecords";
import Navbar from "./components/Navbar";

function ProtectedRoute({ children, theme, toggleTheme }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/" />;
  return (
    <div style={{ display: "flex" }}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div style={{ marginLeft: 220, flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login theme={theme} />} />
        <Route path="/scheduler" element={
          <ProtectedRoute theme={theme} toggleTheme={toggleTheme}>
            <ClassScheduler theme={theme} />
          </ProtectedRoute>
        } />
        <Route path="/schedules" element={
          <ProtectedRoute theme={theme} toggleTheme={toggleTheme}>
            <ScheduleList key={Date.now()} theme={theme} />
          </ProtectedRoute>
        } />
        <Route path="/records" element={
          <ProtectedRoute theme={theme} toggleTheme={toggleTheme}>
            <ManageRecords theme={theme} />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute theme={theme} toggleTheme={toggleTheme}>
            <UserManagement theme={theme} />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
