import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useNavigate,
    useSearchParams,
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

    const pageData =
        data?.data &&
            typeof data.data === "object"
            ? data.data
            : data;

    return {
        content:
            Array.isArray(
                pageData?.content
            )
                ? pageData.content
                : [],

        totalElements:
            Number(
                pageData?.totalElements
            ) || 0,

        totalPages:
            Number(
                pageData?.totalPages
            ) || 0,
    };
}

function readStoredUser() {
    const keys = [
        "user",
        "currentUser",
        "authUser",
    ];

    for (const key of keys) {
        try {
            const raw =
                localStorage.getItem(
                    key
                );

            if (!raw) {
                continue;
            }

            const parsed =
                JSON.parse(raw);

            const user =
                parsed?.user ||
                parsed;

            if (
                user &&
                typeof user === "object"
            ) {
                return user;
            }
        } catch {
            // Bỏ qua dữ liệu localStorage lỗi.
        }
    }

    return null;
}

function getStoredToken() {
    return (
        localStorage.getItem(
            "accessToken"
        ) ||
        localStorage.getItem(
            "token"
        ) ||
        localStorage.getItem(
            "jwt"
        ) ||
        localStorage.getItem(
            "jwt-token"
        )
    );
}

function decodeJwtPayload(token) {
    try {
        if (
            !token ||
            !token.includes(".")
        ) {
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

        return JSON.parse(
            window.atob(padded)
        );
    } catch {
        return null;
    }
}

function toPositiveNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return null;
    }

    return number;
}

function getCurrentUserId() {
    /*
     * Ưu tiên userId trong JWT vì API Gateway
     * cũng lấy X-User-Id từ JWT này.
     */
    const payload =
        decodeJwtPayload(
            getStoredToken()
        );

    const tokenUserId =
        toPositiveNumber(
            payload?.userId ??
            payload?.uid ??
            payload?.id ??
            payload?.sub
        );

    if (tokenUserId) {
        return tokenUserId;
    }

    /*
     * Chỉ dùng localStorage làm phương án dự phòng.
     */
    const user =
        readStoredUser();

    return toPositiveNumber(
        user?.userId ??
        user?.id ??
        user?.uid
    );
}

function getErrorMessage(
    error,
    fallback
) {
    const status =
        error?.response?.status;

    const backendMessage =
        error?.response
            ?.data
            ?.message ||
        error?.response
            ?.data
            ?.error;

    if (status === 401) {
        return (
            backendMessage ||
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
    }

    if (status === 403) {
        return (
            backendMessage ||
            "Bạn không được phép xem booking này."
        );
    }

    if (status === 404) {
        return (
            backendMessage ||
            "Không tìm thấy booking."
        );
    }

    return (
        backendMessage ||
        error?.message ||
        fallback
    );
}

function getRawEventImage(event) {
    return (
        event?.imageUrl ||
        event?.banner ||
        event?.bannerUrl ||
        event?.thumbnail ||
        event?.image ||
        ""
    );
}

function buildEventImageCandidates(event) {
    const rawImage =
        getRawEventImage(event);

    if (!rawImage) {
        return [];
    }

    const value =
        String(rawImage)
            .trim()
            .replace(/\\/g, "/");

    if (!value) {
        return [];
    }

    const candidates = [];

    const addCandidate =
        (candidate) => {
            if (
                candidate &&
                !candidates.includes(
                    candidate
                )
            ) {
                candidates.push(
                    candidate
                );
            }
        };

    if (
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        addCandidate(value);

        return candidates;
    }

    if (
        value.startsWith(
            "http://localhost:8084"
        ) ||
        value.startsWith(
            "https://localhost:8084"
        ) ||
        value.startsWith(
            "http://event-service:8084"
        ) ||
        value.startsWith(
            "https://event-service:8084"
        )
    ) {
        const relativePath =
            value.replace(
                /^https?:\/\/(?:localhost|event-service):8084/,
                ""
            );

        const path =
            relativePath.startsWith("/")
                ? relativePath
                : `/${relativePath}`;

        addCandidate(
            `/event-service${path}`
        );

        addCandidate(
            `/api/event-service${path}`
        );

        addCandidate(
            `http://localhost:8084${path}`
        );

        return candidates;
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        addCandidate(value);

        return candidates;
    }

    if (
        value.startsWith(
            "/event-service/"
        )
    ) {
        addCandidate(value);

        addCandidate(
            `/api${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "event-service/"
        )
    ) {
        addCandidate(
            `/${value}`
        );

        addCandidate(
            `/api/${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "/api/event-service/"
        )
    ) {
        addCandidate(value);

        addCandidate(
            value.replace(
                /^\/api/,
                ""
            )
        );

        return candidates;
    }

    if (
        value.startsWith(
            "api/event-service/"
        )
    ) {
        addCandidate(
            `/${value}`
        );

        addCandidate(
            `/${value.replace(
                /^api\//,
                ""
            )}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "/uploads/"
        )
    ) {
        addCandidate(
            `/event-service${value}`
        );

        addCandidate(
            `/api/event-service${value}`
        );

        addCandidate(
            `http://localhost:8084${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "uploads/"
        )
    ) {
        addCandidate(
            `/event-service/${value}`
        );

        addCandidate(
            `/api/event-service/${value}`
        );

        addCandidate(
            `http://localhost:8084/${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "events/"
        )
    ) {
        addCandidate(
            `/event-service/uploads/${value}`
        );

        addCandidate(
            `/api/event-service/uploads/${value}`
        );

        addCandidate(
            `http://localhost:8084/uploads/${value}`
        );

        return candidates;
    }

    const fileName =
        value.replace(
            /^\/+/,
            ""
        );

    addCandidate(
        `/event-service/uploads/events/${fileName}`
    );

    addCandidate(
        `/api/event-service/uploads/events/${fileName}`
    );

    addCandidate(
        `http://localhost:8084/uploads/events/${fileName}`
    );

    addCandidate(value);

    return candidates;
}

function EventImage({
    event,
    alt,
    className,
    fallbackClassName,
    fallbackSize = 48,
}) {
    const candidates =
        useMemo(
            () =>
                buildEventImageCandidates(
                    event
                ),
            [
                event?.imageUrl,
                event?.banner,
                event?.bannerUrl,
                event?.thumbnail,
                event?.image,
            ]
        );

    const candidatesKey =
        candidates.join("|");

    const [
        imageIndex,
        setImageIndex,
    ] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [candidatesKey]);

    const currentImage =
        candidates[imageIndex];

    if (!currentImage) {
        return (
            <div
                className={
                    fallbackClassName
                }
            >
                <Ticket
                    size={
                        fallbackSize
                    }
                />
            </div>
        );
    }

    return (
        <img
            key={currentImage}
            src={currentImage}
            alt={
                alt ||
                "Sự kiện"
            }
            className={className}
            loading="lazy"
            decoding="async"
            onError={() => {
                setImageIndex(
                    (current) =>
                        current + 1
                );
            }}
        />
    );
}

function MyBookings() {
    const navigate =
        useNavigate();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const bookingIdParam =
        String(
            searchParams.get(
                "bookingId"
            ) || ""
        ).trim();

    const singleBookingMode =
        Boolean(bookingIdParam);

    const [
        bookings,
        setBookings,
    ] = useState([]);

    const [
        eventsById,
        setEventsById,
    ] = useState({});

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        status,
        setStatus,
    ] = useState("ALL");

    const [
        page,
        setPage,
    ] = useState(0);

    const [
        size,
        setSize,
    ] = useState(6);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        payingId,
        setPayingId,
    ] = useState(null);

    const [
        cancellingId,
        setCancellingId,
    ] = useState(null);

    const [
        error,
        setError,
    ] = useState("");

    /*
     * Khi bookingId trên URL thay đổi:
     * - quay lại trang đầu;
     * - xóa bộ lọc danh sách cũ.
     */
    useEffect(() => {
        setPage(0);
        setKeywordInput("");
        setKeyword("");
        setStatus("ALL");
        setError("");
    }, [bookingIdParam]);

    useEffect(() => {
        loadMyBookings();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        size,
        keyword,
        status,
        bookingIdParam,
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
    }, [
        page,
        totalPages,
    ]);

    const loadEventDetails =
        async (bookingData) => {
            const safeBookings =
                Array.isArray(
                    bookingData
                )
                    ? bookingData
                    : [];

            const eventIds = [
                ...new Set(
                    safeBookings
                        .map(
                            (booking) =>
                                booking?.eventId
                        )
                        .filter(Boolean)
                ),
            ];

            if (
                eventIds.length === 0
            ) {
                setEventsById({});

                return;
            }

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

                                const eventData =
                                    response.data
                                        ?.data ||
                                    response.data;

                                return [
                                    eventId,
                                    eventData,
                                ];
                            } catch (
                            requestError
                            ) {
                                console.error(
                                    `Không tải được event ${eventId}:`,
                                    requestError
                                );

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
                    eventData,
                ]) => {
                    if (eventData) {
                        nextEvents[
                            eventId
                        ] =
                            eventData;
                    }
                }
            );

            setEventsById(
                nextEvents
            );
        };

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

                /*
                 * Có bookingId trên URL:
                 * chỉ gọi API lấy đúng một booking.
                 */
                if (singleBookingMode) {
                    const bookingId =
                        Number(
                            bookingIdParam
                        );

                    if (
                        !Number.isInteger(
                            bookingId
                        ) ||
                        bookingId <= 0
                    ) {
                        throw new Error(
                            "Booking ID không hợp lệ."
                        );
                    }

                    const response =
                        await axiosClient.get(
                            `/booking-service/bookings/${bookingId}`
                        );

                    const booking =
                        response.data
                            ?.data ||
                        response.data;

                    if (
                        !booking ||
                        !booking.id
                    ) {
                        throw new Error(
                            "Không tìm thấy booking."
                        );
                    }

                    /*
                     * Backend đã kiểm tra quyền sở hữu.
                     * Kiểm tra thêm ở frontend để tránh
                     * hiển thị nhầm dữ liệu.
                     */
                    const bookingUserId =
                        toPositiveNumber(
                            booking.userId
                        );

                    if (
                        bookingUserId &&
                        bookingUserId !==
                        userId
                    ) {
                        throw new Error(
                            "Booking không thuộc tài khoản hiện tại."
                        );
                    }

                    setBookings([
                        booking,
                    ]);

                    setTotalElements(1);
                    setTotalPages(1);

                    await loadEventDetails([
                        booking,
                    ]);

                    return;
                }

                /*
                 * Không có bookingId:
                 * tải danh sách booking như bình thường.
                 */
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
            } catch (
            requestError
            ) {
                console.error(
                    "Load my bookings error:",
                    requestError
                );

                setBookings([]);
                setEventsById({});
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    getErrorMessage(
                        requestError,
                        singleBookingMode
                            ? "Không tải được booking."
                            : "Không tải được danh sách booking."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const submitSearch =
        (event) => {
            event.preventDefault();

            /*
             * Nếu đang xem một booking riêng,
             * khi tìm kiếm sẽ trở về danh sách.
             */
            if (singleBookingMode) {
                setSearchParams({});
            }

            setKeyword(
                keywordInput.trim()
            );

            setPage(0);
        };

    const clearFilters =
        () => {
            setKeywordInput("");
            setKeyword("");
            setStatus("ALL");
            setPage(0);
            setError("");

            /*
             * Xóa bookingId khỏi URL để
             * quay lại toàn bộ booking.
             */
            setSearchParams({});
        };

    const getPaymentUrl =
        (data) => {
            if (
                typeof data ===
                "string"
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
                data?.data
                    ?.payUrl ||
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
            } catch (
            requestError
            ) {
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

                await axiosClient.put(
                    `/booking-service/bookings/${booking.id}/cancel`
                );

                await loadMyBookings();
            } catch (
            requestError
            ) {
                setError(
                    getErrorMessage(
                        requestError,
                        "Không thể hủy booking."
                    )
                );
            } finally {
                setCancellingId(null);
            }
        };

    const formatMoney =
        (value) => {
            const number =
                Number(value || 0);

            return `${number.toLocaleString(
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
                return String(value)
                    .replace(
                        "T",
                        " "
                    );
            }

            return date.toLocaleString(
                "vi-VN"
            );
        };

    const getStatusInfo =
        (value) => {
            const normalized =
                String(
                    value || ""
                )
                    .trim()
                    .toUpperCase();

            if (
                normalized ===
                "PAID"
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

            if (
                normalized ===
                "CANCELLED"
            ) {
                return {
                    label:
                        "Đã hủy",

                    className:
                        "bg-red-500 text-white",

                    icon: XCircle,
                };
            }

            return {
                label:
                    normalized ||
                    "Không xác định",

                className:
                    "bg-slate-400 text-slate-950",

                icon: XCircle,
            };
        };

    const pageNumbers =
        useMemo(() => {
            if (
                totalPages <= 1
            ) {
                return [];
            }

            let start =
                Math.max(
                    0,
                    page - 2
                );

            const end =
                Math.min(
                    totalPages,
                    start + 5
                );

            if (
                end - start < 5
            ) {
                start =
                    Math.max(
                        0,
                        end - 5
                    );
            }

            return Array.from(
                {
                    length:
                        Math.max(
                            0,
                            end - start
                        ),
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
                <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                                <ReceiptText
                                    size={16}
                                />

                                Booking của tôi
                            </div>

                            <h1 className="mt-5 text-4xl font-black md:text-5xl">
                                {singleBookingMode
                                    ? `Chi tiết booking #${bookingIdParam}`
                                    : "Đơn đặt vé của tôi"}
                            </h1>

                            <p className="mt-4 max-w-2xl text-slate-300">
                                {singleBookingMode
                                    ? "Đang hiển thị đúng booking được mở từ thông báo."
                                    : "Theo dõi trạng thái booking, thanh toán VNPay và xem vé QR."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {singleBookingMode && (
                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 font-black text-slate-950"
                                >
                                    Xem tất cả booking
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={
                                    loadMyBookings
                                }
                                disabled={
                                    loading
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-slate-950 disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={18}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Tải lại
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
                {error && (
                    <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        <AlertCircle
                            size={20}
                            className="shrink-0"
                        />

                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {singleBookingMode && (
                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-black text-emerald-300">
                                Đang lọc theo Booking ID
                            </div>

                            <div className="mt-1 text-sm text-slate-300">
                                Chỉ hiển thị booking #
                                {bookingIdParam}.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="rounded-xl bg-white/10 px-4 py-2 font-black"
                        >
                            Bỏ lọc
                        </button>
                    </div>
                )}

                {!singleBookingMode && (
                    <form
                        onSubmit={
                            submitSearch
                        }
                        className="grid grid-cols-1 gap-4 rounded-[28px] border border-white/10 bg-[#1b1f27] p-5 md:grid-cols-12"
                    >
                        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 md:col-span-6">
                            <Search
                                size={18}
                                className="text-slate-400"
                            />

                            <input
                                value={
                                    keywordInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setKeywordInput(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="Tìm mã booking..."
                                className="min-w-0 flex-1 bg-transparent outline-none"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(
                                event
                            ) => {
                                setStatus(
                                    event.target
                                        .value
                                );

                                setPage(0);
                            }}
                            className="rounded-2xl border border-white/10 bg-[#242831] px-4 py-3 outline-none md:col-span-3"
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
                                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950"
                            >
                                Tìm
                            </button>

                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="rounded-2xl bg-white/10 px-4 font-black"
                            >
                                Xóa
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        Tìm thấy{" "}
                        <strong className="text-emerald-300">
                            {totalElements}
                        </strong>{" "}
                        booking
                    </div>

                    {!singleBookingMode && (
                        <select
                            value={size}
                            onChange={(
                                event
                            ) => {
                                setSize(
                                    Number(
                                        event.target
                                            .value
                                    )
                                );

                                setPage(0);
                            }}
                            className="rounded-xl border border-white/10 bg-[#1b1f27] px-3 py-2 outline-none"
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
                    )}
                </div>

                {loading ? (
                    <div className="mt-6 flex min-h-60 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                        <Loader2
                            className="animate-spin"
                            size={30}
                        />
                    </div>
                ) : bookings.length ===
                    0 ? (
                    <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                        <ReceiptText
                            size={44}
                            className="mx-auto mb-4 text-slate-500"
                        />

                        <div className="font-black">
                            Không có booking.
                        </div>

                        {singleBookingMode && (
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950"
                            >
                                Quay lại danh sách
                            </button>
                        )}
                    </div>
                ) : (
                    <section className={`mt-6 grid grid-cols-1 gap-5 ${singleBookingMode
                        ? "max-w-4xl"
                        : "lg:grid-cols-2"
                        }`}>
                        {bookings.map(
                            (booking) => {
                                const event =
                                    eventsById[
                                    booking.eventId
                                    ];

                                const info =
                                    getStatusInfo(
                                        booking.status
                                    );

                                const StatusIcon =
                                    info.icon;

                                const normalizedStatus =
                                    String(
                                        booking.status ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase();

                                return (
                                    <article
                                        key={
                                            booking.id
                                        }
                                        className="overflow-hidden rounded-3xl border border-white/10 bg-[#1f232b]"
                                    >
                                        <div className="grid sm:grid-cols-[190px_1fr]">
                                            <div className="min-h-48 overflow-hidden bg-slate-800">
                                                <EventImage
                                                    event={
                                                        event
                                                    }
                                                    alt={
                                                        event?.name ||
                                                        `Event ${booking.eventId}`
                                                    }
                                                    className="h-full min-h-48 w-full object-cover"
                                                    fallbackClassName="flex h-full min-h-48 items-center justify-center bg-linear-to-br from-emerald-500 to-cyan-500"
                                                    fallbackSize={
                                                        48
                                                    }
                                                />
                                            </div>

                                            <div className="p-5">
                                                <div className="flex justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-black text-emerald-300">
                                                            {booking.bookingCode ||
                                                                `BOOKING-${booking.id}`}
                                                        </div>

                                                        <h2 className="mt-2 line-clamp-2 text-xl font-black">
                                                            {event?.name ||
                                                                `Event #${booking.eventId}`}
                                                        </h2>
                                                    </div>

                                                    <span
                                                        className={`inline-flex h-fit shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${info.className}`}
                                                    >
                                                        <StatusIcon
                                                            size={14}
                                                        />

                                                        {
                                                            info.label
                                                        }
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-2 text-sm text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={16}
                                                            className="shrink-0"
                                                        />

                                                        {formatDateTime(
                                                            booking.bookingDate
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Clock
                                                            size={16}
                                                            className="shrink-0"
                                                        />

                                                        <span>
                                                            Hết hạn:{" "}
                                                            {formatDateTime(
                                                                booking.expiresAt
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <MapPin
                                                            size={16}
                                                            className="shrink-0"
                                                        />

                                                        <span className="line-clamp-1">
                                                            {event?.location ||
                                                                "Đang cập nhật"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                                    <div className="text-xl font-black text-emerald-300">
                                                        {formatMoney(
                                                            booking.totalAmount
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {normalizedStatus ===
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
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 font-bold text-slate-950 disabled:opacity-60"
                                                                    >
                                                                        {payingId ===
                                                                            booking.id ? (
                                                                            <Loader2
                                                                                size={16}
                                                                                className="animate-spin"
                                                                            />
                                                                        ) : (
                                                                            <CreditCard
                                                                                size={16}
                                                                            />
                                                                        )}

                                                                        Thanh toán
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
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 font-bold text-white disabled:opacity-60"
                                                                    >
                                                                        {cancellingId ===
                                                                            booking.id ? (
                                                                            <Loader2
                                                                                size={16}
                                                                                className="animate-spin"
                                                                            />
                                                                        ) : (
                                                                            <XCircle
                                                                                size={16}
                                                                            />
                                                                        )}

                                                                        Hủy
                                                                    </button>
                                                                </>
                                                            )}

                                                        <Link
                                                            to={`/my-tickets?bookingId=${booking.id}`}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 font-bold"
                                                        >
                                                            <Eye
                                                                size={16}
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

                {!singleBookingMode &&
                    totalPages > 1 && (
                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                disabled={
                                    page === 0
                                }
                                onClick={() =>
                                    setPage(
                                        (current) =>
                                            Math.max(
                                                0,
                                                current - 1
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
                                (
                                    pageNumber
                                ) => (
                                    <button
                                        key={
                                            pageNumber
                                        }
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                pageNumber
                                            )
                                        }
                                        className={`h-11 min-w-11 rounded-xl font-black ${page ===
                                            pageNumber
                                            ? "bg-emerald-500 text-slate-950"
                                            : "bg-white/10"
                                            }`}
                                    >
                                        {pageNumber +
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
                                        (current) =>
                                            current + 1
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