import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameRoot = lazy(() => import("@/game/GameRoot"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INTERGALAXY: Além do Expediente — RPG corporativo" },
      { name: "description", content: "RPG isométrico em pixel art de sobrevivência corporativa com humor ácido brasileiro." },
      { property: "og:title", content: "INTERGALAXY: Além do Expediente" },
      { property: "og:description", content: "Sobreviva ao expediente, entregue o baú roxo e não faça perguntas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="game-root flex items-center justify-center">
      <p className="title-sub">CARREGANDO EXPEDIENTE...</p>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <GameRoot />
      </Suspense>
    </ClientOnly>
  );
}
