import sanka from '../../../lib/sankaScraper';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  try {
    const data = await sanka.server(id);
    return Response.json({ url: data?.url || null });
  } catch (e) {
    return Response.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}
