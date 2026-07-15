import axios from "axios";

const axiosClient = axios.create({
    baseURL: "",
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

let refreshPromise = null;

function getStoredUser() {
    try {
        const rawUser = localStorage.getItem("user");

        return rawUser
            ? JSON.parse(rawUser)
            : {};
    } catch {
        return {};
    }
}

function saveAuthentication(data) {
    if (!data?.accessToken) {
        throw new Error(
            "Refresh token API không trả accessToken."
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

    const currentUser = getStoredUser();

    const nextUser = {
        ...currentUser,
        userId:
            data.userId ??
            currentUser.userId ??
            currentUser.id,
        email:
            data.email ??
            currentUser.email ??
            "",
        role:
            data.role ??
            currentUser.role ??
            "USER",
    };

    localStorage.setItem(
        "user",
        JSON.stringify(nextUser)
    );

    return data.accessToken;
}

function clearAuthentication() {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
}

function redirectToLogin() {
    if (
        !window.location.pathname.includes(
            "/login"
        )
    ) {
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
        const token =
            localStorage.getItem("accessToken");

        if (token) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest =
            error.config;

        if (error.code === "ECONNABORTED") {
            console.error(
                "API phản hồi quá lâu."
            );

            return Promise.reject(error);
        }

        const status =
            error.response?.status;

        if (status !== 401) {
            return Promise.reject(error);
        }

        if (
            isPublicAuthRequest(
                originalRequest?.url
            )
        ) {
            return Promise.reject(error);
        }

        if (originalRequest?._retry) {
            clearAuthentication();
            redirectToLogin();

            return Promise.reject(error);
        }

        const refreshToken =
            localStorage.getItem(
                "refreshToken"
            );

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
                        "/auth-service/auth/refresh-token",
                        {
                            refreshToken,
                        },
                        {
                            timeout: 15000,
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                        }
                    )
                    .then((response) =>
                        saveAuthentication(
                            response.data
                        )
                    )
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const newAccessToken =
                await refreshPromise;

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return axiosClient(
                originalRequest
            );
        } catch (refreshError) {
            refreshPromise = null;

            clearAuthentication();
            redirectToLogin();

            return Promise.reject(
                refreshError
            );
        }
    }
);

export default axiosClient;