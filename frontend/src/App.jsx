import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import UploadPage from "./pages/UploadPage";
import SharesPage from "./pages/SharesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SharePage from "./pages/SharePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/files"     element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
          <Route path="/upload"    element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/shares"    element={<ProtectedRoute><SharesPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}