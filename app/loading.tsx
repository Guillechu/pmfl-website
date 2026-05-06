import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-12">
      <Skeleton className="h-8 w-40 mb-4" />
      <Skeleton className="h-12 w-72 mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
