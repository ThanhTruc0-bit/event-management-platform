import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Armchair,
    Ticket,
    ReceiptText,
    ListOrdered,
    CreditCard,
    Bell,
    LogIn,
    FolderTree,
} from "lucide-react";

function Sidebar() {
    const menu = [
        { path: "/", label: "Dashboard", icon: LayoutDashboard },
        { path: "/users", label: "Users", icon: Users },
        { path: "/events", label: "Events", icon: CalendarDays },
        { path: "/event-categories", label: "Event Categories", icon: FolderTree },
        { path: "/seats", label: "Seats", icon: Armchair },
        { path: "/tickets", label: "Tickets", icon: Ticket },
        { path: "/bookings", label: "Bookings", icon: ReceiptText },
        { path: "/booking-items", label: "Booking Items", icon: ListOrdered },
        { path: "/payments", label: "Payments", icon: CreditCard },
        { path: "/notifications", label: "Notifications", icon: Bell },
        { path: "/login", label: "Login", icon: LogIn },
    ];

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${isActive
            ? "bg-blue-600 text-white shadow"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`;

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-950 text-white z-30">
            <div className="px-6 py-6 border-b border-slate-800">
                <div className="text-2xl font-bold tracking-tight">TicketBox</div>
                <div className="text-sm text-slate-400 mt-1">Admin Console</div>
            </div>

            <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-100px)]">
                {menu.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink key={item.path} to={item.path} className={linkClass}>
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}

export default Sidebar;