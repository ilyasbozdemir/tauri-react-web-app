import React, { useState, useEffect } from "react";
import { useDb } from "./db-provider";
import { 
  Boxes, 
  Store, 
  Warehouse as WarehouseIcon, 
  Users, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight,
  ClipboardList
} from "lucide-react";

interface Stats {
  branches: number;
  warehouses: number;
  products: number;
  personnel: number;
  totalStock: number;
}

interface RecentTx {
  id: number;
  product_name: string;
  product_code: string;
  source_warehouse: string | null;
  target_warehouse: string | null;
  quantity: number;
  transaction_type: string;
  transaction_date: string;
  personnel_name: string | null;
}

interface WarehouseStock {
  warehouse_name: string;
  stock_level: number;
}

export const Dashboard: React.FC = () => {
  const { query } = useDb();
  const [stats, setStats] = useState<Stats>({ branches: 0, warehouses: 0, products: 0, personnel: 0, totalStock: 0 });
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [chartData, setChartData] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const branchCount = await query<{ count: number }>("SELECT COUNT(*) as count FROM branches");
      const warehouseCount = await query<{ count: number }>("SELECT COUNT(*) as count FROM warehouses");
      const productCount = await query<{ count: number }>("SELECT COUNT(*) as count FROM products");
      const personnelCount = await query<{ count: number }>("SELECT COUNT(*) as count FROM personnel");
      
      const totalStockRes = await query<{ total_stock: number }>(
        "SELECT SUM(CASE WHEN transaction_type = 'GİRİŞ' THEN quantity WHEN transaction_type = 'ÇIKIŞ' THEN -quantity ELSE 0 END) as total_stock FROM stock_transactions"
      );

      setStats({
        branches: branchCount[0]?.count || 0,
        warehouses: warehouseCount[0]?.count || 0,
        products: productCount[0]?.count || 0,
        personnel: personnelCount[0]?.count || 0,
        totalStock: totalStockRes[0]?.total_stock || 0
      });

      // Fetch recent transactions
      const txs = await query<RecentTx>(`
        SELECT 
          st.id,
          p.name as product_name,
          p.code as product_code,
          sw.name as source_warehouse,
          tw.name as target_warehouse,
          st.quantity,
          st.transaction_type,
          st.transaction_date,
          pers.name as personnel_name
        FROM stock_transactions st
        JOIN products p ON st.product_id = p.id
        LEFT JOIN warehouses sw ON st.source_warehouse_id = sw.id
        LEFT JOIN warehouses tw ON st.target_warehouse_id = tw.id
        LEFT JOIN personnel pers ON st.personnel_id = pers.id
        ORDER BY st.transaction_date DESC
        LIMIT 5
      `);
      setRecentTxs(txs);

      // Fetch warehouse stock levels for chart
      const wStocks = await query<WarehouseStock>(`
        SELECT 
          w.name as warehouse_name,
          COALESCE(
            SUM(CASE WHEN st.target_warehouse_id = w.id THEN st.quantity ELSE 0 END) -
            SUM(CASE WHEN st.source_warehouse_id = w.id THEN st.quantity ELSE 0 END)
          , 0) as stock_level
        FROM warehouses w
        LEFT JOIN stock_transactions st ON (st.source_warehouse_id = w.id OR st.target_warehouse_id = w.id)
        GROUP BY w.id
      `);
      setChartData(wStocks);
    } catch (e) {
      console.error("Dashboard load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        Yükleniyor...
      </div>
    );
  }

  // Calculate chart metrics
  const maxStock = Math.max(...chartData.map(d => d.stock_level), 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-white">Genel Durum Paneli</h2>
        <p className="text-xs text-slate-400 mt-1">Sisteminizdeki güncel özet veriler ve hareketler</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Şubeler</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.branches}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <WarehouseIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Depolar</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.warehouses}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ürün Çeşidi</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.products}</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Personel</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.personnel}</div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Stok</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.totalStock}</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stock chart */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white">Depo Stok Dağılımı</h3>
            <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full">
              Toplam Adet
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end min-h-[220px]">
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 italic">
                Stok dağılımı gösterilecek veri yok. Önce depo ekleyin.
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 items-end h-[180px] px-2 border-b border-white/5">
                {chartData.slice(0, 5).map((data, idx) => {
                  const heightPercent = Math.max(10, (data.stock_level / maxStock) * 100);
                  return (
                    <div key={idx} className="flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 bg-slate-900 border border-white/10 text-[10px] text-white px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10">
                        {data.stock_level} Adet
                      </div>
                      
                      {/* Bar */}
                      <div 
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-blue-600/40 to-blue-400 border border-blue-400/20 group-hover:from-blue-500/50 group-hover:to-blue-300 transition duration-200"
                      />
                      
                      {/* Label */}
                      <span className="text-[10px] text-slate-400 truncate w-full text-center mt-2 group-hover:text-white transition">
                        {data.warehouse_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent transactions */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-400" /> Son Hareketler
            </h3>
            <button 
              onClick={fetchDashboardData}
              className="text-[10px] text-blue-400 hover:text-blue-300 transition"
            >
              Yenile
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {recentTxs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic py-8">
                Henüz stok hareketi kaydedilmemiş.
              </div>
            ) : (
              recentTxs.map((tx) => {
                const isGiris = tx.transaction_type === "GİRİŞ";
                const isCikis = tx.transaction_type === "ÇIKIŞ";
                
                return (
                  <div 
                    key={tx.id} 
                    className="p-3 rounded-lg border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] flex items-center justify-between gap-3 text-xs transition"
                  >
                    <div className="flex items-center gap-3">
                      {/* Transaction Type Icon */}
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
                      
                      {/* Tx details */}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate">{tx.product_name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{tx.product_code}</span>
                          <span>•</span>
                          <span className="truncate">
                            {isGiris && `${tx.target_warehouse} Giriş`}
                            {isCikis && `${tx.source_warehouse} Çıkış`}
                            {!isGiris && !isCikis && `${tx.source_warehouse} → ${tx.target_warehouse}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Badge */}
                    <div className="text-right">
                      <div className={`font-bold ${
                        isGiris 
                          ? "text-emerald-400" 
                          : isCikis 
                            ? "text-red-400" 
                            : "text-blue-400"
                      }`}>
                        {isGiris ? "+" : isCikis ? "-" : ""}{tx.quantity}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(tx.transaction_date).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
