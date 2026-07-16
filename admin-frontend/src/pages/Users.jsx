import { useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import EntityManager from "../components/EntityManager";
import {
    Loader2,
    ShieldCheck,
    Trash2,
} from "lucide-react";

function normalizeRole(value) {
    return String(value || "USER")
        .trim()
        .replace(/^ROLE_/i, "")
        .toUpperCase();
}

function getCurrentUserId() {
    const keys = [
        "user",
        "currentUser",
        "authUser",
    ];

    for (const key of keys) {
        try {
            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const parsed =
                JSON.parse(raw);

            const user =
                parsed?.user ||
                parsed;

            const value =
                user?.userId ??
                user?.id;

            const id =
                Number(value);

            if (
                Number.isInteger(id) &&
                id > 0
            ) {
                return id;
            }
        } catch {
            // Bỏ qua dữ liệu localStorage không hợp lệ.
        }
    }

    return null;
}

function getErrorMessage(
    error,
    fallback
) {
    const data =
        error?.response?.data;

    if (
        typeof data === "string"
    ) {
        return data;
    }

    return (
        data?.message ||
        data?.error ||
        error?.message ||
        fallback
    );
}

function Users() {
    const [
        roleFilter,
        setRoleFilter,
    ] = useState("");

    const [
        sortBy,
        setSortBy,
    ] = useState("id");

    const [
        sortDirection,
        setSortDirection,
    ] = useState("desc");

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    const currentUserId =
        useMemo(
            () =>
                getCurrentUserId(),
            []
        );

    const requestParams =
        useMemo(
            () => ({
                role:
                    roleFilter ||
                    undefined,

                sortBy,

                sortDirection,
            }),
            [
                roleFilter,
                sortBy,
                sortDirection,
            ]
        );

    const deleteUser =
        async (
            user,
            reloadItems
        ) => {
            if (
                Number(user?.id) ===
                Number(
                    currentUserId
                )
            ) {
                window.alert(
                    "Bạn không thể xóa tài khoản đang đăng nhập."
                );

                return;
            }

            if (
                !window.confirm(
                    `Bạn chắc chắn muốn xóa người dùng ${user?.name ||
                    user?.id
                    }?`
                )
            ) {
                return;
            }

            try {
                setDeletingId(
                    user.id
                );

                await axiosClient.delete(
                    `/user-service/users/${user.id}`
                );

                window.alert(
                    "Đã xóa người dùng."
                );

                await reloadItems();
            } catch (error) {
                window.alert(
                    getErrorMessage(
                        error,
                        "Không xóa được người dùng."
                    )
                );
            } finally {
                setDeletingId(null);
            }
        };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={roleFilter}
                onChange={(event) =>
                    setRoleFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả vai trò
                </option>

                <option value="USER">
                    USER
                </option>

                <option value="ADMIN">
                    ADMIN
                </option>
            </select>

            <select
                value={sortBy}
                onChange={(event) =>
                    setSortBy(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="id">
                    Sắp xếp: ID
                </option>

                <option value="name">
                    Sắp xếp: Tên
                </option>

                <option value="email">
                    Sắp xếp: Email
                </option>

                <option value="phone">
                    Sắp xếp: Số điện thoại
                </option>

                <option value="role">
                    Sắp xếp: Vai trò
                </option>
            </select>

            <select
                value={
                    sortDirection
                }
                onChange={(event) =>
                    setSortDirection(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="desc">
                    Giảm dần
                </option>

                <option value="asc">
                    Tăng dần
                </option>
            </select>
        </div>
    );

    return (
        <EntityManager
            title="Người dùng"
            subtitle="Quản lý tài khoản, email, số điện thoại và vai trò người dùng."
            endpoint="/user-service/users"
            paginated
            initialPageSize={10}
            requestParams={
                requestParams
            }
            defaultSortBy="id"
            defaultSortDirection="desc"
            headerActions={
                headerActions
            }
            allowDelete={false}
            columns={[
                {
                    key: "id",
                    label: "ID",
                },
                {
                    key: "name",
                    label: "Tên",
                    render: (user) => (
                        <div>
                            <div className="font-bold text-slate-900">
                                {user.name ||
                                    "Chưa cập nhật"}
                            </div>

                            {Number(
                                user.id
                            ) ===
                                Number(
                                    currentUserId
                                ) && (
                                    <div className="mt-1 text-xs font-bold text-emerald-600">
                                        Tài khoản hiện tại
                                    </div>
                                )}
                        </div>
                    ),
                },
                {
                    key: "email",
                    label: "Email",
                },
                {
                    key: "phone",
                    label:
                        "Số điện thoại",
                    render: (user) =>
                        user.phone || (
                            <span className="text-slate-400">
                                Chưa cập nhật
                            </span>
                        ),
                },
                {
                    key: "role",
                    label: "Vai trò",
                    render: (user) => {
                        const role =
                            normalizeRole(
                                user.role
                            );

                        return (
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${role ===
                                    "ADMIN"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-blue-100 text-blue-700"
                                    }`}
                            >
                                <ShieldCheck
                                    size={14}
                                />

                                {role}
                            </span>
                        );
                    },
                },
            ]}
            fields={[
                {
                    name: "name",
                    label: "Tên",
                    required: true,
                    placeholder:
                        "Nhập tên người dùng",
                },
                {
                    name: "email",
                    label: "Email",
                    type: "email",
                    required: true,
                    placeholder:
                        "example@gmail.com",
                },
                {
                    name: "phone",
                    label:
                        "Số điện thoại",
                    placeholder:
                        "0901234567",
                },
                {
                    name: "password",
                    label: "Mật khẩu",
                    type: "password",
                    required: true,
                    hideOnEdit: true,
                    placeholder:
                        "Tối thiểu 6 ký tự",
                },
                {
                    name: "role",
                    label: "Vai trò",
                    type: "select",
                    required: true,
                    options: [
                        "USER",
                        "ADMIN",
                    ],
                    defaultValue:
                        "USER",
                },
            ]}
            buildPayload={(
                form,
                editingItem
            ) => {
                const payload = {
                    name:
                        form.name?.trim(),

                    email:
                        form.email
                            ?.trim()
                            .toLowerCase(),

                    phone:
                        form.phone
                            ?.trim() ||
                        null,

                    role:
                        normalizeRole(
                            form.role
                        ),
                };

                if (!editingItem) {
                    payload.password =
                        form.password;
                }

                return payload;
            }}
            extraActions={(
                user,
                reloadItems
            ) => {
                const isCurrentUser =
                    Number(user.id) ===
                    Number(
                        currentUserId
                    );

                if (isCurrentUser) {
                    return null;
                }

                return (
                    <button
                        type="button"
                        disabled={
                            deletingId ===
                            user.id
                        }
                        onClick={() =>
                            deleteUser(
                                user,
                                reloadItems
                            )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {deletingId ===
                            user.id ? (
                            <Loader2
                                size={15}
                                className="animate-spin"
                            />
                        ) : (
                            <Trash2
                                size={15}
                            />
                        )}

                        Xóa
                    </button>
                );
            }}
        />
    );
}

export default Users;