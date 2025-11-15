import React, { useEffect, useState } from "react";
import API from "../services/api";
import EmployeesPage from "../components/admin/EmployeesPage";
import LeaveRequestsPage from "../components/admin/LeaveRequestsPage";
import NotificationsPage from "../components/admin/NotificationsPage";
import { format, parseISO } from "date-fns";
import AllUserLeaveBalances from "../components/admin/AllUserLeaveBalances";
import DashboardStats from "../components/admin/DashboardStats";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "@/components/layout/Header";
import UserProfile from "@/components/user/UserProfile";

interface User {
  _id: string;
  name: string;
  department: string;
  email: string;
  emp_id: string;
  roles: string[];
}

interface LeaveRequest {
  _id: string;
  user: User;
  dates: string[];
  status: string;
  reason?: string;
  createdAt?: string;
  comments?: string[];
  leaveType?: string;
  proofDocumentUrl?: string;
}

// helper to read currently active role from localStorage
const getStoredRole = (): string | null => {
  try {
    return (
      localStorage.getItem("role") || localStorage.getItem("activeRole") || null
    );
  } catch {
    return null;
  }
};

// const Navigations = [
//   { key: "dashboard", label: "Dashboard" },
//   { key: "notifications", label: "Notifications" },
//   { key: "employees", label: "Employees" },
//   { key: "leaves", label: "Leave Requests" },
//   { key: "balance", label: "Leave Balance" },
// ];

const AdminDashboard: React.FC = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequest[]>([]);
  const [rejectedLeaves, setRejectedLeaves] = useState<LeaveRequest[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [viewLeave, setViewLeave] = useState<LeaveRequest | null>(null);
  const location = useLocation();

  // Get current user info
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userDept: string = user?.department;
  const userId: string = user?._id;
  const isHR =
    typeof userDept === "string" &&
    ["hr", "human resources"].includes(userDept.trim().toLowerCase());

  // prefer an explicit active role saved at login (localStorage "role" / "activeRole")
  // make role reactive so Sidebar/other components update when active role changes
  const getInitialRole = () => {
    const stored = getStoredRole();
    if (stored) return stored as string;
    // If this page is mounted on an /admin path assume admin context
    if (location.pathname.startsWith("/admin")) return "admin";
    // if user explicitly has admin role prefer it
    if (user?.roles?.includes("admin")) return "admin";
    // fallback to first role or admin
    return (user?.roles?.[0] as string) || "admin";
  };
  const [role, setRole] = useState<string>(getInitialRole);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "role" || e.key === "activeRole") {
        setRole(
          (e.newValue as string) ||
            (getStoredRole() as string) ||
            user?.roles?.[0] ||
            "admin"
        );
      }
    };
    const onRoleChanged = () => {
      setRole((getStoredRole() as string) || user?.roles?.[0] || "admin");
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("role:changed", onRoleChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("role:changed", onRoleChanged);
    };
  }, [user, location.pathname]);

  // For reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchData = () => {
    API.get<User[]>("/users").then((res) => setUsers(res.data));
    API.get<LeaveRequest[]>("/leaverequests").then((res) => {
      setPendingLeaves(
        res.data.filter((lr) => lr.status.toLowerCase() === "pending")
      );
      setApprovedLeaves(
        res.data.filter((lr) => lr.status.toLowerCase() === "approved")
      );
      setRejectedLeaves(
        res.data.filter((lr) => lr.status.toLowerCase() === "rejected")
      );
      setRecentLeaves(
        res.data
          .sort(
            (a, b) =>
              // Sort by latest date in the dates array
              new Date(
                b.dates && b.dates.length > 0 ? b.dates[0] : 0
              ).getTime() -
              new Date(a.dates && a.dates.length > 0 ? a.dates[0] : 0).getTime()
          )
          .slice(0, 10)
      );
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // sync active page from URL so Sidebar navigation works
  useEffect(() => {
    const rel = location.pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
    let key = "dashboard";
    if (rel === "") key = "dashboard";
    else if (rel === "leaverequests") key = "leaves";
    else if (rel === "balances") key = "balance";
    else if (rel === "employees") key = "employees";
    else if (rel === "notifications" || rel === "user-notifications")
      key = "notifications";
    else if (rel === "settings") key = "settings";
    setActivePage(key);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleApprove = async (id: string) => {
    await API.put(`/leaverequests/${id}`, { status: "Approved" });
    fetchData();
  };

  // Show reject modal
  const handleReject = (id: string) => {
    setRejectingId(id);
    setRejectComment("");
    setShowRejectModal(true);
  };

  // Confirm reject with comment
  const confirmReject = async () => {
    if (rejectingId) {
      await API.put(`/leaverequests/${rejectingId}`, {
        status: "Rejected",
        $push: { comments: rejectComment },
      });
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectComment("");
      fetchData();
    }
  };

  const handleView = async (id: string) => {
    const res = await API.get<LeaveRequest>(`/leaverequests/${id}`);
    setViewLeave(res.data);
  };

  const closeModal = () => setViewLeave(null);

  // If current admin is HR, show all users' recent leaves (except self).
  // Otherwise restrict to same-department (exclude current admin).
  const filteredRecentLeaves = recentLeaves.filter(
    (leave) =>
      leave.user &&
      leave.user._id !== userId &&
      (isHR ? true : leave.user.department === userDept)
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="max-h-screen min-h-screen overflow-hidden flex bg-gray-100">
      {/* Sidebar (new) */}
      <Sidebar
        collapsed={!sidebarOpen}
        variant={role === "admin" ? "admin" : "user"}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      {/* Main Content (give left margin so content is visible beside fixed sidebar) */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col lg:ml-64">
        <Header
          title="Admin Dashboard"
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />
        <main className="mt-24 md:mt-28 overflow-auto h-screen">
          <div className="w-11/12 mx-auto">
            {activePage === "dashboard" && (
              <>
                <DashboardStats
                  users={users}
                  pendingLeaves={pendingLeaves}
                  approvedLeaves={approvedLeaves}
                  rejectedLeaves={rejectedLeaves}
                  userDept={userDept}
                  userId={userId}
                />

                <section className="bg-white rounded-lg shadow p-6 flex-1 flex flex-col min-h-0 max-h-[58dvh]">
                  <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">
                    Recent Leave Requests
                  </h2>
                  <div className="overflow-y-auto h-[400px] rounded-lg">
                    <table className="min-w-full table-auto">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-100 text-gray-700">
                          <th className="px-4 py-3 text-left">Employee</th>
                          <th className="px-4 py-3 text-left">Department</th>
                          <th className="px-4 py-3 text-left">Dates</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecentLeaves.map((leave) => (
                          <tr
                            key={leave._id}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-3">{leave.user?.name}</td>
                            <td className="px-4 py-3">
                              {leave.user?.department}
                            </td>
                            <td className="px-4 py-3">
                              {leave.dates && leave.dates.length > 0
                                ? leave.dates
                                    .map((d) =>
                                      format(parseISO(d), "yyyy-MM-dd")
                                    )
                                    .join(", ")
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-lg text-[10px] font-medium ${
                                  leave.status.toLowerCase() === "pending"
                                    ? "bg-yellow-200 text-yellow-800"
                                    : leave.status.toLowerCase() === "approved"
                                    ? "bg-green-200 text-green-800"
                                    : "bg-red-200 text-red-800"
                                }`}
                              >
                                {leave.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                              {leave.status.toLowerCase() === "pending" && (
                                <>
                                  <button
                                    className="border border-green-600 text-green-600 px-4 py-2 rounded-sm font-medium hover:bg-green-50 transition cursor-pointer text-xs"
                                    onClick={() => handleApprove(leave._id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="border border-red-600 text-red-600 px-4 py-2 rounded-sm font-medium hover:bg-red-50 transition cursor-pointer text-xs"
                                    onClick={() => handleReject(leave._id)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                className="border border-blue-600 text-blue-600 px-4 py-2 rounded-sm font-medium hover:bg-blue-50 transition cursor-pointer text-xs"
                                onClick={() => handleView(leave._id)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredRecentLeaves.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-4 text-gray-500"
                            >
                              No leave requests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activePage === "employees" && <EmployeesPage users={users} />}
            {activePage === "leaves" && (
              <LeaveRequestsPage
                leaves={[
                  ...pendingLeaves,
                  ...approvedLeaves,
                  ...rejectedLeaves,
                ]}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={handleView}
              />
            )}
            {activePage === "notifications" && <NotificationsPage />}
            {activePage === "balance" && <AllUserLeaveBalances />}
            <div className="-mt-8">
              {activePage === "settings" && <UserProfile />}
            </div>
          </div>
        </main>
      </div>
      {/* Modal for viewing leave details */}
      {viewLeave && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-blue-700">
              Leave Request Details
            </h2>
            <div className="flex justify-between gap-6">
              <div>
                <div className="mb-2">
                  <strong>Employee:</strong> {viewLeave.user?.name}
                </div>
                <div className="mb-2">
                  <strong>Department:</strong> {viewLeave.user?.department}
                </div>
                <div className="mb-2">
                  <strong>Dates:</strong>{" "}
                  {viewLeave.dates && viewLeave.dates.length > 0
                    ? viewLeave.dates
                        .map((d) => format(parseISO(d), "yyyy-MM-dd"))
                        .join(", ")
                    : "-"}
                </div>
                <div className="mb-2">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      viewLeave.status?.toLowerCase() === "pending"
                        ? "bg-yellow-200 text-yellow-800"
                        : viewLeave.status?.toLowerCase() === "approved"
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {viewLeave.status}
                  </span>
                </div>
                {viewLeave.reason && (
                  <div className="mb-2">
                    <strong>Reason:</strong> {viewLeave.reason}
                  </div>
                )}
                {viewLeave.createdAt && (
                  <div className="mb-2">
                    <strong>Requested At:</strong>{" "}
                    {new Date(viewLeave.createdAt).toLocaleString()}
                  </div>
                )}
                {viewLeave.comments && viewLeave.comments.length > 0 && (
                  <div className="mb-2">
                    <strong>Comments:</strong>
                    <ul className="list-disc ml-6">
                      {viewLeave.comments.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {/* Proof Document Preview */}
              {viewLeave._id && (
                <div className="mb-2">
                  <strong>Proof Document:</strong>
                  <div className="mt-2">
                    {/* Try image preview */}
                    <img
                      src={`${API.defaults?.baseURL || ""}/leaverequests/${
                        viewLeave._id
                      }/proof`}
                      alt="Proof"
                      className="max-h-48 rounded border my-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const pdf = document.getElementById("proof-pdf");
                        if (pdf) pdf.style.display = "block";
                      }}
                    />
                    {/* Try PDF preview */}
                    <embed
                      id="proof-pdf"
                      src={`${API.defaults?.baseURL || ""}/leaverequests/${
                        viewLeave._id
                      }/proof`}
                      type="application/pdf"
                      className="w-full h-64 border my-2 hidden"
                      onLoad={(e) => {
                        (e.target as HTMLElement).classList.remove("hidden");
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).classList.add("hidden");
                        const link = document.getElementById("proof-link");
                        if (link) link.classList.remove("hidden");
                      }}
                    />
                    {/* Fallback download link */}
                    <a
                      id="proof-link"
                      href={`${API.defaults?.baseURL || ""}/leaverequests/${
                        viewLeave._id
                      }/proof`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all hidden"
                    >
                      Download/View Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal for reject comment */}
      {showRejectModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setShowRejectModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-red-700">
              Reject Leave Request
            </h2>
            <label className="block mb-2 font-semibold">
              Comment (required):
            </label>
            <textarea
              className="w-full border p-2 mb-4 rounded-lg"
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                className="border border-gray-400 text-gray-700 px-4 py-2 rounded-sm font-medium hover:bg-gray-100 transition cursor-pointer text-xs"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="border border-red-600 text-red-600 px-4 py-2 rounded-sm font-medium hover:bg-red-50 transition cursor-pointer text-xs"
                disabled={!rejectComment.trim()}
                onClick={confirmReject}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}{" "}
    </div>
  );
};

export default AdminDashboard;
