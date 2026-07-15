import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    AlertCircle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    Eye,
    Loader2,
    MapPin,
    ReceiptText,
    RefreshCw,
    Search,
    Ticket,
    XCircle,
} from "lucide-react";

function normalizePage(data) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements: data.length,
            totalPages:
                data.length > 0
                    ? 1
                    : 0,
        };
    }

    return {
        content:
            Array.isArray(data?.content)
                ? data.content
                : [],

        totalElements:
            Number(data?.totalElements) ||
            0,

        totalPages:
            Number(data?.totalPages) ||
            0,
    };
}

function getCurrentUserId() {
    try {
        const raw =
            localStorage.getItem("user");

        if (raw) {
            const user =
                JSON.parse(raw);

            const id =
                user?.userId ??
                user?.id;

            if (id) {
                return Number(id);
            }
        }
    } catch {
        // Tiếp tục đọc token.
    }

    try {
        const token =
            localStorage.getItem(
                "accessToken"
            );

        if (!token) {
            return null;
        }

        const payload =
            token.split(".")[1];

        if (!payload) {
            return null;
        }

        const normalized =
            payload
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        const padded =
            normalized.padEnd(
                Math.ceil(
                    normalized.length / 4
                ) * 4,
                "="
            );

        const decoded =
            JSON.parse(
                atob(padded)
            );

        return decoded?.userId
            ? Number(decoded.userId)
            : null;
    } catch {
        return null;
    }
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

function MyBookings() {
    const navigate =
        useNavigate();

    const [bookings, setBookings] =
        useState([]);

    const [
        eventsById,
        setEventsById,
    ] = useState({});

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [keyword, setKeyword] =
        useState("");

    const [status, setStatus] =
        useState("ALL");

    const [page, setPage] =
        useState(0);

    const [size, setSize] =
        useState(6);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [loading, setLoading] =
        useState(false);

    const [payingId, setPayingId] =
        useState(null);

    const [
        cancellingId,
        setCancellingId,
    ] = useState(null);

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadMyBookings();

        // eslint-disable-next-line
    }, [
        page,
        size,
        keyword,
        status,
    ]);

    useEffect(() => {
        if (
            totalPages > 0 &&
            page >= totalPages
        ) {
            setPage(
                totalPages - 1
            );
        }
    }, [page, totalPages]);

    const loadMyBookings =
        async () => {
            const userId =
                getCurrentUserId();

            if (!userId) {
                navigate(
                    "/login",
                    {
                        replace: true,
                    }
                );

                return;
            }

            try {
                setLoading(true);
                setError("");

                const response =
                    await axiosClient.get(
                        `/booking-service/bookings/user/${userId}`,
                        {
                            params: {
                                page,
                                size,

                                keyword:
                                    keyword ||
                                    undefined,

                                status:
                                    status ===
                                        "ALL"
                                        ? undefined
                                        : status,

                                sortBy:
                                    "bookingDate",

                                sortDirection:
                                    "desc",
                            },
                        }
                    );

                const pageData =
                    normalizePage(
                        response.data
                    );

                setBookings(
                    pageData.content
                );

                setTotalElements(
                    pageData.totalElements
                );

                setTotalPages(
                    pageData.totalPages
                );

                await loadEventDetails(
                    pageData.content
                );
            } catch (requestError) {
                console.error(
                    requestError
                );

                setBookings([]);
                setEventsById({});
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    getErrorMessage(
                        requestError,
                        "Không tải được danh sách booking."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const loadEventDetails =
        async (bookingData) => {
            const eventIds = [
                ...new Set(
                    bookingData
                        .map(
                            (booking) =>
                                booking.eventId
                        )
                        .filter(Boolean)
                ),
            ];

            const entries =
                await Promise.all(
                    eventIds.map(
                        async (
                            eventId
                        ) => {
                            try {
                                const response =
                                    await axiosClient.get(
                                        `/event-service/events/${eventId}`
                                    );

                                return [
                                    eventId,
                                    response.data,
                                ];
                            } catch {
                                return [
                                    eventId,
                                    null,
                                ];
                            }
                        }
                    )
                );

            const nextEvents = {};

            entries.forEach(
                ([
                    eventId,
                    event,
                ]) => {
                    if (event) {
                        nextEvents[
                            eventId
                        ] = event;
                    }
                }
            );

            setEventsById(
                nextEvents
            );
        };

    const submitSearch =
        (event) => {
            event.preventDefault();

            setKeyword(
                keywordInput.trim()
            );

            setPage(0);
        };

    const clearFilters = () => {
        setKeywordInput("");
        setKeyword("");
        setStatus("ALL");
        setPage(0);
    };

    const getPaymentUrl =
        (data) => {
            if (
                typeof data === "string"
            ) {
                return data;
            }

            return (
                data?.paymentUrl ||
                data?.payUrl ||
                data?.url ||
                data?.redirectUrl ||
                data?.vnpayUrl ||
                data?.data
                    ?.paymentUrl ||
                data?.data?.url
            );
        };

    const payAgain =
        async (booking) => {
            try {
                setPayingId(
                    booking.id
                );

                setError("");

                const response =
                    await axiosClient.post(
                        `/payment-service/payments/booking/${booking.id}/vnpay`
                    );

                const paymentUrl =
                    getPaymentUrl(
                        response.data
                    );

                if (!paymentUrl) {
                    throw new Error(
                        "Payment Service không trả paymentUrl."
                    );
                }

                window.location.href =
                    paymentUrl;
            } catch (requestError) {
                setError(
                    getErrorMessage(
                        requestError,
                        "Không thể tạo thanh toán VNPay."
                    )
                );
            } finally {
                setPayingId(null);
            }
        };

    const cancelBooking =
        async (booking) => {
            if (
                !window.confirm(
                    "Bạn chắc chắn muốn hủy booking chưa thanh toán này?"
                )
            ) {
                return;
            }

            try {
                setCancellingId(
                    booking.id
                );

                setError("");

                /*
                 * Không dùng DELETE.
                 * Phải giữ lịch sử booking.
                 */
                await axiosClient.put(
                    `/booking-service/bookings/${booking.id}/cancel`
                );

                await loadMyBookings();
            } catch (requestError) {
                setError(
                    getErrorMessage(
                        requestError,
                        "Không thể hủy booking."
                    )
                );
            } finally {
                setCancellingId(
                    null
                );
            }
        };

    const formatMoney =
        (value) => {
            return `${Number(
                value || 0
            ).toLocaleString(
                "vi-VN"
            )} đ`;
        };

    const formatDateTime =
        (value) => {
            if (!value) {
                return "Đang cập nhật";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(
                    value
                ).replace(
                    "T",
                    " "
                );
            }

            return date.toLocaleString(
                "vi-VN"
            );
        };

    const getEventImage =
        (event) => {
            const image =
                event?.banner ||
                event?.bannerUrl ||
                event?.imageUrl ||
                event?.thumbnail;

            if (!image) {
                return "";
            }

            if (
                image.startsWith(
                    "http://localhost:8084"
                )
            ) {
                return image.replace(
                    "http://localhost:8084",
                    "/api/event-service"
                );
            }

            if (
                image.startsWith(
                    "http://event-service:8084"
                )
            ) {
                return image.replace(
                    "http://event-service:8084",
                    "/api/event-service"
                );
            }

            if (
                image.startsWith(
                    "/uploads"
                )
            ) {
                return `/api/event-service${image}`;
            }

            return image;
        };

    const getStatusInfo =
        (value) => {
            const normalized =
                String(
                    value || ""
                ).toUpperCase();

            if (
                normalized === "PAID"
            ) {
                return {
                    label:
                        "Đã thanh toán",
                    className:
                        "bg-emerald-400 text-slate-950",
                    icon: Ticket,
                };
            }

            if (
                normalized ===
                "PENDING"
            ) {
                return {
                    label:
                        "Chờ thanh toán",
                    className:
                        "bg-amber-400 text-slate-950",
                    icon: Clock,
                };
            }

            if (
                normalized ===
                "EXPIRED"
            ) {
                return {
                    label:
                        "Đã hết hạn",
                    className:
                        "bg-slate-300 text-slate-800",
                    icon: XCircle,
                };
            }

            if (
                normalized ===
                "FAILED"
            ) {
                return {
                    label:
                        "Thanh toán thất bại",
                    className:
                        "bg-red-500 text-white",
                    icon: XCircle,
                };
            }

            return {
                label: "Đã hủy",
                className:
                    "bg-red-500 text-white",
                icon: XCircle,
            };
        };

    const pageNumbers =
        useMemo(() => {
            if (totalPages <= 1) {
                return [];
            }

            const start =
                Math.max(
                    0,
                    page - 2
                );

            const end =
                Math.min(
                    totalPages,
                    start + 5
                );

            return Array.from(
                {
                    length:
                        end - start,
                },
                (_, index) =>
                    start + index
            );
        }, [
            page,
            totalPages,
        ]);

    return (
        <div className="min-h-screen bg-[#111317] text-white">
            <section className="border-b border-white/10 bg-[#08090b]">
                <div className="mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                                <ReceiptText
                                    size={16}
                                />
                                Booking của tôi
                            </div>

                            <h1 className="mt-5 text-4xl font-black md:text-5xl">
                                Đơn đặt vé của
                                tôi
                            </h1>

                            <p className="mt-4 max-w-2xl text-slate-300">
                                Theo dõi trạng
                                thái, thanh toán
                                VNPay và xem vé
                                QR.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                loadMyBookings
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-slate-950"
                        >
                            <RefreshCw
                                size={18}
                            />
                            Reload
                        </button>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">
                {error && (
                    <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        <AlertCircle
                            size={20}
                        />
                        {error}
                    </div>
                )}

                <form
                    onSubmit={submitSearch}
                    className="grid grid-cols-1 gap-4 rounded-[28px] border border-white/10 bg-[#1b1f27] p-5 md:grid-cols-12"
                >
                    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 md:col-span-6">
                        <Search
                            size={18}
                        />

                        <input
                            value={
                                keywordInput
                            }
                            onChange={(
                                event
                            ) =>
                                setKeywordInput(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Tìm mã booking..."
                            className="flex-1 bg-transparent outline-none"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target
                                    .value
                            );
                            setPage(0);
                        }}
                        className="rounded-2xl bg-[#1b1f27] px-4 md:col-span-3"
                    >
                        <option value="ALL">
                            Tất cả
                        </option>
                        <option value="PENDING">
                            Chờ thanh toán
                        </option>
                        <option value="PAID">
                            Đã thanh toán
                        </option>
                        <option value="CANCELLED">
                            Đã hủy
                        </option>
                        <option value="EXPIRED">
                            Đã hết hạn
                        </option>
                        <option value="FAILED">
                            Thất bại
                        </option>
                    </select>

                    <div className="flex gap-2 md:col-span-3">
                        <button
                            type="submit"
                            className="flex-1 rounded-2xl bg-emerald-500 font-black"
                        >
                            Tìm
                        </button>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="rounded-2xl bg-white/10 px-4"
                        >
                            Xóa
                        </button>
                    </div>
                </form>

                <div className="mt-6 flex items-center justify-between">
                    <div>
                        Tìm thấy{" "}
                        <strong className="text-emerald-300">
                            {totalElements}
                        </strong>{" "}
                        booking
                    </div>

                    <select
                        value={size}
                        onChange={(event) => {
                            setSize(
                                Number(
                                    event.target
                                        .value
                                )
                            );
                            setPage(0);
                        }}
                        className="rounded-xl bg-[#1b1f27] px-3 py-2"
                    >
                        <option value={3}>
                            3 / trang
                        </option>
                        <option value={6}>
                            6 / trang
                        </option>
                        <option value={12}>
                            12 / trang
                        </option>
                    </select>
                </div>

                {loading ? (
                    <div className="mt-6 flex min-h-60 items-center justify-center rounded-3xl bg-white/5">
                        <Loader2
                            className="animate-spin"
                        />
                    </div>
                ) : bookings.length ===
                    0 ? (
                    <div className="mt-6 rounded-3xl bg-white/5 p-10 text-center">
                        Không có booking.
                    </div>
                ) : (
                    <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {bookings.map(
                            (booking) => {
                                const event =
                                    eventsById[
                                    booking
                                        .eventId
                                    ];

                                const info =
                                    getStatusInfo(
                                        booking.status
                                    );

                                const StatusIcon =
                                    info.icon;

                                const image =
                                    getEventImage(
                                        event
                                    );

                                return (
                                    <article
                                        key={
                                            booking.id
                                        }
                                        className="overflow-hidden rounded-3xl border border-white/10 bg-[#1f232b]"
                                    >
                                        <div className="grid sm:grid-cols-[190px_1fr]">
                                            <div className="min-h-48 bg-slate-800">
                                                {image ? (
                                                    <img
                                                        src={
                                                            image
                                                        }
                                                        alt={
                                                            event?.name
                                                        }
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center">
                                                        <Ticket
                                                            size={
                                                                48
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-5">
                                                <div className="flex justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-black text-emerald-300">
                                                            {
                                                                booking.bookingCode
                                                            }
                                                        </div>

                                                        <h2 className="mt-2 text-xl font-black">
                                                            {event?.name ||
                                                                `Event #${booking.eventId}`}
                                                        </h2>
                                                    </div>

                                                    <span
                                                        className={`inline-flex h-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${info.className}`}
                                                    >
                                                        <StatusIcon
                                                            size={
                                                                14
                                                            }
                                                        />
                                                        {
                                                            info.label
                                                        }
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-2 text-sm text-slate-400">
                                                    <div className="flex gap-2">
                                                        <CalendarDays
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        {formatDateTime(
                                                            booking.bookingDate
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Clock
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        Hết hạn:{" "}
                                                        {formatDateTime(
                                                            booking.expiresAt
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <MapPin
                                                            size={
                                                                16
                                                            }
                                                        />
                                                        {event?.location ||
                                                            "Đang cập nhật"}
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                                    <div className="text-xl font-black text-emerald-300">
                                                        {formatMoney(
                                                            booking.totalAmount
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {booking.status ===
                                                            "PENDING" && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            payingId ===
                                                                            booking.id
                                                                        }
                                                                        onClick={() =>
                                                                            payAgain(
                                                                                booking
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 font-bold"
                                                                    >
                                                                        <CreditCard
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        Thanh
                                                                        toán
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            cancellingId ===
                                                                            booking.id
                                                                        }
                                                                        onClick={() =>
                                                                            cancelBooking(
                                                                                booking
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 font-bold"
                                                                    >
                                                                        <XCircle
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        Hủy
                                                                    </button>
                                                                </>
                                                            )}

                                                        <Link
                                                            to={`/my-tickets?bookingId=${booking.id}`}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 font-bold"
                                                        >
                                                            <Eye
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                            Vé
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </section>
                )}

                {totalPages > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                        <button
                            type="button"
                            disabled={
                                page === 0
                            }
                            onClick={() =>
                                setPage(
                                    (
                                        current
                                    ) =>
                                        Math.max(
                                            0,
                                            current -
                                            1
                                        )
                                )
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
                        >
                            <ChevronLeft
                                size={18}
                            />
                        </button>

                        {pageNumbers.map(
                            (number) => (
                                <button
                                    key={
                                        number
                                    }
                                    type="button"
                                    onClick={() =>
                                        setPage(
                                            number
                                        )
                                    }
                                    className={`h-11 min-w-11 rounded-xl ${page ===
                                        number
                                        ? "bg-emerald-500"
                                        : "bg-white/10"
                                        }`}
                                >
                                    {number +
                                        1}
                                </button>
                            )
                        )}

                        <button
                            type="button"
                            disabled={
                                page + 1 >=
                                totalPages
                            }
                            onClick={() =>
                                setPage(
                                    (
                                        current
                                    ) =>
                                        current +
                                        1
                                )
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
                        >
                            <ChevronRight
                                size={18}
                            />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default MyBookings;