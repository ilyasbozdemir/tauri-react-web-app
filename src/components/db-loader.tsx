import React from "react";
import { useDb } from "./db-provider";
import { FolderOpen, FilePlus, Database, History, Info } from "lucide-react";

export const DbLoader: React.FC = () => {
  const { openDb, createDb, openDbByPath, recentPaths, error, setError } = useDb();

  const handleOpenRecent = async (path: string) => {
    try {
      await openDbByPath(path);
    } catch (e: any) {
      setError(`Dosya açılamadı: ${e.message || e}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden select-none">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg glass-panel p-8 rounded-2xl shadow-2xl relative z-10 animate-fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/5 mb-4 animate-pulse">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">STKDB Takip Sistemi</h1>
          <p className="text-sm text-slate-400 mt-2">
            SQLite tabanlı taşınabilir stok ve personel yönetim sistemi
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-3">
            <span className="mt-0.5 font-bold">⚠️ Hata:</span>
            <div className="flex-1 break-all">{error}</div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={createDb}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/30 text-slate-200 hover:text-white transition duration-200 group text-center"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 flex items-center justify-center mb-3 transition">
              <FilePlus className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">Yeni Veritabanı</span>
            <span className="text-[10px] text-slate-500 mt-1">Sıfırdan .stkdb dosyası oluştur</span>
          </button>

          <button
            onClick={openDb}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/30 text-slate-200 hover:text-white transition duration-200 group text-center"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 flex items-center justify-center mb-3 transition">
              <FolderOpen className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">Dosya Seç ve Aç</span>
            <span className="text-[10px] text-slate-500 mt-1">Bilgisayarından .stkdb dosyası seç</span>
          </button>
        </div>

        {/* Recent Databases */}
        {recentPaths.length > 0 && (
          <div className="border-t border-white/5 pt-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <History className="w-3.5 h-3.5" /> Son Kullanılan Veritabanları
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recentPaths.map((path, idx) => {
                // Get filename
                const filename = path.split(/[/\\]/).pop() || path;
                return (
                  <button
                    key={idx}
                    onClick={() => handleOpenRecent(path)}
                    className="w-full text-left p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] flex items-center justify-between group transition duration-150"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-xs font-medium text-slate-200 truncate group-hover:text-blue-400 transition">
                        {filename}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 select-all">
                        {path}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-white/5 group-hover:bg-blue-500/10 group-hover:text-blue-300 px-2 py-0.5 rounded transition">
                      Yükle
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Information Alert */}
        <div className="mt-6 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            Veritabanı dosyaları standart SQLite formatındadır. Dosya uzantısını <code className="text-blue-300">.stkdb</code> olarak kaydettiğinizde sistem tarafından tanınır ve başka bilgisayarlara taşınabilir.
          </div>
        </div>
      </div>
    </div>
  );
};
