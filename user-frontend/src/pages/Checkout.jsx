import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Ticket,
    Timer,
    Users,
} from "lucide-react";

function Checkout() {
    const MAX_TICKETS_PER_ACCOUNT = 4;

    const { eventId } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [selectedSeatIds, setSelectedSeatIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [seatHoldSeconds, setSeatHoldSeconds] = useState(600);

    useEffect(() => {
        loadCheckoutData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    useEffect(() => {
        if (selectedSeatIds.length === 0) {
            setSeatHoldSeconds(600);
            return undefined;
        }

        setSeatHoldSeconds(600);

        const timer = setInterval(() => {
            setSeatHoldSeconds((value) => {
                if (value <= 1) {
                    clearInterval(timer);
                    setSelectedSeatIds([]);
                    setError("Hết thời gian giữ lựa chọn. Vui lòng chọn vé lại.");
                    return 0;
                }

                return value - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [selectedSeatIds.length]);

    const getNumberValue = (value) => {
        if (value === null || value === undefined || value === "") return null;

        const number = Number(value);
        return Number.isNaN(number) ? null : number;
    };

    const normalizeStatus = (status) => {
        return String(status || "").toUpperCase();
    };

    const getSeatPrice = (seat) => {
        return (
            getNumberValue(seat?.price) ??
            getNumberValue(seat?.ticketPrice) ??
            getNumberValue(seat?.seatPrice) ??
            getNumberValue(seat?.amount) ??
            0
        );
    };

    const getSeatLabel = (seat) => {
        return (
            seat?.seatNumber ||
            seat?.name ||
            seat?.code ||
            seat?.label ||
            `Ghế #${seat?.id}`
        );
    };

    const getSeatGroupName = (seat) => {
        return (
            seat?.seatType ||
            seat?.ticketType ||
            seat?.zone ||
            seat?.area ||
            seat?.section ||
            seat?.seatClass ||
            seat?.type ||
            "Khu vực vé"
        );
    };

    const getCurrentUserId = () => {
        const userKeys = ["user", "authUser", "currentUser"];

        for (const key of userKeys) {
            try {
                const raw = localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);
                const id = user?.id ?? user?.userId ?? user?.user?.id;

                if (id) return Number(id);
            } catch {
                // bỏ qua localStorage sai format
            }
        }

        try {
            const token =
                localStorage.getItem("token") ||
                localStorage.getItem("accessToken") ||
                localStorage.getItem("jwt");

            if (!token) return null;

            const payload = token.split(".")[1];

            if (!payload) return null;

            const decoded = JSON.parse(
                atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
            );

            const id = decoded?.userId ?? decoded?.id ?? decoded?.sub;

            return id ? Number(id) : null;
        } catch {
            return null;
        }
    };

    const loadCheckoutData = async () => {
        try {
            setLoading(true);
            setError("");
            setSelectedSeatIds([]);

            const [eventRes, seatRes] = await Promise.all([
                axiosClient.get(`/event-service/events/${eventId}`),
                axiosClient.get(`/seat-service/seats/event/${eventId}`),
            ]);

            setEvent(eventRes.data);
            setSeats(Array.isArray(seatRes.data) ? seatRes.data : []);
        } catch (err) {
            console.error(err);
            setError(
                "Không tải được dữ liệu chọn vé. Kiểm tra event-service hoặc seat-service."
            );
            setEvent(null);
            setSeats([]);
        } finally {
            setLoading(false);
        }
    };

    const availableSeats = useMemo(() => {
        return seats.filter((seat) => normalizeStatus(seat.status) === "AVAILABLE");
    }, [seats]);

    const selectedSeats = useMemo(() => {
        return seats.filter((seat) => selectedSeatIds.includes(seat.id));
    }, [seats, selectedSeatIds]);

    const totalAmount = useMemo(() => {
        return selectedSeats.reduce((sum, seat) => sum + getSeatPrice(seat), 0);
    }, [selectedSeats]);

    const seatGroups = useMemo(() => {
        const map = new Map();

        seats.forEach((seat) => {
            const groupName = getSeatGroupName(seat);

            if (!map.has(groupName)) {
                map.set(groupName, []);
            }

            map.get(groupName).push(seat);
        });

        return Array.from(map.entries()).map(([name, groupSeats]) => {
            const prices = groupSeats
                .map((seat) => getSeatPrice(seat))
                .filter((price) => price !== null);

            const available = groupSeats.filter(
                (seat) => normalizeStatus(seat.status) === "AVAILABLE"
            );

            return {
                name,
                seats: groupSeats,
                availableCount: available.length,
                totalCount: groupSeats.length,
                minPrice: prices.length > 0 ? Math.min(...prices) : null,
                maxPrice: prices.length > 0 ? Math.max(...prices) : null,
            };
        });
    }, [seats]);

    const toggleSeat = (seat) => {
        if (normalizeStatus(seat.status) !== "AVAILABLE") return;

        setError("");

        setSelectedSeatIds((prev) => {
            if (prev.includes(seat.id)) {
                return prev.filter((id) => id !== seat.id);
            }

            if (prev.length >= MAX_TICKETS_PER_ACCOUNT) {
                setError(
                    `Mỗi tài khoản chỉ được mua tối đa ${MAX_TICKETS_PER_ACCOUNT} vé cho một sự kiện.`
                );
                return prev;
            }

            return [...prev, seat.id];
        });
    };

    const clearSelectedSeats = () => {
        setSelectedSeatIds([]);
        setError("");
    };

    const formatMoney = (value) => {
        const number = getNumberValue(value);

        if (number === null) return "Đang cập nhật";
        if (number === 0) return "Miễn phí";

        return `${number.toLocaleString("vi-VN")} đ`;
    };

    const formatDateParts = (value) => {
        if (!value) {
            return {
                date: "Đang cập nhật",
                time: "",
                full: "Đang cập nhật",
            };
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            const text = String(value).replace("T", " ");
            return {
                date: text,
                time: "",
                full: text,
            };
        }

        const time = date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        });

        const day = date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

        const weekday = date.toLocaleDateString("vi-VN", {
            weekday: "long",
        });

        return {
            date: day,
            time,
            full: `${time}, ${weekday}, ${day}`,
        };
    };

    const formatCountdown = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainSeconds = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(
            remainSeconds
        ).padStart(2, "0")}`;
    };

    const getEventImage = (eventData) => {
        const image =
            eventData?.imageUrl ||
            eventData?.banner ||
            eventData?.bannerUrl ||
            eventData?.thumbnail ||
            eventData?.image;

        if (!image) return "";

        if (image.startsWith("http://localhost:8084")) {
            return image.replace("http://localhost:8084", "/api/event-service");
        }

        if (image.startsWith("http://event-service:8084")) {
            return image.replace("http://event-service:8084", "/api/event-service");
        }

        if (image.startsWith("/uploads")) {
            return `/api/event-service${image}`;
        }

        return image;
    };

    const getPaymentUrl = (data) => {
        if (typeof data === "string") return data;

        return (
            data?.paymentUrl ||
            data?.payUrl ||
            data?.url ||
            data?.redirectUrl ||
            data?.vnpayUrl ||
            data?.data?.paymentUrl ||
            data?.data?.url
        );
    };

    const getBookingId = (data) => {
        return (
            data?.id ||
            data?.bookingId ||
            data?.booking?.id ||
            data?.data?.id ||
            data?.data?.bookingId
        );
    };

    const handleCheckout = async () => {
        try {
            setError("");

            const userId = getCurrentUserId();

            if (!userId) {
                setError("Bạn cần đăng nhập trước khi đặt vé.");
                navigate("/login");
                return;
            }

            if (selectedSeatIds.length === 0) {
                setError("Vui lòng chọn ít nhất 1 ghế.");
                return;
            }

            if (selectedSeatIds.length > MAX_TICKETS_PER_ACCOUNT) {
                setError(
                    `Mỗi tài khoản chỉ được mua tối đa ${MAX_TICKETS_PER_ACCOUNT} vé cho một sự kiện.`
                );
                return;
            }

            setSubmitting(true);

            const bookingRes = await axiosClient.post("/booking-service/bookings", {
                userId,
                eventId: Number(eventId),
                seatIds: selectedSeatIds,
            });

            const bookingId = getBookingId(bookingRes.data);

            if (!bookingId) {
                throw new Error("Không lấy được bookingId sau khi tạo booking.");
            }

            const paymentRes = await axiosClient.post(
                `/payment-service/payments/booking/${bookingId}/vnpay`
            );

            const paymentUrl = getPaymentUrl(paymentRes.data);

            if (!paymentUrl) {
                throw new Error("Không lấy được paymentUrl từ payment-service.");
            }

            window.location.href = paymentUrl;
        } catch (err) {
            console.error(err);

            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Không thể tạo booking hoặc thanh toán.";

            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const image = getEventImage(event);
    const dateParts = formatDateParts(event?.eventDate);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111317] text-white px-4 py-16">
                <div className="max-w-7xl mx-auto rounded-[28px] bg-[#1f232b] border border-white/10 p-10 text-center text-slate-300">
                    Đang tải trang chọn vé...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111317] text-white pb-16">
            <section className="bg-[#08090b] border-b border-white/10">
                <div className="max-w-[1500px] mx-auto px-4 lg:px-8 py-6">
                    <Link
                        to={`/events/${eventId}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-emerald-300 mb-5"
                    >
                        <ArrowLeft size={17} />
                        Quay lại chi tiết sự kiện
                    </Link>

                    <div className="rounded-[28px] bg-[#1f232b] border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
                            <div className="relative h-[230px] lg:h-full min-h-[230px] bg-gradient-to-br from-emerald-500 to-cyan-500">
                                {image ? (
                                    <img
                                        src={image}
                                        alt={event?.name}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Ticket size={72} className="text-white" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            </div>

                            <div className="p-6 md:p-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-black mb-4">
                                    <Ticket size={15} />
                                    Chọn vé
                                </div>

                                <h1 className="text-2xl md:text-4xl font-black leading-snug">
                                    {event?.name || `Event #${eventId}`}
                                </h1>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                                        <CalendarDays
                                            size={21}
                                            className="text-emerald-400"
                                        />
                                        <div className="text-xs text-slate-400 mt-3">
                                            Thời gian
                                        </div>
                                        <div className="font-black mt-1">
                                            {dateParts.full}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                                        <MapPin
                                            size={21}
                                            className="text-emerald-400"
                                        />
                                        <div className="text-xs text-slate-400 mt-3">
                                            Địa điểm
                                        </div>
                                        <div className="font-black mt-1">
                                            {event?.location || "Đang cập nhật"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                                        <Users
                                            size={21}
                                            className="text-emerald-400"
                                        />
                                        <div className="text-xs text-slate-400 mt-3">
                                            Vé còn lại
                                        </div>
                                        <div className="font-black mt-1">
                                            {availableSeats.length} / {seats.length} vé
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[24px] bg-[#1b1f27] border border-white/10 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-emerald-500 text-white p-4">
                                <div className="flex items-center gap-2 font-black">
                                    <CheckCircle2 size={20} />
                                    1. Chọn vé
                                </div>
                                <div className="text-xs mt-2 opacity-90">
                                    Chọn tối đa {MAX_TICKETS_PER_ACCOUNT} vé
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                                <div className="flex items-center gap-2 font-black text-slate-300">
                                    <CreditCard size={20} />
                                    2. Thanh toán
                                </div>
                                <div className="text-xs mt-2 text-slate-500">
                                    Thanh toán VNPay
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                                <div className="flex items-center gap-2 font-black text-slate-300">
                                    <ShieldCheck size={20} />
                                    3. Hoàn tất
                                </div>
                                <div className="text-xs mt-2 text-slate-500">
                                    Nhận vé QR
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-[1500px] mx-auto px-4 lg:px-8 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="rounded-[28px] bg-[#30343e] border border-white/10 overflow-hidden">
                            <div className="bg-[#22252d] px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-emerald-400">
                                        Chọn ghế / vé
                                    </h2>

                                    <p className="text-sm text-slate-400 mt-1">
                                        Mỗi tài khoản chỉ được mua tối đa{" "}
                                        {MAX_TICKETS_PER_ACCOUNT} vé cho một sự kiện.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={loadCheckoutData}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-slate-950 text-sm font-black hover:bg-slate-100"
                                >
                                    <RefreshCw size={16} />
                                    Reload ghế
                                </button>
                            </div>

                            <div className="p-5 md:p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
                                    <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/20 p-3">
                                        <div className="flex items-center gap-2 font-black text-emerald-300">
                                            <span className="h-4 w-4 rounded bg-emerald-500"></span>
                                            AVAILABLE
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Có thể chọn
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-amber-400/15 border border-amber-400/20 p-3">
                                        <div className="flex items-center gap-2 font-black text-amber-300">
                                            <span className="h-4 w-4 rounded bg-amber-400"></span>
                                            RESERVED
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Đang được giữ
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-red-500/15 border border-red-500/20 p-3">
                                        <div className="flex items-center gap-2 font-black text-red-300">
                                            <span className="h-4 w-4 rounded bg-red-500"></span>
                                            BOOKED
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Đã bán
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3">
                                        <div className="flex items-center gap-2 font-black text-white">
                                            <span className="h-4 w-4 rounded bg-white"></span>
                                            Đã chọn
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {selectedSeatIds.length} /{" "}
                                            {MAX_TICKETS_PER_ACCOUNT} vé
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 p-4 flex gap-3">
                                        <AlertCircle
                                            size={20}
                                            className="shrink-0 mt-0.5"
                                        />
                                        <div className="text-sm font-bold">{error}</div>
                                    </div>
                                )}

                                {selectedSeatIds.length > 0 && (
                                    <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Timer
                                                size={22}
                                                className="text-emerald-300 shrink-0"
                                            />

                                            <div>
                                                <div className="font-black text-emerald-300">
                                                    Thời gian giữ lựa chọn:{" "}
                                                    {formatCountdown(seatHoldSeconds)}
                                                </div>

                                                <div className="text-sm text-slate-300 mt-1">
                                                    Ghế chỉ được giữ thật sự sau khi tạo
                                                    booking.
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={clearSelectedSeats}
                                            className="px-4 py-2 rounded-full bg-white/[0.08] text-white text-sm font-black hover:bg-white/[0.12]"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                )}

                                {seats.length === 0 ? (
                                    <div className="rounded-2xl bg-black/20 border border-white/10 p-6 text-slate-300">
                                        Sự kiện này chưa có ghế.
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {seatGroups.map((group) => (
                                            <div
                                                key={group.name}
                                                className="rounded-[24px] bg-[#242832] border border-white/10 p-5"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
                                                    <div>
                                                        <div className="text-xl font-black uppercase">
                                                            {group.name}
                                                        </div>

                                                        <div className="text-sm text-slate-400 mt-1">
                                                            Còn {group.availableCount} /{" "}
                                                            {group.totalCount} vé
                                                        </div>
                                                    </div>

                                                    <div className="text-left md:text-right">
                                                        <div className="text-xs text-slate-400">
                                                            Giá vé
                                                        </div>

                                                        <div className="text-emerald-400 font-black text-lg">
                                                            {group.minPrice ===
                                                                group.maxPrice
                                                                ? formatMoney(
                                                                    group.minPrice
                                                                )
                                                                : `${formatMoney(
                                                                    group.minPrice
                                                                )} - ${formatMoney(
                                                                    group.maxPrice
                                                                )}`}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                                    {group.seats.map((seat) => {
                                                        const seatStatus =
                                                            normalizeStatus(seat.status);
                                                        const isAvailable =
                                                            seatStatus === "AVAILABLE";
                                                        const isSelected =
                                                            selectedSeatIds.includes(
                                                                seat.id
                                                            );

                                                        let className =
                                                            "border-white/10 bg-[#424754] text-white";

                                                        if (seatStatus === "RESERVED") {
                                                            className =
                                                                "bg-amber-400 text-slate-950 border-amber-300 cursor-not-allowed opacity-80";
                                                        }

                                                        if (seatStatus === "BOOKED") {
                                                            className =
                                                                "bg-red-500 text-white border-red-400 cursor-not-allowed opacity-80";
                                                        }

                                                        if (isAvailable) {
                                                            className =
                                                                "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400 hover:-translate-y-0.5";
                                                        }

                                                        if (isSelected) {
                                                            className =
                                                                "bg-white text-slate-950 border-white ring-2 ring-emerald-400";
                                                        }

                                                        return (
                                                            <button
                                                                key={seat.id}
                                                                type="button"
                                                                disabled={!isAvailable}
                                                                onClick={() =>
                                                                    toggleSeat(seat)
                                                                }
                                                                className={`rounded-2xl border p-4 text-left transition ${className}`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="font-black">
                                                                        {getSeatLabel(
                                                                            seat
                                                                        )}
                                                                    </div>

                                                                    {isSelected && (
                                                                        <CheckCircle2
                                                                            size={18}
                                                                        />
                                                                    )}
                                                                </div>

                                                                <div className="text-sm mt-2 opacity-90">
                                                                    {formatMoney(
                                                                        getSeatPrice(
                                                                            seat
                                                                        )
                                                                    )}
                                                                </div>

                                                                <div className="text-xs mt-1 opacity-80">
                                                                    {seatStatus}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <aside className="lg:col-span-4">
                        <div className="rounded-[28px] bg-[#30343e] border border-white/10 sticky top-[96px] overflow-hidden">
                            <div className="bg-[#22252d] px-5 py-4">
                                <h2 className="text-xl font-black text-emerald-400">
                                    Tóm tắt đơn hàng
                                </h2>
                            </div>

                            <div className="p-5">
                                <div className="rounded-2xl bg-black/15 border border-white/10 p-4 mb-5">
                                    <div className="text-xs text-slate-400">
                                        Sự kiện
                                    </div>

                                    <div className="font-black mt-1 line-clamp-2">
                                        {event?.name || `Event #${eventId}`}
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays
                                                size={16}
                                                className="text-emerald-400"
                                            />
                                            {dateParts.full}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <MapPin
                                                size={16}
                                                className="text-emerald-400"
                                            />
                                            {event?.location || "Đang cập nhật"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">
                                            Giới hạn mua
                                        </span>

                                        <span className="font-black text-emerald-300">
                                            {selectedSeats.length} /{" "}
                                            {MAX_TICKETS_PER_ACCOUNT} vé
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span>Số vé đã chọn</span>
                                        <span className="font-black text-white">
                                            {selectedSeats.length}
                                        </span>
                                    </div>

                                    <div className="border-t border-white/10 pt-4">
                                        {selectedSeats.length === 0 ? (
                                            <div className="text-slate-400 text-sm">
                                                Chưa chọn vé nào.
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                                {selectedSeats.map((seat) => (
                                                    <div
                                                        key={seat.id}
                                                        className="rounded-2xl bg-white/[0.06] border border-white/10 p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <div className="font-black">
                                                                    {getSeatLabel(seat)}
                                                                </div>

                                                                <div className="text-xs text-slate-400 mt-1">
                                                                    {getSeatGroupName(
                                                                        seat
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="font-black text-emerald-400">
                                                                {formatMoney(
                                                                    getSeatPrice(seat)
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-white/10 pt-4 space-y-3">
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span>Tạm tính</span>
                                            <span>{formatMoney(totalAmount)}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-slate-300">
                                            <span>Phí thanh toán</span>
                                            <span>0 đ</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                        <span className="text-lg font-black">
                                            Tổng cộng
                                        </span>

                                        <span className="text-2xl font-black text-emerald-400">
                                            {formatMoney(totalAmount)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCheckout}
                                    disabled={
                                        submitting || selectedSeatIds.length === 0
                                    }
                                    className="w-full h-14 mt-6 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2
                                                size={20}
                                                className="animate-spin"
                                            />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard size={20} />
                                            Thanh toán VNPay
                                            <ChevronRight size={19} />
                                        </>
                                    )}
                                </button>

                                <div className="mt-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                    <div className="flex gap-3">
                                        <ShieldCheck
                                            size={20}
                                            className="text-emerald-300 shrink-0 mt-0.5"
                                        />

                                        <p className="text-xs text-slate-300 leading-5">
                                            Sau khi bấm thanh toán, hệ thống sẽ tạo
                                            booking và chuyển bạn sang VNPay. Thanh toán
                                            thành công sẽ tạo vé QR để check-in.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
}

export default Checkout;