import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

const kaMap = {
  '601.00': 'Pokok', '602.00': 'Wajib', 
  '403.00': 'Sukarela', '403.01': 'Sukarela', '403.02': 'Sukarela', '403.03': 'Sukarela',
  '404.00': 'Sukarela', '406.00': 'Sukarela', // Include other simpanan if any
  '104.01': 'PSP', '104.02': 'PTK', '104.03': 'PSP', '104.04': 'PSP'
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    
    if (!id) {
       return NextResponse.json({ error: "Parameter ID Anggota diperlukan." }, { status: 400 });
    }

    const db = await openDb();
    
    // Get member name
    const memberRow = await db.get('SELECT NAMA FROM ledger_anggota WHERE ID_ANGGOTA = ? LIMIT 1', [id]);
    if (!memberRow) {
      return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
    }
    const member = { id, nama: memberRow.NAMA };

    const trans = await db.all(`
      SELECT TGL, KET, NOBUKTI, KA, DEBET, KREDIT, KODE
      FROM ledger_anggota
      WHERE ID_ANGGOTA = ?
      ORDER BY KODE ASC, TGL ASC, NOBUKTI ASC
    `, [id]);

    const saldo_awal = {
      Tanggal: '01-Jan-25',
      Penjelasan: 'Saldo Awal',
      NoVo: '',
      Ref: '',
      Pokok_D: 0, Pokok_K: 0,
      Wajib_D: 0, Wajib_K: 0,
      Sukarela_D: 0, Sukarela_K: 0,
      PSP_D: 0, PSP_K: 0,
      PTK_D: 0, PTK_K: 0
    };

    const transactions = [];

    for (const tx of trans) {
      const ka_str = String(tx.KA).trim();
      const cat = kaMap[ka_str];
      if (!cat) continue;
      
      const isKode0 = (parseInt(tx.KODE) === 0);
      const debet = Math.round(parseFloat(tx.DEBET) || 0);
      const kredit = Math.round(parseFloat(tx.KREDIT) || 0);
      
      if (debet === 0 && kredit === 0) continue; // Skip empty rows

      if (isKode0) {
        // Accumulate into saldo_awal
        saldo_awal[`${cat}_D`] += debet;
        saldo_awal[`${cat}_K`] += kredit;
      } else {
        // Format date like '16-Jun-25'
        const tDate = new Date(tx.TGL);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const displayDate = isNaN(tDate.getTime()) ? String(tx.TGL).split(' ')[0] : `${tDate.getDate().toString().padStart(2, '0')}-${months[tDate.getMonth()]}-25`;

        let refStr = debet > 0 ? 'D' : 'K';
        if (debet > 0 && kredit > 0) refStr = 'D/K';

        const row = {
          Tanggal: displayDate,
          Penjelasan: tx.KET,
          NoVo: String(tx.NOBUKTI === '-' ? '' : tx.NOBUKTI).padStart(5, '0').replace('00000', ''), 
          Ref: refStr,
          Pokok_D: 0, Pokok_K: 0,
          Wajib_D: 0, Wajib_K: 0,
          Sukarela_D: 0, Sukarela_K: 0,
          PSP_D: 0, PSP_K: 0,
          PTK_D: 0, PTK_K: 0
        };

        row[`${cat}_D`] = debet;
        row[`${cat}_K`] = kredit;
        
        transactions.push(row);
      }
    }

    const rows = [saldo_awal, ...transactions];

    // Compute Totals
    const totals = {
      Pokok_D: 0, Pokok_K: 0,
      Wajib_D: 0, Wajib_K: 0,
      Sukarela_D: 0, Sukarela_K: 0,
      PSP_D: 0, PSP_K: 0,
      PTK_D: 0, PTK_K: 0
    };

    for (const r of rows) {
      totals.Pokok_D += r.Pokok_D; totals.Pokok_K += r.Pokok_K;
      totals.Wajib_D += r.Wajib_D; totals.Wajib_K += r.Wajib_K;
      totals.Sukarela_D += r.Sukarela_D; totals.Sukarela_K += r.Sukarela_K;
      totals.PSP_D += r.PSP_D; totals.PSP_K += r.PSP_K;
      totals.PTK_D += r.PTK_D; totals.PTK_K += r.PTK_K;
    }

    const T_Saham = (totals.Pokok_K - totals.Pokok_D) + 
                    (totals.Wajib_K - totals.Wajib_D) + 
                    (totals.Sukarela_K - totals.Sukarela_D);
    
    const T_Piutang = (totals.PSP_D - totals.PSP_K) + 
                      (totals.PTK_D - totals.PTK_K);

    return NextResponse.json({
      member,
      rows,
      totals,
      T_Saham,
      T_Piutang,
      recordCount: rows.length
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
