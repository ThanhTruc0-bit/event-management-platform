import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

function BookingItems() {
    const [bookings, setBookings] = useState([]);
    const [seats, setSeats] = useState([]);

    useEffect(() => {
        loadBookings();
        loadSeats();
    }, []);

    const loadBookings = async () => {
        try {
            const res = await axiosClient.get("/booking-service/bookings");
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setBookings([]);
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

    const bookingMap = useMemo(() => {
        const map = new Map();

        bookings.forEach((booking) => {
            map.set(String(booking.id), booking);
        });

        return map;
    }, [bookings]);

    const seatMap = useMemo(() => {
        const map = new Map();

        seats.forEach((seat) => {
            map.set(String(seat.id), seat);
        });

        return map;
    }, [seats]);

    const getBookingLabel = (bookingId) => {
        const booking = bookingMap.get(String(bookingId));

        if (!booking) {
            return `Booking #${bookingId}`;
        }

        return booking.bookingCode || `Booking #${bookingId}`;
    };

    const getSeatLabel = (seatId) => {
        const seat = seatMap.get(String(seatId));

        if (!seat) {
            return `Seat #${seatId}`;
        }

        return seat.seatNumber || `Seat #${seatId}`;
    };

    const getSeatType = (seatId) => {
        const seat = seatMap.get(String(seatId));
        return seat?.seatType || "NULL";
    };

    const getSeatStatus = (seatId) => {
        const seat = seatMap.get(String(seatId));
        return seat?.status || "NULL";
    };

    return (
        <EntityManager
            title="Booking Items"
            subtitle="Danh sách ghế/vé thuộc từng booking. Dữ liệu này được tạo tự động khi tạo booking, không nhập tay."
            endpoint="/booking-service/booking-items"
            allowCreate={false}
            allowEdit={false}
            allowDelete={false}
            headerActions={
                <Link
                    to="/bookings"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold shadow hover:bg-black"
                >
                    <ArrowLeft size={18} />
                    Về Bookings
                </Link>
            }
            columns={[
                {
                    key: "id",
                    label: "ID",
                },
                {
                    key: "bookingId",
                    label: "Booking",
                    render: (item) => (
                        <div>
                            <div className="font-bold text-slate-900">
                                {getBookingLabel(item.bookingId)}
                            </div>

                            <div className="text-xs text-slate-500 mt-1">
                                Booking ID: {item.bookingId}
                            </div>
                        </div>
                    ),
                },
                {
                    key: "seatId",
                    label: "Seat",
                    render: (item) => (
                        <div>
                            <div className="font-bold text-slate-900">
                                {getSeatLabel(item.seatId)}
                            </div>

                            <div className="text-xs text-slate-500 mt-1">
                                Seat ID: {item.seatId}
                            </div>
                        </div>
                    ),
                },
                {
                    key: "seatType",
                    label: "Seat Type",
                    render: (item) => {
                        const seatType = getSeatType(item.seatId);

                        return (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${seatType === "VIP"
                                    ? "bg-purple-100 text-purple-700"
                                    : seatType === "STANDARD"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {seatType}
                            </span>
                        );
                    },
                },
                {
                    key: "seatStatus",
                    label: "Seat Status",
                    render: (item) => {
                        const status = getSeatStatus(item.seatId);

                        return (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${status === "AVAILABLE"
                                    ? "bg-green-100 text-green-700"
                                    : status === "RESERVED"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : status === "BOOKED"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {status}
                            </span>
                        );
                    },
                },
                {
                    key: "price",
                    label: "Price",
                    render: (item) => `${Number(item.price || 0).toLocaleString()} đ`,
                },
            ]}
            fields={[]}
        />
    );
}

export default BookingItems;