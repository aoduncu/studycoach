"use client";
import { useEffect, useState } from "react";
export default function Timer({
  seconds,
  running,
  resumed,
}: {
  seconds: number;
  running: boolean;
  resumed: string | null;
}) {
  const [elapsed, setElapsed] = useState(seconds);
  useEffect(() => {
    const update = () =>
      setElapsed(
        seconds +
          (running && resumed
            ? Math.max(
                0,
                Math.floor((Date.now() - new Date(resumed).getTime()) / 1000),
              )
            : 0),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [seconds, running, resumed]);
  return (
    <strong className="timer" aria-label="Aktif çalışma süresi">
      {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
      {String(elapsed % 60).padStart(2, "0")}
    </strong>
  );
}
