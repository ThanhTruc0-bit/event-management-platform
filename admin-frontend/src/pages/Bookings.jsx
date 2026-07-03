import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    Plus,
    RefreshCw,
    Search,
    Eye,
    CheckCircle,
    Ban,
    Trash2,
    X,
} from "lucide-react";

function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [seats, setSeats] = useState([]);

    const [keyword, setKeyword] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [error, setError] = useState("");
    const [loadingSeats, setLoadingSeats] = useState(false);

    const [form, setForm] = useState({
        userId: "",
        eventId: "",
        seatIds: [],
    });

    useEffect(() => {
        loadBookings();
        loadUsers();
        loadEvents();
    }, []);

    useEffect(() => {
        if (form.eventId) {
            loadSeatsByEvent(form.eventId);
        } else {
            setSeats([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.eventId]);

    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            const text = Object.values(booking || {}).join(" ").toLowerCase();
            return text.includes(keyword.toLowerCase());
        });
    }, [bookings, keyword]);

    const loadBookings = async () => {
        try {
            setError("");
            const res = await axiosClient.get("/booking-service/bookings");
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setBookings([]);
            setError("Không tải được danh sách booking.");
        }
    };

    const loadUsers = async () => {
        try {
            const res = await axiosClient.get("/user-service/users");
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setUsers([]);
        }
    };

    const loadEvents = async () => {
        try {
            const res = await axiosClient.get("/event-service/events");
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setEvents([]);
        }
    };

    const loadSeatsByEvent = async (eventId) => {
        try {
            setLoadingSeats(true);
            const res = await axiosClient.get(`/seat-service/seats/event/${eventId}`);
            const list = Array.isArray(res.data) ? res.data : [];

            setSeats(list);
        } catch (err) {
            console.error(err);
            setSeats([]);
        } finally {
            setLoadingSeats(false);
        }
    };

    const getUserName = (userId) => {
        const user = users.find((u) => String(u.id) === String(userId));
        return user ? `${user.name || user.email}` : `User #${userId}`;
    };

    const getEventName = (eventId) => {
        const event = events.find((e) => String(e.id) === String(eventId));
        return event ? event.name : `Event #${eventId}`;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "eventId") {
            setForm({
                ...form,
                eventId: value,
                seatIds: [],
            });
            return;
        }

        setForm({
            ...form,
            [name]: value,
        });
    };

    const toggleSeat = (seatId) => {
        const id = Number(seatId);

        if (form.seatIds.includes(id)) {
            setForm({
                ...form,
                seatIds: form.seatIds.filter((item) => item !== id),
            });
        } else {
            setForm({
                ...form,
                seatIds: [...form.seatIds, id],
            });
        }
    };

    const resetForm = () => {
        setForm({
            userId: "",
            eventId: "",
            seatIds: [],
        });
        setSeats([]);
    };

    const createBooking = async (e) => {
        e.preventDefault();

        if (!form.userId) {
            alert("Vui lòng chọn user.");
            return;
        }

        if (!form.eventId) {
            alert("Vui lòng chọn event.");
            return;
        }

        if (form.seatIds.length === 0) {
            alert("Vui lòng chọn ít nhất 1 ghế.");
            return;
        }

        try {
            setError("");

            await axiosClient.post("/booking-service/bookings", {
                userId: Number(form.userId),
                eventId: Number(form.eventId),
                seatIds: form.seatIds,
            });

            alert("Tạo booking thành công");

            setShowCreate(false);
            resetForm();
            loadBookings();

            if (form.eventId) {
                loadSeatsByEvent(form.eventId);
            }
        } catch (err) {
            console.error(err);
            setError("Không tạo được booking. Kiểm tra User, Event, Seat hoặc booking-service.");
        }
    };

    const markPaid = async (id) => {
        if (!window.confirm("Xác nhận booking này đã thanh toán và tạo vé QR?")) {
            return;
        }

        try {
            setError("");

            await axiosClient.put(`/booking-service/bookings/${id}/status?status=PAID`);

            alert("Đã cập nhật booking thành PAID và tạo vé QR");
            loadBookings();
        } catch (err) {
            console.error(err);
            console.log("PAID error response:", err.response?.data);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.response?.data?.path ||
                "Không cập nhật được trạng thái PAID.";

            setError(message);
            alert(message);
        }
    };

    const cancelBooking = async (id) => {
        if (!window.confirm("Bạn có chắc muốn hủy booking này không?")) return;

        try {
            setError("");
            await axiosClient.put(`/booking-service/bookings/${id}/cancel`);
            alert("Đã hủy booking");
            loadBookings();
        } catch (err) {
            console.error(err);
            setError("Không hủy được booking.");
        }
    };

    const deleteBooking = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa booking này không?")) return;

        try {
            setError("");
            await axiosClient.delete(`/booking-service/bookings/${id}`);
            alert("Đã xóa booking");
            loadBookings();
        } catch (err) {
            console.error(err);
            setError("Không xóa được booking.");
        }
    };

    const getStatusClass = (status) => {
        if (status === "PAID") return "bg-green-100 text-green-700";
        if (status === "CANCELLED") return "bg-red-100 text-red-700";
        if (status === "EXPIRED") return "bg-slate-100 text-slate-700";
        return "bg-yellow-100 text-yellow-700";
    };

    const availableSeats = seats.filter((seat) => seat.status === "AVAILABLE");

    const selectedTotal = availableSeats
        .filter((seat) => form.seatIds.includes(Number(seat.id)))
        .reduce((sum, seat) => sum + Number(seat.price || 0), 0);

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <p className="text-sm text-blue-600 font-semibold">
                        Admin / Bookings
                    </p>

                    <h1 className="text-3xl font-bold text-slate-900 mt-1">
                        Booking Management
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Quản lý đặt vé: chọn user, event, ghế còn trống và tạo booking.
                    </p>
                </div>

                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
                >
                    <Plus size={18} />
                    Tạo booking
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-5 py-4">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b flex items-center justify-between gap-4">
                    <div className="w-96 flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-3">
                        <Search size={18} className="text-slate-400" />

                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm booking theo mã, user, event..."
                            className="bg-transparent outline-none text-sm flex-1"
                        />
                    </div>

                    <button
                        onClick={loadBookings}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-black"
                    >
                        <RefreshCw size={17} />
                        Reload
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 text-sm">
                            <tr>
                                <th className="px-5 py-4">ID</th>
                                <th className="px-5 py-4">Booking Code</th>
                                <th className="px-5 py-4">User</th>
                                <th className="px-5 py-4">Event</th>
                                <th className="px-5 py-4">Total Amount</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Booking Date</th>
                                <th className="px-5 py-4 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredBookings.map((booking) => (
                                <tr
                                    key={booking.id}
                                    className="border-t hover:bg-blue-50/30"
                                >
                                    <td className="px-5 py-4 text-sm">{booking.id}</td>

                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-900">
                                            {booking.bookingCode || `BOOKING-${booking.id}`}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Booking #{booking.id}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-sm">
                                        <div className="font-semibold text-slate-800">
                                            {getUserName(booking.userId)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            User ID: {booking.userId}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-sm">
                                        <div className="font-semibold text-slate-800">
                                            {getEventName(booking.eventId)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Event ID: {booking.eventId}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 font-semibold">
                                        {Number(booking.totalAmount || 0).toLocaleString()} đ
                                    </td>

                                    <td className="px-5 py-4">
                                        <span
                                            className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusClass(
                                                booking.status
                                            )}`}
                                        >
                                            {booking.status || "PENDING"}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {booking.bookingDate
                                            ? String(booking.bookingDate).replace("T", " ")
                                            : "NULL"}
                                    </td>

                                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                                        <Link
                                            to={`/bookings/${booking.id}`}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-black"
                                        >
                                            <Eye size={15} />
                                            Chi tiết
                                        </Link>

                                        {booking.status === "PENDING" && (
                                            <button
                                                onClick={() => markPaid(booking.id)}
                                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                            >
                                                <CheckCircle size={15} />
                                                PAID
                                            </button>
                                        )}

                                        <button
                                            onClick={() => cancelBooking(booking.id)}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                                        >
                                            <Ban size={15} />
                                            Hủy
                                        </button>

                                        <button
                                            onClick={() => deleteBooking(booking.id)}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                                        >
                                            <Trash2 size={15} />
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {filteredBookings.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-5 py-10 text-center text-slate-500"
                                    >
                                        Không có booking nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <form
                        onSubmit={createBooking}
                        className="bg-white w-220 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-blue-600 font-semibold">
                                    Create Booking
                                </p>

                                <h2 className="text-2xl font-bold text-slate-900">
                                    Tạo booking mới
                                </h2>

                                <p className="text-sm text-slate-500 mt-1">
                                    Chọn user, sự kiện và ghế còn trống để tạo booking.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreate(false);
                                    resetForm();
                                }}
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    User
                                </label>

                                <select
                                    name="userId"
                                    value={form.userId}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Chọn user</option>

                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            #{user.id} - {user.name || user.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Event
                                </label>

                                <select
                                    name="eventId"
                                    value={form.eventId}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Chọn event</option>

                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            #{event.id} - {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">
                                        Ghế còn trống
                                    </label>

                                    <p className="text-xs text-slate-500 mt-1">
                                        Chỉ hiển thị ghế có trạng thái AVAILABLE.
                                    </p>
                                </div>

                                {form.seatIds.length > 0 && (
                                    <div className="text-sm font-bold text-blue-600">
                                        Đã chọn {form.seatIds.length} ghế ·{" "}
                                        {selectedTotal.toLocaleString()} đ
                                    </div>
                                )}
                            </div>

                            {!form.eventId ? (
                                <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-8 text-center text-slate-500">
                                    Hãy chọn event trước để tải danh sách ghế.
                                </div>
                            ) : loadingSeats ? (
                                <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-8 text-center text-slate-500">
                                    Đang tải ghế...
                                </div>
                            ) : availableSeats.length === 0 ? (
                                <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-8 text-center text-slate-500">
                                    Event này chưa có ghế AVAILABLE. Hãy qua trang Seats tạo ghế trước.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto pr-2">
                                    {availableSeats.map((seat) => {
                                        const selected = form.seatIds.includes(Number(seat.id));

                                        return (
                                            <button
                                                type="button"
                                                key={seat.id}
                                                onClick={() => toggleSeat(seat.id)}
                                                className={`rounded-2xl border px-4 py-3 text-left transition ${selected
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50"
                                                    }`}
                                            >
                                                <div className="font-bold">
                                                    {seat.seatNumber}
                                                </div>

                                                <div
                                                    className={`text-xs mt-1 ${selected
                                                        ? "text-blue-100"
                                                        : "text-slate-500"
                                                        }`}
                                                >
                                                    {seat.seatType || "STANDARD"}
                                                </div>

                                                <div
                                                    className={`text-xs mt-1 font-semibold ${selected
                                                        ? "text-white"
                                                        : "text-blue-600"
                                                        }`}
                                                >
                                                    {Number(seat.price || 0).toLocaleString()} đ
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreate(false);
                                    resetForm();
                                }}
                                className="px-5 py-3 rounded-xl border hover:bg-slate-100"
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                Tạo booking
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Bookings;