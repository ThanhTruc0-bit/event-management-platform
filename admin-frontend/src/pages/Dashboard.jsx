import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    Users,
    CalendarDays,
    Armchair,
    ReceiptText,
    CreditCard,
    Bell,
    TrendingUp,
    RefreshCw,
} from "lucide-react";

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function Dashboard() {
    const [data, setData] = useState({
        users: [],
        events: [],
        seats: [],
        bookings: [],
        payments: [],
        notifications: [],
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const getSettledData = (result) => {
        if (result.status === "fulfilled") {
            return normalizeList(result.value.data);
        }

        return [];
    };

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                usersRes,
                eventsRes,
                seatsRes,
                bookingsRes,
                paymentsRes,
                notificationsRes,
            ] = await Promise.allSettled([
                axiosClient.get("/user-service/users"),
                axiosClient.get("/event-service/events"),
                axiosClient.get("/seat-service/seats"),
                axiosClient.get("/booking-service/bookings"),
                axiosClient.get("/payment-service/payments"),
                axiosClient.get("/notification-service/notifications"),
            ]);

            const users = getSettledData(usersRes);
            const events = getSettledData(eventsRes);
            const seats = getSettledData(seatsRes);
            const bookings = getSettledData(bookingsRes);
            const payments = getSettledData(paymentsRes);
            const notifications = getSettledData(notificationsRes);

            setData({
                users,
                events,
                seats,
                bookings,
                payments,
                notifications,
            });

            const failedServices = [];

            if (usersRes.status === "rejected") failedServices.push("user-service");
            if (eventsRes.status === "rejected") failedServices.push("event-service");
            if (seatsRes.status === "rejected") failedServices.push("seat-service");
            if (bookingsRes.status === "rejected") failedServices.push("booking-service");
            if (paymentsRes.status === "rejected") failedServices.push("payment-service");
            if (notificationsRes.status === "rejected") {
                failedServices.push("notification-service");
            }

            if (failedServices.length > 0) {
                setError(
                    `Một số service chưa tải được: ${failedServices.join(", ")}. Các dữ liệu còn lại vẫn hiển thị bình thường.`
                );
            }
        } catch (err) {
            console.error(err);
            setError("Không tải được Dashboard. Kiểm tra Gateway hoặc service.");
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = useMemo(() => {
        return data.payments
            .filter((p) => p.status === "SUCCESS")
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    }, [data.payments]);

    const bookedSeats = data.seats.filter((s) => s.status === "BOOKED").length;
    const reservedSeats = data.seats.filter((s) => s.status === "RESERVED").length;
    const availableSeats = data.seats.filter((s) => s.status === "AVAILABLE").length;

    const paidBookings = data.bookings.filter((b) => b.status === "PAID").length;
    const pendingBookings = data.bookings.filter((b) => b.status === "PENDING").length;
    const cancelledBookings = data.bookings.filter(
        (b) => b.status === "CANCELLED"
    ).length;

    const successfulPayments = data.payments.filter(
        (p) => p.status === "SUCCESS"
    ).length;

    const pendingPayments = data.payments.filter(
        (p) => p.status === "PENDING"
    ).length;

    const unreadNotifications = data.notifications.filter(
        (n) => n.isRead === false
    ).length;

    const stats = [
        {
            title: "Total Users",
            value: data.users.length,
            icon: Users,
            sub: "Người dùng hệ thống",
        },
        {
            title: "Active Events",
            value: data.events.length,
            icon: CalendarDays,
            sub: "Sự kiện đang quản lý",
        },
        {
            title: "Total Seats",
            value: data.seats.length,
            icon: Armchair,
            sub: `${availableSeats} available / ${reservedSeats} reserved / ${bookedSeats} booked`,
        },
        {
            title: "Bookings",
            value: data.bookings.length,
            icon: ReceiptText,
            sub: `${pendingBookings} pending / ${paidBookings} paid / ${cancelledBookings} cancelled`,
        },
        {
            title: "Payments",
            value: data.payments.length,
            icon: CreditCard,
            sub: `${successfulPayments} success / ${pendingPayments} pending`,
        },
        {
            title: "Notifications",
            value: data.notifications.length,
            icon: Bell,
            sub: `${unreadNotifications} unread notifications`,
        },
    ];

    const recentBookings = [...data.bookings].slice(-5).reverse();
    const recentEvents = [...data.events].slice(-4).reverse();

    const recentNotifications = [...data.notifications]
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        })
        .slice(0, 5);

    const formatMoney = (value) => {
        return `${Number(value || 0).toLocaleString()} đ`;
    };

    const formatDate = (value) => {
        if (!value) return "NULL";
        return String(value).replace("T", " ");
    };

    const getBookingStatusClass = (status) => {
        if (status === "PAID") return "bg-green-100 text-green-700";
        if (status === "CANCELLED") return "bg-red-100 text-red-700";
        if (status === "EXPIRED") return "bg-slate-100 text-slate-700";
        return "bg-yellow-100 text-yellow-700";
    };

    const getNotificationTypeClass = (type) => {
        if (type === "BOOKING_CREATED") return "bg-blue-100 text-blue-700";
        if (type === "PAYMENT_SUCCESS") return "bg-green-100 text-green-700";
        if (type === "TICKET_ISSUED") return "bg-purple-100 text-purple-700";
        if (type === "BOOKING_CANCELLED") return "bg-red-100 text-red-700";
        return "bg-slate-100 text-slate-700";
    };

    return (
        <div className="space-y-8">
            <section className="rounded-4xl bg-slate-950 text-white overflow-hidden">
                <div className="grid grid-cols-12">
                    <div className="col-span-7 p-9">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-sm font-semibold mb-5">
                            <TrendingUp size={16} />
                            Ticket Management Dashboard
                        </div>

                        <h1 className="text-4xl font-bold leading-tight">
                            Quản lý hệ thống đặt vé Microservices
                        </h1>

                        <p className="text-slate-300 mt-4 max-w-2xl">
                            Theo dõi sự kiện, ghế, booking, thanh toán, vé QR và thông báo
                            trên một giao diện quản trị tập trung.
                        </p>

                        <div className="mt-7 flex gap-3">
                            <button
                                onClick={loadDashboard}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={18}
                                    className={loading ? "animate-spin" : ""}
                                />
                                {loading ? "Loading..." : "Reload data"}
                            </button>

                            <Link
                                to="/events"
                                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
                            >
                                Manage events
                            </Link>
                        </div>
                    </div>

                    <div className="col-span-5 bg-linear-to-br from-blue-600 to-cyan-400 p-9 flex items-end">
                        <div className="bg-white/15 backdrop-blur rounded-3xl p-6 w-full border border-white/20">
                            <div className="text-sm text-blue-50">
                                Successful Revenue
                            </div>

                            <div className="text-4xl font-bold mt-2">
                                {totalRevenue.toLocaleString()} đ
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-3">
                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">Available</div>
                                    <div className="text-2xl font-bold">{availableSeats}</div>
                                </div>

                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">Reserved</div>
                                    <div className="text-2xl font-bold">{reservedSeats}</div>
                                </div>

                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">Booked</div>
                                    <div className="text-2xl font-bold">{bookedSeats}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 text-yellow-700 px-5 py-4">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-3 gap-6">
                {stats.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.title}
                            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        {item.title}
                                    </p>

                                    <h3 className="text-4xl font-bold text-slate-900 mt-3">
                                        {item.value}
                                    </h3>
                                </div>

                                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Icon size={24} />
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 mt-5">{item.sub}</p>
                        </div>
                    );
                })}
            </section>

            <section className="grid grid-cols-12 gap-6">
                <div className="col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Recent Bookings
                            </h2>

                            <p className="text-sm text-slate-500 mt-1">
                                Những booking mới nhất trong hệ thống
                            </p>
                        </div>

                        <Link
                            to="/bookings"
                            className="text-sm font-semibold text-blue-600"
                        >
                            View all
                        </Link>
                    </div>

                    <div className="divide-y">
                        {recentBookings.length === 0 ? (
                            <div className="p-6 text-slate-500">Chưa có booking.</div>
                        ) : (
                            recentBookings.map((booking) => (
                                <Link
                                    to={`/bookings/${booking.id}`}
                                    key={booking.id}
                                    className="p-5 flex items-center justify-between hover:bg-slate-50"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            {booking.bookingCode || `BOOKING-${booking.id}`}
                                        </div>

                                        <div className="text-sm text-slate-500 mt-1">
                                            User #{booking.userId} · Event #{booking.eventId}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-bold text-slate-900">
                                            {formatMoney(booking.totalAmount)}
                                        </div>

                                        <span
                                            className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getBookingStatusClass(
                                                booking.status
                                            )}`}
                                        >
                                            {booking.status || "PENDING"}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Recent Notifications
                            </h2>

                            <p className="text-sm text-slate-500 mt-1">
                                Thông báo mới nhất từ notification-service
                            </p>
                        </div>

                        <Link
                            to="/notifications"
                            className="text-sm font-semibold text-blue-600"
                        >
                            View all
                        </Link>
                    </div>

                    <div className="divide-y">
                        {recentNotifications.length === 0 ? (
                            <div className="p-6 text-slate-500">
                                Chưa có notification.
                            </div>
                        ) : (
                            recentNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className="p-5 hover:bg-slate-50"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={`text-xs px-3 py-1 rounded-full font-bold ${getNotificationTypeClass(
                                                notification.type
                                            )}`}
                                        >
                                            {notification.type || "SYSTEM"}
                                        </span>

                                        <span
                                            className={`text-xs px-3 py-1 rounded-full font-bold ${notification.isRead
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {notification.isRead ? "READ" : "UNREAD"}
                                        </span>
                                    </div>

                                    <div className="font-semibold text-slate-900 mt-3">
                                        {notification.title || "Notification"}
                                    </div>

                                    <div className="text-sm text-slate-500 mt-1 line-clamp-2">
                                        {notification.message}
                                    </div>

                                    <div className="text-xs text-slate-400 mt-2">
                                        Booking #{notification.bookingId || "NULL"} ·{" "}
                                        {formatDate(notification.createdAt)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-900">
                        Featured Events
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                        Sự kiện gần đây
                    </p>
                </div>

                <div className="p-5 grid grid-cols-4 gap-4">
                    {recentEvents.length === 0 ? (
                        <div className="col-span-4 text-slate-500">
                            Chưa có event.
                        </div>
                    ) : (
                        recentEvents.map((event) => (
                            <Link
                                to="/events"
                                key={event.id}
                                className="rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition"
                            >
                                <div className="h-24 rounded-2xl bg-linear-to-br from-blue-600 to-cyan-400 mb-4 overflow-hidden">
                                    {event.banner && (
                                        <img
                                            src={event.banner}
                                            alt={event.name}
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                </div>

                                <div className="font-semibold text-slate-900 line-clamp-1">
                                    {event.name}
                                </div>

                                <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                                    {event.location}
                                </div>

                                <div className="text-xs font-bold text-blue-600 mt-2">
                                    {event.status || "ACTIVE"}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

export default Dashboard;