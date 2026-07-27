// Bandera de Panamá as crisp inline SVG (4 quadrants + two stars).
export default function PanamaFlag({ className = "h-6 w-9" }: { className?: string }) {
  const star =
    "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.5l7.1-.6z";
  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bandera de Panamá"
    >
      <rect width="600" height="400" fill="#ffffff" />
      <rect x="300" y="0" width="300" height="200" fill="#D21034" />
      <rect x="0" y="200" width="300" height="200" fill="#0056A7" />
      <g transform="translate(108,58) scale(3.5)">
        <path d={star} fill="#0056A7" />
      </g>
      <g transform="translate(408,258) scale(3.5)">
        <path d={star} fill="#D21034" />
      </g>
    </svg>
  );
}
