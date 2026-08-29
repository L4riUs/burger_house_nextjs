import Link from "next/link";
import { CheckCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Pedido confirmado | Burger House",
};

export default function CheckoutConfirmationPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600" />
          <CardTitle className="text-2xl">¡Pedido confirmado!</CardTitle>
          <CardDescription>
            Tu pedido fue registrado correctamente. Pronto nuestro equipo lo
            preparará.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recibirás una llamada o mensaje para confirmar los detalles de tu
            pedido.
          </p>
          <Button render={<Link href="/menu" />} nativeButton={false}>
            Volver al menú
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
