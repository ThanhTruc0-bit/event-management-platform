import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles = [] }) {
    const token = localStorage.getItem("accessToken");
    const userRaw = localStorage.getItem("user");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch (error) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
    }

    if (!user || !user.role) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    return children;
}

export default ProtectedRoute;