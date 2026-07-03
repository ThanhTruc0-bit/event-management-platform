import { useEffect, useMemo, useState } from "react";
import { Armchair, X } from "lucide-react";
import EntityManager from "../components/EntityManager";
import axiosClient from "../api/axiosClient";

function Seats() {
    const [events, setEvents] = useState([]);
    const [showGenerate, setShowGenerate] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [generateForm, setGenerateForm] = useState({
        eventId: "",
        prefix: "",
        startNumber: 1,
        endNumber: 30,
        seatType: "STANDARD",
        status: "AVAILABLE",
        price: "",
    });

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const res = await axiosClient.get("/event-service/events");
            const list = Array.isArray(res.data) ? res.data : [];
            setEvents(list);
        } catch (err) {
            console.error(err);
            setEvents([]);
        }
    };

    const eventOptions = useMemo(() => {
        return events.map((event) => ({
            value: String(event.id),
            label: `#${event.id} - ${event.name}`,
        }));
    }, [events]);

    const getEventName = (eventId) => {
        const event = events.find((e) => String(e.id) === String(eventId));
        return event ? event.name : `Event #${eventId}`;
    };

    const handleGenerateChange = (e) => {
        setGenerateForm({
            ...generateForm,
            [e.target.name]: e.target.value,
        });
    };

    const resetGenerateForm = () => {
        setGenerateForm({
            eventId: "",
            prefix: "",
            startNumber: 1,
            endNumber: 30,
            seatType: "STANDARD",
            status: "AVAILABLE",
            price: "",
        });
    };

    const generateSeats = async (e) => {
        e.preventDefault();

        if (Number(generateForm.startNumber) > Number(generateForm.endNumber)) {
            alert("Số bắt đầu không được lớn hơn số kết thúc.");
            return;
        }

        try {
            await axiosClient.post("/seat-service/seats/generate", {
                eventId: Number(generateForm.eventId),
                prefix: generateForm.prefix,
                startNumber: Number(generateForm.startNumber),
                endNumber: Number(generateForm.endNumber),
                seatType: generateForm.seatType,
                status: generateForm.status,
                price: Number(generateForm.price),
            });

            alert("Tạo ghế hàng loạt thành công");

            setShowGenerate(false);
            resetGenerateForm();
            setReloadKey((prev) => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Tạo ghế hàng loạt thất bại. Kiểm tra seat-service hoặc API Gateway.");
        }
    };

    return (
        <div>
            <EntityManager
                key={reloadKey}
                title="Seats"
                subtitle="Quản lý ghế/khu vực theo từng sự kiện. Admin tạo ghế hàng loạt, sau đó sửa/xóa từng ghế khi cần."
                endpoint="/seat-service/seats"
                allowCreate={false}
                headerActions={
                    <button
                        onClick={() => setShowGenerate(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
                    >
                        <Armchair size={18} />
                        Tạo ghế hàng loạt
                    </button>
                }
                columns={[
                    { key: "id", label: "ID" },
                    {
                        key: "eventId",
                        label: "Event",
                        render: (s) => (
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {getEventName(s.eventId)}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Event ID: {s.eventId}
                                </div>
                            </div>
                        ),
                    },
                    { key: "seatNumber", label: "Seat Number" },
                    {
                        key: "seatType",
                        label: "Seat Type",
                        render: (s) => (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${s.seatType === "VIP"
                                    ? "bg-purple-100 text-purple-700"
                                    : s.seatType === "STANDARD"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {s.seatType || "STANDARD"}
                            </span>
                        ),
                    },
                    {
                        key: "status",
                        label: "Status",
                        render: (s) => (
                            <span
                                className={`text-xs px-3 py-1 rounded-full font-bold ${s.status === "AVAILABLE"
                                    ? "bg-green-100 text-green-700"
                                    : s.status === "RESERVED"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : s.status === "BOOKED"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {s.status || "AVAILABLE"}
                            </span>
                        ),
                    },
                    {
                        key: "price",
                        label: "Price",
                        render: (s) => `${Number(s.price || 0).toLocaleString()} đ`,
                    },
                ]}
                fields={[
                    {
                        name: "eventId",
                        label: "Event",
                        type: "select",
                        options: eventOptions,
                        required: true,
                        placeholder: "Chọn sự kiện",
                    },
                    {
                        name: "seatNumber",
                        label: "Seat Number",
                        required: true,
                        placeholder: "Ví dụ: A1, A2, VIP-01",
                    },
                    {
                        name: "seatType",
                        label: "Seat Type",
                        type: "select",
                        options: ["VIP", "STANDARD", "STANDING"],
                        defaultValue: "STANDARD",
                        required: true,
                        placeholder: "Chọn loại ghế",
                    },
                    {
                        name: "status",
                        label: "Status",
                        type: "select",
                        options: ["AVAILABLE", "RESERVED", "BOOKED"],
                        defaultValue: "AVAILABLE",
                        required: true,
                        placeholder: "Chọn trạng thái",
                    },
                    {
                        name: "price",
                        label: "Price",
                        type: "number",
                        required: true,
                        placeholder: "Ví dụ: 500000",
                    },
                ]}
                buildPayload={(form) => {
                    return {
                        eventId: Number(form.eventId),
                        seatNumber: form.seatNumber,
                        seatType: form.seatType || "STANDARD",
                        status: form.status || "AVAILABLE",
                        price: Number(form.price),
                    };
                }}
            />

            {showGenerate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                    <form
                        onSubmit={generateSeats}
                        className="bg-white w-170 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm text-indigo-600 font-semibold">
                                    Generate Seats
                                </p>

                                <h2 className="text-2xl font-bold text-slate-900">
                                    Tạo ghế hàng loạt
                                </h2>

                                <p className="text-sm text-slate-500 mt-1">
                                    Ví dụ nhập khu A, từ 1 đến 30 sẽ tạo A1 đến A30.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowGenerate(false)}
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Event
                                </label>

                                <select
                                    name="eventId"
                                    value={generateForm.eventId}
                                    onChange={handleGenerateChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Chọn sự kiện</option>

                                    {eventOptions.map((event) => (
                                        <option key={event.value} value={event.value}>
                                            {event.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Khu / Prefix
                                </label>

                                <input
                                    name="prefix"
                                    value={generateForm.prefix}
                                    onChange={handleGenerateChange}
                                    placeholder="Ví dụ: A, B, VIP"
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Seat Type
                                </label>

                                <select
                                    name="seatType"
                                    value={generateForm.seatType}
                                    onChange={handleGenerateChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="VIP">VIP</option>
                                    <option value="STANDARD">STANDARD</option>
                                    <option value="STANDING">STANDING</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Từ số
                                </label>

                                <input
                                    name="startNumber"
                                    type="number"
                                    min="1"
                                    value={generateForm.startNumber}
                                    onChange={handleGenerateChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Đến số
                                </label>

                                <input
                                    name="endNumber"
                                    type="number"
                                    min="1"
                                    value={generateForm.endNumber}
                                    onChange={handleGenerateChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Status
                                </label>

                                <select
                                    name="status"
                                    value={generateForm.status}
                                    onChange={handleGenerateChange}
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="RESERVED">RESERVED</option>
                                    <option value="BOOKED">BOOKED</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Price
                                </label>

                                <input
                                    name="price"
                                    type="number"
                                    min="0"
                                    value={generateForm.price}
                                    onChange={handleGenerateChange}
                                    placeholder="Ví dụ: 1000000"
                                    required
                                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-7 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-600">
                            Kết quả sẽ tạo ghế dạng:{" "}
                            <b>
                                {generateForm.prefix || "A"}
                                {generateForm.startNumber || 1}
                            </b>{" "}
                            đến{" "}
                            <b>
                                {generateForm.prefix || "A"}
                                {generateForm.endNumber || 30}
                            </b>
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowGenerate(false)}
                                className="px-5 py-3 rounded-xl border hover:bg-slate-100"
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                            >
                                Tạo ghế
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Seats;