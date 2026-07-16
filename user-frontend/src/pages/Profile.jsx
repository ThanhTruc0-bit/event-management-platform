import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    CheckCircle2,
    Edit3,
    Home,
    Loader2,
    LogOut,
    Mail,
    Phone,
    RefreshCw,
    Save,
    ShieldCheck,
    Ticket,
    User,
    X,
} from "lucide-react";

function clearAuthStorage() {
    const authKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "jwt",
        "jwt-token",
        "user",
        "currentUser",
        "authUser",
    ];

    authKeys.forEach((key) => {
        localStorage.removeItem(key);
    });
}

function normalizeRole(role) {
    return String(role || "USER")
        .trim()
        .replace(/^ROLE_/i, "")
        .toUpperCase();
}

function getErrorMessage(
    error,
    fallback =
        "Không thực hiện được yêu cầu."
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

function normalizeProfile(data) {
    return {
        id: data.id,

        name:
            data.name ||
            "Người dùng",

        email:
            data.email ||
            "",

        phone:
            data.phone ||
            "",

        role:
            normalizeRole(
                data.role
            ),
    };
}

function saveProfileToStorage(
    profile
) {
    const storedUser = {
        userId:
            profile.id,

        id:
            profile.id,

        name:
            profile.name,

        email:
            profile.email,

        phone:
            profile.phone,

        role:
            profile.role,
    };

    localStorage.setItem(
        "user",
        JSON.stringify(
            storedUser
        )
    );

    localStorage.setItem(
        "currentUser",
        JSON.stringify(
            storedUser
        )
    );
}

function Profile() {
    const navigate =
        useNavigate();

    const [
        profile,
        setProfile,
    ] = useState(null);

    const [
        form,
        setForm,
    ] = useState({
        name: "",
        phone: "",
    });

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        loggingOut,
        setLoggingOut,
    ] = useState(false);

    const [
        editOpen,
        setEditOpen,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");

    const loadProfile =
        useCallback(async () => {
            const accessToken =
                localStorage.getItem(
                    "accessToken"
                );

            if (!accessToken) {
                clearAuthStorage();

                navigate(
                    "/login",
                    {
                        replace: true,
                    }
                );

                return;
            }

            try {
                setLoading(true);
                setError("");

                const response =
                    await axiosClient.get(
                        "/auth-service/auth/profile"
                    );

                const data =
                    response.data;

                if (
                    !data ||
                    !data.id
                ) {
                    throw new Error(
                        "API không trả thông tin người dùng hợp lệ."
                    );
                }

                const nextProfile =
                    normalizeProfile(
                        data
                    );

                setProfile(
                    nextProfile
                );

                setForm({
                    name:
                        nextProfile.name,

                    phone:
                        nextProfile.phone,
                });

                saveProfileToStorage(
                    nextProfile
                );
            } catch (
            profileError
            ) {
                console.error(
                    profileError
                );

                if (
                    profileError
                        ?.response
                        ?.status ===
                    401
                ) {
                    clearAuthStorage();

                    navigate(
                        "/login",
                        {
                            replace:
                                true,
                        }
                    );

                    return;
                }

                setError(
                    getErrorMessage(
                        profileError,
                        "Không tải được thông tin cá nhân."
                    )
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
        ]);

    useEffect(() => {
        loadProfile();
    }, [
        loadProfile,
    ]);

    const openEditModal =
        () => {
            setForm({
                name:
                    profile?.name ||
                    "",

                phone:
                    profile?.phone ||
                    "",
            });

            setError("");
            setSuccess("");
            setEditOpen(true);
        };

    const closeEditModal =
        () => {
            if (saving) {
                return;
            }

            setEditOpen(false);
        };

    const updateForm =
        (name, value) => {
            setForm(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        };

    const handleUpdateProfile =
        async (event) => {
            event.preventDefault();

            const name =
                form.name.trim();

            const phone =
                form.phone.trim();

            if (!name) {
                window.alert(
                    "Vui lòng nhập tên."
                );

                return;
            }

            if (
                name.length > 100
            ) {
                window.alert(
                    "Tên không được vượt quá 100 ký tự."
                );

                return;
            }

            if (
                phone &&
                !/^[0-9+() .-]{6,30}$/.test(
                    phone
                )
            ) {
                window.alert(
                    "Số điện thoại không hợp lệ."
                );

                return;
            }

            try {
                setSaving(true);
                setError("");
                setSuccess("");

                const response =
                    await axiosClient.put(
                        "/auth-service/auth/profile",
                        {
                            name,
                            phone:
                                phone ||
                                null,
                        }
                    );

                const nextProfile =
                    normalizeProfile(
                        response.data
                    );

                setProfile(
                    nextProfile
                );

                setForm({
                    name:
                        nextProfile.name,

                    phone:
                        nextProfile.phone,
                });

                saveProfileToStorage(
                    nextProfile
                );

                setEditOpen(false);

                setSuccess(
                    "Cập nhật thông tin cá nhân thành công."
                );
            } catch (
            updateError
            ) {
                console.error(
                    updateError
                );

                if (
                    updateError
                        ?.response
                        ?.status ===
                    401
                ) {
                    clearAuthStorage();

                    navigate(
                        "/login",
                        {
                            replace:
                                true,
                        }
                    );

                    return;
                }

                setError(
                    getErrorMessage(
                        updateError,
                        "Không cập nhật được thông tin cá nhân."
                    )
                );
            } finally {
                setSaving(false);
            }
        };

    const handleLogout =
        async () => {
            const refreshToken =
                localStorage.getItem(
                    "refreshToken"
                );

            try {
                setLoggingOut(true);

                if (
                    refreshToken
                ) {
                    await axiosClient.post(
                        "/auth-service/auth/logout",
                        {
                            refreshToken,
                        }
                    );
                }
            } catch (
            logoutError
            ) {
                console.error(
                    "Không gọi được API logout:",
                    logoutError
                );
            } finally {
                clearAuthStorage();

                navigate(
                    "/login",
                    {
                        replace: true,
                    }
                );

                setLoggingOut(false);
            }
        };

    if (
        loading &&
        !profile
    ) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-14">
                <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                    <Loader2
                        size={34}
                        className="mx-auto mb-3 animate-spin"
                    />

                    Đang tải thông tin cá nhân...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <section className="bg-slate-950 text-white">
                <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                                <User
                                    size={16}
                                />

                                Tài khoản
                            </div>

                            <h1 className="mt-5 text-4xl font-black md:text-5xl">
                                Thông tin cá nhân
                            </h1>

                            <p className="mt-3 text-slate-300">
                                Quản lý thông tin tài khoản đang đăng nhập.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={
                                    loadProfile
                                }
                                disabled={
                                    loading
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-slate-950 hover:bg-slate-100 disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={18}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Tải lại
                            </button>

                            {profile && (
                                <button
                                    type="button"
                                    onClick={
                                        openEditModal
                                    }
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-white hover:bg-emerald-600"
                                >
                                    <Edit3
                                        size={18}
                                    />

                                    Chỉnh sửa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
                {error && (
                    <div className="mb-6 flex gap-3 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
                        <AlertCircle
                            size={21}
                            className="mt-0.5 shrink-0"
                        />

                        <div className="font-bold">
                            {error}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 flex gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                        <CheckCircle2
                            size={21}
                            className="mt-0.5 shrink-0"
                        />

                        <div className="font-bold">
                            {success}
                        </div>
                    </div>
                )}

                {profile && (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 p-8 text-white">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/40 bg-white/20">
                                    <User
                                        size={56}
                                    />
                                </div>

                                <div>
                                    <h2 className="text-3xl font-black md:text-4xl">
                                        {
                                            profile.name
                                        }
                                    </h2>

                                    <p className="mt-2 text-white/90">
                                        {
                                            profile.email
                                        }
                                    </p>

                                    <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700">
                                        {
                                            profile.role
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            <h3 className="mb-6 text-2xl font-black text-slate-950">
                                Chi tiết tài khoản
                            </h3>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <InfoCard
                                    icon={
                                        <User
                                            size={
                                                22
                                            }
                                        />
                                    }
                                    label="User ID"
                                    value={
                                        profile.id
                                    }
                                />

                                <InfoCard
                                    icon={
                                        <Mail
                                            size={
                                                22
                                            }
                                        />
                                    }
                                    label="Email"
                                    value={
                                        profile.email
                                    }
                                />

                                <InfoCard
                                    icon={
                                        <Phone
                                            size={
                                                22
                                            }
                                        />
                                    }
                                    label="Số điện thoại"
                                    value={
                                        profile.phone ||
                                        "Chưa cập nhật"
                                    }
                                />

                                <InfoCard
                                    icon={
                                        <ShieldCheck
                                            size={
                                                22
                                            }
                                        />
                                    }
                                    label="Vai trò"
                                    value={
                                        profile.role
                                    }
                                />
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    to="/my-bookings"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-black text-white hover:bg-black"
                                >
                                    <Ticket
                                        size={18}
                                    />

                                    Đơn đặt vé
                                </Link>

                                <Link
                                    to="/my-tickets"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-white hover:bg-emerald-600"
                                >
                                    <Ticket
                                        size={18}
                                    />

                                    Vé QR
                                </Link>

                                <Link
                                    to="/"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-slate-800 hover:bg-slate-200"
                                >
                                    <Home
                                        size={18}
                                    />

                                    Trang chủ
                                </Link>

                                <button
                                    type="button"
                                    onClick={
                                        handleLogout
                                    }
                                    disabled={
                                        loggingOut
                                    }
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                                >
                                    {loggingOut ? (
                                        <Loader2
                                            size={
                                                18
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <LogOut
                                            size={
                                                18
                                            }
                                        />
                                    )}

                                    {loggingOut
                                        ? "Đang đăng xuất..."
                                        : "Đăng xuất"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <form
                        onSubmit={
                            handleUpdateProfile
                        }
                        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={
                                closeEditModal
                            }
                            disabled={
                                saving
                            }
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                            <X
                                size={19}
                            />
                        </button>

                        <h2 className="pr-12 text-2xl font-black text-slate-950">
                            Chỉnh sửa thông tin
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Bạn có thể thay đổi tên và số điện thoại.
                        </p>

                        <div className="mt-6 space-y-4">
                            <FormInput
                                label="Tên người dùng"
                                value={
                                    form.name
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateForm(
                                        "name",
                                        value
                                    )
                                }
                                maxLength={
                                    100
                                }
                                required
                            />

                            <FormInput
                                label="Số điện thoại"
                                value={
                                    form.phone
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateForm(
                                        "phone",
                                        value
                                    )
                                }
                                maxLength={
                                    30
                                }
                                placeholder="Ví dụ: 0901234567"
                            />

                            <div>
                                <div className="mb-2 text-sm font-bold text-slate-700">
                                    Email
                                </div>

                                <input
                                    value={profile?.email || ""}
                                    disabled
                                    style={{
                                        color: "#64748b",
                                        WebkitTextFillColor: "#64748b",
                                        opacity: 1,
                                    }}
                                    className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-500 disabled:opacity-100"
                                />

                                <div className="mt-2 text-xs text-slate-500">
                                    Email không được thay đổi tại đây.
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={
                                    closeEditModal
                                }
                                disabled={
                                    saving
                                }
                                className="h-11 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    saving
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save
                                        size={
                                            17
                                        }
                                    />
                                )}

                                {saving
                                    ? "Đang lưu..."
                                    : "Lưu thay đổi"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function InfoCard({
    icon,
    label,
    value,
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    {icon}
                </div>

                <div className="min-w-0">
                    <div className="text-sm text-slate-500">
                        {label}
                    </div>

                    <div className="mt-1 wrap-break-word font-black text-slate-950">
                        {value ||
                            "Chưa cập nhật"}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FormInput({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    required = false,
    maxLength,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </span>

            <input
                type={type}
                value={value}
                placeholder={placeholder}
                required={required}
                maxLength={maxLength}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                style={{
                    color: "#0f172a",
                    WebkitTextFillColor: "#0f172a",
                    caretColor: "#059669",
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

export default Profile;