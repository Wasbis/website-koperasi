import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = (searchParams.get('search') || '').toLowerCase();
    const isExport = searchParams.get('export') === 'true';

    const db = await openDb();
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE NAMA LIKE ? OR ID_ANGGOTA LIKE ?';
      const likeSearch = `%${search}%`;
      params = [likeSearch, likeSearch];
    }

    const query = `
      SELECT 
        ID_ANGGOTA as id, 
        NAMA as nama,
        SUM(CASE WHEN KA IN ('601.00') THEN ROUND(KREDIT) - ROUND(DEBET) ELSE 0 END) as pokok,
        SUM(CASE WHEN KA IN ('602.00') THEN ROUND(KREDIT) - ROUND(DEBET) ELSE 0 END) as wajib,
        SUM(CASE WHEN KA IN ('403.00', '403.01', '403.02', '403.03', '404.00', '406.00') THEN ROUND(KREDIT) - ROUND(DEBET) ELSE 0 END) as sukarela,
        SUM(CASE WHEN KA IN ('104.01', '104.03', '104.04') THEN ROUND(DEBET) - ROUND(KREDIT) ELSE 0 END) as psp,
        SUM(CASE WHEN KA IN ('104.02') THEN ROUND(DEBET) - ROUND(KREDIT) ELSE 0 END) as ptk
      FROM ledger_anggota
      ${whereClause}
      GROUP BY ID_ANGGOTA, NAMA
      ORDER BY NAMA ASC
    `;

    const allResults = await db.all(query, params);

    // Compute derived totals
    const processedResults = allResults.map(row => ({
      id: row.id,
      nama: row.nama,
      pokok: row.pokok,
      wajib: row.wajib,
      sukarela: row.sukarela,
      psp: row.psp,
      ptk: row.ptk,
      total_saham: row.pokok + row.wajib + row.sukarela,
      total_piutang: row.psp + row.ptk
    }));

    if (isExport) {
        return NextResponse.json({ data: processedResults });
    }

    const total = processedResults.length;
    const startIndex = (page - 1) * limit;
    const paginated = processedResults.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: paginated,
      pagination: { total, page, limit, totalPages }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
