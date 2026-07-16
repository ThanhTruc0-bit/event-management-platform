import axios from "axios";

const axiosClient = axios.create({
    baseURL: "",
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

const refreshClient = axios.create({
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

        if (!rawUser) {
            return {};
        }

        const parsedUser = JSON.parse(rawUser);

        return parsedUser &&
            typeof parsedUser === "object"
            ? parsedUser
            : {};
    } catch {
        return {};
    }
}

function saveAuthentication(data) {
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

    const currentUser = getStoredUser();

    const userId =
        data.userId ??
        currentUser.userId ??
        currentUser.id ??
        null;

    localStorage.setItem(
        "user",
        JSON.stringify({
            ...currentUser,
            id: userId,
            userId,
            email:
                data.email ??
                currentUser.email ??
                "",
            role:
                data.role ??
                currentUser.role ??
                "USER",
        })
    );

    return data.accessToken;
}

function clearAuthentication() {
    const authKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "jwt",
        "user",
        "currentUser",
        "authUser",
    ];

    authKeys.forEach((key) => {
        localStorage.removeItem(key);
    });
}

function redirectToLogin() {
    if (
        !window.location.pathname.includes(
            "/login"
        )
    ) {
        window.location.replace("/login");
    }
}

function isPublicAuthRequest(url = "") {
    const requestUrl = String(url);

    return (
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register") ||
        requestUrl.includes(
            "/auth/refresh-token"
        )
    );
}

axiosClient.interceptors.request.use(
    (config) => {
        const accessToken =
            localStorage.getItem(
                "accessToken"
            );

        if (
            accessToken &&
            !isPublicAuthRequest(config.url)
        ) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${accessToken}`;
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

        if (!error.response) {
            console.error(
                "Không kết nối được API Gateway."
            );

            return Promise.reject(error);
        }

        if (error.response.status !== 401) {
            return Promise.reject(error);
        }

        if (
            isPublicAuthRequest(
                originalRequest?.url
            )
        ) {
            return Promise.reject(error);
        }

        if (
            !originalRequest ||
            originalRequest._retry
        ) {
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
                refreshPromise =
                    refreshClient
                        .post(
                            "/auth-service/auth/refresh-token",
                            {
                                refreshToken,
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

export {
    clearAuthentication,
};

export default axiosClient;