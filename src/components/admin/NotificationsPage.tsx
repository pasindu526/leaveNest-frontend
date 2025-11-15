import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

interface Notification {
  _id: string;
  message: string;
  status: "unread" | "read";
  createdAt: string;
  type: string;
  isRead?: boolean;
  recipient?: string;
  sender?: string;
  relatedLeaveRequest?: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // normalize roles and department
      const roles = Array.isArray(user?.roles)
        ? user.roles.map((r: unknown) =>
            typeof r === "string"
              ? r.trim().toLowerCase()
              : String(r).trim().toLowerCase()
          )
        : [];
      const isAdmin = roles.includes("admin");
      const isEmployee = roles.includes("employee");
      const isHR =
        typeof user.department === "string" &&
        ["hr", "human resources"].includes(
          user.department.trim().toLowerCase()
        );

      // Build URL:
      // - Admins request admin-scoped notifications. HR admins request admin notifications without department filter (company-wide).
      // - Non-admins request notifications addressed to them (recipient).
      let url = "/notifications";
      if (isAdmin) {
        if (isHR) {
          url += `?role=admin`;
        } else if (user.department) {
          url += `?role=admin&department=${encodeURIComponent(
            user.department
          )}`;
        } else {
          // fallback: request admin notifications if no department is present
          url += `?role=admin`;
        }
      } else if (user?._id) {
        url += `?recipient=${user._id}`;
      }

      const res = await API.get<Notification[]>(url);
      let data = res.data || [];

      // Debug: inspect notification payloads to understand why a rejected message appears
      // open devtools console to see the list after fetch
      // (remove this once server-side metadata is fixed)
      console.log("Fetched notifications (raw):", data);

      if (isAdmin) {
        data = data.filter((n) => {
          const t = (n.type || "").toLowerCase();
          const msg = (n.message || "").toLowerCase();
          const isStatusMsg =
            /approved|rejected|accepted|declined|canceled/.test(t) ||
            /approved|rejected|accepted|declined|canceled/.test(msg);
          // if this looks like an employee status message and it has an explicit recipient,
          // drop it from admin feed (server should instead mark admin-targeted notifications explicitly)
          if (isStatusMsg && n.recipient) return false;
          return true;
        });
      }

      // If the current user has both roles (admin + employee) we should not show their
      // personal employee notifications on the admin notifications page.
      // Keep only admin-scoped notifications (the server-side role=admin query should already help,
      // but apply an extra guard to remove notifications that are directly addressed to this user).
      if (isAdmin && isEmployee && user?._id) {
        data = data.filter((n) => n.recipient !== user._id);
      }

      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const refreshCountEvent = () => {
    // notify Sidebar and any listeners to refresh their counts
    window.dispatchEvent(
      new CustomEvent("notifications:changed", {
        detail: { source: "admin:notifications" },
      })
    );
  };

  const markAsRead = async (id: string) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, status: "read", isRead: true } : n
        )
      );
      refreshCountEvent();
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => n.status === "unread");
    if (unread.length === 0) return;
    try {
      // attempt bulk endpoint first (if available), otherwise fall back to per-item
      try {
        await API.put(`/notifications/markAllRead`);
      } catch {
        await Promise.all(
          unread.map((n) =>
            API.put(`/notifications/${n._id}/read`).catch(() => {
              /* ignore individual failure */
            })
          )
        );
      }
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read", isRead: true }))
      );
      refreshCountEvent();
    } catch {
      // ignore
    }
  };

  const handleClick = async (n: Notification) => {
    if (n.status === "unread") {
      await markAsRead(n._id);
    }

    // If notification references a leave request, navigate to leave requests page
    if (n.relatedLeaveRequest) {
      // allow AdminDashboard to open the specific leave if it listens for this event
      window.dispatchEvent(
        new CustomEvent("notification:openLeave", {
          detail: { id: n.relatedLeaveRequest },
        })
      );
      navigate("/admin/leaverequests");
    } else {
      // go to admin dashboard home
      navigate("/admin");
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between gap-4 pb-3 mb-2 border-b">
        <h2 className="text-2xl font-semibold">Notifications</h2>

        <div className="flex items-center gap-2">
          <button
            className="cursor-pointer text-xs px-3 py-1.5 rounded-sm bg-gray-100 hover:bg-gray-200"
            onClick={fetchNotifications}
            aria-label="Refresh notifications"
          >
            Refresh
          </button>
          <button
            className="cursor-pointer text-xs px-3 py-1.5 rounded-sm bg-blue-600 text-white hover:bg-blue-700"
            onClick={markAllAsRead}
            aria-label="Mark all as read"
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 pr-2 max-h-[450px]">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-lg font-medium animate-pulse">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-lg font-medium">
            No notifications found.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`relative group transition rounded-lg border flex items-center gap-4 shadow-sm cursor-pointer px-5 py-4
                  ${n.status === "unread" ? "bg-blue-50" : "bg-white"}
                  hover:shadow-md
                `}
                onClick={() => handleClick(n)}
                title={
                  n.status === "unread" ? "Click to mark as read and open" : ""
                }
              >
                {/* Left colored bar for unread */}
                {n.status === "unread" && (
                  <div className="w-1 h-10 bg-blue-500 rounded-r-lg mr-2" />
                )}
                {n.status === "read" && (
                  <div className="w-1 h-10 bg-green-500 rounded-r-lg mr-2" />
                )}
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={
                      n.status === "unread"
                        ? "font-semibold text-blue-900"
                        : "text-gray-700"
                    }
                  >
                    {n.message}
                  </div>
                  <div className="mt-1 text-xs text-gray-400 capitalize">
                    {n.type.replace(/_/g, " ")}
                  </div>
                </div>
                {/* Status and Date on the right */}
                <div className="flex flex-col items-end min-w-[120px] ml-4">
                  <span
                    className={`mb-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide
                      ${
                        n.status === "unread"
                          ? "bg-blue-100 text-blue-700"
                          : n.status === "read"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }
                    `}
                  >
                    {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
