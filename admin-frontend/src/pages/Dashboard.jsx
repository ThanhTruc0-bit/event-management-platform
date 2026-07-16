import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    Armchair,
    Bell,
    CalendarDays,
    CreditCard,
    Loader2,
    ReceiptText,
    RefreshCw,
    TrendingUp,
    Users,
} from "lucide-react";

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function unwrapData(data) {
    if (
        data?.data &&
        typeof data.data === "object"
    ) {
        return data.data;
    }

    return data;
}

function normalizePage(data) {
    const payload =
        unwrapData(data);

    if (Array.isArray(payload)) {
        return {
            content: payload,
            totalElements:
                payload.length,
            totalPages:
                payload.length > 0
                    ? 1
                    : 0,
            number: 0,
        };
    }

    if (
        Array.isArray(
            payload?.content
        )
    ) {
        return {
            content:
                payload.content,

            totalElements:
                Number(
                    payload.totalElements
                ) ||
                payload.content.length,

            totalPages:
                Number(
                    payload.totalPages
                ) ||
                (
                    payload.content.length >
                        0
                        ? 1
                        : 0
                ),

            number:
                Number(
                    payload.number
                ) || 0,
        };
    }

    if (
        Array.isArray(
            payload?.items
        )
    ) {
        return {
            content:
                payload.items,

            totalElements:
                Number(
                    payload.totalElements
                ) ||
                payload.items.length,

            totalPages:
                Number(
                    payload.totalPages
                ) ||
                (
                    payload.items.length >
                        0
                        ? 1
                        : 0
                ),

            number:
                Number(
                    payload.number
                ) || 0,
        };
    }

    return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
    };
}

async function fetchAllPages(
    endpoint,
    extraParams = {}
) {
    const firstResponse =
        await axiosClient.get(
            endpoint,
            {
                params: {
                    ...extraParams,
                    page: 0,
                    size:
                        PAGE_SIZE,
                },
            }
        );

    const firstPage =
        normalizePage(
            firstResponse.data
        );

    /*
     * API trả List thì chỉ cần một request.
     */
    if (
        Array.isArray(
            unwrapData(
                firstResponse.data
            )
        )
    ) {
        return firstPage.content;
    }

    const safeTotalPages =
        Math.min(
            Math.max(
                firstPage.totalPages,
                1
            ),
            MAX_PAGES
        );

    if (safeTotalPages <= 1) {
        return firstPage.content;
    }

    const remainingRequests =
        Array.from(
            {
                length:
                    safeTotalPages - 1,
            },
            (_, index) =>
                axiosClient.get(
                    endpoint,
                    {
                        params: {
                            ...extraParams,
                            page:
                                index + 1,
                            size:
                                PAGE_SIZE,
                        },
                    }
                )
        );

    const responses =
        await Promise.all(
            remainingRequests
        );

    return responses.reduce(
        (
            allItems,
            response
        ) => {
            const pageData =
                normalizePage(
                    response.data
                );

            return [
                ...allItems,
                ...pageData.content,
            ];
        },
        firstPage.content
    );
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function formatMoney(value) {
    const number =
        Number(value || 0);

    return `${number.toLocaleString(
        "vi-VN"
    )} đ`;
}

function formatDate(value) {
    const date =
        parseDate(value);

    if (!date) {
        return "Đang cập nhật";
    }

    return date.toLocaleString(
        "vi-VN",
        {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );
}

function getEventImage(event) {
    const rawImage =
        event?.imageUrl ||
        event?.banner ||
        event?.bannerUrl ||
        event?.thumbnail ||
        event?.image ||
        "";

    if (!rawImage) {
        return "";
    }

    const value =
        String(rawImage)
            .trim()
            .replace(/\\/g, "/");

    if (
        value.startsWith(
            "http://localhost:8084"
        ) ||
        value.startsWith(
            "http://event-service:8084"
        )
    ) {
        return value.replace(
            /^http:\/\/(?:localhost|event-service):8084/,
            "/api/event-service"
        );
    }

    if (
        value.startsWith(
            "/uploads/"
        )
    ) {
        return `/api/event-service${value}`;
    }

    if (
        value.startsWith(
            "uploads/"
        )
    ) {
        return `/api/event-service/${value}`;
    }

    return value;
}

function getBookingDate(
    booking
) {
    return (
        parseDate(
            booking?.bookingDate
        ) ||
        parseDate(
            booking?.createdAt
        ) ||
        new Date(0)
    );
}

function getEventDate(event) {
    return (
        parseDate(
            event?.eventDate
        ) ||
        parseDate(
            event?.createdAt
        ) ||
        new Date(0)
    );
}

function getNotificationDate(
    notification
) {
    return (
        parseDate(
            notification?.createdAt
        ) ||
        new Date(0)
    );
}

function Dashboard() {
    const [
        data,
        setData,
    ] = useState({
        users: [],
        events: [],
        seats: [],
        bookings: [],
        payments: [],
        notifications: [],
    });

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    useEffect(() => {
        loadDashboard();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadDashboard =
        async () => {
            try {
                setLoading(true);
                setError("");

                const results =
                    await Promise.allSettled([
                        fetchAllPages(
                            "/user-service/users"
                        ),

                        fetchAllPages(
                            "/event-service/events"
                        ),

                        fetchAllPages(
                            "/seat-service/seats"
                        ),

                        fetchAllPages(
                            "/booking-service/bookings"
                        ),

                        fetchAllPages(
                            "/payment-service/payments"
                        ),

                        fetchAllPages(
                            "/notification-service/notifications"
                        ),
                    ]);

                const serviceNames = [
                    "user-service",
                    "event-service",
                    "seat-service",
                    "booking-service",
                    "payment-service",
                    "notification-service",
                ];

                const [
                    users,
                    events,
                    seats,
                    bookings,
                    payments,
                    notifications,
                ] = results.map(
                    (result) =>
                        result.status ===
                            "fulfilled"
                            ? result.value
                            : []
                );

                setData({
                    users,
                    events,
                    seats,
                    bookings,
                    payments,
                    notifications,
                });

                const failedServices =
                    results
                        .map(
                            (
                                result,
                                index
                            ) =>
                                result.status ===
                                    "rejected"
                                    ? serviceNames[
                                    index
                                    ]
                                    : null
                        )
                        .filter(Boolean);

                if (
                    failedServices.length >
                    0
                ) {
                    setError(
                        `Một số service chưa tải được: ${failedServices.join(
                            ", "
                        )}. Các dữ liệu còn lại vẫn hiển thị.`
                    );
                }
            } catch (requestError) {
                console.error(
                    "Dashboard error:",
                    requestError
                );

                setError(
                    requestError?.response
                        ?.data
                        ?.message ||
                    "Không tải được Dashboard. Kiểm tra API Gateway và các service."
                );
            } finally {
                setLoading(false);
            }
        };

    const statistics =
        useMemo(() => {
            const successfulPayments =
                data.payments.filter(
                    (payment) =>
                        normalizeStatus(
                            payment.status
                        ) ===
                        "SUCCESS"
                );

            const pendingPayments =
                data.payments.filter(
                    (payment) =>
                        normalizeStatus(
                            payment.status
                        ) ===
                        "PENDING"
                );

            const totalRevenue =
                successfulPayments.reduce(
                    (
                        total,
                        payment
                    ) =>
                        total +
                        Number(
                            payment.amount ||
                            0
                        ),
                    0
                );

            const availableSeats =
                data.seats.filter(
                    (seat) =>
                        normalizeStatus(
                            seat.status
                        ) ===
                        "AVAILABLE"
                ).length;

            const reservedSeats =
                data.seats.filter(
                    (seat) =>
                        normalizeStatus(
                            seat.status
                        ) ===
                        "RESERVED"
                ).length;

            const bookedSeats =
                data.seats.filter(
                    (seat) =>
                        normalizeStatus(
                            seat.status
                        ) ===
                        "BOOKED"
                ).length;

            const paidBookings =
                data.bookings.filter(
                    (booking) =>
                        normalizeStatus(
                            booking.status
                        ) ===
                        "PAID"
                ).length;

            const pendingBookings =
                data.bookings.filter(
                    (booking) =>
                        normalizeStatus(
                            booking.status
                        ) ===
                        "PENDING"
                ).length;

            const cancelledBookings =
                data.bookings.filter(
                    (booking) =>
                        normalizeStatus(
                            booking.status
                        ) ===
                        "CANCELLED"
                ).length;

            const unreadNotifications =
                data.notifications.filter(
                    (notification) =>
                        notification.isRead ===
                        false ||
                        notification.read ===
                        false
                ).length;

            const activeEvents =
                data.events.filter(
                    (event) =>
                        [
                            "OPEN",
                            "ACTIVE",
                            "PUBLISHED",
                            "ON_SALE",
                        ].includes(
                            normalizeStatus(
                                event.status
                            )
                        )
                ).length;

            return {
                totalRevenue,
                availableSeats,
                reservedSeats,
                bookedSeats,
                paidBookings,
                pendingBookings,
                cancelledBookings,
                successfulPayments:
                    successfulPayments.length,
                pendingPayments:
                    pendingPayments.length,
                unreadNotifications,
                activeEvents,
            };
        }, [data]);

    const stats =
        useMemo(
            () => [
                {
                    title:
                        "Tổng người dùng",
                    value:
                        data.users.length,
                    icon: Users,
                    sub:
                        "Tài khoản trong hệ thống",
                },
                {
                    title:
                        "Sự kiện đang mở",
                    value:
                        statistics.activeEvents,
                    icon:
                        CalendarDays,
                    sub:
                        `${data.events.length} sự kiện tổng cộng`,
                },
                {
                    title:
                        "Tổng số ghế",
                    value:
                        data.seats.length,
                    icon: Armchair,
                    sub:
                        `${statistics.availableSeats} trống / ${statistics.reservedSeats} giữ chỗ / ${statistics.bookedSeats} đã bán`,
                },
                {
                    title:
                        "Booking",
                    value:
                        data.bookings.length,
                    icon:
                        ReceiptText,
                    sub:
                        `${statistics.pendingBookings} chờ / ${statistics.paidBookings} đã trả / ${statistics.cancelledBookings} đã hủy`,
                },
                {
                    title:
                        "Thanh toán",
                    value:
                        data.payments.length,
                    icon:
                        CreditCard,
                    sub:
                        `${statistics.successfulPayments} thành công / ${statistics.pendingPayments} đang chờ`,
                },
                {
                    title:
                        "Thông báo",
                    value:
                        data.notifications.length,
                    icon: Bell,
                    sub:
                        `${statistics.unreadNotifications} chưa đọc`,
                },
            ],
            [
                data,
                statistics,
            ]
        );

    const recentBookings =
        useMemo(
            () =>
                [...data.bookings]
                    .sort(
                        (a, b) =>
                            getBookingDate(b) -
                            getBookingDate(a)
                    )
                    .slice(0, 5),
            [data.bookings]
        );

    const recentEvents =
        useMemo(
            () =>
                [...data.events]
                    .sort(
                        (a, b) =>
                            getEventDate(b) -
                            getEventDate(a)
                    )
                    .slice(0, 4),
            [data.events]
        );

    const recentNotifications =
        useMemo(
            () =>
                [...data.notifications]
                    .sort(
                        (a, b) =>
                            getNotificationDate(
                                b
                            ) -
                            getNotificationDate(
                                a
                            )
                    )
                    .slice(0, 5),
            [
                data.notifications,
            ]
        );

    const getBookingStatusClass =
        (status) => {
            const normalized =
                normalizeStatus(
                    status
                );

            if (
                normalized === "PAID"
            ) {
                return "bg-emerald-100 text-emerald-700";
            }

            if (
                normalized ===
                "CANCELLED"
            ) {
                return "bg-red-100 text-red-700";
            }

            if (
                normalized ===
                "EXPIRED"
            ) {
                return "bg-slate-100 text-slate-700";
            }

            if (
                normalized ===
                "FAILED"
            ) {
                return "bg-orange-100 text-orange-700";
            }

            return "bg-yellow-100 text-yellow-700";
        };

    const getNotificationTypeClass =
        (type) => {
            const normalized =
                normalizeStatus(
                    type
                );

            if (
                normalized ===
                "BOOKING_CREATED"
            ) {
                return "bg-blue-100 text-blue-700";
            }

            if (
                normalized ===
                "PAYMENT_SUCCESS"
            ) {
                return "bg-emerald-100 text-emerald-700";
            }

            if (
                normalized ===
                "PAYMENT_FAILED"
            ) {
                return "bg-orange-100 text-orange-700";
            }

            if (
                normalized ===
                "TICKET_ISSUED"
            ) {
                return "bg-purple-100 text-purple-700";
            }

            if (
                normalized ===
                "BOOKING_CANCELLED"
            ) {
                return "bg-red-100 text-red-700";
            }

            return "bg-slate-100 text-slate-700";
        };

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-4xl bg-slate-950 text-white">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="p-6 sm:p-9 lg:col-span-7">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-300">
                            <TrendingUp
                                size={16}
                            />

                            Ticket Management Dashboard
                        </div>

                        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                            Quản lý hệ thống đặt vé Microservices
                        </h1>

                        <p className="mt-4 max-w-2xl text-slate-300">
                            Theo dõi sự kiện, ghế, booking, thanh toán và thông báo trên một giao diện quản trị tập trung.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={
                                    loadDashboard
                                }
                                disabled={
                                    loading
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <RefreshCw
                                        size={18}
                                    />
                                )}

                                {loading
                                    ? "Đang tải..."
                                    : "Tải lại dữ liệu"}
                            </button>

                            <Link
                                to="/events"
                                className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
                            >
                                Quản lý sự kiện
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-end bg-linear-to-br from-blue-600 to-cyan-400 p-6 sm:p-9 lg:col-span-5">
                        <div className="w-full rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur">
                            <div className="text-sm text-blue-50">
                                Doanh thu thanh toán thành công
                            </div>

                            <div className="mt-2 break-words text-3xl font-bold sm:text-4xl">
                                {formatMoney(
                                    statistics.totalRevenue
                                )}
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">
                                        Trống
                                    </div>

                                    <div className="text-2xl font-bold">
                                        {
                                            statistics.availableSeats
                                        }
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">
                                        Giữ chỗ
                                    </div>

                                    <div className="text-2xl font-bold">
                                        {
                                            statistics.reservedSeats
                                        }
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white/15 p-4">
                                    <div className="text-sm text-blue-50">
                                        Đã bán
                                    </div>

                                    <div className="text-2xl font-bold">
                                        {
                                            statistics.bookedSeats
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-yellow-700">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {stats.map(
                    (item) => {
                        const Icon =
                            item.icon;

                        return (
                            <div
                                key={
                                    item.title
                                }
                                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">
                                            {
                                                item.title
                                            }
                                        </p>

                                        <h3 className="mt-3 text-4xl font-bold text-slate-900">
                                            {
                                                item.value
                                            }
                                        </h3>
                                    </div>

                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                        <Icon
                                            size={24}
                                        />
                                    </div>
                                </div>

                                <p className="mt-5 text-sm text-slate-500">
                                    {
                                        item.sub
                                    }
                                </p>
                            </div>
                        );
                    }
                )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-7">
                    <div className="flex items-center justify-between border-b p-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Booking mới nhất
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Những booking mới nhất trong hệ thống
                            </p>
                        </div>

                        <Link
                            to="/bookings"
                            className="text-sm font-semibold text-blue-600"
                        >
                            Xem tất cả
                        </Link>
                    </div>

                    <div className="divide-y">
                        {recentBookings.length ===
                            0 ? (
                            <div className="p-6 text-slate-500">
                                Chưa có booking.
                            </div>
                        ) : (
                            recentBookings.map(
                                (
                                    booking
                                ) => (
                                    <Link
                                        to={`/bookings/${booking.id}`}
                                        key={
                                            booking.id
                                        }
                                        className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-slate-900">
                                                {booking.bookingCode ||
                                                    `BOOKING-${booking.id}`}
                                            </div>

                                            <div className="mt-1 text-sm text-slate-500">
                                                User #
                                                {
                                                    booking.userId
                                                }{" "}
                                                · Event #
                                                {
                                                    booking.eventId
                                                }
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {formatDate(
                                                    booking.bookingDate ||
                                                    booking.createdAt
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <div className="font-bold text-slate-900">
                                                {formatMoney(
                                                    booking.totalAmount
                                                )}
                                            </div>

                                            <span
                                                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getBookingStatusClass(
                                                    booking.status
                                                )}`}
                                            >
                                                {normalizeStatus(
                                                    booking.status
                                                ) ||
                                                    "PENDING"}
                                            </span>
                                        </div>
                                    </Link>
                                )
                            )
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
                    <div className="flex items-center justify-between border-b p-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Thông báo mới nhất
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Dữ liệu từ notification-service
                            </p>
                        </div>

                        <Link
                            to="/notifications"
                            className="text-sm font-semibold text-blue-600"
                        >
                            Xem tất cả
                        </Link>
                    </div>

                    <div className="divide-y">
                        {recentNotifications.length ===
                            0 ? (
                            <div className="p-6 text-slate-500">
                                Chưa có thông báo.
                            </div>
                        ) : (
                            recentNotifications.map(
                                (
                                    notification
                                ) => (
                                    <div
                                        key={
                                            notification.id
                                        }
                                        className="p-5 hover:bg-slate-50"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${getNotificationTypeClass(
                                                    notification.type
                                                )}`}
                                            >
                                                {normalizeStatus(
                                                    notification.type
                                                ) ||
                                                    "SYSTEM"}
                                            </span>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${notification.isRead ===
                                                    true ||
                                                    notification.read ===
                                                    true
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                            >
                                                {notification.isRead ===
                                                    true ||
                                                    notification.read ===
                                                    true
                                                    ? "ĐÃ ĐỌC"
                                                    : "CHƯA ĐỌC"}
                                            </span>
                                        </div>

                                        <div className="mt-3 font-semibold text-slate-900">
                                            {notification.title ||
                                                "Thông báo"}
                                        </div>

                                        <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                                            {
                                                notification.message
                                            }
                                        </div>

                                        <div className="mt-2 text-xs text-slate-400">
                                            Booking #
                                            {notification.bookingId ||
                                                "NULL"}{" "}
                                            ·{" "}
                                            {formatDate(
                                                notification.createdAt
                                            )}
                                        </div>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Sự kiện gần đây
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Các sự kiện mới được cập nhật
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                    {recentEvents.length ===
                        0 ? (
                        <div className="text-slate-500 sm:col-span-2 xl:col-span-4">
                            Chưa có sự kiện.
                        </div>
                    ) : (
                        recentEvents.map(
                            (event) => {
                                const imageUrl =
                                    getEventImage(
                                        event
                                    );

                                return (
                                    <Link
                                        to={`/events/${event.id}`}
                                        key={
                                            event.id
                                        }
                                        className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30"
                                    >
                                        <div className="mb-4 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-cyan-400">
                                            {imageUrl ? (
                                                <img
                                                    src={
                                                        imageUrl
                                                    }
                                                    alt={
                                                        event.name ||
                                                        "Sự kiện"
                                                    }
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <CalendarDays
                                                    size={
                                                        36
                                                    }
                                                    className="text-white"
                                                />
                                            )}
                                        </div>

                                        <div className="line-clamp-1 font-semibold text-slate-900">
                                            {event.name ||
                                                `Event #${event.id}`}
                                        </div>

                                        <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                                            {event.location ||
                                                "Đang cập nhật"}
                                        </div>

                                        <div className="mt-2 text-xs font-bold text-blue-600">
                                            {normalizeStatus(
                                                event.status
                                            ) ||
                                                "ACTIVE"}
                                        </div>
                                    </Link>
                                );
                            }
                        )
                    )}
                </div>
            </section>
        </div>
    );
}

export default Dashboard;