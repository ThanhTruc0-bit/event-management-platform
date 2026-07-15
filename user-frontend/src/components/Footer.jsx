import { Link } from "react-router-dom";
import {
    CalendarDays,
    QrCode,
    ShieldCheck,
    Ticket,
} from "lucide-react";

function Footer() {
    return (
        <footer className="bg-[#08090b] text-white border-t border-white/10 mt-20">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                                <Ticket size={22} />
                            </div>

                            <div>
                                <div className="text-xl font-black">
                                    EventBox
                                </div>

                                <div className="text-xs text-slate-400">
                                    Event Management Platform
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-slate-400 mt-4 max-w-xl leading-6">
                            Hệ thống đặt vé sự kiện, chọn ghế, thanh toán VNPay
                            và nhận vé QR để check-in tại cổng sự kiện.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                                <CalendarDays size={20} className="text-emerald-400" />
                                <div className="font-black mt-3">Sự kiện</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Concert, workshop, fan meeting
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                                <ShieldCheck size={20} className="text-emerald-400" />
                                <div className="font-black mt-3">Thanh toán</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    VNPay Sandbox
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                                <QrCode size={20} className="text-emerald-400" />
                                <div className="font-black mt-3">Vé QR</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Check-in bằng mã QR
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-black mb-4">Chức năng</h3>

                        <div className="space-y-3 text-sm text-slate-400">
                            <Link to="/events" className="block hover:text-white">
                                Xem sự kiện
                            </Link>
                            <Link to="/my-bookings" className="block hover:text-white">
                                Đơn đặt vé
                            </Link>
                            <Link to="/my-tickets" className="block hover:text-white">
                                Vé QR của tôi
                            </Link>
                            <Link to="/profile" className="block hover:text-white">
                                Tài khoản
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-black mb-4">Dự án</h3>

                        <div className="space-y-3 text-sm text-slate-400">
                            <div>Spring Boot Microservices</div>
                            <div>ReactJS + Vite</div>
                            <div>MySQL + Eureka</div>
                            <div>API Gateway</div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-10 pt-6 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        © 2026 EventBox. Website quản lý và bán vé sự kiện.
                    </div>

                    <div>
                        Booking → Payment → Ticket QR → Check-in
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;