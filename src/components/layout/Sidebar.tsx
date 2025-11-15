import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import API from "../../services/api";
import {
  FiGrid,
  FiBell,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiHome,
  FiPlusCircle,
} from "react-icons/fi";

// Minimal Notification type for Sidebar API calls — keep in sync with backend shape
interface Notification {
  _id: string;
  message?: string;
  status?: "unread" | "read";
  createdAt?: string;
  type?: string;
  recipient?: string;
  sender?: string;
  relatedLeaveRequest?: string;
}

// Heuristic to detect admin-action notifications (match UserNotificationsPage logic)
const looksLikeAdminAction = (n: Notification) => {
  const typeNorm = (n.type || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const msg = (n.message || "").toString().trim().toLowerCase();
  const adminTypes = new Set([
    "leave_submitted",
    "leave_request",
    "new_leave_request",
    "leave_request_submitted",
    "leave_submitted_notification",
    "leave_request_created",
  ]);
  if (typeNorm && adminTypes.has(typeNorm)) return true;
  if (/^new leave request\b/.test(msg)) return true;
  if (/\bleave submitted\b/.test(msg)) return true;
  if (/\bnew leave request from\b/.test(msg)) return true;
  if (
    /\b(request|submitted|pending|awaiting|approval|needs approval)\b/.test(msg)
  )
    return true;
  return false;
};

type NavItem = {
  key: string;
  label: string;
  path: string; // relative path
  icon?: React.ReactNode;
};

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  variant?: "admin" | "user";
  unreadCount?: number; // optional override
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onNavigate,
  variant = "user",
  unreadCount = undefined,
  onLogout,
}) => {
  const location = useLocation();
  const basePath = variant === "admin" ? "/admin" : "/employee";

  // local unread state using same logic as AdminDashboard (polls every 60s)
  const [localUnread, setLocalUnread] = useState<number>(0);

  const fetchUnreadNotifications = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const rolesRaw: unknown[] = Array.isArray(user?.roles)
        ? user.roles
        : user?.role
        ? [user.role]
        : [];
      const roles = rolesRaw.map((r) =>
        String(r || "")
          .trim()
          .toLowerCase()
      );
      const isAdmin = roles.includes("admin");
      const isEmployee = roles.includes("employee");
      const userDept: string = user?.department || "";
      const userId: string = user?._id || user?.id || "";

      // Build URL depending on which notifications page the sidebar represents.
      let url = "/notifications";
      if (variant === "admin") {
        // follow admin notifications page logic
        if (isAdmin) {
          const isHR =
            typeof userDept === "string" &&
            ["hr", "human resources"].includes(userDept.trim().toLowerCase());
          if (isHR) {
            url += `?role=admin`;
          } else if (userDept) {
            url += `?role=admin&department=${encodeURIComponent(userDept)}`;
          } else {
            url += `?role=admin`;
          }
        } else if (userId) {
          url += `?recipient=${encodeURIComponent(userId)}`;
        }
      } else {
        // user notifications page logic: always fetch recipient notifications.
        // (Admin employees will get their admin feed in the admin sidebar/page —
        // here we only want employee-targeted messages.)
        if (userId) {
          url += `?recipient=${encodeURIComponent(userId)}`;
        } else {
          // nothing to fetch
          return;
        }
      }

      API.get<Notification[]>(url)
        .then((res) => {
          let data = res.data || [];

          // If this is the user sidebar, make sure the count matches
          // the user notifications page: exclude admin-action notifications
          // when the user has both admin+employee roles.
          if (variant === "user" && isAdmin && isEmployee && userId) {
            data = data.filter((n) => {
              if (!n) return false;
              // exclude anything that looks like an admin action
              if (looksLikeAdminAction(n)) return false;
              // ensure it's a leave-status style item (employee-relevant)
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

          // If we're matching admin notifications page, apply the same client-side
          // guards used there so the sidebar count equals the notifications page.
          if (variant === "admin" && isAdmin) {
            data = data.filter((n) => {
              const t = (n.type || "").toLowerCase();
              const msg = (n.message || "").toLowerCase();
              const isStatusMsg =
                /approved|rejected|accepted|declined|canceled/.test(t) ||
                /approved|rejected|accepted|declined|canceled/.test(msg);
              if (isStatusMsg && n.recipient) return false; // drop employee-targeted status messages
              return true;
            });

            // if user has both admin+employee roles, remove notifications addressed to them
            if (isEmployee && userId) {
              data = data.filter((n) => n.recipient !== userId);
            }
          }

          const unread = data.filter((n) => n.status === "unread").length;
          setLocalUnread(unread);
        })
        .catch(() => {
          // ignore errors, keep previous value
        });
    } catch {
      // parsing/localStorage error - ignore
    }
  };

  useEffect(() => {
    fetchUnreadNotifications();
    const id = setInterval(fetchUnreadNotifications, 60000);

    const handleUpdates = () => {
      // refetch immediately when notifications change elsewhere
      fetchUnreadNotifications();
    };
    window.addEventListener("notifications:changed", handleUpdates);

    return () => {
      clearInterval(id);
      window.removeEventListener("notifications:changed", handleUpdates);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ensure we always have a numeric count (show 0 when there are no notifications)
  const displayUnread: number =
    typeof unreadCount === "number" ? unreadCount : localUnread ?? 0;

  const handleNavClick = (e?: React.MouseEvent<HTMLAnchorElement>) => {
    // prevent focus/scroll jump
    if (e?.currentTarget) e.currentTarget.blur();

    // only notify parent (to close sidebar) on small screens
    if (onNavigate && window.innerWidth < 768) {
      onNavigate();
    }
  };

  const navItems: NavItem[] =
    variant === "admin"
      ? [
          {
            key: "dashboard",
            label: "Dashboard",
            path: "dashboard",
            icon: <FiGrid />,
          },
          {
            key: "notifications",
            label: "Notifications",
            path: "notifications",
            icon: <FiBell />,
          },
          {
            key: "employees",
            label: "Employees",
            path: "employees",
            icon: <FiUsers />,
          },
          {
            key: "leaves",
            label: "Leave Requests",
            path: "leaverequests",
            icon: <FiFileText />,
          },
          {
            key: "balance",
            label: "Leave Balances",
            path: "balances",
            icon: <FiBarChart2 />,
          },
          {
            key: "settings",
            label: "Settings",
            path: "settings",
            icon: <FiSettings />,
          },
        ]
      : [
          {
            key: "dashboard",
            label: "Dashboard",
            path: "dashboard",
            icon: <FiHome />,
          },
          {
            key: "apply",
            label: "Apply Leave",
            path: "apply-leave",
            icon: <FiPlusCircle />,
          },
          {
            key: "my-leaves",
            label: "My Leaves",
            path: "my-leaves",
            icon: <FiUsers />,
          },
          {
            key: "notifications",
            label: "Notifications",
            path: "user-notifications",
            icon: <FiBell />,
          },
          {
            key: "profile",
            label: "Profile",
            path: "profile",
            icon: <FiSettings />,
          },
        ];

  const fullPath = (relative: string) =>
    `${basePath}/${relative}`.replace(/\/$/, "");

  return (
    <div
      className={`w-64 bg-white shadow-xl border-r border-gray-100 h-screen fixed top-0 left-0 z-40 flex flex-col ${
        collapsed ? "hidden lg:block" : "block"
      }`}
    >
      {/* Header */}
      <div className="hidden py-4 px-2 border-b-2 md:flex flex-col mx-4">
        <h2 className="text-2xl font-bold text-blue-700">LeaveNest</h2>
        <span className="text-xs text-gray-500">Leave Management System</span>
      </div>

      {/* Navigation */}
      <nav className="p-4 overflow-y-auto flex-1 min-h-0 mt-28 md:mt-0">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.key}>
              <NavLink
                to={fullPath(item.path)}
                onClick={(e) => handleNavClick(e)}
                className={({ isActive }) => {
                  const isDashboardBase =
                    item.key === "dashboard" && location.pathname === basePath;
                  return `flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors ${
                    isActive || isDashboardBase
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`;
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1">{item.label}</span>

                {item.key === "notifications" && (
                  <span
                    className={`ml-2 inline-block text-white text-xs px-2 py-0.5 rounded-full ${
                      displayUnread > 0
                        ? "bg-red-500"
                        : "bg-gray-300 text-gray-700"
                    }`}
                    aria-label={`unread notifications: ${displayUnread}`}
                  >
                    {displayUnread}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="mx-4 py-4 border-t-2 bg-white">
        <button
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
          onClick={() => onLogout?.()}
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
