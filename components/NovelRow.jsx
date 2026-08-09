import SectionHeader from './SectionHeader';
import NovelCard from './NovelCard';

export default function NovelRow({ items, title = 'Novel Populer' }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8">
      <SectionHeader title={title} href="/novel" />
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.slice(0, 9).map((item, i) => (
          <div key={item.id || i} className="w-32 flex-shrink-0">
            <NovelCard item={item} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
