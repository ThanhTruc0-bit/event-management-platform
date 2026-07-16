import {
    useMemo,
    useState,
} from "react";

import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

import {
    CheckCircle,
    CreditCard,
    FilterX,
    RotateCcw,
    XCircle,
} from "lucide-react";

const PAYMENT_METHODS = [
    "VNPAY",
    "MOMO",
    "CASH",
    "BANKING",
    "DEMO_QR",
];

const PAYMENT_STATUSES = [
    "PENDING",
    "SUCCESS",
    "FAILED",
];

function Payments() {
    const [
        statusFilter,
        setStatusFilter,
    ] = useState("");

    const [
        methodFilter,
        setMethodFilter,
    ] = useState("");

    const [
        bookingIdFilter,
        setBookingIdFilter,
    ] = useState("");

    const [
        fromDate,
        setFromDate,
    ] = useState("");

    const [
        toDate,
        setToDate,
    ] = useState("");

    const requestParams =
        useMemo(() => {
            const params = {};

            if (statusFilter) {
                params.status =
                    statusFilter;
            }

            if (methodFilter) {
                params.paymentMethod =
                    methodFilter;
            }

            if (bookingIdFilter) {
                params.bookingId =
                    Number(
                        bookingIdFilter
                    );
            }

            if (fromDate) {
                params.fromDate =
                    fromDate;
            }

            if (toDate) {
                params.toDate =
                    toDate;
            }

            return params;
        }, [
            statusFilter,
            methodFilter,
            bookingIdFilter,
            fromDate,
            toDate,
        ]);

    const clearFilters = () => {
        setStatusFilter("");
        setMethodFilter("");
        setBookingIdFilter("");
        setFromDate("");
        setToDate("");
    };

    const getErrorMessage = (
        error,
        fallback
    ) => {
        if (
            error?.response
                ?.status === 401
        ) {
            return "Phiên đăng nhập đã hết hạn.";
        }

        if (
            error?.response
                ?.status === 403
        ) {
            return "Bạn không có quyền thực hiện chức năng này.";
        }

        return (
            error?.response
                ?.data
                ?.message ||
            error?.response
                ?.data
                ?.error ||
            error?.message ||
            fallback
        );
    };

    const confirmSuccess =
        async (
            payment,
            loadItems
        ) => {
            if (
                !window.confirm(
                    `Xác nhận Payment #${payment.id} thành công?`
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/payment-service/payments/${payment.id}/success`
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                window.alert(
                    getErrorMessage(
                        error,
                        "Không xác nhận thanh toán thành công được."
                    )
                );
            }
        };

    const markFailed =
        async (
            payment,
            loadItems
        ) => {
            if (
                !window.confirm(
                    `Chuyển Payment #${payment.id} sang FAILED?`
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/payment-service/payments/${payment.id}/failed`
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                window.alert(
                    getErrorMessage(
                        error,
                        "Không cập nhật thanh toán thất bại được."
                    )
                );
            }
        };

    const resetPending =
        async (
            payment,
            loadItems
        ) => {
            if (
                !window.confirm(
                    `Chuyển Payment #${payment.id} về PENDING?`
                )
            ) {
                return;
            }

            try {
                await axiosClient.put(
                    `/payment-service/payments/${payment.id}`,
                    {
                        paymentMethod:
                            payment.paymentMethod,
                        status:
                            "PENDING",
                    }
                );

                await loadItems();
            } catch (error) {
                console.error(error);

                window.alert(
                    getErrorMessage(
                        error,
                        "Không chuyển payment về PENDING được."
                    )
                );
            }
        };

    const formatMoney =
        (value) => {
            const number =
                Number(value || 0);

            return `${number.toLocaleString(
                "vi-VN"
            )} đ`;
        };

    const formatDateTime =
        (value) => {
            if (!value) {
                return "NULL";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(value)
                    .replace(
                        "T",
                        " "
                    );
            }

            return date.toLocaleString(
                "vi-VN"
            );
        };

    const getStatusClass =
        (status) => {
            const normalized =
                String(status || "")
                    .toUpperCase();

            if (
                normalized ===
                "SUCCESS"
            ) {
                return "bg-green-100 text-green-700";
            }

            if (
                normalized ===
                "FAILED"
            ) {
                return "bg-red-100 text-red-700";
            }

            return "bg-yellow-100 text-yellow-700";
        };

    const getMethodClass =
        (method) => {
            const normalized =
                String(method || "")
                    .toUpperCase();

            if (
                normalized ===
                "VNPAY"
            ) {
                return "bg-blue-100 text-blue-700";
            }

            if (
                normalized ===
                "MOMO"
            ) {
                return "bg-pink-100 text-pink-700";
            }

            if (
                normalized ===
                "CASH"
            ) {
                return "bg-green-100 text-green-700";
            }

            return "bg-slate-100 text-slate-700";
        };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-3">
            <select
                value={statusFilter}
                onChange={(event) =>
                    setStatusFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả trạng thái
                </option>

                {PAYMENT_STATUSES.map(
                    (status) => (
                        <option
                            key={status}
                            value={status}
                        >
                            {status}
                        </option>
                    )
                )}
            </select>

            <select
                value={methodFilter}
                onChange={(event) =>
                    setMethodFilter(
                        event.target.value
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
                <option value="">
                    Tất cả phương thức
                </option>

                {PAYMENT_METHODS.map(
                    (method) => (
                        <option
                            key={method}
                            value={method}
                        >
                            {method}
                        </option>
                    )
                )}
            </select>

            <input
                type="number"
                min="1"
                value={bookingIdFilter}
                onChange={(event) =>
                    setBookingIdFilter(
                        event.target.value
                    )
                }
                placeholder="Booking ID"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <input
                type="datetime-local"
                value={fromDate}
                onChange={(event) =>
                    setFromDate(
                        event.target.value
                    )
                }
                title="Từ ngày"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <input
                type="datetime-local"
                value={toDate}
                onChange={(event) =>
                    setToDate(
                        event.target.value
                    )
                }
                title="Đến ngày"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            />

            <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
                <FilterX size={17} />

                Xóa lọc
            </button>
        </div>
    );

    return (
        <EntityManager
            title="Payments"
            subtitle="Quản lý giao dịch thanh toán, VNPay, booking và trạng thái giao dịch."
            endpoint="/payment-service/payments"

            paginated
            initialPageSize={10}

            requestParams={
                requestParams
            }

            defaultSortBy="createdAt"
            defaultSortDirection="desc"

            allowCreate
            allowEdit
            allowDelete

            headerActions={
                headerActions
            }

            columns={[
                {
                    key: "id",
                    label: "ID",
                },
                {
                    key: "bookingId",
                    label: "Booking ID",
                },
                {
                    key: "amount",
                    label: "Số tiền",
                    render: (
                        payment
                    ) => (
                        <span className="font-bold text-green-700">
                            {formatMoney(
                                payment.amount
                            )}
                        </span>
                    ),
                },
                {
                    key:
                        "paymentMethod",
                    label:
                        "Phương thức",
                    render: (
                        payment
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getMethodClass(
                                payment.paymentMethod
                            )}`}
                        >
                            {payment.paymentMethod ||
                                "VNPAY"}
                        </span>
                    ),
                },
                {
                    key: "status",
                    label: "Trạng thái",
                    render: (
                        payment
                    ) => (
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                                payment.status
                            )}`}
                        >
                            {payment.status ||
                                "PENDING"}
                        </span>
                    ),
                },
                {
                    key:
                        "transactionCode",
                    label:
                        "Mã nội bộ",
                    render: (
                        payment
                    ) => (
                        <span className="text-xs font-semibold text-slate-700">
                            {payment.transactionCode ||
                                "NULL"}
                        </span>
                    ),
                },
                {
                    key:
                        "vnpTransactionNo",
                    label:
                        "Mã VNPay",
                    render: (
                        payment
                    ) =>
                        payment.vnpTransactionNo ||
                        "NULL",
                },
                {
                    key:
                        "vnpResponseCode",
                    label:
                        "Response Code",
                    render: (
                        payment
                    ) =>
                        payment.vnpResponseCode ||
                        "NULL",
                },
                {
                    key:
                        "vnpBankCode",
                    label:
                        "Ngân hàng",
                    render: (
                        payment
                    ) =>
                        payment.vnpBankCode ||
                        "NULL",
                },
                {
                    key: "paymentDate",
                    label:
                        "Ngày thanh toán",
                    render: (
                        payment
                    ) =>
                        formatDateTime(
                            payment.paymentDate
                        ),
                },
                {
                    key: "createdAt",
                    label: "Ngày tạo",
                    render: (
                        payment
                    ) =>
                        formatDateTime(
                            payment.createdAt
                        ),
                },
            ]}

            fields={[
                {
                    name: "bookingId",
                    label: "Booking ID",
                    type: "number",
                    required: true,
                    placeholder:
                        "Nhập Booking ID",
                },
                {
                    name: "amount",
                    label: "Số tiền",
                    type: "number",
                    placeholder:
                        "Để trống sẽ lấy tổng tiền booking",
                },
                {
                    name:
                        "paymentMethod",
                    label:
                        "Phương thức",
                    type: "select",
                    options:
                        PAYMENT_METHODS,
                    defaultValue:
                        "VNPAY",
                    required: true,
                },
                {
                    name: "status",
                    label: "Trạng thái",
                    type: "select",
                    options:
                        PAYMENT_STATUSES,
                    defaultValue:
                        "PENDING",
                    required: true,
                },
            ]}

            buildPayload={(
                form
            ) => ({
                bookingId:
                    form.bookingId
                        ? Number(
                            form.bookingId
                        )
                        : null,

                amount:
                    form.amount !==
                        undefined &&
                        form.amount !==
                        null &&
                        form.amount !==
                        ""
                        ? Number(
                            form.amount
                        )
                        : null,

                paymentMethod:
                    form.paymentMethod ||
                    "VNPAY",

                status:
                    form.status ||
                    "PENDING",
            })}

            extraActions={(
                payment,
                loadItems
            ) => (
                <>
                    {payment.status !==
                        "SUCCESS" && (
                            <button
                                type="button"
                                onClick={() =>
                                    confirmSuccess(
                                        payment,
                                        loadItems
                                    )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                            >
                                <CheckCircle
                                    size={15}
                                />

                                Thành công
                            </button>
                        )}

                    {payment.status ===
                        "PENDING" && (
                            <button
                                type="button"
                                onClick={() =>
                                    markFailed(
                                        payment,
                                        loadItems
                                    )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                            >
                                <XCircle
                                    size={15}
                                />

                                Thất bại
                            </button>
                        )}

                    {payment.status ===
                        "FAILED" && (
                            <button
                                type="button"
                                onClick={() =>
                                    resetPending(
                                        payment,
                                        loadItems
                                    )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-800"
                            >
                                <RotateCcw
                                    size={15}
                                />

                                PENDING
                            </button>
                        )}

                    {payment.paymentUrl && (
                        <a
                            href={
                                payment.paymentUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                        >
                            <CreditCard
                                size={15}
                            />

                            Link VNPay
                        </a>
                    )}
                </>
            )}
        />
    );
}

export default Payments;