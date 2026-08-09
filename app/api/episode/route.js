import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 120;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Parameter slug wajib diisi' }, { status: 400 });
  try {
    const data = await scraper.episode(slug);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil data episode', detail: e.message }, { status: 502 });
  }
}
