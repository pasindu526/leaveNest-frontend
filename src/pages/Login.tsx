import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";

interface LoginResponse {
  token: string;
  user: {
    emp_id: string;
    name: string;
    email: string;
    roles: string[];
    department: string;
  };
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    emp_id: "",
    password: "",
  });

  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [, setLoginResponse] = useState<LoginResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await API.post<LoginResponse>("/auth/login", formData);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      if (
        res.data.user.roles.includes("admin") &&
        res.data.user.roles.includes("employee")
      ) {
        setRoles(res.data.user.roles);
        setLoginResponse(res.data);
        setShowRoleSelect(true);
      } else if (res.data.user.roles.includes("admin")) {
        localStorage.setItem("selectedRole", "admin");
        navigate("/admin");
      } else if (res.data.user.roles.includes("superadmin")) {
        localStorage.setItem("selectedRole", "superadmin");
        navigate("/superadmin");
      } else {
        localStorage.setItem("selectedRole", "employee");
        navigate("/employee");
      }

      setFormData({ emp_id: "", password: "" });
    } catch (err) {
      console.error("Login failed", err);
      setMessage("Invalid Employee ID or Password");
    }
  };

  const handleRoleSelect = (role: string) => {
    localStorage.setItem("selectedRole", role);
    setShowRoleSelect(false);
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/employee");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400">
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl w-full max-w-md border border-blue-100 relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 rounded-full p-3 mb-4 shadow-lg">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2 tracking-tight font-sans">
            LeaveNest
          </h1>
          <h2 className="text-xl font-bold text-blue-600 mb-2">Welcome Back</h2>
          <p className="text-gray-500 text-center">
            Sign in to your LeaveNest account
          </p>
        </div>

        <div className="mb-6">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="emp_id"
          >
            Employee ID
          </label>
          <Input
            id="emp_id"
            name="emp_id"
            placeholder="Enter your Employee ID"
            value={formData.emp_id}
            onChange={handleChange}
            className="w-full py-5 !text-sm border-gray-300"
            required
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            className="w-full py-5 !text-sm border-gray-300"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition mb-2"
        >
          Login
        </button>

        {message && (
          <p className="mt-4 text-center text-red-500 font-medium">{message}</p>
        )}
      </form>
      {/* Role select popup */}
      {showRoleSelect && (
        <div className="fixed inset-0 flex items-center justify-center  rounded-2xl bg-black/20 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[300px] flex flex-col items-center">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">
              Select your role to continue
            </h3>
            <div className="flex flex-col gap-3 w-full">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition w-full"
                  onClick={() => handleRoleSelect(role)}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
