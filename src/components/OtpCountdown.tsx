import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface Props {
  /** Timestamp (ms) d'expiration du code OTP */
  expiresAt: number;
  className?: string;
}

/** Compte à rebours mm:ss jusqu'à l'expiration du code OTP. */
export default function OtpCountdown({ expiresAt, className }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const remainingMs = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const expired = remainingMs <= 0;
  const warning = !expired && totalSeconds <= 60;

  return (
    <div className={`flex items-center gap-2 text-xs font-semibold tabular-nums ${expired ? "text-red-600" : warning ? "text-amber-600" : "text-surface-500"} ${className || ""}`}>
      <Timer size={13} className="shrink-0" />
      {expired ? (
        <span>Code expiré</span>
      ) : (
        <span>Expire dans {minutes}:{seconds}</span>
      )}
    </div>
  );
}
