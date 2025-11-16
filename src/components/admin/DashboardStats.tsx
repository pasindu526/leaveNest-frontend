import React from "react";

interface User {
  _id: string;
  department: string;
  status?: string;
  roles?: string[]; // optional roles to detect admin-only users
}

interface LeaveRequest {
  _id: string;
  user: User;
}

interface DashboardStatsProps {
  users: User[];
  pendingLeaves: LeaveRequest[];
  approvedLeaves: LeaveRequest[];
  rejectedLeaves: LeaveRequest[];
  userDept: string;
  userId?: string; // make optional since we can fallback to localStorage
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  users,
  pendingLeaves,
  approvedLeaves,
  rejectedLeaves,
  userDept,
  userId,
}) => {
  // Resolve current user id: prefer prop, fallback to localStorage
  const effectiveUserId = (() => {
    if (userId && String(userId).trim() !== "") return String(userId).trim();
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      return String(stored?._id || stored?.id || "").trim();
    } catch {
      return "";
    }
  })();

  const normalizedCurrentId = String(effectiveUserId || "").trim();
  const isSameUser = (u?: User | null) => {
    if (!u) return false;
    const idLike = u as unknown as { _id?: string; id?: string };
    const candidate = idLike._id ?? idLike.id ?? "";
    return (
      normalizedCurrentId !== "" &&
      String(candidate).trim() === normalizedCurrentId
    );
  };

  const isHR =
    typeof userDept === "string" &&
    ["hr", "human resources"].includes(userDept.trim().toLowerCase());

  // helper to detect admin-only users (has admin role but not employee)
  const isAdminOnlyUser = (u?: User | null) => {
    if (!u || !Array.isArray(u.roles)) return false;
    const roles = u.roles.map((r) => String(r).trim().toLowerCase());
    return roles.includes("admin") && !roles.includes("employee");
  };

  // exclude soft-deleted users, admin-only users and always exclude current user
  const filteredUsers = users.filter(
    (u) =>
      u &&
      !isSameUser(u) &&
      !isAdminOnlyUser(u) &&
      (u.status ? u.status.toLowerCase() !== "user was deleted" : true) &&
      (isHR ? true : u.department === userDept)
  );

  const filteredPending = pendingLeaves.filter(
    (leave) =>
      leave.user &&
      !isSameUser(leave.user) &&
      !isAdminOnlyUser(leave.user) &&
      (isHR ? true : leave.user.department === userDept)
  );
  const filteredApproved = approvedLeaves.filter(
    (leave) =>
      leave.user &&
      !isSameUser(leave.user) &&
      !isAdminOnlyUser(leave.user) &&
      (isHR ? true : leave.user.department === userDept)
  );
  const filteredRejected = rejectedLeaves.filter(
    (leave) =>
      leave.user &&
      !isSameUser(leave.user) &&
      !isAdminOnlyUser(leave.user) &&
      (isHR ? true : leave.user.department === userDept)
  );

  return (
    <div className="w-full mx-auto mb-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <span className="text-4xl mb-2 text-blue-500">{/* icon */}</span>
        <h2 className="text-lg text-center font-semibold mb-1">
          Total Employees
        </h2>
        <p className="text-2xl font-bold text-gray-700">
          {filteredUsers.length}
        </p>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <span className="text-4xl mb-2 text-green-500">{/* icon */}</span>
        <h2 className="text-lg text-center font-semibold mb-1">
          Pending Leaves
        </h2>
        <p className="text-2xl font-bold text-gray-700">
          {filteredPending.length}
        </p>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <span className="text-4xl mb-2 text-indigo-500">{/* icon */}</span>
        <h2 className="text-lg text-center font-semibold mb-1">
          Approved Leaves
        </h2>
        <p className="text-2xl font-bold text-gray-700">
          {filteredApproved.length}
        </p>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <span className="text-4xl mb-2 text-indigo-500">{/* icon */}</span>
        <h2 className="text-lg text-center font-semibold mb-1">
          Rejected Leaves
        </h2>
        <p className="text-2xl font-bold text-gray-700">
          {filteredRejected.length}
        </p>
      </div>
    </div>
  );
};

export default DashboardStats;
