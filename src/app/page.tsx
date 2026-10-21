import { redirect } from "next/navigation";

// Temporary: redirect root to login until dashboard is built
export default function Home() {
  redirect("/login");
}
