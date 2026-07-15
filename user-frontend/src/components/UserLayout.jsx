import Header from "./Header";
import Footer from "./Footer";

function UserLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#111317] text-white">
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

export default UserLayout;