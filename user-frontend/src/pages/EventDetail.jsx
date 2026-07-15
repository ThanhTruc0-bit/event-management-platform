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
    MapPin,
    RefreshCw,
    ShieldCheck,
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

    return [];
}

function normalizeStatus(value) {
    const status =
        String(
            value || ""
        )
            .trim()
            .toUpperCase();

    if (status === "ACTIVE") {
        return "OPEN";
    }

    if (status === "ENDED") {
        return "COMPLETED";
    }

    return status;
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

function EventDetail() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [event, setEvent] =
        useState(null);

    const [seats, setSeats] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [
        seatLoading,
        setSeatLoading,
    ] = useState(false);

    const [error, setError] =
        useState("");

    const [
        showFullIntro,
        setShowFullIntro,
    ] = useState(false);

    const [
        openSeatGroups,
        setOpenSeatGroups,
    ] = useState([]);

    useEffect(() => {
        loadDetail();

        // eslint-disable-next-line
    }, [id]);

    const loadDetail =
        async () => {
            try {
                setLoading(true);
                setSeatLoading(true);
                setError("");

                const eventResponse =
                    await axiosClient.get(
                        `/event-service/events/${id}`
                    );

                setEvent(
                    eventResponse.data
                );

                try {
                    const seatResponse =
                        await axiosClient.get(
                            `/seat-service/seats/event/${id}`
                        );

                    setSeats(
                        normalizeList(
                            seatResponse.data
                        )
                    );
                } catch (
                seatError
                ) {
                    console.error(
                        seatError
                    );

                    setSeats([]);
                } finally {
                    setSeatLoading(
                        false
                    );
                }
            } catch (
            requestError
            ) {
                console.error(
                    requestError
                );

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    "Không tải được chi tiết sự kiện."
                );

                setEvent(null);
                setSeats([]);
                setSeatLoading(false);
            } finally {
                setLoading(false);
            }
        };

    const availableSeats =
        useMemo(() => {
            return seats.filter(
                (seat) =>
                    normalizeStatus(
                        seat.status
                    ) === "AVAILABLE"
            );
        }, [seats]);

    const seatGroups =
        useMemo(() => {
            const map =
                new Map();

            seats.forEach((seat) => {
                const groupName =
                    seat.seatType ||
                    "STANDARD";

                if (!map.has(
                    groupName
                )) {
                    map.set(
                        groupName,
                        []
                    );
                }

                map.get(
                    groupName
                ).push(seat);
            });

            return Array.from(
                map.entries()
            ).map(
                ([
                    name,
                    groupSeats,
                ]) => {
                    const prices =
                        groupSeats
                            .map(
                                (
                                    seat
                                ) =>
                                    Number(
                                        seat.price
                                    )
                            )
                            .filter(
                                (
                                    price
                                ) =>
                                    !Number.isNaN(
                                        price
                                    )
                            );

                    const available =
                        groupSeats.filter(
                            (
                                seat
                            ) =>
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
                            prices.length
                                ? Math.min(
                                    ...prices
                                )
                                : null,
                        maxPrice:
                            prices.length
                                ? Math.max(
                                    ...prices
                                )
                                : null,
                    };
                }
            );
        }, [seats]);

    const minPrice =
        useMemo(() => {
            if (
                event?.minPrice !==
                null &&
                event?.minPrice !==
                undefined
            ) {
                return Number(
                    event.minPrice
                );
            }

            const prices =
                seats
                    .map(
                        (seat) =>
                            Number(
                                seat.price
                            )
                    )
                    .filter(
                        (price) =>
                            !Number.isNaN(
                                price
                            )
                    );

            return prices.length
                ? Math.min(
                    ...prices
                )
                : null;
        }, [event, seats]);

    const saleState =
        useMemo(() => {
            if (!event) {
                return {
                    canBook: false,
                    label:
                        "Chưa có dữ liệu",
                };
            }

            const now =
                new Date();

            const eventStatus =
                normalizeStatus(
                    event.status
                );

            const saleStart =
                event.saleStartAt
                    ? new Date(
                        event.saleStartAt
                    )
                    : null;

            const saleEnd =
                event.saleEndAt
                    ? new Date(
                        event.saleEndAt
                    )
                    : null;

            const eventDate =
                event.eventDate
                    ? new Date(
                        event.eventDate
                    )
                    : null;

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
                eventStatus ===
                "COMPLETED" ||
                eventStatus ===
                "CLOSED"
            ) {
                return {
                    canBook: false,
                    label:
                        "Đã kết thúc bán vé",
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
                now > saleEnd
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
                    label: "Hết vé",
                };
            }

            if (
                ![
                    "OPEN",
                    "ACTIVE",
                ].includes(
                    eventStatus
                )
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
        ]);

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

    const formatDateTime =
        (value) => {
            if (!value) {
                return "Đang cập nhật";
            }

            return new Date(
                value
            ).toLocaleString(
                "vi-VN",
                {
                    hour:
                        "2-digit",
                    minute:
                        "2-digit",
                    day: "2-digit",
                    month:
                        "2-digit",
                    year: "numeric",
                }
            );
        };

    const toggleGroup = (
        groupKey
    ) => {
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

    const openAllGroups = () => {
        setOpenSeatGroups(
            seatGroups.map(
                (group) =>
                    group.key
            )
        );
    };

    const closeAllGroups = () => {
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
                Đang tải chi tiết sự kiện...
            </PageMessage>
        );
    }

    if (error) {
        return (
            <PageMessage
                error
            >
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

    const image =
        getEventImage(event);

    return (
        <div className="min-h-screen bg-[#111317] pb-16 text-white">
            <section className="relative overflow-hidden bg-[#08090b]">
                <div className="mx-auto max-w-[1500px] px-4 pb-8 pt-6 lg:px-8">
                    <Link
                        to="/events"
                        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-emerald-300"
                    >
                        <ArrowLeft
                            size={17}
                        />
                        Quay lại danh sách
                    </Link>

                    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#34363d] shadow-2xl">
                        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[410px_1fr]">
                            <div className="flex flex-col justify-between p-7 md:p-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-300">
                                        <Ticket
                                            size={
                                                15
                                            }
                                        />

                                        {event.categoryName ||
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
                                                    size={
                                                        24
                                                    }
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
                                                    size={
                                                        24
                                                    }
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
                                                    size={
                                                        24
                                                    }
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
                                    <div className="flex items-end justify-between">
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
                                            size={
                                                30
                                            }
                                            className="text-emerald-400"
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
                                        className="mt-6 h-14 w-full rounded-xl bg-emerald-500 font-black hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-300"
                                    >
                                        {
                                            saleState.label
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="relative min-h-[360px] bg-gradient-to-br from-emerald-500 to-cyan-500">
                                {image ? (
                                    <img
                                        src={
                                            image
                                        }
                                        alt={
                                            event.name
                                        }
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Ticket
                                            size={
                                                110
                                            }
                                        />
                                    </div>
                                )}

                                <span className="absolute right-6 top-6 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-black">
                                    {
                                        event.status
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-8 max-w-[1500px] px-4 lg:px-8">
                <ContentCard
                    title="Giới thiệu"
                >
                    <div
                        className={`relative whitespace-pre-line text-lg leading-8 ${showFullIntro
                            ? ""
                            : "max-h-[360px] overflow-hidden"
                            }`}
                    >
                        {event.description ||
                            "Thông tin sự kiện đang được cập nhật."}

                        {!showFullIntro && (
                            <div className="absolute bottom-0 left-0 right-0 flex h-28 items-end justify-center bg-gradient-to-t from-[#30343e] to-transparent">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowFullIntro(
                                            true
                                        )
                                    }
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
                                >
                                    <ChevronDown
                                        size={
                                            28
                                        }
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </ContentCard>
            </section>

            <section className="mx-auto mt-8 max-w-[1500px] px-4 lg:px-8">
                <ContentCard
                    title="Lịch diễn"
                    action={
                        <button
                            type="button"
                            onClick={
                                loadDetail
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-black text-slate-950"
                        >
                            <RefreshCw
                                size={17}
                            />
                            Reload
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

            <section className="mx-auto mt-8 max-w-[1500px] px-4 lg:px-8">
                <ContentCard
                    title="Thông tin vé"
                    action={
                        seatGroups.length >
                            0 ? (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        openAllGroups
                                    }
                                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black"
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
                    {seatLoading ? (
                        <div className="rounded-2xl bg-white/5 p-6 text-slate-300">
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
                                                        size={
                                                            22
                                                        }
                                                        className={`transition ${isOpen
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

                                                                return (
                                                                    <div
                                                                        key={
                                                                            seat.id
                                                                        }
                                                                        className="rounded-xl bg-white/5 p-4"
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
                                className="text-emerald-300"
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
                            className="rounded-xl bg-emerald-500 px-7 py-3 font-black disabled:bg-slate-500"
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
                        {Number(
                            event.totalSeats ||
                            seats.length
                        )}{" "}
                        vé, còn{" "}
                        {Number(
                            event.availableSeats ||
                            availableSeats.length
                        )}{" "}
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

            <div>
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
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#30343e]">
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