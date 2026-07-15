import { Route, Routes } from "react-router-dom";
import UserLayout from "./components/UserLayout";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";
import MyTickets from "./pages/MyTickets";
import PaymentResult from "./pages/PaymentResult";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import Notifications from "./pages/Notifications";
function App() {
  return (
    <UserLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout/:eventId" element={<Checkout />} />
        <Route
          path="/notifications"
          element={<Notifications />}
        />
      </Routes>
    </UserLayout>
  );
}

export default App;