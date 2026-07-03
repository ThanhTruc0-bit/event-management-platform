import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    ArrowLeft,
    RefreshCw,
    ReceiptText,
    User,
    CalendarDays,
    Armchair,
    CreditCard,
    Bell,
    CheckCircle,
    Ban,
    Trash2,
    Hash,
    Wallet,
    QrCode,
    X,
    RotateCcw,
} from "lucide-react";

function BookingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [detail, setDetail] = useState(null);
    const [bookingItems, setBookingItems] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [seatDetails, setSeatDetails] = useState([]);
    const [userDetail, setUserDetail] = useState(null);
    const [eventDetail, setEventDetail] = useState(null);
    const [paymentDetail, setPaymentDetail] = useState(null);
    const [notificationList, setNotificationList] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const booking = useMemo(() => {
        if (!detail) return null;

        return (
            detail.booking ||
            detail.bookingDTO ||
            detail.data?.booking ||
            detail.data ||
            detail
        );
    }, [detail]);

    const user = useMemo(() => {
        return (
            detail?.user ||
            detail?.userDTO ||
            detail?.data?.user ||
            userDetail ||
            null
        );
    }, [detail, userDetail]);

    const event = useMemo(() => {
        return (
            detail?.event ||
            detail?.eventDTO ||
            detail?.data?.event ||
            eventDetail ||
            null
        );
    }, [detail, eventDetail]);

    const payment = useMemo(() => {
        return (
            detail?.payment ||
            detail?.paymentDTO ||
            detail?.data?.payment ||
            paymentDetail ||
            null
        );
    }, [detail, paymentDetail]);

    const notifications = useMemo(() => {
        const value =
            detail?.notifications ||
            detail?.notificationList ||
            detail?.data?.notifications;

        if (Array.isArray(value)) return value;

        return notificationList;
    }, [detail, notificationList]);

    const items = useMemo(() => {
        const value =
            detail?.bookingItems ||
            detail?.items ||
            detail?.bookingItemList ||
            detail?.data?.bookingItems;

        if (Array.isArray(value)) return value;

        return bookingItems;
    }, [detail, bookingItems]);

    const seatMap = useMemo(() => {
        const map = new Map();

        seatDetails.forEach((seat) => {
            map.set(String(seat.id), seat);
        });

        return map;
    }, [seatDetails]);

    const getSeatName = (seatId) => {
        const seat = seatMap.get(String(seatId));
        return seat ? seat.seatNumber : `Seat #${seatId}`;
    };

    const loadDetail = async () => {
        try {
            setError("");
            setDetail(null);
            setBookingItems([]);
            setTickets([]);
            setSeatDetails([]);
            setUserDetail(null);
            setEventDetail(null);
            setPaymentDetail(null);
            setNotificationList([]);
            setSelectedTicket(null);

            const detailRes = await axiosClient.get(
                `/booking-service/bookings/${id}/detail`
            );

            setDetail(detailRes.data);

            const currentBooking =
                detailRes.data?.booking ||
                detailRes.data?.bookingDTO ||
                detailRes.data?.data?.booking ||
                detailRes.data?.data ||
                detailRes.data;

            const bookingId = currentBooking?.id || id;
            const userId = currentBooking?.userId;
            const eventId = currentBooking?.eventId;

            try {
                const itemRes = await axiosClient.get(
                    `/booking-service/booking-items/booking/${bookingId}`
                );

                setBookingItems(Array.isArray(itemRes.data) ? itemRes.data : []);
            } catch {
                setBookingItems([]);
            }

            try {
                const ticketRes = await axiosClient.get(
                    `/ticket-service/tickets/booking/${bookingId}`
                );

                setTickets(Array.isArray(ticketRes.data) ? ticketRes.data : []);
            } catch {
                setTickets([]);
            }

            try {
                const seatRes = await axiosClient.get("/seat-service/seats");
                setSeatDetails(Array.isArray(seatRes.data) ? seatRes.data : []);
            } catch {
                setSeatDetails([]);
            }

            if (userId) {
                try {
                    const userRes = await axiosClient.get(`/user-service/users/${userId}`);
                    setUserDetail(userRes.data);
                } catch {
                    setUserDetail(null);
                }
            }

            if (eventId) {
                try {
                    const eventRes = await axiosClient.get(
                        `/event-service/events/${eventId}`
                    );
                    setEventDetail(eventRes.data);
                } catch {
                    setEventDetail(null);
                }
            }

            try {
                const paymentRes = await axiosClient.get(
                    `/payment-service/payments/booking/${bookingId}`
                );

                if (Array.isArray(paymentRes.data)) {
                    setPaymentDetail(paymentRes.data[0] || null);
                } else {
                    setPaymentDetail(paymentRes.data || null);
                }
            } catch {
                setPaymentDetail(null);
            }

            try {
                const notificationRes = await axiosClient.get(
                    `/notification-service/notifications/booking/${bookingId}`
                );

                setNotificationList(
                    Array.isArray(notificationRes.data) ? notificationRes.data : []
                );
            } catch {
                setNotificationList([]);
            }
        } catch (err) {
            console.error(err);
            setDetail(null);
            setBookingItems([]);
            setTickets([]);
            setSeatDetails([]);
            setUserDetail(null);
            setEventDetail(null);
            setPaymentDetail(null);
            setNotificationList([]);
            setError("Không tải được chi tiết booking. Kiểm tra API detail.");
        }
    };

    const markPaid = async () => {
        if (!window.confirm("Xác nhận booking này đã thanh toán và tạo vé QR?")) {
            return;
        }

        try {
            setError("");

            await axiosClient.put(`/booking-service/bookings/${id}/status?status=PAID`);

            alert("Đã cập nhật booking thành PAID và tạo vé QR");
            loadDetail();
        } catch (err) {
            console.error(err);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Không cập nhật được trạng thái PAID.";

            setError(message);
            alert(message);
        }
    };

    const cancelBooking = async () => {
        if (!window.confirm("Bạn có chắc muốn hủy booking này không?")) return;

        try {
            setError("");
            await axiosClient.put(`/booking-service/bookings/${id}/cancel`);
            alert("Đã hủy booking");
            loadDetail();
        } catch (err) {
            console.error(err);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Không hủy được booking.";

            setError(message);
            alert(message);
        }
    };

    const deleteBooking = async () => {
        if (!window.confirm("Bạn có chắc muốn xóa booking này không?")) return;

        try {
            setError("");
            await axiosClient.delete(`/booking-service/bookings/${id}`);
            alert("Đã xóa booking");
            navigate("/bookings");
        } catch (err) {
            console.error(err);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Không xóa được booking.";

            setError(message);
            alert(message);
        }
    };

    const useTicket = async (ticketId) => {
        if (!window.confirm("Xác nhận check-in vé này?")) return;

        try {
            setError("");

            await axiosClient.put(`/ticket-service/tickets/${ticketId}/use`);

            alert("Check-in vé thành công");
            setSelectedTicket(null);
            loadDetail();
        } catch (err) {
            console.error(err);

            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Không check-in được vé.";

            setError(message);
            alert(message);
        }
    };

    const markNotificationRead = async (notificationId) => {
        try {
            await axiosClient.put(
                `/notification-service/notifications/${notificationId}/read`
            );

            loadDetail();
        } catch (err) {
            console.error(err);
            alert("Không đánh dấu đã đọc được.");
        }
    };

    const markNotificationUnread = async (notificationId) => {
        try {
            await axiosClient.put(
                `/notification-service/notifications/${notificationId}/unread`
            );

            loadDetail();
        } catch (err) {
            console.error(err);
            alert("Không chuyển về chưa đọc được.");
        }
    };

    const formatMoney = (value) => {
        return `${Number(value || 0).toLocaleString()} đ`;
    };

    const formatDate = (value) => {
        if (!value) return "NULL";
        return String(value).replace("T", " ");
    };

    const getStatusClass = (status) => {
        if (status === "PAID" || status === "SUCCESS") {
            return "bg-emerald-100 text-emerald-700";
        }

        if (status === "CANCELLED" || status === "FAILED") {
            return "bg-red-100 text-red-700";
        }

        if (status === "EXPIRED") {
            return "bg-slate-100 text-slate-700";
        }

        return "bg-amber-100 text-amber-700";
    };

    const getTicketStatusClass = (status) => {
        if (status === "VALID") {
            return "bg-green-100 text-green-700";
        }

        if (status === "USED") {
            return "bg-blue-100 text-blue-700";
        }

        if (status === "CANCELLED") {
            return "bg-red-100 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    const getNotificationTypeClass = (type) => {
        if (type === "BOOKING_CREATED") {
            return "bg-blue-100 text-blue-700";
        }

        if (type === "PAYMENT_SUCCESS") {
            return "bg-green-100 text-green-700";
        }

        if (type === "TICKET_ISSUED") {
            return "bg-purple-100 text-purple-700";
        }

        if (type === "BOOKING_CANCELLED") {
            return "bg-red-100 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    const InfoRow = ({ label, value }) => (
        <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-100 last:border-b-0">
            <div className="text-sm text-slate-500">{label}</div>

            <div className="col-span-2 text-sm font-semibold text-slate-900 wrap-break-word text-right">
                {value === null || value === undefined || value === "" ? "NULL" : value}
            </div>
        </div>
    );

    const InfoCard = ({ icon: Icon, title, children }) => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                </div>

                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            </div>

            {children}
        </div>
    );

    const StatCard = ({ icon: Icon, label, value }) => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Icon size={21} />
                </div>

                <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">{label}</div>
                    <div className="text-lg font-bold text-slate-900 truncate">
                        {value}
                    </div>
                </div>
            </div>
        </div>
    );

    const EmptyBox = ({ text }) => (
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500">
            {text}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <Link
                        to="/bookings"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
                    >
                        <ArrowLeft size={17} />
                        Quay lại danh sách booking
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-900 mt-3">
                        Booking Detail #{id}
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Chi tiết booking, user, event, booking items, payment, ticket QR và notification.
                    </p>
                </div>

                <button
                    onClick={loadDetail}
                    className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black shrink-0"
                >
                    <RefreshCw size={17} />
                    Reload
                </button>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-5 py-4">
                    {error}
                </div>
            )}

            {!booking ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                    Không có dữ liệu chi tiết booking.
                </div>
            ) : (
                <>
                    <section className="bg-slate-950 text-white rounded-3xl p-8 shadow-sm">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-sm font-semibold">
                                    <ReceiptText size={16} />
                                    Booking Information
                                </div>

                                <h2 className="text-3xl font-bold mt-4 wrap-break-word">
                                    {booking.bookingCode || `BOOKING-${booking.id}`}
                                </h2>

                                <p className="text-slate-300 mt-2">
                                    User #{booking.userId} · Event #{booking.eventId}
                                </p>

                                <div className="flex flex-wrap items-center gap-3 mt-5">
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusClass(
                                            booking.status
                                        )}`}
                                    >
                                        {booking.status || "NULL"}
                                    </span>

                                    <span className="text-sm text-slate-300">
                                        {formatDate(booking.bookingDate)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white/10 rounded-2xl p-5 border border-white/10 xl:ml-auto xl:w-95">
                                <div className="text-sm text-slate-400">Total Amount</div>

                                <div className="text-3xl font-bold mt-2">
                                    {formatMoney(booking.totalAmount)}
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-5">
                                    {booking.status === "PENDING" && (
                                        <button
                                            onClick={markPaid}
                                            className="h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                                        >
                                            <CheckCircle size={16} />
                                            PAID
                                        </button>
                                    )}

                                    {booking.status !== "CANCELLED" && (
                                        <button
                                            onClick={cancelBooking}
                                            className="h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
                                        >
                                            <Ban size={16} />
                                            Hủy
                                        </button>
                                    )}

                                    <button
                                        onClick={deleteBooking}
                                        className="h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                                    >
                                        <Trash2 size={16} />
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard
                            icon={Hash}
                            label="Booking ID"
                            value={`#${booking.id || id}`}
                        />

                        <StatCard
                            icon={User}
                            label="User ID"
                            value={`#${booking.userId || "NULL"}`}
                        />

                        <StatCard
                            icon={CalendarDays}
                            label="Event ID"
                            value={`#${booking.eventId || "NULL"}`}
                        />

                        <StatCard
                            icon={Wallet}
                            label="Amount"
                            value={formatMoney(booking.totalAmount)}
                        />
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        <div className="xl:col-span-8 space-y-8 min-w-0">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Armchair size={22} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">
                                                Booking Items
                                            </h2>
                                            <p className="text-sm text-slate-500">
                                                Danh sách ghế/vé thuộc booking này.
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        to="/booking-items"
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                                    >
                                        Quản lý booking_items
                                    </Link>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-155 text-left">
                                        <thead className="bg-slate-50 text-slate-600 text-sm">
                                            <tr>
                                                <th className="px-5 py-4 w-20">ID</th>
                                                <th className="px-5 py-4 w-36">Booking ID</th>
                                                <th className="px-5 py-4 w-36">Seat</th>
                                                <th className="px-5 py-4 w-36">Price</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {items.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="border-t hover:bg-blue-50/30"
                                                >
                                                    <td className="px-5 py-4 text-sm">{item.id}</td>
                                                    <td className="px-5 py-4 text-sm">
                                                        {item.bookingId}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm">
                                                        <div className="font-semibold">
                                                            {getSeatName(item.seatId)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Seat ID: {item.seatId}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 font-semibold">
                                                        {formatMoney(item.price)}
                                                    </td>
                                                </tr>
                                            ))}

                                            {items.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan="4"
                                                        className="px-5 py-10 text-center text-slate-500"
                                                    >
                                                        Booking này chưa có booking items.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <InfoCard icon={QrCode} title="Ticket QR">
                                {tickets.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {tickets.map((ticket) => (
                                            <div
                                                key={ticket.id}
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="flex gap-4">
                                                    {ticket.qrImage ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedTicket(ticket)}
                                                            className="shrink-0"
                                                        >
                                                            <img
                                                                src={ticket.qrImage}
                                                                alt={ticket.ticketCode || "Ticket QR"}
                                                                className="h-24 w-24 rounded-xl border object-cover"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="h-24 w-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                            NULL
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-slate-900 break-all">
                                                            {ticket.ticketCode || `TICKET-${ticket.id}`}
                                                        </div>

                                                        <div className="text-sm text-slate-500 mt-1">
                                                            Ghế {getSeatName(ticket.seatId)}
                                                        </div>

                                                        <div className="text-sm font-semibold text-slate-900 mt-1">
                                                            {formatMoney(ticket.price)}
                                                        </div>

                                                        <div className="mt-2">
                                                            <span
                                                                className={`text-xs px-3 py-1 rounded-full font-bold ${getTicketStatusClass(
                                                                    ticket.status
                                                                )}`}
                                                            >
                                                                {ticket.status || "VALID"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedTicket(ticket)}
                                                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black"
                                                    >
                                                        Xem QR
                                                    </button>

                                                    {ticket.status === "VALID" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => useTicket(ticket.id)}
                                                            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                                                        >
                                                            Check-in
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : booking.status === "PAID" ? (
                                    <EmptyBox text="Booking đã PAID nhưng chưa có Ticket QR. Kiểm tra ticket-service hoặc bấm Reload." />
                                ) : (
                                    <EmptyBox text="Chưa có Ticket QR. Vé QR chỉ tạo sau khi booking được PAID." />
                                )}
                            </InfoCard>

                            <InfoCard icon={Bell} title="Notifications">
                                {notifications.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
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

                                                        <div className="text-sm text-slate-500 mt-1 wrap-break-word">
                                                            {notification.message}
                                                        </div>

                                                        <div className="text-xs text-slate-400 mt-2">
                                                            {formatDate(notification.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 mt-4">
                                                    {!notification.isRead ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                markNotificationRead(notification.id)
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                                                        >
                                                            <CheckCircle size={15} />
                                                            Đã đọc
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                markNotificationUnread(notification.id)
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-800"
                                                        >
                                                            <RotateCcw size={15} />
                                                            Chưa đọc
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyBox text="Chưa có notification cho booking này. Kiểm tra notification-service hoặc RabbitMQ." />
                                )}
                            </InfoCard>
                        </div>

                        <div className="xl:col-span-4 space-y-8 min-w-0">
                            <InfoCard icon={ReceiptText} title="Booking">
                                <InfoRow label="ID" value={booking.id} />
                                <InfoRow label="User ID" value={booking.userId} />
                                <InfoRow label="Event ID" value={booking.eventId} />
                                <InfoRow label="Code" value={booking.bookingCode} />
                                <InfoRow label="Amount" value={formatMoney(booking.totalAmount)} />
                                <InfoRow label="Status" value={booking.status} />
                                <InfoRow label="Date" value={formatDate(booking.bookingDate)} />
                            </InfoCard>

                            <InfoCard icon={User} title="User">
                                {user ? (
                                    <>
                                        <InfoRow label="ID" value={user.id} />
                                        <InfoRow label="Name" value={user.name} />
                                        <InfoRow label="Email" value={user.email} />
                                        <InfoRow label="Phone" value={user.phone} />
                                        <InfoRow label="Role" value={user.role} />
                                    </>
                                ) : (
                                    <EmptyBox text="Không lấy được User. Kiểm tra GET /user-service/users/{userId}." />
                                )}
                            </InfoCard>

                            <InfoCard icon={CalendarDays} title="Event">
                                {event ? (
                                    <>
                                        <InfoRow label="ID" value={event.id} />
                                        <InfoRow label="Name" value={event.name} />
                                        <InfoRow label="Location" value={event.location} />
                                        <InfoRow label="Category" value={event.category} />
                                        <InfoRow label="Date" value={formatDate(event.eventDate)} />
                                        <InfoRow label="Status" value={event.status} />
                                    </>
                                ) : (
                                    <EmptyBox text="Không lấy được Event. Kiểm tra GET /event-service/events/{eventId}." />
                                )}
                            </InfoCard>

                            <InfoCard icon={CreditCard} title="Payment">
                                {payment ? (
                                    <>
                                        <InfoRow label="ID" value={payment.id} />
                                        <InfoRow label="Booking" value={payment.bookingId} />
                                        <InfoRow label="Amount" value={formatMoney(payment.amount)} />
                                        <InfoRow label="Method" value={payment.paymentMethod} />
                                        <InfoRow label="Status" value={payment.status} />
                                        <InfoRow label="Date" value={formatDate(payment.paymentDate)} />
                                    </>
                                ) : (
                                    <EmptyBox text="Không lấy được Payment. Kiểm tra GET /payment-service/payments/booking/{bookingId}." />
                                )}
                            </InfoCard>
                        </div>
                    </section>
                </>
            )}

            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white w-130 max-w-full rounded-3xl shadow-2xl p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm text-blue-600 font-semibold">
                                    Ticket QR
                                </p>

                                <h2 className="text-xl font-bold text-slate-900 mt-1 break-all">
                                    {selectedTicket.ticketCode}
                                </h2>

                                <p className="text-sm text-slate-500 mt-2">
                                    {event?.name || `Event #${selectedTicket.eventId}`} · Ghế{" "}
                                    {getSeatName(selectedTicket.seatId)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <img
                                src={selectedTicket.qrImage}
                                alt={selectedTicket.ticketCode || "Ticket QR"}
                                className="h-72 w-72 border rounded-2xl"
                            />
                        </div>

                        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                            <div>
                                <b>Booking:</b>{" "}
                                {booking?.bookingCode ||
                                    `Booking #${selectedTicket.bookingId}`}
                            </div>

                            <div>
                                <b>User:</b>{" "}
                                {user?.name ||
                                    user?.email ||
                                    `User #${selectedTicket.userId}`}
                            </div>

                            <div>
                                <b>Event:</b>{" "}
                                {event?.name || `Event #${selectedTicket.eventId}`}
                            </div>

                            <div>
                                <b>Seat:</b> {getSeatName(selectedTicket.seatId)}
                            </div>

                            <div>
                                <b>Price:</b> {formatMoney(selectedTicket.price)}
                            </div>

                            <div>
                                <b>Status:</b> {selectedTicket.status}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {selectedTicket.status === "VALID" && (
                                <button
                                    type="button"
                                    onClick={() => useTicket(selectedTicket.id)}
                                    className="px-5 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
                                >
                                    Check-in
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-black"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BookingDetail;