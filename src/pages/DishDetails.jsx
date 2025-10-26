import { useParams, useNavigate } from "react-router-dom";

export default function DishDetails() {
  const { id } = useParams();
  const nav = useNavigate();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <button
        className="rounded-xl border px-4 py-2 hover:bg-gray-100"
        onClick={() => nav(-1)}
      >
        ← Back
      </button>

      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Dish Details</h1>
        <p className="mt-2 text-gray-600">
          Coming soon. ID: <span className="font-mono">{id}</span>
        </p>
      </div>
    </main>
  );
}
