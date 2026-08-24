import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StoreHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Burger House</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Las mejores hamburguesas de la ciudad. Pide ya en línea.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/menu">Ver Menú</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
