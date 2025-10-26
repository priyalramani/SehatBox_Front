import toast from "react-hot-toast";

export default function Login() {
  const submit = (e) => {
    e.preventDefault();
    // Demo success message; we’ll wire real auth later.
    toast.success("Logged in (demo)!");
  };

  return (
    <main className="min-h-[calc(100vh-56px)] grid place-items-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow">
        <h1 className="text-xl font-bold text-gray-900">Login</h1>
        <div className="mt-4 space-y-3">
          <input className="w-full border rounded-xl px-3 py-2" placeholder="Email or Mobile" />
          <input className="w-full border rounded-xl px-3 py-2" type="password" placeholder="Password" />
        </div>
        <button className="mt-5 w-full bg-green-600 text-white rounded-xl px-4 py-2 font-semibold hover:bg-green-700">
          Sign In
        </button>
      </form>
    </main>
  );
}
