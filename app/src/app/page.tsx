import MovieGrid from "@/components/movie-grid";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="px-6 py-8">
      <Suspense fallback={null}>
        <MovieGrid />
      </Suspense>
    </main>
  );
}
