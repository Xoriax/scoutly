import { connection } from "next/server";
import { getNavCounts } from "@/lib/dashboard";
import { Sidebar } from "./Sidebar";

/** Barre latérale avec ses compteurs (prospects suivis, échanges à traiter), lus à la requête */
export async function SidebarLoader() {
  await connection();
  return <Sidebar counts={getNavCounts()} />;
}
