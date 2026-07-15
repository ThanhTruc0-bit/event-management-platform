import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Home,
    ReceiptText,
    Ticket,
    RotateCcw,
    CreditCard,
    CalendarDays,
    MapPin,
    Banknote,
    Hash,
    Loader2,
    AlertCircle,
} from "lucide-react";

function PaymentResult() {
    const [searchParams] = useSearchParams();

    const paymentId = searchParams.get("paymentId");
    const bookingIdFromUrl =
        searchParams.get("bookingId") ||
        searchParams.get("orderId") ||
        searchParams.get("vnp_TxnRef");

    const statusFromUrl =
        searchParams.get("status") ||
        searchParams.get("paymentStatus") ||
        searchParams.get("result");

    const message =
        searchParams.get("message") ||
        searchParams.get("vnp_Message") ||
        searchParams.get("error");

    const [payment, setPayment] = useState(null);
    const [booking, setBooking] = useState(null);
    const [bookingItems, setBookingItems] = useState([]);
    const [event, setEvent] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");

    const bookingId = payment?.bookingId || booking?.id || bookingIdFromUrl;

    useEffect(() => {
        loadResultData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentId, bookingIdFromUrl]);

    const loadResultData = async () => {
        try {
            setLoading(true);
            setApiError("");

            let loadedPayment = null;
            let loadedBooking = null;
            let loadedItems = [];

            if (paymentId) {
                try {
                    const paymentRes = await axiosClient.get(
                        `/payment-service/payments/${paymentId}`
                    );

                    loadedPayment = paymentRes.data;
                    setPayment(loadedPayment);
                } catch (err) {
                    console.error("Load payment failed:", err);
                }
            }

            const finalBookingId = loadedPayment?.bookingId || bookingIdFromUrl;

            if (finalBookingId) {
                try {
                    const detailRes = await axiosClient.get(
                        `/booking-service/bookings/${finalBookingId}/detail`
                    );

                    const detailData = detailRes.data;

                    loadedBooking =
                        detailData?.booking ||
                        detailData?.data?.booking ||
                        detailData;

                    loadedItems =
                        detailData?.items ||
                        detailData?.bookingItems ||
                        detailData?.data?.items ||
                        [];

                    setBooking(loadedBooking);
                    setBookingItems(Array.isArray(loadedItems) ? loadedItems : []);
                } catch (err) {
                    console.error("Load booking detail failed:", err);

                    try {
                        const bookingRes = await axiosClient.get(
                            `/booking-service/bookings/${finalBookingId}`
                        );

                        loadedBooking = bookingRes.data;
                        setBooking(loadedBooking);
                    } catch (bookingErr) {
                        console.error("Load booking failed:", bookingErr);
                    }
                }

                try {
                    const ticketRes = await axiosClient.get(
                        `/ticket-service/tickets/booking/${finalBookingId}`
                    );

                    const ticketData = ticketRes.data;
                    const ticketList = Array.isArray(ticketData)
                        ? ticketData
                        : ticketData?.data || ticketData?.tickets || [];

                    setTickets(Array.isArray(ticketList) ? ticketList : []);
                } catch (err) {
                    console.error("Load tickets failed:", err);
                }
            }

            const eventId = loadedBooking?.eventId;

            if (eventId) {
                try {
                    const eventRes = await axiosClient.get(
                        `/event-service/events/${eventId}`
                    );

                    setEvent(eventRes.data);
                } catch (err) {
                    console.error("Load event failed:", err);
                }
            }
        } catch (err) {
            console.error(err);
            setApiError("Không tải được đầy đủ thông tin giao dịch từ API.");
        } finally {
            setLoading(false);
        }
    };

    const paymentStatus = useMemo(() => {
        return String(
            payment?.status ||
            booking?.status ||
            statusFromUrl ||
            ""
        ).toUpperCase();
    }, [payment, booking, statusFromUrl]);

    const responseCode =
        payment?.vnpResponseCode ||
        searchParams.get("vnp_ResponseCode") ||
        searchParams.get("responseCode") ||
        searchParams.get("code");

    const transactionNo =
        payment?.vnpTransactionNo ||
        searchParams.get("vnp_TransactionNo") ||
        searchParams.get("transactionNo");

    const bankCode =
        payment?.vnpBankCode ||
        searchParams.get("vnp_BankCode") ||
        searchParams.get("bankCode");

    const isSuccess =
        paymentStatus === "SUCCESS" ||
        paymentStatus === "PAID" ||
        responseCode === "00";

    const isFailed =
        paymentStatus === "FAILED" ||
        paymentStatus === "CANCELLED" ||
        paymentStatus === "EXPIRED" ||
        (responseCode && responseCode !== "00");

    const title = isSuccess
        ? "Thanh toán thành công"
        : isFailed
            ? "Thanh toán thất bại"
            : "Đang xử lý kết quả thanh toán";

    const description = isSuccess
        ? "Booking của bạn đã được thanh toán. Hệ thống đã ghi nhận giao dịch và tạo vé QR nếu ticket-service hoạt động bình thường."
        : isFailed
            ? "Giao dịch chưa hoàn tất hoặc hệ thống cập nhật booking bị lỗi. Bạn có thể kiểm tra lại đơn đặt vé."
            : "Hệ thống đang tải thêm thông tin thanh toán từ API.";

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") {
            return "Đang cập nhật";
        }

        const number = Number(value);

        if (Number.isNaN(number)) return value;

        return `${number.toLocaleString("vi-VN")} đ`;
    };

    const formatDate = (value) => {
        if (!value) return "Đang cập nhật";
        return String(value).replace("T", " ");
    };

    const getSeatText = (item) => {
        return (
            item?.seatNumber ||
            item?.seatName ||
            item?.seatCode ||
            item?.seatId ||
            "Đang cập nhật"
        );
    };

    const totalAmount =
        payment?.amount ??
        booking?.totalAmount ??
        searchParams.get("amount") ??
        null;

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-14">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-[36px] border border-slate-200 p-8 md:p-10 shadow-sm">
                    <div className="text-center">
                        <div
                            className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${isSuccess
                                ? "bg-emerald-50 text-emerald-600"
                                : isFailed
                                    ? "bg-red-50 text-red-600"
                                    : "bg-amber-50 text-amber-600"
                                }`}
                        >
                            {loading ? (
                                <Loader2 size={44} className="animate-spin" />
                            ) : isSuccess ? (
                                <CheckCircle2 size={46} />
                            ) : isFailed ? (
                                <XCircle size={46} />
                            ) : (
                                <Clock size={46} />
                            )}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-950 mt-6">
                            {title}
                        </h1>

                        <p className="text-slate-500 mt-3 leading-7">
                            {description}
                        </p>
                    </div>

                    {(message || apiError) && (
                        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-3">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>{message || apiError}</div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
                        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                            <h2 className="font-black text-slate-950 mb-5 flex items-center gap-2">
                                <CreditCard size={20} />
                                Thông tin thanh toán
                            </h2>

                            <div className="space-y-4 text-sm">
                                <InfoRow label="Mã payment" value={payment?.id || paymentId} />
                                <InfoRow label="Mã booking" value={bookingId} />
                                <InfoRow label="Trạng thái payment" value={paymentStatus || "Không có"} />
                                <InfoRow label="Phương thức" value={payment?.paymentMethod || "VNPAY"} />
                                <InfoRow label="Mã phản hồi VNPay" value={responseCode || "Không có"} />
                                <InfoRow label="Ngân hàng" value={bankCode || "Không có"} />
                                <InfoRow label="Mã giao dịch VNPay" value={transactionNo || "Không có"} />
                                <InfoRow
                                    label="Số tiền"
                                    value={formatMoney(totalAmount)}
                                    valueClass="text-emerald-600"
                                />
                                <InfoRow
                                    label="Ngày thanh toán"
                                    value={formatDate(payment?.paymentDate)}
                                />
                                <InfoRow
                                    label="Mã giao dịch nội bộ"
                                    value={payment?.transactionCode || "Không có"}
                                />
                            </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                            <h2 className="font-black text-slate-950 mb-5 flex items-center gap-2">
                                <ReceiptText size={20} />
                                Thông tin đơn đặt vé
                            </h2>

                            <div className="space-y-4 text-sm">
                                <InfoRow label="Mã đơn" value={booking?.bookingCode || bookingId} />
                                <InfoRow label="User ID" value={booking?.userId || "Đang cập nhật"} />
                                <InfoRow label="Event ID" value={booking?.eventId || "Đang cập nhật"} />
                                <InfoRow label="Trạng thái booking" value={booking?.status || "Đang cập nhật"} />
                                <InfoRow label="Tổng tiền booking" value={formatMoney(booking?.totalAmount)} />
                                <InfoRow label="Ngày đặt" value={formatDate(booking?.bookingDate)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                            <h2 className="font-black text-slate-950 mb-5 flex items-center gap-2">
                                <CalendarDays size={20} />
                                Sự kiện
                            </h2>

                            <div className="space-y-4 text-sm">
                                <InfoRow label="Tên sự kiện" value={event?.name || "Đang cập nhật"} />
                                <InfoRow label="Thời gian" value={formatDate(event?.eventDate)} />
                                <InfoRow
                                    label="Địa điểm"
                                    value={event?.location || "Đang cập nhật"}
                                    icon={<MapPin size={16} />}
                                />
                            </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                            <h2 className="font-black text-slate-950 mb-5 flex items-center gap-2">
                                <Ticket size={20} />
                                Ghế / Vé
                            </h2>

                            {bookingItems.length === 0 && tickets.length === 0 ? (
                                <div className="text-sm text-slate-500">
                                    Chưa tải được danh sách ghế hoặc vé từ API.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bookingItems.map((item, index) => (
                                        <div
                                            key={item?.id || `${item?.seatId}-${index}`}
                                            className="flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm"
                                        >
                                            <div>
                                                <div className="font-black text-slate-950">
                                                    Ghế {getSeatText(item)}
                                                </div>
                                                <div className="text-slate-500">
                                                    Seat ID: {item?.seatId || "Không có"}
                                                </div>
                                            </div>

                                            <div className="font-black text-emerald-600">
                                                {formatMoney(item?.price)}
                                            </div>
                                        </div>
                                    ))}

                                    {tickets.length > 0 && (
                                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 font-bold">
                                            Đã tạo {tickets.length} vé QR.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                        <Link
                            to="/"
                            className="h-12 rounded-2xl bg-slate-100 text-slate-800 font-black hover:bg-slate-200 flex items-center justify-center gap-2"
                        >
                            <Home size={18} />
                            Trang chủ
                        </Link>

                        <Link
                            to="/my-bookings"
                            className="h-12 rounded-2xl bg-slate-950 text-white font-black hover:bg-black flex items-center justify-center gap-2"
                        >
                            <ReceiptText size={18} />
                            Booking
                        </Link>

                        {isSuccess && bookingId ? (
                            <Link
                                to={`/my-tickets?bookingId=${bookingId}`}
                                className="h-12 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 flex items-center justify-center gap-2"
                            >
                                <Ticket size={18} />
                                Vé QR
                            </Link>
                        ) : (
                            <Link
                                to="/events"
                                className="h-12 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} />
                                Đặt lại
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, valueClass = "text-slate-950", icon }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 last:border-b-0 pb-3 last:pb-0">
            <span className="text-slate-500 flex items-center gap-2">
                {icon}
                {label}
            </span>

            <span className={`font-black text-right break-all ${valueClass}`}>
                {value || "Đang cập nhật"}
            </span>
        </div>
    );
}

export default PaymentResult;