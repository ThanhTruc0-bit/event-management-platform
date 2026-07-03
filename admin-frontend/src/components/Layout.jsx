import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import axiosClient from "../api/axiosClient";
import {
    Search,
    Bell,
    UserRound,
    CheckCircle,
    RefreshCw,
    CalendarDays,
    ReceiptText,
    Users,
    CreditCard,
    MessageCircle,
} from "lucide-react";

function Layout({ children }) {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searching, setSearching] = useState(false);

    const userRaw = localStorage.getItem("user");

    let currentUser = null;

    try {
        currentUser = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        currentUser = null;
    }

    const adminName =
        currentUser?.name ||
        currentUser?.email ||
        currentUser?.role ||
        "Admin";

    useEffect(() => {
        loadNotifications();

        const interval = setInterval(() => {
            loadNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const keyword = searchText.trim();

        if (keyword.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const timer = setTimeout(() => {
            handleSearch(keyword);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchText]);

    const loadNotifications = async () => {
        try {
            setLoadingNotifications(true);

            const res = await axiosClient.get("/notification-service/notifications");
            const list = Array.isArray(res.data) ? res.data : [];

            const sorted = [...list].sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();

                return dateB - dateA;
            });

            setNotifications(sorted);
        } catch (err) {
            console.error(err);
            setNotifications([]);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
    };

    const getSettledList = (result) => {
        if (result.status === "fulfilled") {
            return normalizeList(result.value.data);
        }

        return [];
    };

    const handleSearch = async (keyword) => {
        try {
            setSearching(true);

            const lowerKeyword = keyword.toLowerCase();

            const [eventsRes, bookingsRes, usersRes, paymentsRes, notificationsRes] =
                await Promise.allSettled([
                    axiosClient.get("/event-service/events"),
                    axiosClient.get("/booking-service/bookings"),
                    axiosClient.get("/user-service/users"),
                    axiosClient.get("/payment-service/payments"),
                    axiosClient.get("/notification-service/notifications"),
                ]);

            const events = getSettledList(eventsRes);
            const bookings = getSettledList(bookingsRes);
            const users = getSettledList(usersRes);
            const payments = getSettledList(paymentsRes);
            const notificationList = getSettledList(notificationsRes);

            const eventResults = events
                .filter((event) => {
                    return [
                        event.id,
                        event.name,
                        event.location,
                        event.category,
                        event.status,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(lowerKeyword);
                })
                .slice(0, 5)
                .map((event) => ({
                    id: `event-${event.id}`,
                    type: "EVENT",
                    title: event.name || `Event #${event.id}`,
                    subtitle: `${event.location || "No location"} · ${event.status || "ACTIVE"}`,
                    path: "/events",
                    icon: CalendarDays,
                }));

            const bookingResults = bookings
                .filter((booking) => {
                    return [
                        booking.id,
                        booking.bookingCode,
                        booking.userId,
                        booking.eventId,
                        booking.status,
                        booking.totalAmount,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(lowerKeyword);
                })
                .slice(0, 5)
                .map((booking) => ({
                    id: `booking-${booking.id}`,
                    type: "BOOKING",
                    title: booking.bookingCode || `Booking #${booking.id}`,
                    subtitle: `User #${booking.userId} · Event #${booking.eventId} · ${booking.status}`,
                    path: `/bookings/${booking.id}`,
                    icon: ReceiptText,
                }));

            const userResults = users
                .filter((user) => {
                    return [user.id, user.name, user.email, user.phone, user.role]
                        .join(" ")
                        .toLowerCase()
                        .includes(lowerKeyword);
                })
                .slice(0, 5)
                .map((user) => ({
                    id: `user-${user.id}`,
                    type: "USER",
                    title: user.name || user.email || `User #${user.id}`,
                    subtitle: `${user.email || "No email"} · ${user.role || "USER"}`,
                    path: "/users",
                    icon: Users,
                }));

            const paymentResults = payments
                .filter((payment) => {
                    return [
                        payment.id,
                        payment.bookingId,
                        payment.paymentMethod,
                        payment.status,
                        payment.amount,
                        payment.transactionCode,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(lowerKeyword);
                })
                .slice(0, 5)
                .map((payment) => ({
                    id: `payment-${payment.id}`,
                    type: "PAYMENT",
                    title: `Payment #${payment.id}`,
                    subtitle: `Booking #${payment.bookingId} · ${payment.paymentMethod} · ${payment.status}`,
                    path: "/payments",
                    icon: CreditCard,
                }));

            const notificationResults = notificationList
                .filter((notification) => {
                    return [
                        notification.id,
                        notification.bookingId,
                        notification.title,
                        notification.message,
                        notification.type,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(lowerKeyword);
                })
                .slice(0, 5)
                .map((notification) => ({
                    id: `notification-${notification.id}`,
                    type: "NOTIFICATION",
                    title: notification.title || `Notification #${notification.id}`,
                    subtitle: `Booking #${notification.bookingId || "NULL"} · ${notification.type || "SYSTEM"}`,
                    path: "/notifications",
                    icon: MessageCircle,
                }));

            const results = [
                ...eventResults,
                ...bookingResults,
                ...userResults,
                ...paymentResults,
                ...notificationResults,
            ].slice(0, 12);

            setSearchResults(results);
            setShowSearchResults(true);
        } catch (err) {
            console.error(err);
            setSearchResults([]);
            setShowSearchResults(true);
        } finally {
            setSearching(false);
        }
    };

    const goToSearchResult = (result) => {
        setSearchText("");
        setSearchResults([]);
        setShowSearchResults(false);
        navigate(result.path);
    };

    const unreadCount = useMemo(() => {
        return notifications.filter((notification) => notification.isRead === false)
            .length;
    }, [notifications]);

    const recentNotifications = useMemo(() => {
        return notifications.slice(0, 6);
    }, [notifications]);

    const markAsRead = async (notificationId) => {
        try {
            await axiosClient.put(
                `/notification-service/notifications/${notificationId}/read`
            );

            loadNotifications();
        } catch (err) {
            console.error(err);
            alert("Không đánh dấu đã đọc được.");
        }
    };

    const markAllAsRead = async () => {
        const unreadNotifications = notifications.filter(
            (notification) => notification.isRead === false
        );

        if (unreadNotifications.length === 0) return;

        try {
            await Promise.all(
                unreadNotifications.map((notification) =>
                    axiosClient.put(
                        `/notification-service/notifications/${notification.id}/read`
                    )
                )
            );

            loadNotifications();
        } catch (err) {
            console.error(err);
            alert("Không đánh dấu tất cả đã đọc được.");
        }
    };

    const formatDate = (value) => {
        if (!value) return "NULL";
        return String(value).replace("T", " ");
    };

    const getNotificationTypeClass = (type) => {
        if (type === "BOOKING_CREATED") return "bg-blue-100 text-blue-700";
        if (type === "PAYMENT_SUCCESS") return "bg-green-100 text-green-700";
        if (type === "TICKET_ISSUED") return "bg-purple-100 text-purple-700";
        if (type === "BOOKING_CANCELLED") return "bg-red-100 text-red-700";
        return "bg-slate-100 text-slate-700";
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <Sidebar />

            <main className="ml-72 min-h-screen">
                <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="h-20 px-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">
                                Event Management Platform
                            </h1>

                            <p className="text-sm text-slate-500">
                                Quản lý bán vé, booking, thanh toán, vé QR và thông báo
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative hidden lg:block">
                                <div className="flex items-center gap-3 bg-slate-100 rounded-full px-4 py-2 w-90">
                                    <Search size={18} className="text-slate-400" />

                                    <input
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        onFocus={() => {
                                            if (searchResults.length > 0) {
                                                setShowSearchResults(true);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && searchResults[0]) {
                                                goToSearchResult(searchResults[0]);
                                            }
                                        }}
                                        placeholder="Search events, bookings, users..."
                                        className="bg-transparent outline-none text-sm flex-1"
                                    />

                                    {searching && (
                                        <RefreshCw
                                            size={16}
                                            className="text-slate-400 animate-spin"
                                        />
                                    )}
                                </div>

                                {showSearchResults && searchText.trim().length >= 2 && (
                                    <div className="absolute right-0 mt-3 w-110 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                                        <div className="px-5 py-4 border-b">
                                            <h3 className="font-bold text-slate-900">
                                                Search Results
                                            </h3>

                                            <p className="text-xs text-slate-500 mt-1">
                                                Từ khóa: {searchText}
                                            </p>
                                        </div>

                                        <div className="max-h-105 overflow-y-auto">
                                            {searchResults.length === 0 ? (
                                                <div className="px-5 py-8 text-center text-sm text-slate-500">
                                                    Không tìm thấy kết quả phù hợp.
                                                </div>
                                            ) : (
                                                searchResults.map((result) => {
                                                    const Icon = result.icon;

                                                    return (
                                                        <button
                                                            key={result.id}
                                                            type="button"
                                                            onClick={() =>
                                                                goToSearchResult(result)
                                                            }
                                                            className="w-full px-5 py-4 border-b last:border-b-0 hover:bg-slate-50 text-left flex items-start gap-3"
                                                        >
                                                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                                <Icon size={19} />
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">
                                                                        {result.type}
                                                                    </span>
                                                                </div>

                                                                <div className="font-semibold text-slate-900 mt-2 line-clamp-1">
                                                                    {result.title}
                                                                </div>

                                                                <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                                                                    {result.subtitle}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>

                                        <div className="px-5 py-3 bg-slate-50 text-xs text-slate-500">
                                            Bấm kết quả để chuyển trang. Enter chọn kết quả đầu tiên.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setShowNotifications(!showNotifications)
                                    }
                                    className="relative h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                                >
                                    <Bell size={20} />

                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute right-0 mt-3 w-105 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                                        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-slate-900">
                                                    Notifications
                                                </h3>

                                                <p className="text-xs text-slate-500 mt-1">
                                                    {unreadCount} thông báo chưa đọc
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={loadNotifications}
                                                    disabled={loadingNotifications}
                                                    className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-60"
                                                >
                                                    <RefreshCw
                                                        size={16}
                                                        className={
                                                            loadingNotifications
                                                                ? "animate-spin"
                                                                : ""
                                                        }
                                                    />
                                                </button>

                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                                    >
                                                        Đọc tất cả
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="max-h-115 overflow-y-auto">
                                            {recentNotifications.length === 0 ? (
                                                <div className="px-5 py-8 text-center text-sm text-slate-500">
                                                    Chưa có thông báo.
                                                </div>
                                            ) : (
                                                recentNotifications.map(
                                                    (notification) => (
                                                        <div
                                                            key={notification.id}
                                                            className={`px-5 py-4 border-b last:border-b-0 hover:bg-slate-50 ${!notification.isRead
                                                                ? "bg-blue-50/50"
                                                                : "bg-white"
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span
                                                                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${getNotificationTypeClass(
                                                                                notification.type
                                                                            )}`}
                                                                        >
                                                                            {notification.type ||
                                                                                "SYSTEM"}
                                                                        </span>

                                                                        {!notification.isRead && (
                                                                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-100 text-yellow-700">
                                                                                UNREAD
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="font-semibold text-slate-900 mt-2 line-clamp-1">
                                                                        {notification.title ||
                                                                            "Notification"}
                                                                    </div>

                                                                    <div className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                                        {
                                                                            notification.message
                                                                        }
                                                                    </div>

                                                                    <div className="text-xs text-slate-400 mt-2">
                                                                        Booking #
                                                                        {notification.bookingId ||
                                                                            "NULL"}{" "}
                                                                        ·{" "}
                                                                        {formatDate(
                                                                            notification.createdAt
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {!notification.isRead && (
                                                                    <button
                                                                        onClick={() =>
                                                                            markAsRead(
                                                                                notification.id
                                                                            )
                                                                        }
                                                                        className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 shrink-0"
                                                                    >
                                                                        <CheckCircle
                                                                            size={16}
                                                                        />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )
                                            )}
                                        </div>

                                        <div className="px-5 py-4 bg-slate-50">
                                            <Link
                                                to="/notifications"
                                                onClick={() =>
                                                    setShowNotifications(false)
                                                }
                                                className="block w-full text-center px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black"
                                            >
                                                Xem tất cả thông báo
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-slate-900 max-w-40 truncate">
                                        {adminName}
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        localhost:5173
                                    </div>
                                </div>

                                <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                    <UserRound size={21} />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}

export default Layout;