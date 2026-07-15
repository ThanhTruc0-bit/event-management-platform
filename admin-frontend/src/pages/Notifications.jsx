import {
    useMemo,
    useState,
} from "react";

import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

import {
    CheckCheck,
    CheckCircle,
    RotateCcw,
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
    const [typeFilter, setTypeFilter] =
        useState("");

    const [readFilter, setReadFilter] =
        useState("");

    const [userIdFilter, setUserIdFilter] =
        useState("");

    const [bookingIdFilter, setBookingIdFilter] =
        useState("");

    const requestParams =
        useMemo(() => {
            const params = {};

            if (typeFilter) {
                params.type =
                    typeFilter;
            }

            if (readFilter !== "") {
                params.isRead =
                    readFilter === "true";
            }

            if (userIdFilter) {
                params.userId =
                    Number(userIdFilter);
            }

            if (bookingIdFilter) {
                params.bookingId =
                    Number(bookingIdFilter);
            }

            return params;
        }, [
            typeFilter,
            readFilter,
            userIdFilter,
            bookingIdFilter,
        ]);

    const markAsRead =
        async (
            id,
            loadItems
        ) => {
            try {
                await axiosClient.put(
                    `/notification-service/notifications/${id}/read`
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                alert(
                    error?.response?.data?.message ||
                    "Không đánh dấu đã đọc được."
                );
            }
        };

    const markAsUnread =
        async (
            id,
            loadItems
        ) => {
            try {
                await axiosClient.put(
                    `/notification-service/notifications/${id}/unread`
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                alert(
                    error?.response?.data?.message ||
                    "Không chuyển về chưa đọc được."
                );
            }
        };

    const markAllAsRead =
        async (
            userId,
            loadItems
        ) => {
            if (!userId) {
                alert(
                    "Thông báo không có User ID."
                );
                return;
            }

            try {
                await axiosClient.put(
                    `/notification-service/notifications/user/${userId}/read-all`
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                alert(
                    error?.response?.data?.message ||
                    "Không đánh dấu tất cả được."
                );
            }
        };

    const getTypeClass =
        (type) => {
            if (
                type ===
                "BOOKING_CREATED"
            ) {
                return "bg-blue-100 text-blue-700";
            }

            if (
                type ===
                "PAYMENT_SUCCESS"
            ) {
                return "bg-green-100 text-green-700";
            }

            if (
                type ===
                "PAYMENT_FAILED"
            ) {
                return "bg-orange-100 text-orange-700";
            }

            if (
                type ===
                "TICKET_ISSUED"
            ) {
                return "bg-purple-100 text-purple-700";
            }

            if (
                type ===
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

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={typeFilter}
                onChange={(event) =>
                    setTypeFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
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
                value={readFilter}
                onChange={(event) =>
                    setReadFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả trạng thái
                </option>

                <option value="false">
                    Chưa đọc
                </option>

                <option value="true">
                    Đã đọc
                </option>
            </select>

            <input
                type="number"
                min="1"
                value={userIdFilter}
                onChange={(event) =>
                    setUserIdFilter(
                        event.target.value
                    )
                }
                placeholder="Lọc User ID"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <input
                type="number"
                min="1"
                value={bookingIdFilter}
                onChange={(event) =>
                    setBookingIdFilter(
                        event.target.value
                    )
                }
                placeholder="Lọc Booking ID"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            />
        </div>
    );

    return (
        <EntityManager
            title="Notifications"
            subtitle="Thông báo được tạo tự động qua RabbitMQ khi booking, thanh toán và ticket thay đổi."
            endpoint="/notification-service/notifications"
            paginated
            initialPageSize={10}
            requestParams={
                requestParams
            }
            defaultSortBy="createdAt"
            defaultSortDirection="desc"
            allowCreate={false}
            allowEdit={false}
            allowDelete
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
                    label: "Booking ID",
                    render: (
                        notification
                    ) =>
                        notification.bookingId ||
                        "NULL",
                },
                {
                    key: "type",
                    label: "Type",
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
                    label: "Title",
                },
                {
                    key: "message",
                    label: "Message",
                    render: (
                        notification
                    ) => (
                        <span className="line-clamp-2 max-w-96 text-slate-600">
                            {
                                notification.message
                            }
                        </span>
                    ),
                },
                {
                    key: "eventKey",
                    label: "Event Key",
                    render: (
                        notification
                    ) => (
                        <span className="text-xs text-slate-500">
                            {notification.eventKey ||
                                "MANUAL"}
                        </span>
                    ),
                },
                {
                    key: "isRead",
                    label: "Read",
                    render: (
                        notification
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${notification.isRead
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {notification.isRead
                                ? "READ"
                                : "UNREAD"}
                        </span>
                    ),
                },
                {
                    key: "createdAt",
                    label: "Created At",
                    render: (
                        notification
                    ) =>
                        formatDateTime(
                            notification.createdAt
                        ),
                },
                {
                    key: "readAt",
                    label: "Read At",
                    render: (
                        notification
                    ) =>
                        formatDateTime(
                            notification.readAt
                        ),
                },
            ]}
            fields={[]}
            extraActions={(
                notification,
                loadItems
            ) => (
                <>
                    {!notification.isRead ? (
                        <button
                            type="button"
                            onClick={() =>
                                markAsRead(
                                    notification.id,
                                    loadItems
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                        >
                            <CheckCircle
                                size={15}
                            />
                            Đã đọc
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                markAsUnread(
                                    notification.id,
                                    loadItems
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-800"
                        >
                            <RotateCcw
                                size={15}
                            />
                            Chưa đọc
                        </button>
                    )}

                    {!notification.isRead && (
                        <button
                            type="button"
                            onClick={() =>
                                markAllAsRead(
                                    notification.userId,
                                    loadItems
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                        >
                            <CheckCheck
                                size={15}
                            />
                            Đọc hết của user
                        </button>
                    )}
                </>
            )}
        />
    );
}

export default Notifications;