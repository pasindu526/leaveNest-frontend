import React, { useEffect, useState } from "react";
import API from "../../services/api";

const LeaveBalance: React.FC = () => {
  const [balance, setBalance] = useState<{
    annual: number;
    medical: number;
    shortleave: number;
    leavesTaken: number;
  } | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id && !user._id) return;

    // Fetch leave balance (including leavesTaken) from DB
    API.get<{
      annual: number;
      medical: number;
      shortleave: number;
      leavesTaken: number;
    }>(`/users/${user.id || user._id}/leave-balance`).then((res) =>
      setBalance(res.data)
    );
  }, []);

  if (!balance) return <div>Loading leave balances...</div>;

  return (
    <div className="w-full mx-auto mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Annual Leave Card */}
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <span className="text-3xl font-bold text-blue-700">
          {balance.annual}
        </span>
        <span className="mt-2 text-center text-lg text-blue-900 font-semibold">
          Annual Leave
        </span>
      </div>
      {/* Medical Leave Card */}
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <span className="text-3xl font-bold text-green-700">
          {balance.medical}
        </span>
        <span className="mt-2 text-center text-lg text-green-900 font-semibold">
          Medical Leave
        </span>
      </div>
      {/* Short Leave Card */}
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <span className="text-3xl font-bold text-yellow-700">
          {balance.shortleave}
        </span>
        <span className="mt-2 text-center text-lg text-yellow-900 font-semibold">
          Short Leave
        </span>
      </div>
      {/* Leaves Taken Card */}
      <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <span className="text-3xl font-bold text-red-700">
          {balance.leavesTaken}
        </span>
        <span className="mt-2 text-center text-lg text-red-900 font-semibold">
          Leaves Taken
        </span>
      </div>
    </div>
  );
};

export default LeaveBalance;
