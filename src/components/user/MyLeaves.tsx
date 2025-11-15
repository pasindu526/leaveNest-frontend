import React, { useEffect, useState } from "react";
import API from "../../services/api";
import { format, parseISO } from "date-fns";

interface LeaveRequest {
  _id: string;
  leaveType: string;
  dates: string[];
  reason: string;
  status?: string;
  createdAt?: string;
}

// add props: compact view and optional limit
interface MyLeavesProps {
  compact?: boolean;
  limit?: number;
}

const MyLeaves: React.FC<MyLeavesProps> = ({ compact = false, limit }) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?.id || user?._id; // handle both shapes
    if (!userId) {
      setLeaves([]);
      setLoading(false);
      return;
    }

    API.get<LeaveRequest[]>(`/leaverequests/my/${encodeURIComponent(userId)}`)
      .then((res) => {
        let data = Array.isArray(res.data) ? res.data : [];
        if (limit && limit > 0) data = data.slice(0, limit);
        setLeaves(data);
        setLoading(false);
      })
      .catch(() => {
        setLeaves([]);
        setLoading(false);
      });
  }, [limit]);

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-8 w-full h-full">
        <h3 className="text-2xl font-semibold pb-3 mb-5 border-b">
          Recent Leave Requests
        </h3>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="text-sm text-gray-500">No recent requests.</div>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => (
              <li
                key={l._id}
                className="flex items-start justify-between gap-3 p-3 border rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      {l.leaveType}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-medium ${
                        (l.status || "").toLowerCase() === "approved"
                          ? "bg-green-100 text-green-800"
                          : (l.status || "").toLowerCase() === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {l.status || "Pending"}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    {l.dates && l.dates.length > 0
                      ? l.dates
                          .map((d) => {
                            try {
                              return format(parseISO(d), "MMM d, yyyy");
                            } catch {
                              return d;
                            }
                          })
                          .join(" • ")
                      : l.createdAt
                      ? `Requested ${format(
                          parseISO(l.createdAt!),
                          "MMM d, yyyy"
                        )}`
                      : "—"}
                  </div>

                  {l.reason && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {l.reason}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {l.createdAt ? format(parseISO(l.createdAt), "hh:mm a") : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // original full-table view
  return (
    <div className="w-full mx-auto mt-8 bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">
        My Leave Requests
      </h2>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No leave requests found.
        </div>
      ) : (
        <div className="overflow-auto max-h-[420px] rounded-lg">
          <table className="min-w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Date(s)</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Requested At</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{l.leaveType}</td>
                  <td className="px-4 py-3">
                    {l.dates && l.dates.length > 0
                      ? l.dates
                          .map((d) => format(parseISO(d), "yyyy-MM-dd"))
                          .join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{l.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-medium ${
                        l.status === "Approved"
                          ? "bg-green-200 text-green-800"
                          : l.status === "Rejected"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-200 text-yellow-800"
                      }`}
                    >
                      {l.status || "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}
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

export default MyLeaves;
