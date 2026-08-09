import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');
  if (!q) return NextResponse.json({ error: 'Parameter q wajib diisi' }, { status: 400 });
  try {
    const data = await scraper.search(q, page);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mencari donghua', detail: e.message }, { status: 502 });
  }
}
