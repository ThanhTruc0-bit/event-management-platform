import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "/api";

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type":
            "application/json",
    },
});

const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type":
            "application/json",
    },
});

let refreshPromise = null;

function normalizeRole(role) {
    if (Array.isArray(role)) {
        const firstRole =
            role[0];

        if (
            typeof firstRole ===
            "string"
        ) {
            return firstRole
                .trim()
                .replace(
                    /^ROLE_/i,
                    ""
                )
                .toUpperCase();
        }

        return String(
            firstRole?.roleName ||
            firstRole?.name ||
            "USER"
        )
            .trim()
            .replace(
                /^ROLE_/i,
                ""
            )
            .toUpperCase();
    }

    return String(
        role || "USER"
    )
        .trim()
        .replace(
            /^ROLE_/i,
            ""
        )
        .toUpperCase();
}

function decodeJwtPayload(token) {
    try {
        if (
            !token ||
            !token.includes(".")
        ) {
            return null;
        }

        const payload =
            token.split(".")[1];

        if (!payload) {
            return null;
        }

        const normalized =
            payload
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        const padded =
            normalized.padEnd(
                Math.ceil(
                    normalized.length /
                    4
                ) * 4,
                "="
            );

        return JSON.parse(
            window.atob(padded)
        );
    } catch {
        return null;
    }
}

function getStoredUser() {
    const keys = [
        "user",
        "currentUser",
        "authUser",
    ];

    for (const key of keys) {
        try {
            const rawUser =
                localStorage.getItem(
                    key
                );

            if (!rawUser) {
                continue;
            }

            const parsedUser =
                JSON.parse(rawUser);

            const user =
                parsedUser?.user ||
                parsedUser;

            if (
                user &&
                typeof user ===
                "object"
            ) {
                return user;
            }
        } catch {
            // Bỏ qua dữ liệu localStorage lỗi.
        }
    }

    return {};
}

function saveAuthentication(
    responseData
) {
    const data =
        responseData?.data &&
            typeof responseData.data ===
            "object"
            ? responseData.data
            : responseData;

    const accessToken =
        data?.accessToken;

    if (!accessToken) {
        throw new Error(
            "Refresh API không trả accessToken."
        );
    }

    localStorage.setItem(
        "accessToken",
        accessToken
    );

    if (data?.refreshToken) {
        localStorage.setItem(
            "refreshToken",
            data.refreshToken
        );
    }

    const tokenPayload =
        decodeJwtPayload(
            accessToken
        ) || {};

    const currentUser =
        getStoredUser();

    const userId =
        tokenPayload?.userId ??
        tokenPayload?.id ??
        tokenPayload?.uid ??
        data?.userId ??
        currentUser?.userId ??
        currentUser?.id ??
        null;

    const email =
        tokenPayload?.email ??
        data?.email ??
        currentUser?.email ??
        "";

    const role =
        tokenPayload?.role ??
        tokenPayload?.roles ??
        data?.role ??
        currentUser?.role ??
        "USER";

    const nextUser = {
        ...currentUser,

        userId:
            userId !== null
                ? Number(userId)
                : null,

        id:
            userId !== null
                ? Number(userId)
                : null,

        email,

        role:
            normalizeRole(role),
    };

    localStorage.setItem(
        "user",
        JSON.stringify(
            nextUser
        )
    );

    localStorage.setItem(
        "currentUser",
        JSON.stringify(
            nextUser
        )
    );

    return accessToken;
}

function clearAuthentication() {
    const authKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "jwt",
        "jwt-token",
        "user",
        "currentUser",
        "authUser",
    ];

    authKeys.forEach((key) => {
        localStorage.removeItem(
            key
        );
    });
}

function redirectToLogin() {
    clearAuthentication();

    if (
        !window.location.pathname
            .includes("/login")
    ) {
        window.location.replace(
            "/login"
        );
    }
}

function isPublicAuthRequest(
    url = ""
) {
    const normalizedUrl =
        String(url);

    return (
        normalizedUrl.includes(
            "/auth-service/auth/login"
        ) ||
        normalizedUrl.includes(
            "/auth-service/auth/register"
        ) ||
        normalizedUrl.includes(
            "/auth-service/auth/refresh-token"
        )
    );
}

axiosClient.interceptors.request.use(
    (config) => {
        const accessToken =
            localStorage.getItem(
                "accessToken"
            );

        config.headers =
            config.headers || {};

        if (
            accessToken &&
            !isPublicAuthRequest(
                config.url
            )
        ) {
            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    },

    (error) =>
        Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest =
            error.config;

        if (
            error.code ===
            "ECONNABORTED"
        ) {
            console.error(
                "API phản hồi quá lâu."
            );

            return Promise.reject(
                error
            );
        }

        if (!error.response) {
            console.error(
                "Không kết nối được API Gateway."
            );

            return Promise.reject(
                error
            );
        }

        const status =
            error.response.status;

        /*
         * 403 là lỗi quyền sở hữu.
         * Không refresh token khi gặp 403.
         */
        if (status !== 401) {
            return Promise.reject(
                error
            );
        }

        if (!originalRequest) {
            redirectToLogin();

            return Promise.reject(
                error
            );
        }

        /*
         * Login, register và refresh
         * không được tự gọi refresh tiếp.
         */
        if (
            isPublicAuthRequest(
                originalRequest.url
            )
        ) {
            return Promise.reject(
                error
            );
        }

        /*
         * Request đã được chạy lại một lần
         * nhưng vẫn 401.
         */
        if (
            originalRequest._retry
        ) {
            redirectToLogin();

            return Promise.reject(
                error
            );
        }

        const refreshToken =
            localStorage.getItem(
                "refreshToken"
            );

        if (!refreshToken) {
            redirectToLogin();

            return Promise.reject(
                error
            );
        }

        originalRequest._retry =
            true;

        try {
            /*
             * Nhiều request cùng lỗi 401
             * chỉ tạo một request refresh.
             */
            if (!refreshPromise) {
                refreshPromise =
                    refreshClient
                        .post(
                            "/auth-service/auth/refresh-token",
                            {
                                refreshToken,
                            }
                        )
                        .then(
                            (response) =>
                                saveAuthentication(
                                    response.data
                                )
                        )
                        .finally(
                            () => {
                                refreshPromise =
                                    null;
                            }
                        );
            }

            const newAccessToken =
                await refreshPromise;

            originalRequest.headers =
                originalRequest.headers ||
                {};

            originalRequest
                .headers
                .Authorization =
                `Bearer ${newAccessToken}`;

            return axiosClient(
                originalRequest
            );
        } catch (
        refreshError
        ) {
            refreshPromise = null;

            redirectToLogin();

            return Promise.reject(
                refreshError
            );
        }
    }
);

export {
    clearAuthentication,
    decodeJwtPayload,
};

export default axiosClient;