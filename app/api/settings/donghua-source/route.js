import { NextResponse } from 'next/server';
import { DONGHUA_SOURCE_COOKIE } from '../../../../lib/donghuaSource';

export async function POST(request) {
  const { source } = await request.json();
  if (source !== 'animexin' && source !== 'anichin') {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, source });
  res.cookies.set(DONGHUA_SOURCE_COOKIE, source, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  });
  return res;
}
