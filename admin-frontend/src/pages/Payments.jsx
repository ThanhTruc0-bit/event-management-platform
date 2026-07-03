import EntityManager from "../components/EntityManager";

function Payments() {
    return (
        <EntityManager
            title="Payments"
            subtitle="Quản lý bảng payments: id, bookingId, amount, paymentMethod, status, paymentDate."
            endpoint="/payment-service/payments"
            columns={[
                { key: "id", label: "ID" },
                { key: "bookingId", label: "Booking ID" },
                {
                    key: "amount",
                    label: "Amount",
                    render: (p) => `${Number(p.amount || 0).toLocaleString()} đ`,
                },
                { key: "paymentMethod", label: "Payment Method" },
                {
                    key: "status",
                    label: "Status",
                    render: (p) => (
                        <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${p.status === "SUCCESS"
                                ? "bg-green-100 text-green-700"
                                : p.status === "FAILED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {p.status}
                        </span>
                    ),
                },
                { key: "paymentDate", label: "Payment Date" },
            ]}
            fields={[
                { name: "bookingId", label: "Booking ID", type: "number", required: true },
                { name: "amount", label: "Amount", type: "number", required: true },
                {
                    name: "paymentMethod",
                    label: "Payment Method",
                    type: "select",
                    options: ["MOMO", "VNPAY", "CASH", "BANKING"],
                    defaultValue: "MOMO",
                },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    options: ["PENDING", "SUCCESS", "FAILED"],
                    defaultValue: "SUCCESS",
                },
            ]}
        />
    );
}

export default Payments;