import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { Link } from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    Ban,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    FilterX,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react";

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    return [];
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
            Number(data?.totalElements) || 0,

        totalPages:
            Number(data?.totalPages) || 0,
    };
}

function getErrorMessage(
    error,
    fallback
) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallback
    );
}

function Bookings() {
    const [bookings, setBookings] =
        useState([]);

    const [users, setUsers] =
        useState([]);

    const [events, setEvents] =
        useState([]);

    const [seats, setSeats] =
        useState([]);

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [keyword, setKeyword] =
        useState("");

    const [status, setStatus] =
        useState("ALL");

    const [
        userIdFilter,
        setUserIdFilter,
    ] = useState("");

    const [
        eventIdFilter,
        setEventIdFilter,
    ] = useState("");

    const [minAmount, setMinAmount] =
        useState("");

    const [maxAmount, setMaxAmount] =
        useState("");

    const [page, setPage] =
        useState(0);

    const [size, setSize] =
        useState(10);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [loading, setLoading] =
        useState(false);

    const [
        loadingSeats,
        setLoadingSeats,
    ] = useState(false);

    const [showCreate, setShowCreate] =
        useState(false);

    const [error, setError] =
        useState("");

    const [form, setForm] =
        useState({
            userId: "",
            eventId: "",
            seatIds: [],
        });

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        loadBookings();

        // eslint-disable-next-line
    }, [
        page,
        size,
        keyword,
        status,
        userIdFilter,
        eventIdFilter,
        minAmount,
        maxAmount,
    ]);

    useEffect(() => {
        if (form.eventId) {
            loadSeatsByEvent(
                form.eventId
            );
        } else {
            setSeats([]);
        }
    }, [form.eventId]);

    const loadReferenceData =
        async () => {
            const [
                userResult,
                eventResult,
            ] = await Promise.allSettled([
                axiosClient.get(
                    "/user-service/users",
                    {
                        params: {
                            page: 0,
                            size: 100,
                        },
                    }
                ),

                axiosClient.get(
                    "/event-service/events",
                    {
                        params: {
                            page: 0,
                            size: 100,
                            sortBy:
                                "eventDate",
                            sortDirection:
                                "asc",
                        },
                    }
                ),
            ]);

            setUsers(
                userResult.status ===
                    "fulfilled"
                    ? normalizeList(
                        userResult.value.data
                    )
                    : []
            );

            setEvents(
                eventResult.status ===
                    "fulfilled"
                    ? normalizeList(
                        eventResult.value.data
                    )
                    : []
            );
        };

    const loadBookings =
        async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await axiosClient.get(
                        "/booking-service/bookings",
                        {
                            params: {
                                page,
                                size,

                                keyword:
                                    keyword ||
                                    undefined,

                                status:
                                    status ===
                                        "ALL"
                                        ? undefined
                                        : status,

                                userId:
                                    userIdFilter ||
                                    undefined,

                                eventId:
                                    eventIdFilter ||
                                    undefined,

                                minAmount:
                                    minAmount ||
                                    undefined,

                                maxAmount:
                                    maxAmount ||
                                    undefined,

                                sortBy:
                                    "bookingDate",

                                sortDirection:
                                    "desc",
                            },
                        }
                    );

                const pageData =
                    normalizePage(
                        response.data
                    );

                setBookings(
                    pageData.content
                );

                setTotalElements(
                    pageData.totalElements
                );

                setTotalPages(
                    pageData.totalPages
                );
            } catch (requestError) {
                console.error(
                    requestError
                );

                setBookings([]);
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    getErrorMessage(
                        requestError,
                        "Không tải được danh sách booking."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

    const loadSeatsByEvent =
        async (eventId) => {
            try {
                setLoadingSeats(true);

                const response =
                    await axiosClient.get(
                        `/seat-service/seats/event/${eventId}`
                    );

                setSeats(
                    normalizeList(
                        response.data
                    )
                );
            } catch (requestError) {
                console.error(
                    requestError
                );

                setSeats([]);
            } finally {
                setLoadingSeats(false);
            }
        };

    const userMap = useMemo(() => {
        return new Map(
            users.map((user) => [
                String(user.id),
                user,
            ])
        );
    }, [users]);

    const eventMap = useMemo(() => {
        return new Map(
            events.map((event) => [
                String(event.id),
                event,
            ])
        );
    }, [events]);

    const availableSeats =
        useMemo(() => {
            return seats.filter(
                (seat) =>
                    String(
                        seat.status || ""
                    ).toUpperCase() ===
                    "AVAILABLE"
            );
        }, [seats]);

    const selectedTotal =
        useMemo(() => {
            return availableSeats
                .filter((seat) =>
                    form.seatIds.includes(
                        Number(seat.id)
                    )
                )
                .reduce(
                    (sum, seat) =>
                        sum +
                        Number(
                            seat.price || 0
                        ),
                    0
                );
        }, [
            availableSeats,
            form.seatIds,
        ]);

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
        setStatus("ALL");
        setUserIdFilter("");
        setEventIdFilter("");
        setMinAmount("");
        setMaxAmount("");
        setPage(0);
    };

    const toggleSeat = (
        seatId
    ) => {
        const id = Number(seatId);

        setForm((current) => {
            const selected =
                current.seatIds.includes(
                    id
                );

            if (
                !selected &&
                current.seatIds.length >= 4
            ) {
                alert(
                    "Mỗi booking chỉ được chọn tối đa 4 ghế."
                );

                return current;
            }

            return {
                ...current,

                seatIds: selected
                    ? current.seatIds.filter(
                        (value) =>
                            value !== id
                    )
                    : [
                        ...current.seatIds,
                        id,
                    ],
            };
        });
    };

    const closeCreate = () => {
        setShowCreate(false);

        setForm({
            userId: "",
            eventId: "",
            seatIds: [],
        });

        setSeats([]);
    };

    const createBooking =
        async (event) => {
            event.preventDefault();

            if (!form.userId) {
                alert(
                    "Vui lòng chọn user."
                );
                return;
            }

            if (!form.eventId) {
                alert(
                    "Vui lòng chọn event."
                );
                return;
            }

            if (
                form.seatIds.length === 0
            ) {
                alert(
                    "Vui lòng chọn ít nhất một ghế."
                );
                return;
            }

            try {
                setError("");

                await axiosClient.post(
                    "/booking-service/bookings",
                    {
                        userId: Number(
                            form.userId
                        ),

                        eventId: Number(
                            form.eventId
                        ),

                        seatIds:
                            form.seatIds,
                    }
                );

                closeCreate();
                setPage(0);

                await loadBookings();
            } catch (requestError) {
                const message =
                    getErrorMessage(
                        requestError,
                        "Không tạo được booking."
                    );

                setError(message);
                alert(message);
            }
        };

    const markPaid =
        async (bookingId) => {
            if (
                !window.confirm(
                    "Xác nhận booking đã thanh toán và phát hành vé QR?"
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/booking-service/bookings/${bookingId}/status`,
                    null,
                    {
                        params: {
                            status: "PAID",
                        },
                    }
                );

                await loadBookings();
            } catch (requestError) {
                alert(
                    getErrorMessage(
                        requestError,
                        "Không cập nhật được booking."
                    )
                );
            }
        };

    const cancelBooking =
        async (bookingId) => {
            if (
                !window.confirm(
                    "Hủy booking chưa thanh toán này?"
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/booking-service/bookings/${bookingId}/cancel`
                );

                await loadBookings();
            } catch (requestError) {
                alert(
                    getErrorMessage(
                        requestError,
                        "Không hủy được booking."
                    )
                );
            }
        };

    const deleteBooking =
        async (bookingId) => {
            if (
                !window.confirm(
                    "Xóa booking này khỏi database?"
                )
            ) {
                return;
            }

            try {
                await axiosClient.delete(
                    `/booking-service/bookings/${bookingId}`
                );

                await loadBookings();
            } catch (requestError) {
                alert(
                    getErrorMessage(
                        requestError,
                        "Không xóa được booking."
                    )
                );
            }
        };

    const getStatusClass =
        (value) => {
            const normalized =
                String(
                    value || ""
                ).toUpperCase();

            if (
                normalized === "PAID"
            ) {
                return "bg-green-100 text-green-700";
            }

            if (
                normalized ===
                "CANCELLED"
            ) {
                return "bg-red-100 text-red-700";
            }

            if (
                normalized ===
                "EXPIRED"
            ) {
                return "bg-slate-100 text-slate-700";
            }

            if (
                normalized === "FAILED"
            ) {
                return "bg-rose-100 text-rose-700";
            }

            return "bg-yellow-100 text-yellow-700";
        };

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-blue-600">
                        Admin / Bookings
                    </p>

                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                        Booking Management
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Tìm kiếm, lọc và
                        phân trang từ
                        Booking Service.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        setShowCreate(true)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                    <Plus size={18} />
                    Tạo booking
                </button>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                    {error}
                </div>
            )}

            <form
                onSubmit={submitSearch}
                className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-7"
            >
                <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 xl:col-span-2">
                    <Search
                        size={18}
                        className="text-slate-400"
                    />

                    <input
                        value={
                            keywordInput
                        }
                        onChange={(event) =>
                            setKeywordInput(
                                event.target
                                    .value
                            )
                        }
                        placeholder="Mã booking, ID, status..."
                        className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                </div>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    className="h-12 rounded-xl border px-4"
                >
                    <option value="ALL">
                        Tất cả trạng thái
                    </option>
                    <option value="PENDING">
                        PENDING
                    </option>
                    <option value="PAID">
                        PAID
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
                </select>

                <select
                    value={userIdFilter}
                    onChange={(event) => {
                        setUserIdFilter(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    className="h-12 rounded-xl border px-4"
                >
                    <option value="">
                        Tất cả user
                    </option>

                    {users.map((user) => (
                        <option
                            key={user.id}
                            value={user.id}
                        >
                            {user.name ||
                                user.email}{" "}
                            (#{user.id})
                        </option>
                    ))}
                </select>

                <select
                    value={
                        eventIdFilter
                    }
                    onChange={(event) => {
                        setEventIdFilter(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    className="h-12 rounded-xl border px-4"
                >
                    <option value="">
                        Tất cả event
                    </option>

                    {events.map((event) => (
                        <option
                            key={event.id}
                            value={event.id}
                        >
                            {event.name}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    min="0"
                    value={minAmount}
                    onChange={(event) => {
                        setMinAmount(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    placeholder="Giá từ"
                    className="h-12 rounded-xl border px-4"
                />

                <input
                    type="number"
                    min="0"
                    value={maxAmount}
                    onChange={(event) => {
                        setMaxAmount(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    placeholder="Giá đến"
                    className="h-12 rounded-xl border px-4"
                />

                <div className="flex gap-2 xl:col-span-7">
                    <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
                    >
                        Tìm kiếm
                    </button>

                    <button
                        type="button"
                        onClick={
                            clearFilters
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 font-semibold"
                    >
                        <FilterX
                            size={18}
                        />
                        Xóa lọc
                    </button>
                </div>
            </form>

            <section className="overflow-hidden rounded-3xl border bg-white">
                <div className="flex items-center justify-between border-b p-5">
                    <div className="font-semibold">
                        Tổng cộng{" "}
                        {totalElements}{" "}
                        booking
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={size}
                            onChange={(
                                event
                            ) => {
                                setSize(
                                    Number(
                                        event
                                            .target
                                            .value
                                    )
                                );
                                setPage(0);
                            }}
                            className="rounded-xl border px-3"
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
                        </select>

                        <button
                            type="button"
                            onClick={
                                loadBookings
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white"
                        >
                            <RefreshCw
                                size={17}
                            />
                            Reload
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-sm text-slate-600">
                            <tr>
                                <th className="px-5 py-4">
                                    ID
                                </th>
                                <th className="px-5 py-4">
                                    Booking
                                </th>
                                <th className="px-5 py-4">
                                    User
                                </th>
                                <th className="px-5 py-4">
                                    Event
                                </th>
                                <th className="px-5 py-4">
                                    Amount
                                </th>
                                <th className="px-5 py-4">
                                    Status
                                </th>
                                <th className="px-5 py-4">
                                    Ngày tạo
                                </th>
                                <th className="px-5 py-4">
                                    Hết hạn
                                </th>
                                <th className="px-5 py-4 text-right">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map(
                                (booking) => {
                                    const user =
                                        userMap.get(
                                            String(
                                                booking.userId
                                            )
                                        );

                                    const event =
                                        eventMap.get(
                                            String(
                                                booking.eventId
                                            )
                                        );

                                    return (
                                        <tr
                                            key={
                                                booking.id
                                            }
                                            className="border-t"
                                        >
                                            <td className="px-5 py-4">
                                                #
                                                {
                                                    booking.id
                                                }
                                            </td>

                                            <td className="px-5 py-4 font-bold">
                                                {
                                                    booking.bookingCode
                                                }
                                            </td>

                                            <td className="px-5 py-4">
                                                {user?.name ||
                                                    user?.email ||
                                                    `User #${booking.userId}`}
                                            </td>

                                            <td className="px-5 py-4">
                                                {event?.name ||
                                                    `Event #${booking.eventId}`}
                                            </td>

                                            <td className="px-5 py-4 font-semibold">
                                                {Number(
                                                    booking.totalAmount ||
                                                    0
                                                ).toLocaleString(
                                                    "vi-VN"
                                                )}{" "}
                                                đ
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                                                        booking.status
                                                    )}`}
                                                >
                                                    {
                                                        booking.status
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {booking.bookingDate
                                                    ? new Date(
                                                        booking.bookingDate
                                                    ).toLocaleString(
                                                        "vi-VN"
                                                    )
                                                    : "NULL"}
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {booking.expiresAt
                                                    ? new Date(
                                                        booking.expiresAt
                                                    ).toLocaleString(
                                                        "vi-VN"
                                                    )
                                                    : "NULL"}
                                            </td>

                                            <td className="space-x-2 whitespace-nowrap px-5 py-4 text-right">
                                                <Link
                                                    to={`/bookings/${booking.id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-white"
                                                >
                                                    <Eye
                                                        size={
                                                            15
                                                        }
                                                    />
                                                    Chi
                                                    tiết
                                                </Link>

                                                {booking.status ===
                                                    "PENDING" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    markPaid(
                                                                        booking.id
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-white"
                                                            >
                                                                <CheckCircle
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                PAID
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    cancelBooking(
                                                                        booking.id
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-white"
                                                            >
                                                                <Ban
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Hủy
                                                            </button>
                                                        </>
                                                    )}

                                                {booking.status !==
                                                    "PAID" && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteBooking(
                                                                    booking.id
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-white"
                                                        >
                                                            <Trash2
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Xóa
                                                        </button>
                                                    )}
                                            </td>
                                        </tr>
                                    );
                                }
                            )}

                            {!loading &&
                                bookings.length ===
                                0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                9
                                            }
                                            className="px-5 py-12 text-center text-slate-500"
                                        >
                                            Không có
                                            booking
                                            phù hợp.
                                        </td>
                                    </tr>
                                )}

                            {loading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-5 py-12 text-center"
                                    >
                                        Đang tải...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t p-5">
                    <span>
                        Trang{" "}
                        {totalPages === 0
                            ? 0
                            : page + 1}
                        /{totalPages}
                    </span>

                    <div className="flex gap-2">
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
                            className="flex h-10 w-10 items-center justify-center rounded-xl border disabled:opacity-40"
                        >
                            <ChevronLeft
                                size={18}
                            />
                        </button>

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
                            className="flex h-10 w-10 items-center justify-center rounded-xl border disabled:opacity-40"
                        >
                            <ChevronRight
                                size={18}
                            />
                        </button>
                    </div>
                </div>
            </section>

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <form
                        onSubmit={
                            createBooking
                        }
                        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">
                                Tạo booking
                            </h2>

                            <button
                                type="button"
                                onClick={
                                    closeCreate
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                            >
                                <X
                                    size={18}
                                />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <select
                                value={
                                    form.userId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setForm(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            userId:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    )
                                }
                                className="h-12 rounded-xl border px-4"
                            >
                                <option value="">
                                    Chọn user
                                </option>

                                {users.map(
                                    (user) => (
                                        <option
                                            key={
                                                user.id
                                            }
                                            value={
                                                user.id
                                            }
                                        >
                                            {user.name ||
                                                user.email}
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={
                                    form.eventId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setForm(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            eventId:
                                                event
                                                    .target
                                                    .value,
                                            seatIds:
                                                [],
                                        })
                                    )
                                }
                                className="h-12 rounded-xl border px-4"
                            >
                                <option value="">
                                    Chọn event
                                </option>

                                {events.map(
                                    (event) => (
                                        <option
                                            key={
                                                event.id
                                            }
                                            value={
                                                event.id
                                            }
                                        >
                                            {
                                                event.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="mt-6">
                            <div className="mb-3 font-bold">
                                Ghế AVAILABLE{" "}
                                {loadingSeats
                                    ? "(đang tải...)"
                                    : ""}
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {availableSeats.map(
                                    (seat) => {
                                        const selected =
                                            form.seatIds.includes(
                                                Number(
                                                    seat.id
                                                )
                                            );

                                        return (
                                            <button
                                                key={
                                                    seat.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    toggleSeat(
                                                        seat.id
                                                    )
                                                }
                                                className={`rounded-xl border p-3 text-left ${selected
                                                    ? "border-blue-600 bg-blue-50"
                                                    : ""
                                                    }`}
                                            >
                                                <div className="font-bold">
                                                    {
                                                        seat.seatNumber
                                                    }
                                                </div>

                                                <div className="text-xs">
                                                    {
                                                        seat.seatType
                                                    }
                                                </div>

                                                <div>
                                                    {Number(
                                                        seat.price ||
                                                        0
                                                    ).toLocaleString(
                                                        "vi-VN"
                                                    )}{" "}
                                                    đ
                                                </div>
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="font-bold">
                                Đã chọn{" "}
                                {
                                    form.seatIds
                                        .length
                                }
                                /4 ghế · Tổng{" "}
                                {selectedTotal.toLocaleString(
                                    "vi-VN"
                                )}{" "}
                                đ
                            </div>

                            <button
                                type="submit"
                                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
                            >
                                Tạo booking
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Bookings;