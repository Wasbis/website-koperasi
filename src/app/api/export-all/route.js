import { openDb } from '@/lib/db';

const kaLabel = {
  '601.00': 'Simpanan Pokok',
  '602.00': 'Simpanan Wajib',
  '403.00': 'Simpanan Sukarela',
  '403.01': 'Simpanan Sukarela Khusus',
  '403.02': 'Simpanan Sukarela SKB',
  '403.03': 'Simpanan Sukarela Wrg',
  '404.00': 'Simpanan Sukarela Lain',
  '406.00': 'Simpanan Sukarela Lain',
  '104.01': 'Piutang Simpan Pinjam',
  '104.02': 'Piutang Toko',
  '104.03': 'Piutang SP Lain',
  '104.04': 'Piutang SP Lain',
};

const round = (v) => Math.round(parseFloat(v) || 0);

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'detail'; // 'detail' atau 'kartu'
    const search = searchParams.get('search') || '';
    
    const db = await openDb();
    
    let whereClause = 'WHERE KODE IN (0, 1)';
    let params = [];
    if (search) {
      whereClause += ' AND (NAMA LIKE ? OR ID_ANGGOTA LIKE ?)';
      params = [`%${search}%`, `%${search}%`];
    }

    if (format === 'kartu') {
      // Export: 1 baris per anggota dengan saldo akhir per akun
      const rows = await db.all(`
        SELECT 
          ID_ANGGOTA,
          NAMA,
          SUM(CASE WHEN KA='601.00' THEN ROUND(KREDIT)-ROUND(DEBET) ELSE 0 END) as Pokok,
          SUM(CASE WHEN KA='602.00' THEN ROUND(KREDIT)-ROUND(DEBET) ELSE 0 END) as Wajib,
          SUM(CASE WHEN KA IN ('403.00','403.01','403.02','403.03','404.00','406.00') THEN ROUND(KREDIT)-ROUND(DEBET) ELSE 0 END) as Sukarela,
          SUM(CASE WHEN KA IN ('104.01','104.03','104.04') THEN ROUND(DEBET)-ROUND(KREDIT) ELSE 0 END) as Piutang_SP,
          SUM(CASE WHEN KA='104.02' THEN ROUND(DEBET)-ROUND(KREDIT) ELSE 0 END) as Piutang_Toko
        FROM ledger_anggota
        ${whereClause}
        GROUP BY ID_ANGGOTA, NAMA
        ORDER BY NAMA ASC
      `, params);

      // Build CSV
      const header = ['No_Anggota','Nama','Saldo_Pokok','Saldo_Wajib','Saldo_Sukarela','Total_Saham','Piutang_SP','Piutang_Toko','Total_Piutang'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const total_saham = r.Pokok + r.Wajib + r.Sukarela;
        const total_piutang = r.Piutang_SP + r.Piutang_Toko;
        lines.push([
          escapeCsv(r.ID_ANGGOTA),
          escapeCsv(r.NAMA),
          r.Pokok,
          r.Wajib,
          r.Sukarela,
          total_saham,
          r.Piutang_SP,
          r.Piutang_Toko,
          total_piutang
        ].join(','));
      }

      const csvText = lines.join('\n');
      return new Response(csvText, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Rekap_Saldo_Anggota_2025.csv"`,
        }
      });

    } else {
      // Export: Semua baris ledger detail per anggota (flat)
      const rows = await db.all(`
        SELECT 
          ID_ANGGOTA,
          NIP,
          NAMA,
          TGL,
          NOBUKTI,
          KA,
          KET,
          ROUND(DEBET) as DEBET,
          ROUND(KREDIT) as KREDIT,
          KODE
        FROM ledger_anggota
        ${whereClause}
        ORDER BY ID_ANGGOTA ASC, KODE ASC, TGL ASC
      `, params);

      const header = ['No_Anggota','NIP','Nama','Tanggal','NoBukti','Kode_Akun','Keterangan','Kategori_Akun','Debet','Kredit','Jenis'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const jenis = r.KODE === 0 ? 'Saldo Awal' : 'Mutasi';
        const label = kaLabel[r.KA] || r.KA;
        lines.push([
          escapeCsv(r.ID_ANGGOTA),
          escapeCsv(r.NIP),
          escapeCsv(r.NAMA),
          escapeCsv(r.TGL),
          escapeCsv(r.NOBUKTI),
          escapeCsv(r.KA),
          escapeCsv(r.KET),
          escapeCsv(label),
          r.DEBET,
          r.KREDIT,
          escapeCsv(jenis)
        ].join(','));
      }

      const csvText = lines.join('\n');
      return new Response(csvText, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Export_Detail_Semua_Anggota_2025.csv"`,
        }
      });
    }

  } catch (error) {
    console.error('Export Error:', error);
    return new Response(JSON.stringify({ error: 'Export gagal: ' + error.message }), { status: 500 });
  }
}
