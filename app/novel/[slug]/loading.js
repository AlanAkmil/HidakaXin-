export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="skeleton aspect-[2/3] rounded-xl" />
        <div className="space-y-3">
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-24 w-full rounded" />
        </div>
      </div>
    </div>
  );
}
