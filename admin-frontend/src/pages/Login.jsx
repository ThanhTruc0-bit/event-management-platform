import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, Loader2, ShieldCheck } from "lucide-react";
import axiosClient from "../api/axiosClient";

function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await axiosClient.post("/auth-service/auth/login", form);

            const { accessToken, refreshToken, userId, email, role } = res.data;

            if (!accessToken) {
                setError("Đăng nhập thành công nhưng API không trả accessToken.");
                return;
            }

            if (role !== "ADMIN") {
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");

                setError("Tài khoản này không phải ADMIN nên không thể vào trang quản trị.");
                return;
            }

            localStorage.removeItem("token");

            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            localStorage.setItem(
                "user",
                JSON.stringify({
                    userId,
                    email,
                    role,
                })
            );

            navigate("/");
        } catch (err) {
            console.error(err);
            setError("Email hoặc mật khẩu không đúng.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
                <section className="hidden lg:block rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
                    <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-white/10" />

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
                                <ShieldCheck size={30} />
                            </div>

                            <p className="text-indigo-100 text-sm font-semibold mb-3">
                                Ticket Management System
                            </p>

                            <h1 className="text-4xl font-bold leading-tight">
                                Đăng nhập hệ thống quản trị đặt vé
                            </h1>

                            <p className="mt-4 text-indigo-100 leading-7">
                                Hệ thống sử dụng Auth Service, JWT Access Token,
                                Refresh Token và Redis để xác thực tài khoản.
                            </p>
                        </div>

                        <div className="space-y-3 text-sm text-indigo-100">
                            <p>✅ Login qua auth-service</p>
                            <p>✅ Chỉ tài khoản ADMIN mới vào được quản trị</p>
                            <p>✅ FE tự gửi Authorization Bearer Token</p>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <LogIn size={25} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    Đăng nhập
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Nhập tài khoản ADMIN để vào trang quản trị
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
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
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
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
                                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                Đăng nhập
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            Chưa có tài khoản?{" "}
                            <Link to="/register" className="text-indigo-600 font-semibold">
                                Đăng ký tài khoản ADMIN
                            </Link>
                        </div>

                        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                            Trang quản trị chỉ cho phép tài khoản có role ADMIN truy cập.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Login;