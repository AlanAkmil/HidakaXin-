import { NextResponse } from 'next/server';
import {
  searchMeioNovels,
  getLatestMeioNovels,
  getMeioNovelDetail,
  scrapeMeioChapter
} from '../../../../lib/meioNovelScraper';

// Usage:
//  /api/novel/meio-debug?mode=search&q=jadi+ibu+kos
//  /api/novel/meio-debug?mode=latest
//  /api/novel/meio-debug?mode=detail&slug=jadi-ibu-kos-di-dunia-game
//  /api/novel/meio-debug?mode=chapter&slug=jadi-ibu-kos-di-dunia-game&path=chapter-1035
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'latest';

  try {
    if (mode === 'search') {
      const q = searchParams.get('q') || '';
      const results = await searchMeioNovels(q, { limit: 10 });
      return NextResponse.json({ mode, query: q, count: results.length, results });
    }

    if (mode === 'detail') {
      const slug = searchParams.get('slug');
      if (!slug) return NextResponse.json({ error: 'slug diperlukan' }, { status: 400 });
      const detail = await getMeioNovelDetail(slug);
      return NextResponse.json({ mode, detail: { ...detail, chapters: detail.chapters.slice(0, 5) }, totalChapters: detail.chapterCount });
    }

    if (mode === 'chapter') {
      const slug = searchParams.get('slug');
      const path = searchParams.get('path');
      if (!slug || !path) return NextResponse.json({ error: 'slug & path diperlukan' }, { status: 400 });
      const chapter = await scrapeMeioChapter(slug, path);
      return NextResponse.json({
        mode,
        title: chapter.title,
        paragraphCount: chapter.content ? chapter.content.split('\n\n').length : 0,
        contentPreview: chapter.content.slice(0, 400),
        prevUrl: chapter.prevUrl,
        nextUrl: chapter.nextUrl
      });
    }

    const results = await getLatestMeioNovels({ limit: 10 });
    return NextResponse.json({ mode: 'latest', count: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
