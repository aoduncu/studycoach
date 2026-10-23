"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth">
      <h1>Bir şeyler yolunda gitmedi.</h1>
      <p>Bağlantını kontrol edip tekrar deneyebilirsin.</p>
      <button onClick={reset}>Tekrar dene</button>
    </main>
  );
}
