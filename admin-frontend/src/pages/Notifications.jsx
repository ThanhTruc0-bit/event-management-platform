import {
    useMemo,
    useState,
} from "react";

import EntityManager from "../components/EntityManager";

import {
    FilterX,
} from "lucide-react";

const NOTIFICATION_TYPES = [
    "SYSTEM",
    "BOOKING_CREATED",
    "BOOKING_CANCELLED",
    "PAYMENT_SUCCESS",
    "PAYMENT_FAILED",
    "TICKET_ISSUED",
];

function Notifications() {
    const [
        typeFilter,
        setTypeFilter,
    ] = useState("");

    const [
        readFilter,
        setReadFilter,
    ] = useState("");

    const [
        userIdFilter,
        setUserIdFilter,
    ] = useState("");

    const [
        bookingIdFilter,
        setBookingIdFilter,
    ] = useState("");

    const [
        fromDate,
        setFromDate,
    ] = useState("");

    const [
        toDate,
        setToDate,
    ] = useState("");

    const requestParams =
        useMemo(() => {
            const params = {};

            if (typeFilter) {
                params.type =
                    typeFilter;
            }

            if (
                readFilter !== ""
            ) {
                params.isRead =
                    readFilter ===
                    "true";
            }

            if (userIdFilter) {
                params.userId =
                    Number(
                        userIdFilter
                    );
            }

            if (bookingIdFilter) {
                params.bookingId =
                    Number(
                        bookingIdFilter
                    );
            }

            if (fromDate) {
                params.fromDate =
                    fromDate;
            }

            if (toDate) {
                params.toDate =
                    toDate;
            }

            return params;
        }, [
            typeFilter,
            readFilter,
            userIdFilter,
            bookingIdFilter,
            fromDate,
            toDate,
        ]);

    const clearFilters =
        () => {
            setTypeFilter("");
            setReadFilter("");
            setUserIdFilter("");
            setBookingIdFilter("");
            setFromDate("");
            setToDate("");
        };

    const getTypeClass =
        (type) => {
            const normalizedType =
                String(type || "")
                    .trim()
                    .toUpperCase();

            if (
                normalizedType ===
                "BOOKING_CREATED"
            ) {
                return "bg-blue-100 text-blue-700";
            }

            if (
                normalizedType ===
                "PAYMENT_SUCCESS"
            ) {
                return "bg-emerald-100 text-emerald-700";
            }

            if (
                normalizedType ===
                "PAYMENT_FAILED"
            ) {
                return "bg-orange-100 text-orange-700";
            }

            if (
                normalizedType ===
                "TICKET_ISSUED"
            ) {
                return "bg-purple-100 text-purple-700";
            }

            if (
                normalizedType ===
                "BOOKING_CANCELLED"
            ) {
                return "bg-red-100 text-red-700";
            }

            return "bg-slate-100 text-slate-700";
        };

    const formatDateTime =
        (value) => {
            if (!value) {
                return "NULL";
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

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={
                    typeFilter
                }
                onChange={(event) =>
                    setTypeFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
            >
                <option value="">
                    Tất cả loại
                </option>

                {NOTIFICATION_TYPES.map(
                    (type) => (
                        <option
                            key={type}
                            value={type}
                        >
                            {type}
                        </option>
                    )
                )}
            </select>

            <select
                value={
                    readFilter
                }
                onChange={(event) =>
                    setReadFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
            >
                <option value="">
                    Tất cả trạng thái
                </option>

                <option value="false">
                    User chưa đọc
                </option>

                <option value="true">
                    User đã đọc
                </option>
            </select>

            <input
                type="number"
                min="1"
                value={
                    userIdFilter
                }
                onChange={(event) =>
                    setUserIdFilter(
                        event.target.value
                    )
                }
                placeholder="Lọc User ID"
                className="w-36 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />

            <input
                type="number"
                min="1"
                value={
                    bookingIdFilter
                }
                onChange={(event) =>
                    setBookingIdFilter(
                        event.target.value
                    )
                }
                placeholder="Lọc Booking ID"
                className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />

            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">
                    Từ ngày
                </span>

                <input
                    type="datetime-local"
                    value={
                        fromDate
                    }
                    onChange={(event) =>
                        setFromDate(
                            event.target.value
                        )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:border-blue-500"
                />
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">
                    Đến ngày
                </span>

                <input
                    type="datetime-local"
                    value={
                        toDate
                    }
                    onChange={(event) =>
                        setToDate(
                            event.target.value
                        )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:border-blue-500"
                />
            </label>

            <button
                type="button"
                onClick={
                    clearFilters
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
                <FilterX
                    size={17}
                />

                Xóa lọc
            </button>
        </div>
    );

    return (
        <EntityManager
            title="Notifications"
            subtitle="Admin chỉ theo dõi trạng thái đọc của người nhận và tạo thông báo thủ công."
            endpoint="/notification-service/notifications"
            paginated
            initialPageSize={10}
            requestParams={
                requestParams
            }
            defaultSortBy="createdAt"
            defaultSortDirection="desc"
            allowCreate
            allowEdit={false}
            allowDelete={false}
            headerActions={
                headerActions
            }
            columns={[
                {
                    key: "id",
                    label: "ID",
                },
                {
                    key: "userId",
                    label: "User ID",
                },
                {
                    key: "bookingId",
                    label:
                        "Booking ID",

                    render: (
                        notification
                    ) =>
                        notification.bookingId ||
                        "NULL",
                },
                {
                    key: "type",
                    label: "Loại",

                    render: (
                        notification
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeClass(
                                notification.type
                            )}`}
                        >
                            {notification.type ||
                                "SYSTEM"}
                        </span>
                    ),
                },
                {
                    key: "title",
                    label: "Tiêu đề",
                },
                {
                    key: "message",
                    label: "Nội dung",

                    render: (
                        notification
                    ) => (
                        <span className="line-clamp-2 block max-w-96 text-slate-600">
                            {
                                notification.message
                            }
                        </span>
                    ),
                },
                {
                    key: "actionUrl",
                    label:
                        "Action URL",

                    render: (
                        notification
                    ) => (
                        <span className="text-xs text-blue-600">
                            {notification.actionUrl ||
                                "NULL"}
                        </span>
                    ),
                },
                {
                    key: "eventKey",
                    label:
                        "Event Key",

                    render: (
                        notification
                    ) => (
                        <span className="block max-w-72 truncate text-xs text-slate-500">
                            {notification.eventKey ||
                                "MANUAL"}
                        </span>
                    ),
                },
                {
                    key: "isRead",
                    label:
                        "Trạng thái người nhận",

                    render: (
                        notification
                    ) => (
                        <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${notification.isRead
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {notification.isRead
                                ? "USER ĐÃ ĐỌC"
                                : "USER CHƯA ĐỌC"}
                        </span>
                    ),
                },
                {
                    key: "createdAt",
                    label:
                        "Ngày tạo",

                    render: (
                        notification
                    ) =>
                        formatDateTime(
                            notification.createdAt
                        ),
                },
                {
                    key: "readAt",
                    label:
                        "User đọc lúc",

                    render: (
                        notification
                    ) =>
                        formatDateTime(
                            notification.readAt
                        ),
                },
            ]}
            fields={[
                {
                    name: "userId",
                    label: "User ID",
                    type: "number",
                    required: true,
                    placeholder:
                        "Nhập User ID",
                },
                {
                    name:
                        "bookingId",

                    label:
                        "Booking ID",

                    type: "number",

                    placeholder:
                        "Có thể để trống",
                },
                {
                    name: "title",
                    label: "Tiêu đề",
                    required: true,

                    placeholder:
                        "Nhập tiêu đề thông báo",
                },
                {
                    name: "message",
                    label: "Nội dung",
                    type: "textarea",
                    required: true,

                    placeholder:
                        "Nhập nội dung thông báo",
                },
                {
                    name: "type",
                    label: "Loại",
                    type: "select",

                    options:
                        NOTIFICATION_TYPES,

                    defaultValue:
                        "SYSTEM",

                    required: true,
                },
                {
                    name:
                        "actionUrl",

                    label:
                        "Action URL",

                    placeholder:
                        "/my-bookings hoặc /my-tickets",
                },
            ]}
            buildPayload={(
                form
            ) => ({
                userId:
                    form.userId
                        ? Number(
                            form.userId
                        )
                        : null,

                bookingId:
                    form.bookingId
                        ? Number(
                            form.bookingId
                        )
                        : null,

                title:
                    form.title
                        ?.trim(),

                message:
                    form.message
                        ?.trim(),

                type:
                    form.type ||
                    "SYSTEM",

                actionUrl:
                    form.actionUrl
                        ?.trim() ||
                    null,
            })}
        />
    );
}

export default Notifications;