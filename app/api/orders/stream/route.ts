import { requireRestaurantUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { subscribeToRestaurant, type RealtimeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Flux temps réel des commandes (Server-Sent Events).
 * Le tableau de bord s'y abonne via EventSource : chaque création ou
 * changement de statut de commande est poussé instantanément.
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // flux déjà fermé
        }
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: "connected" })}\n\n`));
      const unsubscribe = subscribeToRestaurant(user.restaurantId, send);

      // keep-alive toutes les 25 s pour traverser les proxys
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // déjà fermé
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
