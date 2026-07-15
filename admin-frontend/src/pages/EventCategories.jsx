import {
    useMemo,
    useState,
} from "react";

import EntityManager from "../components/EntityManager";

function EventCategories() {
    const [statusFilter, setStatusFilter] =
        useState("");

    const requestParams =
        useMemo(() => {
            const params = {};

            if (statusFilter) {
                params.status =
                    statusFilter;
            }

            return params;
        }, [statusFilter]);

    const headerActions = (
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

            <option value="ACTIVE">
                ACTIVE
            </option>

            <option value="INACTIVE">
                INACTIVE
            </option>
        </select>
    );

    return (
        <EntityManager
            title="Danh mục sự kiện"
            subtitle="Quản lý các danh mục như Âm nhạc, Hội thảo, Workshop, Fan Meeting và Thể thao."
            endpoint="/event-service/event-categories"
            paginated
            initialPageSize={10}
            requestParams={
                requestParams
            }
            defaultSortBy="name"
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
                        "Tên danh mục",
                },
                {
                    key: "slug",
                    label: "Slug",
                },
                {
                    key: "description",
                    label: "Mô tả",
                    render: (
                        category
                    ) => (
                        <span className="line-clamp-2 text-slate-600">
                            {category.description ||
                                ""}
                        </span>
                    ),
                },
                {
                    key: "status",
                    label:
                        "Trạng thái",
                    render: (
                        category
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${category.status ===
                                "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                        >
                            {category.status ||
                                "ACTIVE"}
                        </span>
                    ),
                },
                {
                    key: "createdAt",
                    label: "Ngày tạo",
                    render: (
                        category
                    ) =>
                        category.createdAt
                            ? new Date(
                                category.createdAt
                            ).toLocaleString(
                                "vi-VN"
                            )
                            : "NULL",
                },
                {
                    key: "updatedAt",
                    label:
                        "Ngày cập nhật",
                    render: (
                        category
                    ) =>
                        category.updatedAt
                            ? new Date(
                                category.updatedAt
                            ).toLocaleString(
                                "vi-VN"
                            )
                            : "NULL",
                },
            ]}
            fields={[
                {
                    name: "name",
                    label:
                        "Tên danh mục",
                    required: true,
                    placeholder:
                        "Ví dụ: Âm nhạc",
                },
                {
                    name: "slug",
                    label: "Slug",
                    placeholder:
                        "Để trống để backend tự tạo",
                },
                {
                    name: "description",
                    label: "Mô tả",
                    type: "textarea",
                    placeholder:
                        "Nhập mô tả danh mục",
                },
                {
                    name: "status",
                    label:
                        "Trạng thái",
                    type: "select",
                    options: [
                        "ACTIVE",
                        "INACTIVE",
                    ],
                    defaultValue:
                        "ACTIVE",
                    required: true,
                },
            ]}
            buildPayload={(
                form
            ) => ({
                name:
                    form.name?.trim(),

                slug:
                    form.slug?.trim() ||
                    null,

                description:
                    form.description?.trim() ||
                    null,

                status:
                    form.status ||
                    "ACTIVE",
            })}
        />
    );
}

export default EventCategories;