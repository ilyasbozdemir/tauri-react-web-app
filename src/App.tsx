import { useState } from "react";
import { DbProvider, useDb } from "./components/db-provider";
import { DbLoader } from "./components/db-loader";
import { Dashboard } from "./components/dashboard";
import { Branches } from "./components/branches";
import { Products } from "./components/products";
import { Stock } from "./components/stock";
import { PersonnelList } from "./components/personnel";

import { 
  Database, 
  LayoutDashboard, 
  Store, 
  Boxes, 
  ClipboardList, 
  Users, 
  LogOut,
  FolderOpen
} from "lucide-react";
import "./App.css";

type Tab = "dashboard" | "branches" | "products" | "stock" | "personnel";

function AppContent() {
  const { isOpen, filePath, closeDb } = useDb();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  if (!isOpen) {
    return <DbLoader />;
  }

  // Get filename from absolute path
  const filename = filePath ? filePath.split(/[/\\]/).pop() || filePath : "";

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100 select-none">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/5 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">STKDB Takip</h1>
            <p className="text-[9px] text-slate-500 font-medium">Sürüm 1.0.0</p>
          </div>
        </div>

        {/* Database Info Widget */}
        <div className="mx-4 mt-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Aktif Dosya</div>
            <div className="text-xs font-semibold text-blue-400 truncate mt-0.5" title={filePath || ""}>
              {filename}
            </div>
          </div>
          <button 
            onClick={closeDb}
            className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition shrink-0"
            title="Veritabanını Kapat"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Genel Durum</span>
          </button>

          <button
            onClick={() => setActiveTab("branches")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === "branches"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Şube & Depolar</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === "products"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Ürün Kataloğu</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === "stock"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Stok Hareketleri</span>
          </button>

          <button
            onClick={() => setActiveTab("personnel")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === "personnel"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personel Yönetimi</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-black/10 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 select-text">
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          <span className="truncate" title={filePath || ""}>
            {filePath}
          </span>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {activeTab === "dashboard" && "Genel Durum"}
            {activeTab === "branches" && "Şubeler & Depolar"}
            {activeTab === "products" && "Ürün Kataloğu"}
            {activeTab === "stock" && "Stok Hareket Giriş / Çıkış"}
            {activeTab === "personnel" && "Personel Yönetimi"}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            SQLite Modu
          </div>
        </header>

        {/* Tab Panel Body */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "branches" && <Branches />}
          {activeTab === "products" && <Products />}
          {activeTab === "stock" && <Stock />}
          {activeTab === "personnel" && <PersonnelList />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <DbProvider>
      <AppContent />
    </DbProvider>
  );
}

export default App;
