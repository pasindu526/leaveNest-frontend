import React, { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { parseISO } from "date-fns";
import API from "../../services/api";

interface LeaveRequest {
  _id: string;
  dates: string[];
  status?: string;
  leaveType?: string;
}

const LeaveCalendar: React.FC = () => {
  const [greenDates, setGreenDates] = useState<Date[]>([]);
  const [yellowDates, setYellowDates] = useState<Date[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id && !user._id) return;
    API.get(`/leaverequests/my/${user.id || user._id}`).then((res) => {
      const data = res.data as LeaveRequest[];
      const approvedLeaves = data.filter(
        (l: LeaveRequest) => l.status === "Approved"
      );
      const green: Date[] = [];
      const yellow: Date[] = [];
      approvedLeaves.forEach((l) => {
        if (l.leaveType === "Short Leave") {
          l.dates.forEach((dateStr) => yellow.push(parseISO(dateStr)));
        } else {
          l.dates.forEach((dateStr) => green.push(parseISO(dateStr)));
        }
      });
      setGreenDates(green);
      setYellowDates(yellow);
    });
  }, []);

  return (
    <div className="bg-white p-8 rounded-lg shadow w-full">
      <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">
        My Leave Calendar
      </h2>
      <Calendar
        mode="multiple"
        selected={[...greenDates, ...yellowDates]}
        modifiers={{
          shortLeave: (date) =>
            yellowDates.some(
              (d) =>
                d.getFullYear() === date.getFullYear() &&
                d.getMonth() === date.getMonth() &&
                d.getDate() === date.getDate()
            ),
          fullDayLeave: (date) =>
            greenDates.some(
              (d) =>
                d.getFullYear() === date.getFullYear() &&
                d.getMonth() === date.getMonth() &&
                d.getDate() === date.getDate()
            ),
        }}
        modifiersClassNames={{
          shortLeave: "bg-yellow-400 text-white font-bold rounded-sm",
          fullDayLeave: "bg-green-400 text-white font-bold rounded-sm",
        }}
        className="border rounded-md w-full"
        classNames={{
          table: "w-full",
          day: "w-10 md:w-full lg:w-10 lg:h-10 mx-auto md:mx-1 my-1 text-sm pointer-events-none focus:bg-transparent active:bg-transparent",
        }}
      />
      <div className="mt-2 text-sm text-gray-500 flex flex-row items-center justify-start">
        <span className="w-4 h-4 bg-green-400 rounded-xs mr-2"></span>
        Full Day Leaves
        <span className="w-4 h-4 bg-yellow-400 rounded-xs mx-2"></span>
        Short Leaves
      </div>
    </div>
  );
};

export default LeaveCalendar;
