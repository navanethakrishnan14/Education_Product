import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import SetPassword from "./SetPassword";

function RequirePlatformAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = sessionStorage.getItem("platform_token");

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const token = sessionStorage.getItem("platform_token");
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route path="/set-password" element={<SetPassword />} />
      <Route
        path="/dashboard/*"
        element={
          <RequirePlatformAuth>
            <DashboardLayout />
          </RequirePlatformAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
