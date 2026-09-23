import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Customers from "./pages/Customers.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Manager from "./pages/Manager.jsx";
import KnowledgeBase from "./pages/KnowledgeBase.jsx";
import TicketCreate from "./pages/TicketCreate.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import Tickets from "./pages/Tickets.jsx";

function roleFromToken() {
  try {
    return JSON.parse(atob(localStorage.getItem("token").split(".")[1])).role;
  } catch {
    return null;
  }
}

function homeFor(role) {
  return role === "technician" || role === "customer" ? "/tickets" : "/dashboard";
}

function Guard({ children, roles }) {
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  const role = roleFromToken();
  if (roles && !roles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/admin" element={<Guard roles={["admin"]}><Admin /></Guard>} />
        <Route path="/manager" element={<Guard roles={["manager"]}><Manager /></Guard>} />
        <Route path="/knowledge-base" element={<Guard><KnowledgeBase /></Guard>} />
        <Route path="/customers" element={<Guard roles={["admin", "manager"]}><Customers /></Guard>} />
        <Route path="/customers/:id" element={<Guard><CustomerDetail /></Guard>} />
        <Route path="/tickets" element={<Guard><Tickets /></Guard>} />
        <Route path="/tickets/new" element={<Guard roles={["admin", "manager", "customer"]}><TicketCreate /></Guard>} />
        <Route path="/tickets/:id" element={<Guard><TicketDetail /></Guard>} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
