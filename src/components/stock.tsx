import React, { useState, useEffect } from "react";
import { useDb } from "./db-provider";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Plus, 
  Trash2,
  Calendar,
  User,
  MapPin,
  ClipboardList,
  AlertTriangle
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  code: string;
  unit: string;
}

interface Warehouse {
  id: number;
  name: string;
  branch_name: string;
}

interface Personnel {
  id: number;
  name: string;
  role: string | null;
}

interface Transaction {
  id: number;
  product_name: string;
  product_code: string;
  product_unit: string;
  source_warehouse_name: string | null;
  target_warehouse_name: string | null;
  quantity: number;
  transaction_type: string;
  description: string | null;
  transaction_date: string;
  personnel_name: string | null;
}

export const Stock: React.FC = () => {
  const { query, execute } = useDb();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [productId, setProductId] = useState<number>(0);
  const [txType, setTxType] = useState<string>("GİRİŞ");
  const [sourceWhId, setSourceWhId] = useState<number>(0);
  const [targetWhId, setTargetWhId] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>("1");
  const [personnelId, setPersonnelId] = useState<number>(0);
  const [description, setDescription] = useState("");

  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const pRes = await query<Product>("SELECT id, name, code, unit FROM products ORDER BY name");
      const wRes = await query<Warehouse>(`
        SELECT w.id, w.name, b.name as branch_name 
        FROM warehouses w 
        JOIN branches b ON w.branch_id = b.id 
        ORDER BY b.name, w.name
      `);
      const persRes = await query<Personnel>("SELECT id, name, role FROM personnel ORDER BY name");
      
      setProducts(pRes);
      setWarehouses(wRes);
      setPersonnelList(persRes);

      // Pre-select defaults
      if (pRes.length > 0) setProductId(pRes[0].id);
      if (wRes.length > 0) {
        setSourceWhId(wRes[0].id);
        setTargetWhId(wRes[0].id);
      }
      if (persRes.length > 0) setPersonnelId(persRes[0].id);

      await loadTransactions();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    const txSql = `
      SELECT 
        st.id,
        p.name as product_name,
        p.code as product_code,
        p.unit as product_unit,
        sw.name as source_warehouse_name,
        tw.name as target_warehouse_name,
        st.quantity,
        st.transaction_type,
        st.description,
        st.transaction_date,
        pers.name as personnel_name
      FROM stock_transactions st
      JOIN products p ON st.product_id = p.id
      LEFT JOIN warehouses sw ON st.source_warehouse_id = sw.id
      LEFT JOIN warehouses tw ON st.target_warehouse_id = tw.id
      LEFT JOIN personnel pers ON st.personnel_id = pers.id
      ORDER BY st.transaction_date DESC
    `;
    const txRes = await query<Transaction>(txSql);
    setTransactions(txRes);
  };

  // Check available stock dynamically
  const checkStock = async () => {
    if (!productId || (txType !== "ÇIKIŞ" && txType !== "TRANSFER") || !sourceWhId) {
      setAvailableStock(null);
      setStockWarning(null);
      return;
    }

    try {
      const stockRes = await query<{ current_stock: number }>(`
        SELECT COALESCE(
          SUM(CASE WHEN target_warehouse_id = ? THEN quantity ELSE 0 END) -
          SUM(CASE WHEN source_warehouse_id = ? THEN quantity ELSE 0 END)
        , 0) as current_stock
        FROM stock_transactions
        WHERE product_id = ?
      `, [sourceWhId, sourceWhId, productId]);

      const currentStock = stockRes[0]?.current_stock || 0;
      setAvailableStock(currentStock);

      const reqQty = parseFloat(quantity) || 0;
      if (currentStock < reqQty) {
        setStockWarning(`Yetersiz Stok! Seçili depoda sadece ${currentStock} adet ürün var.`);
      } else {
        setStockWarning(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    checkStock();
  }, [productId, txType, sourceWhId, quantity]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Lütfen geçerli bir miktar girin!");
      return;
    }

    // Validation checks
    const srcId = (txType === "ÇIKIŞ" || txType === "TRANSFER") ? sourceWhId : null;
    const tgtId = (txType === "GİRİŞ" || txType === "TRANSFER") ? targetWhId : null;

    if (txType === "TRANSFER" && srcId === tgtId) {
      alert("Transfer işlemi için kaynak ve hedef depolar farklı olmalıdır!");
      return;
    }

    if (availableStock !== null && availableStock < qty) {
      if (!confirm("Depodaki mevcut stok miktarından fazla çıkış/transfer yapıyorsunuz. Devam etmek istiyor musunuz?")) {
        return;
      }
    }

    try {
      await execute(`
        INSERT INTO stock_transactions (
          product_id, 
          source_warehouse_id, 
          target_warehouse_id, 
          quantity, 
          transaction_type, 
          description, 
          personnel_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        productId,
        srcId,
        tgtId,
        qty,
        txType,
        description.trim() || null,
        personnelId || null
      ]);

      // Reset form variables
      setDescription("");
      setQuantity("1");
      
      // Reload lists
      await loadTransactions();
      await checkStock();
    } catch (err: any) {
      alert(`Stok hareketi kaydedilirken hata: ${err}`);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Bu stok hareketini silmek istediğinize emin misiniz? Bu işlem stok miktarlarını geriye dönük etkileyecektir.")) return;
    try {
      await execute("DELETE FROM stock_transactions WHERE id = ?", [id]);
      await loadTransactions();
      await checkStock();
    } catch (err: any) {
      alert(`Stok hareketi silinirken hata: ${err}`);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Veriler yükleniyor...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full animate-fade-in">
      {/* Form (Left 1 Col) */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col h-fit">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-400" /> Yeni Stok Hareketi
        </h2>

        {products.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-4 text-center border border-white/5 rounded-xl">
            Stok hareketi yapabilmek için önce en az bir Ürün tanımlamalısınız.
          </div>
        ) : warehouses.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-4 text-center border border-white/5 rounded-xl">
            Stok hareketi yapabilmek için önce en az bir Depo tanımlamalısınız.
          </div>
        ) : (
          <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
            {/* Tx Type */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Hareket Tipi</label>
              <div className="grid grid-cols-3 gap-2">
                {["GİRİŞ", "ÇIKIŞ", "TRANSFER"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTxType(type);
                      setStockWarning(null);
                    }}
                    className={`py-2 rounded-lg font-medium border transition ${
                      txType === type
                        ? type === "GİRİŞ"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : type === "ÇIKIŞ"
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-white/[0.01] border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Product selection */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Seçili Ürün</label>
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Warehouse (Out / Transfer) */}
            {(txType === "ÇIKIŞ" || txType === "TRANSFER") && (
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  {txType === "TRANSFER" ? "Kaynak Depo (Çıkacak)" : "Kaynak Depo"}
                </label>
                <select
                  value={sourceWhId}
                  onChange={(e) => setSourceWhId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.branch_name} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Warehouse (In / Transfer) */}
            {(txType === "GİRİŞ" || txType === "TRANSFER") && (
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  {txType === "TRANSFER" ? "Hedef Depo (Girecek)" : "Hedef Depo"}
                </label>
                <select
                  value={targetWhId}
                  onChange={(e) => setTargetWhId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.branch_name} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Miktar</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-white glass-input outline-none font-semibold text-sm"
                />
                <span className="text-slate-400 font-medium">
                  {products.find((p) => p.id === productId)?.unit || "Birim"}
                </span>
              </div>
            </div>

            {/* Stock warning */}
            {stockWarning && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-300 text-[10px] rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <div>{stockWarning}</div>
              </div>
            )}

            {availableStock !== null && !stockWarning && (
              <div className="text-[10px] text-slate-400 px-1">
                Depodaki Mevcut Stok: <strong className="text-emerald-400">{availableStock}</strong>
              </div>
            )}

            {/* Personnel responsible */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">İşlemi Yapan Personel</label>
              {personnelList.length === 0 ? (
                <div className="text-[10px] text-amber-400 italic">
                  Hiç personel tanımlanmamış. Önce personel ekleyebilirsiniz.
                </div>
              ) : (
                <select
                  value={personnelId}
                  onChange={(e) => setPersonnelId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.role ? `(${p.role})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Açıklama / Not</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İşlem ile ilgili detaylar (tedarikçi fatura no, vb.)..."
                rows={2}
                className="w-full p-2.5 rounded-lg text-white glass-input outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
            >
              Hareketi Kaydet
            </button>
          </form>
        )}
      </div>

      {/* Transaction Log Table (Right 2 Cols) */}
      <div className="lg:col-span-2 glass-panel p-5 rounded-2xl flex flex-col h-full overflow-hidden">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 shrink-0">
          <ClipboardList className="w-4 h-4 text-blue-400" /> Hareket Kayıtları (Denetim Günlüğü)
        </h2>

        <div className="flex-1 overflow-y-auto pr-1">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 italic">
              Henüz kayıtlı stok hareketi bulunamadı.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isGiris = tx.transaction_type === "GİRİŞ";
                const isCikis = tx.transaction_type === "ÇIKIŞ";

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isGiris 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : isCikis 
                            ? "bg-red-500/10 text-red-400 border-red-500/20" 
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {isGiris && <ArrowDownLeft className="w-4 h-4" />}
                        {isCikis && <ArrowUpRight className="w-4 h-4" />}
                        {!isGiris && !isCikis && <ArrowLeftRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-200 truncate">{tx.product_name}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500">
                          <span className="font-mono text-slate-400 bg-white/5 px-1 rounded">{tx.product_code}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-600" />
                            {isGiris && <span className="text-emerald-400">{tx.target_warehouse_name} Depo</span>}
                            {isCikis && <span className="text-red-400">{tx.source_warehouse_name} Depo</span>}
                            {!isGiris && !isCikis && (
                              <span>
                                {tx.source_warehouse_name} → {tx.target_warehouse_name}
                              </span>
                            )}
                          </span>
                        </div>
                        {tx.description && (
                          <div className="mt-2 text-[10px] text-slate-400 italic bg-white/[0.01] border-l border-white/10 pl-2">
                            "{tx.description}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata (Qty, Date, Personnel) */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      <div className="flex items-center sm:flex-col sm:items-end gap-2">
                        <span className={`font-bold text-sm ${
                          isGiris 
                            ? "text-emerald-400" 
                            : isCikis 
                              ? "text-red-400" 
                              : "text-blue-400"
                        }`}>
                          {isGiris ? "+" : isCikis ? "-" : ""}{tx.quantity} {tx.product_unit}
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {new Date(tx.transaction_date).toLocaleDateString("tr-TR")}</span>
                          {tx.personnel_name && (
                            <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> {tx.personnel_name}</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
