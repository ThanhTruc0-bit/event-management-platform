function PaymentResult() {
    return (
        <div className="max-w-3xl mx-auto px-5 py-16">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
                <h1 className="text-3xl font-bold text-slate-900">
                    Kết quả thanh toán
                </h1>

                <p className="text-slate-500 mt-2">
                    Trang này sẽ nhận kết quả trả về từ VNPay.
                </p>
            </div>
        </div>
    );
}

export default PaymentResult;