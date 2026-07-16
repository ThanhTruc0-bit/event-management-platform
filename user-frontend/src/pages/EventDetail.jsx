import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import axiosClient from "../api/axiosClient";

import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    Loader2,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Ticket,
    Users,
} from "lucide-react";

function unwrapData(data) {
    if (
        data?.data &&
        typeof data.data === "object"
    ) {
        return data.data;
    }

    return data;
}

function normalizeList(data) {
    const payload =
        unwrapData(data);

    if (Array.isArray(payload)) {
        return payload;
    }

    if (
        Array.isArray(
            payload?.content
        )
    ) {
        return payload.content;
    }

    if (
        Array.isArray(
            payload?.items
        )
    ) {
        return payload.items;
    }

    return [];
}

function normalizeStatus(value) {
    const status =
        String(value || "")
            .trim()
            .toUpperCase();

    if (
        [
            "ACTIVE",
            "PUBLISHED",
            "ON_SALE",
        ].includes(status)
    ) {
        return "OPEN";
    }

    if (
        status === "ENDED"
    ) {
        return "COMPLETED";
    }

    if (
        status === "INACTIVE"
    ) {
        return "CLOSED";
    }

    return status;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
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

        const path =
            relativePath.startsWith("/")
                ? relativePath
                : `/${relativePath}`;

        addCandidate(
            `/event-service${path}`
        );

        addCandidate(
            `/api/event-service${path}`
        );

        addCandidate(
            `http://localhost:8084${path}`
        );

        return candidates;
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        addCandidate(value);

        return candidates;
    }

    if (
        value.startsWith(
            "/event-service/"
        )
    ) {
        addCandidate(value);

        addCandidate(
            `/api${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "event-service/"
        )
    ) {
        addCandidate(
            `/${value}`
        );

        addCandidate(
            `/api/${value}`
        );

        return candidates;
    }

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
        addCandidate(
            `/${value}`
        );

        addCandidate(
            `/${value.replace(
                /^api\//,
                ""
            )}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "/uploads/"
        )
    ) {
        addCandidate(
            `/event-service${value}`
        );

        addCandidate(
            `/api/event-service${value}`
        );

        addCandidate(
            `http://localhost:8084${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "uploads/"
        )
    ) {
        addCandidate(
            `/event-service/${value}`
        );

        addCandidate(
            `/api/event-service/${value}`
        );

        addCandidate(
            `http://localhost:8084/${value}`
        );

        return candidates;
    }

    if (
        value.startsWith(
            "events/"
        )
    ) {
        addCandidate(
            `/event-service/uploads/${value}`
        );

        addCandidate(
            `/api/event-service/uploads/${value}`
        );

        addCandidate(
            `http://localhost:8084/uploads/${value}`
        );

        return candidates;
    }

    const fileName =
        value.replace(
            /^\/+/,
            ""
        );

    addCandidate(
        `/event-service/uploads/events/${fileName}`
    );

    addCandidate(
        `/api/event-service/uploads/events/${fileName}`
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
    fallbackSize = 110,
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

    const candidatesKey =
        candidates.join("|");

    const [
        imageIndex,
        setImageIndex,
    ] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [candidatesKey]);

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
                alt ||
                "Sự kiện"
            }
            className={className}
            loading="eager"
            decoding="async"
            onError={() => {
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

function formatDateTime(value) {
    const date =
        parseDate(value);

    if (!date) {
        return "Đang cập nhật";
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
}

function compareSeatNumbers(
    firstSeat,
    secondSeat
) {
    return String(
        firstSeat?.seatNumber ||
        firstSeat?.id ||
        ""
    ).localeCompare(
        String(
            secondSeat?.seatNumber ||
            secondSeat?.id ||
            ""
        ),
        "vi",
        {
            numeric: true,
            sensitivity: "base",
        }
    );
}

function EventDetail() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [
        event,
        setEvent,
    ] = useState(null);

    const [
        seats,
        setSeats,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        seatLoading,
        setSeatLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        seatError,
        setSeatError,
    ] = useState("");

    const [
        showFullIntro,
        setShowFullIntro,
    ] = useState(false);

    const [
        openSeatGroups,
        setOpenSeatGroups,
    ] = useState([]);

    useEffect(() => {
        setShowFullIntro(false);
        setOpenSeatGroups([]);
        setEvent(null);
        setSeats([]);
        setError("");
        setSeatError("");

        loadDetail();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadDetail =
        async () => {
            const eventId =
                Number(id);

            if (
                !Number.isInteger(
                    eventId
                ) ||
                eventId <= 0
            ) {
                setError(
                    "Event ID không hợp lệ."
                );

                return;
            }

            try {
                setLoading(true);
                setSeatLoading(true);
                setError("");
                setSeatError("");

                const [
                    eventResult,
                    seatResult,
                ] =
                    await Promise.allSettled([
                        axiosClient.get(
                            `/event-service/events/${eventId}`
                        ),

                        axiosClient.get(
                            `/seat-service/seats/event/${eventId}`
                        ),
                    ]);

                if (
                    eventResult.status ===
                    "rejected"
                ) {
                    throw eventResult.reason;
                }

                const eventData =
                    unwrapData(
                        eventResult.value
                            .data
                    );

                if (
                    !eventData ||
                    !eventData.id
                ) {
                    throw new Error(
                        "Không tìm thấy sự kiện."
                    );
                }

                setEvent(eventData);

                if (
                    seatResult.status ===
                    "fulfilled"
                ) {
                    setSeats(
                        normalizeList(
                            seatResult.value
                                .data
                        )
                    );
                } else {
                    console.error(
                        "Seat service error:",
                        seatResult.reason
                    );

                    setSeats([]);

                    setSeatError(
                        seatResult.reason
                            ?.response
                            ?.data
                            ?.message ||
                        "Không tải được thông tin vé. Vui lòng thử lại."
                    );
                }
            } catch (
            requestError
            ) {
                console.error(
                    "Event detail error:",
                    requestError
                );

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    requestError
                        ?.message ||
                    "Không tải được chi tiết sự kiện."
                );

                setEvent(null);
                setSeats([]);
            } finally {
                setLoading(false);
                setSeatLoading(false);
            }
        };

    const availableSeats =
        useMemo(
            () =>
                seats.filter(
                    (seat) =>
                        normalizeStatus(
                            seat.status
                        ) ===
                        "AVAILABLE"
                ),
            [seats]
        );

    const seatGroups =
        useMemo(() => {
            const groups =
                new Map();

            [...seats]
                .sort(
                    compareSeatNumbers
                )
                .forEach(
                    (seat) => {
                        const groupName =
                            String(
                                seat.seatType ||
                                "STANDARD"
                            )
                                .trim()
                                .toUpperCase();

                        if (
                            !groups.has(
                                groupName
                            )
                        ) {
                            groups.set(
                                groupName,
                                []
                            );
                        }

                        groups.get(
                            groupName
                        ).push(seat);
                    }
                );

            return Array.from(
                groups.entries()
            )
                .map(
                    ([
                        name,
                        groupSeats,
                    ]) => {
                        const prices =
                            groupSeats
                                .map(
                                    (seat) =>
                                        Number(
                                            seat.price
                                        )
                                )
                                .filter(
                                    (price) =>
                                        Number.isFinite(
                                            price
                                        )
                                );

                        const available =
                            groupSeats.filter(
                                (seat) =>
                                    normalizeStatus(
                                        seat.status
                                    ) ===
                                    "AVAILABLE"
                            );

                        return {
                            key: name,
                            name,
                            seats:
                                groupSeats,
                            available,

                            minPrice:
                                prices.length >
                                    0
                                    ? Math.min(
                                        ...prices
                                    )
                                    : null,

                            maxPrice:
                                prices.length >
                                    0
                                    ? Math.max(
                                        ...prices
                                    )
                                    : null,
                        };
                    }
                )
                .sort(
                    (
                        firstGroup,
                        secondGroup
                    ) =>
                        firstGroup.name.localeCompare(
                            secondGroup.name,
                            "vi"
                        )
                );
        }, [seats]);

    const minPrice =
        useMemo(() => {
            const seatPrices =
                seats
                    .map(
                        (seat) =>
                            Number(
                                seat.price
                            )
                    )
                    .filter(
                        (price) =>
                            Number.isFinite(
                                price
                            )
                    );

            if (
                seatPrices.length >
                0
            ) {
                return Math.min(
                    ...seatPrices
                );
            }

            const eventMinPrice =
                Number(
                    event?.minPrice
                );

            return Number.isFinite(
                eventMinPrice
            )
                ? eventMinPrice
                : null;
        }, [
            event,
            seats,
        ]);

    const displayedTotalSeats =
        seats.length > 0
            ? seats.length
            : Number(
                event?.totalSeats ||
                0
            );

    const displayedAvailableSeats =
        seats.length > 0
            ? availableSeats.length
            : Number(
                event?.availableSeats ||
                0
            );

    const saleState =
        useMemo(() => {
            if (!event) {
                return {
                    canBook: false,
                    label:
                        "Chưa có dữ liệu",
                };
            }

            if (seatError) {
                return {
                    canBook: false,
                    label:
                        "Không tải được vé",
                };
            }

            const now =
                new Date();

            const eventStatus =
                normalizeStatus(
                    event.status
                );

            const saleStart =
                parseDate(
                    event.saleStartAt
                );

            const saleEnd =
                parseDate(
                    event.saleEndAt
                );

            const eventDate =
                parseDate(
                    event.eventDate
                );

            if (
                eventStatus ===
                "CANCELLED"
            ) {
                return {
                    canBook: false,
                    label:
                        "Sự kiện đã hủy",
                };
            }

            if (
                [
                    "COMPLETED",
                    "CLOSED",
                ].includes(
                    eventStatus
                )
            ) {
                return {
                    canBook: false,
                    label:
                        "Đã kết thúc bán vé",
                };
            }

            if (
                eventStatus ===
                "SOLD_OUT"
            ) {
                return {
                    canBook: false,
                    label:
                        "Hết vé",
                };
            }

            if (
                saleStart &&
                now < saleStart
            ) {
                return {
                    canBook: false,
                    label:
                        "Chưa đến giờ mở bán",
                };
            }

            if (
                saleEnd &&
                now >= saleEnd
            ) {
                return {
                    canBook: false,
                    label:
                        "Đã đóng bán vé",
                };
            }

            if (
                eventDate &&
                now >= eventDate
            ) {
                return {
                    canBook: false,
                    label:
                        "Sự kiện đã diễn ra",
                };
            }

            if (
                seats.length === 0
            ) {
                return {
                    canBook: false,
                    label:
                        "Chưa có vé",
                };
            }

            if (
                availableSeats.length ===
                0
            ) {
                return {
                    canBook: false,
                    label:
                        "Hết vé",
                };
            }

            if (
                eventStatus !== "OPEN"
            ) {
                return {
                    canBook: false,
                    label:
                        "Vé chưa mở bán",
                };
            }

            return {
                canBook: true,
                label: "Chọn vé",
            };
        }, [
            event,
            seats,
            availableSeats,
            seatError,
        ]);

    const toggleGroup =
        (groupKey) => {
            setOpenSeatGroups(
                (current) =>
                    current.includes(
                        groupKey
                    )
                        ? current.filter(
                            (key) =>
                                key !==
                                groupKey
                        )
                        : [
                            ...current,
                            groupKey,
                        ]
            );
        };

    const openAllGroups =
        () => {
            setOpenSeatGroups(
                seatGroups.map(
                    (group) =>
                        group.key
                )
            );
        };

    const closeAllGroups =
        () => {
            setOpenSeatGroups([]);
        };

    const goToCheckout =
        () => {
            if (
                !saleState.canBook
            ) {
                return;
            }

            navigate(
                `/checkout/${id}`
            );
        };

    if (loading) {
        return (
            <PageMessage>
                <Loader2
                    size={26}
                    className="mx-auto mb-3 animate-spin"
                />

                Đang tải chi tiết sự kiện...
            </PageMessage>
        );
    }

    if (error) {
        return (
            <PageMessage error>
                {error}
            </PageMessage>
        );
    }

    if (!event) {
        return (
            <PageMessage>
                Không tìm thấy sự kiện.
            </PageMessage>
        );
    }

    return (
        <div className="min-h-screen bg-[#111317] pb-16 text-white">
            <section className="relative overflow-hidden bg-[#08090b]">
                <div className="mx-auto max-w-7xl px-4 pb-8 pt-6 lg:px-8">
                    <Link
                        to="/events"
                        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-emerald-300"
                    >
                        <ArrowLeft
                            size={17}
                        />

                        Quay lại danh sách
                    </Link>

                    <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[#34363d] shadow-2xl">
                        <div className="grid min-h-130 grid-cols-1 lg:grid-cols-[410px_1fr]">
                            <div className="flex flex-col justify-between p-7 md:p-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-300">
                                        <Ticket
                                            size={15}
                                        />

                                        {event.categoryName ||
                                            event.category
                                                ?.name ||
                                            "SỰ KIỆN"}
                                    </div>

                                    <h1 className="mt-5 text-3xl font-black leading-snug md:text-4xl">
                                        {
                                            event.name
                                        }
                                    </h1>

                                    <div className="mt-8 space-y-6">
                                        <InfoRow
                                            icon={
                                                <CalendarDays
                                                    size={24}
                                                />
                                            }
                                            title={formatDateTime(
                                                event.eventDate
                                            )}
                                            subtitle="Thời gian diễn ra"
                                        />

                                        <InfoRow
                                            icon={
                                                <MapPin
                                                    size={24}
                                                />
                                            }
                                            title={
                                                event.location ||
                                                "Đang cập nhật"
                                            }
                                            subtitle="Địa điểm"
                                        />

                                        <InfoRow
                                            icon={
                                                <Clock
                                                    size={24}
                                                />
                                            }
                                            title={`${formatDateTime(
                                                event.saleStartAt
                                            )} - ${formatDateTime(
                                                event.saleEndAt
                                            )}`}
                                            subtitle="Thời gian mở bán"
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 border-t border-white/20 pt-6">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-slate-300">
                                                Giá vé từ
                                            </div>

                                            <div className="mt-1 text-3xl font-black text-emerald-400">
                                                {formatMoney(
                                                    minPrice
                                                )}
                                            </div>
                                        </div>

                                        <ChevronRight
                                            size={30}
                                            className="shrink-0 text-emerald-400"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            goToCheckout
                                        }
                                        disabled={
                                            !saleState.canBook
                                        }
                                        className="mt-6 h-14 w-full rounded-xl bg-emerald-500 font-black text-slate-950 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-300"
                                    >
                                        {
                                            saleState.label
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="relative min-h-90 overflow-hidden bg-linear-to-br from-emerald-500 to-cyan-500">
                                <EventImage
                                    event={event}
                                    alt={
                                        event.name ||
                                        "Sự kiện"
                                    }
                                    className="absolute inset-0 h-full w-full object-cover"
                                    fallbackClassName="absolute inset-0 flex items-center justify-center"
                                    fallbackSize={
                                        110
                                    }
                                />

                                <span className="absolute right-6 top-6 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-black">
                                    {normalizeStatus(
                                        event.status
                                    ) ||
                                        "UNKNOWN"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
                <ContentCard
                    title="Giới thiệu"
                >
                    <div
                        className={`relative whitespace-pre-line text-lg leading-8 text-slate-200 ${showFullIntro
                            ? ""
                            : "max-h-90 overflow-hidden"
                            }`}
                    >
                        {event.description ||
                            "Thông tin sự kiện đang được cập nhật."}

                        {!showFullIntro && (
                            <div className="absolute inset-x-0 bottom-0 flex h-28 items-end justify-center bg-linear-to-t from-[#30343e] to-transparent pb-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowFullIntro(
                                            true
                                        )
                                    }
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
                                    aria-label="Xem thêm giới thiệu"
                                >
                                    <ChevronDown
                                        size={28}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {showFullIntro && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowFullIntro(
                                    false
                                )
                            }
                            className="mt-5 inline-flex items-center gap-2 font-black text-emerald-300"
                        >
                            Thu gọn

                            <ChevronDown
                                size={18}
                                className="rotate-180"
                            />
                        </button>
                    )}
                </ContentCard>
            </section>

            <section className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
                <ContentCard
                    title="Lịch diễn"
                    action={
                        <button
                            type="button"
                            onClick={
                                loadDetail
                            }
                            disabled={
                                loading ||
                                seatLoading
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-black text-slate-950 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading ||
                                        seatLoading
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            Tải lại
                        </button>
                    }
                >
                    <div className="rounded-[22px] border border-white/10 bg-[#424754] p-6">
                        <InfoRow
                            icon={
                                <CalendarDays
                                    size={26}
                                />
                            }
                            title={formatDateTime(
                                event.eventDate
                            )}
                            subtitle={
                                event.location ||
                                "Đang cập nhật"
                            }
                        />
                    </div>
                </ContentCard>
            </section>

            <section className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
                <ContentCard
                    title="Thông tin vé"
                    action={
                        seatGroups.length >
                            0 ? (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        openAllGroups
                                    }
                                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950"
                                >
                                    Mở tất cả
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        closeAllGroups
                                    }
                                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-black"
                                >
                                    Thu tất cả
                                </button>
                            </div>
                        ) : null
                    }
                >
                    {seatError && (
                        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                            {
                                seatError
                            }
                        </div>
                    )}

                    {seatLoading ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-6 text-slate-300">
                            <Loader2
                                size={20}
                                className="animate-spin"
                            />

                            Đang tải vé...
                        </div>
                    ) : seatGroups.length ===
                        0 ? (
                        <div className="rounded-2xl bg-white/5 p-6 text-slate-300">
                            Chưa có thông tin vé.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {seatGroups.map(
                                (group) => {
                                    const isOpen =
                                        openSeatGroups.includes(
                                            group.key
                                        );

                                    return (
                                        <div
                                            key={
                                                group.key
                                            }
                                            className="overflow-hidden rounded-[22px] border border-white/15 bg-[#424754]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleGroup(
                                                        group.key
                                                    )
                                                }
                                                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ChevronRight
                                                        size={22}
                                                        className={`shrink-0 transition ${isOpen
                                                            ? "rotate-90"
                                                            : ""
                                                            }`}
                                                    />

                                                    <div>
                                                        <div className="text-lg font-black uppercase">
                                                            {
                                                                group.name
                                                            }
                                                        </div>

                                                        <div className="mt-1 text-sm text-slate-300">
                                                            Còn{" "}
                                                            {
                                                                group
                                                                    .available
                                                                    .length
                                                            }{" "}
                                                            /{" "}
                                                            {
                                                                group
                                                                    .seats
                                                                    .length
                                                            }{" "}
                                                            vé
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-black text-emerald-400">
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
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-white/10 p-5">
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                        {group.seats.map(
                                                            (
                                                                seat
                                                            ) => {
                                                                const status =
                                                                    normalizeStatus(
                                                                        seat.status
                                                                    );

                                                                const isAvailable =
                                                                    status ===
                                                                    "AVAILABLE";

                                                                return (
                                                                    <div
                                                                        key={
                                                                            seat.id
                                                                        }
                                                                        className={`rounded-xl border p-4 ${isAvailable
                                                                            ? "border-emerald-500/30 bg-emerald-500/10"
                                                                            : "border-white/10 bg-white/5 opacity-60"
                                                                            }`}
                                                                    >
                                                                        <div className="font-black">
                                                                            {seat.seatNumber ||
                                                                                `Ghế #${seat.id}`}
                                                                        </div>

                                                                        <div className="mt-1 text-sm text-emerald-300">
                                                                            {formatMoney(
                                                                                seat.price
                                                                            )}
                                                                        </div>

                                                                        <div className="mt-2 text-xs text-slate-300">
                                                                            {
                                                                                status
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                        <div className="flex items-center gap-3">
                            <ShieldCheck
                                size={24}
                                className="shrink-0 text-emerald-300"
                            />

                            <div>
                                <div className="font-black">
                                    Vé QR điện tử
                                </div>

                                <div className="text-sm text-slate-300">
                                    Vé được phát hành sau khi thanh toán thành công.
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={
                                goToCheckout
                            }
                            disabled={
                                !saleState.canBook
                            }
                            className="rounded-xl bg-emerald-500 px-7 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-300"
                        >
                            {
                                saleState.label
                            }
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                        <Users
                            size={17}
                        />

                        Tổng{" "}
                        {
                            displayedTotalSeats
                        }{" "}
                        vé, còn{" "}
                        {
                            displayedAvailableSeats
                        }{" "}
                        vé.
                    </div>
                </ContentCard>
            </section>
        </div>
    );
}

function InfoRow({
    icon,
    title,
    subtitle,
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 shrink-0 text-white">
                {icon}
            </div>

            <div className="min-w-0">
                <div className="font-black text-emerald-400">
                    {title}
                </div>

                <div className="mt-1 text-slate-300">
                    {subtitle}
                </div>
            </div>
        </div>
    );
}

function ContentCard({
    title,
    action,
    children,
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#30343e]">
            <div className="flex flex-col gap-3 bg-[#22252d] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-black text-emerald-400">
                    {title}
                </h2>

                {action}
            </div>

            <div className="p-5 md:p-8">
                {children}
            </div>
        </div>
    );
}

function PageMessage({
    children,
    error = false,
}) {
    return (
        <div className="min-h-screen bg-[#111317] px-4 py-16 text-white">
            <div
                className={`mx-auto max-w-7xl rounded-[28px] border p-10 text-center ${error
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-[#1f232b] text-slate-300"
                    }`}
            >
                {children}
            </div>
        </div>
    );
}

export default EventDetail;