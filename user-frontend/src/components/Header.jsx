import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Link,
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    Bell,
    CalendarDays,
    CheckCheck,
    ChevronRight,
    Home,
    LayoutDashboard,
    Loader2,
    LogOut,
    Menu,
    PlusCircle,
    QrCode,
    ReceiptText,
    Search,
    Ticket,
    UserRound,
    X,
} from "lucide-react";

const NOTIFICATION_PREVIEW_SIZE = 5;

function decodeJwtPayload(token) {
    try {
        if (!token || !token.includes(".")) {
            return null;
        }

        const payload = token.split(".")[1];

        if (!payload) {
            return null;
        }

        const normalized = payload
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const padded = normalized.padEnd(
            Math.ceil(normalized.length / 4) * 4,
            "="
        );

        return JSON.parse(
            window.atob(padded)
        );
    } catch {
        return null;
    }
}

function getStoredToken() {
    return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("jwt-token")
    );
}

function getStoredUser() {
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

            if (
                user &&
                typeof user === "object"
            ) {
                return user;
            }
        } catch {
            // Bỏ qua dữ liệu lỗi.
        }
    }

    return null;
}

function normalizeRole(value) {
    if (Array.isArray(value)) {
        const firstRole = value[0];

        if (
            typeof firstRole === "string"
        ) {
            return firstRole
                .replace(/^ROLE_/i, "")
                .toUpperCase();
        }

        return String(
            firstRole?.roleName ||
            firstRole?.name ||
            "USER"
        )
            .replace(/^ROLE_/i, "")
            .toUpperCase();
    }

    return String(value || "USER")
        .replace(/^ROLE_/i, "")
        .toUpperCase();
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

function getCurrentIdentity() {
    const storedUser =
        getStoredUser();

    const token =
        getStoredToken();

    const payload =
        decodeJwtPayload(
            token
        ) || {};

    /*
     * Khi có token, chỉ dùng ID trong JWT.
     * Không lấy nhầm ID cũ trong localStorage.
     */
    const tokenUserId =
        toPositiveNumber(
            payload?.userId ??
            payload?.uid ??
            payload?.id ??
            payload?.sub
        );

    const storedUserId =
        toPositiveNumber(
            storedUser?.userId ??
            storedUser?.id ??
            storedUser?.uid
        );

    const userId =
        token
            ? tokenUserId
            : storedUserId;

    const role =
        normalizeRole(
            payload?.role ??
            payload?.roles ??
            storedUser?.role ??
            storedUser?.roles ??
            storedUser?.userRole
        );

    const user =
        storedUser
            ? {
                ...storedUser,

                userId:
                    userId ??
                    storedUser.userId,

                id:
                    userId ??
                    storedUser.id,

                role,
            }
            : (
                userId
                    ? {
                        userId,
                        id: userId,

                        email:
                            payload?.email ||
                            "",

                        role,
                    }
                    : null
            );

    return {
        user,
        userId,
        role,
    };
}

function normalizePage(data) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements:
                data.length,
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
     * TICKET_ISSUED phải mở đúng một vé.
     * Ưu tiên ticketId, sau đó ticketCode.
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

        if (bookingId) {
            return `/my-tickets?bookingId=${bookingId}`;
        }

        if (actionUrl) {
            return actionUrl;
        }

        return "/my-tickets";
    }

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

    return "/notifications";
}

function formatNotificationTime(value) {
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
        "vi-VN",
        {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
        }
    );
}

function getNotificationIconClass(type) {
    const normalizedType =
        String(type || "")
            .toUpperCase();

    if (
        normalizedType ===
        "PAYMENT_SUCCESS"
    ) {
        return "bg-emerald-500/15 text-emerald-300";
    }

    if (
        normalizedType ===
        "PAYMENT_FAILED" ||
        normalizedType ===
        "BOOKING_CANCELLED"
    ) {
        return "bg-red-500/15 text-red-300";
    }

    if (
        normalizedType ===
        "TICKET_ISSUED"
    ) {
        return "bg-purple-500/15 text-purple-300";
    }

    if (
        normalizedType ===
        "BOOKING_CREATED"
    ) {
        return "bg-blue-500/15 text-blue-300";
    }

    return "bg-slate-500/15 text-slate-300";
}

function Header() {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const notificationRef =
        useRef(null);

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        openMenu,
        setOpenMenu,
    ] = useState(false);

    const [
        openNotifications,
        setOpenNotifications,
    ] = useState(false);

    const [
        notifications,
        setNotifications,
    ] = useState([]);

    const [
        unreadCount,
        setUnreadCount,
    ] = useState(0);

    const [
        notificationLoading,
        setNotificationLoading,
    ] = useState(false);

    const [
        notificationActionId,
        setNotificationActionId,
    ] = useState(null);

    const [
        notificationError,
        setNotificationError,
    ] = useState("");

    const identity =
        useMemo(
            () =>
                getCurrentIdentity(),
            [location.pathname]
        );

    const user =
        identity.user;

    const userId =
        identity.userId;

    const userRole =
        identity.role;

    const isAdmin =
        userRole === "ADMIN" ||
        userRole === "ORGANIZER";

    const displayName =
        user?.name ||
        user?.fullName ||
        user?.username ||
        user?.email ||
        "Người dùng";

    const navItems = [
        {
            label: "Trang chủ",
            to: "/",
            icon: Home,
        },
        {
            label: "Sự kiện",
            to: "/events",
            icon: CalendarDays,
        },
        {
            label: "Đơn của tôi",
            to: "/my-bookings",
            icon: ReceiptText,
            requireLogin: true,
        },
        {
            label: "Vé QR",
            to: "/my-tickets",
            icon: QrCode,
            requireLogin: true,
        },
        {
            label: "Thông báo",
            to: "/notifications",
            icon: Bell,
            requireLogin: true,
            notification: true,
        },
    ].filter(
        (item) =>
            !item.requireLogin ||
            user
    );

    useEffect(() => {
        setOpenMenu(false);
        setOpenNotifications(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow =
            openMenu
                ? "hidden"
                : "";

        return () => {
            document.body.style.overflow =
                "";
        };
    }, [openMenu]);

    useEffect(() => {
        const handleOutsideClick =
            (event) => {
                if (
                    notificationRef.current &&
                    !notificationRef.current.contains(
                        event.target
                    )
                ) {
                    setOpenNotifications(
                        false
                    );
                }
            };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    useEffect(() => {
        if (!userId) {
            setUnreadCount(0);
            setNotifications([]);
            return undefined;
        }

        loadUnreadCount();

        const intervalId =
            window.setInterval(
                loadUnreadCount,
                30000
            );

        const handleNotificationChanged =
            () => {
                loadUnreadCount();

                if (
                    openNotifications
                ) {
                    loadNotificationPreview();
                }
            };

        window.addEventListener(
            "notification:changed",
            handleNotificationChanged
        );

        return () => {
            window.clearInterval(
                intervalId
            );

            window.removeEventListener(
                "notification:changed",
                handleNotificationChanged
            );
        };

        // eslint-disable-next-line
    }, [
        userId,
        openNotifications,
    ]);

    const loadUnreadCount =
        async () => {
            if (!userId) {
                return;
            }

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
            } catch (error) {
                console.error(
                    "Không tải được số thông báo chưa đọc:",
                    error
                );
            }
        };

    const loadNotificationPreview =
        async () => {
            if (!userId) {
                setNotifications([]);
                return;
            }

            try {
                setNotificationLoading(
                    true
                );

                setNotificationError("");

                const response =
                    await axiosClient.get(
                        `/notification-service/notifications/user/${userId}`,
                        {
                            params: {
                                page: 0,

                                size:
                                    NOTIFICATION_PREVIEW_SIZE,

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

                /*
                 * Loại bỏ mọi thông báo không thuộc
                 * tài khoản đang đăng nhập.
                 */
                const ownedNotifications =
                    pageData.content.filter(
                        (notification) =>
                            toPositiveNumber(
                                notification?.userId
                            ) === userId
                    );

                setNotifications(
                    ownedNotifications
                );
            } catch (error) {
                console.error(
                    "Không tải được thông báo:",
                    error
                );

                setNotifications([]);

                if (
                    error?.response
                        ?.status === 403
                ) {
                    setNotificationError(
                        "Thông báo không thuộc tài khoản hiện tại."
                    );
                } else {
                    setNotificationError(
                        error?.response
                            ?.data
                            ?.message ||
                        "Không tải được thông báo."
                    );
                }
            } finally {
                setNotificationLoading(
                    false
                );
            }
        };

    const handleBellClick =
        async () => {
            const nextOpen =
                !openNotifications;

            setOpenNotifications(
                nextOpen
            );

            setOpenMenu(false);

            if (nextOpen) {
                await Promise.all([
                    loadNotificationPreview(),
                    loadUnreadCount(),
                ]);
            }
        };

    const navigateToNotification =
        (notification) => {
            const target =
                getNotificationTarget(
                    notification
                );

            setOpenNotifications(
                false
            );

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
            if (!notification) {
                return;
            }

            const notificationOwnerId =
                toPositiveNumber(
                    notification.userId
                );

            /*
             * Không gửi PUT nếu thông báo
             * không thuộc user hiện tại.
             */
            if (
                !userId ||
                notificationOwnerId !==
                userId
            ) {
                console.error(
                    "Notification owner mismatch:",
                    {
                        currentUserId:
                            userId,

                        notificationUserId:
                            notificationOwnerId,

                        notificationId:
                            notification.id,
                    }
                );

                setNotificationError(
                    "Thông báo này thuộc tài khoản khác."
                );

                return;
            }

            if (
                isNotificationRead(
                    notification
                )
            ) {
                navigateToNotification(
                    notification
                );

                return;
            }

            try {
                setNotificationActionId(
                    notification.id
                );

                setNotificationError("");

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

                                        read:
                                            true,

                                        readAt:
                                            new Date()
                                                .toISOString(),
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

                window.dispatchEvent(
                    new CustomEvent(
                        "notification:changed"
                    )
                );

                navigateToNotification(
                    notification
                );
            } catch (error) {
                console.error(
                    "Không đánh dấu đã đọc:",
                    {
                        status:
                            error?.response
                                ?.status,

                        data:
                            error?.response
                                ?.data,

                        currentUserId:
                            userId,

                        notificationUserId:
                            notificationOwnerId,

                        notificationId:
                            notification.id,
                    }
                );

                setNotificationError(
                    error?.response
                        ?.data
                        ?.message ||
                    (
                        error?.response
                            ?.status === 403
                            ? "Bạn không phải người nhận của thông báo này."
                            : "Không mở được thông báo."
                    )
                );
            } finally {
                setNotificationActionId(
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

            const hasForeignNotification =
                notifications.some(
                    (notification) =>
                        toPositiveNumber(
                            notification?.userId
                        ) !== userId
                );

            if (
                hasForeignNotification
            ) {
                setNotificationError(
                    "Danh sách có thông báo không thuộc tài khoản hiện tại."
                );

                await loadNotificationPreview();
                await loadUnreadCount();

                return;
            }

            try {
                setNotificationLoading(
                    true
                );

                setNotificationError("");

                await axiosClient.put(
                    `/notification-service/notifications/user/${userId}/read-all`
                );

                setNotifications(
                    (current) =>
                        current.map(
                            (notification) => ({
                                ...notification,

                                isRead:
                                    true,

                                read:
                                    true,

                                readAt:
                                    notification.readAt ||
                                    new Date()
                                        .toISOString(),
                            })
                        )
                );

                setUnreadCount(0);

                window.dispatchEvent(
                    new CustomEvent(
                        "notification:changed"
                    )
                );
            } catch (error) {
                console.error(
                    "Không đọc hết thông báo:",
                    error
                );

                setNotificationError(
                    error?.response
                        ?.data
                        ?.message ||
                    "Không đánh dấu tất cả đã đọc được."
                );
            } finally {
                setNotificationLoading(
                    false
                );
            }
        };

    const handleSearch =
        (event) => {
            event.preventDefault();

            const value =
                keyword.trim();

            setOpenMenu(false);
            setOpenNotifications(false);

            if (!value) {
                navigate("/events");
                return;
            }

            navigate(
                `/events?keyword=${encodeURIComponent(
                    value
                )}`
            );
        };

    const logout = () => {
        [
            "token",
            "accessToken",
            "refreshToken",
            "jwt",
            "jwt-token",
            "user",
            "authUser",
            "currentUser",
        ].forEach((key) => {
            localStorage.removeItem(
                key
            );
        });

        setUnreadCount(0);
        setNotifications([]);
        setOpenMenu(false);
        setOpenNotifications(false);

        navigate(
            "/login",
            {
                replace: true,
            }
        );
    };

    const navClass = ({
        isActive,
    }) =>
        `text-sm font-black transition ${isActive
            ? "text-emerald-300"
            : "text-slate-300 hover:text-white"
        }`;

    const drawerNavClass = ({
        isActive,
    }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-black transition ${isActive
            ? "bg-emerald-500 text-slate-950"
            : "text-slate-200 hover:bg-white/10"
        }`;

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d10]/95 text-white backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 lg:px-6">
                    <div className="flex h-20 items-center justify-between gap-4">
                        <Link
                            to="/"
                            className="flex shrink-0 items-center gap-3"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                                <Ticket
                                    size={23}
                                />
                            </div>

                            <div className="hidden leading-tight sm:block">
                                <div className="text-xl font-black">
                                    EventBox
                                </div>

                                <div className="text-xs text-slate-400">
                                    Đặt vé sự kiện trực tuyến
                                </div>
                            </div>
                        </Link>

                        <form
                            onSubmit={
                                handleSearch
                            }
                            className="hidden max-w-xl flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 lg:flex"
                        >
                            <Search
                                size={18}
                                className="text-slate-400"
                            />

                            <input
                                value={
                                    keyword
                                }
                                onChange={(
                                    event
                                ) =>
                                    setKeyword(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Tìm kiếm sự kiện..."
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                            />

                            <button
                                type="submit"
                                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-black text-slate-950"
                            >
                                Tìm
                            </button>
                        </form>

                        <nav className="hidden items-center gap-5 2xl:flex">
                            {navItems
                                .filter(
                                    (item) =>
                                        !item.notification
                                )
                                .map(
                                    (item) => (
                                        <NavLink
                                            key={
                                                item.to
                                            }
                                            to={
                                                item.to
                                            }
                                            className={
                                                navClass
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </NavLink>
                                    )
                                )}
                        </nav>

                        <div className="flex shrink-0 items-center gap-2">
                            {isAdmin ? (
                                <Link
                                    to="/admin/events"
                                    className="hidden items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 md:inline-flex"
                                >
                                    <LayoutDashboard
                                        size={17}
                                    />

                                    Quản trị
                                </Link>
                            ) : (
                                <Link
                                    to="/events"
                                    className="hidden items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 md:inline-flex"
                                >
                                    <PlusCircle
                                        size={17}
                                    />

                                    Mua vé
                                </Link>
                            )}

                            {user && (
                                <div
                                    ref={
                                        notificationRef
                                    }
                                    className="relative"
                                >
                                    <button
                                        type="button"
                                        onClick={
                                            handleBellClick
                                        }
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition ${openNotifications
                                            ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                                            : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                                            }`}
                                        aria-label="Thông báo"
                                    >
                                        <Bell
                                            size={20}
                                        />

                                        {unreadCount >
                                            0 && (
                                                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0b0d10] bg-red-500 px-1 text-[10px] font-black text-white">
                                                    {unreadCount >
                                                        99
                                                        ? "99+"
                                                        : unreadCount}
                                                </span>
                                            )}
                                    </button>

                                    {openNotifications && (
                                        <div className="absolute right-0 top-[calc(100%+14px)] z-120 w-[calc(100vw-2rem)] max-w-105 overflow-hidden rounded-3xl border border-white/10 bg-[#171a20] shadow-2xl">
                                            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                                                <div>
                                                    <h3 className="text-lg font-black">
                                                        Thông báo
                                                    </h3>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {
                                                            unreadCount
                                                        }{" "}
                                                        thông báo chưa đọc
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        markAllAsRead
                                                    }
                                                    disabled={
                                                        unreadCount ===
                                                        0 ||
                                                        notificationLoading
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-emerald-300 disabled:opacity-40"
                                                >
                                                    <CheckCheck
                                                        size={15}
                                                    />

                                                    Đọc hết
                                                </button>
                                            </div>

                                            {notificationError && (
                                                <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
                                                    {
                                                        notificationError
                                                    }
                                                </div>
                                            )}

                                            <div className="max-h-110 overflow-y-auto">
                                                {notificationLoading &&
                                                    notifications.length ===
                                                    0 ? (
                                                    <div className="flex min-h-44 items-center justify-center">
                                                        <Loader2
                                                            size={26}
                                                            className="animate-spin text-emerald-400"
                                                        />
                                                    </div>
                                                ) : notifications.length ===
                                                    0 ? (
                                                    <div className="px-5 py-12 text-center text-sm text-slate-400">
                                                        Chưa có thông báo.
                                                    </div>
                                                ) : (
                                                    notifications.map(
                                                        (
                                                            notification
                                                        ) => {
                                                            const read =
                                                                isNotificationRead(
                                                                    notification
                                                                );

                                                            const loading =
                                                                notificationActionId ===
                                                                notification.id;

                                                            return (
                                                                <button
                                                                    key={
                                                                        notification.id
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        loading
                                                                    }
                                                                    onClick={() =>
                                                                        openNotification(
                                                                            notification
                                                                        )
                                                                    }
                                                                    className={`flex w-full gap-3 border-b border-white/5 px-5 py-4 text-left transition last:border-b-0 ${read
                                                                        ? "bg-transparent hover:bg-white/5"
                                                                        : "bg-emerald-500/5 hover:bg-emerald-500/10"
                                                                        }`}
                                                                >
                                                                    <div
                                                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getNotificationIconClass(
                                                                            notification.type
                                                                        )}`}
                                                                    >
                                                                        {loading ? (
                                                                            <Loader2
                                                                                size={20}
                                                                                className="animate-spin"
                                                                            />
                                                                        ) : (
                                                                            <Bell
                                                                                size={19}
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start gap-2">
                                                                            <h4 className="line-clamp-1 flex-1 text-sm font-black">
                                                                                {notification.title ||
                                                                                    "Thông báo"}
                                                                            </h4>

                                                                            {!read && (
                                                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                                                                            )}
                                                                        </div>

                                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                                                            {
                                                                                notification.message
                                                                            }
                                                                        </p>

                                                                        <div className="mt-2 text-[11px] text-slate-500">
                                                                            {formatNotificationTime(
                                                                                notification.createdAt
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <ChevronRight
                                                                        size={17}
                                                                        className="mt-1 shrink-0 text-slate-500"
                                                                    />
                                                                </button>
                                                            );
                                                        }
                                                    )
                                                )}
                                            </div>

                                            <Link
                                                to="/notifications"
                                                onClick={() =>
                                                    setOpenNotifications(
                                                        false
                                                    )
                                                }
                                                className="flex items-center justify-center gap-2 border-t border-white/10 bg-white/5 px-5 py-4 text-sm font-black text-emerald-300 hover:bg-white/10"
                                            >
                                                Xem tất cả thông báo

                                                <ChevronRight
                                                    size={17}
                                                />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {user ? (
                                <>
                                    <Link
                                        to="/profile"
                                        className="hidden max-w-44 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 sm:flex"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                                            <UserRound
                                                size={18}
                                            />
                                        </div>

                                        <div className="min-w-0 pr-2">
                                            <div className="truncate text-sm font-black">
                                                {
                                                    displayName
                                                }
                                            </div>

                                            <div className="text-[10px] text-slate-400">
                                                {
                                                    userRole
                                                }
                                            </div>
                                        </div>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={
                                            logout
                                        }
                                        className="hidden h-10 w-10 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300 lg:flex"
                                    >
                                        <LogOut
                                            size={18}
                                        />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="hidden rounded-full px-4 py-2.5 text-sm font-black sm:inline-flex"
                                    >
                                        Đăng nhập
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950"
                                    >
                                        Đăng ký
                                    </Link>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setOpenMenu(
                                        true
                                    );

                                    setOpenNotifications(
                                        false
                                    );
                                }}
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 2xl:hidden"
                            >
                                <Menu
                                    size={21}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div
                className={`fixed inset-0 z-100 2xl:hidden ${openMenu
                    ? "pointer-events-auto"
                    : "pointer-events-none"
                    }`}
            >
                <button
                    type="button"
                    onClick={() =>
                        setOpenMenu(false)
                    }
                    className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${openMenu
                        ? "opacity-100"
                        : "opacity-0"
                        }`}
                    aria-label="Đóng menu"
                />

                <aside
                    className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#111419] text-white shadow-2xl transition-transform duration-300 ${openMenu
                        ? "translate-x-0"
                        : "translate-x-full"
                        }`}
                >
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                        <Link
                            to="/"
                            onClick={() =>
                                setOpenMenu(false)
                            }
                            className="flex items-center gap-3"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                                <Ticket
                                    size={21}
                                />
                            </div>

                            <div>
                                <div className="font-black">
                                    EventBox
                                </div>

                                <div className="text-xs text-slate-400">
                                    Menu chính
                                </div>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={() =>
                                setOpenMenu(false)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
                        >
                            <X
                                size={21}
                            />
                        </button>
                    </div>

                    <form
                        onSubmit={
                            handleSearch
                        }
                        className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                        <Search
                            size={18}
                            className="text-slate-400"
                        />

                        <input
                            value={
                                keyword
                            }
                            onChange={(
                                event
                            ) =>
                                setKeyword(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Tìm sự kiện..."
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />

                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"
                        >
                            Tìm
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto px-4 py-5">
                        <div className="mb-3 px-2 text-xs font-black uppercase tracking-widest text-slate-500">
                            Điều hướng
                        </div>

                        <nav className="space-y-1.5">
                            {navItems.map(
                                (item) => {
                                    const Icon =
                                        item.icon;

                                    return (
                                        <NavLink
                                            key={
                                                item.to
                                            }
                                            to={
                                                item.to
                                            }
                                            className={
                                                drawerNavClass
                                            }
                                        >
                                            <Icon
                                                size={19}
                                            />

                                            <span>
                                                {
                                                    item.label
                                                }
                                            </span>

                                            {item.notification &&
                                                unreadCount >
                                                0 && (
                                                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                                                        {unreadCount >
                                                            99
                                                            ? "99+"
                                                            : unreadCount}
                                                    </span>
                                                )}
                                        </NavLink>
                                    );
                                }
                            )}
                        </nav>

                        <div className="my-5 border-t border-white/10" />

                        {isAdmin ? (
                            <Link
                                to="/admin/events"
                                className="flex items-center gap-3 rounded-2xl bg-amber-400 px-4 py-3.5 text-sm font-black text-slate-950"
                            >
                                <LayoutDashboard
                                    size={19}
                                />

                                Vào trang quản trị
                            </Link>
                        ) : (
                            <Link
                                to="/events"
                                className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-slate-950"
                            >
                                <PlusCircle
                                    size={19}
                                />

                                Mua vé ngay
                            </Link>
                        )}
                    </div>

                    <div className="border-t border-white/10 p-4">
                        {user ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                                        <UserRound
                                            size={20}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-black">
                                            {
                                                displayName
                                            }
                                        </div>

                                        <div className="text-xs text-slate-400">
                                            {
                                                userRole
                                            }
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    type="button"
                                    onClick={
                                        logout
                                    }
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"
                                >
                                    <LogOut
                                        size={17}
                                    />

                                    Đăng xuất
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    to="/login"
                                    className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm font-black"
                                >
                                    Đăng nhập
                                </Link>

                                <Link
                                    to="/register"
                                    className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-slate-950"
                                >
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </>
    );
}

export default Header;