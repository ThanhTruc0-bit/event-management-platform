import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Armchair,
    CheckCircle,
    FilterX,
    LockKeyhole,
    TicketCheck,
    X,
} from "lucide-react";

import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

const SEAT_TYPES = [
    "VIP",
    "STANDARD",
    "STANDING",
];

const SEAT_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "BOOKED",
];

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (
        Array.isArray(
            data?.content
        )
    ) {
        return data.content;
    }

    if (
        Array.isArray(
            data?.data
        )
    ) {
        return data.data;
    }

    if (
        Array.isArray(
            data?.data?.content
        )
    ) {
        return data.data.content;
    }

    return [];
}

function getErrorMessage(
    error,
    fallback
) {
    if (
        error?.response
            ?.status === 401
    ) {
        return "Phiên đăng nhập đã hết hạn.";
    }

    if (
        error?.response
            ?.status === 403
    ) {
        return "Bạn không có quyền thực hiện chức năng này.";
    }

    if (
        error?.response
            ?.status === 409
    ) {
        return (
            error?.response
                ?.data
                ?.message ||
            "Ghế đã tồn tại hoặc đang được sử dụng."
        );
    }

    return (
        error?.response
            ?.data
            ?.message ||
        error?.response
            ?.data
            ?.error ||
        error?.message ||
        fallback
    );
}

function Seats() {
    const [
        events,
        setEvents,
    ] = useState([]);

    const [
        showGenerate,
        setShowGenerate,
    ] = useState(false);

    const [
        generating,
        setGenerating,
    ] = useState(false);

    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    const [
        eventIdFilter,
        setEventIdFilter,
    ] = useState("");

    const [
        seatTypeFilter,
        setSeatTypeFilter,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("");

    const [
        minPriceFilter,
        setMinPriceFilter,
    ] = useState("");

    const [
        maxPriceFilter,
        setMaxPriceFilter,
    ] = useState("");

    const [
        generateForm,
        setGenerateForm,
    ] = useState({
        eventId: "",
        prefix: "",
        startNumber: 1,
        endNumber: 30,
        seatType: "STANDARD",
        status: "AVAILABLE",
        price: "",
    });

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents =
        async () => {
            try {
                const response =
                    await axiosClient.get(
                        "/event-service/events",
                        {
                            params: {
                                page: 0,
                                size: 100,
                                sortBy: "name",
                                sortDirection:
                                    "asc",
                            },
                        }
                    );

                setEvents(
                    normalizeList(
                        response.data
                    )
                );
            } catch (error) {
                console.error(
                    "Load events error:",
                    error
                );

                setEvents([]);
            }
        };

    const eventOptions =
        useMemo(() => {
            return events.map(
                (event) => ({
                    value:
                        String(
                            event.id
                        ),

                    label:
                        `#${event.id} - ${event.name}`,
                })
            );
        }, [events]);

    const getEventName =
        (eventId) => {
            const event =
                events.find(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            eventId
                        )
                );

            return event
                ? event.name
                : `Event #${eventId}`;
        };

    const requestParams =
        useMemo(() => {
            const params = {};

            if (eventIdFilter) {
                params.eventId =
                    Number(
                        eventIdFilter
                    );
            }

            if (seatTypeFilter) {
                params.seatType =
                    seatTypeFilter;
            }

            if (statusFilter) {
                params.status =
                    statusFilter;
            }

            if (
                minPriceFilter !==
                ""
            ) {
                params.minPrice =
                    Number(
                        minPriceFilter
                    );
            }

            if (
                maxPriceFilter !==
                ""
            ) {
                params.maxPrice =
                    Number(
                        maxPriceFilter
                    );
            }

            return params;
        }, [
            eventIdFilter,
            seatTypeFilter,
            statusFilter,
            minPriceFilter,
            maxPriceFilter,
        ]);

    const clearFilters = () => {
        setEventIdFilter("");
        setSeatTypeFilter("");
        setStatusFilter("");
        setMinPriceFilter("");
        setMaxPriceFilter("");
    };

    const handleGenerateChange =
        (event) => {
            const {
                name,
                value,
            } = event.target;

            setGenerateForm(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        };

    const resetGenerateForm =
        () => {
            setGenerateForm({
                eventId: "",
                prefix: "",
                startNumber: 1,
                endNumber: 30,
                seatType:
                    "STANDARD",
                status:
                    "AVAILABLE",
                price: "",
            });
        };

    const closeGenerateModal =
        () => {
            if (generating) {
                return;
            }

            setShowGenerate(false);
            resetGenerateForm();
        };

    const generateSeats =
        async (event) => {
            event.preventDefault();

            const eventId =
                Number(
                    generateForm.eventId
                );

            const startNumber =
                Number(
                    generateForm.startNumber
                );

            const endNumber =
                Number(
                    generateForm.endNumber
                );

            const price =
                Number(
                    generateForm.price
                );

            if (!eventId) {
                window.alert(
                    "Vui lòng chọn sự kiện."
                );

                return;
            }

            if (
                !generateForm.prefix
                    .trim()
            ) {
                window.alert(
                    "Vui lòng nhập Prefix."
                );

                return;
            }

            if (
                startNumber >
                endNumber
            ) {
                window.alert(
                    "Số bắt đầu không được lớn hơn số kết thúc."
                );

                return;
            }

            if (
                endNumber -
                startNumber +
                1 >
                1000
            ) {
                window.alert(
                    "Mỗi lần chỉ được tạo tối đa 1000 ghế."
                );

                return;
            }

            if (
                Number.isNaN(price) ||
                price < 0
            ) {
                window.alert(
                    "Giá ghế không hợp lệ."
                );

                return;
            }

            try {
                setGenerating(true);

                const response =
                    await axiosClient.post(
                        "/seat-service/seats/generate",
                        {
                            eventId,

                            prefix:
                                generateForm
                                    .prefix
                                    .trim()
                                    .toUpperCase(),

                            startNumber,

                            endNumber,

                            seatType:
                                generateForm
                                    .seatType,

                            status:
                                generateForm
                                    .status,

                            price,
                        }
                    );

                const createdSeats =
                    normalizeList(
                        response.data
                    );

                window.alert(
                    `Tạo thành công ${createdSeats.length} ghế. Ghế trùng đã được bỏ qua.`
                );

                setShowGenerate(false);
                resetGenerateForm();

                setReloadKey(
                    (current) =>
                        current + 1
                );
            } catch (error) {
                console.error(
                    "Generate seats error:",
                    error
                );

                window.alert(
                    getErrorMessage(
                        error,
                        "Tạo ghế hàng loạt thất bại."
                    )
                );
            } finally {
                setGenerating(false);
            }
        };

    const changeSeatStatus =
        async (
            seat,
            status,
            loadItems
        ) => {
            if (
                !window.confirm(
                    `Chuyển ghế ${seat.seatNumber} sang ${status}?`
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/seat-service/seats/${seat.id}/status`,
                    null,
                    {
                        params: {
                            status,
                        },
                    }
                );

                await loadItems();
            } catch (error) {
                console.error(
                    "Update seat status error:",
                    error
                );

                window.alert(
                    getErrorMessage(
                        error,
                        "Không cập nhật được trạng thái ghế."
                    )
                );
            }
        };

    const formatMoney =
        (value) => {
            const number =
                Number(value || 0);

            if (number === 0) {
                return "Miễn phí";
            }

            return `${number.toLocaleString(
                "vi-VN"
            )} đ`;
        };

    const getSeatTypeClass =
        (seatType) => {
            const normalized =
                String(
                    seatType || ""
                ).toUpperCase();

            if (
                normalized === "VIP"
            ) {
                return "bg-purple-100 text-purple-700";
            }

            if (
                normalized ===
                "STANDARD"
            ) {
                return "bg-blue-100 text-blue-700";
            }

            return "bg-slate-100 text-slate-700";
        };

    const getStatusClass =
        (status) => {
            const normalized =
                String(
                    status || ""
                ).toUpperCase();

            if (
                normalized ===
                "AVAILABLE"
            ) {
                return "bg-green-100 text-green-700";
            }

            if (
                normalized ===
                "RESERVED"
            ) {
                return "bg-yellow-100 text-yellow-700";
            }

            if (
                normalized ===
                "BOOKED"
            ) {
                return "bg-red-100 text-red-700";
            }

            return "bg-slate-100 text-slate-700";
        };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={eventIdFilter}
                onChange={(event) =>
                    setEventIdFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả sự kiện
                </option>

                {eventOptions.map(
                    (event) => (
                        <option
                            key={event.value}
                            value={
                                event.value
                            }
                        >
                            {event.label}
                        </option>
                    )
                )}
            </select>

            <select
                value={
                    seatTypeFilter
                }
                onChange={(event) =>
                    setSeatTypeFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả loại ghế
                </option>

                {SEAT_TYPES.map(
                    (seatType) => (
                        <option
                            key={seatType}
                            value={
                                seatType
                            }
                        >
                            {seatType}
                        </option>
                    )
                )}
            </select>

            <select
                value={statusFilter}
                onChange={(event) =>
                    setStatusFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả trạng thái
                </option>

                {SEAT_STATUSES.map(
                    (status) => (
                        <option
                            key={status}
                            value={status}
                        >
                            {status}
                        </option>
                    )
                )}
            </select>

            <input
                type="number"
                min="0"
                value={minPriceFilter}
                onChange={(event) =>
                    setMinPriceFilter(
                        event.target.value
                    )
                }
                placeholder="Giá từ"
                className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <input
                type="number"
                min="0"
                value={maxPriceFilter}
                onChange={(event) =>
                    setMaxPriceFilter(
                        event.target.value
                    )
                }
                placeholder="Giá đến"
                className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
                <FilterX
                    size={17}
                />

                Xóa lọc
            </button>

            <button
                type="button"
                onClick={() =>
                    setShowGenerate(
                        true
                    )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow hover:bg-indigo-700"
            >
                <Armchair
                    size={18}
                />

                Tạo ghế hàng loạt
            </button>
        </div>
    );

    return (
        <div>
            <EntityManager
                key={reloadKey}

                title="Seats"

                subtitle="Quản lý ghế theo sự kiện, loại ghế, trạng thái và giá."

                endpoint="/seat-service/seats"

                paginated
                initialPageSize={10}

                requestParams={
                    requestParams
                }

                defaultSortBy="id"
                defaultSortDirection="desc"

                allowCreate={false}
                allowEdit
                allowDelete

                headerActions={
                    headerActions
                }

                columns={[
                    {
                        key: "id",
                        label: "ID",
                    },
                    {
                        key: "eventId",
                        label: "Sự kiện",
                        render: (
                            seat
                        ) => (
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {getEventName(
                                        seat.eventId
                                    )}
                                </div>

                                <div className="text-xs text-slate-500">
                                    Event ID:{" "}
                                    {
                                        seat.eventId
                                    }
                                </div>
                            </div>
                        ),
                    },
                    {
                        key:
                            "seatNumber",
                        label:
                            "Số ghế",
                        render: (
                            seat
                        ) => (
                            <span className="font-black text-slate-900">
                                {
                                    seat.seatNumber
                                }
                            </span>
                        ),
                    },
                    {
                        key:
                            "seatType",
                        label:
                            "Loại ghế",
                        render: (
                            seat
                        ) => (
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getSeatTypeClass(
                                    seat.seatType
                                )}`}
                            >
                                {seat.seatType ||
                                    "STANDARD"}
                            </span>
                        ),
                    },
                    {
                        key: "status",
                        label:
                            "Trạng thái",
                        render: (
                            seat
                        ) => (
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                                    seat.status
                                )}`}
                            >
                                {seat.status ||
                                    "AVAILABLE"}
                            </span>
                        ),
                    },
                    {
                        key: "price",
                        label: "Giá",
                        render: (
                            seat
                        ) => (
                            <span className="font-bold text-green-700">
                                {formatMoney(
                                    seat.price
                                )}
                            </span>
                        ),
                    },
                ]}

                fields={[
                    {
                        name: "eventId",
                        label: "Sự kiện",
                        type: "select",
                        options:
                            eventOptions,
                        required: true,
                        placeholder:
                            "Chọn sự kiện",
                    },
                    {
                        name:
                            "seatNumber",
                        label:
                            "Số ghế",
                        required: true,
                        placeholder:
                            "Ví dụ: A1, A2, VIP01",
                    },
                    {
                        name:
                            "seatType",
                        label:
                            "Loại ghế",
                        type: "select",
                        options:
                            SEAT_TYPES,
                        defaultValue:
                            "STANDARD",
                        required: true,
                    },
                    {
                        name: "status",
                        label:
                            "Trạng thái",
                        type: "select",
                        options:
                            SEAT_STATUSES,
                        defaultValue:
                            "AVAILABLE",
                        required: true,
                    },
                    {
                        name: "price",
                        label: "Giá",
                        type: "number",
                        required: true,
                        placeholder:
                            "Ví dụ: 500000",
                    },
                ]}

                buildPayload={(
                    form
                ) => ({
                    eventId:
                        form.eventId
                            ? Number(
                                form.eventId
                            )
                            : null,

                    seatNumber:
                        form.seatNumber
                            ?.trim()
                            .toUpperCase(),

                    seatType:
                        form.seatType ||
                        "STANDARD",

                    status:
                        form.status ||
                        "AVAILABLE",

                    price:
                        form.price !==
                            undefined &&
                            form.price !==
                            null &&
                            form.price !==
                            ""
                            ? Number(
                                form.price
                            )
                            : null,
                })}

                extraActions={(
                    seat,
                    loadItems
                ) => (
                    <>
                        {seat.status !==
                            "AVAILABLE" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        changeSeatStatus(
                                            seat,
                                            "AVAILABLE",
                                            loadItems
                                        )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                                >
                                    <CheckCircle
                                        size={15}
                                    />

                                    Available
                                </button>
                            )}

                        {seat.status ===
                            "AVAILABLE" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        changeSeatStatus(
                                            seat,
                                            "RESERVED",
                                            loadItems
                                        )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-slate-950 hover:bg-yellow-600"
                                >
                                    <LockKeyhole
                                        size={15}
                                    />

                                    Reserved
                                </button>
                            )}

                        {seat.status !==
                            "BOOKED" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        changeSeatStatus(
                                            seat,
                                            "BOOKED",
                                            loadItems
                                        )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                                >
                                    <TicketCheck
                                        size={15}
                                    />

                                    Booked
                                </button>
                            )}
                    </>
                )}
            />

            {showGenerate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <form
                        onSubmit={
                            generateSeats
                        }
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-indigo-600">
                                    Generate Seats
                                </p>

                                <h2 className="text-2xl font-bold text-slate-900">
                                    Tạo ghế hàng loạt
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Ví dụ Prefix A,
                                    từ 1 đến 30 sẽ
                                    tạo A1 đến A30.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    generating
                                }
                                onClick={
                                    closeGenerateModal
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Sự kiện
                                </label>

                                <select
                                    name="eventId"
                                    value={
                                        generateForm.eventId
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">
                                        Chọn sự kiện
                                    </option>

                                    {eventOptions.map(
                                        (event) => (
                                            <option
                                                key={
                                                    event.value
                                                }
                                                value={
                                                    event.value
                                                }
                                            >
                                                {
                                                    event.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Khu / Prefix
                                </label>

                                <input
                                    name="prefix"
                                    value={
                                        generateForm.prefix
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    placeholder="A, B, VIP"
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Loại ghế
                                </label>

                                <select
                                    name="seatType"
                                    value={
                                        generateForm.seatType
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {SEAT_TYPES.map(
                                        (
                                            seatType
                                        ) => (
                                            <option
                                                key={
                                                    seatType
                                                }
                                                value={
                                                    seatType
                                                }
                                            >
                                                {
                                                    seatType
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Từ số
                                </label>

                                <input
                                    name="startNumber"
                                    type="number"
                                    min="1"
                                    value={
                                        generateForm.startNumber
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Đến số
                                </label>

                                <input
                                    name="endNumber"
                                    type="number"
                                    min="1"
                                    value={
                                        generateForm.endNumber
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Trạng thái
                                </label>

                                <select
                                    name="status"
                                    value={
                                        generateForm.status
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {SEAT_STATUSES.map(
                                        (
                                            status
                                        ) => (
                                            <option
                                                key={
                                                    status
                                                }
                                                value={
                                                    status
                                                }
                                            >
                                                {
                                                    status
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Giá
                                </label>

                                <input
                                    name="price"
                                    type="number"
                                    min="0"
                                    value={
                                        generateForm.price
                                    }
                                    onChange={
                                        handleGenerateChange
                                    }
                                    placeholder="1000000"
                                    required
                                    className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                            Kết quả dự kiến:{" "}
                            <b>
                                {generateForm.prefix
                                    .trim()
                                    .toUpperCase() ||
                                    "A"}
                                {generateForm.startNumber ||
                                    1}
                            </b>{" "}
                            đến{" "}
                            <b>
                                {generateForm.prefix
                                    .trim()
                                    .toUpperCase() ||
                                    "A"}
                                {generateForm.endNumber ||
                                    30}
                            </b>
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={
                                    generating
                                }
                                onClick={
                                    closeGenerateModal
                                }
                                className="rounded-xl border px-5 py-3 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    generating
                                }
                                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {generating
                                    ? "Đang tạo..."
                                    : "Tạo ghế"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Seats;