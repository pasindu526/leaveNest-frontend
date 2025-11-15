import React, { useState } from "react";
import Register from "../../pages/Register";
import API from "../../services/api";
import Swal from "sweetalert2";

interface User {
  _id: string;
  name: string;
  department: string;
  email: string;
  emp_id: string;
  roles: string[];
  status?: string; // e.g. "user was deleted"
}

const EmployeesPage: React.FC<{ users: User[]; loading?: boolean }> = ({
  users,
  loading = false,
}) => {
  const [showRegister, setShowRegister] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // Get current admin id and department
  const admin = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = admin._id || admin.id || "";
  const adminDept = admin.department || "";

  // determine whether current user is an admin (can delete users)
  const currentRoles = Array.isArray(admin?.roles)
    ? admin.roles.map((r: string) => r.toString().trim().toLowerCase())
    : [];
  const currentIsAdmin = currentRoles.includes("admin");
  const currentIsEmployee = currentRoles.includes("employee");
  const currentIsAdminOnly = currentIsAdmin && !currentIsEmployee;

  // Determine if current admin is HR (case-insensitive)
  const isHR =
    typeof adminDept === "string" &&
    ["hr", "human resources"].includes(adminDept.trim().toLowerCase());

  // Filtering rules:
  // - Always exclude current admin
  // - Exclude soft-deleted users (status === "user was deleted")
  // - If HR: see all users except those who are admin-only
  // - If not HR: see only users in same department who have the "employee" role
  const filteredUsers = users
    .filter((u) => u && u._id !== adminId)
    .filter((u) => (u.status || "").toLowerCase() !== "user was deleted")
    .filter((u) => !deletedIds.includes(u._id))
    .filter((u) => {
      const roles = Array.isArray(u.roles)
        ? u.roles.map((r) => String(r).trim().toLowerCase())
        : [];

      const hasEmployee = roles.includes("employee");
      // const hasOnlyAdmin =
      //   roles.length > 0 && roles.every((r) => r === "admin");

      if (isHR) {
        // // HR sees all except admin-only users
        // return !hasOnlyAdmin;
        return true;
      }

      // non-HR: only same-department users who are employees (includes employee+admin)
      return u.department === adminDept && hasEmployee;
    });

  // Only users that are admin-only (not employee+admin) can delete users.
  // Prevent deleting yourself.
  const canShowDeleteFor = (u: User) => {
    if (!currentIsAdminOnly) return false;
    if (!u || u._id === adminId) return false;
    return true;
  };

  // should we render the Actions column at all?
  const showActionsColumn = currentIsAdminOnly;

  const handleDelete = async (userId: string) => {
    const confirm = await Swal.fire({
      title: "Delete user?",
      text: "This will mark the user as deleted (soft delete). Data remains in the database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      // Call DELETE which server implements as soft-delete (status = "user was deleted")
      await API.delete(`/users/${encodeURIComponent(userId)}`);

      // hide locally until parent refreshes
      setDeletedIds((s) => [...s, userId]);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "User was marked as deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Could not delete user. Try again.",
      });
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between mb-4 py-2 border-b gap-10">
        <h2 className="text-2xl font-semibold mb-4">Employees</h2>
        <button
          onClick={() => setShowRegister(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white h-11 cursor-pointer px-4 rounded-md text-sm font-medium"
        >
          Create a New User
        </button>
        {showRegister && (
          <Register
            open={showRegister}
            onClose={() => setShowRegister(false)}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-lg font-medium animate-pulse">
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-lg font-medium">
          No employees to display.
        </div>
      ) : (
        <div className="overflow-y-auto min-h-80 max-h-[430px] rounded-lg">
          <table className="min-w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-4 py-3 text-left">Emp ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Roles</th>
                {showActionsColumn && (
                  <th className="px-4 py-3 text-left">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{u.emp_id}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 capitalize">{u.department}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.roles.join(", ")}</td>
                  {showActionsColumn && (
                    <td className="px-4 py-3">
                      {canShowDeleteFor(u) && (
                        <button
                          onClick={() => handleDelete(u._id)}
                          className="cursor-pointer text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default EmployeesPage;
