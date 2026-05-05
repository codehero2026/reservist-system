import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  registration: "bg-blue-500",
  approval: "bg-green-500",
  import: "bg-purple-500",
  dedup: "bg-amber-500",
  announcement: "bg-indigo-500",
  personnel: "bg-teal-500",
  trash: "bg-orange-500",
  batch: "bg-cyan-500",
  account: "bg-red-500",
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notificationsApi.list(30)).data,
    refetchInterval: 15000,
  });

  const notifications: Notification[] = data?.data ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markReadMut.mutate(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-ink2 hover:text-ink transition-colors"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-2xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
            <h3 className="text-sm font-bold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMut.mutate()}
                className="flex items-center gap-1 text-2xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-ink3">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-[rgb(var(--border))] last:border-0 hover:bg-[rgb(var(--page-bg))] transition-colors flex gap-3",
                    !n.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="mt-1 shrink-0">
                    <span className={cn("block w-2 h-2 rounded-full", TYPE_COLORS[n.type] || "bg-gray-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs truncate", n.isRead ? "text-ink2" : "text-ink font-semibold")}>
                        {n.title}
                      </p>
                      <span className="text-3xs text-ink3 whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-2xs text-ink3 mt-0.5 line-clamp-2">{n.message}</p>
                    {n.link && (
                      <span className="inline-flex items-center gap-0.5 text-3xs text-blue-500 mt-1">
                        <ExternalLink size={9} /> View
                      </span>
                    )}
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markReadMut.mutate(n.id); }}
                      className="mt-1 shrink-0 text-ink3 hover:text-green-500 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
