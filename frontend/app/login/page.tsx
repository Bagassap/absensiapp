import { LoginCard } from "./LoginCard";

export default function LoginPage() {
  return (
    <main className="fixed inset-0 flex items-end overscroll-none justify-center overflow-hidden bg-[#013920] sm:items-center sm:bg-[#FFF7E4] sm:relative sm:inset-auto sm:h-auto sm:min-h-[100dvh] sm:overflow-y-auto sm:px-6 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0, 200, 83,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <LoginCard />
    </main>
  );
}
