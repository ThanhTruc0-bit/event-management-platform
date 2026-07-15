import { useState } from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    AlertCircle,
    ArrowRight,
    Loader2,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    Ticket,
    User,
} from "lucide-react";

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (typeof data === "string") {
        return data;
    }

    return (
        data?.message ||
        data?.error ||
        error?.message ||
        "Đăng ký thất bại. Kiểm tra Auth Service."
    );
}

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const handleChange = (event) => {
        const { name, value } =
            event.target;

        setForm((previousForm) => ({
            ...previousForm,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            return "Vui lòng nhập họ tên.";
        }

        if (!form.email.trim()) {
            return "Vui lòng nhập email.";
        }

        if (!form.email.includes("@")) {
            return "Email không hợp lệ.";
        }

        if (!form.password) {
            return "Vui lòng nhập mật khẩu.";
        }

        if (form.password.length < 6) {
            return "Mật khẩu phải có ít nhất 6 ký tự.";
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            return "Mật khẩu nhập lại không khớp.";
        }

        return "";
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const validationMessage =
            validateForm();

        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        try {
            setLoading(true);

            const payload = {
                name: form.name.trim(),
                email: form.email
                    .trim()
                    .toLowerCase(),
                phone:
                    form.phone.trim() ||
                    null,
                password:
                    form.password,
            };

            /*
             * Không gửi role.
             * Backend luôn tự gán role USER.
             */
            await axiosClient.post(
                "/auth-service/auth/register",
                payload
            );

            setSuccess(
                "Đăng ký thành công. Đang chuyển sang trang đăng nhập..."
            );

            setTimeout(() => {
                navigate("/login", {
                    replace: true,
                });
            }, 1000);
        } catch (registerError) {
            console.error(registerError);

            setError(
                getErrorMessage(
                    registerError
                )
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[34px] overflow-hidden border border-slate-200 shadow-sm">
                <div className="hidden lg:flex bg-slate-950 text-white p-10 flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
                    <div className="absolute left-10 bottom-10 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />

                    <div className="relative">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center">
                            <Ticket size={28} />
                        </div>

                        <h2 className="text-4xl font-black mt-8 leading-tight">
                            Tạo tài khoản đặt vé
                        </h2>

                        <p className="text-slate-300 mt-4 leading-7">
                            Đăng ký để chọn ghế, thanh toán VNPay và nhận vé QR check-in.
                        </p>
                    </div>

                    <div className="relative space-y-4">
                        <Feature text="Đặt vé nhanh chóng" />
                        <Feature text="Thanh toán VNPay" />
                        <Feature text="Nhận vé QR điện tử" />
                    </div>
                </div>

                <div className="p-6 md:p-10">
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-black">
                            <User size={16} />
                            Đăng ký tài khoản
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-950 mt-5">
                            Đăng ký
                        </h1>

                        <p className="text-slate-500 mt-2">
                            Tài khoản đăng ký mới sẽ có quyền USER.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 flex gap-3">
                            <AlertCircle
                                size={20}
                                className="shrink-0 mt-0.5"
                            />

                            <div className="text-sm font-bold">
                                {error}
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 flex gap-3">
                            <ShieldCheck
                                size={20}
                                className="shrink-0 mt-0.5"
                            />

                            <div className="text-sm font-bold">
                                {success}
                            </div>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <Input
                            icon={<User size={19} />}
                            label="Họ tên"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Nguyễn Văn A"
                            autoComplete="name"
                        />

                        <Input
                            icon={<Mail size={19} />}
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                            autoComplete="email"
                        />

                        <Input
                            icon={<Phone size={19} />}
                            label="Số điện thoại"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="0901234567"
                            autoComplete="tel"
                            required={false}
                        />

                        <Input
                            icon={<Lock size={19} />}
                            label="Mật khẩu"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Ít nhất 6 ký tự"
                            autoComplete="new-password"
                        />

                        <Input
                            icon={<Lock size={19} />}
                            label="Nhập lại mật khẩu"
                            name="confirmPassword"
                            type="password"
                            value={
                                form.confirmPassword
                            }
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu"
                            autoComplete="new-password"
                        />

                        <button
                            type="submit"
                            disabled={loading || Boolean(success)}
                            className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />
                                    Đang đăng ký...
                                </>
                            ) : (
                                <>
                                    Đăng ký
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Đã có tài khoản?{" "}
                        <Link
                            to="/login"
                            className="font-black text-emerald-600 hover:text-emerald-700"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Input({
    icon,
    label,
    name,
    value,
    onChange,
    placeholder,
    type = "text",
    autoComplete,
    required = true,
}) {
    return (
        <label className="block">
            <div className="text-sm font-bold text-slate-700 mb-2">
                {label}
            </div>

            <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3 border border-transparent focus-within:bg-white focus-within:border-emerald-300 transition">
                <div className="text-slate-400">
                    {icon}
                </div>

                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    className="bg-transparent outline-none flex-1 text-sm text-slate-800"
                />
            </div>
        </label>
    );
}

function Feature({ text }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <ShieldCheck size={17} />
            </div>

            <div className="font-bold text-slate-200">
                {text}
            </div>
        </div>
    );
}

export default Register;