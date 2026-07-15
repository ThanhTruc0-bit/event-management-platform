import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
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

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    if (data?._embedded) {
        const firstArray = Object.values(data._embedded).find((value) =>
            Array.isArray(value)
        );

        if (firstArray) {
            return firstArray;
        }
    }

    if (data && typeof data === "object" && data.id !== undefined) {
        return [data];
    }

    return [];
}

function getOptionValue(option) {
    if (option && typeof option === "object") {
        return option.value ?? option.id ?? option.name ?? "";
    }

    return option ?? "";
}

function getOptionLabel(option) {
    if (option && typeof option === "object") {
        return option.label ?? option.name ?? option.value ?? "";
    }

    return option ?? "";
}

function normalizeOptions(options = []) {
    const map = new Map();

    options.forEach((option) => {
        const value = getOptionValue(option);
        const label = getOptionLabel(option);

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            map.set(String(value), {
                value: String(value),
                label: String(label || value),
            });
        }
    });

    return Array.from(map.values());
}

function getErrorMessage(error, fallback) {
    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        fallback
    );
}

function EntityManager({
    title,
    subtitle,
    endpoint,
    createEndpoint,
    columns,
    fields,
    buildPayload,
    allowCreate = true,
    allowEdit = true,
    allowDelete = true,
    extraActions,
    headerActions,
    onAfterSave,

    // Phân trang server
    paginated = false,
    initialPageSize = 10,
    requestParams = {},
    defaultSortBy = "id",
    defaultSortDirection = "desc",
}) {
    const [items, setItems] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [debouncedKeyword, setDebouncedKeyword] = useState("");

    const [form, setForm] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const safeItems = Array.isArray(items) ? items : [];

    const requestParamsKey = useMemo(
        () => JSON.stringify(requestParams || {}),
        [requestParams]
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword.trim());
        }, 400);

        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        if (paginated) {
            setPage(0);
        }
    }, [debouncedKeyword, requestParamsKey, paginated]);

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        endpoint,
        page,
        pageSize,
        debouncedKeyword,
        requestParamsKey,
        paginated,
    ]);

    const filteredItems = useMemo(() => {
        if (paginated) {
            return safeItems;
        }

        const normalizedKeyword = keyword.trim().toLowerCase();

        if (!normalizedKeyword) {
            return safeItems;
        }

        return safeItems.filter((item) => {
            const text = Object.values(item || {})
                .join(" ")
                .toLowerCase();

            return text.includes(normalizedKeyword);
        });
    }, [safeItems, keyword, paginated]);

    const makeEmptyForm = () => {
        const object = {};

        fields.forEach((field) => {
            if (field.type === "file") {
                object[field.name] = null;
            } else {
                object[field.name] = field.defaultValue ?? "";
            }
        });

        return object;
    };

    const loadItems = async () => {
        try {
            setLoading(true);
            setError("");

            const params = paginated
                ? {
                    page,
                    size: pageSize,
                    sortBy: defaultSortBy,
                    sortDirection: defaultSortDirection,
                    ...(debouncedKeyword
                        ? { keyword: debouncedKeyword }
                        : {}),
                    ...requestParams,
                }
                : requestParams;

            const response = await axiosClient.get(endpoint, {
                params,
            });

            const list = normalizeList(response.data);

            setItems(list);

            if (paginated) {
                setTotalPages(Number(response.data?.totalPages || 0));
                setTotalElements(Number(response.data?.totalElements || 0));
            } else {
                setTotalPages(list.length > 0 ? 1 : 0);
                setTotalElements(list.length);
            }
        } catch (error) {
            console.error(error);

            setItems([]);
            setTotalPages(0);
            setTotalElements(0);

            setError(
                getErrorMessage(
                    error,
                    "Không tải được dữ liệu. Kiểm tra API Gateway hoặc service."
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingItem(null);
        setForm(makeEmptyForm());
        setError("");
        setShowModal(true);
    };

    const openEdit = (item) => {
        const object = {};

        fields.forEach((field) => {
            if (field.type === "file") {
                object[field.name] = null;
                return;
            }

            let value =
                item?.[field.name] ??
                field.defaultValue ??
                "";

            if (field.type === "datetime-local" && value) {
                value = String(value).slice(0, 16);
            }

            if (field.type === "select" && typeof value === "boolean") {
                value = String(value);
            }

            object[field.name] = value;
        });

        setEditingItem(item);
        setForm(object);
        setError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setForm(makeEmptyForm());
        setError("");
    };

    const handleChange = (event) => {
        const {
            name,
            type,
            files,
            value,
        } = event.target;

        if (type === "file") {
            setForm((previous) => ({
                ...previous,
                [name]: files?.[0] || null,
            }));

            return;
        }

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const defaultBuildPayload = () => {
        const payload = {};

        fields.forEach((field) => {
            if (field.type === "file") {
                return;
            }

            if (field.hideOnEdit && editingItem) {
                return;
            }

            if (field.hideOnCreate && !editingItem) {
                return;
            }

            const value = form[field.name];

            if (field.type === "number") {
                payload[field.name] =
                    value === "" ? null : Number(value);
            } else {
                payload[field.name] = value;
            }
        });

        return payload;
    };

    const saveItem = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");

            const payload = buildPayload
                ? buildPayload(form, editingItem)
                : defaultBuildPayload();

            let response;

            if (editingItem) {
                response = await axiosClient.put(
                    `${endpoint}/${editingItem.id}`,
                    payload
                );
            } else {
                response = await axiosClient.post(
                    createEndpoint || endpoint,
                    payload
                );
            }

            const savedItem =
                response?.data || editingItem;

            if (onAfterSave) {
                await onAfterSave(
                    savedItem,
                    form,
                    editingItem
                );
            }

            alert(
                editingItem
                    ? "Cập nhật thành công"
                    : "Thêm mới thành công"
            );

            closeModal();

            if (!editingItem && paginated) {
                setPage(0);
            }

            await loadItems();
        } catch (error) {
            console.error(error);

            setError(
                getErrorMessage(
                    error,
                    "Không lưu được dữ liệu. Kiểm tra dữ liệu nhập."
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (id) => {
        const accepted = window.confirm(
            "Bạn có chắc muốn xóa dòng này không?"
        );

        if (!accepted) {
            return;
        }

        try {
            setError("");

            await axiosClient.delete(
                `${endpoint}/${id}`
            );

            alert("Xóa thành công");

            if (
                paginated &&
                items.length === 1 &&
                page > 0
            ) {
                setPage((previous) => previous - 1);
            } else {
                await loadItems();
            }
        } catch (error) {
            console.error(error);

            setError(
                getErrorMessage(
                    error,
                    "Không xóa được dữ liệu."
                )
            );
        }
    };

    const renderCell = (item, column) => {
        if (column.render) {
            return column.render(item);
        }

        const value = item?.[column.key];

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return (
                <span className="text-slate-400">
                    NULL
                </span>
            );
        }

        return String(value);
    };

    const visibleFields = fields.filter((field) => {
        if (field.hideOnEdit && editingItem) {
            return false;
        }

        if (field.hideOnCreate && !editingItem) {
            return false;
        }

        return true;
    });

    const canGoPrevious = page > 0;
    const canGoNext =
        totalPages > 0 && page < totalPages - 1;

    return (
        <div>
            <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-blue-600 font-semibold">
                        Admin / {title}
                    </p>

                    <h1 className="text-3xl font-bold text-slate-900 mt-1">
                        {title}
                    </h1>

                    <p className="text-slate-500 mt-2">
                        {subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {headerActions}

                    {allowCreate && (
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
                        >
                            <Plus size={18} />
                            Thêm mới
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-5 py-4">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="w-full max-w-md flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-3">
                        <Search
                            size={18}
                            className="text-slate-400"
                        />

                        <input
                            value={keyword}
                            onChange={(event) =>
                                setKeyword(event.target.value)
                            }
                            placeholder={`Tìm kiếm ${title.toLowerCase()}...`}
                            className="bg-transparent outline-none text-sm flex-1"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={loadItems}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-black disabled:opacity-60"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        {loading
                            ? "Đang tải..."
                            : "Reload"}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 text-sm">
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className="px-5 py-4 whitespace-nowrap"
                                    >
                                        {column.label}
                                    </th>
                                ))}

                                <th className="px-5 py-4 text-right whitespace-nowrap">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading &&
                                filteredItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            columns.length + 1
                                        }
                                        className="px-5 py-10 text-center text-slate-500"
                                    >
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(
                                    (item, index) => (
                                        <tr
                                            key={
                                                item.id ??
                                                index
                                            }
                                            className="border-t hover:bg-blue-50/30"
                                        >
                                            {columns.map(
                                                (column) => (
                                                    <td
                                                        key={
                                                            column.key
                                                        }
                                                        className="px-5 py-4 align-top max-w-90 text-sm text-slate-700"
                                                    >
                                                        {renderCell(
                                                            item,
                                                            column
                                                        )}
                                                    </td>
                                                )
                                            )}

                                            <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                                                {extraActions &&
                                                    extraActions(
                                                        item,
                                                        loadItems
                                                    )}

                                                {allowEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                item
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                                                    >
                                                        <Pencil
                                                            size={
                                                                15
                                                            }
                                                        />
                                                        Sửa
                                                    </button>
                                                )}

                                                {allowDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteItem(
                                                                item.id
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                                                    >
                                                        <Trash2
                                                            size={
                                                                15
                                                            }
                                                        />
                                                        Xóa
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )
                            )}

                            {!loading &&
                                filteredItems.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                columns.length +
                                                1
                                            }
                                            className="px-5 py-10 text-center text-slate-500"
                                        >
                                            Không có dữ liệu.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>

                {paginated && (
                    <div className="border-t px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-sm text-slate-600">
                            Tổng cộng{" "}
                            <strong>
                                {totalElements}
                            </strong>{" "}
                            bản ghi
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={pageSize}
                                onChange={(event) => {
                                    setPageSize(
                                        Number(
                                            event.target.value
                                        )
                                    );
                                    setPage(0);
                                }}
                                className="border rounded-lg px-3 py-2 text-sm"
                            >
                                <option value={5}>
                                    5 / trang
                                </option>
                                <option value={10}>
                                    10 / trang
                                </option>
                                <option value={12}>
                                    12 / trang
                                </option>
                                <option value={20}>
                                    20 / trang
                                </option>
                                <option value={50}>
                                    50 / trang
                                </option>
                            </select>

                            <button
                                type="button"
                                disabled={
                                    !canGoPrevious ||
                                    loading
                                }
                                onClick={() =>
                                    setPage(
                                        (previous) =>
                                            previous - 1
                                    )
                                }
                                className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                            >
                                <ChevronLeft
                                    size={18}
                                />
                            </button>

                            <span className="text-sm font-semibold text-slate-700">
                                Trang{" "}
                                {totalPages === 0
                                    ? 0
                                    : page + 1}{" "}
                                / {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    !canGoNext ||
                                    loading
                                }
                                onClick={() =>
                                    setPage(
                                        (previous) =>
                                            previous + 1
                                    )
                                }
                                className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                            >
                                <ChevronRight
                                    size={18}
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <form
                        onSubmit={saveItem}
                        className="bg-white w-[760px] max-w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-blue-600 font-semibold">
                                    {editingItem
                                        ? "Cập nhật"
                                        : "Tạo mới"}
                                </p>

                                <h2 className="text-2xl font-bold text-slate-900">
                                    {editingItem
                                        ? `Sửa ${title}`
                                        : `Thêm ${title}`}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleFields.map((field) => {
                                const fieldClass =
                                    field.type ===
                                        "textarea" ||
                                        field.type === "file"
                                        ? "md:col-span-2"
                                        : "";

                                const options =
                                    normalizeOptions(
                                        field.options || []
                                    );

                                return (
                                    <div
                                        key={field.name}
                                        className={
                                            fieldClass
                                        }
                                    >
                                        <label className="text-sm font-semibold text-slate-700">
                                            {field.label}
                                        </label>

                                        {field.type ===
                                            "select" ? (
                                            <select
                                                name={
                                                    field.name
                                                }
                                                value={
                                                    form[
                                                    field
                                                        .name
                                                    ] ?? ""
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required={
                                                    field.required
                                                }
                                                className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">
                                                    {field.placeholder ||
                                                        "Chọn dữ liệu"}
                                                </option>

                                                {options.map(
                                                    (
                                                        option
                                                    ) => (
                                                        <option
                                                            key={`${field.name}-${option.value}`}
                                                            value={
                                                                option.value
                                                            }
                                                        >
                                                            {
                                                                option.label
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        ) : field.type ===
                                            "textarea" ? (
                                            <textarea
                                                name={
                                                    field.name
                                                }
                                                value={
                                                    form[
                                                    field
                                                        .name
                                                    ] ?? ""
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required={
                                                    field.required
                                                }
                                                rows={5}
                                                placeholder={
                                                    field.placeholder
                                                }
                                                className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : field.type ===
                                            "file" ? (
                                            <div>
                                                <input
                                                    name={
                                                        field.name
                                                    }
                                                    type="file"
                                                    accept={
                                                        field.accept ||
                                                        "*"
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    required={
                                                        field.required
                                                    }
                                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                                />

                                                {form[
                                                    field.name
                                                ]?.name && (
                                                        <p className="text-sm text-blue-600 mt-2">
                                                            File đã
                                                            chọn:{" "}
                                                            {
                                                                form[
                                                                    field
                                                                        .name
                                                                ]
                                                                    .name
                                                            }
                                                        </p>
                                                    )}

                                                {field.helper && (
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        {
                                                            field.helper
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                name={
                                                    field.name
                                                }
                                                type={
                                                    field.type ||
                                                    "text"
                                                }
                                                value={
                                                    form[
                                                    field
                                                        .name
                                                    ] ?? ""
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required={
                                                    field.required
                                                }
                                                placeholder={
                                                    field.placeholder
                                                }
                                                min={
                                                    field.min
                                                }
                                                max={
                                                    field.max
                                                }
                                                step={
                                                    field.step
                                                }
                                                className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}

                                        {field.helper &&
                                            field.type !==
                                            "file" && (
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {
                                                        field.helper
                                                    }
                                                </p>
                                            )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-5 py-3 rounded-xl border hover:bg-slate-100"
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving
                                    ? "Đang lưu..."
                                    : "Lưu"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default EntityManager;