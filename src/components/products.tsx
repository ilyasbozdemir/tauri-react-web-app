import React, { useState, useEffect } from "react";
import { useDb } from "./db-provider";
import { Boxes, Plus, Trash2, Edit3, X, Search, Info, Layers, ChevronDown, ChevronUp } from "lucide-react";

interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  total_stock: number;
}

interface WarehouseStock {
  warehouse_id: number;
  warehouse_name: string;
  branch_name: string;
  stock_level: number;
}

export const Products: React.FC = () => {
  const { query, execute } = useDb();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Expanded product ID for warehouse stocks
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [whStocksLoading, setWhStocksLoading] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Adet");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [salePrice, setSalePrice] = useState("0");

  const loadData = async () => {
    try {
      setLoading(true);
      const sql = `
        SELECT 
          p.id,
          p.code,
          p.name,
          p.unit,
          p.purchase_price,
          p.sale_price,
          COALESCE(
            (SELECT SUM(CASE WHEN st.transaction_type = 'GİRİŞ' THEN st.quantity WHEN st.transaction_type = 'ÇIKIŞ' THEN -st.quantity ELSE 0 END)
             FROM stock_transactions st 
             WHERE st.product_id = p.id)
          , 0) as total_stock
        FROM products p
        ORDER BY p.code
      `;
      const res = await query<Product>(sql);
      setProducts(res);
      setFilteredProducts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products based on search
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, products]);

  const loadWarehouseStocks = async (productId: number) => {
    try {
      setWhStocksLoading(true);
      const sql = `
        SELECT 
          w.id as warehouse_id,
          w.name as warehouse_name,
          b.name as branch_name,
          COALESCE(
            SUM(CASE WHEN st.target_warehouse_id = w.id THEN st.quantity ELSE 0 END) -
            SUM(CASE WHEN st.source_warehouse_id = w.id THEN st.quantity ELSE 0 END)
          , 0) as stock_level
        FROM warehouses w
        JOIN branches b ON w.branch_id = b.id
        LEFT JOIN stock_transactions st ON (st.product_id = ? AND (st.source_warehouse_id = w.id OR st.target_warehouse_id = w.id))
        GROUP BY w.id
        ORDER BY b.name, w.name
      `;
      const res = await query<WarehouseStock>(sql, [productId]);
      setWarehouseStocks(res);
    } catch (e) {
      console.error(e);
    } finally {
      setWhStocksLoading(false);
    }
  };

  const handleRowClick = (productId: number) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      setWarehouseStocks([]);
    } else {
      setExpandedProductId(productId);
      loadWarehouseStocks(productId);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    try {
      await execute(
        "INSERT INTO products (code, name, unit, purchase_price, sale_price) VALUES (?, ?, ?, ?, ?)",
        [
          code.trim(),
          name.trim(),
          unit,
          parseFloat(purchasePrice) || 0,
          parseFloat(salePrice) || 0,
        ]
      );
      setCode("");
      setName("");
      setUnit("Adet");
      setPurchasePrice("0");
      setSalePrice("0");
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      alert(`Ürün eklenirken hata (Ürün Kodu/Barkod benzersiz olmalıdır): ${err}`);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.code.trim() || !editingProduct.name.trim()) return;
    try {
      await execute(
        "UPDATE products SET code = ?, name = ?, unit = ?, purchase_price = ?, sale_price = ? WHERE id = ?",
        [
          editingProduct.code.trim(),
          editingProduct.name.trim(),
          editingProduct.unit,
          editingProduct.purchase_price || 0,
          editingProduct.sale_price || 0,
          editingProduct.id,
        ]
      );
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      alert(`Ürün güncellenirken hata: ${err}`);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz? Ürüne ait tüm stok hareketleri de silinecektir.")) return;
    try {
      await execute("DELETE FROM products WHERE id = ?", [id]);
      if (expandedProductId === id) setExpandedProductId(null);
      loadData();
    } catch (err: any) {
      alert(`Ürün silinirken hata: ${err}`);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Veriler yükleniyor...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full animate-fade-in">
      {/* Product List Panel */}
      <div className="lg:col-span-2 glass-panel p-5 rounded-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Ürün Kataloğu</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Sistemde tanımlı tüm ürünler ve toplam stok durumları</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingProduct(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Ürün Tanımla
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ürün adı veya barkod/kod ile ara..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs text-white glass-input outline-none"
          />
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 italic">
              Aramaya uygun veya kayıtlı ürün bulunamadı.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => {
                const isExpanded = expandedProductId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? "border-blue-500/30 bg-blue-500/[0.01]"
                        : "border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/5"
                    }`}
                  >
                    {/* Main Row */}
                    <div 
                      className="p-3.5 flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => handleRowClick(p.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-200 text-xs truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{p.code}</span>
                            <span>•</span>
                            <span>Birim: {p.unit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Prices & Stock */}
                      <div className="flex items-center gap-8 shrink-0 text-right">
                        <div className="hidden sm:block">
                          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Fiyatlar</div>
                          <div className="text-xs font-semibold text-slate-300 mt-0.5">
                            Alış: {p.purchase_price}₺ | Satış: {p.sale_price}₺
                          </div>
                        </div>
                        
                        <div className="w-20 text-right">
                          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Toplam Stok</div>
                          <div className={`text-xs font-bold mt-0.5 ${p.total_stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {p.total_stock} {p.unit}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(p);
                              setShowAddForm(false);
                            }}
                            className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(p.id);
                            }}
                            className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-slate-500 pl-1 shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Warehouse breakdown */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.03] bg-black/10 rounded-b-xl p-3.5 space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Depolardaki Stok Durumu
                        </div>
                        
                        {whStocksLoading ? (
                          <div className="text-[10px] text-slate-500 italic">Depo stokları sorgulanıyor...</div>
                        ) : warehouseStocks.length === 0 ? (
                          <div className="text-[10px] text-slate-500 italic">Kayıtlı depo bulunamadı.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {warehouseStocks.map((wh) => (
                              <div
                                key={wh.warehouse_id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.01] border border-white/[0.02] text-[11px]"
                              >
                                <div>
                                  <div className="text-slate-300 font-medium">{wh.warehouse_name}</div>
                                  <div className="text-[9px] text-slate-500">{wh.branch_name}</div>
                                </div>
                                <span className={`font-bold ${wh.stock_level > 0 ? "text-emerald-400" : wh.stock_level < 0 ? "text-red-400" : "text-slate-500"}`}>
                                  {wh.stock_level} {p.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col">
        {!showAddForm && !editingProduct ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Info className="w-8 h-8 text-slate-600 mb-3" />
            <div className="text-xs font-semibold text-slate-400">Ürün Tanımlama Paneli</div>
            <div className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Soldaki listeden bir ürün seçerek depo bazlı dağılımını görebilir ya da üstteki butonla yeni ürün tanımlayabilirsiniz.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {showAddForm ? "Yeni Ürün Tanımla" : "Ürün Düzenle"}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-white/5 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Barkod / Ürün Kodu *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Örn. SKU-10023, 86905..."
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Ürün Adı *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn. A4 Fotokopi Kağıdı"
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Birim *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Metre">Metre</option>
                    <option value="Litre">Litre</option>
                    <option value="Kutu">Kutu</option>
                    <option value="Paket">Paket</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1.5">Alış Fiyatı (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1.5">Satış Fiyatı (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
                >
                  Ürünü Kaydet
                </button>
              </form>
            )}

            {/* Edit Form */}
            {editingProduct && (
              <form onSubmit={handleEditProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Barkod / Ürün Kodu</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Ürün Adı</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Birim</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Metre">Metre</option>
                    <option value="Litre">Litre</option>
                    <option value="Kutu">Kutu</option>
                    <option value="Paket">Paket</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1.5">Alış Fiyatı (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.purchase_price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, purchase_price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1.5">Satış Fiyatı (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.sale_price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sale_price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-lg text-white glass-input outline-none"
                    />
                  </div>
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
