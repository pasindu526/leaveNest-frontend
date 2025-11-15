import ApplyLeave from "./ApplyLeave";
import LeaveBalance from "./LeaveBalance";
import LeaveCalendar from "./LeaveCalendar";
import MyLeaves from "./MyLeaves";

const DashboardHome: React.FC = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return (
    <>
      <div className="text-center md:text-left pt-6">
        <div className="text-base text-gray-600">
          Hello,{" "}
          <span className="text-base font-semibold text-blue-700">
            {user?.name}
          </span>
        </div>
        <h1 className=" text-xl font-semibold">
          Welcome to Employee Dashboard
        </h1>
      </div>

      <div className="flex flex-col gap-y-2">
        <LeaveBalance />
        <ApplyLeave />

        <div className="flex flex-col lg:flex-row gap-8 my-8 h-full">
          <div className="flex md:flex-1 h-full">
            <LeaveCalendar />
          </div>

          <div className="w-full h-auto">
            <MyLeaves compact limit={4} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardHome;
