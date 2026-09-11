import type { Metadata } from "next";
import UnlockForm from "./unlock-form";

export const metadata: Metadata = { title: "Activer Zen", robots: { index: false, follow: false } };

export default function UnlockPage() {
  return <main className="flex min-h-dvh items-center justify-center px-5 py-10"><UnlockForm /></main>;
}
