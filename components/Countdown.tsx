"use client";

import { useEffect, useState } from "react";

function calculateTimeLeft(target: number) {
  const difference = target - Date.now();
  if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

/**
 * Contador regresivo. Se calcula en el cliente para evitar desajustes de
 * hidratación (empieza en cero, determinista en el servidor).
 */
export default function Countdown({ targetDate }: { targetDate: string }) {
  const target = new Date(targetDate).getTime();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(target));
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const cells: Array<[number, string]> = [
    [timeLeft.days, "Días"],
    [timeLeft.hours, "Horas"],
    [timeLeft.minutes, "Minutos"],
    [timeLeft.seconds, "Segundos"],
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cells.map(([value, label]) => (
        <div key={label} className="rounded-2xl bg-white/10 p-6">
          <div className="text-4xl font-black text-white">{value}</div>
          <div className="mt-2 text-xs uppercase text-white/60">{label}</div>
        </div>
      ))}
    </div>
  );
}
