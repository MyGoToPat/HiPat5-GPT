import React from "react";

export default function WelcomeBetaPage() {
  const videoUrl = import.meta.env.VITE_BETA_VIDEO_URL ?? "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Welcome to Pat</h1>
          <p className="text-base opacity-80">
            Thanks for signing up. Pat is currently in beta. You're now in the review queue.
            We'll reach out within 48 hours.
          </p>
        </header>

        <p className="text-base opacity-90">
          Pat is your Hyper Intelligent Personal Assistant Team for fitness and nutrition.
          During beta, we're onboarding in stages to guarantee a superior experience.
          You'll get full access once your account is approved.
        </p>

        <div className="rounded-2xl border p-4">
          {videoUrl ? (
            <video controls className="w-full rounded-lg" src={videoUrl} />
          ) : (
            <div className="text-sm opacity-70">
              Video coming soon. Ask admin to set VITE_BETA_VIDEO_URL.
            </div>
          )}
        </div>

        <footer className="text-sm opacity-70">
          Questions? Contact{" "}
          <a className="underline" href="mailto:info@hipat.app">info@hipat.app</a>
        </footer>
      </section>
    </main>
  );
}