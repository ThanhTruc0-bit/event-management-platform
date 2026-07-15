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
    Loader2,
    ReceiptText,
    RefreshCw,
    Search,
    Ticket,
    Trash2,
} from "lucide-react";

const PAGE_SIZE = 10;

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
        // Đọc JWT phía dưới.
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
            Number(
                data?.totalElements
            ) || 0,

        totalPages:
            Number(
                data?.totalPages
            ) || 0,
    };
}

function Notifications() {
    const navigate =
        useNavigate();

    const [
        notifications,
        setNotifications,
    ] = useState([]);

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [keyword, setKeyword] =
        useState("");

    const [type, setType] =
        useState("ALL");

    const [readFilter, setReadFilter] =
        useState("ALL");

    const [page, setPage] =
        useState(0);

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

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const userId =
        getCurrentUserId();

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

        loadNotifications();
        loadUnreadCount();

        // eslint-disable-next-line
    }, [
        page,
        keyword,
        type,
        readFilter,
        userId,
    ]);

    const loadNotifications =
        async () => {
            try {
                setLoading(true);
                setError("");

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
            } catch (requestError) {
                console.error(
                    requestError
                );

                setNotifications([]);
                setTotalPages(0);
                setTotalElements(0);

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không tải được thông báo."
                );
            } finally {
                setLoading(false);
            }
        };

    const loadUnreadCount =
        async () => {
            try {
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
            } catch (requestError) {
                console.error(
                    requestError
                );
            }
        };

    const markAsRead =
        async (
            notification
        ) => {
            if (
                notification.isRead
            ) {
                if (
                    notification.actionUrl
                ) {
                    navigate(
                        notification.actionUrl
                    );
                }

                return;
            }

            try {
                await axiosClient.put(
                    `/notification-service/notifications/${notification.id}/read`
                );

                await Promise.all([
                    loadNotifications(),
                    loadUnreadCount(),
                ]);

                if (
                    notification.actionUrl
                ) {
                    navigate(
                        notification.actionUrl
                    );
                }
            } catch (requestError) {
                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không đánh dấu đã đọc được."
                );
            }
        };

    const markAllAsRead =
        async () => {
            try {
                await axiosClient.put(
                    `/notification-service/notifications/user/${userId}/read-all`
                );

                await Promise.all([
                    loadNotifications(),
                    loadUnreadCount(),
                ]);
            } catch (requestError) {
                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không đánh dấu tất cả đã đọc được."
                );
            }
        };

    const deleteNotification =
        async (
            notificationId
        ) => {
            if (
                !window.confirm(
                    "Xóa thông báo này?"
                )
            ) {
                return;
            }

            try {
                await axiosClient.delete(
                    `/notification-service/notifications/${notificationId}`
                );

                await Promise.all([
                    loadNotifications(),
                    loadUnreadCount(),
                ]);
            } catch (requestError) {
                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không xóa được thông báo."
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

    const clearFilters = () => {
        setKeywordInput("");
        setKeyword("");
        setType("ALL");
        setReadFilter("ALL");
        setPage(0);
    };

    const formatDateTime =
        (value) => {
            if (!value) {
                return "";
            }

            return new Date(
                value
            ).toLocaleString(
                "vi-VN"
            );
        };

    const getTypeInfo =
        (notificationType) => {
            if (
                notificationType ===
                "PAYMENT_SUCCESS"
            ) {
                return {
                    icon:
                        CheckCircle,
                    className:
                        "bg-emerald-500/15 text-emerald-300",
                };
            }

            if (
                notificationType ===
                "PAYMENT_FAILED" ||
                notificationType ===
                "BOOKING_CANCELLED"
            ) {
                return {
                    icon:
                        ReceiptText,
                    className:
                        "bg-red-500/15 text-red-300",
                };
            }

            if (
                notificationType ===
                "TICKET_ISSUED"
            ) {
                return {
                    icon: Ticket,
                    className:
                        "bg-purple-500/15 text-purple-300",
                };
            }

            return {
                icon: Bell,
                className:
                    "bg-blue-500/15 text-blue-300",
            };
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
                            Thông báo
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

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={
                                loadNotifications
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-black"
                        >
                            <RefreshCw
                                size={17}
                            />
                            Reload
                        </button>

                        <button
                            type="button"
                            disabled={
                                unreadCount === 0
                            }
                            onClick={
                                markAllAsRead
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-black disabled:opacity-40"
                        >
                            <CheckCheck
                                size={17}
                            />
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
                            placeholder="Tìm tiêu đề, nội dung..."
                            className="min-w-0 flex-1 bg-transparent outline-none"
                        />
                    </div>

                    <select
                        value={type}
                        onChange={(event) => {
                            setType(
                                event.target
                                    .value
                            );
                            setPage(0);
                        }}
                        className="rounded-xl bg-[#252932] px-4"
                    >
                        <option value="ALL">
                            Tất cả loại
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
                        onChange={(event) => {
                            setReadFilter(
                                event.target
                                    .value
                            );
                            setPage(0);
                        }}
                        className="rounded-xl bg-[#252932] px-4"
                    >
                        <option value="ALL">
                            Tất cả
                        </option>
                        <option value="UNREAD">
                            Chưa đọc
                        </option>
                        <option value="READ">
                            Đã đọc
                        </option>
                    </select>

                    <div className="flex gap-3 md:col-span-4">
                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-500 px-6 py-3 font-black"
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
                    <div className="mt-6 flex min-h-52 items-center justify-center rounded-3xl bg-white/5">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : notifications.length ===
                    0 ? (
                    <div className="mt-6 rounded-3xl bg-white/5 p-10 text-center text-slate-400">
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

                                return (
                                    <article
                                        key={
                                            notification.id
                                        }
                                        className={`flex gap-4 rounded-3xl border p-5 ${notification.isRead
                                            ? "border-white/10 bg-[#1b1f27]"
                                            : "border-emerald-500/30 bg-emerald-500/5"
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                markAsRead(
                                                    notification
                                                )
                                            }
                                            className="flex min-w-0 flex-1 gap-4 text-left"
                                        >
                                            <div
                                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${info.className}`}
                                            >
                                                <Icon
                                                    size={
                                                        22
                                                    }
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="font-black">
                                                        {
                                                            notification.title
                                                        }
                                                    </h2>

                                                    {!notification.isRead && (
                                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                                    )}
                                                </div>

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
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                deleteNotification(
                                                    notification.id
                                                )
                                            }
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300"
                                        >
                                            <Trash2
                                                size={17}
                                            />
                                        </button>
                                    </article>
                                );
                            }
                        )}
                    </div>
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
                                        ? "bg-emerald-500"
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

                <div className="mt-8">
                    <Link
                        to="/my-bookings"
                        className="inline-flex items-center gap-2 text-emerald-300"
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