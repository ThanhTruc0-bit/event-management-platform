import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    AlertCircle,
    Armchair,
    ArrowLeft,
    Ban,
    Bell,
    CalendarDays,
    CheckCircle,
    CreditCard,
    Hash,
    Loader2,
    MapPin,
    QrCode,
    ReceiptText,
    RefreshCw,
    RotateCcw,
    Trash2,
    User,
    Wallet,
    X,
} from "lucide-react";

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.tickets)) {
        return data.tickets;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    return [];
}

function normalizePayments(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.payments)) {
        return data.payments;
    }

    if (
        data &&
        typeof data === "object" &&
        data.id
    ) {
        return [data];
    }

    return [];
}

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function getPaymentTime(payment) {
    const value =
        payment?.paymentDate ||
        payment?.updatedAt ||
        payment?.createdAt;

    if (!value) {
        return 0;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time)
        ? 0
        : time;
}

function selectRelevantPayment(data) {
    const payments = normalizePayments(data)
        .slice()
        .sort((first, second) => {
            const dateDifference =
                getPaymentTime(second) -
                getPaymentTime(first);

            if (dateDifference !== 0) {
                return dateDifference;
            }

            return (
                Number(second?.id || 0) -
                Number(first?.id || 0)
            );
        });

    return (
        payments.find(
            (payment) =>
                normalizeStatus(
                    payment?.status
                ) === "SUCCESS"
        ) ||
        payments[0] ||
        null
    );
}

function getErrorMessage(
    error,
    fallback
) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallback
    );
}

function formatMoney(value) {
    return `${Number(
        value || 0
    ).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
    if (!value) {
        return "NULL";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value).replace(
            "T",
            " "
        );
    }

    return date.toLocaleString(
        "vi-VN"
    );
}

function getDisplayStatus(
    booking,
    payment
) {
    const bookingStatus =
        normalizeStatus(
            booking?.status
        );

    const paymentStatus =
        normalizeStatus(
            payment?.status
        );

    if (bookingStatus === "PAID") {
        return "PAID";
    }

    if (paymentStatus === "SUCCESS") {
        return "SYNC_PENDING";
    }

    return bookingStatus || "UNKNOWN";
}

function getStatusInfo(value) {
    const status =
        normalizeStatus(value);

    if (status === "PAID") {
        return {
            label: "PAID",
            className:
                "bg-emerald-100 text-emerald-700",
        };
    }

    if (status === "SYNC_PENDING") {
        return {
            label:
                "ĐÃ THANH TOÁN - ĐANG ĐỒNG BỘ VÉ",
            className:
                "bg-cyan-100 text-cyan-700",
        };
    }

    if (status === "PENDING") {
        return {
            label: "PENDING",
            className:
                "bg-amber-100 text-amber-700",
        };
    }

    if (
        status === "CANCELLED" ||
        status === "FAILED"
    ) {
        return {
            label: status,
            className:
                "bg-red-100 text-red-700",
        };
    }

    if (status === "EXPIRED") {
        return {
            label: "EXPIRED",
            className:
                "bg-slate-100 text-slate-700",
        };
    }

    return {
        label: status || "UNKNOWN",
        className:
            "bg-slate-100 text-slate-700",
    };
}

function getTicketStatusClass(value) {
    const status =
        normalizeStatus(value);

    if (
        status === "VALID" ||
        status === "ACTIVE" ||
        status === "PAID"
    ) {
        return "bg-green-100 text-green-700";
    }

    if (
        status === "USED" ||
        status === "CHECKED_IN"
    ) {
        return "bg-blue-100 text-blue-700";
    }

    if (
        status === "CANCELLED" ||
        status === "FAILED" ||
        status === "EXPIRED"
    ) {
        return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
}

function getNotificationTypeClass(value) {
    const type =
        normalizeStatus(value);

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
}

function isNotificationRead(
    notification
) {
    return Boolean(
        notification?.isRead ??
        notification?.read
    );
}

function InfoRow({
    label,
    value,
}) {
    return (
        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 py-4 last:border-b-0">
            <div className="text-sm text-slate-500">
                {label}
            </div>

            <div className="col-span-2 break-words text-right text-sm font-semibold text-slate-900">
                {value === null ||
                    value === undefined ||
                    value === ""
                    ? "NULL"
                    : value}
            </div>
        </div>
    );
}

function InfoCard({
    icon: Icon,
    title,
    children,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={20} />
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                    {title}
                </h2>
            </div>

            {children}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon size={21} />
                </div>

                <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">
                        {label}
                    </div>

                    <div className="truncate text-lg font-bold text-slate-900">
                        {value}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyBox({ text }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {text}
        </div>
    );
}

function BookingDetail() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [
        detail,
        setDetail,
    ] = useState(null);

    const [
        bookingItems,
        setBookingItems,
    ] = useState([]);

    const [
        tickets,
        setTickets,
    ] = useState([]);

    const [
        seatDetails,
        setSeatDetails,
    ] = useState([]);

    const [
        userDetail,
        setUserDetail,
    ] = useState(null);

    const [
        eventDetail,
        setEventDetail,
    ] = useState(null);

    const [
        paymentDetail,
        setPaymentDetail,
    ] = useState(null);

    const [
        paymentLoadFailed,
        setPaymentLoadFailed,
    ] = useState(false);

    const [
        notificationList,
        setNotificationList,
    ] = useState([]);

    const [
        selectedTicket,
        setSelectedTicket,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        actionLoading,
        setActionLoading,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    useEffect(() => {
        loadDetail();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const booking =
        useMemo(() => {
            if (!detail) {
                return null;
            }

            return (
                detail?.booking ||
                detail?.bookingDTO ||
                detail?.data?.booking ||
                detail?.data ||
                detail
            );
        }, [detail]);

    const items =
        useMemo(() => {
            const embedded =
                detail?.bookingItems ||
                detail?.items ||
                detail?.bookingItemList ||
                detail?.data?.bookingItems ||
                detail?.data?.items;

            return Array.isArray(embedded)
                ? embedded
                : bookingItems;
        }, [
            detail,
            bookingItems,
        ]);

    const user =
        useMemo(() => {
            return (
                userDetail ||
                detail?.user ||
                detail?.userDTO ||
                detail?.data?.user ||
                null
            );
        }, [
            userDetail,
            detail,
        ]);

    const event =
        useMemo(() => {
            return (
                eventDetail ||
                detail?.event ||
                detail?.eventDTO ||
                detail?.data?.event ||
                null
            );
        }, [
            eventDetail,
            detail,
        ]);

    const payment =
        useMemo(() => {
            return (
                paymentDetail ||
                detail?.payment ||
                detail?.paymentDTO ||
                detail?.data?.payment ||
                null
            );
        }, [
            paymentDetail,
            detail,
        ]);

    const notifications =
        useMemo(() => {
            const embedded =
                detail?.notifications ||
                detail?.notificationList ||
                detail?.data?.notifications;

            return Array.isArray(embedded)
                ? embedded
                : notificationList;
        }, [
            detail,
            notificationList,
        ]);

    const seatMap =
        useMemo(() => {
            return new Map(
                seatDetails.map((seat) => [
                    String(seat.id),
                    seat,
                ])
            );
        }, [seatDetails]);

    const bookingStatus =
        normalizeStatus(
            booking?.status
        );

    const paymentStatus =
        normalizeStatus(
            payment?.status
        );

    const displayStatus =
        getDisplayStatus(
            booking,
            payment
        );

    const statusInfo =
        getStatusInfo(
            displayStatus
        );

    const hasSuccessfulPayment =
        paymentStatus === "SUCCESS";

    const needsSynchronization =
        displayStatus ===
        "SYNC_PENDING" &&
        Boolean(payment?.id);

    const canMarkPaid =
        bookingStatus === "PENDING" &&
        !hasSuccessfulPayment &&
        !paymentLoadFailed;

    const canCancel =
        bookingStatus === "PENDING" &&
        !hasSuccessfulPayment &&
        !paymentLoadFailed;

    const canDelete =
        bookingStatus !== "PAID" &&
        !hasSuccessfulPayment &&
        !paymentLoadFailed;

    const getSeat =
        (seatId) => {
            return seatMap.get(
                String(seatId)
            );
        };

    const getSeatName =
        (seatId) => {
            const seat =
                getSeat(seatId);

            return (
                seat?.seatNumber ||
                `Seat #${seatId}`
            );
        };

    const resetDetailState =
        () => {
            setDetail(null);
            setBookingItems([]);
            setTickets([]);
            setSeatDetails([]);
            setUserDetail(null);
            setEventDetail(null);
            setPaymentDetail(null);
            setPaymentLoadFailed(false);
            setNotificationList([]);
            setSelectedTicket(null);
        };

    const loadDetail =
        async () => {
            try {
                setLoading(true);
                setError("");

                resetDetailState();

                const detailResponse =
                    await axiosClient.get(
                        `/booking-service/bookings/${id}/detail`
                    );

                setDetail(
                    detailResponse.data
                );

                const currentBooking =
                    detailResponse.data
                        ?.booking ||
                    detailResponse.data
                        ?.bookingDTO ||
                    detailResponse.data
                        ?.data?.booking ||
                    detailResponse.data
                        ?.data ||
                    detailResponse.data;

                const bookingId =
                    currentBooking?.id ||
                    id;

                const userId =
                    currentBooking?.userId;

                const eventId =
                    currentBooking?.eventId;

                const requests = [
                    axiosClient.get(
                        `/booking-service/booking-items/booking/${bookingId}`
                    ),

                    axiosClient.get(
                        `/ticket-service/tickets/booking/${bookingId}`
                    ),

                    axiosClient.get(
                        "/seat-service/seats",
                        {
                            params: {
                                page: 0,
                                size: 500,
                            },
                        }
                    ),

                    axiosClient.get(
                        `/payment-service/payments/booking/${bookingId}`
                    ),

                    axiosClient.get(
                        `/notification-service/notifications/booking/${bookingId}`
                    ),

                    userId
                        ? axiosClient.get(
                            `/user-service/users/${userId}`
                        )
                        : Promise.resolve({
                            data: null,
                        }),

                    eventId
                        ? axiosClient.get(
                            `/event-service/events/${eventId}`
                        )
                        : Promise.resolve({
                            data: null,
                        }),
                ];

                const [
                    itemResult,
                    ticketResult,
                    seatResult,
                    paymentResult,
                    notificationResult,
                    userResult,
                    eventResult,
                ] =
                    await Promise.allSettled(
                        requests
                    );

                if (
                    itemResult.status ===
                    "fulfilled"
                ) {
                    setBookingItems(
                        normalizeList(
                            itemResult.value.data
                        )
                    );
                }

                if (
                    ticketResult.status ===
                    "fulfilled"
                ) {
                    setTickets(
                        normalizeList(
                            ticketResult.value.data
                        )
                    );
                }

                if (
                    seatResult.status ===
                    "fulfilled"
                ) {
                    setSeatDetails(
                        normalizeList(
                            seatResult.value.data
                        )
                    );
                }

                if (
                    paymentResult.status ===
                    "fulfilled"
                ) {
                    setPaymentDetail(
                        selectRelevantPayment(
                            paymentResult.value.data
                        )
                    );

                    setPaymentLoadFailed(
                        false
                    );
                } else {
                    setPaymentDetail(null);
                    setPaymentLoadFailed(
                        true
                    );

                    console.error(
                        "Không tải được payment:",
                        paymentResult.reason
                    );
                }

                if (
                    notificationResult.status ===
                    "fulfilled"
                ) {
                    setNotificationList(
                        normalizeList(
                            notificationResult.value
                                .data
                        )
                    );
                }

                if (
                    userResult.status ===
                    "fulfilled"
                ) {
                    setUserDetail(
                        userResult.value.data
                    );
                }

                if (
                    eventResult.status ===
                    "fulfilled"
                ) {
                    setEventDetail(
                        eventResult.value.data
                    );
                }
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                resetDetailState();

                setError(
                    getErrorMessage(
                        requestError,
                        "Không tải được chi tiết booking."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const markPaid =
        async () => {
            if (
                hasSuccessfulPayment
            ) {
                setError(
                    "Payment đã SUCCESS. Hãy dùng nút Đồng bộ lại."
                );
                return;
            }

            if (paymentLoadFailed) {
                setError(
                    "Không kiểm tra được Payment Service nên không thể xác nhận PAID."
                );
                return;
            }

            if (
                !window.confirm(
                    "Xác nhận booking này đã thanh toán và tạo vé QR?"
                )
            ) {
                return;
            }

            try {
                setActionLoading("PAID");
                setError("");

                await axiosClient.put(
                    `/booking-service/bookings/${id}/status`,
                    null,
                    {
                        params: {
                            status: "PAID",
                        },
                    }
                );

                alert(
                    "Đã cập nhật booking thành PAID."
                );

                await loadDetail();
            } catch (
            requestError
            ) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Không cập nhật được trạng thái PAID."
                    );

                setError(message);
                alert(message);
            } finally {
                setActionLoading("");
            }
        };

    const retrySynchronization =
        async () => {
            if (!payment?.id) {
                setError(
                    "Không tìm thấy payment SUCCESS để đồng bộ."
                );
                return;
            }

            try {
                setActionLoading("SYNC");
                setError("");

                await axiosClient.put(
                    `/payment-service/payments/${payment.id}/retry-booking-sync`
                );

                alert(
                    "Đã gửi yêu cầu đồng bộ lại booking và vé."
                );

                await loadDetail();
            } catch (
            requestError
            ) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Payment đã thành công nhưng chưa đồng bộ được booking và vé."
                    );

                setError(message);
                alert(message);
            } finally {
                setActionLoading("");
            }
        };

    const cancelBooking =
        async () => {
            if (
                hasSuccessfulPayment
            ) {
                setError(
                    "Booking đã thanh toán thành công nên không thể hủy theo luồng chưa thanh toán."
                );
                return;
            }

            if (paymentLoadFailed) {
                setError(
                    "Không kiểm tra được Payment Service nên không thể hủy booking."
                );
                return;
            }

            if (
                !window.confirm(
                    "Bạn có chắc muốn hủy booking này không?"
                )
            ) {
                return;
            }

            try {
                setActionLoading("CANCEL");
                setError("");

                await axiosClient.put(
                    `/booking-service/bookings/${id}/cancel`
                );

                alert("Đã hủy booking.");

                await loadDetail();
            } catch (
            requestError
            ) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Không hủy được booking."
                    );

                setError(message);
                alert(message);
            } finally {
                setActionLoading("");
            }
        };

    const deleteBooking =
        async () => {
            if (
                hasSuccessfulPayment
            ) {
                setError(
                    "Booking đã có payment SUCCESS nên không được xóa."
                );
                return;
            }

            if (paymentLoadFailed) {
                setError(
                    "Không kiểm tra được Payment Service nên không thể xóa booking."
                );
                return;
            }

            if (
                !window.confirm(
                    "Bạn có chắc muốn xóa booking này không?"
                )
            ) {
                return;
            }

            try {
                setActionLoading("DELETE");
                setError("");

                await axiosClient.delete(
                    `/booking-service/bookings/${id}`
                );

                alert("Đã xóa booking.");

                navigate("/bookings");
            } catch (
            requestError
            ) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Không xóa được booking."
                    );

                setError(message);
                alert(message);
            } finally {
                setActionLoading("");
            }
        };

    const useTicket =
        async (ticketId) => {
            if (
                !window.confirm(
                    "Xác nhận check-in vé này?"
                )
            ) {
                return;
            }

            try {
                setActionLoading(
                    `TICKET-${ticketId}`
                );

                setError("");

                await axiosClient.put(
                    `/ticket-service/tickets/${ticketId}/use`
                );

                alert(
                    "Check-in vé thành công."
                );

                setSelectedTicket(null);

                await loadDetail();
            } catch (
            requestError
            ) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Không check-in được vé."
                    );

                setError(message);
                alert(message);
            } finally {
                setActionLoading("");
            }
        };

    const markNotificationRead =
        async (notificationId) => {
            try {
                await axiosClient.put(
                    `/notification-service/notifications/${notificationId}/read`
                );

                await loadDetail();
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                alert(
                    "Không đánh dấu đã đọc được."
                );
            }
        };

    const markNotificationUnread =
        async (notificationId) => {
            try {
                await axiosClient.put(
                    `/notification-service/notifications/${notificationId}/unread`
                );

                await loadDetail();
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                alert(
                    "Không chuyển về chưa đọc được."
                );
            }
        };

    if (
        loading &&
        !booking
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2
                    size={30}
                    className="animate-spin text-blue-600"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <Link
                        to="/bookings"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
                    >
                        <ArrowLeft
                            size={17}
                        />

                        Quay lại danh sách booking
                    </Link>

                    <h1 className="mt-3 text-3xl font-bold text-slate-900">
                        Booking Detail #{id}
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Booking, payment,
                        ghế, vé QR và thông báo.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadDetail}
                    disabled={loading}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                    <RefreshCw
                        size={17}
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />

                    Reload
                </button>
            </header>

            {error && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                    <AlertCircle
                        size={20}
                        className="shrink-0"
                    />

                    <span>{error}</span>
                </div>
            )}

            {!booking ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                    Không có dữ liệu booking.
                </div>
            ) : (
                <>
                    <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
                        <div className="grid grid-cols-1 items-center gap-8 xl:grid-cols-2">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-300">
                                    <ReceiptText
                                        size={16}
                                    />

                                    Booking Information
                                </div>

                                <h2 className="mt-4 break-words text-3xl font-bold">
                                    {booking.bookingCode ||
                                        `BOOKING-${booking.id}`}
                                </h2>

                                <p className="mt-2 text-slate-300">
                                    User #
                                    {booking.userId}
                                    {" · "}
                                    Event #
                                    {booking.eventId}
                                </p>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo.className}`}
                                    >
                                        {
                                            statusInfo.label
                                        }
                                    </span>

                                    <span className="text-sm text-slate-300">
                                        {formatDate(
                                            booking.bookingDate
                                        )}
                                    </span>
                                </div>

                                {needsSynchronization && (
                                    <div className="mt-5 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                                        VNPay đã ghi nhận
                                        thanh toán thành công.
                                        Booking hoặc vé QR
                                        chưa đồng bộ hoàn tất.
                                    </div>
                                )}

                                {paymentLoadFailed && (
                                    <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                                        Không tải được Payment
                                        Service. Các thao tác PAID,
                                        hủy và xóa đang bị khóa.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 xl:ml-auto xl:w-[430px]">
                                <div className="text-sm text-slate-400">
                                    Total Amount
                                </div>

                                <div className="mt-2 text-3xl font-bold">
                                    {formatMoney(
                                        booking.totalAmount
                                    )}
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {needsSynchronization && (
                                        <button
                                            type="button"
                                            onClick={
                                                retrySynchronization
                                            }
                                            disabled={
                                                actionLoading !==
                                                ""
                                            }
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 disabled:opacity-60"
                                        >
                                            {actionLoading ===
                                                "SYNC" ? (
                                                <Loader2
                                                    size={
                                                        16
                                                    }
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <RotateCcw
                                                    size={
                                                        16
                                                    }
                                                />
                                            )}

                                            Đồng bộ lại
                                        </button>
                                    )}

                                    {canMarkPaid && (
                                        <button
                                            type="button"
                                            onClick={
                                                markPaid
                                            }
                                            disabled={
                                                actionLoading !==
                                                ""
                                            }
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                                        >
                                            <CheckCircle
                                                size={16}
                                            />

                                            PAID
                                        </button>
                                    )}

                                    {canCancel && (
                                        <button
                                            type="button"
                                            onClick={
                                                cancelBooking
                                            }
                                            disabled={
                                                actionLoading !==
                                                ""
                                            }
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
                                        >
                                            <Ban
                                                size={16}
                                            />

                                            Hủy
                                        </button>
                                    )}

                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={
                                                deleteBooking
                                            }
                                            disabled={
                                                actionLoading !==
                                                ""
                                            }
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                                        >
                                            <Trash2
                                                size={16}
                                            />

                                            Xóa
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
                            value={formatMoney(
                                booking.totalAmount
                            )}
                        />
                    </section>

                    <section className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
                        <div className="space-y-8 xl:col-span-8">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <Armchair
                                                size={22}
                                            />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">
                                                Booking Items
                                            </h2>

                                            <p className="text-sm text-slate-500">
                                                Danh sách ghế thuộc booking.
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        to="/booking-items"
                                        className="text-sm font-semibold text-blue-600"
                                    >
                                        Quản lý
                                    </Link>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[650px] text-left">
                                        <thead className="bg-slate-50 text-sm text-slate-600">
                                            <tr>
                                                <th className="px-5 py-4">
                                                    ID
                                                </th>

                                                <th className="px-5 py-4">
                                                    Seat
                                                </th>

                                                <th className="px-5 py-4">
                                                    Type
                                                </th>

                                                <th className="px-5 py-4">
                                                    Seat status
                                                </th>

                                                <th className="px-5 py-4">
                                                    Price
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {items.map(
                                                (item) => {
                                                    const seat =
                                                        getSeat(
                                                            item.seatId
                                                        );

                                                    return (
                                                        <tr
                                                            key={
                                                                item.id
                                                            }
                                                            className="border-t"
                                                        >
                                                            <td className="px-5 py-4">
                                                                #
                                                                {
                                                                    item.id
                                                                }
                                                            </td>

                                                            <td className="px-5 py-4">
                                                                <div className="font-semibold">
                                                                    {getSeatName(
                                                                        item.seatId
                                                                    )}
                                                                </div>

                                                                <div className="text-xs text-slate-500">
                                                                    ID:{" "}
                                                                    {
                                                                        item.seatId
                                                                    }
                                                                </div>
                                                            </td>

                                                            <td className="px-5 py-4">
                                                                {seat?.seatType ||
                                                                    "NULL"}
                                                            </td>

                                                            <td className="px-5 py-4">
                                                                {seat?.status ||
                                                                    "NULL"}
                                                            </td>

                                                            <td className="px-5 py-4 font-semibold">
                                                                {formatMoney(
                                                                    item.price
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}

                                            {items.length ===
                                                0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={
                                                                5
                                                            }
                                                            className="px-5 py-10 text-center text-slate-500"
                                                        >
                                                            Booking chưa có item.
                                                        </td>
                                                    </tr>
                                                )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <InfoCard
                                icon={QrCode}
                                title="Ticket QR"
                            >
                                {tickets.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        {tickets.map(
                                            (ticket) => {
                                                const ticketStatus =
                                                    normalizeStatus(
                                                        ticket.status
                                                    );

                                                const canUse =
                                                    [
                                                        "VALID",
                                                        "ACTIVE",
                                                        "PAID",
                                                    ].includes(
                                                        ticketStatus
                                                    );

                                                return (
                                                    <article
                                                        key={
                                                            ticket.id
                                                        }
                                                        className="rounded-2xl border border-slate-200 p-4"
                                                    >
                                                        <div className="flex gap-4">
                                                            {ticket.qrImage ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedTicket(
                                                                            ticket
                                                                        )
                                                                    }
                                                                    className="shrink-0"
                                                                >
                                                                    <img
                                                                        src={
                                                                            ticket.qrImage
                                                                        }
                                                                        alt={
                                                                            ticket.ticketCode ||
                                                                            "Ticket QR"
                                                                        }
                                                                        className="h-24 w-24 rounded-xl border object-cover"
                                                                    />
                                                                </button>
                                                            ) : (
                                                                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                                                    NULL
                                                                </div>
                                                            )}

                                                            <div className="min-w-0 flex-1">
                                                                <div className="break-all font-bold text-slate-900">
                                                                    {ticket.ticketCode ||
                                                                        `TICKET-${ticket.id}`}
                                                                </div>

                                                                <div className="mt-1 text-sm text-slate-500">
                                                                    {getSeatName(
                                                                        ticket.seatId
                                                                    )}
                                                                </div>

                                                                <div className="mt-1 text-sm font-semibold">
                                                                    {formatMoney(
                                                                        ticket.price
                                                                    )}
                                                                </div>

                                                                <span
                                                                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getTicketStatusClass(
                                                                        ticket.status
                                                                    )}`}
                                                                >
                                                                    {ticket.status ||
                                                                        "VALID"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedTicket(
                                                                        ticket
                                                                    )
                                                                }
                                                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                                                            >
                                                                Xem QR
                                                            </button>

                                                            {canUse && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        actionLoading !==
                                                                        ""
                                                                    }
                                                                    onClick={() =>
                                                                        useTicket(
                                                                            ticket.id
                                                                        )
                                                                    }
                                                                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                                >
                                                                    Check-in
                                                                </button>
                                                            )}
                                                        </div>
                                                    </article>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : displayStatus ===
                                    "PAID" ? (
                                    <EmptyBox text="Booking đã PAID nhưng chưa có Ticket QR." />
                                ) : needsSynchronization ? (
                                    <EmptyBox text="Payment đã SUCCESS nhưng vé đang chờ đồng bộ." />
                                ) : (
                                    <EmptyBox text="Vé QR được tạo sau khi thanh toán thành công." />
                                )}
                            </InfoCard>

                            <InfoCard
                                icon={Bell}
                                title="Notifications"
                            >
                                {notifications.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                        {notifications.map(
                                            (
                                                notification
                                            ) => {
                                                const read =
                                                    isNotificationRead(
                                                        notification
                                                    );

                                                return (
                                                    <article
                                                        key={
                                                            notification.id
                                                        }
                                                        className="rounded-2xl border border-slate-200 p-4"
                                                    >
                                                        <div className="flex flex-wrap gap-2">
                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-bold ${getNotificationTypeClass(
                                                                    notification.type
                                                                )}`}
                                                            >
                                                                {notification.type ||
                                                                    "SYSTEM"}
                                                            </span>

                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-bold ${read
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-yellow-100 text-yellow-700"
                                                                    }`}
                                                            >
                                                                {read
                                                                    ? "READ"
                                                                    : "UNREAD"}
                                                            </span>
                                                        </div>

                                                        <div className="mt-3 font-semibold text-slate-900">
                                                            {notification.title ||
                                                                "Notification"}
                                                        </div>

                                                        <div className="mt-1 break-words text-sm text-slate-600">
                                                            {notification.message ||
                                                                ""}
                                                        </div>

                                                        <div className="mt-2 text-xs text-slate-400">
                                                            {formatDate(
                                                                notification.createdAt
                                                            )}
                                                        </div>

                                                        <div className="mt-4 text-right">
                                                            {read ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        markNotificationUnread(
                                                                            notification.id
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold"
                                                                >
                                                                    Chưa đọc
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        markNotificationRead(
                                                                            notification.id
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                                                                >
                                                                    Đã đọc
                                                                </button>
                                                            )}
                                                        </div>
                                                    </article>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <EmptyBox text="Booking chưa có notification." />
                                )}
                            </InfoCard>
                        </div>

                        <aside className="space-y-6 xl:col-span-4">
                            <InfoCard
                                icon={ReceiptText}
                                title="Booking"
                            >
                                <InfoRow
                                    label="ID"
                                    value={booking.id}
                                />

                                <InfoRow
                                    label="Mã booking"
                                    value={
                                        booking.bookingCode
                                    }
                                />

                                <InfoRow
                                    label="Status DB"
                                    value={
                                        booking.status
                                    }
                                />

                                <InfoRow
                                    label="Status hiển thị"
                                    value={
                                        statusInfo.label
                                    }
                                />

                                <InfoRow
                                    label="Ngày đặt"
                                    value={formatDate(
                                        booking.bookingDate
                                    )}
                                />

                                <InfoRow
                                    label="Hết hạn"
                                    value={formatDate(
                                        booking.expiresAt
                                    )}
                                />

                                <InfoRow
                                    label="Paid at"
                                    value={formatDate(
                                        booking.paidAt
                                    )}
                                />

                                <InfoRow
                                    label="Cancelled at"
                                    value={formatDate(
                                        booking.cancelledAt
                                    )}
                                />
                            </InfoCard>

                            <InfoCard
                                icon={User}
                                title="User"
                            >
                                <InfoRow
                                    label="ID"
                                    value={
                                        user?.id ||
                                        booking.userId
                                    }
                                />

                                <InfoRow
                                    label="Tên"
                                    value={user?.name}
                                />

                                <InfoRow
                                    label="Email"
                                    value={user?.email}
                                />

                                <InfoRow
                                    label="Phone"
                                    value={user?.phone}
                                />

                                <InfoRow
                                    label="Role"
                                    value={user?.role}
                                />
                            </InfoCard>

                            <InfoCard
                                icon={CalendarDays}
                                title="Event"
                            >
                                <InfoRow
                                    label="ID"
                                    value={
                                        event?.id ||
                                        booking.eventId
                                    }
                                />

                                <InfoRow
                                    label="Tên"
                                    value={event?.name}
                                />

                                <InfoRow
                                    label="Địa điểm"
                                    value={
                                        event?.location
                                    }
                                />

                                <InfoRow
                                    label="Thời gian"
                                    value={formatDate(
                                        event?.eventDate
                                    )}
                                />

                                {event?.location && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                        <MapPin
                                            size={16}
                                        />

                                        {event.location}
                                    </div>
                                )}
                            </InfoCard>

                            <InfoCard
                                icon={CreditCard}
                                title="Payment"
                            >
                                {paymentLoadFailed ? (
                                    <EmptyBox text="Không tải được Payment Service." />
                                ) : payment ? (
                                    <>
                                        <InfoRow
                                            label="Payment ID"
                                            value={
                                                payment.id
                                            }
                                        />

                                        <InfoRow
                                            label="Booking ID"
                                            value={
                                                payment.bookingId
                                            }
                                        />

                                        <InfoRow
                                            label="Amount"
                                            value={formatMoney(
                                                payment.amount
                                            )}
                                        />

                                        <InfoRow
                                            label="Method"
                                            value={
                                                payment.paymentMethod
                                            }
                                        />

                                        <InfoRow
                                            label="Status"
                                            value={
                                                payment.status
                                            }
                                        />

                                        <InfoRow
                                            label="Mã nội bộ"
                                            value={
                                                payment.transactionCode
                                            }
                                        />

                                        <InfoRow
                                            label="VNPay transaction"
                                            value={
                                                payment.vnpTransactionNo
                                            }
                                        />

                                        <InfoRow
                                            label="Response code"
                                            value={
                                                payment.vnpResponseCode
                                            }
                                        />

                                        <InfoRow
                                            label="Bank"
                                            value={
                                                payment.vnpBankCode
                                            }
                                        />

                                        <InfoRow
                                            label="Ngày thanh toán"
                                            value={formatDate(
                                                payment.paymentDate
                                            )}
                                        />
                                    </>
                                ) : (
                                    <EmptyBox text="Booking chưa có payment." />
                                )}
                            </InfoCard>
                        </aside>
                    </section>
                </>
            )}

            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Ticket QR
                                </h2>

                                <div className="mt-1 break-all text-sm text-slate-500">
                                    {selectedTicket.ticketCode}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedTicket(
                                        null
                                    )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-center">
                            {selectedTicket.qrImage ? (
                                <img
                                    src={
                                        selectedTicket.qrImage
                                    }
                                    alt={
                                        selectedTicket.ticketCode ||
                                        "Ticket QR"
                                    }
                                    className="h-72 w-72 rounded-2xl border object-contain"
                                />
                            ) : (
                                <div className="flex h-72 w-72 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                    Không có QR
                                </div>
                            )}
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <InfoRow
                                label="Ticket ID"
                                value={
                                    selectedTicket.id
                                }
                            />

                            <InfoRow
                                label="Seat"
                                value={getSeatName(
                                    selectedTicket.seatId
                                )}
                            />

                            <InfoRow
                                label="Status"
                                value={
                                    selectedTicket.status
                                }
                            />

                            <InfoRow
                                label="Issued at"
                                value={formatDate(
                                    selectedTicket.issuedAt
                                )}
                            />

                            <InfoRow
                                label="QR content"
                                value={
                                    selectedTicket.qrContent
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BookingDetail;