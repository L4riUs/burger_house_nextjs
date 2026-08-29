"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, CheckIcon, ShoppingBasketIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/hooks";
import { useCartStore } from "@/features/cart/store";
import { getLocalizedField } from "@/lib/i18n";
import {
  guestCheckoutFormSchema,
  checkoutFulfillmentSchema,
  checkoutContactSchema,
  buildPaymentFormSchema,
  requiresPaymentProof,
} from "../schemas";
import { createOrderDraft, createGuestCustomer } from "../actions";

const CHECKOUT_STEPS = [
  { id: "fulfillment", label: "Entrega" },
  { id: "contact", label: "Datos de contacto" },
  { id: "payment", label: "Método de pago" },
  { id: "confirm", label: "Confirmación" },
];

export function CheckoutWizard({ tables = [], paymentMethods = [] }) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const { user, profile, loading: authLoading } = useAuth();

  const cartItems = useCartStore((state) => state.items);
  const getSubtotalVES = useCartStore((state) => state.getSubtotalVES);
  const getSubtotalUSD = useCartStore((state) => state.getSubtotalUSD);
  const getItemCount = useCartStore((state) => state.getItemCount);
  const clearCart = useCartStore((state) => state.clearCart);

  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceGuest, setForceGuest] = useState(false);

  const goToStep = (step) => {
    setCurrentStep(step);
    setMaxVisitedStep((prev) => Math.max(prev, step));
  };

  const canNavigateToStep = (step) =>
    step <= maxVisitedStep && !isSubmitting;

  const isAuthenticated = Boolean(user && profile) && !forceGuest;

  const [fulfillment, setFulfillment] = useState({
    fulfillment_type: "pickup",
    table_id: null,
    delivery_address: null,
  });

  const [guestContact, setGuestContact] = useState({
    full_name: "",
    phone: "",
    address: "",
  });

  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [selectedPmIdState, setSelectedPmIdState] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);

  const fulfillmentForm = useForm({
    resolver: zodResolver(checkoutFulfillmentSchema),
    mode: "onChange",
    defaultValues: {
      fulfillment_type: "pickup",
      table_id: null,
      delivery_address: null,
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(guestCheckoutFormSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      address: "",
    },
  });

  // El resolver cambia según el método elegido: Pago Móvil pide teléfono y
  // cédula; Binance/Zelle solo referencia; todos exigen foto del comprobante.
  const selectedProviderCode = useMemo(
    () =>
      paymentMethods.find((pm) => pm.id === selectedPmIdState)?.provider_code ||
      null,
    [paymentMethods, selectedPmIdState]
  );

  const paymentStepSchema = useMemo(
    () => buildPaymentFormSchema(selectedProviderCode),
    [selectedProviderCode]
  );

  const paymentForm = useForm({
    resolver: zodResolver(paymentStepSchema),
    mode: "onChange",
    defaultValues: {
      payment_method_id: "",
      reference_number: "",
      payer_phone: "",
      payer_id_number: "",
      receipt_file: null,
    },
  });

  const contact = useMemo(() => {
    if (isAuthenticated) {
      return {
        customer_type: "authenticated",
        profile_id: profile.id,
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: "",
      };
    }
    return {
      customer_type: "guest",
      ...guestContact,
    };
  }, [isAuthenticated, profile, guestContact]);

  const buildInvalidHandler = (formLabel) => (errors) => {
    console.error(`[checkout:${formLabel}] errores de validación:`, errors);
    const firstError = Object.values(errors).find(Boolean);
    toastError(firstError?.message || "Revisa los datos del formulario");
  };

  const handleFulfillmentSubmit = (data) => {
    // El resolver (zodResolver) garantiza que `data` cumple el schema.
    setFulfillment(data);
    goToStep(1);
  };

  const handleAuthenticatedContinue = () => {
    goToStep(2);
  };

  const handleContinueAsGuest = () => {
    setForceGuest(true);
    setGuestContact({ full_name: "", phone: "", address: "" });
    contactForm.reset({ full_name: "", phone: "", address: "" });
    goToStep(1);
  };

  const handleGuestSubmit = (data) => {
    if (
      fulfillment.fulfillment_type === "delivery" &&
      (!data.address || data.address.trim().length === 0)
    ) {
      contactForm.setError("address", {
        message: "La dirección es requerida para delivery",
      });
      return;
    }

    const contactResult = checkoutContactSchema.safeParse({
      customer_type: "guest",
      guest_customer: {
        full_name: data.full_name,
        phone: data.phone,
        address: data.address || null,
      },
    });

    if (!contactResult.success) {
      toastError(contactResult.error.issues[0].message);
      return;
    }

    setGuestContact({
      full_name: data.full_name,
      phone: data.phone,
      address: data.address || "",
    });
    goToStep(2);
  };

  const handlePaymentValid = (data) => {
    setPaymentMethodId(data.payment_method_id);
    if (requiresPaymentProof(selectedProviderCode)) {
      setPaymentProof({
        provider_code: selectedProviderCode,
        reference_number: data.reference_number,
        payer_phone: data.payer_phone || null,
        payer_id_number: data.payer_id_number || null,
      });
      setReceiptFile(data.receipt_file);
    } else {
      setPaymentProof(null);
      setReceiptFile(null);
    }
    goToStep(3);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    paymentForm.handleSubmit(handlePaymentValid, buildInvalidHandler("pago"))(e);
  };

  // TODO(fase6): conectar la creación real de la orden en la tabla `orders`.
  // En esta fase createOrderDraft solo valida con Zod y registra el payload.
  const handleConfirm = async () => {
    const guestCustomerData =
      contact.customer_type === "guest"
        ? {
            full_name: contact.full_name,
            phone: contact.phone,
            address:
              fulfillment.fulfillment_type === "delivery"
                ? contact.address || fulfillment.delivery_address
                : null,
          }
        : null;

    const payload = {
      fulfillment_type: fulfillment.fulfillment_type,
      table_id: fulfillment.table_id,
      delivery_address:
        fulfillment.fulfillment_type === "delivery"
          ? contact.address || fulfillment.delivery_address
          : null,
      currency:
        paymentMethods.find((pm) => pm.id === paymentMethodId)?.currency ===
        "USD"
          ? "USD"
          : "VES",
      exchange_rate: 1,
      subtotal_ves: getSubtotalVES(),
      subtotal_usd: getSubtotalUSD(),
      total_ves: getSubtotalVES(),
      total_usd: getSubtotalUSD(),
      customer_type: contact.customer_type,
      profile_id:
        contact.customer_type === "authenticated"
          ? contact.profile_id
          : null,
      guest_customer: guestCustomerData,
      payment_method_id: paymentMethodId,
      payment_proof: paymentProof,
      cart_items: cartItems,
    };

    setIsSubmitting(true);

    const result = await createOrderDraft(payload, receiptFile);

    if (result.error) {
      toastError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.success) {
      if (contact.customer_type === "guest" && guestCustomerData) {
        await createGuestCustomer(guestCustomerData);
      }
      clearCart();
      toastSuccess("¡Pedido confirmado! Redirigiendo...");
      router.push("/checkout/confirmation");
    }

    setIsSubmitting(false);
  };

  const itemCount = getItemCount();
  const subtotalVES = getSubtotalVES();

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBasketIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Carrito vacío</h2>
        <p className="text-muted-foreground mb-4">
          No tienes productos en tu carrito.
        </p>
        <Button render={<Link href="/menu" />} nativeButton={false}>
          Ver menú
        </Button>
      </div>
    );
  }

  // Valor vivo del formulario: los campos condicionales (mesa / dirección)
  // deben aparecer en cuanto se selecciona la opción, no después de enviar.
  const watchedFulfillmentType = fulfillmentForm.watch("fulfillment_type");
  const fulfillmentType = watchedFulfillmentType || "pickup";
  const selectedTable = tables.find((t) => t.id === fulfillment.table_id);
  const selectedPayment = paymentMethods.find(
    (pm) => pm.id === paymentMethodId
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Finalizar compra</h1>
          <p className="text-muted-foreground">
            {itemCount} {itemCount === 1 ? "producto" : "productos"} en el carrito
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 overflow-x-auto">
          {CHECKOUT_STEPS.map((step, index) => {
            const isNavigable = canNavigateToStep(index);
            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => isNavigable && setCurrentStep(index)}
                  disabled={!isNavigable}
                  aria-current={index === currentStep ? "step" : undefined}
                  title={
                    isNavigable
                      ? `Ir a ${step.label}`
                      : "Completa los pasos anteriores para avanzar"
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index <= maxVisitedStep
                      ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => isNavigable && setCurrentStep(index)}
                  disabled={!isNavigable}
                  className={`ml-2 whitespace-nowrap text-sm ${
                    index === currentStep
                      ? "font-medium text-foreground"
                      : isNavigable
                      ? "text-muted-foreground hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                      : "text-muted-foreground/60 cursor-not-allowed"
                  }`}
                >
                  {step.label}
                </button>
                {index < CHECKOUT_STEPS.length - 1 && (
                  <div className="mx-2 h-px w-10 bg-border shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 0 && "Tipo de entrega"}
              {currentStep === 1 && "Datos de contacto"}
              {currentStep === 2 && "Método de pago"}
              {currentStep === 3 && "Confirmar pedido"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 0 && (
              <form
                onSubmit={fulfillmentForm.handleSubmit(
                  handleFulfillmentSubmit,
                  buildInvalidHandler("entrega")
                )}
                className="space-y-4"
              >
                <Controller
                  name="fulfillment_type"
                  control={fulfillmentForm.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value || "pickup"}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3"
                    >
                      {[
                        {
                          value: "dine_in",
                          title: "En la mesa (dine in)",
                          subtitle: "Sirve en la mesa que seleccione",
                        },
                        {
                          value: "pickup",
                          title: "Para llevar",
                          subtitle: "Recoger en el local",
                        },
                        {
                          value: "delivery",
                          title: "A domicilio",
                          subtitle: "Envío a domicilio",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          role="presentation"
                          onClick={() => field.onChange(option.value)}
                          className={`flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-colors ${
                            field.value === option.value
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`fulfillment-${option.value}`}
                          />
                          <Label
                            htmlFor={`fulfillment-${option.value}`}
                            className="font-normal cursor-pointer"
                          >
                            <div>
                              <div className="font-medium">{option.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {option.subtitle}
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />

                {fulfillmentForm.formState.errors.fulfillment_type && (
                  <p className="text-sm text-destructive">
                    {fulfillmentForm.formState.errors.fulfillment_type.message}
                  </p>
                )}

                {fulfillmentType === "dine_in" && (
                  <div className="space-y-2">
                    <Label>Seleccionar mesa *</Label>
                    <Controller
                      name="table_id"
                      control={fulfillmentForm.control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una mesa" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                {table.name} — Capacidad: {table.capacity}
                                {table.zone && ` (${table.zone})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {tables.length === 0 ? (
                      <p className="text-sm text-destructive">
                        No hay mesas disponibles en este momento. Verifica que
                        existan mesas con estado disponible y que las políticas
                        RLS públicas estén aplicadas.
                      </p>
                    ) : (
                      fulfillmentForm.formState.errors.table_id && (
                        <p className="text-sm text-destructive">
                          {fulfillmentForm.formState.errors.table_id.message}
                        </p>
                      )
                    )}
                  </div>
                )}

                {fulfillmentType === "delivery" && (
                  <div className="space-y-2">
                    <Label htmlFor="delivery_address">
                      Dirección de entrega *
                    </Label>
                    <Input
                      id="delivery_address"
                      {...fulfillmentForm.register("delivery_address")}
                      placeholder="Calle, número, apartamento..."
                    />
                    {fulfillmentForm.formState.errors.delivery_address && (
                      <p className="text-sm text-destructive">
                        {fulfillmentForm.formState.errors.delivery_address.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit">Continuar</Button>
                </div>
              </form>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    <div className="rounded-md bg-muted/50 p-4">
                      <p className="font-medium">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.phone || "Sin teléfono"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Estás autenticado. Se usarán tus datos de perfil.
                      </p>
                    </div>
                    <div className="flex justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(0)}
                      >
                        Atrás
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleContinueAsGuest}
                        >
                          Pedir como invitado
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAuthenticatedContinue}
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={contactForm.handleSubmit(
                      handleGuestSubmit,
                      buildInvalidHandler("contacto")
                    )}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="full_name">Nombre completo *</Label>
                        <Input
                          id="full_name"
                          {...contactForm.register("full_name")}
                          placeholder="Juan Pérez"
                        />
                        {contactForm.formState.errors.full_name && (
                          <p className="text-sm text-destructive">
                            {contactForm.formState.errors.full_name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">Teléfono *</Label>
                        <Input
                          id="phone"
                          {...contactForm.register("phone")}
                          placeholder="+58 412 345 6789"
                        />
                        {contactForm.formState.errors.phone && (
                          <p className="text-sm text-destructive">
                            {contactForm.formState.errors.phone.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="address">
                          Dirección de entrega
                          {fulfillmentType === "delivery" ? " *" : ""}
                        </Label>
                        <Input
                          id="address"
                          {...contactForm.register("address")}
                          placeholder="Calle 5, Apto 3B..."
                        />
                        {contactForm.formState.errors.address && (
                          <p className="text-sm text-destructive">
                            {contactForm.formState.errors.address.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(0)}
                      >
                        Atrás
                      </Button>
                      <Button type="submit">Continuar</Button>
                    </div>

                    {!user && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push("/login")}
                      >
                        Ya tengo cuenta — Iniciar sesión
                      </Button>
                    )}
                  </form>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <Controller
                  name="payment_method_id"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPmIdState(value);
                      }}
                      className="flex flex-col gap-3"
                    >
                      {paymentMethods.map((pm) => (
                        <div
                          key={pm.id}
                          role="presentation"
                          onClick={() => {
                            field.onChange(pm.id);
                            setSelectedPmIdState(pm.id);
                          }}
                          className={`flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-colors ${
                            field.value === pm.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem value={pm.id} id={`pm-${pm.id}`} />
                          <Label
                            htmlFor={`pm-${pm.id}`}
                            className="flex-1 font-normal cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{pm.name}</span>
                              <Badge variant="outline">
                                {pm.currency === "USD" ? "USD $" : "VES Bs."}
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />

                {paymentMethods.length === 0 && (
                  <p className="text-sm text-destructive">
                    No hay métodos de pago disponibles. Contacta al local.
                  </p>
                )}

                {paymentForm.formState.errors.payment_method_id && (
                  <p className="text-sm text-destructive">
                    {paymentForm.formState.errors.payment_method_id.message}
                  </p>
                )}

                {requiresPaymentProof(selectedProviderCode) && (
                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Datos del pago</p>

                    <div>
                      <Label htmlFor="reference_number">
                        Número de operación *
                      </Label>
                      <Input
                        id="reference_number"
                        {...paymentForm.register("reference_number")}
                        placeholder="Ej: 123456789"
                      />
                      {paymentForm.formState.errors.reference_number && (
                        <p className="text-sm text-destructive">
                          {
                            paymentForm.formState.errors.reference_number
                              .message
                          }
                        </p>
                      )}
                    </div>

                    {selectedProviderCode === "pago_movil" && (
                      <>
                        <div>
                          <Label htmlFor="payer_phone">
                            Teléfono del pagador *
                          </Label>
                          <Input
                            id="payer_phone"
                            {...paymentForm.register("payer_phone")}
                            placeholder="04121234567"
                            inputMode="numeric"
                          />
                          {paymentForm.formState.errors.payer_phone && (
                            <p className="text-sm text-destructive">
                              {paymentForm.formState.errors.payer_phone.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="payer_id_number">Cédula *</Label>
                          <Input
                            id="payer_id_number"
                            {...paymentForm.register("payer_id_number")}
                            placeholder="V12345678"
                          />
                          {paymentForm.formState.errors.payer_id_number && (
                            <p className="text-sm text-destructive">
                              {
                                paymentForm.formState.errors.payer_id_number
                                  .message
                              }
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    <Controller
                      name="receipt_file"
                      control={paymentForm.control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="receipt_file">
                            Foto del comprobante *
                          </Label>
                          <Input
                            id="receipt_file"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              field.onChange(e.target.files?.[0] ?? null)
                            }
                          />
                          {field.value && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={URL.createObjectURL(field.value)}
                              alt="Vista previa del comprobante"
                              className="mt-2 h-24 rounded-md border object-cover"
                            />
                          )}
                          {paymentForm.formState.errors.receipt_file && (
                            <p className="text-sm text-destructive">
                              {paymentForm.formState.errors.receipt_file.message}
                            </p>
                          )}
                        </div>
                      )}
                    />

                    <p className="text-xs text-muted-foreground">
                      Tu pedido quedará en espera hasta que verifiquemos el
                      pago.
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    Atrás
                  </Button>
                  <Button type="submit">Continuar</Button>
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Resumen de entrega</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Tipo:</span>{" "}
                      {fulfillmentType === "dine_in"
                        ? "En la mesa"
                        : fulfillmentType === "pickup"
                        ? "Para llevar"
                        : "A domicilio"}
                    </p>
                    {fulfillmentType === "dine_in" && selectedTable && (
                      <p>
                        <span className="text-muted-foreground">Mesa:</span>{" "}
                        {selectedTable.name}
                      </p>
                    )}
                    {fulfillmentType === "delivery" &&
                      (contact.address || fulfillment.delivery_address) && (
                        <p>
                          <span className="text-muted-foreground">
                            Dirección:
                          </span>{" "}
                          {contact.address || fulfillment.delivery_address}
                        </p>
                      )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Datos de contacto</h3>
                  {contact.customer_type === "authenticated" ? (
                    <p className="text-sm">
                      {profile?.full_name || user?.email}
                      {profile?.phone && ` — ${profile.phone}`}
                    </p>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p>{contact.full_name}</p>
                      <p>{contact.phone}</p>
                      {fulfillmentType === "delivery" && contact.address && (
                        <p>{contact.address}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Método de pago</h3>
                  <p className="text-sm">
                    {selectedPayment?.name || "No seleccionado"}
                  </p>
                  {paymentProof && (
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          Nº de operación:
                        </span>{" "}
                        {paymentProof.reference_number}
                      </p>
                      {paymentProof.payer_phone && (
                        <p>
                          <span className="text-muted-foreground">
                            Teléfono:
                          </span>{" "}
                          {paymentProof.payer_phone}
                        </p>
                      )}
                      {paymentProof.payer_id_number && (
                        <p>
                          <span className="text-muted-foreground">Cédula:</span>{" "}
                          {paymentProof.payer_id_number}
                        </p>
                      )}
                      <Badge variant="secondary">
                        Pago pendiente de verificación
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">Resumen del carrito</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <CartSummaryItem key={item.id} item={item} />
                    ))}
                  </div>
                  <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                    <span>Total</span>
                    <span>${Number(subtotalVES).toFixed(2)} VES</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                  >
                    Atrás
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={isSubmitting || !paymentMethodId}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Confirmar pedido"
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Nota: la creación real de la orden en la tabla{" "}
                  <code className="text-xs">orders</code> se conecta en la{" "}
                  <strong>Fase 6</strong>. En esta fase, el checkout valida y
                  prepara el payload, pero no persiste la orden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CartSummaryItem({ item }) {
  const name =
    item.type === "product"
      ? getLocalizedField(item.product.name) || item.product.name
      : getLocalizedField(item.combo.name) || item.combo.name;

  const price =
    item.type === "product"
      ? Number(item.product.price_ves || 0)
      : Number(item.combo.price_ves || 0);

  const itemTotal = price * item.quantity;

  return (
    <div className="flex justify-between text-sm">
      <span>
        {name} × {item.quantity}
      </span>
      <span>${Number(itemTotal).toFixed(2)}</span>
    </div>
  );
}
