import Sidebar from "./Sidebar";
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen"><div className="max-w-5xl mx-auto px-8 py-8">{children}</div></main>
    </div>
  );
}