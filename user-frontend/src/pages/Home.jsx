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
    const [events, setEvents] =
        useState([]);

    const [categories, setCategories] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [keyword, setKeyword] =
        useState("");

    const [bannerIndex, setBannerIndex] =
        useState(0);

    useEffect(() => {
        loadHomeData();
    }, []);

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

    const normalizeText = (value) => {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
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
            getNumberValue(event?.price) ??
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

    const getSeatPrice = (seat) => {
        return (
            getNumberValue(seat?.price) ??
            getNumberValue(
                seat?.ticketPrice
            ) ??
            getNumberValue(
                seat?.seatPrice
            ) ??
            getNumberValue(seat?.amount)
        );
    };

    const loadCategories = async () => {
        try {
            const response =
                await axiosClient.get(
                    "/event-service/event-categories"
                );

            const data = normalizeList(
                response.data
            );

            const activeCategories =
                data.filter((category) => {
                    const status = String(
                        category.status ||
                        "ACTIVE"
                    ).toUpperCase();

                    return (
                        status === "ACTIVE"
                    );
                });

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
                        !categoryMap.has(key)
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
        } catch (error) {
            console.error(
                "Không tải được danh mục:",
                error
            );

            return [];
        }
    };

    const loadSeatsForEvent = async (
        event
    ) => {
        let minPrice =
            getDirectEventPrice(event);

        let totalSeats = 0;
        let availableSeats = 0;

        try {
            const response =
                await axiosClient.get(
                    `/seat-service/seats/event/${event.id}`
                );

            const seats = normalizeList(
                response.data
            );

            const availableSeatList =
                seats.filter((seat) => {
                    return (
                        String(
                            seat.status || ""
                        ).toUpperCase() ===
                        "AVAILABLE"
                    );
                });

            totalSeats = seats.length;
            availableSeats =
                availableSeatList.length;

            const seatsForPrice =
                availableSeatList.length > 0
                    ? availableSeatList
                    : seats;

            const prices = seatsForPrice
                .map((seat) =>
                    getSeatPrice(seat)
                )
                .filter(
                    (price) => price !== null
                );

            if (
                minPrice === null &&
                prices.length > 0
            ) {
                minPrice = Math.min(
                    ...prices
                );
            }
        } catch (error) {
            console.warn(
                `Không tải được ghế của event ${event.id}:`,
                error
            );
        }

        return {
            ...event,
            minPrice,
            totalSeats,
            availableSeats,
        };
    };

    const loadEvents = async () => {
        const response =
            await axiosClient.get(
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
            );

        const eventData =
            normalizeList(response.data);

        const visibleEvents =
            eventData.filter((event) => {
                const status = String(
                    event?.status ||
                    "ACTIVE"
                ).toUpperCase();

                return ![
                    "DRAFT",
                    "INACTIVE",
                    "CANCELLED",
                ].includes(status);
            });

        return Promise.all(
            visibleEvents.map(
                loadSeatsForEvent
            )
        );
    };

    const loadHomeData = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                categoryData,
                eventData,
            ] = await Promise.all([
                loadCategories(),
                loadEvents(),
            ]);

            setCategories(categoryData);
            setEvents(eventData);
        } catch (error) {
            console.error(
                "Không tải được Home:",
                error
            );

            setCategories([]);
            setEvents([]);

            setError(
                error.response?.data
                    ?.message ||
                error.message ||
                "Không tải được dữ liệu trang chủ."
            );
        } finally {
            setLoading(false);
        }
    };

    const getEventCategoryId = (
        event
    ) => {
        return (
            event?.categoryId ??
            event?.eventCategoryId ??
            event?.category_id ??
            event?.category?.id ??
            event?.eventCategory?.id ??
            null
        );
    };

    const getEventCategoryName = (
        event
    ) => {
        if (
            typeof event?.category ===
            "string"
        ) {
            return event.category;
        }

        const directName =
            event?.categoryName ??
            event?.eventCategoryName ??
            event?.category?.name ??
            event?.eventCategory?.name;

        if (directName) {
            return directName;
        }

        const eventCategoryId =
            getEventCategoryId(event);

        const matchedCategory =
            categories.find(
                (category) =>
                    Number(category.id) ===
                    Number(eventCategoryId)
            );

        return matchedCategory?.name || "";
    };

    const getEventCategorySlug = (
        event
    ) => {
        const directSlug =
            event?.categorySlug ??
            event?.eventCategorySlug ??
            event?.category?.slug ??
            event?.eventCategory?.slug;

        if (directSlug) {
            return directSlug;
        }

        const eventCategoryId =
            getEventCategoryId(event);

        const matchedCategory =
            categories.find(
                (category) =>
                    Number(category.id) ===
                    Number(eventCategoryId)
            );

        return matchedCategory?.slug || "";
    };

    const isSameCategory = (
        event,
        category
    ) => {
        if (!category) {
            return false;
        }

        const eventCategoryId =
            getEventCategoryId(event);

        if (
            eventCategoryId !== null &&
            eventCategoryId !== undefined
        ) {
            return (
                Number(eventCategoryId) ===
                Number(category.id)
            );
        }

        const eventCategoryName =
            normalizeText(
                getEventCategoryName(event)
            );

        const eventCategorySlug =
            normalizeText(
                getEventCategorySlug(event)
            );

        const categoryName =
            normalizeText(category.name);

        const categorySlug =
            normalizeText(category.slug);

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

    const filteredEvents = useMemo(
        () => {
            const value =
                normalizeText(keyword);

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

                    return searchableText.includes(
                        value
                    );
                }
            );
        },
        [events, keyword, categories]
    );

    const bannerEvents = useMemo(
        () => {
            const featuredEvents =
                filteredEvents.filter(
                    (event) =>
                        event.featured === true
                );

            if (
                featuredEvents.length > 0
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
        },
        [filteredEvents]
    );

    const currentBanner = useMemo(
        () => {
            if (
                bannerEvents.length === 0
            ) {
                return null;
            }

            return bannerEvents[
                bannerIndex %
                bannerEvents.length
            ];
        },
        [bannerEvents, bannerIndex]
    );

    useEffect(() => {
        setBannerIndex(0);
    }, [keyword, events.length]);

    useEffect(() => {
        if (
            bannerEvents.length <= 1
        ) {
            return undefined;
        }

        const timer = setInterval(
            () => {
                setBannerIndex(
                    (value) =>
                        (value + 1) %
                        bannerEvents.length
                );
            },
            4500
        );

        return () => clearInterval(timer);
    }, [bannerEvents.length]);

    const nextBanner = () => {
        if (
            bannerEvents.length <= 1
        ) {
            return;
        }

        setBannerIndex(
            (value) =>
                (value + 1) %
                bannerEvents.length
        );
    };

    const previousBanner = () => {
        if (
            bannerEvents.length <= 1
        ) {
            return;
        }

        setBannerIndex((value) => {
            if (value - 1 < 0) {
                return (
                    bannerEvents.length - 1
                );
            }

            return value - 1;
        });
    };

    const hotEvents = useMemo(
        () => {
            const featuredEvents =
                filteredEvents.filter(
                    (event) =>
                        event.featured === true
                );

            if (
                featuredEvents.length > 0
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
        },
        [filteredEvents]
    );

    const upcomingEvents = useMemo(
        () => {
            const now = new Date();

            return filteredEvents
                .filter((event) => {
                    if (!event.eventDate) {
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
                        eventDate >= now
                    );
                })
                .sort(
                    (a, b) =>
                        new Date(
                            a.eventDate
                        ) -
                        new Date(
                            b.eventDate
                        )
                )
                .slice(0, 8);
        },
        [filteredEvents]
    );

    const categoriesWithEvents =
        useMemo(() => {
            return categories
                .map((category) => ({
                    ...category,
                    events:
                        filteredEvents
                            .filter(
                                (event) =>
                                    isSameCategory(
                                        event,
                                        category
                                    )
                            )
                            .slice(0, 8),
                }))
                .filter(
                    (category) =>
                        category.events
                            .length > 0
                );
        }, [
            categories,
            filteredEvents,
        ]);

    const formatMoney = (value) => {
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

    const formatDate = (value) => {
        if (!value) {
            return "Đang cập nhật";
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

        return date.toLocaleDateString(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        );
    };

    const formatTime = (value) => {
        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (
            Number.isNaN(date.getTime())
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

    const getEventImage = (event) => {
        const image =
            event?.imageUrl ||
            event?.banner ||
            event?.bannerUrl ||
            event?.thumbnail ||
            event?.image;

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
            image.startsWith("/uploads/")
        ) {
            return `/api/event-service${image}`;
        }

        return image;
    };

    const getTicketBadge = (event) => {
        const available = Number(
            event.availableSeats || 0
        );

        const total = Number(
            event.totalSeats || 0
        );

        const status = String(
            event.status || "ACTIVE"
        ).toUpperCase();

        if (
            status === "SOLD_OUT" ||
            (total > 0 &&
                available === 0)
        ) {
            return {
                text: "HẾT VÉ",
                className:
                    "bg-red-500 text-white",
            };
        }

        if (
            available > 0 &&
            available <= 5
        ) {
            return {
                text: "CÒN ÍT VÉ",
                className:
                    "bg-amber-400 text-slate-950",
            };
        }

        if (
            status === "UPCOMING"
        ) {
            return {
                text: "SẮP MỞ",
                className:
                    "bg-blue-400 text-slate-950",
            };
        }

        return {
            text: "ĐANG BÁN",
            className:
                "bg-emerald-400 text-slate-950",
        };
    };

    const EventCard = ({ event }) => {
        const image =
            getEventImage(event);

        const badge =
            getTicketBadge(event);

        return (
            <Link
                to={`/events/${event.id}`}
                className="group block overflow-hidden rounded-[22px] bg-[#1f232b] border border-white/10 hover:border-emerald-400/70 hover:-translate-y-1 transition"
            >
                <div className="relative h-52 bg-linear-to-br from-emerald-500 to-cyan-500 overflow-hidden">
                    {image ? (
                        <img
                            src={image}
                            alt={event.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <Ticket
                                size={54}
                            />
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/80 to-transparent" />

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/65 text-xs font-black">
                        {getEventCategoryName(
                            event
                        ) || "EVENT"}
                    </div>

                    <div
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black ${badge.className}`}
                    >
                        {badge.text}
                    </div>
                </div>

                <div className="p-4">
                    <h3 className="font-black line-clamp-2 min-h-12 group-hover:text-emerald-300">
                        {event.name ||
                            `Event #${event.id}`}
                    </h3>

                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <CalendarDays
                                size={15}
                                className="text-emerald-400"
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
                                className="text-emerald-400"
                            />

                            <span className="line-clamp-1">
                                {event.location ||
                                    "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Users
                                size={15}
                                className="text-emerald-400"
                            />

                            <span>
                                Còn{" "}
                                {
                                    event.availableSeats
                                }{" "}
                                /{" "}
                                {
                                    event.totalSeats
                                }{" "}
                                vé
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-xs text-slate-500">
                                Giá từ
                            </div>

                            <div className="font-black text-lg text-emerald-400">
                                {formatMoney(
                                    event.minPrice
                                )}
                            </div>
                        </div>

                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500">
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
            <section className="max-w-7xl mx-auto px-4 lg:px-6 py-9">
                <div className="flex items-end justify-between gap-4 mb-5">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-black mb-3">
                            <Sparkles
                                size={14}
                            />
                            {badge}
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black">
                            {title}
                        </h2>

                        <p className="text-slate-400 mt-2">
                            {description}
                        </p>
                    </div>

                    <Link
                        to="/events"
                        className="hidden sm:inline-flex items-center gap-2 text-emerald-400 font-black"
                    >
                        Xem tất cả
                        <ArrowRight
                            size={18}
                        />
                    </Link>
                </div>

                {loading ? (
                    <div className="rounded-[28px] bg-white/8 border border-white/10 p-10 text-center text-slate-300">
                        Đang tải sự kiện...
                    </div>
                ) : eventList.length ===
                    0 ? (
                    <div className="rounded-[28px] bg-white/8 border border-white/10 p-10 text-center text-slate-300">
                        Chưa có sự kiện để
                        hiển thị.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
            <section className="sticky top-0 z-30 bg-[#111317]/95 backdrop-blur border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <div className="flex items-center gap-3 overflow-x-auto py-4">
                        <Link
                            to="/events"
                            className="shrink-0 px-4 py-2 rounded-full bg-emerald-500 text-sm font-black"
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
                                    className="shrink-0 px-4 py-2 rounded-full bg-white/8 border border-white/10 text-sm font-bold hover:bg-white/15"
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

                <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-10">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-300 rounded-3xl p-5">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8">
                            {loading ? (
                                <div className="h-107.5 rounded-4xl bg-white/10 border border-white/10 flex items-center justify-center">
                                    Đang tải sự kiện
                                    nổi bật...
                                </div>
                            ) : !currentBanner ? (
                                <div className="h-107.5 rounded-4xl bg-white/10 border border-white/10 flex items-center justify-center">
                                    Chưa có sự kiện
                                    để hiển thị.
                                </div>
                            ) : (
                                <div className="group relative h-107.5 rounded-4xl overflow-hidden bg-linear-to-br from-emerald-500 to-cyan-500">
                                    {bannerImage ? (
                                        <img
                                            src={
                                                bannerImage
                                            }
                                            alt={
                                                currentBanner.name
                                            }
                                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-700"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Ticket
                                                size={
                                                    96
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/35 to-transparent" />

                                    <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black/85 to-transparent" />

                                    <Link
                                        to={`/events/${currentBanner.id}`}
                                        className="absolute inset-0"
                                    >
                                        <div className="absolute left-6 right-6 bottom-7 md:left-9 md:right-9 md:bottom-9 max-w-3xl">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400 text-slate-950 text-sm font-black mb-4">
                                                <Sparkles
                                                    size={
                                                        16
                                                    }
                                                />
                                                Sự kiện
                                                nổi bật
                                            </div>

                                            <h1 className="text-3xl md:text-5xl font-black leading-tight line-clamp-2">
                                                {
                                                    currentBanner.name
                                                }
                                            </h1>

                                            <div className="flex flex-wrap gap-4 text-slate-200 mt-4">
                                                <span className="inline-flex items-center gap-2">
                                                    <CalendarDays
                                                        size={
                                                            18
                                                        }
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
                                                        size={
                                                            18
                                                        }
                                                    />

                                                    {currentBanner.location ||
                                                        "Đang cập nhật"}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-6">
                                                <div className="px-5 py-3 rounded-2xl bg-white text-slate-950 font-black">
                                                    Vé
                                                    từ{" "}
                                                    {formatMoney(
                                                        currentBanner.minPrice
                                                    )}
                                                </div>

                                                <div className="inline-flex items-center gap-2 text-emerald-300 font-black">
                                                    Xem
                                                    chi
                                                    tiết
                                                    <ArrowRight
                                                        size={
                                                            19
                                                        }
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
                                                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/50 items-center justify-center z-10"
                                                >
                                                    <ChevronLeft
                                                        size={
                                                            24
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextBanner
                                                    }
                                                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/50 items-center justify-center z-10"
                                                >
                                                    <ChevronRight
                                                        size={
                                                            24
                                                        }
                                                    />
                                                </button>
                                            </>
                                        )}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-4 space-y-5">
                            <div className="rounded-[28px] bg-[#1b1f27] border border-white/10 p-5">
                                <div className="text-sm text-emerald-300 font-black mb-3">
                                    TÌM SỰ KIỆN
                                </div>

                                <div className="bg-white rounded-2xl p-2 flex items-center gap-2">
                                    <div className="flex items-center gap-3 px-3 flex-1">
                                        <Search
                                            size={
                                                20
                                            }
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
                                            className="outline-none text-slate-900 flex-1 h-12 min-w-0"
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
                                        className="h-12 px-4 rounded-xl bg-emerald-500 flex items-center justify-center"
                                    >
                                        <Search
                                            size={
                                                18
                                            }
                                        />
                                    </Link>
                                </div>
                            </div>

                            <div className="rounded-[28px] bg-[#1b1f27] border border-white/10 p-5">
                                <h2 className="text-xl font-black mb-4">
                                    Khám phá nhanh
                                </h2>

                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        to="/events"
                                        className="rounded-2xl bg-white/8 border border-white/10 p-4"
                                    >
                                        <Ticket
                                            className="text-emerald-400"
                                            size={
                                                24
                                            }
                                        />

                                        <div className="font-black mt-3">
                                            Mua vé
                                        </div>
                                    </Link>

                                    <Link
                                        to="/my-bookings"
                                        className="rounded-2xl bg-white/8 border border-white/10 p-4"
                                    >
                                        <Clock
                                            className="text-emerald-400"
                                            size={
                                                24
                                            }
                                        />

                                        <div className="font-black mt-3">
                                            Booking
                                        </div>
                                    </Link>

                                    <Link
                                        to="/my-tickets"
                                        className="rounded-2xl bg-white/8 border border-white/10 p-4"
                                    >
                                        <QrCode
                                            className="text-emerald-400"
                                            size={
                                                24
                                            }
                                        />

                                        <div className="font-black mt-3">
                                            Vé QR
                                        </div>
                                    </Link>

                                    <Link
                                        to="/profile"
                                        className="rounded-2xl bg-white/8 border border-white/10 p-4"
                                    >
                                        <Users
                                            className="text-emerald-400"
                                            size={
                                                24
                                            }
                                        />

                                        <div className="font-black mt-3">
                                            Tài
                                            khoản
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {bannerEvents.length > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
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
                eventList={upcomingEvents}
            />

            {loading ? (
                <section className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
                    <div className="bg-white/8 border border-white/10 rounded-[28px] p-10 text-center">
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
                            className="max-w-7xl mx-auto px-4 lg:px-6 py-9"
                        >
                            <div className="flex items-end justify-between gap-4 mb-5">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-black mb-3">
                                        <Sparkles
                                            size={
                                                14
                                            }
                                        />
                                        DANH MỤC
                                    </div>

                                    <h2 className="text-2xl md:text-3xl font-black">
                                        {
                                            category.name
                                        }
                                    </h2>

                                    <p className="text-slate-400 mt-2">
                                        {category.description ||
                                            "Các sự kiện đang mở bán vé"}
                                    </p>
                                </div>

                                <Link
                                    to={`/events?categoryId=${category.id}`}
                                    className="hidden sm:inline-flex items-center gap-2 text-emerald-400 font-black"
                                >
                                    Xem thêm
                                    <ArrowRight
                                        size={
                                            18
                                        }
                                    />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

            <section className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
                <div className="rounded-4xl bg-linear-to-br from-[#1b1f27] to-[#101216] border border-white/10 p-6 md:p-9">
                    <div className="mb-7">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-black mb-3">
                            <ShieldCheck
                                size={14}
                            />
                            EVENT PLATFORM
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black">
                            Vì sao chọn chúng
                            tôi?
                        </h2>

                        <p className="text-slate-400 mt-2">
                            Hỗ trợ đặt vé, chọn
                            ghế, thanh toán và
                            phát hành vé QR.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                icon: Ticket,
                                title:
                                    "Chọn vé nhanh",
                                text:
                                    "Xem sự kiện và chọn ghế còn trống.",
                            },
                            {
                                icon: CreditCard,
                                title:
                                    "Thanh toán VNPay",
                                text:
                                    "Thanh toán trực tuyến rõ ràng.",
                            },
                            {
                                icon: QrCode,
                                title:
                                    "Nhận vé QR",
                                text:
                                    "Nhận mã QR sau khi thanh toán.",
                            },
                            {
                                icon: ShieldCheck,
                                title:
                                    "An toàn",
                                text:
                                    "Giảm rủi ro bán trùng ghế.",
                            },
                        ].map((item) => {
                            const Icon =
                                item.icon;

                            return (
                                <div
                                    key={
                                        item.title
                                    }
                                    className="rounded-3xl bg-white/6 border border-white/10 p-5"
                                >
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center">
                                        <Icon
                                            size={
                                                25
                                            }
                                        />
                                    </div>

                                    <h3 className="font-black mt-5">
                                        {
                                            item.title
                                        }
                                    </h3>

                                    <p className="text-sm text-slate-400 mt-2 leading-6">
                                        {
                                            item.text
                                        }
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;