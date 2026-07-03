import axios from "axios";

const axiosClient = axios.create({
    baseURL: "http://localhost:8080",
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        const userRaw = localStorage.getItem("user");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const user = userRaw ? JSON.parse(userRaw) : null;

            if (user?.id) {
                config.headers["X-User-Id"] = user.id;
            }

            if (user?.role) {
                config.headers["X-User-Role"] = user.role;
            } else {
                config.headers["X-User-Role"] = "USER";
            }
        } catch {
            config.headers["X-User-Role"] = "USER";
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }

        return Promise.reject(error);
    }
);

export default axiosClient;