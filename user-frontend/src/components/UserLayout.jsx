import { Link, NavLink, useNavigate } from "react-router-dom";
import {
    CalendarDays,
    Home,
    LogOut,
    Menu,
    Ticket,
    UserRound,
    WalletCards,
} from "lucide-react";

function UserLayout({ children }) {
    const navigate = useNavigate();

    const userRaw = localStorage.getItem("user");

    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const navClass = ({ isActive }) =>
        `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${isActive
            ? "bg-blue-600 text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
        }`;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                            <Ticket size={23} />
                        </div>

                        <div>
                            <div className="text-xl font-bold text-slate-900">
                                TicketBox User
                            </div>
                            <div className="text-xs text-slate-500">
                                Đặt vé sự kiện trực tuyến
                            </div>
                        </div>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-2">
                        <NavLink to="/" className={navClass}>
                            <Home size={17} />
                            Trang chủ
                        </NavLink>

                        <NavLink to="/events" className={navClass}>
                            <CalendarDays size={17} />
                            Sự kiện
                        </NavLink>

                        <NavLink to="/my-bookings" className={navClass}>
                            <WalletCards size={17} />
                            Đơn của tôi
                        </NavLink>

                        <NavLink to="/my-tickets" className={navClass}>
                            <Ticket size={17} />
                            Vé QR
                        </NavLink>
                    </nav>

                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200"
                                >
                                    <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                        <UserRound size={18} />
                                    </div>

                                    <div className="text-sm">
                                        <div className="font-semibold text-slate-900 max-w-32 truncate">
                                            {user.name || user.email || "User"}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            localhost:5174
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    onClick={logout}
                                    className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                                >
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Đăng nhập
                                </Link>

                                <Link
                                    to="/register"
                                    className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Đăng ký
                                </Link>
                            </div>
                        )}

                        <button className="lg:hidden h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <footer className="bg-slate-950 text-white mt-16">
                <div className="max-w-7xl mx-auto px-5 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="text-lg font-bold">TicketBox User</div>
                        <div className="text-sm text-slate-400 mt-1">
                            Hệ thống đặt vé sự kiện bằng Spring Boot Microservices.
                        </div>
                    </div>

                    <div className="text-sm text-slate-400">
                        Event · Booking · Payment · Ticket QR
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default UserLayout;