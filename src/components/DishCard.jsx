export default function DishCard({ title, status = "on" }) {
  const isOn = status === true || status === "on";

  return (
    <article className="rounded-2xl border p-5 bg-white shadow-sm hover:shadow transition">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isOn ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
          }`}
        >
          {isOn ? "Active" : "Inactive"}
        </span>
      </div>
    </article>
  );
}
