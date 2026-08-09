import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 300; // cache 5 min on Vercel edge/ISR for the API too

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  try {
    const data = await scraper.home(page);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil data homepage', detail: e.message }, { status: 502 });
  }
}
