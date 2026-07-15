import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    LogOut,
    Menu,
    PlusCircle,
    Search,
    Ticket,
    UserRound,
    X,
} from "lucide-react";

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const [keyword, setKeyword] = useState("");
    const [openMenu, setOpenMenu] = useState(false);

    const user = useMemo(() => {
        const userKeys = ["user", "currentUser", "authUser"];

        for (const key of userKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;

                const data = JSON.parse(raw);
                return data?.user || data;
            } catch {
                // bỏ qua localStorage lỗi format
            }
        }

        return null;
    }, [location.pathname]);

    const userRole = String(
        user?.role || user?.roles || user?.userRole || "USER"
    ).toUpperCase();

    const isAdmin = userRole === "ADMIN" || userRole === "ORGANIZER";

    const displayName =
        user?.name ||
        user?.fullName ||
        user?.username ||
        user?.email ||
        "Người dùng";

    useEffect(() => {
        setOpenMenu(false);
    }, [location.pathname]);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        localStorage.removeItem("authUser");
        localStorage.removeItem("currentUser");

        setOpenMenu(false);
        navigate("/login");
    };

    const handleSearch = (e) => {
        e.preventDefault();

        const value = keyword.trim();
        setOpenMenu(false);

        if (!value) {
            navigate("/events");
            return;
        }

        navigate(`/events?keyword=${encodeURIComponent(value)}`);
    };

    const navItems = [
        { label: "Trang chủ", to: "/" },
        { label: "Sự kiện", to: "/events" },
        { label: "Đơn của tôi", to: "/my-bookings" },
        { label: "Vé QR", to: "/my-tickets" },
    ];

    const navClass = ({ isActive }) =>
        `text-sm font-black transition ${isActive ? "text-emerald-300" : "text-slate-300 hover:text-white"
        }`;

    const mobileNavClass = ({ isActive }) =>
        `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${isActive
            ? "bg-emerald-400 text-slate-950"
            : "text-slate-200 hover:bg-white/[0.08]"
        }`;

    return (
        <header className="sticky top-0 z-50 bg-[#0b0d10]/95 backdrop-blur border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                <div className="h-19 flex items-center justify-between gap-5">
                    <Link to="/" className="flex items-center gap-3 shrink-0">
                        <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
                            <Ticket size={23} />
                        </div>

                        <div className="leading-tight">
                            <div className="text-xl font-black tracking-tight">
                                EventBox
                            </div>

                            <div className="text-xs text-slate-400 mt-0.5">
                                Đặt vé sự kiện trực tuyến
                            </div>
                        </div>
                    </Link>

                    <form
                        onSubmit={handleSearch}
                        className="hidden lg:flex flex-1 max-w-2xl items-center gap-3 bg-white/8 rounded-full px-4 py-3 border border-white/10 focus-within:border-emerald-400/60 focus-within:bg-white/12 transition"
                    >
                        <Search size={19} className="text-slate-400" />

                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm kiếm sự kiện, ca nhạc, workshop..."
                            className="bg-transparent outline-none flex-1 text-sm text-white placeholder:text-slate-500"
                        />

                        <button
                            type="submit"
                            className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600"
                        >
                            Tìm
                        </button>
                    </form>

                    <nav className="hidden xl:flex items-center gap-6 shrink-0">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className={navClass}>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3 shrink-0">
                        {isAdmin ? (
                            <Link
                                to="/admin/events"
                                className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-400 text-slate-950 text-sm font-black hover:bg-amber-300"
                            >
                                <LayoutDashboard size={17} />
                                Quản trị
                            </Link>
                        ) : (
                            <Link
                                to="/events"
                                className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600"
                            >
                                <PlusCircle size={17} />
                                Mua vé
                            </Link>
                        )}

                        {user ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/8 hover:bg-white/12 border border-white/10 max-w-48"
                                >
                                    <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <UserRound size={18} />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-sm truncate font-black text-white">
                                            {displayName}
                                        </div>

                                        <div className="text-[11px] text-slate-400 -mt-0.5">
                                            {userRole}
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    type="button"
                                    onClick={logout}
                                    className="h-10 w-10 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20"
                                    title="Đăng xuất"
                                >
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-black text-slate-200 hover:bg-white/8"
                                >
                                    Đăng nhập
                                </Link>

                                <Link
                                    to="/register"
                                    className="px-4 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600"
                                >
                                    Đăng ký
                                </Link>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setOpenMenu((value) => !value)}
                            className="xl:hidden h-10 w-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/12"
                            aria-label="Mở menu"
                        >
                            {openMenu ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={handleSearch}
                    className="lg:hidden mb-4 flex items-center gap-3 bg-white/8 rounded-full px-4 py-3 border border-white/10 focus-within:border-emerald-400/60 transition"
                >
                    <Search size={19} className="text-slate-400" />

                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Tìm kiếm sự kiện..."
                        className="bg-transparent outline-none flex-1 text-sm text-white placeholder:text-slate-500"
                    />

                    <button
                        type="submit"
                        className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-black"
                    >
                        Tìm
                    </button>
                </form>

                {openMenu && (
                    <div className="xl:hidden pb-4">
                        <div className="bg-[#171b22] rounded-[28px] border border-white/10 shadow-xl p-3">
                            <div className="space-y-1">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={mobileNavClass}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>

                            <div className="border-t border-white/10 my-3"></div>

                            {isAdmin ? (
                                <Link
                                    to="/admin/events"
                                    className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-amber-400 text-slate-950 text-sm font-black"
                                >
                                    <LayoutDashboard size={18} />
                                    Vào trang quản trị
                                </Link>
                            ) : (
                                <Link
                                    to="/events"
                                    className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-emerald-500 text-white text-sm font-black"
                                >
                                    <PlusCircle size={18} />
                                    Mua vé ngay
                                </Link>
                            )}

                            {user ? (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/8 text-white text-sm font-black"
                                    >
                                        <UserRound size={18} />
                                        Hồ sơ cá nhân
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-red-500/10 text-red-300 text-sm font-black"
                                    >
                                        <LogOut size={18} />
                                        Đăng xuất
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <Link
                                        to="/login"
                                        className="text-center rounded-2xl px-4 py-3 bg-white/8 text-white text-sm font-black"
                                    >
                                        Đăng nhập
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="text-center rounded-2xl px-4 py-3 bg-emerald-500 text-white text-sm font-black"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;