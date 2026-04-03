import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="cp-page-background cp-page-background--ambient flex min-h-screen items-center justify-center px-6 py-12 text-center sm:px-10">
      <section className="w-full max-w-4xl">
        <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">Choose how you want to play.</h1>
        <div className="mt-8 grid gap-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
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
