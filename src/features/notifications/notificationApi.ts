import { supabase } from "@/lib/supabase";
import type { Notification } from "@/features/notifications/notificationSchema";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  target_path: string;
  created_at: string;
  read_at: string | null;
};

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,target_path,created_at,read_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not load notifications.");
  }

  return ((data ?? []) as unknown as NotificationRow[]).map(mapNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    throw new Error("Could not load unread notification count.");
  }

  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: notificationId });

  if (error) {
    throw new Error("Could not mark notification as read.");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    throw new Error("Could not mark notifications as read.");
  }
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    targetPath: row.target_path,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}
