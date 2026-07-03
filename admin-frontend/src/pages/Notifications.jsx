import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";
import { CheckCircle, RotateCcw } from "lucide-react";

function Notifications() {
    const markAsRead = async (id, loadItems) => {
        try {
            await axiosClient.put(`/notification-service/notifications/${id}/read`);
            alert("Đã đánh dấu thông báo là đã đọc");
            loadItems();
        } catch (err) {
            console.error(err);
            alert("Không đánh dấu đã đọc được.");
        }
    };

    const markAsUnread = async (id, loadItems) => {
        try {
            await axiosClient.put(`/notification-service/notifications/${id}/unread`);
            alert("Đã chuyển thông báo về chưa đọc");
            loadItems();
        } catch (err) {
            console.error(err);
            alert("Không chuyển về chưa đọc được.");
        }
    };

    const getTypeClass = (type) => {
        if (type === "BOOKING_CREATED") return "bg-blue-100 text-blue-700";
        if (type === "PAYMENT_SUCCESS") return "bg-green-100 text-green-700";
        if (type === "TICKET_ISSUED") return "bg-purple-100 text-purple-700";
        if (type === "BOOKING_CANCELLED") return "bg-red-100 text-red-700";
        return "bg-slate-100 text-slate-700";
    };

    return (
        <EntityManager
            title="Notifications"
            subtitle="Quản lý thông báo hệ thống: booking created, payment success, ticket issued, booking cancelled."
            endpoint="/notification-service/notifications"
            allowCreate={false}
            allowEdit={false}
            columns={[
                { key: "id", label: "ID" },
                { key: "userId", label: "User ID" },
                {
                    key: "type",
                    label: "Type",
                    render: (n) => (
                        <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${getTypeClass(
                                n.type
                            )}`}
                        >
                            {n.type || "SYSTEM"}
                        </span>
                    ),
                },
                { key: "title", label: "Title" },
                {
                    key: "message",
                    label: "Message",
                    render: (n) => (
                        <span className="line-clamp-2 text-slate-600">
                            {n.message}
                        </span>
                    ),
                },
                {
                    key: "isRead",
                    label: "Read",
                    render: (n) => (
                        <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${n.isRead
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {n.isRead ? "READ" : "UNREAD"}
                        </span>
                    ),
                },
                {
                    key: "createdAt",
                    label: "Created At",
                    render: (n) =>
                        n.createdAt ? String(n.createdAt).replace("T", " ") : "NULL",
                },
                {
                    key: "readAt",
                    label: "Read At",
                    render: (n) =>
                        n.readAt ? String(n.readAt).replace("T", " ") : "NULL",
                },
            ]}
            fields={[]}
            extraActions={(notification, loadItems) => (
                <>
                    {!notification.isRead ? (
                        <button
                            onClick={() => markAsRead(notification.id, loadItems)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                            <CheckCircle size={15} />
                            Đã đọc
                        </button>
                    ) : (
                        <button
                            onClick={() => markAsUnread(notification.id, loadItems)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800"
                        >
                            <RotateCcw size={15} />
                            Chưa đọc
                        </button>
                    )}
                </>
            )}
        />
    );
}

export default Notifications;