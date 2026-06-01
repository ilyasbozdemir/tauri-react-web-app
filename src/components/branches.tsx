import React, { useState, useEffect } from "react";
import { useDb } from "./db-provider";
import { Store, Warehouse as WarehouseIcon, Trash2, Edit3, ArrowRight, X, Phone, MapPin } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
}

interface Warehouse {
  id: number;
  branch_id: number;
  name: string;
}

export const Branches: React.FC = () => {
  const { query, execute } = useDb();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [branchName, setBranchName] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseBranchId, setWarehouseBranchId] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const bRes = await query<Branch>("SELECT * FROM branches ORDER BY name");
      const wRes = await query<Warehouse>("SELECT * FROM warehouses ORDER BY name");
      setBranches(bRes);
      setWarehouses(wRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    try {
      await execute("INSERT INTO branches (name, phone, address) VALUES (?, ?, ?)", [
        branchName.trim(),
        branchPhone.trim() || null,
        branchAddress.trim() || null,
      ]);
      setBranchName("");
      setBranchPhone("");
      setBranchAddress("");
      setShowAddBranch(false);
      loadData();
    } catch (err: any) {
      alert(`Şube eklenirken hata: ${err}`);
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name.trim()) return;
    try {
      await execute("UPDATE branches SET name = ?, phone = ?, address = ? WHERE id = ?", [
        editingBranch.name.trim(),
        editingBranch.phone?.trim() || null,
        editingBranch.address?.trim() || null,
        editingBranch.id,
      ]);
      setEditingBranch(null);
      loadData();
    } catch (err: any) {
      alert(`Şube güncellenirken hata: ${err}`);
    }
  };

  const handleDeleteBranch = async (id: number) => {
    if (!confirm("Bu şubeyi ve buna ait tüm depoları silmek istediğinize emin misiniz?")) return;
    try {
      await execute("DELETE FROM branches WHERE id = ?", [id]);
      if (selectedBranchId === id) setSelectedBranchId(null);
      loadData();
    } catch (err: any) {
      alert(`Şube silinirken hata: ${err}`);
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim() || !warehouseBranchId) return;
    try {
      await execute("INSERT INTO warehouses (branch_id, name) VALUES (?, ?)", [
        warehouseBranchId,
        warehouseName.trim(),
      ]);
      setWarehouseName("");
      setShowAddWarehouse(false);
      loadData();
    } catch (err: any) {
      alert(`Depo eklenirken hata: ${err}`);
    }
  };

  const handleEditWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse || !editingWarehouse.name.trim()) return;
    try {
      await execute("UPDATE warehouses SET name = ? WHERE id = ?", [
        editingWarehouse.name.trim(),
        editingWarehouse.id,
      ]);
      setEditingWarehouse(null);
      loadData();
    } catch (err: any) {
      alert(`Depo güncellenirken hata: ${err}`);
    }
  };

  const handleDeleteWarehouse = async (id: number) => {
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz? Bu işlem depodaki stok kayıtlarını etkileyebilir.")) return;
    try {
      await execute("DELETE FROM warehouses WHERE id = ?", [id]);
      loadData();
    } catch (err: any) {
      alert(`Depo silinirken hata: ${err}`);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Veriler yükleniyor...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full animate-fade-in">
      {/* Branches & Warehouses Tree view (Left 2 cols) */}
      <div className="lg:col-span-2 glass-panel p-5 rounded-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Şubeler & Depolar</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Şube ve depoların ağaç yapısı ve detayları</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddBranch(true);
                setShowAddWarehouse(false);
                setEditingBranch(null);
                setEditingWarehouse(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
            >
              <Store className="w-3.5 h-3.5" /> Şube Ekle
            </button>
            <button
              onClick={() => {
                if (branches.length === 0) {
                  alert("Depo eklemek için önce şube eklemelisiniz!");
                  return;
                }
                setWarehouseBranchId(branches[0].id);
                setShowAddWarehouse(true);
                setShowAddBranch(false);
                setEditingBranch(null);
                setEditingWarehouse(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
            >
              <WarehouseIcon className="w-3.5 h-3.5" /> Depo Ekle
            </button>
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {branches.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 italic">
              Kayıtlı şube bulunamadı. Şube ekleyerek başlayın.
            </div>
          ) : (
            branches.map((branch) => {
              const branchWarehouses = warehouses.filter((w) => w.branch_id === branch.id);
              const isSelected = selectedBranchId === branch.id;

              return (
                <div
                  key={branch.id}
                  className={`rounded-xl border transition-all ${
                    isSelected 
                      ? "border-blue-500/30 bg-blue-500/[0.02]" 
                      : "border-white/[0.04] bg-white/[0.01] hover:border-white/10"
                  }`}
                >
                  {/* Branch Row */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedBranchId(isSelected ? null : branch.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-semibold text-slate-200 text-sm group-hover:text-white truncate">
                          {branch.name}
                        </span>
                        <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full shrink-0">
                          {branchWarehouses.length} Depo
                        </span>
                      </div>
                      
                      {/* Branch Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
                        {branch.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" /> {branch.phone}
                          </span>
                        )}
                        {branch.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" /> {branch.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Branch Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setShowAddBranch(false);
                          setShowAddWarehouse(false);
                          setEditingWarehouse(null);
                        }}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition"
                        title="Şubeyi Düzenle"
                        aria-label="Şubeyi Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition"
                        title="Şubeyi Sil"
                        aria-label="Şubeyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Warehouses Section */}
                  {isSelected && (
                    <div className="border-t border-white/[0.04] p-3 bg-black/10 rounded-b-xl space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 mb-2">
                        Bağlı Depolar
                      </div>
                      
                      {branchWarehouses.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic px-2 py-1">
                          Bu şubeye bağlı depo bulunmamaktadır.
                        </div>
                      ) : (
                        branchWarehouses.map((wh) => (
                          <div
                            key={wh.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] text-xs hover:border-white/10 transition"
                          >
                            <div className="flex items-center gap-2">
                              <WarehouseIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="text-slate-300 font-medium">{wh.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingWarehouse(wh);
                                  setShowAddBranch(false);
                                  setShowAddWarehouse(false);
                                  setEditingBranch(null);
                                }}
                                className="p-1 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded transition"
                                title="Depoyu Düzenle"
                                aria-label="Depoyu Düzenle"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteWarehouse(wh.id)}
                                className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition"
                                title="Depoyu Sil"
                                aria-label="Depoyu Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor & Forms Pane (Right 1 col) */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col">
        {!showAddBranch && !showAddWarehouse && !editingBranch && !editingWarehouse ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ArrowRight className="w-8 h-8 text-slate-600 mb-3 animate-bounce-right" />
            <div className="text-xs font-semibold text-slate-400">Şube veya Depo İşlemi Seçin</div>
            <div className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Üstteki butonları kullanarak yeni kayıtlar ekleyebilir veya listedeki simgelere tıklayarak düzenleme yapabilirsiniz.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {showAddBranch && "Yeni Şube Ekle"}
                {showAddWarehouse && "Yeni Depo Ekle"}
                {editingBranch && "Şube Düzenle"}
                {editingWarehouse && "Depo Düzenle"}
              </h3>
              <button
                onClick={() => {
                  setShowAddBranch(false);
                  setShowAddWarehouse(false);
                  setEditingBranch(null);
                  setEditingWarehouse(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-white/5 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Branch Form */}
            {showAddBranch && (
              <form onSubmit={handleAddBranch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Şube Adı</label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Örn. Kadıköy Merkez"
                    title="Şube Adı"
                    aria-label="Şube Adı"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Telefon</label>
                  <input
                    type="text"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="Örn. 0216 123 4567"
                    title="Telefon"
                    aria-label="Telefon"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Adres</label>
                  <textarea
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="Şube açık adresi..."
                    title="Adres"
                    aria-label="Adres"
                    rows={3}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
                >
                  Kaydet
                </button>
              </form>
            )}

            {/* Edit Branch Form */}
            {editingBranch && (
              <form onSubmit={handleEditBranch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Şube Adı</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Telefon</label>
                  <input
                    type="text"
                    value={editingBranch.phone || ""}
                    onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Adres</label>
                  <textarea
                    value={editingBranch.address || ""}
                    onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                    rows={3}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
                >
                  Güncelle
                </button>
              </form>
            )}

            {/* Add Warehouse Form */}
            {showAddWarehouse && (
              <form onSubmit={handleAddWarehouse} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Bağlı Şube</label>
                  <select
                    value={warehouseBranchId}
                    onChange={(e) => setWarehouseBranchId(Number(e.target.value))}
                    title="Bağlı Şube Seç"
                    aria-label="Bağlı Şube Seç"
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Depo Adı</label>
                  <input
                    type="text"
                    required
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="Örn. Ana Depo A"
                    title="Depo Adı"
                    aria-label="Depo Adı"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition"
                >
                  Depoyu Kaydet
                </button>
              </form>
            )}

            {/* Edit Warehouse Form */}
            {editingWarehouse && (
              <form onSubmit={handleEditWarehouse} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Depo Adı</label>
                  <input
                    type="text"
                    required
                    value={editingWarehouse.name}
                    onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition"
                >
                  Güncelle
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
