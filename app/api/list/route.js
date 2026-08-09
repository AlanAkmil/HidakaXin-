import { NextResponse } from 'next/server';
import scraper from '../../../lib/scraper';

export const revalidate = 180;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const order = searchParams.get('order') || 'update';
  const page = parseInt(searchParams.get('page') || '1');
  try {
    const data = await scraper.list(order, page);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Gagal ambil daftar donghua', detail: e.message }, { status: 502 });
  }
}
