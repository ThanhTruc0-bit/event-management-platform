import EntityManager from "../components/EntityManager";

function EventCategories() {
    return (
        <EntityManager
            title="Event Categories"
            subtitle="Quản lý danh mục sự kiện: Âm nhạc, Hội thảo, Workshop, Fan Meeting, Phim ảnh."
            endpoint="/event-service/event-categories"
            columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "slug", label: "Slug" },
                {
                    key: "description",
                    label: "Description",
                    render: (c) => (
                        <span className="line-clamp-2 text-slate-600">
                            {c.description || ""}
                        </span>
                    ),
                },
                {
                    key: "status",
                    label: "Status",
                    render: (c) => (
                        <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${c.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                        >
                            {c.status || "ACTIVE"}
                        </span>
                    ),
                },
                { key: "createdAt", label: "Created At" },
            ]}
            fields={[
                {
                    name: "name",
                    label: "Name",
                    required: true,
                    placeholder: "Ví dụ: Âm nhạc",
                },
                {
                    name: "slug",
                    label: "Slug",
                    placeholder: "Để trống backend tự tạo",
                },
                {
                    name: "description",
                    label: "Description",
                    type: "textarea",
                    placeholder: "Mô tả danh mục",
                },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    options: ["ACTIVE", "INACTIVE"],
                    defaultValue: "ACTIVE",
                },
            ]}
        />
    );
}

export default EventCategories;