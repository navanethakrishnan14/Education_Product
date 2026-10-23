import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import SetPassword from "./SetPassword";

export default function App() {
  return <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/dashboard/*" element={sessionStorage.getItem("platform_token") ? <DashboardLayout /> : <LoginPage />} />
    <Route path="*" element={<LoginPage />} />
  </Routes>;
}
