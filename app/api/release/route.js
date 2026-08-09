import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 600;

export async function GET() {
  try {
    const data = await scraper.release();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil jadwal rilis', detail: e.message }, { status: 502 });
  }
}
