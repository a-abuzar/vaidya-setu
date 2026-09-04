"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useSessionStore } from "@/lib/store/session";
import { get } from "idb-keyval";

interface OfflineMutationRecord {
  id: string;
  timestamp: number;
}

/**
 * Sync/offline status badge. Shows online/offline + pending mutation count.
 */
export function SyncStatusBadge(): React.ReactElement {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const syncOfflineQueue = useSessionStore((s) => s.syncOfflineQueue);
  const language = useSessionStore((s) => s.language);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      syncOfflineQueue().catch((e: unknown) => console.error("Sync error:", e));
    };
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  // Check pending count periodically
  useEffect(() => {
    const checkPending = async (): Promise<void> => {
      try {
        const queue = (await get<OfflineMutationRecord[]>("vaidyasetu-sync-queue")) ?? [];
        setPendingCount(queue.length);
      } catch {
        // IndexedDB not available — no pending items
      }
    };
    checkPending().catch(() => {});
    const interval = setInterval(() => { checkPending().catch(() => {}); }, 5000);
    return () => clearInterval(interval);
  }, []);

  const label = isOnline
    ? language === "hi"
      ? "ऑनलाइन"
      : language === "ta"
        ? "இணைந்துள்ளது"
        : "Online"
    : language === "hi"
      ? "ऑफलाइन"
      : language === "ta"
        ? "இணைப்பில்லை"
        : "Offline";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        isOnline
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      <span>{label}</span>
      {!isOnline && pendingCount > 0 && (
        <span className="bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full text-[10px]">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
