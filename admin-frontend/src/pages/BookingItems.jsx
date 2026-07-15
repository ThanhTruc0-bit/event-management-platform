import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { Link } from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    FilterX,
    RefreshCw,
    Search,
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
            Number(data?.totalElements) ||
            0,

        totalPages:
            Number(data?.totalPages) ||
            0,
    };
}

function BookingItems() {
    const [items, setItems] =
        useState([]);

    const [bookings, setBookings] =
        useState([]);

    const [seats, setSeats] =
        useState([]);

    const [
        keywordInput,
        setKeywordInput,
    ] = useState("");

    const [keyword, setKeyword] =
        useState("");

    const [bookingId, setBookingId] =
        useState("");

    const [seatId, setSeatId] =
        useState("");

    const [minPrice, setMinPrice] =
        useState("");

    const [maxPrice, setMaxPrice] =
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

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        loadItems();

        // eslint-disable-next-line
    }, [
        page,
        size,
        keyword,
        bookingId,
        seatId,
        minPrice,
        maxPrice,
    ]);

    const loadReferenceData =
        async () => {
            const [
                bookingResult,
                seatResult,
            ] = await Promise.allSettled([
                axiosClient.get(
                    "/booking-service/bookings",
                    {
                        params: {
                            page: 0,
                            size: 100,
                            sortBy:
                                "bookingDate",
                            sortDirection:
                                "desc",
                        },
                    }
                ),

                axiosClient.get(
                    "/seat-service/seats",
                    {
                        params: {
                            page: 0,
                            size: 500,
                        },
                    }
                ),
            ]);

            setBookings(
                bookingResult.status ===
                    "fulfilled"
                    ? normalizeList(
                        bookingResult
                            .value.data
                    )
                    : []
            );

            setSeats(
                seatResult.status ===
                    "fulfilled"
                    ? normalizeList(
                        seatResult.value.data
                    )
                    : []
            );
        };

    const loadItems = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await axiosClient.get(
                    "/booking-service/booking-items",
                    {
                        params: {
                            page,
                            size,

                            keyword:
                                keyword ||
                                undefined,

                            bookingId:
                                bookingId ||
                                undefined,

                            seatId:
                                seatId ||
                                undefined,

                            minPrice:
                                minPrice ||
                                undefined,

                            maxPrice:
                                maxPrice ||
                                undefined,

                            sortBy: "id",

                            sortDirection:
                                "desc",
                        },
                    }
                );

            const pageData =
                normalizePage(
                    response.data
                );

            setItems(
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

            setItems([]);
            setTotalElements(0);
            setTotalPages(0);

            setError(
                requestError
                    ?.response
                    ?.data
                    ?.message ||
                "Không tải được Booking Items."
            );
        } finally {
            setLoading(false);
        }
    };

    const bookingMap = useMemo(
        () =>
            new Map(
                bookings.map(
                    (booking) => [
                        String(
                            booking.id
                        ),
                        booking,
                    ]
                )
            ),
        [bookings]
    );

    const seatMap = useMemo(
        () =>
            new Map(
                seats.map((seat) => [
                    String(seat.id),
                    seat,
                ])
            ),
        [seats]
    );

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
        setBookingId("");
        setSeatId("");
        setMinPrice("");
        setMaxPrice("");
        setPage(0);
    };

    const statusClass = (
        value
    ) => {
        const status =
            String(
                value || ""
            ).toUpperCase();

        if (status === "AVAILABLE") {
            return "bg-green-100 text-green-700";
        }

        if (status === "RESERVED") {
            return "bg-yellow-100 text-yellow-700";
        }

        if (status === "BOOKED") {
            return "bg-red-100 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-blue-600">
                        Admin / Booking Items
                    </p>

                    <h1 className="mt-1 text-3xl font-bold">
                        Booking Items
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Dữ liệu được tạo tự
                        động khi tạo booking.
                    </p>
                </div>

                <Link
                    to="/bookings"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
                >
                    <ArrowLeft
                        size={18}
                    />
                    Về Bookings
                </Link>
            </header>

            {error && (
                <div className="rounded-xl bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            <form
                onSubmit={submitSearch}
                className="grid grid-cols-1 gap-4 rounded-3xl border bg-white p-5 md:grid-cols-2 xl:grid-cols-6"
            >
                <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 xl:col-span-2">
                    <Search
                        size={18}
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
                        placeholder="ID, Booking ID, Seat ID..."
                        className="flex-1 bg-transparent outline-none"
                    />
                </div>

                <select
                    value={bookingId}
                    onChange={(event) => {
                        setBookingId(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    className="h-12 rounded-xl border px-4"
                >
                    <option value="">
                        Tất cả booking
                    </option>

                    {bookings.map(
                        (booking) => (
                            <option
                                key={
                                    booking.id
                                }
                                value={
                                    booking.id
                                }
                            >
                                {booking.bookingCode ||
                                    `Booking #${booking.id}`}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={seatId}
                    onChange={(event) => {
                        setSeatId(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    className="h-12 rounded-xl border px-4"
                >
                    <option value="">
                        Tất cả ghế
                    </option>

                    {seats.map(
                        (seat) => (
                            <option
                                key={seat.id}
                                value={
                                    seat.id
                                }
                            >
                                {seat.seatNumber ||
                                    `Seat #${seat.id}`}
                            </option>
                        )
                    )}
                </select>

                <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => {
                        setMinPrice(
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
                    value={maxPrice}
                    onChange={(event) => {
                        setMaxPrice(
                            event.target.value
                        );
                        setPage(0);
                    }}
                    placeholder="Giá đến"
                    className="h-12 rounded-xl border px-4"
                />

                <div className="flex gap-2 xl:col-span-6">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3"
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
                        Tổng{" "}
                        {totalElements}{" "}
                        booking item
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
                                loadItems
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
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-4">
                                    ID
                                </th>
                                <th className="px-5 py-4">
                                    Booking
                                </th>
                                <th className="px-5 py-4">
                                    Seat
                                </th>
                                <th className="px-5 py-4">
                                    Type
                                </th>
                                <th className="px-5 py-4">
                                    Status
                                </th>
                                <th className="px-5 py-4">
                                    Price
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map(
                                (item) => {
                                    const booking =
                                        bookingMap.get(
                                            String(
                                                item.bookingId
                                            )
                                        );

                                    const seat =
                                        seatMap.get(
                                            String(
                                                item.seatId
                                            )
                                        );

                                    return (
                                        <tr
                                            key={
                                                item.id
                                            }
                                            className="border-t"
                                        >
                                            <td className="px-5 py-4">
                                                #
                                                {
                                                    item.id
                                                }
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="font-bold">
                                                    {booking?.bookingCode ||
                                                        `Booking #${item.bookingId}`}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="font-bold">
                                                    {seat?.seatNumber ||
                                                        `Seat #${item.seatId}`}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {seat?.seatType ||
                                                    "NULL"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                                        seat?.status
                                                    )}`}
                                                >
                                                    {seat?.status ||
                                                        "NULL"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 font-semibold">
                                                {Number(
                                                    item.price ||
                                                    0
                                                ).toLocaleString(
                                                    "vi-VN"
                                                )}{" "}
                                                đ
                                            </td>
                                        </tr>
                                    );
                                }
                            )}

                            {!loading &&
                                items.length ===
                                0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                6
                                            }
                                            className="px-5 py-12 text-center"
                                        >
                                            Không có dữ
                                            liệu.
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
        </div>
    );
}

export default BookingItems;