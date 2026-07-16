import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { Link } from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    ArrowRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    MapPin,
    QrCode,
    Search,
    ShieldCheck,
    Sparkles,
    Ticket,
    Users,
} from "lucide-react";

function normalizeList(data) {
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
}

function Home() {
    const [
        events,
        setEvents,
    ] = useState([]);

    const [
        categories,
        setCategories,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        bannerIndex,
        setBannerIndex,
    ] = useState(0);

    useEffect(() => {
        loadHomeData();

        // eslint-disable-next-line
    }, []);

    const getNumberValue = (
        value
    ) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const number =
            Number(value);

        return Number.isNaN(number)
            ? null
            : number;
    };

    const normalizeText = (
        value
    ) => {
        return String(value || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .trim()
            .toLowerCase();
    };

    const getDirectEventPrice = (
        event
    ) => {
        return (
            getNumberValue(
                event?.minPrice
            ) ??
            getNumberValue(
                event?.price
            ) ??
            getNumberValue(
                event?.ticketPrice
            ) ??
            getNumberValue(
                event?.basePrice
            ) ??
            getNumberValue(
                event?.priceFrom
            )
        );
    };

    const getSeatPrice = (
        seat
    ) => {
        return (
            getNumberValue(
                seat?.price
            ) ??
            getNumberValue(
                seat?.ticketPrice
            ) ??
            getNumberValue(
                seat?.seatPrice
            ) ??
            getNumberValue(
                seat?.amount
            )
        );
    };

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

                const data =
                    normalizeList(
                        response.data
                    );

                const activeCategories =
                    data.filter(
                        (category) => {
                            const status =
                                String(
                                    category.status ||
                                    "ACTIVE"
                                )
                                    .trim()
                                    .toUpperCase();

                            return (
                                status ===
                                "ACTIVE"
                            );
                        }
                    );

                const categoryMap =
                    new Map();

                activeCategories.forEach(
                    (category) => {
                        const key =
                            normalizeText(
                                category.slug ||
                                category.name ||
                                category.id
                            );

                        if (
                            !categoryMap.has(
                                key
                            )
                        ) {
                            categoryMap.set(
                                key,
                                category
                            );
                        }
                    }
                );

                return Array.from(
                    categoryMap.values()
                );
            } catch (
            requestError
            ) {
                console.error(
                    "Không tải được danh mục:",
                    requestError
                );

                return [];
            }
        };

    const loadSeatsForEvent =
        async (event) => {
            let minPrice =
                getDirectEventPrice(
                    event
                );

            let totalSeats =
                getNumberValue(
                    event?.totalSeats
                ) ?? 0;

            let availableSeats =
                getNumberValue(
                    event?.availableSeats
                ) ?? 0;

            try {
                const response =
                    await axiosClient.get(
                        `/seat-service/seats/event/${event.id}`
                    );

                const seats =
                    normalizeList(
                        response.data
                    );

                const availableSeatList =
                    seats.filter(
                        (seat) =>
                            String(
                                seat.status ||
                                ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "AVAILABLE"
                    );

                totalSeats =
                    seats.length;

                availableSeats =
                    availableSeatList.length;

                const seatsForPrice =
                    availableSeatList.length >
                        0
                        ? availableSeatList
                        : seats;

                const prices =
                    seatsForPrice
                        .map(
                            (seat) =>
                                getSeatPrice(
                                    seat
                                )
                        )
                        .filter(
                            (price) =>
                                price !==
                                null
                        );

                if (
                    minPrice === null &&
                    prices.length > 0
                ) {
                    minPrice =
                        Math.min(
                            ...prices
                        );
                }
            } catch (
            requestError
            ) {
                console.warn(
                    `Không tải được ghế của event ${event.id}:`,
                    requestError
                );
            }

            return {
                ...event,
                minPrice,
                totalSeats,
                availableSeats,
            };
        };

    const loadEvents =
        async () => {
            const response =
                await axiosClient.get(
                    "/event-service/events",
                    {
                        params: {
                            page: 0,
                            size: 100,

                            publicOnly:
                                true,

                            sortBy:
                                "eventDate",

                            sortDirection:
                                "asc",
                        },
                    }
                );

            const eventData =
                normalizeList(
                    response.data
                );

            const visibleEvents =
                eventData.filter(
                    (event) => {
                        const status =
                            String(
                                event?.status ||
                                "ACTIVE"
                            )
                                .trim()
                                .toUpperCase();

                        return ![
                            "DRAFT",
                            "INACTIVE",
                            "CANCELLED",
                        ].includes(
                            status
                        );
                    }
                );

            return Promise.all(
                visibleEvents.map(
                    loadSeatsForEvent
                )
            );
        };

    const loadHomeData =
        async () => {
            try {
                setLoading(true);
                setError("");

                const [
                    categoryData,
                    eventData,
                ] =
                    await Promise.all([
                        loadCategories(),
                        loadEvents(),
                    ]);

                setCategories(
                    categoryData
                );

                setEvents(
                    eventData
                );
            } catch (
            requestError
            ) {
                console.error(
                    "Không tải được Home:",
                    requestError
                );

                setCategories([]);
                setEvents([]);

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    requestError
                        ?.message ||
                    "Không tải được dữ liệu trang chủ."
                );
            } finally {
                setLoading(false);
            }
        };

    const getEventCategoryId =
        (event) => {
            return (
                event?.categoryId ??
                event?.eventCategoryId ??
                event?.category_id ??
                event?.category?.id ??
                event
                    ?.eventCategory
                    ?.id ??
                null
            );
        };

    const getEventCategoryName =
        (event) => {
            if (
                typeof event?.category ===
                "string"
            ) {
                return event.category;
            }

            const directName =
                event?.categoryName ??
                event
                    ?.eventCategoryName ??
                event?.category?.name ??
                event
                    ?.eventCategory
                    ?.name;

            if (directName) {
                return directName;
            }

            const eventCategoryId =
                getEventCategoryId(
                    event
                );

            const matchedCategory =
                categories.find(
                    (category) =>
                        Number(
                            category.id
                        ) ===
                        Number(
                            eventCategoryId
                        )
                );

            return (
                matchedCategory?.name ||
                ""
            );
        };

    const getEventCategorySlug =
        (event) => {
            const directSlug =
                event?.categorySlug ??
                event
                    ?.eventCategorySlug ??
                event?.category?.slug ??
                event
                    ?.eventCategory
                    ?.slug;

            if (directSlug) {
                return directSlug;
            }

            const eventCategoryId =
                getEventCategoryId(
                    event
                );

            const matchedCategory =
                categories.find(
                    (category) =>
                        Number(
                            category.id
                        ) ===
                        Number(
                            eventCategoryId
                        )
                );

            return (
                matchedCategory?.slug ||
                ""
            );
        };

    const isSameCategory = (
        event,
        category
    ) => {
        if (!category) {
            return false;
        }

        const eventCategoryId =
            getEventCategoryId(
                event
            );

        if (
            eventCategoryId !==
            null &&
            eventCategoryId !==
            undefined
        ) {
            return (
                Number(
                    eventCategoryId
                ) ===
                Number(
                    category.id
                )
            );
        }

        const eventCategoryName =
            normalizeText(
                getEventCategoryName(
                    event
                )
            );

        const eventCategorySlug =
            normalizeText(
                getEventCategorySlug(
                    event
                )
            );

        const categoryName =
            normalizeText(
                category.name
            );

        const categorySlug =
            normalizeText(
                category.slug
            );

        return (
            eventCategoryName ===
            categoryName ||
            eventCategoryName ===
            categorySlug ||
            eventCategorySlug ===
            categoryName ||
            eventCategorySlug ===
            categorySlug
        );
    };

    const filteredEvents =
        useMemo(() => {
            const value =
                normalizeText(
                    keyword
                );

            if (!value) {
                return events;
            }

            return events.filter(
                (event) => {
                    const searchableText =
                        normalizeText(
                            [
                                event.name,
                                event.location,
                                event.status,
                                event.description,
                                getEventCategoryName(
                                    event
                                ),
                                getEventCategorySlug(
                                    event
                                ),
                            ].join(" ")
                        );

                    return searchableText
                        .includes(
                            value
                        );
                }
            );
        }, [
            events,
            keyword,
            categories,
        ]);

    const bannerEvents =
        useMemo(() => {
            const featuredEvents =
                filteredEvents.filter(
                    (event) =>
                        event.featured ===
                        true
                );

            if (
                featuredEvents.length >
                0
            ) {
                return featuredEvents.slice(
                    0,
                    8
                );
            }

            return filteredEvents.slice(
                0,
                8
            );
        }, [filteredEvents]);

    const currentBanner =
        useMemo(() => {
            if (
                bannerEvents.length ===
                0
            ) {
                return null;
            }

            return bannerEvents[
                bannerIndex %
                bannerEvents.length
            ];
        }, [
            bannerEvents,
            bannerIndex,
        ]);

    useEffect(() => {
        setBannerIndex(0);
    }, [
        keyword,
        events.length,
    ]);

    useEffect(() => {
        if (
            bannerEvents.length <=
            1
        ) {
            return undefined;
        }

        const timer =
            window.setInterval(
                () => {
                    setBannerIndex(
                        (value) =>
                            (
                                value + 1
                            ) %
                            bannerEvents.length
                    );
                },
                4500
            );

        return () =>
            window.clearInterval(
                timer
            );
    }, [bannerEvents.length]);

    const nextBanner = () => {
        if (
            bannerEvents.length <=
            1
        ) {
            return;
        }

        setBannerIndex(
            (value) =>
                (
                    value + 1
                ) %
                bannerEvents.length
        );
    };

    const previousBanner =
        () => {
            if (
                bannerEvents.length <=
                1
            ) {
                return;
            }

            setBannerIndex(
                (value) => {
                    if (
                        value - 1 <
                        0
                    ) {
                        return (
                            bannerEvents.length -
                            1
                        );
                    }

                    return value - 1;
                }
            );
        };

    const hotEvents =
        useMemo(() => {
            const featuredEvents =
                filteredEvents.filter(
                    (event) =>
                        event.featured ===
                        true
                );

            if (
                featuredEvents.length >
                0
            ) {
                return featuredEvents.slice(
                    0,
                    8
                );
            }

            return filteredEvents.slice(
                0,
                8
            );
        }, [filteredEvents]);

    const upcomingEvents =
        useMemo(() => {
            const now =
                new Date();

            return filteredEvents
                .filter(
                    (event) => {
                        if (
                            !event.eventDate
                        ) {
                            return false;
                        }

                        const eventDate =
                            new Date(
                                event.eventDate
                            );

                        return (
                            !Number.isNaN(
                                eventDate.getTime()
                            ) &&
                            eventDate >=
                            now
                        );
                    }
                )
                .sort(
                    (
                        firstEvent,
                        secondEvent
                    ) =>
                        new Date(
                            firstEvent.eventDate
                        ).getTime() -
                        new Date(
                            secondEvent.eventDate
                        ).getTime()
                )
                .slice(0, 8);
        }, [filteredEvents]);

    const categoriesWithEvents =
        useMemo(() => {
            return categories
                .map(
                    (category) => ({
                        ...category,

                        events:
                            filteredEvents
                                .filter(
                                    (
                                        event
                                    ) =>
                                        isSameCategory(
                                            event,
                                            category
                                        )
                                )
                                .slice(
                                    0,
                                    8
                                ),
                    })
                )
                .filter(
                    (category) =>
                        category.events
                            .length >
                        0
                );
        }, [
            categories,
            filteredEvents,
        ]);

    const formatMoney = (
        value
    ) => {
        const number =
            getNumberValue(value);

        if (number === null) {
            return "Đang cập nhật";
        }

        if (number === 0) {
            return "Miễn phí";
        }

        return `${number.toLocaleString(
            "vi-VN"
        )} đ`;
    };

    const formatDate = (
        value
    ) => {
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
            return String(
                value
            ).replace(
                "T",
                " "
            );
        }

        return date.toLocaleDateString(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        );
    };

    const formatTime = (
        value
    ) => {
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
    };

    const getEventImage = (
        event
    ) => {
        const image =
            event?.imageUrl ||
            event?.banner ||
            event?.bannerUrl ||
            event?.thumbnail ||
            event?.image;

        if (!image) {
            return "";
        }

        const normalizedImage =
            String(image).trim();

        /*
         * Ảnh đã có URL hoàn chỉnh từ
         * website bên ngoài.
         */
        if (
            normalizedImage.startsWith(
                "https://"
            )
        ) {
            return normalizedImage;
        }

        /*
         * URL ảnh đã đúng prefix proxy.
         */
        if (
            normalizedImage.startsWith(
                "/api/event-service/"
            )
        ) {
            return normalizedImage;
        }

        /*
         * Tránh tạo:
         * /api/event-service/api/event-service/...
         */
        if (
            normalizedImage.startsWith(
                "api/event-service/"
            )
        ) {
            return `/${normalizedImage}`;
        }

        /*
         * Backend trả localhost Event Service.
         */
        if (
            normalizedImage.startsWith(
                "http://localhost:8084"
            )
        ) {
            return normalizedImage.replace(
                "http://localhost:8084",
                "/api/event-service"
            );
        }

        /*
         * Backend trả tên container Docker.
         */
        if (
            normalizedImage.startsWith(
                "http://event-service:8084"
            )
        ) {
            return normalizedImage.replace(
                "http://event-service:8084",
                "/api/event-service"
            );
        }

        /*
         * Backend trả:
         * /uploads/events/file.jpg
         */
        if (
            normalizedImage.startsWith(
                "/uploads/"
            )
        ) {
            return `/api/event-service${normalizedImage}`;
        }

        /*
         * Backend trả:
         * uploads/events/file.jpg
         */
        if (
            normalizedImage.startsWith(
                "uploads/"
            )
        ) {
            return `/api/event-service/${normalizedImage}`;
        }

        /*
         * Backend trả:
         * events/file.jpg
         */
        if (
            normalizedImage.startsWith(
                "events/"
            )
        ) {
            return `/api/event-service/uploads/${normalizedImage}`;
        }

        /*
         * Các URL http khác giữ nguyên.
         */
        if (
            normalizedImage.startsWith(
                "http://"
            )
        ) {
            return normalizedImage;
        }

        return normalizedImage;
    };

    const getTicketBadge = (
        event
    ) => {
        const available =
            Number(
                event.availableSeats ||
                0
            );

        const total =
            Number(
                event.totalSeats ||
                0
            );

        const ticketStatus =
            String(
                event.ticketStatus ||
                ""
            )
                .trim()
                .toUpperCase();

        const status =
            String(
                event.status ||
                "ACTIVE"
            )
                .trim()
                .toUpperCase();

        if (
            ticketStatus ===
            "SOLD_OUT" ||
            status ===
            "SOLD_OUT" ||
            (
                total > 0 &&
                available === 0
            )
        ) {
            return {
                text: "HẾT VÉ",

                className:
                    "bg-red-500 text-white",
            };
        }

        if (
            ticketStatus ===
            "LOW" ||
            (
                available > 0 &&
                available <= 5
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
            status ===
            "UPCOMING"
        ) {
            return {
                text: "SẮP MỞ",

                className:
                    "bg-blue-400 text-slate-950",
            };
        }

        if (
            ticketStatus ===
            "ENDED" ||
            [
                "CLOSED",
                "COMPLETED",
            ].includes(status)
        ) {
            return {
                text:
                    "ĐÃ KẾT THÚC",

                className:
                    "bg-slate-300 text-slate-800",
            };
        }

        if (
            ticketStatus ===
            "NO_TICKETS" ||
            total === 0
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
    };

    const EventCard = ({
        event,
    }) => {
        const image =
            getEventImage(event);

        const badge =
            getTicketBadge(event);

        return (
            <Link
                to={`/events/${event.id}`}
                className="group block overflow-hidden rounded-[22px] border border-white/10 bg-[#1f232b] transition hover:-translate-y-1 hover:border-emerald-400/70"
            >
                <div className="relative h-52 overflow-hidden bg-linear-to-br from-emerald-500 to-cyan-500">
                    {image ? (
                        <img
                            src={image}
                            alt={
                                event.name
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            onError={(
                                imageEvent
                            ) => {
                                console.error(
                                    "Không tải được ảnh:",
                                    image
                                );

                                imageEvent
                                    .currentTarget
                                    .style
                                    .display =
                                    "none";
                            }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <Ticket
                                size={54}
                            />
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/80 to-transparent" />

                    <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-black">
                        {getEventCategoryName(
                            event
                        ) || "EVENT"}
                    </div>

                    <div
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${badge.className}`}
                    >
                        {badge.text}
                    </div>
                </div>

                <div className="p-4">
                    <h3 className="line-clamp-2 min-h-12 font-black group-hover:text-emerald-300">
                        {event.name ||
                            `Event #${event.id}`}
                    </h3>

                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <CalendarDays
                                size={15}
                                className="shrink-0 text-emerald-400"
                            />

                            <span className="line-clamp-1">
                                {formatTime(
                                    event.eventDate
                                )}{" "}
                                {formatDate(
                                    event.eventDate
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <MapPin
                                size={15}
                                className="shrink-0 text-emerald-400"
                            />

                            <span className="line-clamp-1">
                                {event.location ||
                                    "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Users
                                size={15}
                                className="shrink-0 text-emerald-400"
                            />

                            <span>
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
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                        <div>
                            <div className="text-xs text-slate-500">
                                Giá từ
                            </div>

                            <div className="text-lg font-black text-emerald-400">
                                {formatMoney(
                                    event.minPrice
                                )}
                            </div>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 group-hover:bg-emerald-500">
                            <ArrowRight
                                size={18}
                            />
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    const EventSection = ({
        badge,
        title,
        description,
        eventList,
    }) => {
        return (
            <section className="mx-auto max-w-7xl px-4 py-9 lg:px-6">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                            <Sparkles
                                size={14}
                            />

                            {badge}
                        </div>

                        <h2 className="text-2xl font-black md:text-3xl">
                            {title}
                        </h2>

                        <p className="mt-2 text-slate-400">
                            {description}
                        </p>
                    </div>

                    <Link
                        to="/events"
                        className="hidden items-center gap-2 font-black text-emerald-400 sm:inline-flex"
                    >
                        Xem tất cả

                        <ArrowRight
                            size={18}
                        />
                    </Link>
                </div>

                {loading ? (
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                        Đang tải sự kiện...
                    </div>
                ) : eventList.length ===
                    0 ? (
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                        Chưa có sự kiện để hiển thị.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {eventList.map(
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
                    </div>
                )}
            </section>
        );
    };

    const bannerImage =
        currentBanner
            ? getEventImage(
                currentBanner
            )
            : "";

    return (
        <div className="min-h-screen bg-[#111317] text-white">
            <section className="sticky top-0 z-30 border-b border-white/10 bg-[#111317]/95 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 lg:px-6">
                    <div className="flex items-center gap-3 overflow-x-auto py-4">
                        <Link
                            to="/events"
                            className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950"
                        >
                            Tất cả
                        </Link>

                        {categories.map(
                            (category) => (
                                <Link
                                    key={
                                        category.id
                                    }
                                    to={`/events?categoryId=${category.id}`}
                                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/15"
                                >
                                    {
                                        category.name
                                    }
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden bg-[#08090b]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#10b98133,transparent_35%),radial-gradient(circle_at_bottom_right,#06b6d433,transparent_35%)]" />

                <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
                    {error && (
                        <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-8">
                            {loading ? (
                                <div className="flex min-h-107.5 items-center justify-center rounded-[34px] border border-white/10 bg-white/10">
                                    Đang tải sự kiện nổi bật...
                                </div>
                            ) : !currentBanner ? (
                                <div className="flex min-h-107.5 items-center justify-center rounded-[34px] border border-white/10 bg-white/10">
                                    Chưa có sự kiện để hiển thị.
                                </div>
                            ) : (
                                <div className="group relative min-h-107.5 overflow-hidden rounded-[34px] bg-linear-to-br from-emerald-500 to-cyan-500">
                                    {bannerImage ? (
                                        <img
                                            src={
                                                bannerImage
                                            }
                                            alt={
                                                currentBanner.name
                                            }
                                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                            onError={(
                                                imageEvent
                                            ) => {
                                                console.error(
                                                    "Không tải được banner:",
                                                    bannerImage
                                                );

                                                imageEvent
                                                    .currentTarget
                                                    .style
                                                    .display =
                                                    "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Ticket
                                                size={96}
                                            />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/35 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black/85 to-transparent" />

                                    <Link
                                        to={`/events/${currentBanner.id}`}
                                        className="absolute inset-0"
                                    >
                                        <div className="absolute bottom-7 left-6 right-6 max-w-3xl md:bottom-9 md:left-9 md:right-9">
                                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                                                <Sparkles
                                                    size={16}
                                                />

                                                Sự kiện nổi bật
                                            </div>

                                            <h1 className="line-clamp-2 text-3xl font-black leading-tight md:text-5xl">
                                                {
                                                    currentBanner.name
                                                }
                                            </h1>

                                            <div className="mt-4 flex flex-wrap gap-4 text-slate-200">
                                                <span className="inline-flex items-center gap-2">
                                                    <CalendarDays
                                                        size={18}
                                                    />

                                                    {formatTime(
                                                        currentBanner.eventDate
                                                    )}{" "}
                                                    {formatDate(
                                                        currentBanner.eventDate
                                                    )}
                                                </span>

                                                <span className="inline-flex items-center gap-2">
                                                    <MapPin
                                                        size={18}
                                                    />

                                                    {currentBanner.location ||
                                                        "Đang cập nhật"}
                                                </span>
                                            </div>

                                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                                <div className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                                                    Vé từ{" "}
                                                    {formatMoney(
                                                        currentBanner.minPrice
                                                    )}
                                                </div>

                                                <div className="inline-flex items-center gap-2 font-black text-emerald-300">
                                                    Xem chi tiết

                                                    <ArrowRight
                                                        size={19}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                    {bannerEvents.length >
                                        1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousBanner
                                                    }
                                                    className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 md:flex"
                                                >
                                                    <ChevronLeft
                                                        size={24}
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextBanner
                                                    }
                                                    className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 md:flex"
                                                >
                                                    <ChevronRight
                                                        size={24}
                                                    />
                                                </button>
                                            </>
                                        )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-5 lg:col-span-4">
                            <div className="rounded-[28px] border border-white/10 bg-[#1b1f27] p-5">
                                <div className="mb-3 text-sm font-black text-emerald-300">
                                    TÌM SỰ KIỆN
                                </div>

                                <div className="flex items-center gap-2 rounded-2xl bg-white p-2">
                                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                                        <Search
                                            size={20}
                                            className="text-slate-400"
                                        />

                                        <input
                                            value={
                                                keyword
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setKeyword(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Bạn tìm gì hôm nay?"
                                            className="h-12 min-w-0 flex-1 text-slate-900 outline-none"
                                        />
                                    </div>

                                    <Link
                                        to={
                                            keyword.trim()
                                                ? `/events?keyword=${encodeURIComponent(
                                                    keyword.trim()
                                                )}`
                                                : "/events"
                                        }
                                        className="flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-4 text-slate-950"
                                    >
                                        <Search
                                            size={18}
                                        />
                                    </Link>
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-white/10 bg-[#1b1f27] p-5">
                                <h2 className="mb-4 text-xl font-black">
                                    Khám phá nhanh
                                </h2>

                                <div className="grid grid-cols-2 gap-3">
                                    <QuickLink
                                        to="/events"
                                        icon={Ticket}
                                        label="Mua vé"
                                    />

                                    <QuickLink
                                        to="/my-bookings"
                                        icon={Clock}
                                        label="Booking"
                                    />

                                    <QuickLink
                                        to="/my-tickets"
                                        icon={QrCode}
                                        label="Vé QR"
                                    />

                                    <QuickLink
                                        to="/profile"
                                        icon={Users}
                                        label="Tài khoản"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {bannerEvents.length >
                        1 && (
                            <div className="mt-6 flex justify-center gap-2">
                                {bannerEvents.map(
                                    (
                                        event,
                                        index
                                    ) => (
                                        <button
                                            key={
                                                event.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setBannerIndex(
                                                    index
                                                )
                                            }
                                            className={`h-2.5 rounded-full transition ${index ===
                                                bannerIndex
                                                ? "w-10 bg-emerald-400"
                                                : "w-2.5 bg-white/40"
                                                }`}
                                        />
                                    )
                                )}
                            </div>
                        )}
                </div>
            </section>

            <EventSection
                badge="ĐANG MỞ BÁN"
                title="Sự kiện nổi bật"
                description="Chọn vé nhanh, thanh toán VNPay và nhận QR check-in."
                eventList={hotEvents}
            />

            <EventSection
                badge="LỊCH SỰ KIỆN"
                title="Sự kiện sắp diễn ra"
                description="Các sự kiện gần ngày tổ chức nhất."
                eventList={
                    upcomingEvents
                }
            />

            {loading ? (
                <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center">
                        Đang tải danh mục...
                    </div>
                </section>
            ) : (
                categoriesWithEvents.map(
                    (category) => (
                        <section
                            key={
                                category.id
                            }
                            className="mx-auto max-w-7xl px-4 py-9 lg:px-6"
                        >
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                                        <Sparkles
                                            size={14}
                                        />

                                        DANH MỤC
                                    </div>

                                    <h2 className="text-2xl font-black md:text-3xl">
                                        {
                                            category.name
                                        }
                                    </h2>

                                    <p className="mt-2 text-slate-400">
                                        {category.description ||
                                            "Các sự kiện đang mở bán vé"}
                                    </p>
                                </div>

                                <Link
                                    to={`/events?categoryId=${category.id}`}
                                    className="hidden items-center gap-2 font-black text-emerald-400 sm:inline-flex"
                                >
                                    Xem thêm

                                    <ArrowRight
                                        size={18}
                                    />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {category.events.map(
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
                            </div>
                        </section>
                    )
                )
            )}

            <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
                <div className="rounded-[34px] border border-white/10 bg-linear-to-br from-[#1b1f27] to-[#101216] p-6 md:p-9">
                    <div className="mb-7">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                            <ShieldCheck
                                size={14}
                            />

                            EVENT PLATFORM
                        </div>

                        <h2 className="text-2xl font-black md:text-3xl">
                            Vì sao chọn chúng tôi?
                        </h2>

                        <p className="mt-2 text-slate-400">
                            Hỗ trợ đặt vé, chọn ghế,
                            thanh toán và phát hành vé QR.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <FeatureCard
                            icon={Ticket}
                            title="Chọn vé nhanh"
                            description="Xem sự kiện và chọn ghế còn trống."
                        />

                        <FeatureCard
                            icon={
                                CreditCard
                            }
                            title="Thanh toán VNPay"
                            description="Thanh toán trực tuyến rõ ràng."
                        />

                        <FeatureCard
                            icon={QrCode}
                            title="Nhận vé QR"
                            description="Nhận mã QR sau khi thanh toán."
                        />

                        <FeatureCard
                            icon={
                                ShieldCheck
                            }
                            title="An toàn"
                            description="Giảm rủi ro bán trùng ghế."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function QuickLink({
    to,
    icon: Icon,
    label,
}) {
    return (
        <Link
            to={to}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-500/40 hover:bg-white/10"
        >
            <Icon
                className="text-emerald-400"
                size={24}
            />

            <div className="mt-3 font-black">
                {label}
            </div>
        </Link>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <Icon size={25} />
            </div>

            <h3 className="mt-5 font-black">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
            </p>
        </div>
    );
}

export default Home;