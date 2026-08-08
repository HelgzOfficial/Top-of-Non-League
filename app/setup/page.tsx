import { Suspense } from "react";
import SetupForm from "./SetupForm";

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupForm />
    </Suspense>
  );
}
