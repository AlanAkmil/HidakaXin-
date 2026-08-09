export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="skeleton mb-4 h-7 w-2/3 rounded" />
      <div className="skeleton aspect-video w-full rounded-xl" />
    </div>
  );
}
