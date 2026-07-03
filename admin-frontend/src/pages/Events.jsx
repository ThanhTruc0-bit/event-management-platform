import { useEffect, useMemo, useState } from "react";
import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

function Events() {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await axiosClient.get("/event-service/event-categories");
            const list = Array.isArray(res.data) ? res.data : [];

            setCategories(list.filter((c) => c.status === "ACTIVE"));
        } catch (err) {
            console.error(err);
            setCategories([]);
        }
    };

    const categoryOptions = useMemo(() => {
        return categories
            .map((c) => c.name)
            .filter(Boolean)
            .filter((name, index, arr) => arr.indexOf(name) === index);
    }, [categories]);

    const uploadBanner = async (eventId, file) => {
        if (!eventId || !file) return;

        const formData = new FormData();
        formData.append("file", file);

        await axiosClient.post(
            `/event-service/events/${eventId}/upload-banner`,
            formData,
            {
                headers: {
                    "X-User-Role": "ADMIN",
                    "Content-Type": "multipart/form-data",
                },
            }
        );
    };

    return (
        <EntityManager
            title="Events"
            subtitle="Quản lý sự kiện: tên, mô tả, địa điểm, danh mục, thời gian, banner, trạng thái."
            endpoint="/event-service/events"
            columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                {
                    key: "description",
                    label: "Description",
                    render: (e) => (
                        <span className="line-clamp-2 text-slate-600">
                            {e.description || ""}
                        </span>
                    ),
                },
                { key: "location", label: "Location" },
                {
                    key: "category",
                    label: "Category",
                    render: (e) => (
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                            {e.category || "NULL"}
                        </span>
                    ),
                },
                {
                    key: "eventDate",
                    label: "Event Date",
                    render: (e) =>
                        e.eventDate ? String(e.eventDate).replace("T", " ") : "NULL",
                },
                {
                    key: "banner",
                    label: "Banner",
                    render: (e) =>
                        e.banner ? (
                            <div className="space-y-2">
                                <img
                                    src={e.banner}
                                    alt={e.name || "Event banner"}
                                    className="h-16 w-28 object-cover rounded-xl border"
                                />

                                <a
                                    href={e.banner}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-blue-600 text-xs hover:underline max-w-40 truncate"
                                >
                                    Xem ảnh
                                </a>
                            </div>
                        ) : (
                            <span className="text-slate-400">NULL</span>
                        ),
                },
                {
                    key: "status",
                    label: "Status",
                    render: (e) => (
                        <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${e.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : e.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : e.status === "DRAFT"
                                        ? "bg-slate-100 text-slate-700"
                                        : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {e.status || "DRAFT"}
                        </span>
                    ),
                },
            ]}
            fields={[
                {
                    name: "name",
                    label: "Name",
                    required: true,
                    placeholder: "Ví dụ: Concert sinh viên 2026",
                },
                {
                    name: "description",
                    label: "Description",
                    type: "textarea",
                    placeholder: "Mô tả sự kiện",
                },
                {
                    name: "location",
                    label: "Location",
                    required: true,
                    placeholder: "Ví dụ: Nhà văn hóa Thanh Niên TP.HCM",
                },
                {
                    name: "category",
                    label: "Category",
                    type: "select",
                    options: categoryOptions,
                    defaultValue: "",
                    placeholder:
                        categoryOptions.length > 0
                            ? "Chọn danh mục sự kiện"
                            : "Chưa có danh mục, hãy thêm bên Event Categories",
                },
                {
                    name: "eventDate",
                    label: "Event Date",
                    type: "datetime-local",
                    required: true,
                },
                {
                    name: "bannerFile",
                    label: "Banner Image",
                    type: "file",
                    accept: "image/*",
                    helper:
                        "Chọn ảnh banner tại đây. Khi bấm Lưu, hệ thống sẽ lưu sự kiện trước rồi upload banner sau.",
                },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    options: ["DRAFT", "ACTIVE", "INACTIVE", "CANCELLED"],
                    defaultValue: "ACTIVE",
                    placeholder: "Chọn trạng thái",
                },
            ]}
            buildPayload={(form) => {
                return {
                    name: form.name,
                    description: form.description,
                    location: form.location,
                    category: form.category,
                    eventDate: form.eventDate,
                    status: form.status || "ACTIVE",
                };
            }}
            onAfterSave={async (savedItem, form) => {
                if (form.bannerFile && savedItem?.id) {
                    await uploadBanner(savedItem.id, form.bannerFile);
                }
            }}
        />
    );
}

export default Events;