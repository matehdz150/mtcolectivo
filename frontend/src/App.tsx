// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import PricesPage from "./pages/Prices";
import OrderEditPage from "./pages/EditorPage";
import OrderCreatePage from "./pages/NewOrder";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/order/:id" element={<OrderEditPage />} />
            <Route path="/NewOrder" element={<OrderCreatePage/>}/>
          </Route>

          <Route path="*" element={<h2>Página no encontrada</h2>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}