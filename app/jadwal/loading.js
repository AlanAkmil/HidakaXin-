export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="skeleton mb-5 h-8 w-40 rounded" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
