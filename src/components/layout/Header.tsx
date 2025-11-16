import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { LuMenu } from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import API from "@/services/api";

interface HeaderProps {
  onToggleSidebar?: () => void;
  title?: string;
  role?: "admin" | "employee";
}

interface User {
  id?: string;
  _id?: string;
  name?: string;
  roles?: string[];
  avatarUrl?: string | null;
  avatar?: string | null;
  profileImage?: string | null;
  picture?: string | null;
  department?: string | null;
  [key: string]: unknown;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const getStoredUserId = (): string | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem("user") || "{}");
    return parsed?.id || parsed?._id || null;
  } catch {
    return localStorage.getItem("userId") || localStorage.getItem("id") || null;
  }
};

const getStoredRole = (): string | null => {
  try {
    // check common keys used for storing the active login role
    return (
      localStorage.getItem("role") || localStorage.getItem("activeRole") || null
    );
  } catch {
    return null;
  }
};

const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  role: propRole,
}) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [activeRole, setActiveRole] = useState<string>(() => {
    return (
      getStoredRole() || (getStoredUser()?.roles?.[0] as string) || "employee"
    );
  });
  // role shown in the header / used for routing
  const location = useLocation();
  const pathRole = location.pathname.startsWith("/admin")
    ? "admin"
    : location.pathname.startsWith("/employee")
    ? "employee"
    : undefined;
  const role =
    (propRole as "admin" | "employee") ??
    (pathRole as "admin" | "employee") ??
    (activeRole as "admin" | "employee") ??
    "employee";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s: string) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const basePath = role === "admin" ? "/admin" : "/employee";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  // Admin panel uses "settings" route — employees use "profile"
  const handleProfile = () => {
    const target =
      role === "admin" ? `${basePath}/settings` : `${basePath}/profile`;
    navigate(target);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      const id = getStoredUserId();
      if (!id) return;
      try {
        const res = await API.get<User>(`/users/${id}`);
        if (!isMounted) return;
        setUser(res.data);
        // If no explicit active role stored, set a sensible default from fetched user roles
        if (!getStoredRole() && res.data?.roles?.length) {
          const defaultRole = res.data.roles.includes("admin")
            ? "admin"
            : (res.data.roles[0] as string);
          setActiveRole(defaultRole);
        }
        try {
          const raw = localStorage.getItem("user");
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            "user",
            JSON.stringify(Object.assign({}, parsed, res.data))
          );
        } catch {
          // ignore
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 z-50 lg:z-50 bg-white md:bg-gray-100 border-b-2">
      <div className="w-11/12 flex items-center justify-between mx-auto h-20  border-gray-300">
        {/* Header */}
        <div className="py-4 flex flex-col md:pl-14 lg:hidden">
          <h2 className="text-2xl font-bold text-blue-700">LeaveNest</h2>
          <span className="text-xs text-gray-500">Leave Management System</span>
        </div>

        <div className="absolute flex items-center gap-4 bg-white left-2 top-22 md:left-4 md:top-4 rounded-lg">
          <button
            className="p-2 md:p-4 rounded-md hover:bg-gray-100 lg:hidden focus:outline-none cursor-pointer"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <LuMenu size={20} />
          </button>
        </div>

        <h1 className="hidden lg:block text-2xl font-bold text-gray-800">
          {title}
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-blue-700">
                  {user?.name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {/* {user?.roles?.join(", ")} */}
                  {role}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
                <Avatar className="w-10 h-10 cursor-pointer">
                  <AvatarImage
                    src={
                      user?.avatarUrl ||
                      user?.avatar ||
                      user?.profileImage ||
                      user?.picture ||
                      undefined
                    }
                    alt={user?.name ? `${user.name} avatar` : "User avatar"}
                    className="object-cover object-top"
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-4 py-3 border-b text-sm text-gray-700">
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-gray-400">
                {user?.department || "No department"}
              </div>
            </div>

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleProfile}
            >
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
