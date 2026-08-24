import {
  listAvailableTables,
  listActivePaymentMethods,
} from "@/features/catalog/actions";
import { CheckoutWizard } from "@/features/checkout/components/CheckoutWizard";

export const metadata = {
  title: "Checkout | Burger House",
  description: "Finaliza tu compra en Burger House",
};

export default async function CheckoutPage() {
  const [tablesRes, pmRes] = await Promise.all([
    listAvailableTables(),
    listActivePaymentMethods(),
  ]);

  return (
    <CheckoutWizard
      tables={tablesRes.data || []}
      paymentMethods={pmRes.data || []}
    />
  );
}
