import {
    useEffect,
    useMemo,
    useState,
} from "react";

import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

const EVENT_STATUS_OPTIONS = [
    "DRAFT",
    "UPCOMING",
    "OPEN",
    "SOLD_OUT",
    "CLOSED",
    "COMPLETED",
    "CANCELLED",
];

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    return [];
}

function getBannerUrl(banner) {
    if (!banner) {
        return "";
    }

    if (
        banner.startsWith(
            "http://"
        ) ||
        banner.startsWith(
            "https://"
        )
    ) {
        return banner;
    }

    if (
        banner.startsWith(
            "/uploads/"
        )
    ) {
        return `/api/event-service${banner}`;
    }

    return banner;
}

function formatDateTime(value) {
    if (!value) {
        return "NULL";
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
        ).replace("T", " ");
    }

    return date.toLocaleString(
        "vi-VN"
    );
}

function Events() {
    const [
        categories,
        setCategories,
    ] = useState([]);

    const [
        categoryFilter,
        setCategoryFilter,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("");

    const [
        featuredFilter,
        setFeaturedFilter,
    ] = useState("");

    const [
        locationFilter,
        setLocationFilter,
    ] = useState("");

    useEffect(() => {
        loadCategories();
    }, []);

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
            } catch (error) {
                console.error(error);
                setCategories([]);
            }
        };

    const categoryOptions =
        useMemo(() => {
            return categories.map(
                (category) => ({
                    value:
                        category.id,

                    label:
                        category.name,
                })
            );
        }, [categories]);

    const categoryMap =
        useMemo(() => {
            return new Map(
                categories.map(
                    (category) => [
                        Number(
                            category.id
                        ),
                        category.name,
                    ]
                )
            );
        }, [categories]);

    const requestParams =
        useMemo(() => {
            const params = {
                publicOnly: false,
            };

            if (categoryFilter) {
                params.categoryId =
                    Number(
                        categoryFilter
                    );
            }

            if (statusFilter) {
                params.status =
                    statusFilter;
            }

            if (
                featuredFilter !==
                ""
            ) {
                params.featured =
                    featuredFilter ===
                    "true";
            }

            if (
                locationFilter.trim()
            ) {
                params.location =
                    locationFilter.trim();
            }

            return params;
        }, [
            categoryFilter,
            statusFilter,
            featuredFilter,
            locationFilter,
        ]);

    const uploadBanner =
        async (
            eventId,
            file
        ) => {
            if (!eventId || !file) {
                return;
            }

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            await axiosClient.post(
                `/event-service/events/${eventId}/upload-banner`,
                formData
            );
        };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={
                    categoryFilter
                }
                onChange={(event) =>
                    setCategoryFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả danh mục
                </option>

                {categoryOptions.map(
                    (category) => (
                        <option
                            key={
                                category.value
                            }
                            value={
                                category.value
                            }
                        >
                            {
                                category.label
                            }
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

                {EVENT_STATUS_OPTIONS.map(
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

            <select
                value={
                    featuredFilter
                }
                onChange={(event) =>
                    setFeaturedFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả nổi bật
                </option>

                <option value="true">
                    Nổi bật
                </option>

                <option value="false">
                    Không nổi bật
                </option>
            </select>

            <input
                value={locationFilter}
                onChange={(event) =>
                    setLocationFilter(
                        event.target.value
                    )
                }
                placeholder="Lọc địa điểm"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />
        </div>
    );

    return (
        <EntityManager
            title="Sự kiện"
            subtitle="Quản lý danh mục, thời gian mở bán, banner, số vé và trạng thái sự kiện."
            endpoint="/event-service/events"
            paginated
            initialPageSize={10}
            requestParams={
                requestParams
            }
            defaultSortBy="eventDate"
            defaultSortDirection="asc"
            headerActions={
                headerActions
            }
            columns={[
                {
                    key: "id",
                    label: "ID",
                },
                {
                    key: "name",
                    label:
                        "Tên sự kiện",
                },
                {
                    key: "description",
                    label: "Mô tả",
                    render: (
                        event
                    ) => (
                        <span className="line-clamp-2 max-w-80 text-slate-600">
                            {event.description ||
                                ""}
                        </span>
                    ),
                },
                {
                    key: "location",
                    label:
                        "Địa điểm",
                },
                {
                    key: "categoryId",
                    label:
                        "Danh mục",
                    render: (
                        event
                    ) => (
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                            {event.categoryName ||
                                categoryMap.get(
                                    Number(
                                        event.categoryId
                                    )
                                ) ||
                                `ID ${event.categoryId}`}
                        </span>
                    ),
                },
                {
                    key: "eventDate",
                    label:
                        "Thời gian",
                    render: (
                        event
                    ) =>
                        formatDateTime(
                            event.eventDate
                        ),
                },
                {
                    key: "saleStartAt",
                    label:
                        "Mở bán",
                    render: (
                        event
                    ) =>
                        formatDateTime(
                            event.saleStartAt
                        ),
                },
                {
                    key: "saleEndAt",
                    label:
                        "Đóng bán",
                    render: (
                        event
                    ) =>
                        formatDateTime(
                            event.saleEndAt
                        ),
                },
                {
                    key: "banner",
                    label: "Banner",
                    render: (
                        event
                    ) => {
                        const bannerUrl =
                            getBannerUrl(
                                event.banner
                            );

                        return bannerUrl ? (
                            <div className="space-y-2">
                                <img
                                    src={
                                        bannerUrl
                                    }
                                    alt={
                                        event.name ||
                                        "Event banner"
                                    }
                                    className="h-16 w-28 rounded-xl border object-cover"
                                />

                                <a
                                    href={
                                        bannerUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block max-w-40 truncate text-xs text-blue-600 hover:underline"
                                >
                                    Xem ảnh
                                </a>
                            </div>
                        ) : (
                            <span className="text-slate-400">
                                Chưa có ảnh
                            </span>
                        );
                    },
                },
                {
                    key: "minPrice",
                    label:
                        "Giá từ",
                    render: (
                        event
                    ) =>
                        event.minPrice ==
                            null
                            ? "Chưa có vé"
                            : `${Number(
                                event.minPrice
                            ).toLocaleString(
                                "vi-VN"
                            )} đ`,
                },
                {
                    key: "availableSeats",
                    label:
                        "Vé còn lại",
                    render: (
                        event
                    ) =>
                        `${Number(
                            event.availableSeats ||
                            0
                        )}/${Number(
                            event.totalSeats ||
                            0
                        )}`,
                },
                {
                    key: "featured",
                    label:
                        "Nổi bật",
                    render: (
                        event
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${event.featured
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                                }`}
                        >
                            {event.featured
                                ? "Có"
                                : "Không"}
                        </span>
                    ),
                },
                {
                    key: "status",
                    label:
                        "Trạng thái",
                    render: (
                        event
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${event.status ===
                                "OPEN"
                                ? "bg-green-100 text-green-700"
                                : event.status ===
                                    "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : event.status ===
                                        "DRAFT"
                                        ? "bg-slate-100 text-slate-700"
                                        : event.status ===
                                            "SOLD_OUT"
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {event.status ||
                                "DRAFT"}
                        </span>
                    ),
                },
            ]}
            fields={[
                {
                    name: "name",
                    label:
                        "Tên sự kiện",
                    required: true,
                    placeholder:
                        "Ví dụ: Concert sinh viên 2026",
                },
                {
                    name: "description",
                    label: "Mô tả",
                    type: "textarea",
                    placeholder:
                        "Nhập nội dung giới thiệu sự kiện",
                },
                {
                    name: "location",
                    label:
                        "Địa điểm",
                    required: true,
                    placeholder:
                        "Ví dụ: Nhà văn hóa Thanh Niên TP.HCM",
                },
                {
                    name: "categoryId",
                    label:
                        "Danh mục",
                    type: "select",
                    required: true,
                    options:
                        categoryOptions,
                    defaultValue: "",
                },
                {
                    name: "eventDate",
                    label:
                        "Thời gian diễn ra",
                    type:
                        "datetime-local",
                    required: true,
                },
                {
                    name: "saleStartAt",
                    label:
                        "Bắt đầu mở bán",
                    type:
                        "datetime-local",
                },
                {
                    name: "saleEndAt",
                    label:
                        "Kết thúc mở bán",
                    type:
                        "datetime-local",
                },
                {
                    name: "featured",
                    label:
                        "Sự kiện nổi bật",
                    type: "select",
                    options: [
                        {
                            value: "false",
                            label: "Không",
                        },
                        {
                            value: "true",
                            label: "Có",
                        },
                    ],
                    defaultValue:
                        "false",
                },
                {
                    name: "bannerFile",
                    label:
                        "Ảnh banner",
                    type: "file",
                    accept:
                        "image/jpeg,image/png,image/webp",
                    helper:
                        "Lưu sự kiện trước, sau đó hệ thống tự upload banner.",
                },
                {
                    name: "status",
                    label:
                        "Trạng thái",
                    type: "select",
                    options:
                        EVENT_STATUS_OPTIONS,
                    defaultValue:
                        "DRAFT",
                    required: true,
                },
            ]}
            buildPayload={(
                form
            ) => ({
                name:
                    form.name?.trim(),

                description:
                    form.description?.trim() ||
                    null,

                location:
                    form.location?.trim(),

                categoryId:
                    form.categoryId ===
                        ""
                        ? null
                        : Number(
                            form.categoryId
                        ),

                eventDate:
                    form.eventDate ||
                    null,

                saleStartAt:
                    form.saleStartAt ||
                    null,

                saleEndAt:
                    form.saleEndAt ||
                    null,

                featured:
                    String(
                        form.featured
                    ) === "true",

                status:
                    form.status ||
                    "DRAFT",
            })}
            onAfterSave={async (
                savedItem,
                form
            ) => {
                if (
                    form.bannerFile &&
                    savedItem?.id
                ) {
                    await uploadBanner(
                        savedItem.id,
                        form.bannerFile
                    );
                }
            }}
        />
    );
}

export default Events;