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
    Bell,
    CheckCheck,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Loader2,
    ReceiptText,
    RefreshCw,
    Search,
    Ticket,
    Trash2,
} from "lucide-react";

const PAGE_SIZE = 10;

function decodeJwtPayload(token) {
    try {
        if (!token || !token.includes(".")) {
            return null;
        }

        const payload =
            token.split(".")[1];

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

function getCurrentUserId() {
    const token =
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
        );

    const payload =
        decodeJwtPayload(token);

    const tokenUserId =
        payload?.userId ??
        payload?.id ??
        payload?.uid;

    if (
        tokenUserId !== null &&
        tokenUserId !== undefined &&
        tokenUserId !== ""
    ) {
        const number =
            Number(tokenUserId);

        if (!Number.isNaN(number)) {
            return number;
        }
    }

    const keys = [
        "user",
        "currentUser",
        "authUser",
    ];

    for (const key of keys) {
        try {
            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const parsed =
                JSON.parse(raw);

            const user =
                parsed?.user || parsed;

            const storedUserId =
                user?.userId ??
                user?.id ??
                user?.uid;

            if (
                storedUserId !== null &&
                storedUserId !== undefined &&
                storedUserId !== ""
            ) {
                const number =
                    Number(storedUserId);

                if (!Number.isNaN(number)) {
                    return number;
                }
            }
        } catch {
            // Bỏ qua.
        }
    }

    return null;
}

function normalizePage(data) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements:
                data.length,
            totalPages:
                data.length > 0
                    ? 1
                    : 0,
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
    };
}

function isNotificationRead(
    notification
) {
    return (
        notification?.isRead === true ||
        notification?.read === true
    );
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

    return Number.isFinite(number) &&
        number > 0
        ? number
        : null;
}

function getUrlQueryParam(
    url,
    parameterName
) {
    if (!url) {
        return "";
    }

    try {
        const parsedUrl =
            new URL(
                url,
                window.location.origin
            );

        return (
            parsedUrl.searchParams.get(
                parameterName
            ) || ""
        ).trim();
    } catch {
        return "";
    }
}

function getTicketCodeFromNotification(
    notification
) {
    const directTicketCode =
        String(
            notification?.ticketCode ||
            notification?.ticket?.ticketCode ||
            ""
        ).trim();

    if (directTicketCode) {
        return directTicketCode;
    }

    const actionUrl =
        String(
            notification?.actionUrl ||
            ""
        ).trim();

    const ticketCodeFromUrl =
        getUrlQueryParam(
            actionUrl,
            "ticketCode"
        );

    if (ticketCodeFromUrl) {
        return ticketCodeFromUrl;
    }

    const message =
        String(
            notification?.message ||
            ""
        ).trim();

    /*
     * Notification Service hiện tạo nội dung:
     * "Vé {ticketCode} đã được phát hành."
     *
     * Dùng ticketCode này để mở đúng một vé,
     * kể cả thông báo cũ chỉ có bookingId.
     */
    const match =
        message.match(
            /Vé\s+(.+?)\s+đã\s+được\s+phát\s+hành/i
        );

    return match?.[1]?.trim() || "";
}

function getTicketIdFromNotification(
    notification
) {
    const directTicketId =
        toPositiveNumber(
            notification?.ticketId ??
            notification?.ticket?.id
        );

    if (directTicketId) {
        return directTicketId;
    }

    const actionUrl =
        String(
            notification?.actionUrl ||
            ""
        ).trim();

    const ticketIdFromUrl =
        toPositiveNumber(
            getUrlQueryParam(
                actionUrl,
                "ticketId"
            )
        );

    if (ticketIdFromUrl) {
        return ticketIdFromUrl;
    }

    const eventKey =
        String(
            notification?.eventKey ||
            ""
        ).trim();

    const eventKeyMatch =
        eventKey.match(
            /TICKET_ISSUED:(\d+)$/i
        );

    return toPositiveNumber(
        eventKeyMatch?.[1]
    );
}

function getNotificationTarget(
    notification
) {
    const type =
        String(
            notification?.type ||
            ""
        )
            .trim()
            .toUpperCase();

    const actionUrl =
        String(
            notification?.actionUrl ||
            ""
        ).trim();

    const bookingId =
        toPositiveNumber(
            notification?.bookingId
        );

    /*
     * Thông báo phát hành vé phải mở đúng
     * một vé, không mở tất cả vé của booking.
     */
    if (type === "TICKET_ISSUED") {
        const ticketId =
            getTicketIdFromNotification(
                notification
            );

        if (ticketId) {
            return `/my-tickets?ticketId=${ticketId}`;
        }

        const ticketCode =
            getTicketCodeFromNotification(
                notification
            );

        if (ticketCode) {
            return `/my-tickets?ticketCode=${encodeURIComponent(
                ticketCode
            )}`;
        }

        /*
         * Chỉ fallback bookingId khi dữ liệu cũ
         * hoàn toàn không có ticketId/ticketCode.
         */
        if (bookingId) {
            return `/my-tickets?bookingId=${bookingId}`;
        }

        if (actionUrl) {
            return actionUrl;
        }

        return "/my-tickets";
    }

    /*
     * Thanh toán thành công liên quan đến
     * toàn bộ vé trong booking.
     */
    if (
        type === "PAYMENT_SUCCESS" &&
        bookingId
    ) {
        return `/my-tickets?bookingId=${bookingId}`;
    }

    if (
        [
            "BOOKING_CREATED",
            "BOOKING_CANCELLED",
            "PAYMENT_FAILED",
        ].includes(type) &&
        bookingId
    ) {
        return `/my-bookings?bookingId=${bookingId}`;
    }

    if (actionUrl) {
        return actionUrl;
    }

    if (type === "PAYMENT_SUCCESS") {
        return "/my-tickets";
    }

    if (
        [
            "BOOKING_CREATED",
            "BOOKING_CANCELLED",
            "PAYMENT_FAILED",
        ].includes(type)
    ) {
        return "/my-bookings";
    }

    return "";
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
            "Phiên đăng nhập đã hết hạn."
        );
    }

    if (status === 403) {
        return (
            backendMessage ||
            "Thông báo này không thuộc tài khoản hiện tại."
        );
    }

    return (
        backendMessage ||
        error?.message ||
        fallback
    );
}

function getTypeInfo(type) {
    const normalizedType =
        String(type || "")
            .toUpperCase();

    if (
        normalizedType ===
        "PAYMENT_SUCCESS"
    ) {
        return {
            icon: CheckCircle,
            label:
                "Thanh toán thành công",
            className:
                "bg-emerald-500/15 text-emerald-300",
        };
    }

    if (
        normalizedType ===
        "PAYMENT_FAILED"
    ) {
        return {
            icon: ReceiptText,
            label:
                "Thanh toán thất bại",
            className:
                "bg-red-500/15 text-red-300",
        };
    }

    if (
        normalizedType ===
        "BOOKING_CANCELLED"
    ) {
        return {
            icon: ReceiptText,
            label:
                "Booking đã hủy",
            className:
                "bg-red-500/15 text-red-300",
        };
    }

    if (
        normalizedType ===
        "BOOKING_CREATED"
    ) {
        return {
            icon: ReceiptText,
            label:
                "Booking mới",
            className:
                "bg-blue-500/15 text-blue-300",
        };
    }

    if (
        normalizedType ===
        "TICKET_ISSUED"
    ) {
        return {
            icon: Ticket,
            label:
                "Vé đã phát hành",
            className:
                "bg-purple-500/15 text-purple-300",
        };
    }

    return {
        icon: Bell,
        label: "Hệ thống",
        className:
            "bg-slate-500/15 text-slate-300",
    };
}

function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value)
            .replace("T", " ");
    }

    return date.toLocaleString(
        "vi-VN"
    );
}

function Notifications() {
    const navigate =
        useNavigate();

    const userId =
        useMemo(
            () =>
                getCurrentUserId(),
            []
        );

    const [
        notifications,
        setNotifications,
    ] = useState([]);

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        type,
        setType,
    ] = useState("ALL");

    const [
        readFilter,
        setReadFilter,
    ] = useState("ALL");

    const [
        page,
        setPage,
    ] = useState(0);

    const [
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        unreadCount,
        setUnreadCount,
    ] = useState(0);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        actionLoadingId,
        setActionLoadingId,
    ] = useState(null);

    const [
        markingAll,
        setMarkingAll,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

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

        loadData();

        // eslint-disable-next-line
    }, [
        page,
        keyword,
        type,
        readFilter,
        userId,
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

    const loadNotifications =
        async () => {
            if (!userId) {
                return;
            }

            const response =
                await axiosClient.get(
                    `/notification-service/notifications/user/${userId}`,
                    {
                        params: {
                            page,
                            size:
                                PAGE_SIZE,

                            keyword:
                                keyword ||
                                undefined,

                            type:
                                type ===
                                    "ALL"
                                    ? undefined
                                    : type,

                            isRead:
                                readFilter ===
                                    "ALL"
                                    ? undefined
                                    : readFilter ===
                                    "READ",

                            sortBy:
                                "createdAt",

                            sortDirection:
                                "desc",
                        },
                    }
                );

            const pageData =
                normalizePage(
                    response.data
                );

            setNotifications(
                pageData.content
            );

            setTotalPages(
                pageData.totalPages
            );

            setTotalElements(
                pageData.totalElements
            );
        };

    const loadUnreadCount =
        async () => {
            if (!userId) {
                return;
            }

            const response =
                await axiosClient.get(
                    `/notification-service/notifications/user/${userId}/unread-count`
                );

            setUnreadCount(
                Number(
                    response.data
                        ?.unreadCount
                ) || 0
            );
        };

    const loadData =
        async () => {
            try {
                setLoading(true);
                setError("");

                await Promise.all([
                    loadNotifications(),
                    loadUnreadCount(),
                ]);
            } catch (
            requestError
            ) {
                console.error(
                    "Load notification error:",
                    requestError
                );

                setError(
                    getRequestErrorMessage(
                        requestError,
                        "Không tải được thông báo."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const notifyHeaderChanged =
        () => {
            window.dispatchEvent(
                new CustomEvent(
                    "notification:changed"
                )
            );
        };

    const navigateToTarget =
        (notification) => {
            const target =
                getNotificationTarget(
                    notification
                );

            if (!target) {
                return;
            }

            if (
                target.startsWith(
                    "http://"
                ) ||
                target.startsWith(
                    "https://"
                )
            ) {
                window.location.href =
                    target;

                return;
            }

            navigate(target);
        };

    const openNotification =
        async (notification) => {
            if (
                isNotificationRead(
                    notification
                )
            ) {
                navigateToTarget(
                    notification
                );

                return;
            }

            try {
                setActionLoadingId(
                    notification.id
                );

                setError("");

                await axiosClient.put(
                    `/notification-service/notifications/${notification.id}/read`
                );

                setNotifications(
                    (current) =>
                        current.map(
                            (item) =>
                                item.id ===
                                    notification.id
                                    ? {
                                        ...item,
                                        isRead:
                                            true,
                                        read: true,
                                    }
                                    : item
                        )
                );

                setUnreadCount(
                    (current) =>
                        Math.max(
                            0,
                            current - 1
                        )
                );

                notifyHeaderChanged();

                navigateToTarget(
                    notification
                );
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                setError(
                    getRequestErrorMessage(
                        requestError,
                        "Không mở được thông báo."
                    )
                );
            } finally {
                setActionLoadingId(
                    null
                );
            }
        };

    const markAllAsRead =
        async () => {
            if (
                !userId ||
                unreadCount === 0
            ) {
                return;
            }

            try {
                setMarkingAll(true);
                setError("");

                await axiosClient.put(
                    `/notification-service/notifications/user/${userId}/read-all`
                );

                setNotifications(
                    (current) =>
                        current.map(
                            (notification) => ({
                                ...notification,
                                isRead: true,
                                read: true,
                            })
                        )
                );

                setUnreadCount(0);

                notifyHeaderChanged();
            } catch (
            requestError
            ) {
                setError(
                    getRequestErrorMessage(
                        requestError,
                        "Không đánh dấu tất cả đã đọc được."
                    )
                );
            } finally {
                setMarkingAll(false);
            }
        };

    const deleteNotification =
        async (notification) => {
            if (
                !window.confirm(
                    "Bạn chắc chắn muốn xóa thông báo này?"
                )
            ) {
                return;
            }

            try {
                setActionLoadingId(
                    notification.id
                );

                setError("");

                await axiosClient.delete(
                    `/notification-service/notifications/${notification.id}`
                );

                const wasUnread =
                    !isNotificationRead(
                        notification
                    );

                setNotifications(
                    (current) =>
                        current.filter(
                            (item) =>
                                item.id !==
                                notification.id
                        )
                );

                setTotalElements(
                    (current) =>
                        Math.max(
                            0,
                            current - 1
                        )
                );

                if (wasUnread) {
                    setUnreadCount(
                        (current) =>
                            Math.max(
                                0,
                                current - 1
                            )
                    );
                }

                notifyHeaderChanged();

                if (
                    notifications.length ===
                    1 &&
                    page > 0
                ) {
                    setPage(
                        (current) =>
                            current - 1
                    );
                }
            } catch (
            requestError
            ) {
                setError(
                    getRequestErrorMessage(
                        requestError,
                        "Không xóa được thông báo."
                    )
                );
            } finally {
                setActionLoadingId(
                    null
                );
            }
        };

    const submitSearch =
        (event) => {
            event.preventDefault();

            setKeyword(
                keywordInput.trim()
            );

            setPage(0);
        };

    const clearFilters =
        () => {
            setKeywordInput("");
            setKeyword("");
            setType("ALL");
            setReadFilter("ALL");
            setPage(0);
        };

    const pageNumbers =
        useMemo(() => {
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
        <div className="min-h-screen bg-[#111317] px-4 py-10 text-white lg:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                            <Bell
                                size={16}
                            />

                            Trung tâm thông báo
                        </div>

                        <h1 className="mt-4 text-4xl font-black">
                            Thông báo của tôi
                        </h1>

                        <p className="mt-3 text-slate-400">
                            Bạn có{" "}
                            <strong className="text-emerald-300">
                                {
                                    unreadCount
                                }
                            </strong>{" "}
                            thông báo chưa đọc.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={
                                loadData
                            }
                            disabled={
                                loading
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-black disabled:opacity-50"
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

                        <button
                            type="button"
                            disabled={
                                unreadCount ===
                                0 ||
                                markingAll
                            }
                            onClick={
                                markAllAsRead
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-40"
                        >
                            {markingAll ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <CheckCheck
                                    size={17}
                                />
                            )}

                            Đọc tất cả
                        </button>
                    </div>
                </header>

                <form
                    onSubmit={
                        submitSearch
                    }
                    className="mt-7 grid gap-3 rounded-3xl border border-white/10 bg-[#1b1f27] p-5 md:grid-cols-4"
                >
                    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 md:col-span-2">
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
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Tìm tiêu đề hoặc nội dung..."
                            className="min-w-0 flex-1 bg-transparent outline-none"
                        />
                    </div>

                    <select
                        value={type}
                        onChange={(
                            event
                        ) => {
                            setType(
                                event.target
                                    .value
                            );

                            setPage(0);
                        }}
                        className="rounded-xl bg-[#252932] px-4 py-3 outline-none"
                    >
                        <option value="ALL">
                            Tất cả loại
                        </option>

                        <option value="SYSTEM">
                            Hệ thống
                        </option>

                        <option value="BOOKING_CREATED">
                            Đặt vé
                        </option>

                        <option value="BOOKING_CANCELLED">
                            Hủy booking
                        </option>

                        <option value="PAYMENT_SUCCESS">
                            Thanh toán thành công
                        </option>

                        <option value="PAYMENT_FAILED">
                            Thanh toán thất bại
                        </option>

                        <option value="TICKET_ISSUED">
                            Vé đã phát hành
                        </option>
                    </select>

                    <select
                        value={
                            readFilter
                        }
                        onChange={(
                            event
                        ) => {
                            setReadFilter(
                                event.target
                                    .value
                            );

                            setPage(0);
                        }}
                        className="rounded-xl bg-[#252932] px-4 py-3 outline-none"
                    >
                        <option value="ALL">
                            Tất cả trạng thái
                        </option>

                        <option value="UNREAD">
                            Chưa đọc
                        </option>

                        <option value="READ">
                            Đã đọc
                        </option>
                    </select>

                    <div className="flex flex-wrap gap-3 md:col-span-4">
                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-500 px-6 py-3 font-black text-slate-950"
                        >
                            Tìm kiếm
                        </button>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="rounded-xl bg-white/10 px-6 py-3 font-black"
                        >
                            Xóa lọc
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                        {error}
                    </div>
                )}

                <div className="mt-5 text-sm text-slate-400">
                    Tổng cộng{" "}
                    <strong className="text-white">
                        {
                            totalElements
                        }
                    </strong>{" "}
                    thông báo
                </div>

                {loading ? (
                    <div className="mt-6 flex min-h-52 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                        <Loader2
                            size={30}
                            className="animate-spin text-emerald-400"
                        />
                    </div>
                ) : notifications.length ===
                    0 ? (
                    <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">
                        <Bell
                            size={48}
                            className="mx-auto mb-4 opacity-40"
                        />

                        Không có thông báo phù hợp.
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {notifications.map(
                            (
                                notification
                            ) => {
                                const info =
                                    getTypeInfo(
                                        notification.type
                                    );

                                const Icon =
                                    info.icon;

                                const read =
                                    isNotificationRead(
                                        notification
                                    );

                                const actionLoading =
                                    actionLoadingId ===
                                    notification.id;

                                const target =
                                    getNotificationTarget(
                                        notification
                                    );

                                return (
                                    <article
                                        key={
                                            notification.id
                                        }
                                        className={`rounded-3xl border p-5 transition ${read
                                            ? "border-white/10 bg-[#1b1f27]"
                                            : "border-emerald-500/30 bg-emerald-500/5"
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                disabled={
                                                    actionLoading
                                                }
                                                onClick={() =>
                                                    openNotification(
                                                        notification
                                                    )
                                                }
                                                className="flex min-w-0 flex-1 gap-4 text-left disabled:opacity-60"
                                            >
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${info.className}`}
                                                >
                                                    {actionLoading ? (
                                                        <Loader2
                                                            size={22}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <Icon
                                                            size={22}
                                                        />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${info.className}`}>
                                                            {
                                                                info.label
                                                            }
                                                        </span>

                                                        {!read && (
                                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                                        )}
                                                    </div>

                                                    <h2 className="mt-3 text-lg font-black">
                                                        {notification.title ||
                                                            "Thông báo"}
                                                    </h2>

                                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                                        {
                                                            notification.message
                                                        }
                                                    </p>

                                                    <div className="mt-3 text-xs text-slate-500">
                                                        {formatDateTime(
                                                            notification.createdAt
                                                        )}
                                                    </div>

                                                    {target && (
                                                        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-emerald-300">
                                                            Xem chi tiết

                                                            <ExternalLink
                                                                size={15}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={
                                                    actionLoading
                                                }
                                                onClick={() =>
                                                    deleteNotification(
                                                        notification
                                                    )
                                                }
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 disabled:opacity-50"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2
                                                    size={17}
                                                />
                                            </button>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-8 flex flex-wrap justify-center gap-2">
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
                                    className={`h-11 min-w-11 rounded-xl px-3 font-black ${page ===
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
                                    (
                                        current
                                    ) =>
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

                <div className="mt-8">
                    <Link
                        to="/my-bookings"
                        className="inline-flex items-center gap-2 font-black text-emerald-300"
                    >
                        <ReceiptText
                            size={18}
                        />

                        Xem booking của tôi
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Notifications;