import React, { useState, useEffect } from "react";
import { useDb } from "./db-provider";
import { Users, Plus, Trash2, Edit3, X, Search, Phone, Mail, Store, Info, Briefcase } from "lucide-react";

interface Branch {
  id: number;
  name: string;
}

interface Personnel {
  id: number;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  branch_id: number | null;
  branch_name: string | null;
}

export const PersonnelList: React.FC = () => {
  const { query, execute } = useDb();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Depo Görevlisi");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);
      const persRes = await query<Personnel>(`
        SELECT 
          p.id,
          p.name,
          p.role,
          p.phone,
          p.email,
          p.branch_id,
          b.name as branch_name
        FROM personnel p
        LEFT JOIN branches b ON p.branch_id = b.id
        ORDER BY p.name
      `);
      const bRes = await query<Branch>("SELECT id, name FROM branches ORDER BY name");
      
      setPersonnel(persRes);
      setFilteredPersonnel(persRes);
      setBranches(bRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter based on search query
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredPersonnel(personnel);
    } else {
      setFilteredPersonnel(
        personnel.filter((p) => p.name.toLowerCase().includes(q))
      );
    }
  }, [searchQuery, personnel]);

  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const bId = branchId ? parseInt(branchId) : null;
      await execute(
        "INSERT INTO personnel (name, role, phone, email, branch_id) VALUES (?, ?, ?, ?, ?)",
        [name.trim(), role.trim() || null, phone.trim() || null, email.trim() || null, bId]
      );
      setName("");
      setRole("Depo Görevlisi");
      setPhone("");
      setEmail("");
      setBranchId("");
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      alert(`Personel eklenirken hata: ${err}`);
    }
  };

  const handleEditPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson || !editingPerson.name.trim()) return;

    try {
      await execute(
        "UPDATE personnel SET name = ?, role = ?, phone = ?, email = ?, branch_id = ? WHERE id = ?",
        [
          editingPerson.name.trim(),
          editingPerson.role?.trim() || null,
          editingPerson.phone?.trim() || null,
          editingPerson.email?.trim() || null,
          editingPerson.branch_id || null,
          editingPerson.id,
        ]
      );
      setEditingPerson(null);
      loadData();
    } catch (err: any) {
      alert(`Personel güncellenirken hata: ${err}`);
    }
  };

  const handleDeletePersonnel = async (id: number) => {
    if (!confirm("Bu personeli silmek istediğinize emin misiniz? Yapılan stok hareketlerindeki personel referansı boş kalacaktır.")) return;
    try {
      await execute("DELETE FROM personnel WHERE id = ?", [id]);
      loadData();
    } catch (err: any) {
      alert(`Personel silinirken hata: ${err}`);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Veriler yükleniyor...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full animate-fade-in">
      {/* Personnel List Panel */}
      <div className="lg:col-span-2 glass-panel p-5 rounded-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Personel Listesi</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Sistemde kayıtlı çalışanlar ve yetkilendirildikleri şubeler</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingPerson(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Personel Ekle
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim ile personel ara..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs text-white glass-input outline-none"
          />
        </div>

        {/* List Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 italic">
              Aramaya uygun veya kayıtlı personel bulunamadı.
            </div>
          ) : (
            filteredPersonnel.map((p) => {
              // Generate initial for avatar
              const initial = p.name ? p.name.charAt(0).toUpperCase() : "?";

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-sm font-bold">
                      {initial}
                    </div>
                    
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200 text-xs truncate">{p.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500">
                        {p.role && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-600" /> {p.role}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-600" />
                          {p.branch_name ? p.branch_name : "Genel / Şubesiz"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info & Actions */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden md:flex flex-col text-right text-[10px] text-slate-400 gap-0.5">
                      {p.phone && <span className="flex items-center justify-end gap-1"><Phone className="w-2.5 h-2.5 text-slate-600" /> {p.phone}</span>}
                      {p.email && <span className="flex items-center justify-end gap-1"><Mail className="w-2.5 h-2.5 text-slate-600" /> {p.email}</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPerson(p);
                          setShowAddForm(false);
                        }}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePersonnel(p.id)}
                        className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col">
        {!showAddForm && !editingPerson ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="w-8 h-8 text-slate-600 mb-3" />
            <div className="text-xs font-semibold text-slate-400">Personel Düzenleme Paneli</div>
            <div className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Yeni çalışan kaydı yapmak için üstteki "Personel Ekle" butonunu kullanın ya da kayıtlı personelleri listeden düzenleyin.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {showAddForm ? "Yeni Personel Ekle" : "Personel Düzenle"}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPerson(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-white/5 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <form onSubmit={handleAddPersonnel} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn. Ahmet Yılmaz"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Görevi / Rolü</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Örn. Depo Sorumlusu"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Atanacağı Şube</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Genel / Şubesiz</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Telefon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Örn. 0555 123 4567"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">E-posta</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmet@sirket.com"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
                >
                  Personeli Kaydet
                </button>
              </form>
            )}

            {/* Edit Form */}
            {editingPerson && (
              <form onSubmit={handleEditPersonnel} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Görevi / Rolü</label>
                  <input
                    type="text"
                    value={editingPerson.role || ""}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Atanacağı Şube</label>
                  <select
                    value={editingPerson.branch_id || ""}
                    onChange={(e) => setEditingPerson({ ...editingPerson, branch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Genel / Şubesiz</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Telefon</label>
                  <input
                    type="text"
                    value={editingPerson.phone || ""}
                    onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">E-posta</label>
                  <input
                    type="email"
                    value={editingPerson.email || ""}
                    onChange={(e) => setEditingPerson({ ...editingPerson, email: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
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
          </div>
        )}
      </div>
    </div>
  );
};
