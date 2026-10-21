import { Suspense } from "react";
import ExamPlayerClient from "./player-client";

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-medium">
          Loading CBT Engine...
        </div>
      }
    >
      <ExamPlayerClient />
    </Suspense>
  );
}
