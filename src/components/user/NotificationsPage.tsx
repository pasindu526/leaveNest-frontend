import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

interface Notification {
  _id: string;
  message: string;
  status: "unread" | "read";
  createdAt: string;
  type: string;
  relatedLeaveRequest?: string;
  leaveStatus?: string;
  recipient?: string;
}

const UserNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // compute current user / role once
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id || user?._id;
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin =
    roles.some((r) => r?.toString().toLowerCase() === "admin") ||
    user?.isAdmin === true;
  const isEmployee = roles.some(
    (r) => r?.toString().toLowerCase() === "employee"
  );

  // Deterministic admin-action detector: prefer type-based matching, fall back to message patterns.
  const looksLikeAdminAction = (n: Notification) => {
    const typeNorm = (n.type || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const msg = (n.message || "").toString().trim().toLowerCase();

    // Known server-side admin notification type tokens (extend if backend uses other values)
    const adminTypes = new Set([
      "leave_submitted",
      "leave_request",
      "new_leave_request",
      "leave_request_submitted",
      "leave_submitted_notification",
      "leave_request_created",
    ]);

    if (typeNorm && adminTypes.has(typeNorm)) return true;
    // message based fallbacks (common phrasings)
    if (/^new leave request\b/.test(msg)) return true;
    if (/\bleave submitted\b/.test(msg)) return true;
    if (/\bnew leave request from\b/.test(msg)) return true;
    // generic admin-action indicators
    if (
      /\b(request|submitted|pending|awaiting|approval|requires approval|needs approval)\b/.test(
        msg
      )
    )
      return true;
    return false;
  };

  useEffect(() => {
    // Employee notifications page: always fetch notifications addressed to the current user.
    // Even if the user has an admin role, their employee notifications (leave status updates)
    // belong on this page and should be fetched by recipient.
    if (!userId) {
      setLoading(false);
      return;
    }

    const url = `/notifications?recipient=${encodeURIComponent(userId)}`;

    API.get<Notification[]>(url)
      .then(async (res) => {
        const fetched = res.data || [];

        // If user has both admin+employee roles, keep only employee-related notifications
        // Employee-related = notifications explicitly addressed to the user (recipient)
        // or notifications that look like leave-status updates (type/message contains leave/approved/rejected etc.)
        let filtered = fetched;
        if (isAdmin && isEmployee && userId) {
          const uid = userId;
          // Debugging: log incoming notifications so you can verify server shape
          console.log("user notifications fetched (pre-filter)", {
            uid,
            isAdmin,
            isEmployee,
            fetched,
          });

          filtered = fetched.filter((n) => {
            if (!n) return false;
            // If server marked this specifically as an admin-action, drop it here.
            if (looksLikeAdminAction(n)) return false;
            // Otherwise allow only employee-status / status-update notifications
            const combined = (
              (n.type || "") +
              " " +
              (n.message || "")
            ).toLowerCase();
            return (
              /\bleave\b/.test(combined) &&
              /\b(approved|rejected|accepted|declined|canceled|cancelled|status)\b/.test(
                combined
              )
            );
          });
        }

        setNotifications(filtered);

        // gather unique leave request ids from notifications
        const leaveIds = Array.from(
          new Set(
            filtered
              .map((n) => n.relatedLeaveRequest)
              .filter(Boolean) as string[]
          )
        );

        if (leaveIds.length) {
          try {
            const results = await Promise.all(
              leaveIds.map((id) =>
                API.get<{ status?: string }>(
                  `/leaverequests/${encodeURIComponent(id)}`
                )
                  .then((r) => ({ id, status: r.data?.status ?? "unknown" }))
                  .catch(() => ({ id, status: "unknown" }))
              )
            );

            const statusMap = new Map<string, string>();
            results.forEach((r) => statusMap.set(r.id, r.status));

            setNotifications((prev) =>
              prev.map((n) =>
                n.relatedLeaveRequest && statusMap.has(n.relatedLeaveRequest)
                  ? { ...n, leaveStatus: statusMap.get(n.relatedLeaveRequest) }
                  : n
              )
            );
          } catch {
            // ignore individual failures
          }
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAdmin, isEmployee, user?.department, userId]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      // Ensure employee page fetches only notifications addressed to this user.
      const uid = user?._id || user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const url = `/notifications?recipient=${encodeURIComponent(uid)}`;
      const res = await API.get<Notification[]>(url);
      const fetched = res.data || [];
      // same guard: if user has both roles, ensure we keep only employee-related notifications
      let final = fetched;
      if (isAdmin && isEmployee && uid) {
        // Debugging: log incoming notifications so you can verify server shape
        console.log("user notifications fetched (pre-filter callback)", {
          uid,
          isAdmin,
          isEmployee,
          fetched,
        });

        final = fetched.filter((n) => {
          if (!n) return false;
          if (looksLikeAdminAction(n)) return false; // always exclude admin-action types
          const combined = (
            (n.type || "") +
            " " +
            (n.message || "")
          ).toLowerCase();
          return (
            /\bleave\b/.test(combined) &&
            /\b(approved|rejected|accepted|declined|canceled|cancelled|status)\b/.test(
              combined
            )
          );
        });
      }
      setNotifications(final);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isEmployee /* userId not used directly here, parse inside */]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: "read" } : n))
      );

      // notify other parts (Sidebar) that notifications changed
      window.dispatchEvent(
        new CustomEvent("notifications:changed", { detail: { id } })
      );
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
      window.dispatchEvent(
        new CustomEvent("notifications:changed", {
          detail: { source: "notifications-page", count: unread.length },
        })
      );
    } catch {
      // ignore
    }
  };

  // click => mark read (if needed) then navigate to dashboard OR my-leaves.
  const handleNotificationClick = async (n: Notification) => {
    if (n.status === "unread") {
      await markAsRead(n._id);
    }

    const leaveId = n.relatedLeaveRequest;
    if (isAdmin) {
      if (leaveId) {
        navigate(`/admin/my-leaves`);
      } else {
        navigate("/admin");
      }
    } else {
      if (leaveId) {
        navigate(`/employee/my-leaves`);
      } else {
        navigate("/employee/dashboard");
      }
    }
  };

  return (
    <section className="w-full bg-white rounded-lg shadow p-8 my-8">
      <div className="flex items-start justify-between gap-4 pb-3 mb-2 border-b">
        <h2 className="text-2xl font-semibold">My Notifications</h2>

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
      <div className="flex-1 overflow-y-auto py-4 pr-2 max-h-[430px]">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-lg font-medium animate-pulse">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-lg font-medium">
            No notifications.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`relative group transition rounded-lg border flex items-center gap-4 shadow-sm cursor-pointer px-5 py-4
                  ${n.status === "unread" ? "bg-blue-50" : "bg-gray-50"}
                  hover:shadow-md
                `}
                onClick={() => handleNotificationClick(n)}
                title={n.status === "unread" ? "Click to mark as read" : ""}
              >
                {n.status === "unread" && (
                  <div className="w-1 h-10 bg-blue-500 rounded-r-lg mr-2" />
                )}
                {n.status === "read" && (
                  <div className="w-1 h-10 bg-green-500 rounded-r-lg mr-2" />
                )}
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
                    {n.type?.replace(/_/g, " ") || ""}
                  </div>
                </div>

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
    </section>
  );
};

export default UserNotificationsPage;
