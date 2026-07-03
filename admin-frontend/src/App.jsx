import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Events from "./pages/Events";
import Seats from "./pages/Seats";
import Tickets from "./pages/Tickets";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import BookingItems from "./pages/BookingItems";
import Payments from "./pages/Payments";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Forbidden from "./pages/Forbidden";
import EventCategories from "./pages/EventCategories";
function AdminPage({ children }) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<Forbidden />} />

        {/* ADMIN ROUTES */}
        <Route
          path="/"
          element={
            <AdminPage>
              <Dashboard />
            </AdminPage>
          }
        />

        <Route
          path="/users"
          element={
            <AdminPage>
              <Users />
            </AdminPage>
          }
        />

        <Route
          path="/events"
          element={
            <AdminPage>
              <Events />
            </AdminPage>
          }
          
        />
        <Route
          path="/event-categories"
          element={
            <AdminPage>
              <EventCategories />
            </AdminPage>
          }
        />

        <Route
          path="/seats"
          element={
            <AdminPage>
              <Seats />
            </AdminPage>
          }
        />

        <Route
          path="/tickets"
          element={
            <AdminPage>
              <Tickets />
            </AdminPage>
          }
        />

        <Route
          path="/bookings"
          element={
            <AdminPage>
              <Bookings />
            </AdminPage>
          }
        />

        <Route
          path="/bookings/:id"
          element={
            <AdminPage>
              <BookingDetail />
            </AdminPage>
          }
        />

        <Route
          path="/booking-items"
          element={
            <AdminPage>
              <BookingItems />
            </AdminPage>
          }
        />

        <Route
          path="/payments"
          element={
            <AdminPage>
              <Payments />
            </AdminPage>
          }
        />

        <Route
          path="/notifications"
          element={
            <AdminPage>
              <Notifications />
            </AdminPage>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;