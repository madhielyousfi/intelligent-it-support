import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Customers from "./pages/Customers.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import TicketCreate from "./pages/TicketCreate.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import Tickets from "./pages/Tickets.jsx";

function Guard({ children }) {
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function TechnicianGuard({ children }) {
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/customers" element={<Guard><Customers /></Guard>} />
        <Route path="/customers/:id" element={<Guard><CustomerDetail /></Guard>} />
        <Route path="/tickets" element={<TechnicianGuard><Tickets /></TechnicianGuard>} />
        <Route path="/tickets/new" element={<Guard><TicketCreate /></Guard>} />
        <Route path="/tickets/:id" element={<TechnicianGuard><TicketDetail /></TechnicianGuard>} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
