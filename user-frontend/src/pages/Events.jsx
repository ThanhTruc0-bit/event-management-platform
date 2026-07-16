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

function normalizePage(data) {
    if (Array.isArray(data)) {
        return {
            content: data,

            totalElements:
                data.length,

            totalPages:
                data.length > 0
                    ? 1
                    : 0,
        };
    }

    return {
        content:
            normalizeList(data),

        totalElements:
            Number(
                data?.totalElements
            ) || 0,

        totalPages:
            Number(
                data?.totalPages
            ) || 0,
    };
}

function toLocalDateTimeParam(date) {
    const pad = (value) =>
        String(value).padStart(
            2,
            "0"
        );

    return [
        date.getFullYear(),
        "-",
        pad(
            date.getMonth() + 1
        ),
        "-",
        pad(date.getDate()),
        "T",
        pad(date.getHours()),
        ":",
        pad(date.getMinutes()),
        ":",
        pad(date.getSeconds()),
    ].join("");
}

function getRawEventImage(event) {
    return (
        event?.imageUrl ||
        event?.banner ||
        event?.bannerUrl ||
        event?.thumbnail ||
        event?.image ||
        ""
    );
}

function buildEventImageCandidates(event) {
    const rawImage =
        getRawEventImage(event);

    if (!rawImage) {
        return [];
    }

    const value =
        String(rawImage)
            .trim()
            .replace(/\\/g, "/");

    if (!value) {
        return [];
    }

    const candidates = [];

    const addCandidate =
        (candidate) => {
            if (
                candidate &&
                !candidates.includes(
                    candidate
                )
            ) {
                candidates.push(
                    candidate
                );
            }
        };

    if (
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        addCandidate(value);

        return candidates;
    }

    /*
     * URL đầy đủ từ Event Service.
     */
    if (
        value.startsWith(
            "http://localhost:8084"
        ) ||
        value.startsWith(
            "https://localhost:8084"
        ) ||
        value.startsWith(
            "http://event-service:8084"
        ) ||
        value.startsWith(
            "https://event-service:8084"
        )
    ) {
        const relativePath =
            value.replace(
                /^https?:\/\/(?:localhost|event-service):8084/,
                ""
            );

        const normalizedPath =
            relativePath.startsWith("/")
                ? relativePath
                : `/${relativePath}`;

        addCandidate(
            `/api/event-service${normalizedPath}`
        );

        addCandidate(
            `/event-service${normalizedPath}`
        );

        addCandidate(value);

        return candidates;
    }

    /*
     * URL website bên ngoài.
     */
    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        addCandidate(value);

        return candidates;
    }

    /*
     * Đã có prefix /api/event-service.
     */
    if (
        value.startsWith(
            "/api/event-service/"
        )
    ) {
        addCandidate(value);

        addCandidate(
            value.replace(
                /^\/api/,
                ""
            )
        );

        return candidates;
    }

    if (
        value.startsWith(
            "api/event-service/"
        )
    ) {
        addCandidate(`/${value}`);

        addCandidate(
            `/${value.replace(
                /^api\//,
                ""
            )}`
        );

        return candidates;
    }

    /*
     * Đã có prefix /event-service.
     */
    if (
        value.startsWith(
            "/event-service/"
        )
    ) {
        addCandidate(
            `/api${value}`
        );

        addCandidate(value);

        return candidates;
    }

    if (
        value.startsWith(
            "event-service/"
        )
    ) {
        addCandidate(
            `/api/${value}`
        );

        addCandidate(
            `/${value}`
        );

        return candidates;
    }

    /*
     * Backend trả /uploads/events/file.jpg.
     */
    if (
        value.startsWith(
            "/uploads/"
        )
    ) {
        addCandidate(
            `/api/event-service${value}`
        );

        addCandidate(
            `/event-service${value}`
        );

        addCandidate(
            `http://localhost:8084${value}`
        );

        return candidates;
    }

    /*
     * Backend trả uploads/events/file.jpg.
     */
    if (
        value.startsWith(
            "uploads/"
        )
    ) {
        addCandidate(
            `/api/event-service/${value}`
        );

        addCandidate(
            `/event-service/${value}`
        );

        addCandidate(
            `http://localhost:8084/${value}`
        );

        return candidates;
    }

    /*
     * Backend trả events/file.jpg.
     */
    if (
        value.startsWith(
            "events/"
        )
    ) {
        addCandidate(
            `/api/event-service/uploads/${value}`
        );

        addCandidate(
            `/event-service/uploads/${value}`
        );

        addCandidate(
            `http://localhost:8084/uploads/${value}`
        );

        return candidates;
    }

    /*
     * Backend chỉ trả tên file.
     */
    const fileName =
        value.replace(
            /^\/+/,
            ""
        );

    addCandidate(
        `/api/event-service/uploads/events/${fileName}`
    );

    addCandidate(
        `/event-service/uploads/events/${fileName}`
    );

    addCandidate(
        `http://localhost:8084/uploads/events/${fileName}`
    );

    addCandidate(value);

    return candidates;
}

function EventImage({
    event,
    alt,
    className,
    fallbackClassName,
    fallbackSize = 64,
    loading = "lazy",
}) {
    const candidates =
        useMemo(
            () =>
                buildEventImageCandidates(
                    event
                ),
            [
                event?.imageUrl,
                event?.banner,
                event?.bannerUrl,
                event?.thumbnail,
                event?.image,
            ]
        );

    const candidateKey =
        candidates.join("|");

    const [
        imageIndex,
        setImageIndex,
    ] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [candidateKey]);

    const currentImage =
        candidates[imageIndex];

    if (!currentImage) {
        return (
            <div
                className={
                    fallbackClassName
                }
            >
                <Ticket
                    size={
                        fallbackSize
                    }
                />
            </div>
        );
    }

    return (
        <img
            key={currentImage}
            src={currentImage}
            alt={
                alt || "Sự kiện"
            }
            className={className}
            loading={loading}
            decoding="async"
            onError={() => {
                console.warn(
                    "Ảnh lỗi, thử đường dẫn tiếp theo:",
                    currentImage
                );

                setImageIndex(
                    (current) =>
                        current + 1
                );
            }}
        />
    );
}

function formatMoney(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "Đang cập nhật";
    }

    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return "Đang cập nhật";
    }

    if (number === 0) {
        return "Miễn phí";
    }

    return `${number.toLocaleString(
        "vi-VN"
    )} đ`;
}

function formatDate(value) {
    if (!value) {
        return "Đang cập nhật";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );
}

function formatTime(value) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleTimeString(
        "vi-VN",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function getTicketBadge(event) {
    const ticketStatus =
        String(
            event?.ticketStatus ||
            ""
        )
            .trim()
            .toUpperCase();

    const eventStatus =
        String(
            event?.status ||
            ""
        )
            .trim()
            .toUpperCase();

    const totalSeats =
        Number(
            event?.totalSeats || 0
        );

    const availableSeats =
        Number(
            event?.availableSeats || 0
        );

    if (
        ticketStatus ===
        "SOLD_OUT" ||
        eventStatus ===
        "SOLD_OUT" ||
        (
            totalSeats > 0 &&
            availableSeats === 0
        )
    ) {
        return {
            text: "HẾT VÉ",

            className:
                "bg-red-500 text-white",
        };
    }

    if (
        ticketStatus === "LOW" ||
        (
            availableSeats > 0 &&
            availableSeats <= 5
        )
    ) {
        return {
            text: "CÒN ÍT VÉ",

            className:
                "bg-amber-400 text-slate-950",
        };
    }

    if (
        ticketStatus ===
        "UPCOMING" ||
        eventStatus === "UPCOMING"
    ) {
        return {
            text: "SẮP MỞ BÁN",

            className:
                "bg-blue-400 text-slate-950",
        };
    }

    if (
        ticketStatus === "ENDED" ||
        [
            "CLOSED",
            "COMPLETED",
        ].includes(eventStatus)
    ) {
        return {
            text: "ĐÃ KẾT THÚC",

            className:
                "bg-slate-200 text-slate-700",
        };
    }

    if (
        ticketStatus ===
        "NO_TICKETS" ||
        totalSeats === 0
    ) {
        return {
            text: "CHƯA CÓ VÉ",

            className:
                "bg-slate-500 text-white",
        };
    }

    return {
        text: "ĐANG BÁN",

        className:
            "bg-emerald-400 text-slate-950",
    };
}

function Events() {
    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const [
        events,
        setEvents,
    ] = useState([]);

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

    const [
        keyword,
        setKeyword,
    ] = useState(
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

    const [
        page,
        setPage,
    ] = useState(0);

    const [
        totalElements,
        setTotalElements,
    ] = useState(0);

    const [
        totalPages,
        setTotalPages,
    ] = useState(0);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    useEffect(() => {
        loadCategories();

        // eslint-disable-next-line
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

    useEffect(() => {
        if (
            totalPages > 0 &&
            page >= totalPages
        ) {
            setPage(
                totalPages - 1
            );
        }
    }, [
        page,
        totalPages,
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
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                setCategories([]);
            }
        };

    const getPriceParams =
        () => {
            switch (priceRange) {
                case "FREE":
                    return {
                        minPrice: 0,
                        maxPrice: 0,
                    };

                case "UNDER_500":
                    return {
                        minPrice: 1,
                        maxPrice:
                            499999,
                    };

                case "500_1000":
                    return {
                        minPrice:
                            500000,
                        maxPrice:
                            1000000,
                    };

                case "OVER_1000":
                    return {
                        minPrice:
                            1000001,
                    };

                default:
                    return {};
            }
        };

    const getTimeParams =
        () => {
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
                toDate.getDate() +
                30
            );

            return {
                fromDate:
                    toLocalDateTimeParam(
                        fromDate
                    ),

                toDate:
                    toLocalDateTimeParam(
                        toDate
                    ),
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

                                size:
                                    PAGE_SIZE,

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

                const pageData =
                    normalizePage(
                        response.data
                    );

                setEvents(
                    pageData.content
                );

                setTotalElements(
                    pageData.totalElements
                );

                setTotalPages(
                    pageData.totalPages
                );
            } catch (
            requestError
            ) {
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

            setSearchParams(
                params
            );
        };

    const resetFilters = () => {
        setKeywordInput("");
        setKeyword("");
        setCategoryId("ALL");
        setTicketStatus("ALL");
        setPriceRange("ALL");
        setTimeFilter("ALL");
        setPage(0);
        setSearchParams({});
    };

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
                            Tìm kiếm, lọc danh mục,
                            trạng thái vé, giá và
                            thời gian.
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

                        <FilterSelect
                            label="Thời gian"
                            icon={
                                <Clock
                                    size={19}
                                />
                            }
                            value={
                                timeFilter
                            }
                            onChange={(
                                event
                            ) => {
                                setTimeFilter(
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

                            <option value="UPCOMING_SOON">
                                Trong 30 ngày tới
                            </option>
                        </FilterSelect>

                        <div>
                            <label className="mb-2 block text-xs font-black text-slate-400">
                                Tìm kiếm
                            </label>

                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
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
                                    className="min-w-0 flex-1 bg-transparent outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950"
                        >
                            Tìm kiếm
                        </button>

                        <button
                            type="button"
                            onClick={
                                resetFilters
                            }
                            className="rounded-2xl bg-white/10 px-6 py-3 font-black"
                        >
                            Xóa lọc
                        </button>

                        <button
                            type="button"
                            onClick={
                                loadEvents
                            }
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 font-black"
                        >
                            <RefreshCw
                                size={18}
                            />

                            Reload
                        </button>
                    </div>
                </form>

                <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="text-slate-300">
                        Tìm thấy{" "}
                        <strong className="text-emerald-300">
                            {totalElements}
                        </strong>{" "}
                        sự kiện
                    </div>

                    <div className="text-sm text-slate-400">
                        Trang{" "}
                        {totalPages === 0
                            ? 0
                            : page + 1}
                        /{totalPages}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-300">
                        Đang tải sự kiện...
                    </div>
                ) : events.length ===
                    0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-300">
                        Không có sự kiện phù hợp.
                    </div>
                ) : (
                    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {events.map(
                            (event) => (
                                <EventCard
                                    key={
                                        event.id
                                    }
                                    event={
                                        event
                                    }
                                />
                            )
                        )}
                    </section>
                )}

                {totalPages > 1 && (
                    <div className="mt-10 flex flex-wrap justify-center gap-2">
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
                                    className={`h-11 min-w-11 rounded-xl font-black ${page ===
                                        pageNumber
                                        ? "bg-emerald-500 text-slate-950"
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

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-slate-400">
                    {icon}
                </span>

                <select
                    value={value}
                    onChange={onChange}
                    className="min-w-0 flex-1 bg-[#242831] outline-none"
                >
                    {children}
                </select>
            </div>
        </div>
    );
}

function EventCard({ event }) {
    const badge =
        getTicketBadge(event);

    const availableSeats =
        Number(
            event?.availableSeats ||
            0
        );

    const totalSeats =
        Number(
            event?.totalSeats ||
            0
        );

    return (
        <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#1b1f27]">
            <div className="relative h-56 overflow-hidden bg-slate-800">
                <EventImage
                    event={event}
                    alt={
                        event?.name ||
                        "Sự kiện"
                    }
                    className="h-full w-full object-cover"
                    fallbackClassName="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-500 to-cyan-500"
                    fallbackSize={64}
                />

                <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-black ${badge.className}`}
                >
                    {badge.text}
                </span>

                {event.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black">
                        NỔI BẬT
                    </span>
                )}
            </div>

            <div className="p-5">
                <div className="text-xs font-black uppercase tracking-wide text-emerald-300">
                    {event.categoryName ||
                        "SỰ KIỆN"}
                </div>

                <h2 className="mt-2 line-clamp-2 text-xl font-black">
                    {event.name}
                </h2>

                <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <CalendarDays
                            size={17}
                        />

                        {formatDate(
                            event.eventDate
                        )}{" "}

                        {formatTime(
                            event.eventDate
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin
                            size={17}
                        />

                        <span className="line-clamp-1">
                            {event.location ||
                                "Đang cập nhật"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Users
                            size={17}
                        />

                        {availableSeats}/
                        {totalSeats} ghế còn
                        lại
                    </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                    <div>
                        <div className="text-xs text-slate-400">
                            Giá vé từ
                        </div>

                        <div className="mt-1 text-lg font-black text-emerald-300">
                            {formatMoney(
                                event.minPrice
                            )}
                        </div>
                    </div>

                    <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-slate-950"
                    >
                        Chi tiết

                        <ArrowRight
                            size={17}
                        />
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default Events;