import CardGridSkeleton from '../../components/CardGridSkeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="skeleton mb-2 h-7 w-32 rounded" />
      <div className="skeleton mb-5 h-4 w-64 rounded" />
      <CardGridSkeleton />
    </div>
  );
}
