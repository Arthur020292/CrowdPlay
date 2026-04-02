import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-center sm:px-10">
      <section className="w-full max-w-4xl">
        <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">Choose how you want to play.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Host a game on the big screen or join one from your phone. That&apos;s it.
        </p>

        <div className="mt-10 grid gap-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
          <button type="button" onClick={() => navigate("/host/select")} className="cp-button-primary min-h-[4.75rem] text-lg font-black">
            Host a Game
          </button>
          <button type="button" onClick={() => navigate("/join")} className="cp-button-secondary min-h-[4.75rem] text-lg font-black">
            Join a Game
          </button>
        </div>
      </section>
    </main>
  );
}
