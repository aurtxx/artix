import { Suspense } from "react";
import ResultsClient from "./results-client";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 font-medium text-slate-600">
          Generating Scorecard...
        </div>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
