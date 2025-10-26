import { useMemo, useState } from "react";

export default function UserForm({ onCancel, onSave, saving = false }) {
  const [mobile, setMobile] = useState("");
  const [statusOn, setStatusOn] = useState(true);

  const errors = useMemo(() => {
    const e = {};
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) e.mobile = "Enter a 10-digit mobile number";
    return e;
  }, [mobile]);

  const submit = (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) return;
    onSave?.({
      mobile: mobile.replace(/\D/g, ""),
      status: statusOn ? "on" : "off",
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="mt-1 w-full border rounded-xl px-3 py-2"
          placeholder="e.g., 9876543210"
          inputMode="numeric"
        />
        {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStatusOn((s) => !s)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition
              ${statusOn ? "bg-green-600" : "bg-gray-300"}`}
            aria-pressed={statusOn}
            aria-label="Toggle status"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition
                ${statusOn ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
          <span className="text-sm text-gray-700">{statusOn ? "On" : "Off"}</span>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || Object.keys(errors).length > 0}
          className="rounded-xl bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          Save User
        </button>
      </div>
    </form>
  );
}
