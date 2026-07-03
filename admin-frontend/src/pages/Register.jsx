import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    UserPlus,
    Mail,
    Lock,
    Phone,
    User,
    Loader2,
    ShieldCheck,
} from "lucide-react";
import axiosClient from "../api/axiosClient";

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "ADMIN",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await axiosClient.post("/auth-service/auth/register", form);

            setSuccess("Đăng ký thành công. Đang chuyển sang trang đăng nhập...");

            setTimeout(() => {
                navigate("/login");
            }, 900);
        } catch (err) {
            console.error(err);
            setError("Đăng ký thất bại. Email có thể đã tồn tại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
                <section className="hidden lg:block rounded-3xl bg-linear-to-br from-emerald-600 via-teal-600 to-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
                    <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-white/10" />

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
                                <ShieldCheck size={30} />
                            </div>

                            <p className="text-emerald-100 text-sm font-semibold mb-3">
                                Create Admin Account
                            </p>

                            <h1 className="text-4xl font-bold leading-tight">
                                Tạo tài khoản cho hệ thống quản trị
                            </h1>

                            <p className="mt-4 text-emerald-100 leading-7">
                                Đăng ký tài khoản thông qua Auth Service. Dữ liệu người dùng
                                được lưu ở User Service và password được mã hóa BCrypt.
                            </p>
                        </div>

                        <div className="space-y-3 text-sm text-emerald-100">
                            <p>✅ Auth Service nhận request đăng ký</p>
                            <p>✅ Gọi User Service bằng OpenFeign</p>
                            <p>✅ Có thể tạo tài khoản ADMIN để vào trang quản trị</p>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <UserPlus size={25} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    Đăng ký
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Tạo tài khoản mới cho hệ thống
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Họ tên
                                </label>

                                <div className="relative">
                                    <User
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Admin"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="admin@gmail.com"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Số điện thoại
                                </label>

                                <div className="relative">
                                    <Phone
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="0900000001"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Mật khẩu
                                </label>

                                <div className="relative">
                                    <Lock
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="123456"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Vai trò
                                </label>

                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="w-full h-12 rounded-xl border border-slate-300 px-4 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="USER">USER</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                Đăng ký
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            Đã có tài khoản?{" "}
                            <Link to="/login" className="text-emerald-600 font-semibold">
                                Đăng nhập
                            </Link>
                        </div>

                        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                            Với bài demo, có thể tạo ADMIN tại đây để đăng nhập vào trang
                            quản trị.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Register;