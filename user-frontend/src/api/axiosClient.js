import axios from "axios";

const axiosClient = axios.create({
    baseURL: "/api",
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

let refreshPromise = null;

function clearAuthentication() {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
}

function redirectToLogin() {
    if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
    }
}

function isPublicAuthRequest(url = "") {
    return (
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh-token")
    );
}

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (error.code === "ECONNABORTED") {
            console.error("API phản hồi quá lâu.");
            return Promise.reject(error);
        }

        if (status !== 401) {
            return Promise.reject(error);
        }

        if (isPublicAuthRequest(originalRequest?.url)) {
            return Promise.reject(error);
        }

        if (originalRequest?._retry) {
            clearAuthentication();
            redirectToLogin();
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
            clearAuthentication();
            redirectToLogin();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(
                        "/api/auth-service/auth/refresh-token",
                        {
                            refreshToken,
                        },
                        {
                            timeout: 15000,
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    )
                    .then((response) => {
                        const data = response.data;

                        if (!data?.accessToken) {
                            throw new Error(
                                "Refresh API không trả accessToken."
                            );
                        }

                        localStorage.setItem(
                            "accessToken",
                            data.accessToken
                        );

                        if (data.refreshToken) {
                            localStorage.setItem(
                                "refreshToken",
                                data.refreshToken
                            );
                        }

                        const user = {
                            userId: data.userId,
                            email: data.email,
                            role: data.role,
                        };

                        localStorage.setItem(
                            "user",
                            JSON.stringify(user)
                        );

                        return data.accessToken;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const newAccessToken = await refreshPromise;

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return axiosClient(originalRequest);
        } catch (refreshError) {
            refreshPromise = null;

            clearAuthentication();
            redirectToLogin();

            return Promise.reject(refreshError);
        }
    }
);

export default axiosClient;