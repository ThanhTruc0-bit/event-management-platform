import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    QrCode,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldCheck,
    Ticket,
    Trash2,
    X,
    XCircle,
} from "lucide-react";

const DEFAULT_FILTERS = {
    keyword: "",
    status: "",
    ticketType: "",
    userId: "",
    eventId: "",
    bookingId: "",
    sortBy: "issuedAt",
    sortDirection: "desc",
};

const TICKET_STATUSES = [
    "VALID",
    "ACTIVE",
    "PAID",
    "USED",
    "CHECKED_IN",
    "CANCELLED",
    "EXPIRED",
    "FAILED",
];

const VALID_STATUSES = [
    "VALID",
    "ACTIVE",
    "PAID",
];

const USED_STATUSES = [
    "USED",
    "CHECKED_IN",
];

const INVALID_STATUSES = [
    "CANCELLED",
    "EXPIRED",
    "FAILED",
];

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    if (Array.isArray(data?.data?.content)) {
        return data.data.content;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    return [];
}

function normalizePage(
    data,
    fallbackSize = 10
) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements: data.length,
            totalPages:
                data.length > 0
                    ? 1
                    : 0,
            number: 0,
            size: data.length,
        };
    }

    const pageData =
        data?.data?.content
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

        number:
            Number(
                pageData?.number
            ) || 0,

        size:
            Number(
                pageData?.size
            ) || fallbackSize,
    };
}

function buildMap(items) {
    return items.reduce(
        (result, item) => {
            if (
                item?.id !== null &&
                item?.id !== undefined
            ) {
                result[
                    String(item.id)
                ] = item;
            }

            return result;
        },
        {}
    );
}

function getErrorMessage(
    error,
    fallback
) {
    const status =
        error?.response?.status;

    const data =
        error?.response?.data;

    const message =
        (
            typeof data === "string"
                ? data
                : data?.message ||
                data?.error
        ) ||
        error?.message;

    if (status === 401) {
        return (
            message ||
            "Phiên đăng nhập đã hết hạn."
        );
    }

    if (status === 403) {
        return (
            message ||
            "Bạn không có quyền quản lý vé."
        );
    }

    if (status === 409) {
        return (
            message ||
            "Dữ liệu vé đã thay đổi hoặc thao tác không hợp lệ."
        );
    }

    return (
        message ||
        fallback
    );
}

async function fetchAllPages(
    endpoint,
    params = {},
    maxPages = 30
) {
    const firstResponse =
        await axiosClient.get(
            endpoint,
            {
                params: {
                    ...params,
                    page: 0,
                    size: 100,
                },
            }
        );

    if (
        Array.isArray(
            firstResponse.data
        )
    ) {
        return firstResponse.data;
    }

    const firstPage =
        normalizePage(
            firstResponse.data,
            100
        );

    const result = [
        ...firstPage.content,
    ];

    const totalPages =
        Math.min(
            firstPage.totalPages,
            maxPages
        );

    for (
        let currentPage = 1;
        currentPage < totalPages;
        currentPage += 1
    ) {
        const response =
            await axiosClient.get(
                endpoint,
                {
                    params: {
                        ...params,
                        page:
                            currentPage,
                        size: 100,
                    },
                }
            );

        result.push(
            ...normalizeList(
                response.data
            )
        );
    }

    return result;
}

function formatMoney(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Chưa cập nhật";
    }

    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return String(value);
    }

    if (number === 0) {
        return "Miễn phí";
    }

    return `${number.toLocaleString(
        "vi-VN"
    )} đ`;
}

function formatDateTime(value) {
    if (!value) {
        return "Chưa cập nhật";
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
}

function getQrImage(ticket) {
    const image =
        ticket?.qrImage ||
        ticket?.qrCodeImage ||
        ticket?.qrImageUrl ||
        ticket?.imageUrl;

    if (!image) {
        return "";
    }

    const value =
        String(image);

    if (
        value.startsWith(
            "data:image"
        ) ||
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

function getStatusInfo(status) {
    const value =
        normalizeStatus(status);

    if (
        VALID_STATUSES.includes(
            value
        )
    ) {
        return {
            text: value,

            icon:
                CheckCircle2,

            className:
                "bg-emerald-100 text-emerald-700",

            borderClass:
                "border-emerald-200",
        };
    }

    if (
        USED_STATUSES.includes(
            value
        )
    ) {
        return {
            text: value,

            icon:
                ShieldCheck,

            className:
                "bg-blue-100 text-blue-700",

            borderClass:
                "border-blue-200",
        };
    }

    if (
        INVALID_STATUSES.includes(
            value
        )
    ) {
        return {
            text: value,

            icon:
                XCircle,

            className:
                "bg-red-100 text-red-700",

            borderClass:
                "border-red-200",
        };
    }

    return {
        text:
            value ||
            "UNKNOWN",

        icon:
            Ticket,

        className:
            "bg-slate-100 text-slate-700",

        borderClass:
            "border-slate-200",
    };
}

function Tickets() {
    const [
        tickets,
        setTickets,
    ] = useState([]);

    const [
        eventsById,
        setEventsById,
    ] = useState({});

    const [
        usersById,
        setUsersById,
    ] = useState({});

    const [
        seatsById,
        setSeatsById,
    ] = useState({});

    const [
        bookingsById,
        setBookingsById,
    ] = useState({});

    const [
        filters,
        setFilters,
    ] = useState({
        ...DEFAULT_FILTERS,
    });

    const [
        appliedFilters,
        setAppliedFilters,
    ] = useState({
        ...DEFAULT_FILTERS,
    });

    const [
        page,
        setPage,
    ] = useState(0);

    const [
        size,
        setSize,
    ] = useState(10);

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
        referenceLoading,
        setReferenceLoading,
    ] = useState(false);

    const [
        actionId,
        setActionId,
    ] = useState(null);

    const [
        error,
        setError,
    ] = useState("");

    const [
        selectedTicket,
        setSelectedTicket,
    ] = useState(null);

    useEffect(() => {
        loadReferenceData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadTickets();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        size,
        appliedFilters,
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

    const loadReferenceData =
        async () => {
            try {
                setReferenceLoading(
                    true
                );

                const [
                    eventResult,
                    userResult,
                    seatResult,
                    bookingResult,
                ] =
                    await Promise.allSettled([
                        fetchAllPages(
                            "/event-service/events",
                            {
                                publicOnly:
                                    false,

                                sortBy:
                                    "eventDate",

                                sortDirection:
                                    "asc",
                            }
                        ),

                        fetchAllPages(
                            "/user-service/users",
                            {
                                sortBy:
                                    "id",

                                sortDirection:
                                    "asc",
                            }
                        ),

                        fetchAllPages(
                            "/seat-service/seats",
                            {
                                sortBy:
                                    "id",

                                sortDirection:
                                    "asc",
                            }
                        ),

                        fetchAllPages(
                            "/booking-service/bookings",
                            {
                                sortBy:
                                    "bookingDate",

                                sortDirection:
                                    "desc",
                            }
                        ),
                    ]);

                setEventsById(
                    eventResult.status ===
                        "fulfilled"
                        ? buildMap(
                            eventResult.value
                        )
                        : {}
                );

                setUsersById(
                    userResult.status ===
                        "fulfilled"
                        ? buildMap(
                            userResult.value
                        )
                        : {}
                );

                setSeatsById(
                    seatResult.status ===
                        "fulfilled"
                        ? buildMap(
                            seatResult.value
                        )
                        : {}
                );

                setBookingsById(
                    bookingResult.status ===
                        "fulfilled"
                        ? buildMap(
                            bookingResult.value
                        )
                        : {}
                );

                if (
                    eventResult.status ===
                    "rejected"
                ) {
                    console.warn(
                        "Không tải được sự kiện:",
                        eventResult.reason
                    );
                }

                if (
                    userResult.status ===
                    "rejected"
                ) {
                    console.warn(
                        "Không tải được người dùng:",
                        userResult.reason
                    );
                }

                if (
                    seatResult.status ===
                    "rejected"
                ) {
                    console.warn(
                        "Không tải được ghế:",
                        seatResult.reason
                    );
                }

                if (
                    bookingResult.status ===
                    "rejected"
                ) {
                    console.warn(
                        "Không tải được booking:",
                        bookingResult.reason
                    );
                }
            } finally {
                setReferenceLoading(
                    false
                );
            }
        };

    const loadTickets =
        async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await axiosClient.get(
                        "/ticket-service/tickets",
                        {
                            params: {
                                page,
                                size,

                                keyword:
                                    appliedFilters
                                        .keyword
                                        .trim() ||
                                    undefined,

                                status:
                                    appliedFilters
                                        .status ||
                                    undefined,

                                ticketType:
                                    appliedFilters
                                        .ticketType
                                        .trim() ||
                                    undefined,

                                userId:
                                    appliedFilters
                                        .userId
                                        ? Number(
                                            appliedFilters
                                                .userId
                                        )
                                        : undefined,

                                eventId:
                                    appliedFilters
                                        .eventId
                                        ? Number(
                                            appliedFilters
                                                .eventId
                                        )
                                        : undefined,

                                bookingId:
                                    appliedFilters
                                        .bookingId
                                        ? Number(
                                            appliedFilters
                                                .bookingId
                                        )
                                        : undefined,

                                sortBy:
                                    appliedFilters
                                        .sortBy,

                                sortDirection:
                                    appliedFilters
                                        .sortDirection,
                            },
                        }
                    );

                const pageData =
                    normalizePage(
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

                if (
                    pageData.totalPages >
                    0 &&
                    page >=
                    pageData.totalPages
                ) {
                    setPage(
                        pageData.totalPages -
                        1
                    );
                }
            } catch (
            requestError
            ) {
                console.error(
                    "Không tải được tickets:",
                    requestError
                );

                setTickets([]);
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    getErrorMessage(
                        requestError,
                        "Không tải được danh sách vé."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const reloadAll =
        async () => {
            await Promise.all([
                loadReferenceData(),
                loadTickets(),
            ]);
        };

    const getTicketId =
        (ticket) =>
            ticket?.id ??
            ticket?.ticketId;

    const getEventName =
        (eventId) =>
            eventsById[
                String(eventId)
            ]?.name ||
            `Event #${eventId}`;

    const getUserName =
        (userId) => {
            const user =
                usersById[
                String(userId)
                ];

            return (
                user?.fullName ||
                user?.name ||
                user?.username ||
                user?.email ||
                `User #${userId}`
            );
        };

    const getSeatName =
        (seatId) => {
            const seat =
                seatsById[
                String(seatId)
                ];

            return (
                seat?.seatNumber ||
                seat?.name ||
                seat?.code ||
                `Ghế #${seatId}`
            );
        };

    const getTicketType =
        (ticket) => {
            const seat =
                seatsById[
                String(
                    ticket?.seatId
                )
                ];

            return (
                seat?.seatType ||
                seat?.ticketType ||
                ticket?.ticketType ||
                "STANDARD"
            );
        };

    const getBookingCode =
        (bookingId) => {
            const booking =
                bookingsById[
                String(
                    bookingId
                )
                ];

            return (
                booking?.bookingCode ||
                `Booking #${bookingId}`
            );
        };

    const updateFilter =
        (name, value) => {
            setFilters(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        };

    const validateFilters =
        () => {
            const numericFields = [
                [
                    "User ID",
                    filters.userId,
                ],

                [
                    "Event ID",
                    filters.eventId,
                ],

                [
                    "Booking ID",
                    filters.bookingId,
                ],
            ];

            for (
                const [
                    label,
                    value,
                ] of numericFields
            ) {
                if (
                    value &&
                    (
                        !Number.isInteger(
                            Number(value)
                        ) ||
                        Number(value) <= 0
                    )
                ) {
                    setError(
                        `${label} phải là số nguyên lớn hơn 0.`
                    );

                    return false;
                }
            }

            return true;
        };

    const applyFilters =
        (event) => {
            event.preventDefault();

            if (
                !validateFilters()
            ) {
                return;
            }

            setError("");

            setAppliedFilters({
                ...filters,
            });

            setPage(0);
        };

    const clearFilters =
        () => {
            setFilters({
                ...DEFAULT_FILTERS,
            });

            setAppliedFilters({
                ...DEFAULT_FILTERS,
            });

            setPage(0);
            setError("");
        };

    const updateSelectedTicket =
        (updatedTicket) => {
            if (
                selectedTicket &&
                getTicketId(
                    selectedTicket
                ) ===
                getTicketId(
                    updatedTicket
                )
            ) {
                setSelectedTicket(
                    updatedTicket
                );
            }
        };

    const checkInTicket =
        async (ticket) => {
            const ticketId =
                getTicketId(ticket);

            const status =
                normalizeStatus(
                    ticket?.status
                );

            if (
                !VALID_STATUSES.includes(
                    status
                )
            ) {
                window.alert(
                    "Chỉ vé hợp lệ mới có thể check-in."
                );

                return;
            }

            if (
                !window.confirm(
                    `Xác nhận check-in vé ${ticket?.ticketCode ||
                    ticketId
                    }?`
                )
            ) {
                return;
            }

            try {
                setActionId(
                    ticketId
                );

                setError("");

                const response =
                    await axiosClient.put(
                        `/ticket-service/tickets/${ticketId}/use`
                    );

                if (
                    response?.data
                ) {
                    updateSelectedTicket(
                        response.data
                    );
                }

                await loadTickets();

                window.alert(
                    "Check-in vé thành công."
                );
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                window.alert(
                    getErrorMessage(
                        requestError,
                        "Không thể check-in vé."
                    )
                );
            } finally {
                setActionId(null);
            }
        };

    const regenerateTicketCode =
        async (ticket) => {
            const ticketId =
                getTicketId(ticket);

            const status =
                normalizeStatus(
                    ticket?.status
                );

            if (
                !VALID_STATUSES.includes(
                    status
                )
            ) {
                window.alert(
                    "Chỉ vé hợp lệ mới được tạo lại mã QR."
                );

                return;
            }

            if (
                !window.confirm(
                    "Tạo mã vé và QR mới? Mã cũ sẽ không còn sử dụng được."
                )
            ) {
                return;
            }

            try {
                setActionId(
                    ticketId
                );

                setError("");

                const response =
                    await axiosClient.put(
                        `/ticket-service/tickets/${ticketId}/regenerate-code`
                    );

                if (
                    response?.data
                ) {
                    updateSelectedTicket(
                        response.data
                    );
                }

                await loadTickets();

                window.alert(
                    "Đã tạo mã vé mới."
                );
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                window.alert(
                    getErrorMessage(
                        requestError,
                        "Không thể tạo lại mã vé."
                    )
                );
            } finally {
                setActionId(null);
            }
        };

    const deleteTicket =
        async (ticket) => {
            const ticketId =
                getTicketId(ticket);

            const status =
                normalizeStatus(
                    ticket?.status
                );

            if (
                USED_STATUSES.includes(
                    status
                )
            ) {
                window.alert(
                    "Không được xóa vé đã check-in."
                );

                return;
            }

            if (
                !window.confirm(
                    `Bạn chắc chắn muốn xóa vé ${ticket?.ticketCode ||
                    ticketId
                    }?`
                )
            ) {
                return;
            }

            try {
                setActionId(
                    ticketId
                );

                setError("");

                await axiosClient.delete(
                    `/ticket-service/tickets/${ticketId}`
                );

                if (
                    selectedTicket &&
                    getTicketId(
                        selectedTicket
                    ) === ticketId
                ) {
                    setSelectedTicket(
                        null
                    );
                }

                if (
                    tickets.length === 1 &&
                    page > 0
                ) {
                    setPage(
                        (current) =>
                            current - 1
                    );
                } else {
                    await loadTickets();
                }

                window.alert(
                    "Đã xóa vé."
                );
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                window.alert(
                    getErrorMessage(
                        requestError,
                        "Không thể xóa vé."
                    )
                );
            } finally {
                setActionId(null);
            }
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

    const displayedStart =
        totalElements === 0
            ? 0
            : page * size + 1;

    const displayedEnd =
        Math.min(
            (page + 1) * size,
            totalElements
        );

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 font-black text-blue-600">
                            <Ticket
                                size={20}
                            />

                            TICKET SERVICE
                        </div>

                        <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
                            Quản lý vé QR
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Tìm thấy{" "}
                            <strong className="text-blue-600">
                                {
                                    totalElements
                                }
                            </strong>{" "}
                            vé phù hợp.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            reloadAll
                        }
                        disabled={
                            loading ||
                            referenceLoading
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white hover:bg-black disabled:opacity-60"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading ||
                                    referenceLoading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Làm mới
                    </button>
                </div>
            </section>

            <form
                onSubmit={
                    applyFilters
                }
                className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FilterInput
                        label="Tìm kiếm"
                        icon={
                            <Search
                                size={17}
                            />
                        }
                        value={
                            filters.keyword
                        }
                        placeholder="Mã vé, trạng thái hoặc ID..."
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "keyword",
                                value
                            )
                        }
                    />

                    <FilterSelect
                        label="Trạng thái"
                        value={
                            filters.status
                        }
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "status",
                                value
                            )
                        }
                    >
                        <option value="">
                            Tất cả trạng thái
                        </option>

                        {TICKET_STATUSES.map(
                            (status) => (
                                <option
                                    key={
                                        status
                                    }
                                    value={
                                        status
                                    }
                                >
                                    {
                                        status
                                    }
                                </option>
                            )
                        )}
                    </FilterSelect>

                    <FilterInput
                        label="Loại vé"
                        value={
                            filters.ticketType
                        }
                        placeholder="VIP, STANDARD..."
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "ticketType",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="User ID"
                        type="number"
                        value={
                            filters.userId
                        }
                        placeholder="Ví dụ: 1"
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "userId",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="Event ID"
                        type="number"
                        value={
                            filters.eventId
                        }
                        placeholder="Ví dụ: 3"
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "eventId",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="Booking ID"
                        type="number"
                        value={
                            filters.bookingId
                        }
                        placeholder="Ví dụ: 1"
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "bookingId",
                                value
                            )
                        }
                    />

                    <FilterSelect
                        label="Sắp xếp theo"
                        value={
                            filters.sortBy
                        }
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "sortBy",
                                value
                            )
                        }
                    >
                        <option value="issuedAt">
                            Ngày phát hành
                        </option>

                        <option value="id">
                            Ticket ID
                        </option>

                        <option value="ticketCode">
                            Mã vé
                        </option>

                        <option value="price">
                            Giá vé
                        </option>

                        <option value="status">
                            Trạng thái
                        </option>

                        <option value="bookingId">
                            Booking ID
                        </option>

                        <option value="userId">
                            User ID
                        </option>

                        <option value="eventId">
                            Event ID
                        </option>

                        <option value="seatId">
                            Seat ID
                        </option>

                        <option value="ticketType">
                            Loại vé
                        </option>

                        <option value="usedAt">
                            Ngày check-in
                        </option>
                    </FilterSelect>

                    <FilterSelect
                        label="Thứ tự"
                        value={
                            filters.sortDirection
                        }
                        onChange={(
                            value
                        ) =>
                            updateFilter(
                                "sortDirection",
                                value
                            )
                        }
                    >
                        <option value="desc">
                            Giảm dần
                        </option>

                        <option value="asc">
                            Tăng dần
                        </option>
                    </FilterSelect>
                </div>

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                        className="h-11 rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500"
                    >
                        <option value={5}>
                            5 / trang
                        </option>

                        <option value={10}>
                            10 / trang
                        </option>

                        <option value={20}>
                            20 / trang
                        </option>

                        <option value={50}>
                            50 / trang
                        </option>
                    </select>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-5 font-black text-slate-700 hover:bg-slate-200"
                        >
                            <RotateCcw
                                size={17}
                            />

                            Xóa bộ lọc
                        </button>

                        <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 font-black text-white hover:bg-blue-700"
                        >
                            <Search
                                size={17}
                            />

                            Áp dụng
                        </button>
                    </div>
                </div>
            </form>

            {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle
                        size={20}
                        className="mt-0.5 shrink-0"
                    />

                    <div className="font-semibold">
                        {error}
                    </div>
                </div>
            )}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Hiển thị{" "}
                        <strong className="text-slate-900">
                            {
                                displayedStart
                            }
                            -
                            {
                                displayedEnd
                            }
                        </strong>{" "}
                        trong tổng số{" "}
                        <strong className="text-slate-900">
                            {
                                totalElements
                            }
                        </strong>{" "}
                        vé
                    </span>

                    {referenceLoading && (
                        <span className="inline-flex items-center gap-2">
                            <Loader2
                                size={15}
                                className="animate-spin"
                            />

                            Đang tải dữ liệu liên quan...
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="p-14 text-center text-slate-500">
                        <Loader2
                            size={36}
                            className="mx-auto animate-spin"
                        />

                        <div className="mt-4 font-semibold">
                            Đang tải danh sách vé...
                        </div>
                    </div>
                ) : tickets.length ===
                    0 ? (
                    <div className="p-14 text-center text-slate-500">
                        <Ticket
                            size={55}
                            className="mx-auto text-slate-300"
                        />

                        <h2 className="mt-4 text-xl font-black text-slate-700">
                            Không có vé phù hợp
                        </h2>

                        <p className="mt-2">
                            Thử xóa hoặc thay đổi bộ lọc.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                        {tickets.map(
                            (ticket) => {
                                const ticketId =
                                    getTicketId(
                                        ticket
                                    );

                                const status =
                                    normalizeStatus(
                                        ticket.status
                                    );

                                const statusInfo =
                                    getStatusInfo(
                                        status
                                    );

                                const qrImage =
                                    getQrImage(
                                        ticket
                                    );

                                const processing =
                                    actionId ===
                                    ticketId;

                                return (
                                    <TicketCard
                                        key={
                                            ticketId
                                        }
                                        ticket={
                                            ticket
                                        }
                                        eventName={getEventName(
                                            ticket.eventId
                                        )}
                                        seatName={getSeatName(
                                            ticket.seatId
                                        )}
                                        ticketType={getTicketType(
                                            ticket
                                        )}
                                        userName={getUserName(
                                            ticket.userId
                                        )}
                                        bookingCode={getBookingCode(
                                            ticket.bookingId
                                        )}
                                        qrImage={
                                            qrImage
                                        }
                                        statusInfo={
                                            statusInfo
                                        }
                                        processing={
                                            processing
                                        }
                                        onView={() =>
                                            setSelectedTicket(
                                                ticket
                                            )
                                        }
                                        onCheckIn={() =>
                                            checkInTicket(
                                                ticket
                                            )
                                        }
                                        onRegenerate={() =>
                                            regenerateTicketCode(
                                                ticket
                                            )
                                        }
                                        onDelete={() =>
                                            deleteTicket(
                                                ticket
                                            )
                                        }
                                    />
                                );
                            }
                        )}
                    </div>
                )}
            </section>

            {totalPages > 1 && (
                <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                        Trang{" "}
                        <span className="font-black text-slate-900">
                            {page + 1}
                        </span>{" "}
                        /{" "}
                        <span className="font-black text-slate-900">
                            {
                                totalPages
                            }
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <PageButton
                            disabled={
                                page === 0 ||
                                loading
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
                        >
                            <ChevronLeft
                                size={18}
                            />
                        </PageButton>

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
                                    className={`h-10 min-w-10 rounded-full border px-3 font-black transition ${pageNumber ===
                                        page
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {pageNumber +
                                        1}
                                </button>
                            )
                        )}

                        <PageButton
                            disabled={
                                page >=
                                totalPages -
                                1 ||
                                loading
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
                        >
                            <ChevronRight
                                size={18}
                            />
                        </PageButton>
                    </div>
                </div>
            )}

            {selectedTicket && (
                <TicketModal
                    ticket={
                        selectedTicket
                    }
                    eventName={getEventName(
                        selectedTicket.eventId
                    )}
                    seatName={getSeatName(
                        selectedTicket.seatId
                    )}
                    ticketType={getTicketType(
                        selectedTicket
                    )}
                    bookingCode={getBookingCode(
                        selectedTicket.bookingId
                    )}
                    userName={getUserName(
                        selectedTicket.userId
                    )}
                    processing={
                        actionId ===
                        getTicketId(
                            selectedTicket
                        )
                    }
                    onClose={() =>
                        setSelectedTicket(
                            null
                        )
                    }
                    onCheckIn={() =>
                        checkInTicket(
                            selectedTicket
                        )
                    }
                    onRegenerate={() =>
                        regenerateTicketCode(
                            selectedTicket
                        )
                    }
                />
            )}
        </div>
    );
}

function TicketCard({
    ticket,
    eventName,
    seatName,
    ticketType,
    userName,
    bookingCode,
    qrImage,
    statusInfo,
    processing,
    onView,
    onCheckIn,
    onRegenerate,
    onDelete,
}) {
    const StatusIcon =
        statusInfo.icon;

    const status =
        normalizeStatus(
            ticket.status
        );

    const canUse =
        VALID_STATUSES.includes(
            status
        );

    const canDelete =
        !USED_STATUSES.includes(
            status
        );

    return (
        <article
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${statusInfo.borderClass}`}
        >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div className="flex min-w-0 items-center gap-4">
                    {qrImage ? (
                        <button
                            type="button"
                            onClick={
                                onView
                            }
                            className="shrink-0 rounded-2xl transition hover:scale-105"
                        >
                            <img
                                src={
                                    qrImage
                                }
                                alt={
                                    ticket.ticketCode ||
                                    "QR Ticket"
                                }
                                className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain"
                            />
                        </button>
                    ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <QrCode
                                size={34}
                            />
                        </div>
                    )}

                    <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Mã vé
                        </div>

                        <div
                            title={
                                ticket.ticketCode
                            }
                            className="mt-1 max-w-[230px] truncate text-base font-black text-emerald-600"
                        >
                            {ticket.ticketCode ||
                                `TICKET-${ticket.id}`}
                        </div>

                        <div className="mt-2 text-xs font-semibold text-slate-500">
                            Ticket ID:{" "}
                            {ticket.id ??
                                ticket.ticketId}
                        </div>
                    </div>
                </div>

                <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusInfo.className}`}
                >
                    <StatusIcon
                        size={14}
                    />

                    {
                        statusInfo.text
                    }
                </span>
            </div>

            <div className="space-y-4 p-5">
                <div>
                    <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Sự kiện
                    </div>

                    <div className="mt-1 line-clamp-2 text-lg font-black text-slate-900">
                        {eventName}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TicketInfo
                        label="Ghế"
                        value={
                            seatName
                        }
                    />

                    <TicketInfo
                        label="Loại vé"
                        value={
                            ticketType
                        }
                    />

                    <TicketInfo
                        label="Người dùng"
                        value={
                            userName
                        }
                    />

                    <TicketInfo
                        label="Booking"
                        value={
                            bookingCode
                        }
                    />
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Giá vé
                        </div>

                        <div className="mt-1 text-xl font-black text-emerald-600">
                            {formatMoney(
                                ticket.price
                            )}
                        </div>
                    </div>

                    <div className="sm:text-right">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Ngày phát hành
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-700">
                            {formatDateTime(
                                ticket.issuedAt
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-4">
                <TicketAction
                    onClick={
                        onView
                    }
                    className="bg-slate-700 text-white hover:bg-slate-800"
                >
                    <Eye
                        size={16}
                    />

                    Xem
                </TicketAction>

                {canUse && (
                    <TicketAction
                        onClick={
                            onCheckIn
                        }
                        disabled={
                            processing
                        }
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        {processing ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <ShieldCheck
                                size={16}
                            />
                        )}

                        Check-in
                    </TicketAction>
                )}

                {canUse && (
                    <TicketAction
                        onClick={
                            onRegenerate
                        }
                        disabled={
                            processing
                        }
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <QrCode
                            size={16}
                        />

                        QR mới
                    </TicketAction>
                )}

                {canDelete && (
                    <TicketAction
                        onClick={
                            onDelete
                        }
                        disabled={
                            processing
                        }
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        <Trash2
                            size={16}
                        />

                        Xóa
                    </TicketAction>
                )}
            </div>
        </article>
    );
}

function TicketInfo({
    label,
    value,
}) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div
                title={String(
                    value || ""
                )}
                className="mt-1 truncate text-sm font-bold text-slate-800"
            >
                {value || "—"}
            </div>
        </div>
    );
}

function TicketAction({
    children,
    onClick,
    disabled = false,
    className = "",
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            disabled={
                disabled
            }
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

function TicketModal({
    ticket,
    eventName,
    seatName,
    ticketType,
    bookingCode,
    userName,
    processing,
    onClose,
    onCheckIn,
    onRegenerate,
}) {
    const status =
        normalizeStatus(
            ticket?.status
        );

    const statusInfo =
        getStatusInfo(status);

    const StatusIcon =
        statusInfo.icon;

    const qrImage =
        getQrImage(ticket);

    const canUse =
        VALID_STATUSES.includes(
            status
        );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <button
                    type="button"
                    onClick={
                        onClose
                    }
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                    <X
                        size={19}
                    />
                </button>

                <div className="pr-12">
                    <div className="text-sm font-black text-blue-600">
                        CHI TIẾT VÉ QR
                    </div>

                    <h2 className="mt-2 break-all text-2xl font-black text-slate-950">
                        {ticket.ticketCode ||
                            `TICKET-${ticket.id}`}
                    </h2>

                    <span
                        className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${statusInfo.className}`}
                    >
                        <StatusIcon
                            size={14}
                        />

                        {
                            statusInfo.text
                        }
                    </span>
                </div>

                <div className="mt-6 flex justify-center rounded-3xl bg-slate-100 p-5">
                    {qrImage ? (
                        <img
                            src={
                                qrImage
                            }
                            alt={
                                ticket.ticketCode ||
                                "QR Ticket"
                            }
                            className="h-64 w-64 rounded-2xl bg-white object-contain"
                        />
                    ) : (
                        <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white text-slate-300">
                            <QrCode
                                size={140}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    <ModalRow
                        label="Sự kiện"
                        value={
                            eventName
                        }
                    />

                    <ModalRow
                        label="Ghế / loại vé"
                        value={`${seatName} · ${ticketType}`}
                    />

                    <ModalRow
                        label="Booking"
                        value={
                            bookingCode
                        }
                    />

                    <ModalRow
                        label="Người dùng"
                        value={
                            userName
                        }
                    />

                    <ModalRow
                        label="Giá"
                        value={formatMoney(
                            ticket.price
                        )}
                    />

                    <ModalRow
                        label="Ngày phát hành"
                        value={formatDateTime(
                            ticket.issuedAt
                        )}
                    />

                    <ModalRow
                        label="Ngày sử dụng"
                        value={formatDateTime(
                            ticket.usedAt
                        )}
                    />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    {canUse && (
                        <button
                            type="button"
                            disabled={
                                processing
                            }
                            onClick={
                                onRegenerate
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-100 px-5 font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                        >
                            <QrCode
                                size={17}
                            />

                            Tạo QR mới
                        </button>
                    )}

                    {canUse && (
                        <button
                            type="button"
                            disabled={
                                processing
                            }
                            onClick={
                                onCheckIn
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {processing ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <ShieldCheck
                                    size={17}
                                />
                            )}

                            Check-in
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="h-11 rounded-xl bg-slate-950 px-5 font-bold text-white hover:bg-black"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalRow({
    label,
    value,
}) {
    return (
        <div className="flex items-start justify-between gap-5 p-4">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className="break-all text-right text-sm font-bold text-slate-900">
                {value ||
                    "Chưa cập nhật"}
            </span>
        </div>
    );
}

function FilterInput({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    icon = null,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">
                {label}
            </span>

            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-500">
                {icon && (
                    <span className="text-slate-400">
                        {icon}
                    </span>
                )}

                <input
                    type={type}
                    value={
                        value
                    }
                    placeholder={
                        placeholder
                    }
                    min={
                        type ===
                            "number"
                            ? 1
                            : undefined
                    }
                    onChange={(
                        event
                    ) =>
                        onChange(
                            event.target
                                .value
                        )
                    }
                    className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none"
                />
            </div>
        </label>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    children,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-500">
                {label}
            </span>

            <select
                value={
                    value
                }
                onChange={(event) =>
                    onChange(
                        event.target
                            .value
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-blue-500"
            >
                {children}
            </select>
        </label>
    );
}

function PageButton({
    children,
    onClick,
    disabled,
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            disabled={
                disabled
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-40"
        >
            {children}
        </button>
    );
}

export default Tickets;