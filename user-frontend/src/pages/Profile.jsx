import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    CalendarDays,
    Home,
    Loader2,
    LogOut,
    Mail,
    Phone,
    RefreshCw,
    ShieldCheck,
    Ticket,
    User,
} from "lucide-react";

function Profile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isValidValue = (value) => {
        return value !== null && value !== undefined && value !== "";
    };

    const cleanObject = (obj) => {
        if (!obj || typeof obj !== "object") return {};

        const result = {};

        Object.keys(obj).forEach((key) => {
            if (isValidValue(obj[key])) {
                result[key] = obj[key];
            }
        });

        return result;
    };

    const mergeUserData = (...users) => {
        return users.reduce((result, user) => {
            return {
                ...result,
                ...cleanObject(user),
            };
        }, {});
    };

    const normalizeEmail = (email) => {
        return String(email || "").trim().toLowerCase();
    };

    const getToken = () => {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("jwt") ||
            ""
        );
    };

    const decodeJwt = (token) => {
        try {
            if (!token || !token.includes(".")) return null;

            const payload = token.split(".")[1];
            const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

            const json = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((char) => {
                        return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
                    })
                    .join("")
            );

            return JSON.parse(json);
        } catch {
            return null;
        }
    };

    const buildUserFromToken = (token) => {
        const payload = decodeJwt(token);

        if (!payload) return null;

        return {
            id: payload.id || payload.userId || payload.sub,
            name:
                payload.name ||
                payload.fullName ||
                payload.username ||
                payload.email ||
                "Người dùng",
            username: payload.username,
            email: payload.email,
            phone: payload.phone,
            role: payload.role || payload.roles || "USER",
            createdAt: payload.createdAt || payload.createdDate || payload.created_at,
        };
    };

    const getSavedUser = () => {
        const userKeys = ["user", "currentUser", "authUser"];

        for (const key of userKeys) {
            try {
                const raw = localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);

                if (user) {
                    return user?.user || user;
                }
            } catch {
                // bỏ qua localStorage sai format
            }
        }

        return null;
    };

    const getRegisteredUser = (email) => {
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) return null;

        const directKeys = [
            `registeredUser:${email}`,
            `registeredUser:${normalizedEmail}`,
        ];

        for (const key of directKeys) {
            try {
                const raw = localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);

                if (normalizeEmail(user?.email) === normalizedEmail) {
                    return user;
                }
            } catch {
                // bỏ qua localStorage sai format
            }
        }

        try {
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);

                if (!key || !key.startsWith("registeredUser:")) continue;

                const raw = localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);

                if (normalizeEmail(user?.email) === normalizedEmail) {
                    return user;
                }
            }
        } catch {
            return null;
        }

        return null;
    };

    const getUserId = (user) => {
        return user?.id || user?.userId || user?.sub || user?.user?.id;
    };

    const normalizeProfileData = (data) => {
        if (!data) return null;

        return data?.data || data?.user || data?.profile || data;
    };

    const requestFirstSuccess = async (urls) => {
        let lastError = null;

        for (const url of urls) {
            try {
                const res = await axiosClient.get(url);
                return normalizeProfileData(res.data);
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError;
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError("");

            const token = getToken();
            const savedUser = getSavedUser();
            const tokenUser = buildUserFromToken(token);

            const email =
                savedUser?.email ||
                tokenUser?.email ||
                savedUser?.username ||
                "";

            const registeredUser = getRegisteredUser(email);

            const localProfile = mergeUserData(
                registeredUser,
                tokenUser,
                savedUser,
                {
                    email: email || savedUser?.email || tokenUser?.email,
                    role:
                        savedUser?.role ||
                        savedUser?.roles ||
                        tokenUser?.role ||
                        registeredUser?.role ||
                        "USER",
                }
            );

            if (!token && !localProfile?.email) {
                setError("Bạn cần đăng nhập để xem thông tin cá nhân.");
                navigate("/login");
                return;
            }

            setProfile(localProfile);

            const userId = getUserId(localProfile);

            const urls = [
                "/auth-service/auth/me",
                "/auth-service/me",
                "/user-service/users/me",
            ];

            if (userId) {
                urls.push(`/user-service/users/${userId}`);
            }

            try {
                const serverProfile = await requestFirstSuccess(urls);

                const finalProfile = mergeUserData(
                    registeredUser,
                    tokenUser,
                    savedUser,
                    serverProfile
                );

                setProfile(finalProfile);
                localStorage.setItem("user", JSON.stringify(finalProfile));
                localStorage.setItem("currentUser", JSON.stringify(finalProfile));
            } catch {
                setProfile(localProfile);
                localStorage.setItem("user", JSON.stringify(localProfile));
                localStorage.setItem("currentUser", JSON.stringify(localProfile));
            }
        } catch (err) {
            console.error(err);
            setError("Không tải được thông tin cá nhân.");
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        localStorage.removeItem("authUser");
        localStorage.removeItem("currentUser");

        navigate("/login");
    };

    const formatDate = (value) => {
        if (!value) return "Đang cập nhật";

        return String(value).replace("T", " ");
    };

    const getProfileName = () => {
        return (
            profile?.name ||
            profile?.fullName ||
            profile?.username ||
            profile?.email ||
            "Người dùng"
        );
    };

    const getProfileEmail = () => {
        return profile?.email || "Đang cập nhật";
    };

    const getProfilePhone = () => {
        return profile?.phone || profile?.phoneNumber || "Đang cập nhật";
    };

    const getProfileRole = () => {
        const role = profile?.role || profile?.roles || profile?.authorities;

        if (Array.isArray(role)) {
            return role.join(", ");
        }

        return role || "USER";
    };

    const getProfileUsername = () => {
        return profile?.username || "Đang cập nhật";
    };

    const getProfileId = () => {
        return getUserId(profile) || "Đang cập nhật";
    };

    if (loading && !profile) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-14">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
                    <Loader2 size={34} className="mx-auto animate-spin mb-3" />
                    Đang tải thông tin cá nhân...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <section className="bg-slate-950 text-white">
                <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-black">
                                <User size={16} />
                                Tài khoản
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black mt-5">
                                Thông tin cá nhân
                            </h1>

                            <p className="text-slate-300 mt-3">
                                Xem thông tin user đang đăng nhập trong hệ thống đặt vé.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadProfile}
                            className="h-12 px-5 rounded-2xl bg-white text-slate-950 font-black hover:bg-slate-100 inline-flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Reload
                        </button>
                    </div>
                </div>
            </section>

            <section className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
                {error && (
                    <div className="mb-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 p-5 flex gap-3">
                        <AlertCircle size={21} className="shrink-0 mt-0.5" />
                        <div className="font-bold">{error}</div>
                    </div>
                )}

                <div className="bg-white rounded-4xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-linear-to-br from-emerald-500 to-cyan-500 p-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="h-28 w-28 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                                <User size={56} />
                            </div>

                            <div>
                                <h2 className="text-3xl md:text-4xl font-black">
                                    {getProfileName()}
                                </h2>

                                <p className="text-white/90 mt-2">
                                    {getProfileEmail()}
                                </p>

                                <div className="inline-flex mt-4 px-4 py-2 rounded-full bg-white text-emerald-700 font-black text-sm">
                                    {getProfileRole()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <h3 className="text-2xl font-black text-slate-950 mb-6">
                            Chi tiết tài khoản
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoCard
                                icon={<User size={22} />}
                                label="User ID"
                                value={getProfileId()}
                            />

                            <InfoCard
                                icon={<ShieldCheck size={22} />}
                                label="Username"
                                value={getProfileUsername()}
                            />

                            <InfoCard
                                icon={<Mail size={22} />}
                                label="Email"
                                value={getProfileEmail()}
                            />

                            <InfoCard
                                icon={<Phone size={22} />}
                                label="Số điện thoại"
                                value={getProfilePhone()}
                            />

                            <InfoCard
                                icon={<ShieldCheck size={22} />}
                                label="Vai trò"
                                value={getProfileRole()}
                            />

                            <InfoCard
                                icon={<CalendarDays size={22} />}
                                label="Ngày tạo"
                                value={formatDate(
                                    profile?.createdAt ||
                                    profile?.createdDate ||
                                    profile?.created_at
                                )}
                            />
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to="/my-bookings"
                                className="h-12 px-5 rounded-2xl bg-slate-950 text-white font-black hover:bg-black inline-flex items-center justify-center gap-2"
                            >
                                <Ticket size={18} />
                                Đơn đặt vé
                            </Link>

                            <Link
                                to="/my-tickets"
                                className="h-12 px-5 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                            >
                                <Ticket size={18} />
                                Vé QR
                            </Link>

                            <Link
                                to="/"
                                className="h-12 px-5 rounded-2xl bg-slate-100 text-slate-800 font-black hover:bg-slate-200 inline-flex items-center justify-center gap-2"
                            >
                                <Home size={18} />
                                Trang chủ
                            </Link>

                            <button
                                type="button"
                                onClick={logout}
                                className="h-12 px-5 rounded-2xl bg-red-50 text-red-700 font-black hover:bg-red-100 inline-flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} />
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {icon}
                </div>

                <div className="min-w-0">
                    <div className="text-sm text-slate-500">{label}</div>

                    <div className="font-black text-slate-950 mt-1 wrap-break-word">
                        {value || "Đang cập nhật"}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;