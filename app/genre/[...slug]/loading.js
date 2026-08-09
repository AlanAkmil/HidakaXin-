import CardGridSkeleton from '../../../components/CardGridSkeleton';
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="skeleton mb-5 h-8 w-56 rounded" />
      <CardGridSkeleton count={12} />
    </div>
  );
}
