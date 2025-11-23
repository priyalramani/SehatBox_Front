// src/pages/Home.jsx

const APP_VERSION = "17";   // <-- Hardcoded version

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Version code in corner */}
      <div className="absolute top-4 right-4 text-[11px] text-gray-400">
        Version {APP_VERSION}
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Welcome 👋</h1>
      <p className="mt-2 text-gray-600">
        This is your fresh React + Vite + Tailwind app.
      </p>
    </main>
  );
}
