import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await scraper.genres();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil daftar genre', detail: e.message }, { status: 502 });
  }
}
