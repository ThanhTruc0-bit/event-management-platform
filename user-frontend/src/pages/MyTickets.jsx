import { useEffect, useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Home,
    Loader2,
    MapPin,
    QrCode,
    RefreshCw,
    Search,
    ShieldCheck,
    Ticket,
    User,
    XCircle,
} from "lucide-react";

const STATUS_FILTERS = {
    ALL: "",
    VALID: "VALID,ACTIVE,PAID",
    USED: "USED,CHECKED_IN",
    INVALID: "CANCELLED,EXPIRED,FAILED",
};

function MyTickets() {
    const navigate = useNavigate();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const bookingIdParam =
        searchParams.get("bookingId") || "";

    const [tickets, setTickets] = useState([]);
    const [eventsById, setEventsById] = useState({});
    const [seatsById, setSeatsById] = useState({});

    const [bookingIdInput, setBookingIdInput] =
        useState(bookingIdParam);

    const [keywordInput, setKeywordInput] =
        useState("");

    const [keyword, setKeyword] =
        useState("");

    const [activeTab, setActiveTab] =
        useState("ALL");

    const [page, setPage] =
        useState(0);

    const [size, setSize] =
        useState(6);

    const [totalPages, setTotalPages] =
        useState(0);

    const [totalElements, setTotalElements] =
        useState(0);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    useEffect(() => {
        setBookingIdInput(bookingIdParam);
        setPage(0);
    }, [bookingIdParam]);

    useEffect(() => {
        loadTickets();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bookingIdParam,
        keyword,
        activeTab,
        page,
        size,
    ]);

    const getCurrentUserId = () => {
        const keys = [
            "user",
            "authUser",
            "currentUser",
        ];

        for (const key of keys) {
            try {
                const raw =
                    localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);

                const id =
                    user?.id ??
                    user?.userId ??
                    user?.user?.id;

                if (id) {
                    return Number(id);
                }
            } catch {
                // Bỏ qua dữ liệu sai định dạng.
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

            const normalized =
                payload
                    .replace(/-/g, "+")
                    .replace(/_/g, "/");

            const padded =
                normalized.padEnd(
                    Math.ceil(normalized.length / 4) * 4,
                    "="
                );

            const decoded =
                JSON.parse(atob(padded));

            const id =
                decoded?.userId ??
                decoded?.id ??
                decoded?.sub;

            return id ? Number(id) : null;
        } catch {
            return null;
        }
    };

    const normalizeStatus = (value) => {
        return String(value || "")
            .trim()
            .toUpperCase();
    };

    const getNumberValue = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const number = Number(value);

        return Number.isNaN(number)
            ? null
            : number;
    };

    const normalizePageData = (data) => {
        if (Array.isArray(data)) {
            return {
                content: data,
                totalElements: data.length,
                totalPages: data.length > 0 ? 1 : 0,
                number: 0,
                size: data.length,
            };
        }

        return {
            content: Array.isArray(data?.content)
                ? data.content
                : [],
            totalElements:
                Number(data?.totalElements) || 0,
            totalPages:
                Number(data?.totalPages) || 0,
            number:
                Number(data?.number) || 0,
            size:
                Number(data?.size) || size,
        };
    };

    const getTicketId = (ticket) =>
        ticket?.id ?? ticket?.ticketId;

    const getTicketBookingId = (ticket) =>
        ticket?.bookingId ??
        ticket?.booking?.id ??
        ticket?.bookingItem?.bookingId;

    const getTicketEventId = (ticket) =>
        ticket?.eventId ??
        ticket?.event?.id ??
        ticket?.booking?.eventId;

    const getTicketSeatId = (ticket) =>
        ticket?.seatId ??
        ticket?.seat?.id ??
        ticket?.bookingItem?.seatId;

    const getTicketCode = (ticket) =>
        ticket?.ticketCode ||
        ticket?.code ||
        ticket?.qrContent ||
        `TICKET-${getTicketId(ticket)}`;

    const getTicketStatus = (ticket) =>
        normalizeStatus(
            ticket?.status ||
            ticket?.ticketStatus ||
            "VALID"
        );

    const getTicketType = (ticket) => {
        const seatId = getTicketSeatId(ticket);
        const seat = seatsById[seatId];

        return (
            seat?.seatType ||
            ticket?.ticketType ||
            ticket?.seatType ||
            "STANDARD"
        );
    };

    const getSeatLabel = (ticket) => {
        const seatId = getTicketSeatId(ticket);
        const seat = seatsById[seatId];

        return (
            seat?.seatNumber ||
            ticket?.seatNumber ||
            ticket?.seat?.seatNumber ||
            (seatId
                ? `Ghế #${seatId}`
                : "Đang cập nhật")
        );
    };

    const getTicketPrice = (ticket) =>
        getNumberValue(ticket?.price) ??
        getNumberValue(ticket?.amount);

    const getTicketHolder = (ticket) =>
        ticket?.holderName ||
        ticket?.customerName ||
        ticket?.userName ||
        "Khách hàng";

    const loadRelatedData = async (ticketData) => {
        const eventIds = [
            ...new Set(
                ticketData
                    .map(getTicketEventId)
                    .filter(Boolean)
            ),
        ];

        const seatIds = [
            ...new Set(
                ticketData
                    .map(getTicketSeatId)
                    .filter(Boolean)
            ),
        ];

        const [eventEntries, seatEntries] =
            await Promise.all([
                Promise.all(
                    eventIds.map(async (eventId) => {
                        try {
                            const response =
                                await axiosClient.get(
                                    `/event-service/events/${eventId}`
                                );

                            return [eventId, response.data];
                        } catch {
                            return [eventId, null];
                        }
                    })
                ),

                Promise.all(
                    seatIds.map(async (seatId) => {
                        try {
                            const response =
                                await axiosClient.get(
                                    `/seat-service/seats/${seatId}`
                                );

                            return [seatId, response.data];
                        } catch {
                            return [seatId, null];
                        }
                    })
                ),
            ]);

        const nextEvents = {};
        const nextSeats = {};

        eventEntries.forEach(
            ([eventId, eventData]) => {
                if (eventData) {
                    nextEvents[eventId] =
                        eventData;
                }
            }
        );

        seatEntries.forEach(
            ([seatId, seatData]) => {
                if (seatData) {
                    nextSeats[seatId] =
                        seatData;
                }
            }
        );

        setEventsById(nextEvents);
        setSeatsById(nextSeats);
    };

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError("");

            const userId =
                getCurrentUserId();

            if (!userId && !bookingIdParam) {
                navigate("/login");
                return;
            }

            const endpoint = bookingIdParam
                ? `/ticket-service/tickets/booking/${bookingIdParam}/page`
                : `/ticket-service/tickets/user/${userId}/page`;

            const response =
                await axiosClient.get(endpoint, {
                    params: {
                        page,
                        size,
                        keyword:
                            keyword.trim() || undefined,
                        status:
                            STATUS_FILTERS[activeTab]
                            || undefined,
                        sortBy: "issuedAt",
                        sortDirection: "desc",
                    },
                });

            const pageData =
                normalizePageData(response.data);

            setTickets(pageData.content);
            setTotalElements(
                pageData.totalElements
            );
            setTotalPages(
                pageData.totalPages
            );

            await loadRelatedData(
                pageData.content
            );
        } catch (requestError) {
            console.error(requestError);

            setTickets([]);
            setEventsById({});
            setSeatsById({});

            setError(
                requestError?.response?.data?.message ||
                requestError?.response?.data?.error ||
                "Không tải được danh sách vé."
            );
        } finally {
            setLoading(false);
        }
    };

    const submitSearch = (event) => {
        event.preventDefault();

        setKeyword(keywordInput.trim());
        setPage(0);

        const nextParams = {};

        if (bookingIdInput.trim()) {
            nextParams.bookingId =
                bookingIdInput.trim();
        }

        setSearchParams(nextParams);
    };

    const clearFilters = () => {
        setBookingIdInput("");
        setKeywordInput("");
        setKeyword("");
        setActiveTab("ALL");
        setPage(0);
        setSearchParams({});
    };

    const formatMoney = (value) => {
        const number =
            getNumberValue(value);

        if (number === null) {
            return "Đang cập nhật";
        }

        return `${number.toLocaleString(
            "vi-VN"
        )} đ`;
    };

    const formatDate = (value) => {
        if (!value) return "Đang cập nhật";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value)
                .replace("T", " ");
        }

        return date.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const getQrImage = (ticket) => {
        const image =
            ticket?.qrImage ||
            ticket?.qrCodeImage ||
            ticket?.qrImageUrl;

        if (!image) return "";

        if (
            String(image).startsWith(
                "data:image"
            )
        ) {
            return image;
        }

        if (String(image).length > 100) {
            return `data:image/png;base64,${image}`;
        }

        return image;
    };

    const getEventImage = (event) => {
        const image =
            event?.banner ||
            event?.bannerUrl ||
            event?.imageUrl;

        if (!image) return "";

        if (
            image.startsWith(
                "http://localhost:8084"
            )
        ) {
            return image.replace(
                "http://localhost:8084",
                "/api/event-service"
            );
        }

        if (image.startsWith("/uploads")) {
            return `/api/event-service${image}`;
        }

        return image;
    };

    const getStatusInfo = (status) => {
        const value =
            normalizeStatus(status);

        if (
            ["VALID", "ACTIVE", "PAID"]
                .includes(value)
        ) {
            return {
                text: "Hợp lệ",
                icon: CheckCircle2,
                className:
                    "bg-emerald-400 text-slate-950",
            };
        }

        if (
            ["USED", "CHECKED_IN"]
                .includes(value)
        ) {
            return {
                text: "Đã check-in",
                icon: ShieldCheck,
                className:
                    "bg-blue-400 text-slate-950",
            };
        }

        return {
            text: "Không hợp lệ",
            icon: XCircle,
            className:
                "bg-red-500 text-white",
        };
    };

    const pageNumbers = useMemo(() => {
        const start =
            Math.max(0, page - 2);

        const end =
            Math.min(
                totalPages,
                start + 5
            );

        return Array.from(
            { length: end - start },
            (_, index) => start + index
        );
    }, [page, totalPages]);

    return (
        <div className="min-h-screen bg-[#111317] text-white">
            <section className="bg-[#08090b] border-b border-white/10">
                <div className="max-w-[1500px] mx-auto px-4 lg:px-8 py-10">
                    <Link
                        to="/my-bookings"
                        className="inline-flex items-center gap-2 text-slate-300"
                    >
                        <ArrowLeft size={17} />
                        Quay lại booking
                    </Link>

                    <div className="flex items-end justify-between gap-5 mt-6">
                        <div>
                            <div className="inline-flex items-center gap-2 text-emerald-300 font-black">
                                <QrCode size={18} />
                                VÉ ĐIỆN TỬ
                            </div>

                            <h1 className="text-4xl font-black mt-3">
                                Vé QR của tôi
                            </h1>

                            <p className="text-slate-400 mt-3">
                                Tổng cộng {totalElements} vé phù hợp.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadTickets}
                            className="h-11 px-5 rounded-2xl bg-white text-slate-950 font-black flex items-center gap-2"
                        >
                            <RefreshCw size={17} />
                            Reload
                        </button>
                    </div>
                </div>
            </section>

            <section className="max-w-[1500px] mx-auto px-4 lg:px-8 py-8">
                <form
                    onSubmit={submitSearch}
                    className="rounded-[28px] bg-[#1b1f27] border border-white/10 p-5"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <input
                            value={bookingIdInput}
                            onChange={(event) =>
                                setBookingIdInput(
                                    event.target.value
                                )
                            }
                            placeholder="Booking ID"
                            className="lg:col-span-3 h-12 px-4 rounded-2xl bg-white/8 border border-white/10 outline-none"
                        />

                        <div className="lg:col-span-6 flex items-center gap-3 h-12 px-4 rounded-2xl bg-white/8 border border-white/10">
                            <Search size={18} />

                            <input
                                value={keywordInput}
                                onChange={(event) =>
                                    setKeywordInput(
                                        event.target.value
                                    )
                                }
                                placeholder="Tìm mã vé, loại vé, trạng thái hoặc ID..."
                                className="flex-1 bg-transparent outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            className="lg:col-span-2 rounded-2xl bg-emerald-500 font-black"
                        >
                            Tìm kiếm
                        </button>

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="lg:col-span-1 rounded-2xl bg-white/10 font-black"
                        >
                            Xóa
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                        {[
                            ["ALL", "Tất cả"],
                            ["VALID", "Hợp lệ"],
                            ["USED", "Đã check-in"],
                            ["INVALID", "Không hợp lệ"],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(key);
                                    setPage(0);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-black ${activeTab === key
                                    ? "bg-emerald-500"
                                    : "bg-white/8"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}

                        <select
                            value={size}
                            onChange={(event) => {
                                setSize(
                                    Number(event.target.value)
                                );
                                setPage(0);
                            }}
                            className="ml-auto bg-[#1b1f27] border border-white/10 rounded-xl px-3"
                        >
                            <option value={4}>4 / trang</option>
                            <option value={6}>6 / trang</option>
                            <option value={10}>10 / trang</option>
                        </select>
                    </div>
                </form>

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-200">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="mt-7 text-center p-12">
                        <Loader2
                            className="animate-spin mx-auto"
                            size={34}
                        />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="mt-7 rounded-[28px] bg-[#1f232b] border border-white/10 p-12 text-center">
                        <Ticket
                            size={55}
                            className="mx-auto text-slate-500"
                        />

                        <h2 className="text-2xl font-black mt-4">
                            Không có vé
                        </h2>

                        <Link
                            to="/events"
                            className="inline-flex mt-6 h-11 px-5 rounded-2xl bg-emerald-500 items-center gap-2 font-black"
                        >
                            Xem sự kiện
                            <Home size={18} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-7">
                        {tickets.map((ticket) => {
                            const ticketId =
                                getTicketId(ticket);

                            const eventId =
                                getTicketEventId(ticket);

                            const event =
                                eventsById[eventId];

                            const statusInfo =
                                getStatusInfo(
                                    getTicketStatus(ticket)
                                );

                            const StatusIcon =
                                statusInfo.icon;

                            return (
                                <div
                                    key={ticketId}
                                    className="rounded-[30px] bg-[#1f232b] border border-white/10 overflow-hidden"
                                >
                                    <div className="grid md:grid-cols-[280px_1fr]">
                                        <div className="relative p-6 bg-[#08090b] flex flex-col items-center justify-center overflow-hidden">
                                            {getEventImage(event) && (
                                                <img
                                                    src={getEventImage(event)}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                                                />
                                            )}

                                            <div className="relative bg-white rounded-[28px] p-4">
                                                {getQrImage(ticket) ? (
                                                    <img
                                                        src={getQrImage(ticket)}
                                                        alt="QR"
                                                        className="w-[220px] h-[220px]"
                                                    />
                                                ) : (
                                                    <QrCode
                                                        size={180}
                                                        className="text-slate-950"
                                                    />
                                                )}
                                            </div>

                                            <div className="relative text-center mt-5">
                                                <div className="text-xs text-slate-400">
                                                    Mã vé
                                                </div>

                                                <div className="font-black break-all">
                                                    {getTicketCode(ticket)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ${statusInfo.className}`}>
                                                <StatusIcon size={15} />
                                                {statusInfo.text}
                                            </div>

                                            <h2 className="text-2xl font-black mt-4">
                                                {event?.name ||
                                                    `Event #${eventId}`}
                                            </h2>

                                            <div className="space-y-3 mt-6">
                                                <InfoCard
                                                    icon={<User size={18} />}
                                                    label="Người giữ vé"
                                                    value={getTicketHolder(ticket)}
                                                />

                                                <InfoCard
                                                    icon={<Ticket size={18} />}
                                                    label="Ghế / Loại vé"
                                                    value={`${getSeatLabel(ticket)} · ${getTicketType(ticket)}`}
                                                />

                                                <InfoCard
                                                    icon={<CalendarDays size={18} />}
                                                    label="Thời gian"
                                                    value={formatDate(
                                                        event?.eventDate ||
                                                        ticket?.issuedAt
                                                    )}
                                                />

                                                <InfoCard
                                                    icon={<MapPin size={18} />}
                                                    label="Địa điểm"
                                                    value={
                                                        event?.location ||
                                                        "Đang cập nhật"
                                                    }
                                                />
                                            </div>

                                            <div className="mt-5 p-4 rounded-2xl bg-black/20">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">
                                                        Booking
                                                    </span>

                                                    <strong>
                                                        {getTicketBookingId(ticket)}
                                                    </strong>
                                                </div>

                                                <div className="flex justify-between mt-3">
                                                    <span className="text-slate-400">
                                                        Giá vé
                                                    </span>

                                                    <strong className="text-emerald-400">
                                                        {formatMoney(
                                                            getTicketPrice(ticket)
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            disabled={page === 0}
                            onClick={() =>
                                setPage(page - 1)
                            }
                            className="h-10 w-10 rounded-full bg-white/10 disabled:opacity-30 flex items-center justify-center"
                        >
                            <ChevronLeft size={19} />
                        </button>

                        {pageNumbers.map((pageNumber) => (
                            <button
                                key={pageNumber}
                                onClick={() =>
                                    setPage(pageNumber)
                                }
                                className={`h-10 min-w-10 px-3 rounded-full font-black ${pageNumber === page
                                    ? "bg-emerald-500"
                                    : "bg-white/10"
                                    }`}
                            >
                                {pageNumber + 1}
                            </button>
                        ))}

                        <button
                            disabled={
                                page >= totalPages - 1
                            }
                            onClick={() =>
                                setPage(page + 1)
                            }
                            className="h-10 w-10 rounded-full bg-white/10 disabled:opacity-30 flex items-center justify-center"
                        >
                            <ChevronRight size={19} />
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="rounded-2xl bg-white/6 border border-white/10 p-4 flex gap-3">
            <div className="text-emerald-400">
                {icon}
            </div>

            <div>
                <div className="text-xs text-slate-500">
                    {label}
                </div>

                <div className="font-black mt-1">
                    {value}
                </div>
            </div>
        </div>
    );
}

export default MyTickets;