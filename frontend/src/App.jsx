import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ClassScheduler from "./ClassScheduler";
import ScheduleList from "./pages/ScheduleList";
import Navbar from "./components/Navbar";

function ProtectedRoute({ children }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/" />;
  return (
    <div style={{ display: "flex" }}>
      <Navbar />
      <div style={{ marginLeft: 220, flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/scheduler" element={
          <ProtectedRoute>
            <ClassScheduler />
          </ProtectedRoute>
        } />
        <Route path="/schedules" element={
          <ProtectedRoute>
            <ScheduleList />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;