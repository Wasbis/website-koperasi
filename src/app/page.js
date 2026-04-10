"use client";
import { useState, useEffect } from "react";

// Helper: Format Rupiah
const formatRp = (val) => new Intl.NumberFormat('id-ID').format(Math.round(val || 0));

// Helper: Download CSV
const downloadCsv = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row)
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');
  const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Bulk Export Panel Component
function BulkExportPanel() {
  const [loading, setLoading] = useState(null);

  const handleExport = (format) => {
    setLoading(format);
    const a = document.createElement('a');
    a.href = `/api/export-all?format=${format}`;
    a.download = format === 'kartu' ? 'Rekap_Saldo_Anggota_2025.csv' : 'Export_Detail_Semua_Anggota_2025.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setLoading(null), 3000);
  };

  return (
    <div className="mb-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-800/40 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-semibold text-cyan-300">📦 Bulk Export Data Anggota</p>
        <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">Unduh seluruh data semua anggota sekaligus dalam format CSV</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button
          onClick={() => handleExport('kartu')}
          disabled={loading === 'kartu'}
          className="flex-1 sm:flex-none text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 font-medium">
          {loading === 'kartu' ? '⏳ Mengunduh...' : '📊 Export Rekap Saldo (1 baris/anggota)'}
        </button>
        <button
          onClick={() => handleExport('detail')}
          disabled={loading === 'detail'}
          className="flex-1 sm:flex-none text-xs px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 font-medium">
          {loading === 'detail' ? '⏳ Mengunduh...' : '🗂️ Export Detail Semua Mutasi'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-2 sm:p-4 md:p-8 relative overflow-x-hidden">
      {/* Background Ornaments */}
      <div className="fixed top-[-20%] left-[-10%] w-96 h-96 bg-cyan-700/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-blue-800/20 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

      <div className="max-w-[95%] mx-auto relative z-10 w-full">
        <header className="mb-4 border-b border-neutral-800 pb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            Koperasi Dashboard Pro
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm">Integrasi Buku Tabungan & Rekap Mutasi 2025</p>
        </header>

        <BulkExportPanel />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 bg-neutral-900/50 p-1.5 rounded-lg border border-neutral-800/80 w-full sm:w-fit backdrop-blur-sm">
          <button onClick={() => setActiveTab("summary")} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'summary' ? 'bg-cyan-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>Rekap Saldo</button>
          <button onClick={() => setActiveTab("ledger")} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'ledger' ? 'bg-cyan-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>Kartu Anggota</button>
          <button onClick={() => setActiveTab("raw")} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'raw' ? 'bg-cyan-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>Data Transaksi</button>
        </div>

        {/* Content Area */}
        <div className="transition-all duration-500 min-h-[70vh]">
          {activeTab === "summary" && <TabSummary />}
          {activeTab === "ledger" && <TabLedger />}
          {activeTab === "raw" && <TabRawData />}
        </div>
      </div>
    </main>
  );
}

function TabSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchData(); }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/summary?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
    const json = await res.json();
    if(json.data) {
      setData(json.data);
      setTotalPages(json.pagination.totalPages);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/summary?export=true&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if(json.data) {
        downloadCsv(json.data, 'Export_Rekap_Anggota.csv');
      }
    } catch (err) {
      alert("Gagal melakukan export!");
    }
    setExporting(false);
  };

  return (
    <div className="bg-neutral-900/60 rounded-xl border border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="p-3 sm:p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-neutral-950/50">
        <input 
          type="text" placeholder="Cari Nama Anggota ..." value={search}
          onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          className="w-full sm:w-80 bg-neutral-900 border border-neutral-700 text-sm rounded-md p-2 focus:border-cyan-500 outline-none text-neutral-200"
        />
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="text-cyan-400 text-xs sm:text-sm font-medium mr-auto sm:mr-0">Buku Pembantu Rekap Saldo Total</div>
          <button 
            onClick={handleExport} disabled={exporting}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs sm:text-sm px-3 py-1.5 rounded disabled:opacity-50 transition-colors flex items-center gap-2">
            {exporting ? 'Mengekspor...' : 'Export Semua (CSV)'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[65vh]">
        <table className="w-full text-xs sm:text-sm text-right text-neutral-300 whitespace-nowrap">
          <thead className="text-[10px] sm:text-xs text-neutral-400 uppercase bg-neutral-950 sticky top-0 z-10 shadow-md">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left">No Agt</th>
              <th className="px-3 sm:px-4 py-3 text-left">Nama</th>
              <th className="px-3 sm:px-4 py-3 bg-neutral-900/40">T. Pokok</th>
              <th className="px-3 sm:px-4 py-3 bg-neutral-900/40">T. Wajib</th>
              <th className="px-3 sm:px-4 py-3 bg-neutral-900/40">T. Sukarela</th>
              <th className="px-3 sm:px-4 py-3 text-emerald-400 font-bold bg-neutral-900/80">TOTAL SAHAM</th>
              <th className="px-3 sm:px-4 py-3 bg-neutral-900/40">P. Simpan Pinjam</th>
              <th className="px-3 sm:px-4 py-3 bg-neutral-900/40">P. Toko</th>
              <th className="px-3 sm:px-4 py-3 text-rose-400 font-bold bg-neutral-900/80">TOTAL PIUTANG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {loading ? <tr><td colSpan="9" className="text-center p-10">Loading Data...</td></tr> : 
              data.map((m, i) => (
                <tr key={m.id} className="hover:bg-neutral-800/80 transition-colors">
                   <td className="px-3 sm:px-4 py-2 sm:py-3 text-left font-mono text-neutral-500">{m.id}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3 text-left font-medium text-cyan-200">{m.nama}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3">{formatRp(m.pokok)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3">{formatRp(m.wajib)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3">{formatRp(m.sukarela)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-emerald-400 bg-emerald-900/10">{formatRp(m.total_saham)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3">{formatRp(m.psp)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3">{formatRp(m.ptk)}</td>
                   <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-rose-400 bg-rose-900/10">{formatRp(m.total_piutang)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 p-3 sm:p-4 bg-neutral-950/80 text-xs sm:text-sm items-center justify-between">
         <span className="text-neutral-500">Hal {page} / {totalPages}</span>
         <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page===1} className="px-3 py-1.5 bg-neutral-800 rounded disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page===totalPages} className="px-3 py-1.5 bg-neutral-800 rounded disabled:opacity-50">Next</button>
         </div>
      </div>
    </div>
  )
}

function TabLedger() {
  const [memberId, setMemberId] = useState("");
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    if(!memberId) return;
    setLoading(true);
    setLedger(null); // reset
    const res = await fetch(`/api/ledger?id=${encodeURIComponent(memberId)}`);
    if(res.ok) {
       setLedger(await res.json());
    } else {
       alert("Data Tidak Ditemukan!");
    }
    setLoading(false);
  };

  const handlePrint = () => {
     window.print();
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 print:hidden">
        <input 
            type="text" placeholder="Masukkan ID Anggota (Mth: 3137)..." 
            value={memberId} onChange={e => setMemberId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchLedger()}
            className="w-full sm:w-72 bg-neutral-900 border border-neutral-700 text-sm rounded-md p-2.5 focus:border-cyan-500 outline-none text-neutral-200 shadow-inner"
        />
        <button onClick={fetchLedger} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors">Cari & Tampilkan</button>
        {ledger && <button onClick={handlePrint} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors sm:ml-auto flex gap-2 items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Cetak Kartu Fisik</button>}
      </div>

      {loading && <div className="text-cyan-400 text-sm sm:text-xl font-mono animate-pulse">Menghitung Saldo Berjalan...</div>}

      {/* KERTAS CETAKAN A4 SIMULATION */}
      {ledger && (
        <div className="overflow-x-auto print:overflow-visible pb-4">
          <div className="bg-white text-black p-4 sm:p-8 min-w-[1000px] md:min-w-0 md:max-w-[1200px] rounded-sm shadow-2xl print:m-0 print:p-0 print:shadow-none print:min-w-0">
             
             <div className="font-bold mb-4 font-serif">
                <h2 className="text-lg sm:text-xl underline decoration-2 underline-offset-4 mb-2">KARTU SIMPAN PINJAM ANGGOTA</h2>
                <div className="grid grid-cols-[100px_10px_1fr] text-xs sm:text-sm mt-3">
                   <div>No.Anggota</div><div>:</div><div>{ledger.member.id}</div>
                   <div>Nama</div><div>:</div><div className="font-black text-sm sm:text-base">{ledger.member.nama}</div>
                </div>
             </div>

             <table className="w-full text-[10px] sm:text-xs text-right border-collapse border border-neutral-400">
               <thead className="bg-[#e9ecef] text-black">
                 <tr>
                   <th rowSpan="2" className="border border-neutral-400 px-1 py-1 sm:py-2 text-center w-6 sm:w-8">No.</th>
                   <th rowSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center whitespace-nowrap">Tanggal</th>
                   <th rowSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-left">Penjelasan</th>
                   <th rowSpan="2" className="border border-neutral-400 px-1 text-center whitespace-nowrap">NoVo</th>
                   <th rowSpan="2" className="border border-neutral-400 px-1 text-center">Ref.</th>
                   <th colSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center leading-tight">Simpanan<br/>Pokok</th>
                   <th colSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center leading-tight">Simpanan<br/>Wajib</th>
                   <th colSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center leading-tight">Simpanan<br/>Sukarela</th>
                   <th colSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center leading-tight">Piutang<br/>Simpan Pinjam</th>
                   <th colSpan="2" className="border border-neutral-400 px-1 sm:px-2 text-center leading-tight">Piutang<br/>Toko</th>
                 </tr>
                 <tr className="italic text-[9px] sm:text-[10px]">
                   <th className="border border-neutral-400 px-1 text-center">D</th><th className="border border-neutral-400 px-1 text-center">K</th>
                   <th className="border border-neutral-400 px-1 text-center">D</th><th className="border border-neutral-400 px-1 text-center">K</th>
                   <th className="border border-neutral-400 px-1 text-center">D</th><th className="border border-neutral-400 px-1 text-center">K</th>
                   <th className="border border-neutral-400 px-1 text-center">D</th><th className="border border-neutral-400 px-1 text-center">K</th>
                   <th className="border border-neutral-400 px-1 text-center">D</th><th className="border border-neutral-400 px-1 text-center">K</th>
                 </tr>
               </thead>
               <tbody>
                 {ledger.rows.map((r, i) => (
                   <tr key={i} className="hover:bg-neutral-100">
                      <td className="border border-neutral-300 px-1 text-center">{i+1}</td>
                      <td className="border border-neutral-300 px-1 sm:px-2 text-center whitespace-nowrap">{r.Tanggal}</td>
                      <td className="border border-neutral-300 px-1 sm:px-2 text-left truncate max-w-[120px] sm:max-w-none">{r.Penjelasan}</td>
                      <td className="border border-neutral-300 px-1 text-center font-mono whitespace-nowrap">{r.NoVo}</td>
                      <td className="border border-neutral-300 px-1 text-center">{r.Ref?.toUpperCase()}</td>
                      
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Pokok_D ? formatRp(r.Pokok_D) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Pokok_K ? formatRp(r.Pokok_K) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Wajib_D ? formatRp(r.Wajib_D) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Wajib_K ? formatRp(r.Wajib_K) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Sukarela_D ? formatRp(r.Sukarela_D) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.Sukarela_K ? formatRp(r.Sukarela_K) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.PSP_D ? formatRp(r.PSP_D) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.PSP_K ? formatRp(r.PSP_K) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.PTK_D ? formatRp(r.PTK_D) : 0}</td>
                      <td className="border border-neutral-300 px-1 whitespace-nowrap">{r.PTK_K ? formatRp(r.PTK_K) : 0}</td>
                   </tr>
                 ))}
                 
                 {/* Footer / Jumlahan */}
                 <tr className="bg-[#f8f9fa] font-bold">
                    <td colSpan="5" className="border border-neutral-400 px-2 text-left">Jumlah</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Pokok_D)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Pokok_K)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Wajib_D)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Wajib_K)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Sukarela_D)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.Sukarela_K)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.PSP_D)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.PSP_K)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.PTK_D)}</td>
                    <td className="border border-neutral-400 px-1 whitespace-nowrap">{formatRp(ledger.totals.PTK_K)}</td>
                 </tr>
                 <tr className="bg-[#e9ecef] font-bold">
                    <td colSpan="5" className="border border-neutral-400 px-1 sm:px-2 text-left italic">
                       Saldo Akhir No.Anggota = {ledger.member.id} ({ledger.recordCount} detail records)
                    </td>
                    <td className="border border-neutral-400 px-1 bg-white"></td>
                    <td className="border border-neutral-400 px-1">{formatRp(ledger.totals.Pokok_K - ledger.totals.Pokok_D)}</td>
                    <td className="border border-neutral-400 px-1 bg-white"></td>
                    <td className="border border-neutral-400 px-1">{formatRp(ledger.totals.Wajib_K - ledger.totals.Wajib_D)}</td>
                    <td className="border border-neutral-400 px-1 bg-white"></td>
                    <td className="border border-neutral-400 px-1">{formatRp(ledger.totals.Sukarela_K - ledger.totals.Sukarela_D)}</td>
                    <td className="border border-neutral-400 px-1 bg-white"></td>
                    <td className="border border-neutral-400 px-1 bg-white flex justify-end text-transparent border-none w-0 truncate">0</td>
                    <td className="border border-neutral-400 px-1 bg-white border-l-0 border-r-0"></td>
                    <td className="border border-neutral-400 px-1 bg-white border-l-0"></td>
                 </tr>
                 <tr className="bg-[#e9ecef] font-bold">
                    <td colSpan="5" className="border border-neutral-400 px-2 bg-white"></td>
                    <td colSpan="2" className="border border-neutral-400 px-2 bg-white text-right italic pr-1 sm:pr-4">Total Saham :</td>
                    <td colSpan="4" className="border border-neutral-400 px-2 text-center text-[10px] sm:text-sm">{formatRp(ledger.T_Saham)}</td>
                    <td colSpan="2" className="border border-neutral-400 px-2 bg-white text-right italic pr-1 sm:pr-4">Total Piutang :</td>
                    <td colSpan="2" className="border border-neutral-400 px-2 text-center text-[10px] sm:text-sm bg-neutral-200">{formatRp(ledger.T_Piutang)}</td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TabRawData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchData(); }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/transactions?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
    const json = await res.json();
    if(json.transactions) {
      setData(json.transactions);
      setTotalPages(json.pagination.totalPages);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/transactions?export=true&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if(json.transactions) {
        downloadCsv(json.transactions, 'Export_Raw_Transaksi.csv');
      }
    } catch (err) {
      alert("Gagal mengekspor data transaksi!");
    }
    setExporting(false);
  }

  return (
    <div className="bg-neutral-900/60 rounded-xl border border-neutral-800 shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="p-3 sm:p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <input 
          type="text" placeholder="Cari by Nama, ID, dll..." value={search}
          onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          className="w-full sm:w-80 bg-neutral-900 border border-neutral-700 text-sm rounded-md p-2 focus:border-cyan-500 outline-none text-neutral-200"
        />
        <button 
            onClick={handleExport} disabled={exporting}
            className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs sm:text-sm px-3 py-1.5 rounded disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {exporting ? 'Mengekspor...' : 'Export Filtered/Semua Transaksi (CSV)'}
        </button>
      </div>
      <div className="overflow-x-auto max-h-[65vh]">
        <table className="w-full text-xs sm:text-sm text-left text-neutral-300 whitespace-nowrap">
          <thead className="text-[10px] sm:text-xs text-neutral-400 uppercase bg-neutral-950 sticky top-0">
            <tr>
              <th className="px-3 sm:px-5 py-3">Tanggal</th>
              <th className="px-3 sm:px-5 py-3">No Bukti</th>
              <th className="px-3 sm:px-5 py-3">ID Agt</th>
              <th className="px-3 sm:px-5 py-3">Kode Akun</th>
              <th className="px-3 sm:px-5 py-3">Keterangan</th>
              <th className="px-3 sm:px-5 py-3 text-right">Debit (Rp)</th>
              <th className="px-3 sm:px-5 py-3 text-right">Kredit (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? <tr><td colSpan="7" className="text-center p-10">Loading Data...</td></tr> : 
              data.map((item, i) => (
                <tr key={i} className="hover:bg-neutral-800/80">
                   <td className="px-3 sm:px-5 py-2 sm:py-3 font-mono">{item.TGL}</td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3 font-mono text-neutral-500">{item.NOBUKTI}</td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3">{item.ID_ANGGOTA}</td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3 "><span className="bg-neutral-800 px-2 py-1 rounded text-cyan-400">{item.KA}</span></td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3 max-w-xs sm:max-w-sm truncate" title={item.KET}>{item.KET}</td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3 text-right font-mono text-emerald-400">{formatRp(item.DEBET)}</td>
                   <td className="px-3 sm:px-5 py-2 sm:py-3 text-right font-mono text-emerald-400">{formatRp(item.KREDIT)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 p-3 sm:p-4 bg-neutral-950/80 text-xs sm:text-sm items-center justify-between">
         <span className="text-neutral-500">Hal {page} / {totalPages}</span>
         <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page===1} className="px-3 py-1.5 bg-neutral-800 rounded disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page===totalPages} className="px-3 py-1.5 bg-neutral-800 rounded disabled:opacity-50">Next</button>
         </div>
      </div>
    </div>
  )
}
