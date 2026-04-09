import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';
    
    // Check if it's an export request
    const isExport = searchParams.get('export') === 'true';

    const db = await openDb();
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE NAMA LIKE ? OR NOBUKTI LIKE ? OR ID_ANGGOTA LIKE ? OR KA LIKE ?';
      const likeSearch = `%${search}%`;
      params = [likeSearch, likeSearch, likeSearch, likeSearch];
    }
    
    if (isExport) {
       // Fetch all matching without limit
       const transactions = await db.all(`
        SELECT * FROM ledger_anggota
        ${whereClause}
        ORDER BY TGL DESC, NOBUKTI ASC
      `, params);
      return NextResponse.json({ transactions });
    }

    // Default paginated
    const offset = (page - 1) * limit;
    
    const transactions = await db.all(`
      SELECT * FROM ledger_anggota
      ${whereClause}
      ORDER BY TGL DESC, NOBUKTI ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const countResult = await db.get(`
      SELECT COUNT(*) as count FROM ledger_anggota
      ${whereClause}
    `, params);
    
    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error("API DB Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
