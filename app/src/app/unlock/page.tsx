import type { Metadata } from "next";
import UnlockForm from "./unlock-form";

export const metadata: Metadata = { title: "Activer Zen", robots: { index: false, follow: false } };

export default function UnlockPage() {
  return <main className="flex min-h-[calc(100dvh-6.75rem-env(safe-area-inset-bottom))] items-center justify-center px-5 py-10 md:min-h-dvh"><UnlockForm /></main>;
}
