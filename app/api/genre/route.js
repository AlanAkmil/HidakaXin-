import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 300;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const page = parseInt(searchParams.get('page') || '1');
  if (!slug) return NextResponse.json({ error: 'Parameter slug wajib diisi' }, { status: 400 });
  try {
    const data = await scraper.genre(slug, page);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil donghua per genre', detail: e.message }, { status: 502 });
  }
}
