import manga from '../../lib/mangaScraper';
import anichin from '../../lib/anichinScraper';
import sanka from '../../lib/sankaScraper';

export const dynamic = 'force-dynamic';

async function safeCall(fn) {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export default async function DebugPage({ searchParams }) {
  const test = searchParams?.test || 'menu';
  const chapter = searchParams?.chapter || 'solo-leveling-chapter-1-bahasa-indonesia';
  const komikSlug = searchParams?.slug || 'solo-leveling';
  const anichinSlug = searchParams?.anichinSlug || '';
  const sankaSlug = searchParams?.sankaSlug || '';

  let content = null;

  if (test === 'komik-read') {
    const read = await safeCall(() => manga.read(chapter));
    content = (
      <>
        <Section title={`manga.read("${chapter}") — raw result`}>
          <pre>{JSON.stringify(read, null, 2)}</pre>
        </Section>
        {read.ok && read.result?.images?.length > 0 && (
          <Section title="Extracted image URLs — test direct vs via our proxy">
            <ul className="space-y-2">
              {read.result.images.slice(0, 5).map((url, i) => (
                <li key={i} className="border-b border-line pb-2">
                  <p className="mb-1 break-all">
                    <a href={url} target="_blank" rel="noreferrer" className="text-accent underline">
                      {i + 1}. Direct: {url}
                    </a>
                  </p>
                  <p className="break-all">
                    <a
                      href={`/api/komik/img?url=${encodeURIComponent(url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet underline"
                    >
                      Via proxy →
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Section title="Change chapter via ?chapter=slug in the URL">
          <p className="text-xs text-ink-faint">Current: {chapter}</p>
        </Section>
      </>
    );
  }

  if (test === 'komik-detail') {
    const detail = await safeCall(() => manga.detail(komikSlug));
    content = (
      <Section title={`manga.detail("${komikSlug}") — raw result`}>
        <pre>{JSON.stringify(detail, null, 2)}</pre>
      </Section>
    );
  }

  if (test === 'komik-list') {
    const list = await safeCall(() => manga.home());
    content = (
      <Section title="manga.home() — raw result (first 3 items)">
        <pre>{JSON.stringify(list.ok ? { ...list.result, items: list.result.items?.slice(0, 3) } : list.error, null, 2)}</pre>
      </Section>
    );
  }

  if (test === 'anichin-home') {
    const home = await safeCall(() => anichin.home(1));
    content = (
      <Section title="anichin.home(1) — raw mapped result">
        <pre>{JSON.stringify(home, null, 2)}</pre>
      </Section>
    );
  }

  if (test === 'anichin-schedule') {
    const sched = await safeCall(() => anichin.schedule());
    content = (
      <Section title="anichin.schedule() — raw mapped result">
        <pre>{JSON.stringify(sched, null, 2)}</pre>
      </Section>
    );
  }

  if (test === 'anichin-detail') {
    const detail = await safeCall(() => anichin.detail(anichinSlug));
    content = (
      <>
        <Section title={`anichin.detail("${anichinSlug || '(kosong, isi ?anichinSlug=... di URL)'}") — raw mapped result`}>
          <pre>{JSON.stringify(detail, null, 2)}</pre>
        </Section>
        <Section title="Cara isi parameter">
          <p className="text-xs text-ink-faint">
            Ambil slug dari card donghua di Home/Jadwal pas server Anichin aktif — atau dari hasil "anichin-home" di atas, pakai field &quot;slug&quot;.
          </p>
        </Section>
      </>
    );
  }

  if (test === 'anichin-episode') {
    const ep = await safeCall(() => anichin.episode(anichinSlug));
    content = (
      <Section title={`anichin.episode("${anichinSlug}") — raw mapped result`}>
        <pre>{JSON.stringify(ep, null, 2)}</pre>
      </Section>
    );
  }

  if (test === 'sanka-detail-raw') {
    const raw = await safeCall(() => sanka.detail(sankaSlug));
    content = (
      <>
        <Section title={`sanka.detail("${sankaSlug || '(kosong, isi ?sankaSlug=... di URL)'}") — raw API response`}>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
        </Section>
        <Section title="Kenapa ada ini">
          <p className="text-xs text-ink-faint">
            Buat cari nama field aslinya kalau mau nambahin data baru (misal rekomendasi/related anime) yang belum dipakai di app/anime-sanka/[slug]/page.js.
          </p>
        </Section>
      </>
    );
  }

  if (test === 'anichin-detail-raw') {
    const raw = await safeCall(() => anichin.rawDetail(anichinSlug));
    content = (
      <>
        <Section title={`anichin.rawDetail("${anichinSlug || '(kosong, isi ?anichinSlug=... di URL)'}") — unmapped API response`}>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
        </Section>
        <Section title="Kenapa ada ini">
          <p className="text-xs text-ink-faint">
            Buat cari nama field aslinya kalau mau nambahin data baru (misal rekomendasi/related anime) yang belum di-mapping di anichin.detail().
          </p>
        </Section>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Debug</h1>
      <p className="mb-5 text-sm text-ink-soft">Dump data mentah dari scraper buat diagnosa bug — bukan halaman buat dipakai sehari-hari.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <DebugLink href={`/debug?test=komik-read&chapter=${chapter}`} label="Komik: baca chapter" />
        <DebugLink href={`/debug?test=komik-detail&slug=${komikSlug}`} label="Komik: detail" />
        <DebugLink href="/debug?test=komik-list" label="Komik: home list" />
        <DebugLink href="/debug?test=anichin-home" label="Anichin: home" />
        <DebugLink href="/debug?test=anichin-schedule" label="Anichin: schedule" />
        <DebugLink href={`/debug?test=anichin-detail&anichinSlug=${anichinSlug}`} label="Anichin: detail" />
        <DebugLink href={`/debug?test=anichin-detail-raw&anichinSlug=${anichinSlug}`} label="Anichin: detail (raw/unmapped)" />
        <DebugLink href={`/debug?test=anichin-episode&anichinSlug=${anichinSlug}`} label="Anichin: episode" />
        <DebugLink href={`/debug?test=sanka-detail-raw&sankaSlug=${sankaSlug}`} label="Sanka (Otakudesu): detail (raw)" />
      </div>

      {test === 'menu' && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-sm text-ink-soft shadow-card">
          Pilih salah satu tombol di atas buat lihat data mentahnya.
        </p>
      )}

      {content}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-display text-sm font-extrabold text-ink">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-paper-card p-4 text-xs shadow-card">
        {children}
      </div>
    </div>
  );
}

function DebugLink({ href, label }) {
  return (
    <a href={href} className="rounded-full border border-line bg-paper-card px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
      {label}
    </a>
  );
}
