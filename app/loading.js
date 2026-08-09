import CardGridSkeleton from '../components/CardGridSkeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="skeleton mb-14 h-56 rounded-2xl" />
      <CardGridSkeleton />
    </div>
  );
}
