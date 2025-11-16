import React, { useRef, useState } from "react";
import API from "../../services/api";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import Swal from "sweetalert2";

const ApplyLeave: React.FC = () => {
  const [formData, setFormData] = useState({
    leaveType: "",
    reason: "",
    halfDayType: "",
    otherReason: "",
  });
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation because shadcn Selects don't use native required
    if (!formData.leaveType) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Please select a leave type",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (formData.leaveType === "Half Day" && !formData.halfDayType) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Please select morning or afternoon for half day",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (!formData.reason) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Please select a reason",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (formData.reason === "Other" && !formData.otherReason.trim()) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Please specify the reason",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (selectedDates.length === 0) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Please select at least one date",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const form = new FormData();
    form.append("user", user.id || user._id || "");
    form.append("leaveType", formData.leaveType);
    form.append("reason", formData.reason);
    form.append("otherReason", formData.otherReason);
    if (formData.leaveType === "Half Day" && formData.halfDayType) {
      form.append("halfDayType", formData.halfDayType);
    }
    if (proofFile) {
      form.append("proofDocument", proofFile);
    }
    selectedDates.forEach((date) =>
      form.append("dates[]", format(date, "yyyy-MM-dd"))
    );

    try {
      await API.post("/leaverequests", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Leave applied successfully",
        text: "Your leave request has been submitted.",
        showConfirmButton: false,
        timer: 2500,
      });
      setFormData({
        leaveType: "",
        reason: "",
        halfDayType: "",
        otherReason: "",
      });
      setSelectedDates([]);
      setProofFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Failed to apply leave",
        showConfirmButton: false,
        timer: 3000,
      });
      console.error("Failed to apply leave", error);
    }
  };

  const handleReset = () => {
    setFormData({
      leaveType: "",
      reason: "",
      halfDayType: "",
      otherReason: "",
    });
    setSelectedDates([]);
    setProofFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex justify-center items-center min-h-auto w-full rounded-2xl mt-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-2xl p-8 w-full"
        encType="multipart/form-data"
      >
        <h2 className="text-2xl font-semibold pb-3 mb-5 border-b">
          Apply for Leave
        </h2>

        <div className="flex flex-col lg:flex-row items-start justify-between mx-auto w-full gap-20 py-4">
          <div className="w-full lg:w-3/5 space-y-8">
            {/* Leave Type */}
            <div className="space-y-3">
              <Label>Leave Type</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) =>
                  setFormData({ ...formData, leaveType: value })
                }
              >
                <SelectTrigger className="w-full px-2.5 py-5 mb-2 cursor-pointer focus:outline-none">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="Full Day">
                    Full Day
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Half Day">
                    Half Day
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Short Leave">
                    Short Leave
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Half day option */}
            {formData.leaveType === "Half Day" && (
              <div className="space-y-3">
                <Label>Half Day</Label>
                <Select
                  value={formData.halfDayType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, halfDayType: value })
                  }
                >
                  <SelectTrigger className="w-full px-2.5 py-5 mb-2 cursor-pointer focus:outline-none">
                    <SelectValue placeholder=" Select Half Day " />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="cursor-pointer" value="morning">
                      Morning
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value="afternoon">
                      Afternoon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-3">
              <Label>Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) =>
                  setFormData({ ...formData, reason: value })
                }
              >
                <SelectTrigger className="w-full px-2.5 py-5 mb-2 cursor-pointer focus:outline-none">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="Sick">
                    Sick
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Personal">
                    Personal
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Office work">
                    Office work
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Educational">
                    Educational
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="Other">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>

              {formData.reason === "Other" && (
                <Input
                  type="text"
                  name="otherReason"
                  value={formData.otherReason}
                  onChange={handleChange}
                  placeholder="Please specify"
                  className="w-full px-2.5 py-5 mb-2"
                />
              )}
            </div>

            {/* Proof document upload */}
            <div className="space-y-3">
              <Label htmlFor="proofDocument">Proof Document (optional)</Label>
              <div className="flex items-center gap-3">
                {/* Hidden actual file input */}
                <Input
                  id="proofDocument"
                  type="file"
                  name="proofDocument"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />

                {/* Styled button to trigger file upload */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>

                {/* Show selected file name */}
                {proofFile && (
                  <span className="text-sm text-gray-600 truncate max-w-xs">
                    {proofFile.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-5">
              <Button
                type="submit"
                className="flex-1 py-5 bg-blue-700 hover:bg-blue-800 cursor-pointer"
              >
                Apply Leave
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="py-5 flex-1 cursor-pointer"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="w-full lg:w-2/5 h-full">
            {/* Multiple Date Picker */}
            <div className="space-y-3">
              <Label>Select Leave Dates</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={setSelectedDates}
                className="border rounded-md w-full h-full"
                classNames={{
                  table: "w-full",
                  day: "w-full lg:w-12 lg:h-12 md:mx-1 -my-1 text-xs cursor-pointer",
                }}
                required
              />
            </div>
          </div>
        </div>

        {/* notifications shown via top-end SweetAlert2 toasts */}
      </form>
    </div>
  );
};

export default ApplyLeave;
