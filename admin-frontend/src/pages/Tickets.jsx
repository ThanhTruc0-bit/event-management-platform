import { useEffect, useMemo, useState } from "react";
import { CheckCircle, QrCode } from "lucide-react";
import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

function Tickets() {
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [seats, setSeats] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        loadEvents();
        loadUsers();
        loadSeats();
        loadBookings();
    }, []);

    const loadEvents = async () => {
        try {
            const res = await axiosClient.get("/event-service/events");
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setEvents([]);
        }
    };

    const loadUsers = async () => {
        try {
            const res = await axiosClient.get("/user-service/users");
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setUsers([]);
        }
    };

    const loadSeats = async () => {
        try {
            const res = await axiosClient.get("/seat-service/seats");
            setSeats(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setSeats([]);
        }
    };

    const loadBookings = async () => {
        try {
            const res = await axiosClient.get("/booking-service/bookings");
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setBookings([]);
        }
    };

    const eventMap = useMemo(() => {
        const map = new Map();

        events.forEach((event) => {
            map.set(String(event.id), event);
        });

        return map;
    }, [events]);

    const userMap = useMemo(() => {
        const map = new Map();

        users.forEach((user) => {
            map.set(String(user.id), user);
        });

        return map;
    }, [users]);

    const seatMap = useMemo(() => {
        const map = new Map();

        seats.forEach((seat) => {
            map.set(String(seat.id), seat);
        });

        return map;
    }, [seats]);

    const bookingMap = useMemo(() => {
        const map = new Map();

        bookings.forEach((booking) => {
            map.set(String(booking.id), booking);
        });

        return map;
    }, [bookings]);

    const getEventName = (eventId) => {
        const event = eventMap.get(String(eventId));
        return event ? event.name : `Event #${eventId}`;
    };

    const getUserName = (userId) => {
        const user = userMap.get(String(userId));
        return user ? user.name || user.email : `User #${userId}`;
    };

    const getSeatName = (seatId) => {
        const seat = seatMap.get(String(seatId));
        return seat ? seat.seatNumber : `Seat #${seatId}`;
    };

    const getBookingCode = (bookingId) => {
        const booking = bookingMap.get(String(bookingId));
        return booking ? booking.bookingCode : `Booking #${bookingId}`;
    };

    const formatMoney = (value) => {
        return `${Number(value || 0).toLocaleString()} đ`;
    };

    const formatDate = (value) => {
        if (!value) return "NULL";
        return String(value).replace("T", " ");
    };

    const getStatusClass = (status) => {
        if (status === "VALID") {
            return "bg-green-100 text-green-700";
        }

        if (status === "USED") {
            return "bg-blue-100 text-blue-700";
        }

        if (status === "CANCELLED") {
            return "bg-red-100 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    const useTicket = async (ticketId, loadItems) => {
        if (!window.confirm("Xác nhận check-in vé này?")) return;

        try {
            await axiosClient.put(`/ticket-service/tickets/${ticketId}/use`);
            alert("Check-in vé thành công");
            loadItems();
        } catch (err) {
            console.error(err);
            alert("Không check-in được vé. Vé có thể đã USED hoặc CANCELLED.");
        }
    };

    return (
        <div>
            <EntityManager
                title="Tickets"
                subtitle="Danh sách vé QR đã phát hành sau khi booking thanh toán PAID. Vé được tạo tự động, không nhập tay."
                endpoint="/ticket-service/tickets"
                allowCreate={false}
                allowEdit={false}
                allowDelete={false}
                columns={[
                    {
                        key: "id",
                        label: "ID",
                    },
                    {
                        key: "ticketCode",
                        label: "Ticket Code",
                        render: (ticket) => (
                            <div>
                                <div className="font-bold text-slate-900">
                                    {ticket.ticketCode || `TICKET-${ticket.id}`}
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                    Ticket ID: {ticket.id}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "qrImage",
                        label: "QR",
                        render: (ticket) =>
                            ticket.qrImage ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="group"
                                >
                                    <img
                                        src={ticket.qrImage}
                                        alt={ticket.ticketCode || "QR Ticket"}
                                        className="h-18 w-18 rounded-xl border object-cover group-hover:scale-105 transition"
                                    />
                                </button>
                            ) : (
                                <span className="text-slate-400">NULL</span>
                            ),
                    },
                    {
                        key: "bookingId",
                        label: "Booking",
                        render: (ticket) => (
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {getBookingCode(ticket.bookingId)}
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                    Booking ID: {ticket.bookingId}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "userId",
                        label: "User",
                        render: (ticket) => (
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {getUserName(ticket.userId)}
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                    User ID: {ticket.userId}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "eventId",
                        label: "Event",
                        render: (ticket) => (
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {getEventName(ticket.eventId)}
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                    Event ID: {ticket.eventId}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "seatId",
                        label: "Seat",
                        render: (ticket) => (
                            <div>
                                <div className="font-bold text-slate-900">
                                    {getSeatName(ticket.seatId)}
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                    Seat ID: {ticket.seatId}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: "ticketType",
                        label: "Type",
                        render: (ticket) => (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${ticket.ticketType === "VIP"
                                        ? "bg-purple-100 text-purple-700"
                                        : ticket.ticketType === "STANDARD"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {ticket.ticketType || "STANDARD"}
                            </span>
                        ),
                    },
                    {
                        key: "price",
                        label: "Price",
                        render: (ticket) => formatMoney(ticket.price),
                    },
                    {
                        key: "status",
                        label: "Status",
                        render: (ticket) => (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusClass(
                                    ticket.status
                                )}`}
                            >
                                {ticket.status || "VALID"}
                            </span>
                        ),
                    },
                    {
                        key: "issuedAt",
                        label: "Issued At",
                        render: (ticket) => formatDate(ticket.issuedAt),
                    },
                ]}
                fields={[]}
                extraActions={(ticket, loadItems) => (
                    <>
                        {ticket.qrImage && (
                            <button
                                type="button"
                                onClick={() => setSelectedTicket(ticket)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-black"
                            >
                                <QrCode size={15} />
                                QR
                            </button>
                        )}

                        {ticket.status === "VALID" && (
                            <button
                                type="button"
                                onClick={() => useTicket(ticket.id, loadItems)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                                <CheckCircle size={15} />
                                Check-in
                            </button>
                        )}
                    </>
                )}
            />

            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white w-120 rounded-3xl shadow-2xl p-6">
                        <div className="text-center">
                            <p className="text-sm text-blue-600 font-semibold">
                                Ticket QR
                            </p>

                            <h2 className="text-xl font-bold text-slate-900 mt-1 break-all">
                                {selectedTicket.ticketCode}
                            </h2>

                            <p className="text-sm text-slate-500 mt-2">
                                {getEventName(selectedTicket.eventId)} · Ghế{" "}
                                {getSeatName(selectedTicket.seatId)}
                            </p>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <img
                                src={selectedTicket.qrImage}
                                alt={selectedTicket.ticketCode || "QR Ticket"}
                                className="h-72 w-72 border rounded-2xl"
                            />
                        </div>

                        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                            <div>
                                <b>Booking:</b> {getBookingCode(selectedTicket.bookingId)}
                            </div>

                            <div>
                                <b>User:</b> {getUserName(selectedTicket.userId)}
                            </div>

                            <div>
                                <b>Event:</b> {getEventName(selectedTicket.eventId)}
                            </div>

                            <div>
                                <b>Seat:</b> {getSeatName(selectedTicket.seatId)}
                            </div>

                            <div>
                                <b>Price:</b> {formatMoney(selectedTicket.price)}
                            </div>

                            <div>
                                <b>Status:</b> {selectedTicket.status}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-black"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Tickets;