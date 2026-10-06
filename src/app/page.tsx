import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "Kitchen Quest | Learn food. Master recipes.",
};

export default function Home() {
  return <HomePage />;
}
