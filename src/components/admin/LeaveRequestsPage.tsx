import React from "react";
import { format, parseISO } from "date-fns";

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
  leaveType?: string;
}

const LeaveRequestsPage: React.FC<{
  leaves: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  loading?: boolean;
}> = ({ leaves, onApprove, onReject, onView, loading = false }) => {
  // Get current admin id and department
  const admin = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = admin._id || admin.id || "";
  const adminDept = admin.department || "";

  // HR can see all employees' requests (except their own). Others see only their department.
  const isHR =
    typeof adminDept === "string" &&
    ["hr", "human resources"].includes(adminDept.trim().toLowerCase());

  // Determine whether the current viewer is admin-only (has 'admin' role and NOT 'employee').
  // Approve/Reject buttons will be shown only to such admin-only users.
  const currentRoles = Array.isArray(admin?.roles)
    ? admin.roles.map((r: string) => r.toString().trim().toLowerCase())
    : [];
  const isAdminOnly =
    currentRoles.includes("admin") && !currentRoles.includes("employee");

  const filteredLeaves = leaves.filter((leave) => {
    if (!leave.user) return false;
    if (leave.user._id === adminId) return false;
    if (isHR) return true; // HR sees all others
    return leave.user.department === adminDept; // non-HR: same department only
  });

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">
        Leave Requests
      </h2>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-lg font-medium animate-pulse">
          Loading leave requests...
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-lg font-medium">
          No leave requests found.
        </div>
      ) : (
        <div className="overflow-y-auto min-h-80 max-h-[450px] rounded-lg">
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
              {filteredLeaves.map((leave) => (
                <tr key={leave._id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5">{leave.user?.name}</td>
                  <td className="px-4 py-2.5">{leave.user?.department}</td>
                  <td className="px-4 py-2.5">
                    {leave.dates && leave.dates.length > 0
                      ? leave.dates
                          .map((d) => format(parseISO(d), "yyyy-MM-dd"))
                          .join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5 flex gap-2">
                    {leave.status.toLowerCase() === "pending" &&
                      isAdminOnly && (
                        <>
                          <button
                            className="border border-green-600 text-green-600 px-4 py-2 rounded-sm font-medium hover:bg-green-50 transition cursor-pointer text-xs"
                            onClick={() => onApprove(leave._id)}
                          >
                            Approve
                          </button>
                          <button
                            className="border border-red-600 text-red-600 px-4 py-2 rounded-sm font-medium hover:bg-red-50 transition cursor-pointer text-xs"
                            onClick={() => onReject(leave._id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    <button
                      className="border border-blue-600 text-blue-600 px-4 py-2 rounded-sm font-medium hover:bg-blue-50 transition cursor-pointer text-xs"
                      onClick={() => onView(leave._id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default LeaveRequestsPage;
