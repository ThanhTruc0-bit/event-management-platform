import { Link } from "react-router-dom";
import {
    ArrowLeft,
    ShieldAlert,
} from "lucide-react";

function Register() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-8 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <ShieldAlert size={32} />
                </div>

                <h1 className="mt-6 text-3xl font-black text-slate-900">
                    Không hỗ trợ đăng ký ADMIN
                </h1>

                <p className="mt-4 text-slate-600 leading-7">
                    Vì lý do bảo mật, tài khoản ADMIN không được tạo qua trang đăng ký công khai.
                    Tài khoản quản trị phải được tạo sẵn trong User Service hoặc do một ADMIN khác tạo.
                </p>

                <Link
                    to="/login"
                    className="mt-7 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                    <ArrowLeft size={18} />
                    Quay lại đăng nhập
                </Link>
            </div>
        </div>
    );
}

export default Register;