export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Pyaw Web</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Foundation is ready.
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          The staging-ready application shell is running. Chat features will be
          added in later phases.
        </p>
      </section>
    </main>
  );
}
