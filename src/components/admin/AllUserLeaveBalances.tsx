import React, { useEffect, useState } from "react";
import API from "../../services/api";

interface LeaveBalance {
  annual: number;
  medical: number;
  shortleave: number;
  leavesTaken: number;
}

interface User {
  _id: string;
  emp_id: string;
  name: string;
  department: string;
  leaveBalance: LeaveBalance;
  roles?: string[];
  status?: string;
}

const AllUserLeaveBalances: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [department, setDepartment] = useState<string>("");
  const [adminId, setAdminId] = useState<string>("");
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get admin's department and id from localStorage (or context/auth)
    const admin = JSON.parse(localStorage.getItem("user") || "{}");
    setDepartment(admin.department || "");
    setAdminId(admin._id || admin.id || "");
    setCurrentRoles(
      Array.isArray(admin.roles)
        ? admin.roles.map((r: unknown) => String(r).toLowerCase())
        : []
    );

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get<User[]>("/users");
        setUsers(res.data);
      } catch (e) {
        console.error("Failed to load users", e);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // helper: CSV escape
  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    // wrap fields with quotes if they contain comma/newline/quotes
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadCsv = () => {
    // Build rows using the same filteredUsers logic below
    const rows = [
      [
        "Emp ID",
        "Name",
        "Department",
        "Annual",
        "Medical",
        "Short Leave",
        "Leaves Taken",
      ],
      ...filteredUsers.map((u) => [
        u.emp_id ?? "",
        u.name ?? "",
        u.department ?? "",
        u.leaveBalance?.annual ?? "",
        u.leaveBalance?.medical ?? "",
        u.leaveBalance?.shortleave ?? "",
        u.leaveBalance?.leavesTaken ?? "",
      ]),
    ];

    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `leave-balances_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Determine if the current viewer is HR (case-insensitive department check)
  const isHR =
    typeof department === "string" &&
    ["hr", "human resources"].includes(department.trim().toLowerCase());

  // Filter users:
  // - always exclude current admin
  // - exclude soft-deleted users if status present
  // - always exclude admin-only users (roles contains "admin" but not "employee")
  // - if viewer is HR: show all remaining users
  // - otherwise: show users in same department who have the "employee" role
  //   (this includes users who are both admin+employee).
  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    if (u._id === adminId) return false; // exclude self
    if ((u.status || "").toLowerCase() === "user was deleted") return false;

    const roles = Array.isArray(u.roles)
      ? u.roles.map((r) => String(r).trim().toLowerCase())
      : [];
    const hasEmployeeRole = roles.includes("employee");
    const hasAdminRole = roles.includes("admin");
    const isAdminOnly = hasAdminRole && !hasEmployeeRole;

    // always hide admin-only users
    if (isAdminOnly) return false;

    if (isHR) {
      return true; // HR sees everyone except soft-deleted/self/admin-only
    }

    // non-HR: only same-department users who are employees (includes admin+employee)
    return u.department === department && hasEmployeeRole;
  });

  const viewerIsAdmin = currentRoles.includes("admin");

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full mx-auto">
      <div className="flex justify-between mb-4 py-2 border-b">
        <h2 className="text-2xl font-semibold mb-4">
          All Users Leave Balances
        </h2>
        {viewerIsAdmin && (
          <button
            onClick={downloadCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white h-11 cursor-pointer px-4 rounded-md text-sm font-medium"
            type="button"
          >
            Download CSV
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-500 text-lg font-medium animate-pulse">
          Loading leave balances...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mb-4 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v4a1 1 0 001 1h3m10 0h3a1 1 0 001-1V7M7 21h10M7 3h10l1 4H6l1-4z"
            ></path>
          </svg>
          <p className="text-sm">No user leave balances to display.</p>
        </div>
      ) : (
        <div className="overflow-y-auto min-h-80 max-h-[450px] rounded-lg">
          <table className="min-w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-4 py-3 text-left">Emp ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-center">Annual</th>
                <th className="px-4 py-3 text-center">Medical</th>
                <th className="px-4 py-3 text-center">Short Leave</th>
                <th className="px-4 py-3 text-center">Leaves Taken</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{u.emp_id}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.department ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {u.leaveBalance?.annual ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.leaveBalance?.medical ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.leaveBalance?.shortleave ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.leaveBalance?.leavesTaken ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllUserLeaveBalances;
