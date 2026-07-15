import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    QrCode,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldCheck,
    Ticket,
    Trash2,
    X,
    XCircle,
} from "lucide-react";

const DEFAULT_FILTERS = {
    keyword: "",
    status: "",
    ticketType: "",
    userId: "",
    eventId: "",
    bookingId: "",
    sortBy: "issuedAt",
    sortDirection: "desc",
};

function Tickets() {
    const [tickets, setTickets] = useState([]);

    const [eventsById, setEventsById] = useState({});
    const [usersById, setUsersById] = useState({});
    const [seatsById, setSeatsById] = useState({});
    const [bookingsById, setBookingsById] = useState({});

    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] =
        useState(DEFAULT_FILTERS);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [loading, setLoading] = useState(false);
    const [referenceLoading, setReferenceLoading] = useState(false);
    const [actionId, setActionId] = useState(null);

    const [error, setError] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        loadTickets();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, size, appliedFilters]);

    const normalizeList = (data) => {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.items)) {
            return data.items;
        }

        return [];
    };

    const normalizePage = (data) => {
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
            totalElements: Number(data?.totalElements) || 0,
            totalPages: Number(data?.totalPages) || 0,
            number: Number(data?.number) || 0,
            size: Number(data?.size) || size,
        };
    };

    const buildMap = (items) => {
        const nextMap = {};

        items.forEach((item) => {
            if (
                item?.id !== null &&
                item?.id !== undefined
            ) {
                nextMap[String(item.id)] = item;
            }
        });

        return nextMap;
    };

    const loadReferenceData = async () => {
        try {
            setReferenceLoading(true);

            const [
                eventResult,
                userResult,
                seatResult,
                bookingResult,
            ] = await Promise.allSettled([
                axiosClient.get(
                    "/event-service/events",
                    {
                        params: {
                            page: 0,
                            size: 100,
                            sortBy: "eventDate",
                            sortDirection: "asc",
                        },
                    }
                ),

                axiosClient.get(
                    "/user-service/users"
                ),

                axiosClient.get(
                    "/seat-service/seats"
                ),

                axiosClient.get(
                    "/booking-service/bookings"
                ),
            ]);

            if (eventResult.status === "fulfilled") {
                const events = normalizeList(
                    eventResult.value.data
                );

                setEventsById(buildMap(events));
            } else {
                console.warn(
                    "Không tải được danh sách sự kiện:",
                    eventResult.reason
                );

                setEventsById({});
            }

            if (userResult.status === "fulfilled") {
                const users = normalizeList(
                    userResult.value.data
                );

                setUsersById(buildMap(users));
            } else {
                console.warn(
                    "Không tải được danh sách người dùng:",
                    userResult.reason
                );

                setUsersById({});
            }

            if (seatResult.status === "fulfilled") {
                const seats = normalizeList(
                    seatResult.value.data
                );

                setSeatsById(buildMap(seats));
            } else {
                console.warn(
                    "Không tải được danh sách ghế:",
                    seatResult.reason
                );

                setSeatsById({});
            }

            if (bookingResult.status === "fulfilled") {
                const bookings = normalizeList(
                    bookingResult.value.data
                );

                setBookingsById(
                    buildMap(bookings)
                );
            } else {
                console.warn(
                    "Không tải được danh sách booking:",
                    bookingResult.reason
                );

                setBookingsById({});
            }
        } finally {
            setReferenceLoading(false);
        }
    };

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axiosClient.get(
                "/ticket-service/tickets",
                {
                    params: {
                        page,
                        size,

                        keyword:
                            appliedFilters.keyword.trim() ||
                            undefined,

                        status:
                            appliedFilters.status ||
                            undefined,

                        ticketType:
                            appliedFilters.ticketType.trim() ||
                            undefined,

                        userId:
                            appliedFilters.userId ||
                            undefined,

                        eventId:
                            appliedFilters.eventId ||
                            undefined,

                        bookingId:
                            appliedFilters.bookingId ||
                            undefined,

                        sortBy:
                            appliedFilters.sortBy,

                        sortDirection:
                            appliedFilters.sortDirection,
                    },
                }
            );

            const pageData = normalizePage(
                response.data
            );

            setTickets(pageData.content);
            setTotalElements(
                pageData.totalElements
            );
            setTotalPages(
                pageData.totalPages
            );

            if (
                pageData.totalPages > 0 &&
                page >= pageData.totalPages
            ) {
                setPage(
                    pageData.totalPages - 1
                );
            }
        } catch (requestError) {
            console.error(
                "Không tải được tickets:",
                requestError
            );

            setTickets([]);
            setTotalElements(0);
            setTotalPages(0);

            setError(
                requestError?.response?.data
                    ?.message ||
                requestError?.response?.data
                    ?.error ||
                requestError?.message ||
                "Không tải được danh sách vé."
            );
        } finally {
            setLoading(false);
        }
    };

    const reloadAll = async () => {
        await Promise.all([
            loadReferenceData(),
            loadTickets(),
        ]);
    };

    const getTicketId = (ticket) => {
        return (
            ticket?.id ??
            ticket?.ticketId
        );
    };

    const getEvent = (eventId) => {
        return eventsById[
            String(eventId)
        ];
    };

    const getUser = (userId) => {
        return usersById[
            String(userId)
        ];
    };

    const getSeat = (seatId) => {
        return seatsById[
            String(seatId)
        ];
    };

    const getBooking = (bookingId) => {
        return bookingsById[
            String(bookingId)
        ];
    };

    const getEventName = (eventId) => {
        const event = getEvent(eventId);

        return (
            event?.name ||
            `Event #${eventId}`
        );
    };

    const getUserName = (userId) => {
        const user = getUser(userId);

        return (
            user?.fullName ||
            user?.name ||
            user?.username ||
            user?.email ||
            `User #${userId}`
        );
    };

    const getSeatName = (seatId) => {
        const seat = getSeat(seatId);

        return (
            seat?.seatNumber ||
            seat?.name ||
            seat?.code ||
            `Ghế #${seatId}`
        );
    };

    const getSeatType = (ticket) => {
        const seat = getSeat(
            ticket?.seatId
        );

        return (
            seat?.seatType ||
            seat?.ticketType ||
            ticket?.ticketType ||
            "STANDARD"
        );
    };

    const getBookingCode = (bookingId) => {
        const booking = getBooking(
            bookingId
        );

        return (
            booking?.bookingCode ||
            `Booking #${bookingId}`
        );
    };

    const normalizeStatus = (value) => {
        return String(value || "")
            .trim()
            .toUpperCase();
    };

    const formatMoney = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Đang cập nhật";
        }

        const number = Number(value);

        if (Number.isNaN(number)) {
            return String(value);
        }

        if (number === 0) {
            return "Miễn phí";
        }

        return `${number.toLocaleString(
            "vi-VN"
        )} đ`;
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (
            Number.isNaN(date.getTime())
        ) {
            return String(value).replace(
                "T",
                " "
            );
        }

        return date.toLocaleString(
            "vi-VN",
            {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        );
    };

    const getQrImage = (ticket) => {
        const image =
            ticket?.qrImage ||
            ticket?.qrCodeImage ||
            ticket?.qrImageUrl ||
            ticket?.imageUrl;

        if (!image) {
            return "";
        }

        const imageValue = String(image);

        if (
            imageValue.startsWith(
                "data:image"
            )
        ) {
            return imageValue;
        }

        if (
            imageValue.startsWith("http")
        ) {
            return imageValue;
        }

        if (
            imageValue.startsWith(
                "/uploads"
            )
        ) {
            return `/api/ticket-service${imageValue}`;
        }

        if (imageValue.length > 100) {
            return `data:image/png;base64,${imageValue}`;
        }

        return "";
    };

    const getStatusInfo = (status) => {
        const value =
            normalizeStatus(status);

        if (
            value === "VALID" ||
            value === "ACTIVE" ||
            value === "PAID"
        ) {
            return {
                text: "VALID",
                badgeClass:
                    "bg-emerald-100 text-emerald-700",
                rowClass:
                    "border-l-4 border-l-emerald-500",
                icon: CheckCircle2,
            };
        }

        if (
            value === "USED" ||
            value === "CHECKED_IN"
        ) {
            return {
                text: "USED",
                badgeClass:
                    "bg-blue-100 text-blue-700",
                rowClass:
                    "border-l-4 border-l-blue-500",
                icon: ShieldCheck,
            };
        }

        if (
            value === "CANCELLED" ||
            value === "EXPIRED" ||
            value === "FAILED"
        ) {
            return {
                text: value,
                badgeClass:
                    "bg-red-100 text-red-700",
                rowClass:
                    "border-l-4 border-l-red-500",
                icon: XCircle,
            };
        }

        return {
            text: value || "UNKNOWN",
            badgeClass:
                "bg-slate-100 text-slate-700",
            rowClass:
                "border-l-4 border-l-slate-300",
            icon: Ticket,
        };
    };

    const updateFilter = (
        name,
        value
    ) => {
        setFilters((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const applyFilters = (event) => {
        event.preventDefault();

        setAppliedFilters({
            ...filters,
        });

        setPage(0);
    };

    const clearFilters = () => {
        setFilters({
            ...DEFAULT_FILTERS,
        });

        setAppliedFilters({
            ...DEFAULT_FILTERS,
        });

        setPage(0);
    };

    const checkInTicket = async (
        ticket
    ) => {
        const ticketId =
            getTicketId(ticket);

        const accepted =
            window.confirm(
                `Xác nhận check-in vé ${ticket.ticketCode}?`
            );

        if (!accepted) {
            return;
        }

        try {
            setActionId(ticketId);
            setError("");

            await axiosClient.put(
                `/ticket-service/tickets/${ticketId}/use`
            );

            if (
                selectedTicket &&
                getTicketId(
                    selectedTicket
                ) === ticketId
            ) {
                setSelectedTicket(null);
            }

            await loadTickets();

            window.alert(
                "Check-in vé thành công."
            );
        } catch (requestError) {
            console.error(requestError);

            window.alert(
                requestError?.response?.data
                    ?.message ||
                requestError?.response?.data
                    ?.error ||
                "Không thể check-in vé. Vé có thể đã được sử dụng hoặc bị hủy."
            );
        } finally {
            setActionId(null);
        }
    };

    const regenerateTicketCode = async (
        ticket
    ) => {
        const ticketId =
            getTicketId(ticket);

        const accepted =
            window.confirm(
                "Tạo mã vé và QR mới cho vé này?"
            );

        if (!accepted) {
            return;
        }

        try {
            setActionId(ticketId);
            setError("");

            const response =
                await axiosClient.put(
                    `/ticket-service/tickets/${ticketId}/regenerate-code`
                );

            if (
                selectedTicket &&
                getTicketId(
                    selectedTicket
                ) === ticketId
            ) {
                setSelectedTicket(
                    response.data
                );
            }

            await loadTickets();

            window.alert(
                "Đã tạo mã vé mới."
            );
        } catch (requestError) {
            console.error(requestError);

            window.alert(
                requestError?.response?.data
                    ?.message ||
                requestError?.response?.data
                    ?.error ||
                "Không thể tạo lại mã vé."
            );
        } finally {
            setActionId(null);
        }
    };

    const deleteTicket = async (
        ticket
    ) => {
        const ticketId =
            getTicketId(ticket);

        const accepted =
            window.confirm(
                `Bạn chắc chắn muốn xóa vé ${ticket.ticketCode}?`
            );

        if (!accepted) {
            return;
        }

        try {
            setActionId(ticketId);
            setError("");

            await axiosClient.delete(
                `/ticket-service/tickets/${ticketId}`
            );

            if (
                selectedTicket &&
                getTicketId(
                    selectedTicket
                ) === ticketId
            ) {
                setSelectedTicket(null);
            }

            await loadTickets();

            window.alert(
                "Đã xóa vé."
            );
        } catch (requestError) {
            console.error(requestError);

            window.alert(
                requestError?.response?.data
                    ?.message ||
                requestError?.response?.data
                    ?.error ||
                "Không thể xóa vé."
            );
        } finally {
            setActionId(null);
        }
    };

    const pageNumbers = useMemo(() => {
        if (totalPages <= 0) {
            return [];
        }

        let start = Math.max(
            0,
            page - 2
        );

        let end = Math.min(
            totalPages,
            start + 5
        );

        if (end - start < 5) {
            start = Math.max(
                0,
                end - 5
            );
        }

        return Array.from(
            {
                length: end - start,
            },
            (_, index) =>
                start + index
        );
    }, [page, totalPages]);

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6">
            <section className="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-2 text-emerald-600 font-black">
                            <Ticket size={20} />
                            TICKET SERVICE
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-950 mt-2">
                            Quản lý vé QR
                        </h1>

                        <p className="text-slate-500 mt-2">
                            Tìm thấy{" "}
                            <span className="font-black text-emerald-600">
                                {totalElements}
                            </span>{" "}
                            vé phù hợp.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={reloadAll}
                        disabled={
                            loading ||
                            referenceLoading
                        }
                        className="h-11 px-5 rounded-2xl bg-slate-950 text-white font-black hover:bg-black disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading ||
                                    referenceLoading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Reload
                    </button>
                </div>
            </section>

            <form
                onSubmit={applyFilters}
                className="mt-6 bg-white rounded-[28px] border border-slate-200 p-5 shadow-sm"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <FilterInput
                        label="Tìm kiếm"
                        icon={
                            <Search size={17} />
                        }
                        value={
                            filters.keyword
                        }
                        placeholder="Mã vé, trạng thái hoặc ID..."
                        onChange={(value) =>
                            updateFilter(
                                "keyword",
                                value
                            )
                        }
                    />

                    <FilterSelect
                        label="Trạng thái"
                        value={
                            filters.status
                        }
                        onChange={(value) =>
                            updateFilter(
                                "status",
                                value
                            )
                        }
                    >
                        <option value="">
                            Tất cả trạng thái
                        </option>

                        <option value="VALID">
                            VALID
                        </option>

                        <option value="USED">
                            USED
                        </option>

                        <option value="CANCELLED">
                            CANCELLED
                        </option>

                        <option value="EXPIRED">
                            EXPIRED
                        </option>

                        <option value="FAILED">
                            FAILED
                        </option>
                    </FilterSelect>

                    <FilterInput
                        label="Loại vé"
                        value={
                            filters.ticketType
                        }
                        placeholder="VIP, STANDARD..."
                        onChange={(value) =>
                            updateFilter(
                                "ticketType",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="User ID"
                        type="number"
                        value={
                            filters.userId
                        }
                        placeholder="Ví dụ: 1"
                        onChange={(value) =>
                            updateFilter(
                                "userId",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="Event ID"
                        type="number"
                        value={
                            filters.eventId
                        }
                        placeholder="Ví dụ: 3"
                        onChange={(value) =>
                            updateFilter(
                                "eventId",
                                value
                            )
                        }
                    />

                    <FilterInput
                        label="Booking ID"
                        type="number"
                        value={
                            filters.bookingId
                        }
                        placeholder="Ví dụ: 1"
                        onChange={(value) =>
                            updateFilter(
                                "bookingId",
                                value
                            )
                        }
                    />

                    <FilterSelect
                        label="Sắp xếp theo"
                        value={
                            filters.sortBy
                        }
                        onChange={(value) =>
                            updateFilter(
                                "sortBy",
                                value
                            )
                        }
                    >
                        <option value="issuedAt">
                            Ngày phát hành
                        </option>

                        <option value="id">
                            Ticket ID
                        </option>

                        <option value="ticketCode">
                            Mã vé
                        </option>

                        <option value="price">
                            Giá vé
                        </option>

                        <option value="status">
                            Trạng thái
                        </option>

                        <option value="bookingId">
                            Booking ID
                        </option>

                        <option value="userId">
                            User ID
                        </option>

                        <option value="eventId">
                            Event ID
                        </option>
                    </FilterSelect>

                    <FilterSelect
                        label="Thứ tự"
                        value={
                            filters.sortDirection
                        }
                        onChange={(value) =>
                            updateFilter(
                                "sortDirection",
                                value
                            )
                        }
                    >
                        <option value="desc">
                            Giảm dần
                        </option>

                        <option value="asc">
                            Tăng dần
                        </option>
                    </FilterSelect>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">
                    <select
                        value={size}
                        onChange={(event) => {
                            setSize(
                                Number(
                                    event.target
                                        .value
                                )
                            );

                            setPage(0);
                        }}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white outline-none"
                    >
                        <option value={5}>
                            5 / trang
                        </option>

                        <option value={10}>
                            10 / trang
                        </option>

                        <option value={20}>
                            20 / trang
                        </option>

                        <option value={50}>
                            50 / trang
                        </option>
                    </select>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 inline-flex items-center gap-2"
                        >
                            <RotateCcw
                                size={17}
                            />

                            Xóa bộ lọc
                        </button>

                        <button
                            type="submit"
                            className="h-11 px-6 rounded-xl bg-emerald-500 text-white font-black hover:bg-emerald-600 inline-flex items-center gap-2"
                        >
                            <Search size={17} />
                            Áp dụng
                        </button>
                    </div>
                </div>
            </form>

            {error && (
                <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700 flex items-start gap-3">
                    <AlertCircle
                        size={20}
                        className="shrink-0 mt-0.5"
                    />

                    <div className="font-semibold">
                        {error}
                    </div>
                </div>
            )}

            <section className="mt-6 bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-14 text-center text-slate-500">
                        <Loader2
                            size={36}
                            className="animate-spin mx-auto"
                        />

                        <div className="mt-4 font-semibold">
                            Đang tải danh sách
                            vé...
                        </div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="p-14 text-center text-slate-500">
                        <Ticket
                            size={55}
                            className="mx-auto text-slate-300"
                        />

                        <h2 className="text-xl font-black text-slate-700 mt-4">
                            Không có vé phù hợp
                        </h2>

                        <p className="mt-2">
                            Thử xóa hoặc thay đổi
                            bộ lọc.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-362.5">
                            <thead className="bg-slate-950 text-white">
                                <tr>
                                    <TableHeader>
                                        ID
                                    </TableHeader>

                                    <TableHeader>
                                        QR
                                    </TableHeader>

                                    <TableHeader>
                                        Mã vé
                                    </TableHeader>

                                    <TableHeader>
                                        Sự kiện
                                    </TableHeader>

                                    <TableHeader>
                                        Ghế
                                    </TableHeader>

                                    <TableHeader>
                                        Booking
                                    </TableHeader>

                                    <TableHeader>
                                        Người dùng
                                    </TableHeader>

                                    <TableHeader>
                                        Loại vé
                                    </TableHeader>

                                    <TableHeader>
                                        Giá
                                    </TableHeader>

                                    <TableHeader>
                                        Trạng thái
                                    </TableHeader>

                                    <TableHeader>
                                        Ngày phát hành
                                    </TableHeader>

                                    <TableHeader center>
                                        Thao tác
                                    </TableHeader>
                                </tr>
                            </thead>

                            <tbody>
                                {tickets.map(
                                    (ticket) => {
                                        const ticketId =
                                            getTicketId(
                                                ticket
                                            );

                                        const status =
                                            normalizeStatus(
                                                ticket.status
                                            );

                                        const statusInfo =
                                            getStatusInfo(
                                                status
                                            );

                                        const StatusIcon =
                                            statusInfo.icon;

                                        const qrImage =
                                            getQrImage(
                                                ticket
                                            );

                                        const isProcessing =
                                            actionId ===
                                            ticketId;

                                        return (
                                            <tr
                                                key={
                                                    ticketId
                                                }
                                                className={`border-b border-slate-100 hover:bg-slate-50 transition ${statusInfo.rowClass}`}
                                            >
                                                <td className="p-4 font-black text-slate-900">
                                                    {
                                                        ticketId
                                                    }
                                                </td>

                                                <td className="p-4">
                                                    {qrImage ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedTicket(
                                                                    ticket
                                                                )
                                                            }
                                                            className="group"
                                                        >
                                                            <img
                                                                src={
                                                                    qrImage
                                                                }
                                                                alt={
                                                                    ticket.ticketCode ||
                                                                    "QR Ticket"
                                                                }
                                                                className="h-16 w-16 rounded-xl border border-slate-200 object-contain group-hover:scale-105 transition bg-white"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <QrCode
                                                                size={
                                                                    25
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-black text-emerald-600 max-w-55 break-all">
                                                        {ticket.ticketCode ||
                                                            `TICKET-${ticketId}`}
                                                    </div>

                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Ticket
                                                        ID:{" "}
                                                        {
                                                            ticketId
                                                        }
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-bold text-slate-900 max-w-55">
                                                        {getEventName(
                                                            ticket.eventId
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Event
                                                        ID:{" "}
                                                        {
                                                            ticket.eventId
                                                        }
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-black text-slate-900">
                                                        {getSeatName(
                                                            ticket.seatId
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Seat
                                                        ID:{" "}
                                                        {
                                                            ticket.seatId
                                                        }
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-semibold text-slate-900">
                                                        {getBookingCode(
                                                            ticket.bookingId
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Booking
                                                        ID:{" "}
                                                        {
                                                            ticket.bookingId
                                                        }
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-semibold text-slate-900">
                                                        {getUserName(
                                                            ticket.userId
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 mt-1">
                                                        User
                                                        ID:{" "}
                                                        {
                                                            ticket.userId
                                                        }
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <span
                                                        className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${getSeatType(
                                                            ticket
                                                        ) ===
                                                            "VIP"
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-blue-100 text-blue-700"
                                                            }`}
                                                    >
                                                        {getSeatType(
                                                            ticket
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="p-4 font-black text-emerald-600 whitespace-nowrap">
                                                    {formatMoney(
                                                        ticket.price
                                                    )}
                                                </td>

                                                <td className="p-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${statusInfo.badgeClass}`}
                                                    >
                                                        <StatusIcon
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        {
                                                            statusInfo.text
                                                        }
                                                    </span>
                                                </td>

                                                <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {formatDate(
                                                        ticket.issuedAt
                                                    )}
                                                </td>

                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <ActionButton
                                                            title="Xem vé QR"
                                                            onClick={() =>
                                                                setSelectedTicket(
                                                                    ticket
                                                                )
                                                            }
                                                            className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        >
                                                            <Eye
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </ActionButton>

                                                        {status ===
                                                            "VALID" && (
                                                                <ActionButton
                                                                    title="Check-in vé"
                                                                    onClick={() =>
                                                                        checkInTicket(
                                                                            ticket
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isProcessing
                                                                    }
                                                                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                                >
                                                                    {isProcessing ? (
                                                                        <Loader2
                                                                            size={
                                                                                16
                                                                            }
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <ShieldCheck
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    )}
                                                                </ActionButton>
                                                            )}

                                                        <ActionButton
                                                            title="Tạo lại mã vé và QR"
                                                            onClick={() =>
                                                                regenerateTicketCode(
                                                                    ticket
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                        >
                                                            <QrCode
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </ActionButton>

                                                        <ActionButton
                                                            title="Xóa vé"
                                                            onClick={() =>
                                                                deleteTicket(
                                                                    ticket
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                            className="bg-red-100 text-red-700 hover:bg-red-200"
                                                        >
                                                            <Trash2
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </ActionButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {totalPages > 0 && (
                <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-slate-500">
                        Trang{" "}
                        <span className="font-black text-slate-900">
                            {page + 1}
                        </span>{" "}
                        /{" "}
                        <span className="font-black text-slate-900">
                            {totalPages}
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                        <button
                            type="button"
                            disabled={page === 0}
                            onClick={() =>
                                setPage(
                                    (previous) =>
                                        previous - 1
                                )
                            }
                            className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                            <ChevronLeft
                                size={18}
                            />
                        </button>

                        {pageNumbers.map(
                            (pageNumber) => (
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
                                    className={`h-10 min-w-10 px-3 rounded-full font-black border ${pageNumber ===
                                        page
                                        ? "bg-emerald-500 text-white border-emerald-500"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                                page >=
                                totalPages - 1
                            }
                            onClick={() =>
                                setPage(
                                    (previous) =>
                                        previous + 1
                                )
                            }
                            className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                            <ChevronRight
                                size={18}
                            />
                        </button>
                    </div>
                </div>
            )}

            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    eventName={getEventName(
                        selectedTicket.eventId
                    )}
                    seatName={getSeatName(
                        selectedTicket.seatId
                    )}
                    seatType={getSeatType(
                        selectedTicket
                    )}
                    bookingCode={getBookingCode(
                        selectedTicket.bookingId
                    )}
                    userName={getUserName(
                        selectedTicket.userId
                    )}
                    qrImage={getQrImage(
                        selectedTicket
                    )}
                    statusInfo={getStatusInfo(
                        selectedTicket.status
                    )}
                    formatMoney={formatMoney}
                    formatDate={formatDate}
                    onClose={() =>
                        setSelectedTicket(null)
                    }
                    onCheckIn={() =>
                        checkInTicket(
                            selectedTicket
                        )
                    }
                    onRegenerate={() =>
                        regenerateTicketCode(
                            selectedTicket
                        )
                    }
                    processing={
                        actionId ===
                        getTicketId(
                            selectedTicket
                        )
                    }
                />
            )}
        </div>
    );
}

function TableHeader({
    children,
    center = false,
}) {
    return (
        <th
            className={`p-4 text-sm font-black whitespace-nowrap ${center
                ? "text-center"
                : "text-left"
                }`}
        >
            {children}
        </th>
    );
}

function ActionButton({
    children,
    title,
    onClick,
    disabled = false,
    className = "",
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );
}

function FilterInput({
    label,
    value,
    onChange,
    placeholder = "",
    type = "text",
    icon = null,
}) {
    return (
        <label className="block">
            <span className="block text-xs font-black text-slate-500 mb-2">
                {label}
            </span>

            <div className="h-11 px-4 rounded-xl border border-slate-200 bg-white flex items-center gap-2 focus-within:border-emerald-400 transition">
                {icon && (
                    <span className="text-slate-400">
                        {icon}
                    </span>
                )}

                <input
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    onChange={(event) =>
                        onChange(
                            event.target.value
                        )
                    }
                    min={
                        type === "number"
                            ? 1
                            : undefined
                    }
                    className="flex-1 outline-none min-w-0 bg-transparent text-slate-900"
                />
            </div>
        </label>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    children,
}) {
    return (
        <label className="block">
            <span className="block text-xs font-black text-slate-500 mb-2">
                {label}
            </span>

            <select
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-400 text-slate-900"
            >
                {children}
            </select>
        </label>
    );
}

function TicketModal({
    ticket,
    eventName,
    seatName,
    seatType,
    bookingCode,
    userName,
    qrImage,
    statusInfo,
    formatMoney,
    formatDate,
    onClose,
    onCheckIn,
    onRegenerate,
    processing,
}) {
    const StatusIcon =
        statusInfo.icon;

    const status =
        String(ticket?.status || "")
            .trim()
            .toUpperCase();

    return (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
            <div className="relative bg-white rounded-[30px] w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 md:p-7 shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 h-10 w-10 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center"
                >
                    <X size={19} />
                </button>

                <div>
                    <div className="inline-flex items-center gap-2 text-emerald-600 font-black">
                        <QrCode size={18} />
                        CHI TIẾT VÉ QR
                    </div>

                    <h2 className="text-2xl font-black text-slate-950 mt-2 break-all pr-12">
                        {ticket.ticketCode}
                    </h2>

                    <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black mt-3 ${statusInfo.badgeClass}`}
                    >
                        <StatusIcon size={14} />
                        {statusInfo.text}
                    </div>
                </div>

                <div className="mt-6 rounded-[28px] bg-slate-100 p-5 flex justify-center">
                    {qrImage ? (
                        <img
                            src={qrImage}
                            alt={
                                ticket.ticketCode ||
                                "QR Ticket"
                            }
                            className="w-64 h-64 object-contain rounded-2xl bg-white"
                        />
                    ) : (
                        <div className="w-64 h-64 rounded-2xl bg-white flex items-center justify-center text-slate-300">
                            <QrCode size={150} />
                        </div>
                    )}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    <ModalRow
                        label="Sự kiện"
                        value={eventName}
                    />

                    <ModalRow
                        label="Ghế / Loại vé"
                        value={`${seatName} · ${seatType}`}
                    />

                    <ModalRow
                        label="Booking"
                        value={bookingCode}
                    />

                    <ModalRow
                        label="Người dùng"
                        value={userName}
                    />

                    <ModalRow
                        label="Giá vé"
                        value={formatMoney(
                            ticket.price
                        )}
                        valueClass="text-emerald-600"
                    />

                    <ModalRow
                        label="Ngày phát hành"
                        value={formatDate(
                            ticket.issuedAt
                        )}
                    />

                    <ModalRow
                        label="Ngày sử dụng"
                        value={formatDate(
                            ticket.usedAt
                        )}
                    />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={
                            onRegenerate
                        }
                        disabled={processing}
                        className="h-11 px-5 rounded-xl bg-blue-100 text-blue-700 font-black hover:bg-blue-200 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        <QrCode size={17} />
                        Tạo mã mới
                    </button>

                    {status === "VALID" && (
                        <button
                            type="button"
                            onClick={
                                onCheckIn
                            }
                            disabled={
                                processing
                            }
                            className="h-11 px-5 rounded-xl bg-emerald-500 text-white font-black hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {processing ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <ShieldCheck
                                    size={17}
                                />
                            )}

                            Check-in
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 px-5 rounded-xl bg-slate-950 text-white font-black hover:bg-black"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalRow({
    label,
    value,
    valueClass = "text-slate-900",
}) {
    return (
        <div className="p-4 flex items-start justify-between gap-5">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span
                className={`text-sm font-black text-right break-all ${valueClass}`}
            >
                {value || "—"}
            </span>
        </div>
    );
}

export default Tickets;