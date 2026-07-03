import EntityManager from "../components/EntityManager";

function Users() {
    return (
        <EntityManager
            title="Users"
            subtitle="Quản lý bảng users: id, name, email, phone, password, role."
            endpoint="/user-service/users"
            createEndpoint="/user-service/auth/register"
            columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                {
                    key: "password",
                    label: "Password",
                    render: (u) => (
                        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                            {u.password ? "HASHED" : "NULL"}
                        </span>
                    ),
                },
                {
                    key: "role",
                    label: "Role",
                    render: (u) => (
                        <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                            {u.role || "USER"}
                        </span>
                    ),
                },
            ]}
            fields={[
                { name: "name", label: "Name", required: true },
                { name: "email", label: "Email", required: true },
                { name: "phone", label: "Phone" },
                {
                    name: "password",
                    label: "Password",
                    required: true,
                    hideOnEdit: true,
                    defaultValue: "123456",
                },
                {
                    name: "role",
                    label: "Role",
                    type: "select",
                    options: ["USER", "ADMIN"],
                    defaultValue: "USER",
                },
            ]}
            buildPayload={(form, editingItem) => {
                if (editingItem) {
                    return {
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        role: form.role,
                    };
                }

                return {
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    password: form.password,
                    role: form.role,
                };
            }}
        />
    );
}

export default Users;