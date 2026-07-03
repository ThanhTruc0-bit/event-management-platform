import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

function Forbidden() {
    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-5">
                    <ShieldAlert size={34} />
                </div>

                <h1 className="text-2xl font-bold text-slate-900">
                    Không có quyền truy cập
                </h1>

                <p className="text-slate-500 mt-3">
                    Tài khoản của bạn không phải ADMIN nên không thể vào trang quản trị.
                </p>

                <div className="mt-6 flex gap-3 justify-center">
                    <Link
                        to="/login"
                        className="px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-black"
                    >
                        Về đăng nhập
                    </Link>

                    <button
                        onClick={logout}
                        className="px-5 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Forbidden;