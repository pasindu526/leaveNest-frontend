import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";

import logo from "../assets/LNLogo.png";

interface RegisterResponse {
  message: string;
  user: {
    emp_id: string;
    name: string;
    email: string;
    department: string;
    roles: string[];
  };
}

interface RegisterProps {
  open?: boolean;
  onClose?: () => void;
}

const Register: React.FC<RegisterProps> = ({ open = true, onClose }) => {
  const [formData, setFormData] = useState({
    emp_id: "",
    name: "",
    email: "",
    password: "",
    roles: [] as string[],
    department: "",
  });

  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, roles: [...formData.roles, role] });
    } else {
      setFormData({
        ...formData,
        roles: formData.roles.filter((r) => r !== role),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await API.post<RegisterResponse>("/auth/register", formData);
      setMessage(res.data.message);
      setFormData({
        emp_id: "",
        name: "",
        email: "",
        password: "",
        roles: [] as string[],
        department: "",
      });
      if (onClose) {
        // Popup mode: show success alert, then close the popup when user confirms
        Swal.fire({
          icon: "success",
          title: "Account created",
          text: res.data?.message || "User registered successfully",
          confirmButtonText: "OK",
        }).then(() => {
          if (onClose) onClose();
        });
      } else {
        // Full page flow: navigate to login
        navigate("/login");
      }
    } catch (err) {
      setMessage("Registration failed");
    }
  };

  // If used as a popup and not open, don't render
  if (onClose && !open) return null;

  return (
    <div
      className={
        onClose
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/30 h-screen overflow-y-auto"
          : "flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 h-screen overflow-y-auto"
      }
      style={{ minHeight: "100vh" }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl w-full max-w-2xl border border-blue-100 relative max-h-[95vh] overflow-y-auto"
      >
        {onClose && (
          <button
            type="button"
            className="absolute top-2 right-4 cursor-pointer text-gray-400 hover:text-blue-700 text-3xl font-semibold"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white rounded-full p-1 mb-4 shadow-lg h-16 lg:h-20 w-16 lg:w-20">
            {/* <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg> */}
            <img src={logo} alt="LeaveNest Logo" className="object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-blue-700 mb-1 tracking-tight font-sans">
            LeaveNest - Create Account
            {/* <span className="text-2xl font-bold text-blue-600 mb-2"></span> */}
          </h1>

          <p className="text-gray-500 text-center">
            Register a new user for LeaveNest
          </p>
        </div>

        {/* Two column grid for form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div>
            <div className="mb-4">
              <Label className="mb-2" htmlFor="emp_id">
                Employee ID
              </Label>
              <Input
                className="py-5 !text-sm border-gray-300"
                id="emp_id"
                name="emp_id"
                placeholder="Employee ID"
                value={formData.emp_id}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <Label className="mb-2" htmlFor="name">
                Full Name
              </Label>
              <Input
                className="py-5 !text-sm border-gray-300"
                id="name"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <Label className="mb-2" htmlFor="email">
                Email
              </Label>
              <Input
                className="py-5 !text-sm border-gray-300"
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          {/* Right column */}
          <div>
            <div className="mb-4">
              <Label className="mb-2" htmlFor="password">
                Password
              </Label>
              <Input
                className="py-5 !text-sm border-gray-300"
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <Label className="mb-2" htmlFor="department">
                Department
              </Label>
              <Select
                value={formData.department}
                onValueChange={(val) =>
                  setFormData({ ...formData, department: val })
                }
              >
                <SelectTrigger
                  id="department"
                  className="w-full !text-sm py-5 cursor-pointer border-2 border-gray-300"
                >
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="Development">
                    Development
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Digital">
                    Digital
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="HR">
                    HR
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label className="mb-2 block">Roles:</Label>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Checkbox
                    className="w-5 h-5 border-2 border-gray-300 cursor-pointer"
                    checked={formData.roles.includes("employee")}
                    onCheckedChange={(v) =>
                      handleRoleChange("employee", Boolean(v))
                    }
                  />
                  <span className="!text-sm text-gray-600">Employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    className="w-5 h-5 border-2 border-gray-300 cursor-pointer"
                    checked={formData.roles.includes("admin")}
                    onCheckedChange={(v) =>
                      handleRoleChange("admin", Boolean(v))
                    }
                  />
                  <span className="!text-sm text-gray-600">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition mt-4 cursor-pointer"
        >
          Create Account
        </button>
        {message && (
          <p className="mt-4 text-center text-red-500 font-medium">{message}</p>
        )}
      </form>
    </div>
  );
};

export default Register;
