import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import API from "../../services/api";
import Swal from "sweetalert2";

// shadcn-ui components (adjust paths if your project places ui components elsewhere)
import { CardContent } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type User = {
  _id?: string;
  name?: string;
  email?: string;
  department?: string;
  avatarUrl?: string | null;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // change password dialog open state
  const [openChangePwd, setOpenChangePwd] = useState(false);

  // react-hook-form + zod for change password (no client-side pre-verify)
  const {
    register,
    handleSubmit: handleChangePwdSubmit,
    reset: resetChangePwdForm,
    formState: {
      errors: changePwdErrors,
      isSubmitting: isChangingPwd,
      isValid,
    },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // show error via SweetAlert2
  useEffect(() => {
    if (!error) return;
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error,
      toast: true,
      position: "top-end",
      timer: 4000,
      showConfirmButton: false,
    });
  }, [error]);

  // show success via SweetAlert2
  useEffect(() => {
    if (!message) return;
    Swal.fire({
      icon: "success",
      title: "Success",
      text: message,
      toast: true,
      position: "top-end",
      timer: 3000,
      showConfirmButton: false,
    });
  }, [message]);

  const loadFromLocal = (): User | null => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const getStoredUserId = (): string | null => {
    try {
      const parsed = JSON.parse(localStorage.getItem("user") || "{}");
      return parsed?.id || parsed?._id || null;
    } catch {
      return (
        localStorage.getItem("userId") || localStorage.getItem("id") || null
      );
    }
  };

  const avatarUrlWithTs = (url?: string | null) =>
    url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : null;

  useEffect(() => {
    // Show local data immediately for snappy UI, then always refresh from server
    const local = loadFromLocal();
    if (local && (local.name || local.email)) {
      setUser(local);
      setName(local.name || "");
      setEmail(local.email || "");
      setDepartment(local.department || "");
      setAvatarPreview(avatarUrlWithTs(local.avatarUrl ?? null));
      // do NOT early return — continue to fetch fresh profile below
    }

    let isMounted = true;
    const refreshProfile = async () => {
      const id = local?._id || getStoredUserId();
      if (!id) return;
      setLoading(true);
      try {
        const res = await API.get<User>(`/users/${id}`);
        if (!isMounted) return;
        const data = res.data;
        setUser(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setDepartment(data.department || "");
        setAvatarPreview(avatarUrlWithTs(data.avatarUrl ?? null));
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // initial refresh right after mount
    refreshProfile();

    // refresh when other parts of the app signal login/profile changes
    const onAuthLogin = () => refreshProfile();
    const onProfileUpdated = () => refreshProfile();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "userId" || e.key === "id")
        refreshProfile();
    };

    window.addEventListener("auth:login", onAuthLogin as EventListener);
    window.addEventListener(
      "profile:updated",
      onProfileUpdated as EventListener
    );
    window.addEventListener("storage", onStorage);
    return () => {
      isMounted = false;
      window.removeEventListener("auth:login", onAuthLogin as EventListener);
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated as EventListener
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    setRemoveAvatar(false);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) {
      setError("Avatar must be smaller than 5MB.");
      return;
    }
    setAvatarFile(f);
  };

  const handleRemoveAvatar = () => {
    setError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  // allow calling without event when button triggers
  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    const targetId = user?._id || loadFromLocal()?._id || getStoredUserId();
    if (!targetId) {
      setError("User id not available.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("department", department.trim());
      if (avatarFile) fd.append("avatar", avatarFile);
      if (removeAvatar && !avatarFile) fd.append("_removeAvatar", "1");

      const res = await API.put<User>(`/users/${targetId}`, fd);
      const updated = res.data;
      setUser(updated);
      setName(updated.name || "");
      setEmail(updated.email || "");
      setDepartment(updated.department || "");
      setAvatarPreview(
        updated.avatarUrl ? avatarUrlWithTs(updated.avatarUrl) : null
      );
      setUser((u) => ({ ...(u || {}), ...updated }));
      setRemoveAvatar(false);
      setAvatarFile(null);

      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged = { ...parsed, ...updated };
          localStorage.setItem("user", JSON.stringify(merged));
        } else {
          localStorage.setItem("user", JSON.stringify(updated));
        }
      } catch {
        // ignore
      }

      setMessage("Profile updated.");
      window.dispatchEvent(
        new CustomEvent("profile:updated", { detail: updated })
      );
      // refresh the page
      window.location.reload();
    } catch (err: unknown) {
      let msg = "Failed to update profile. Please try again.";
      if (typeof err === "object" && err !== null) {
        const e = err as {
          response?: { data?: { message?: string; error?: string } };
        };
        msg = e.response?.data?.message || e.response?.data?.error || msg;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setMessage(null);
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setDepartment(user.department || "");
      setAvatarPreview(avatarUrlWithTs(user.avatarUrl ?? null));
      setAvatarFile(null);
    }
  };

  // open handler for password dialog
  const handleChangePwdOpen = (open: boolean) => {
    if (open) {
      setMessage(null);
      setError(null);
      resetChangePwdForm();
    }
    setOpenChangePwd(open);
  };

  // submit change password (server must validate currentPassword)
  const onChangePassword: SubmitHandler<ChangePasswordForm> = async (vals) => {
    setError(null);
    setMessage(null);
    try {
      await API.post("/auth/change-password", {
        currentPassword: vals.currentPassword,
        newPassword: vals.newPassword,
      });
      resetChangePwdForm();
      setOpenChangePwd(false);
      Swal.fire({
        icon: "success",
        title: "Password changed",
        text: "Your password has been updated.",
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      let msg = "Failed to change password";
      if (typeof err === "object" && err !== null) {
        const e = err as {
          response?: {
            data?: { error?: string; msg?: string; message?: string };
          };
          message?: string;
        };
        msg =
          e.response?.data?.error ||
          e.response?.data?.msg ||
          e.response?.data?.message ||
          e.message ||
          msg;
      } else if (typeof err === "string") {
        msg = err;
      }
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="w-full mx-auto my-8 bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">My Profile</h2>

      <CardContent className="px-0">
        {/* outer wrapper must NOT be a form because change-password dialog contains its own form */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-10 md:gap-20 justify-between mx-auto">
            <div className="flex flex-col items-center gap-4 w-full md:w-1/3 p-8 border rounded-lg bg-gray-50">
              <div>
                <Avatar className="w-40 h-40 bg-gray-200 shadow-sm outline-1">
                  {avatarPreview ? (
                    <AvatarImage
                      key={avatarPreview}
                      src={avatarPreview}
                      alt="avatar"
                      onError={() => setAvatarPreview(null)}
                      className="object-cover object-top"
                    />
                  ) : (
                    <AvatarFallback className="text-4xl bg-gray-200 font-medium text-gray-700">
                      {user?.name
                        ? user.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              <div className="mb-3 flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  className="cursor-pointer"
                >
                  Remove avatar
                </Button>
              </div>

              <div className="flex flex-col w-full">
                <Label>Change avatar</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="mt-3 text-gray-400 pl-0 py-0 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Image type should png/jpg, max 5MB
                </p>
              </div>
            </div>

            <div className="w-full md:w-2/3 flex flex-col gap-7 lg:py-8">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-3 px-2.5 py-5"
                  required
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-3 px-2.5 py-5"
                  required
                />
              </div>

              <div>
                <Label>Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-3 px-2.5 py-5"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* change password */}
                <Dialog open={openChangePwd} onOpenChange={handleChangePwdOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || submitting}
                      className="cursor-pointer h-10"
                    >
                      Change password
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>Change password</DialogTitle>
                      <DialogDescription>
                        Update your account password. New password must be at
                        least 6 characters.
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={handleChangePwdSubmit(onChangePassword)}
                      className="grid gap-4 py-4"
                    >
                      <div>
                        <Label>Current password</Label>
                        <Input
                          type="password"
                          className="mt-3 px-2.5 py-5"
                          {...register("currentPassword")}
                        />
                        {changePwdErrors.currentPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {changePwdErrors.currentPassword.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>New password</Label>
                        <Input
                          type="password"
                          className="mt-3 px-2.5 py-5"
                          {...register("newPassword")}
                        />
                        {changePwdErrors.newPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {changePwdErrors.newPassword.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Confirm new password</Label>
                        <Input
                          type="password"
                          className="mt-3 px-2.5 py-5"
                          {...register("confirmPassword")}
                        />
                        {changePwdErrors.confirmPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {changePwdErrors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="submit"
                          className="bg-blue-700 hover:bg-blue-800"
                          disabled={isChangingPwd || !isValid}
                        >
                          {isChangingPwd ? "Changing..." : "Change password"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            resetChangePwdForm();
                            setOpenChangePwd(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* save & reset buttons */}
                <div className="flex flex-row-reverse gap-3 mt-2 items-center">
                  <Button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={loading || submitting}
                    className="cursor-pointer bg-blue-700 hover:bg-blue-800 h-10"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                    disabled={loading || submitting}
                    className="cursor-pointer h-10"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default UserProfile;
