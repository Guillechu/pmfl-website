import Image from "next/image";

export default function LeagueMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/pmfl-logo.png"
        alt="PMFL Logo"
        width={200}
        height={80}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}