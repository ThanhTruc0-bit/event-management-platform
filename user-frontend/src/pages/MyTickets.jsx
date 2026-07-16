import { useEffect, useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Home,
    Loader2,
    MapPin,
    QrCode,
    RefreshCw,
    Search,
    ShieldCheck,
    Ticket,
    User,
    XCircle,
} from "lucide-react";

const STATUS_FILTERS = {
    ALL: "",
    VALID: "VALID,ACTIVE,PAID",
    USED: "USED,CHECKED_IN",
    INVALID: "CANCELLED,EXPIRED,FAILED",
};

const TICKET_TYPES = [
    "VIP",
    "STANDARD",
    "STANDING",
];

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

function getStoredAccessToken() {
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

function getCurrentUserId() {
    /*
     * Ưu tiên userId trong JWT vì Gateway
     * cũng lấy X-User-Id từ access token.
     */
    const payload =
        decodeJwtPayload(
            getStoredAccessToken()
        );

    const tokenUserId =
        payload?.userId ??
        payload?.id ??
        payload?.uid ??
        payload?.sub;

    if (
        tokenUserId !== null &&
        tokenUserId !== undefined &&
        tokenUserId !== ""
    ) {
        const number =
            Number(tokenUserId);

        if (
            !Number.isNaN(number)
        ) {
            return number;
        }
    }

    /*
     * Chỉ fallback localStorage khi JWT
     * không chứa userId.
     */
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

            const storedUserId =
                user?.userId ??
                user?.id ??
                user?.uid;

            if (
                storedUserId === null ||
                storedUserId === undefined ||
                storedUserId === ""
            ) {
                continue;
            }

            const number =
                Number(
                    storedUserId
                );

            if (
                !Number.isNaN(number)
            ) {
                return number;
            }
        } catch {
            // Bỏ qua localStorage sai định dạng.
        }
    }

    return null;
}

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function normalizePageData(
    data,
    fallbackSize
) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements:
                data.length,
            totalPages:
                data.length > 0
                    ? 1
                    : 0,
            number: 0,
            size:
                data.length,
        };
    }

    if (
        Array.isArray(
            data?.data?.content
        )
    ) {
        return {
            content:
                data.data.content,

            totalElements:
                Number(
                    data.data
                        .totalElements
                ) || 0,

            totalPages:
                Number(
                    data.data
                        .totalPages
                ) || 0,

            number:
                Number(
                    data.data.number
                ) || 0,

            size:
                Number(
                    data.data.size
                ) || fallbackSize,
        };
    }

    return {
        content:
            Array.isArray(
                data?.content
            )
                ? data.content
                : [],

        totalElements:
            Number(
                data?.totalElements
            ) || 0,

        totalPages:
            Number(
                data?.totalPages
            ) || 0,

        number:
            Number(
                data?.number
            ) || 0,

        size:
            Number(
                data?.size
            ) || fallbackSize,
    };
}

function getNumberValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isNaN(number)
        ? null
        : number;
}

function getTicketId(ticket) {
    return (
        ticket?.id ??
        ticket?.ticketId
    );
}

function getTicketBookingId(
    ticket
) {
    return (
        ticket?.bookingId ??
        ticket?.booking?.id ??
        ticket?.bookingItem
            ?.bookingId
    );
}

function getTicketEventId(
    ticket
) {
    return (
        ticket?.eventId ??
        ticket?.event?.id ??
        ticket?.booking?.eventId
    );
}

function getTicketSeatId(ticket) {
    return (
        ticket?.seatId ??
        ticket?.seat?.id ??
        ticket?.bookingItem
            ?.seatId
    );
}

function getTicketCode(ticket) {
    return (
        ticket?.ticketCode ||
        ticket?.code ||
        ticket?.qrContent ||
        `TICKET-${getTicketId(
            ticket
        )}`
    );
}

function getTicketStatus(ticket) {
    return normalizeStatus(
        ticket?.status ||
        ticket?.ticketStatus ||
        "VALID"
    );
}

function getQrImage(ticket) {
    const image =
        ticket?.qrImage ||
        ticket?.qrCodeImage ||
        ticket?.qrImageUrl;

    if (!image) {
        return "";
    }

    const value =
        String(image);

    if (
        value.startsWith(
            "data:image"
        )
    ) {
        return value;
    }

    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {
        return value;
    }

    if (
        value.startsWith(
            "/uploads"
        )
    ) {
        return `/api/ticket-service${value}`;
    }

    if (
        value.length > 100
    ) {
        return `data:image/png;base64,${value}`;
    }

    return value;
}

function getEventImage(event) {
    const image =
        event?.imageUrl ||
        event?.banner ||
        event?.bannerUrl ||
        event?.thumbnail ||
        event?.image;

    if (!image) {
        return "";
    }

    const value =
        String(image);

    if (
        value.startsWith(
            "http://localhost:8084"
        )
    ) {
        return value.replace(
            "http://localhost:8084",
            "/api/event-service"
        );
    }

    if (
        value.startsWith(
            "http://event-service:8084"
        )
    ) {
        return value.replace(
            "http://event-service:8084",
            "/api/event-service"
        );
    }

    if (
        value.startsWith(
            "/uploads"
        )
    ) {
        return `/api/event-service${value}`;
    }

    return value;
}

function getRequestErrorMessage(
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
            "Bạn không được phép xem vé của tài khoản khác."
        );
    }

    return (
        backendMessage ||
        error?.message ||
        fallback
    );
}

function MyTickets() {
    const navigate =
        useNavigate();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const ticketIdParam =
        searchParams.get(
            "ticketId"
        ) || "";

    const ticketCodeParam =
        searchParams.get(
            "ticketCode"
        ) || "";

    const bookingIdParam =
        searchParams.get(
            "bookingId"
        ) || "";

    const isSingleTicketView =
        Boolean(
            ticketIdParam ||
            ticketCodeParam
        );

    const [
        tickets,
        setTickets,
    ] = useState([]);

    const [
        eventsById,
        setEventsById,
    ] = useState({});

    const [
        seatsById,
        setSeatsById,
    ] = useState({});

    const [
        bookingIdInput,
        setBookingIdInput,
    ] = useState(
        bookingIdParam
    );

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        ticketType,
        setTicketType,
    ] = useState("");

    const [
        activeTab,
        setActiveTab,
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
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const userId =
        useMemo(
            () =>
                getCurrentUserId(),
            []
        );

    useEffect(() => {
        setBookingIdInput(
            bookingIdParam
        );

        if (ticketCodeParam) {
            setKeywordInput(
                ticketCodeParam
            );
        }

        setPage(0);
    }, [
        ticketIdParam,
        ticketCodeParam,
        bookingIdParam,
    ]);

    useEffect(() => {
        if (!userId) {
            navigate(
                "/login",
                {
                    replace: true,
                }
            );

            return;
        }

        loadTickets();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        userId,
        ticketIdParam,
        ticketCodeParam,
        bookingIdParam,
        keyword,
        ticketType,
        activeTab,
        page,
        size,
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

    const getTicketType =
        (ticket) => {
            const seatId =
                getTicketSeatId(
                    ticket
                );

            const seat =
                seatsById[
                String(seatId)
                ];

            return (
                seat?.seatType ||
                seat?.ticketType ||
                ticket?.ticketType ||
                ticket?.seatType ||
                "STANDARD"
            );
        };

    const getSeatLabel =
        (ticket) => {
            const seatId =
                getTicketSeatId(
                    ticket
                );

            const seat =
                seatsById[
                String(seatId)
                ];

            return (
                seat?.seatNumber ||
                ticket?.seatNumber ||
                ticket?.seat
                    ?.seatNumber ||
                (
                    seatId
                        ? `Ghế #${seatId}`
                        : "Đang cập nhật"
                )
            );
        };

    const getTicketPrice =
        (ticket) =>
            getNumberValue(
                ticket?.price
            ) ??
            getNumberValue(
                ticket?.amount
            );

    const getTicketHolder =
        (ticket) =>
            ticket?.holderName ||
            ticket?.customerName ||
            ticket?.userName ||
            "Khách hàng";

    const loadRelatedData =
        async (
            ticketData
        ) => {
            const eventIds = [
                ...new Set(
                    ticketData
                        .map(
                            getTicketEventId
                        )
                        .filter(Boolean)
                ),
            ];

            const seatIds = [
                ...new Set(
                    ticketData
                        .map(
                            getTicketSeatId
                        )
                        .filter(Boolean)
                ),
            ];

            const [
                eventEntries,
                seatEntries,
            ] =
                await Promise.all([
                    Promise.all(
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
                                        String(
                                            eventId
                                        ),
                                        response.data,
                                    ];
                                } catch {
                                    return [
                                        String(
                                            eventId
                                        ),
                                        null,
                                    ];
                                }
                            }
                        )
                    ),

                    Promise.all(
                        seatIds.map(
                            async (
                                seatId
                            ) => {
                                try {
                                    const response =
                                        await axiosClient.get(
                                            `/seat-service/seats/${seatId}`
                                        );

                                    return [
                                        String(
                                            seatId
                                        ),
                                        response.data,
                                    ];
                                } catch {
                                    return [
                                        String(
                                            seatId
                                        ),
                                        null,
                                    ];
                                }
                            }
                        )
                    ),
                ]);

            const nextEvents = {};
            const nextSeats = {};

            eventEntries.forEach(
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

            seatEntries.forEach(
                ([
                    seatId,
                    seatData,
                ]) => {
                    if (seatData) {
                        nextSeats[
                            seatId
                        ] =
                            seatData;
                    }
                }
            );

            setEventsById(
                nextEvents
            );

            setSeatsById(
                nextSeats
            );
        };

    const loadTickets =
        async () => {
            if (!userId) {
                return;
            }

            try {
                setLoading(true);
                setError("");

                /*
                 * Mở từ thông báo có ticketId:
                 * gọi API lấy đúng một vé.
                 */
                if (ticketIdParam) {
                    const ticketId =
                        Number(
                            ticketIdParam
                        );

                    if (
                        !Number.isFinite(
                            ticketId
                        ) ||
                        ticketId <= 0
                    ) {
                        throw new Error(
                            "Ticket ID không hợp lệ."
                        );
                    }

                    const response =
                        await axiosClient.get(
                            `/ticket-service/tickets/${ticketId}`
                        );

                    const ticket =
                        response.data?.data &&
                            typeof response.data
                                .data ===
                            "object"
                            ? response.data
                                .data
                            : response.data;

                    if (
                        !ticket ||
                        typeof ticket !==
                        "object" ||
                        Array.isArray(
                            ticket
                        )
                    ) {
                        throw new Error(
                            "Không tìm thấy dữ liệu vé."
                        );
                    }

                    setTickets([
                        ticket,
                    ]);

                    setTotalElements(
                        1
                    );

                    setTotalPages(
                        1
                    );

                    setPage(0);

                    await loadRelatedData([
                        ticket,
                    ]);

                    return;
                }

                /*
                 * Thông báo cũ chưa có ticketId nhưng
                 * nội dung có mã vé. Tìm trong vé của
                 * user rồi chỉ giữ kết quả khớp chính xác.
                 */
                if (ticketCodeParam) {
                    const normalizedCode =
                        String(
                            ticketCodeParam
                        )
                            .trim()
                            .toUpperCase();

                    if (!normalizedCode) {
                        throw new Error(
                            "Mã vé không hợp lệ."
                        );
                    }

                    const response =
                        await axiosClient.get(
                            `/ticket-service/tickets/user/${userId}/page`,
                            {
                                params: {
                                    page: 0,
                                    size: 100,
                                    keyword:
                                        normalizedCode,
                                    sortBy:
                                        "issuedAt",
                                    sortDirection:
                                        "desc",
                                },
                            }
                        );

                    const pageData =
                        normalizePageData(
                            response.data,
                            100
                        );

                    const exactTickets =
                        pageData.content.filter(
                            (ticket) =>
                                String(
                                    getTicketCode(
                                        ticket
                                    ) || ""
                                )
                                    .trim()
                                    .toUpperCase() ===
                                normalizedCode
                        );

                    const selectedTickets =
                        exactTickets.slice(
                            0,
                            1
                        );

                    setTickets(
                        selectedTickets
                    );

                    setTotalElements(
                        selectedTickets.length
                    );

                    setTotalPages(
                        selectedTickets.length >
                            0
                            ? 1
                            : 0
                    );

                    setPage(0);

                    await loadRelatedData(
                        selectedTickets
                    );

                    if (
                        selectedTickets.length ===
                        0
                    ) {
                        setError(
                            `Không tìm thấy vé có mã ${ticketCodeParam}.`
                        );
                    }

                    return;
                }

                /*
                 * Chế độ danh sách bình thường.
                 * bookingId chỉ là điều kiện lọc.
                 */
                const response =
                    await axiosClient.get(
                        `/ticket-service/tickets/user/${userId}/page`,
                        {
                            params: {
                                page,
                                size,

                                keyword:
                                    keyword
                                        .trim() ||
                                    undefined,

                                status:
                                    STATUS_FILTERS[
                                    activeTab
                                    ] ||
                                    undefined,

                                ticketType:
                                    ticketType ||
                                    undefined,

                                bookingId:
                                    bookingIdParam
                                        ? Number(
                                            bookingIdParam
                                        )
                                        : undefined,

                                sortBy:
                                    "issuedAt",

                                sortDirection:
                                    "desc",
                            },
                        }
                    );

                const pageData =
                    normalizePageData(
                        response.data,
                        size
                    );

                setTickets(
                    pageData.content
                );

                setTotalElements(
                    pageData
                        .totalElements
                );

                setTotalPages(
                    pageData.totalPages
                );

                await loadRelatedData(
                    pageData.content
                );
            } catch (
            requestError
            ) {
                console.error(
                    "Load my tickets error:",
                    requestError
                );

                setTickets([]);
                setEventsById({});
                setSeatsById({});
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    getRequestErrorMessage(
                        requestError,
                        requestError?.message ||
                        "Không tải được danh sách vé."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const submitSearch =
        (event) => {
            event.preventDefault();

            const normalizedBookingId =
                bookingIdInput
                    .trim();

            if (
                normalizedBookingId &&
                (
                    Number.isNaN(
                        Number(
                            normalizedBookingId
                        )
                    ) ||
                    Number(
                        normalizedBookingId
                    ) <= 0
                )
            ) {
                setError(
                    "Booking ID không hợp lệ."
                );

                return;
            }

            setError("");

            setKeyword(
                keywordInput.trim()
            );

            setPage(0);

            const nextParams = {};

            if (
                normalizedBookingId
            ) {
                nextParams.bookingId =
                    normalizedBookingId;
            }

            setSearchParams(
                nextParams
            );
        };

    const clearFilters =
        () => {
            setBookingIdInput("");
            setKeywordInput("");
            setKeyword("");
            setTicketType("");
            setActiveTab("ALL");
            setPage(0);
            setError("");
            setSearchParams({});
        };

    const formatMoney =
        (value) => {
            const number =
                getNumberValue(value);

            if (number === null) {
                return "Đang cập nhật";
            }

            if (number === 0) {
                return "Miễn phí";
            }

            return `${number.toLocaleString(
                "vi-VN"
            )} đ`;
        };

    const formatDate =
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
                "vi-VN",
                {
                    hour:
                        "2-digit",
                    minute:
                        "2-digit",
                    day:
                        "2-digit",
                    month:
                        "2-digit",
                    year:
                        "numeric",
                }
            );
        };

    const getStatusInfo =
        (status) => {
            const value =
                normalizeStatus(
                    status
                );

            if (
                [
                    "VALID",
                    "ACTIVE",
                    "PAID",
                ].includes(value)
            ) {
                return {
                    text:
                        "Hợp lệ",
                    icon:
                        CheckCircle2,
                    className:
                        "bg-emerald-400 text-slate-950",
                };
            }

            if (
                [
                    "USED",
                    "CHECKED_IN",
                ].includes(value)
            ) {
                return {
                    text:
                        "Đã check-in",
                    icon:
                        ShieldCheck,
                    className:
                        "bg-blue-400 text-slate-950",
                };
            }

            return {
                text:
                    value ||
                    "Không hợp lệ",
                icon:
                    XCircle,
                className:
                    "bg-red-500 text-white",
            };
        };

    const pageNumbers =
        useMemo(() => {
            if (
                totalPages <= 0
            ) {
                return [];
            }

            let start =
                Math.max(
                    0,
                    page - 2
                );

            let end =
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
                <div className="mx-auto max-w-375 px-4 py-10 lg:px-8">
                    <Link
                        to="/my-bookings"
                        className="inline-flex items-center gap-2 text-slate-300 transition hover:text-emerald-300"
                    >
                        <ArrowLeft
                            size={17}
                        />

                        Quay lại booking
                    </Link>

                    <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 font-black text-emerald-300">
                                <QrCode
                                    size={18}
                                />

                                VÉ ĐIỆN TỬ
                            </div>

                            <h1 className="mt-3 text-4xl font-black">
                                Vé QR của tôi
                            </h1>

                            <p className="mt-3 text-slate-400">
                                Tổng cộng{" "}
                                {
                                    totalElements
                                }{" "}
                                vé phù hợp.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                loadTickets
                            }
                            disabled={
                                loading
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-slate-950 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            Làm mới
                        </button>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-375 px-4 py-8 lg:px-8">
                {isSingleTicketView && (
                    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-black text-emerald-300">
                                Đang mở đúng một vé từ thông báo
                            </div>

                            <div className="mt-1 text-sm text-slate-400">
                                {ticketIdParam
                                    ? `Ticket ID: ${ticketIdParam}`
                                    : `Mã vé: ${ticketCodeParam}`}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black"
                        >
                            Xem tất cả vé
                        </button>
                    </div>
                )}

                <form
                    onSubmit={
                        submitSearch
                    }
                    className="rounded-[28px] border border-white/10 bg-[#1b1f27] p-5"
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <input
                            type="number"
                            min="1"
                            value={
                                bookingIdInput
                            }
                            onChange={(
                                event
                            ) =>
                                setBookingIdInput(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Booking ID"
                            className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 outline-none focus:border-emerald-400 lg:col-span-3"
                        />

                        <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 lg:col-span-4">
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
                                placeholder="Tìm mã vé, loại vé, trạng thái hoặc ID..."
                                className="min-w-0 flex-1 bg-transparent outline-none"
                            />
                        </div>

                        <select
                            value={
                                ticketType
                            }
                            onChange={(
                                event
                            ) => {
                                setTicketType(
                                    event.target
                                        .value
                                );

                                setPage(0);
                            }}
                            className="h-12 rounded-2xl border border-white/10 bg-[#252932] px-4 outline-none lg:col-span-2"
                        >
                            <option value="">
                                Tất cả loại vé
                            </option>

                            {TICKET_TYPES.map(
                                (type) => (
                                    <option
                                        key={
                                            type
                                        }
                                        value={
                                            type
                                        }
                                    >
                                        {
                                            type
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <button
                            type="submit"
                            className="rounded-2xl bg-emerald-500 font-black text-slate-950 lg:col-span-2"
                        >
                            Tìm kiếm
                        </button>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="rounded-2xl bg-white/10 font-black lg:col-span-1"
                        >
                            Xóa
                        </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        {[
                            [
                                "ALL",
                                "Tất cả",
                            ],
                            [
                                "VALID",
                                "Hợp lệ",
                            ],
                            [
                                "USED",
                                "Đã check-in",
                            ],
                            [
                                "INVALID",
                                "Không hợp lệ",
                            ],
                        ].map(
                            ([
                                key,
                                label,
                            ]) => (
                                <button
                                    key={
                                        key
                                    }
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(
                                            key
                                        );

                                        setPage(
                                            0
                                        );
                                    }}
                                    className={`rounded-full px-4 py-2 text-sm font-black ${activeTab ===
                                        key
                                        ? "bg-emerald-500 text-slate-950"
                                        : "bg-white/10"
                                        }`}
                                >
                                    {
                                        label
                                    }
                                </button>
                            )
                        )}

                        <select
                            value={size}
                            onChange={(
                                event
                            ) => {
                                setSize(
                                    Number(
                                        event
                                            .target
                                            .value
                                    )
                                );

                                setPage(0);
                            }}
                            className="ml-auto rounded-xl border border-white/10 bg-[#1b1f27] px-3 py-2"
                        >
                            <option value={4}>
                                4 / trang
                            </option>

                            <option value={6}>
                                6 / trang
                            </option>

                            <option value={10}>
                                10 / trang
                            </option>

                            <option value={20}>
                                20 / trang
                            </option>
                        </select>
                    </div>
                </form>

                {error && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0"
                        />

                        <div>
                            {error}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="mt-7 p-12 text-center">
                        <Loader2
                            className="mx-auto animate-spin"
                            size={34}
                        />

                        <div className="mt-4 text-slate-400">
                            Đang tải vé...
                        </div>
                    </div>
                ) : tickets.length ===
                    0 ? (
                    <div className="mt-7 rounded-[28px] border border-white/10 bg-[#1f232b] p-12 text-center">
                        <Ticket
                            size={55}
                            className="mx-auto text-slate-500"
                        />

                        <h2 className="mt-4 text-2xl font-black">
                            Không có vé phù hợp
                        </h2>

                        <p className="mt-2 text-slate-400">
                            Thử xóa bộ lọc hoặc kiểm tra lại Booking ID.
                        </p>

                        <Link
                            to="/events"
                            className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-slate-950"
                        >
                            Xem sự kiện

                            <Home
                                size={18}
                            />
                        </Link>
                    </div>
                ) : (
                    <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {tickets.map(
                            (ticket) => {
                                const ticketId =
                                    getTicketId(
                                        ticket
                                    );

                                const eventId =
                                    getTicketEventId(
                                        ticket
                                    );

                                const event =
                                    eventsById[
                                    String(
                                        eventId
                                    )
                                    ];

                                const statusInfo =
                                    getStatusInfo(
                                        getTicketStatus(
                                            ticket
                                        )
                                    );

                                const StatusIcon =
                                    statusInfo.icon;

                                const qrImage =
                                    getQrImage(
                                        ticket
                                    );

                                const eventImage =
                                    getEventImage(
                                        event
                                    );

                                return (
                                    <article
                                        key={
                                            ticketId
                                        }
                                        className="overflow-hidden rounded-[30px] border border-white/10 bg-[#1f232b]"
                                    >
                                        <div className="grid md:grid-cols-[280px_1fr]">
                                            <div className="relative flex flex-col items-center justify-center overflow-hidden bg-[#08090b] p-6">
                                                {eventImage && (
                                                    <img
                                                        src={
                                                            eventImage
                                                        }
                                                        alt=""
                                                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                                                    />
                                                )}

                                                <div className="relative rounded-[28px] bg-white p-4">
                                                    {qrImage ? (
                                                        <img
                                                            src={
                                                                qrImage
                                                            }
                                                            alt={`QR ${getTicketCode(
                                                                ticket
                                                            )}`}
                                                            className="h-52 w-52 object-contain"
                                                        />
                                                    ) : (
                                                        <QrCode
                                                            size={
                                                                180
                                                            }
                                                            className="text-slate-950"
                                                        />
                                                    )}
                                                </div>

                                                <div className="relative mt-5 text-center">
                                                    <div className="text-xs text-slate-400">
                                                        Mã vé
                                                    </div>

                                                    <div className="mt-1 break-all font-black">
                                                        {getTicketCode(
                                                            ticket
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                <div
                                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${statusInfo.className}`}
                                                >
                                                    <StatusIcon
                                                        size={
                                                            15
                                                        }
                                                    />

                                                    {
                                                        statusInfo.text
                                                    }
                                                </div>

                                                <h2 className="mt-4 text-2xl font-black">
                                                    {event?.name ||
                                                        `Event #${eventId}`}
                                                </h2>

                                                <div className="mt-6 space-y-3">
                                                    <InfoCard
                                                        icon={
                                                            <User
                                                                size={
                                                                    18
                                                                }
                                                            />
                                                        }
                                                        label="Người giữ vé"
                                                        value={getTicketHolder(
                                                            ticket
                                                        )}
                                                    />

                                                    <InfoCard
                                                        icon={
                                                            <Ticket
                                                                size={
                                                                    18
                                                                }
                                                            />
                                                        }
                                                        label="Ghế / Loại vé"
                                                        value={`${getSeatLabel(
                                                            ticket
                                                        )} · ${getTicketType(
                                                            ticket
                                                        )}`}
                                                    />

                                                    <InfoCard
                                                        icon={
                                                            <CalendarDays
                                                                size={
                                                                    18
                                                                }
                                                            />
                                                        }
                                                        label="Thời gian"
                                                        value={formatDate(
                                                            event?.eventDate ||
                                                            ticket?.issuedAt
                                                        )}
                                                    />

                                                    <InfoCard
                                                        icon={
                                                            <MapPin
                                                                size={
                                                                    18
                                                                }
                                                            />
                                                        }
                                                        label="Địa điểm"
                                                        value={
                                                            event?.location ||
                                                            "Đang cập nhật"
                                                        }
                                                    />
                                                </div>

                                                <div className="mt-5 rounded-2xl bg-black/20 p-4">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-400">
                                                            Booking
                                                        </span>

                                                        <strong>
                                                            {getTicketBookingId(
                                                                ticket
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div className="mt-3 flex justify-between gap-4">
                                                        <span className="text-slate-400">
                                                            Giá vé
                                                        </span>

                                                        <strong className="text-emerald-400">
                                                            {formatMoney(
                                                                getTicketPrice(
                                                                    ticket
                                                                )
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div className="mt-3 flex justify-between gap-4">
                                                        <span className="text-slate-400">
                                                            Ngày phát hành
                                                        </span>

                                                        <strong className="text-right">
                                                            {formatDate(
                                                                ticket.issuedAt
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
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
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"
                        >
                            <ChevronLeft
                                size={19}
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
                                    className={`h-10 min-w-10 rounded-full px-3 font-black ${pageNumber ===
                                        page
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
                                page >=
                                totalPages - 1
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
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"
                        >
                            <ChevronRight
                                size={19}
                            />
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

function InfoCard({
    icon,
    label,
    value,
}) {
    return (
        <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="shrink-0 text-emerald-400">
                {icon}
            </div>

            <div className="min-w-0">
                <div className="text-xs text-slate-500">
                    {label}
                </div>

                <div className="mt-1 wrap-break-word font-black">
                    {value ||
                        "Đang cập nhật"}
                </div>
            </div>
        </div>
    );
}

export default MyTickets;