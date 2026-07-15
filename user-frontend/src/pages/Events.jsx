import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useSearchParams,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    ArrowRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    MapPin,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Ticket,
    Users,
} from "lucide-react";

const PAGE_SIZE = 12;

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    return [];
}

function getEventImage(event) {
    const image =
        event?.banner ||
        event?.bannerUrl ||
        event?.imageUrl ||
        event?.thumbnail;

    if (!image) {
        return "";
    }

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

    if (
        image.startsWith(
            "http://event-service:8084"
        )
    ) {
        return image.replace(
            "http://event-service:8084",
            "/api/event-service"
        );
    }

    if (
        image.startsWith(
            "/uploads/"
        )
    ) {
        return `/api/event-service${image}`;
    }

    return image;
}

function Events() {
    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const [events, setEvents] =
        useState([]);

    const [
        categories,
        setCategories,
    ] = useState([]);

    const [
        keywordInput,
        setKeywordInput,
    ] = useState(
        searchParams.get(
            "keyword"
        ) || ""
    );

    const [keyword, setKeyword] =
        useState(
            searchParams.get(
                "keyword"
            ) || ""
        );

    const [
        categoryId,
        setCategoryId,
    ] = useState(
        searchParams.get(
            "categoryId"
        ) || "ALL"
    );

    const [
        ticketStatus,
        setTicketStatus,
    ] = useState("ALL");

    const [
        priceRange,
        setPriceRange,
    ] = useState("ALL");

    const [
        timeFilter,
        setTimeFilter,
    ] = useState("ALL");

    const [page, setPage] =
        useState(0);

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
        loadCategories();
    }, []);

    useEffect(() => {
        loadEvents();

        // eslint-disable-next-line
    }, [
        keyword,
        categoryId,
        ticketStatus,
        priceRange,
        timeFilter,
        page,
    ]);

    const loadCategories =
        async () => {
            try {
                const response =
                    await axiosClient.get(
                        "/event-service/event-categories",
                        {
                            params: {
                                page: 0,
                                size: 100,
                                status:
                                    "ACTIVE",
                                sortBy:
                                    "name",
                                sortDirection:
                                    "asc",
                            },
                        }
                    );

                setCategories(
                    normalizeList(
                        response.data
                    )
                );
            } catch (requestError) {
                console.error(
                    requestError
                );

                setCategories([]);
            }
        };

    const getPriceParams = () => {
        switch (priceRange) {
            case "FREE":
                return {
                    minPrice: 0,
                    maxPrice: 0,
                };

            case "UNDER_500":
                return {
                    minPrice: 1,
                    maxPrice: 499999,
                };

            case "500_1000":
                return {
                    minPrice: 500000,
                    maxPrice: 1000000,
                };

            case "OVER_1000":
                return {
                    minPrice: 1000001,
                };

            default:
                return {};
        }
    };

    const getTimeParams = () => {
        if (
            timeFilter !==
            "UPCOMING_SOON"
        ) {
            return {};
        }

        const fromDate =
            new Date();

        const toDate =
            new Date();

        toDate.setDate(
            toDate.getDate() + 30
        );

        return {
            fromDate:
                fromDate.toISOString(),

            toDate:
                toDate.toISOString(),
        };
    };

    const loadEvents =
        async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await axiosClient.get(
                        "/event-service/events",
                        {
                            params: {
                                page,
                                size: PAGE_SIZE,

                                keyword:
                                    keyword ||
                                    undefined,

                                categoryId:
                                    categoryId ===
                                        "ALL"
                                        ? undefined
                                        : Number(
                                            categoryId
                                        ),

                                ticketStatus:
                                    ticketStatus ===
                                        "ALL"
                                        ? undefined
                                        : ticketStatus,

                                publicOnly:
                                    true,

                                sortBy:
                                    "eventDate",

                                sortDirection:
                                    "asc",

                                ...getPriceParams(),

                                ...getTimeParams(),
                            },
                        }
                    );

                setEvents(
                    normalizeList(
                        response.data
                    )
                );

                setTotalElements(
                    Number(
                        response.data
                            ?.totalElements
                    ) || 0
                );

                setTotalPages(
                    Number(
                        response.data
                            ?.totalPages
                    ) || 0
                );
            } catch (requestError) {
                console.error(
                    requestError
                );

                setEvents([]);
                setTotalElements(0);
                setTotalPages(0);

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không tải được danh sách sự kiện."
                );
            } finally {
                setLoading(false);
            }
        };

    const selectedCategory =
        useMemo(() => {
            if (
                categoryId ===
                "ALL"
            ) {
                return null;
            }

            return categories.find(
                (category) =>
                    Number(
                        category.id
                    ) ===
                    Number(
                        categoryId
                    )
            );
        }, [
            categories,
            categoryId,
        ]);

    const submitSearch =
        (event) => {
            event.preventDefault();

            const value =
                keywordInput.trim();

            setKeyword(value);
            setPage(0);

            const params = {};

            if (value) {
                params.keyword =
                    value;
            }

            if (
                categoryId !==
                "ALL"
            ) {
                params.categoryId =
                    categoryId;
            }

            setSearchParams(params);
        };

    const resetFilter = () => {
        setKeywordInput("");
        setKeyword("");
        setCategoryId("ALL");
        setTicketStatus("ALL");
        setPriceRange("ALL");
        setTimeFilter("ALL");
        setPage(0);
        setSearchParams({});
    };

    const formatMoney =
        (value) => {
            if (
                value === null ||
                value === undefined
            ) {
                return "Đang cập nhật";
            }

            const number =
                Number(value);

            if (number === 0) {
                return "Miễn phí";
            }

            return `${number.toLocaleString(
                "vi-VN"
            )} đ`;
        };

    const formatDate =
        (value) => {
            if (!value) {
                return "Đang cập nhật";
            }

            return new Date(
                value
            ).toLocaleDateString(
                "vi-VN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }
            );
        };

    const formatTime =
        (value) => {
            if (!value) {
                return "";
            }

            return new Date(
                value
            ).toLocaleTimeString(
                "vi-VN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );
        };

    const getTicketBadge =
        (event) => {
            switch (
            event.ticketStatus
            ) {
                case "SOLD_OUT":
                    return {
                        text: "HẾT VÉ",
                        className:
                            "bg-red-500 text-white",
                    };

                case "LOW":
                    return {
                        text:
                            "CÒN ÍT VÉ",
                        className:
                            "bg-amber-400 text-slate-950",
                    };

                case "UPCOMING":
                    return {
                        text:
                            "SẮP MỞ BÁN",
                        className:
                            "bg-blue-400 text-slate-950",
                    };

                case "ENDED":
                    return {
                        text:
                            "ĐÃ KẾT THÚC",
                        className:
                            "bg-slate-200 text-slate-700",
                    };

                case "NO_TICKETS":
                    return {
                        text:
                            "CHƯA CÓ VÉ",
                        className:
                            "bg-slate-500 text-white",
                    };

                default:
                    return {
                        text:
                            "ĐANG BÁN",
                        className:
                            "bg-emerald-400 text-slate-950",
                    };
            }
        };

    const pageNumbers =
        useMemo(() => {
            const start =
                Math.max(
                    0,
                    page - 2
                );

            const end =
                Math.min(
                    totalPages,
                    start + 5
                );

            return Array.from(
                {
                    length:
                        Math.max(
                            0,
                            end - start
                        ),
                },
                (_, index) =>
                    start + index
            );
        }, [
            page,
            totalPages,
        ]);

    return (
        <div className="min-h-screen bg-[#111317] text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
                <section className="relative mb-8 overflow-hidden rounded-[34px] border border-white/10 bg-[#08090b] p-8 md:p-10">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

                    <div className="relative max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                            <Ticket
                                size={16}
                            />
                            Danh sách sự kiện
                        </div>

                        <h1 className="mt-5 text-4xl font-black md:text-5xl">
                            {selectedCategory
                                ? selectedCategory.name
                                : "Tìm sự kiện bạn yêu thích"}
                        </h1>

                        <p className="mt-4 leading-7 text-slate-300">
                            Tìm kiếm, lọc danh mục, trạng thái vé, giá và thời gian giống luồng Ticketbox.
                        </p>
                    </div>
                </section>

                <form
                    onSubmit={
                        submitSearch
                    }
                    className="mb-8 rounded-[28px] border border-white/10 bg-[#1b1f27] p-5"
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <FilterSelect
                            label="Danh mục"
                            icon={
                                <Filter
                                    size={19}
                                />
                            }
                            value={
                                categoryId
                            }
                            onChange={(
                                event
                            ) => {
                                setCategoryId(
                                    event
                                        .target
                                        .value
                                );

                                setPage(0);
                            }}
                        >
                            <option value="ALL">
                                Tất cả danh mục
                            </option>

                            {categories.map(
                                (
                                    category
                                ) => (
                                    <option
                                        key={
                                            category.id
                                        }
                                        value={
                                            category.id
                                        }
                                    >
                                        {
                                            category.name
                                        }
                                    </option>
                                )
                            )}
                        </FilterSelect>

                        <FilterSelect
                            label="Trạng thái vé"
                            icon={
                                <SlidersHorizontal
                                    size={19}
                                />
                            }
                            value={
                                ticketStatus
                            }
                            onChange={(
                                event
                            ) => {
                                setTicketStatus(
                                    event
                                        .target
                                        .value
                                );

                                setPage(0);
                            }}
                        >
                            <option value="ALL">
                                Tất cả
                            </option>
                            <option value="SELLING">
                                Đang bán
                            </option>
                            <option value="LOW">
                                Còn ít vé
                            </option>
                            <option value="SOLD_OUT">
                                Hết vé
                            </option>
                            <option value="UPCOMING">
                                Sắp mở bán
                            </option>
                            <option value="ENDED">
                                Đã kết thúc
                            </option>
                            <option value="NO_TICKETS">
                                Chưa có vé
                            </option>
                        </FilterSelect>

                        <FilterSelect
                            label="Giá vé"
                            icon={
                                <Ticket
                                    size={19}
                                />
                            }
                            value={
                                priceRange
                            }
                            onChange={(
                                event
                            ) => {
                                setPriceRange(
                                    event
                                        .target
                                        .value
                                );

                                setPage(0);
                            }}
                        >
                            <option value="ALL">
                                Tất cả giá
                            </option>
                            <option value="FREE">
                                Miễn phí
                            </option>
                            <option value="UNDER_500">
                                Dưới 500K
                            </option>
                            <option value="500_1000">
                                500K - 1 triệu
                            </option>
                            <option value="OVER_1000">
                                Trên 1 triệu
                            </option>
                        </FilterSelect>

                        <div>
                            <label className="mb-2 block text-xs font-black text-slate-400">
                                Tìm kiếm
                            </label>

                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3">
                                <Search
                                    size={19}
                                    className="text-slate-400"
                                />

                                <input
                                    value={
                                        keywordInput
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setKeywordInput(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Tên, địa điểm, danh mục..."
                                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black text-slate-400">
                                Thời gian
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    setTimeFilter(
                                        (
                                            value
                                        ) =>
                                            value ===
                                                "UPCOMING_SOON"
                                                ? "ALL"
                                                : "UPCOMING_SOON"
                                    );

                                    setPage(0);
                                }}
                                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${timeFilter ===
                                    "UPCOMING_SOON"
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-white/10 bg-white/[0.08]"
                                    }`}
                            >
                                <Clock
                                    size={18}
                                />
                                Trong 30 ngày
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-slate-400">
                            Tìm thấy{" "}
                            <span className="font-black text-emerald-300">
                                {
                                    totalElements
                                }
                            </span>{" "}
                            sự kiện
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={
                                    resetFilter
                                }
                                className="rounded-full bg-white/[0.08] px-4 py-2.5 text-sm font-black"
                            >
                                Xóa bộ lọc
                            </button>

                            <button
                                type="button"
                                onClick={
                                    loadEvents
                                }
                                disabled={
                                    loading
                                }
                                className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2.5 text-sm font-black disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                                Reload
                            </button>

                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black"
                            >
                                Tìm kiếm
                                <Search
                                    size={16}
                                />
                            </button>
                        </div>
                    </div>
                </form>

                {error && (
                    <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 font-bold text-red-300">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-10 text-center text-slate-300">
                        Đang tải sự kiện...
                    </div>
                ) : events.length ===
                    0 ? (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-10 text-center text-slate-300">
                        Không có sự kiện phù hợp.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {events.map(
                            (event) => {
                                const badge =
                                    getTicketBadge(
                                        event
                                    );

                                const image =
                                    getEventImage(
                                        event
                                    );

                                return (
                                    <article
                                        key={
                                            event.id
                                        }
                                        className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#1f232b]"
                                    >
                                        <Link
                                            to={`/events/${event.id}`}
                                            className="block"
                                        >
                                            <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
                                                {image ? (
                                                    <img
                                                        src={
                                                            image
                                                        }
                                                        alt={
                                                            event.name
                                                        }
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center">
                                                        <Ticket
                                                            size={
                                                                54
                                                            }
                                                            className="text-emerald-400"
                                                        />
                                                    </div>
                                                )}

                                                <span
                                                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black ${badge.className}`}
                                                >
                                                    {
                                                        badge.text
                                                    }
                                                </span>
                                            </div>

                                            <div className="p-5">
                                                <div className="text-xs font-black uppercase text-emerald-300">
                                                    {event.categoryName ||
                                                        "Sự kiện"}
                                                </div>

                                                <h2 className="mt-2 line-clamp-2 text-xl font-black">
                                                    {
                                                        event.name
                                                    }
                                                </h2>

                                                <div className="mt-4 space-y-2 text-sm text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        {formatTime(
                                                            event.eventDate
                                                        )}{" "}
                                                        ·{" "}
                                                        {formatDate(
                                                            event.eventDate
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <MapPin
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        {event.location ||
                                                            "Đang cập nhật"}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Users
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Còn{" "}
                                                        {Number(
                                                            event.availableSeats ||
                                                            0
                                                        )}{" "}
                                                        /{" "}
                                                        {Number(
                                                            event.totalSeats ||
                                                            0
                                                        )}{" "}
                                                        vé
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex items-end justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs text-slate-400">
                                                            Giá vé từ
                                                        </div>

                                                        <div className="mt-1 text-xl font-black text-emerald-300">
                                                            {formatMoney(
                                                                event.minPrice
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className="inline-flex items-center gap-1 font-black text-emerald-300">
                                                        Chi tiết
                                                        <ArrowRight
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
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
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
                        >
                            <ChevronLeft
                                size={18}
                            />
                        </button>

                        {pageNumbers.map(
                            (
                                pageNumber
                            ) => (
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
                                    className={`h-11 min-w-11 rounded-xl px-3 font-black ${page ===
                                        pageNumber
                                        ? "bg-emerald-500"
                                        : "bg-white/10"
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
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
                        >
                            <ChevronRight
                                size={18}
                            />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    icon,
    value,
    onChange,
    children,
}) {
    return (
        <div>
            <label className="mb-2 block text-xs font-black text-slate-400">
                {label}
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3">
                <span className="text-slate-400">
                    {icon}
                </span>

                <select
                    value={value}
                    onChange={onChange}
                    className="min-w-0 flex-1 bg-[#1b1f27] text-sm text-white outline-none"
                >
                    {children}
                </select>
            </div>
        </div>
    );
}

export default Events;