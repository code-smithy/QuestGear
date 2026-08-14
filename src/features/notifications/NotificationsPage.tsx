import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/features/notifications/notificationApi";
import type { Notification } from "@/features/notifications/notificationSchema";
import { formatLoanDateTime } from "@/features/loans/loanSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function NotificationsPage() {
  const { locale, t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const loadedNotifications = await listNotifications();
      setNotifications(loadedNotifications);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
      await loadNotifications();
      window.dispatchEvent(new Event("questgear:notifications-updated"));
    } catch {
      setActionError(t("notifications.actionError"));
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <section className="page-section" aria-labelledby="notifications-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">{t("notifications.eyebrow")}</p>
          <h1 id="notifications-title">{t("notifications.title")}</h1>
          <p className="page-intro">{t("notifications.intro")}</p>
        </div>
        {unreadCount > 0 ? (
          <button type="button" className="secondary-button" onClick={() => void runAction(markAllNotificationsRead)}>
            {t("notifications.markAllRead")}
          </button>
        ) : null}
      </div>

      {actionError ? <p className="alert" role="alert">{actionError}</p> : null}
      {status === "loading" ? <p role="status">{t("notifications.loading")}</p> : null}
      {status === "error" ? <p role="alert">{t("notifications.loadError")}</p> : null}
      {status === "ready" && notifications.length === 0 ? <p role="status">{t("notifications.empty")}</p> : null}

      <ul className="data-list">
        {notifications.map((notification) => (
          <li key={notification.id} className={notification.readAt ? "" : "unread-notification"}>
            <div className="item-card-title-row">
              <h2>
                <Link to={notification.targetPath}>{notification.title}</Link>
              </h2>
              {!notification.readAt ? <span className="status-pill">{t("notifications.unread")}</span> : null}
            </div>
            <p>{notification.body}</p>
            <span>{formatLoanDateTime(notification.createdAt, locale)}</span>
            {!notification.readAt ? (
              <button
                type="button"
                className="secondary-button compact-button"
                onClick={() => void runAction(() => markNotificationRead(notification.id))}
              >
                {t("notifications.markRead")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
