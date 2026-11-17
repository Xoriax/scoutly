import { clearDemo, hasDemo, seedDemo } from "@/lib/demo";

/** GET /api/demo → { loaded } : les données de démonstration sont-elles chargées ? */
export async function GET() {
  return Response.json({ loaded: hasDemo() });
}

/** POST /api/demo → charge les données de la maquette (prospects, échanges, actions fictifs) */
export async function POST() {
  return Response.json({ created: seedDemo() });
}

/** DELETE /api/demo → retire uniquement les données de démonstration */
export async function DELETE() {
  clearDemo();
  return new Response(null, { status: 204 });
}
