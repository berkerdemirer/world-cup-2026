import { redirect } from "next/navigation";

// The dashboard was folded into Fixtures — send the index there.
export default function HomePage() {
  redirect("/predict/matches");
}
