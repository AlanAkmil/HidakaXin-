import SparkleLoader from '../../components/SparkleLoader';

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <SparkleLoader size={200} />
      <p className="text-sm font-semibold text-ink-soft">Mencari…</p>
    </div>
  );
}
