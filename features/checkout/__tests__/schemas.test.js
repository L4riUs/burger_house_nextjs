import { describe, it, expect } from "vitest";
import {
  guestCustomerSchema,
  checkoutFulfillmentSchema,
  checkoutContactSchema,
  checkoutPaymentSchema,
  cartItemSchema,
  checkoutDraftSchema,
  guestCheckoutFormSchema,
  paymentProofSchema,
  requiresPaymentProof,
  buildPaymentFormSchema,
} from "../schemas";

const TABLE_ID = "aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa";
const PROFILE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PAYMENT_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const COMBO_ID = "44444444-4444-4444-a444-444444444444";
const EXTRA_ID = "22222222-2222-4222-9222-222222222222";

describe("Checkout Schemas", () => {
  describe("guestCustomerSchema", () => {
    it("acepta un cliente invitado válido", () => {
      const result = guestCustomerSchema.safeParse({
        full_name: "Juan Pérez",
        phone: "+584123456789",
        address: "Calle 5, Apto 3B",
      });

      expect(result.success).toBe(true);
    });

    it("rechaza cuando falta el nombre", () => {
      const result = guestCustomerSchema.safeParse({
        full_name: "",
        phone: "+584123456789",
      });

      expect(result.success).toBe(false);
    });

    it("rechaza cuando falta el teléfono", () => {
      const result = guestCustomerSchema.safeParse({
        full_name: "Juan Pérez",
        phone: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("checkoutFulfillmentSchema", () => {
    it("acepta pickup sin datos adicionales", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "pickup",
      });

      expect(result.success).toBe(true);
    });

    it("acepta dine_in con mesa seleccionada", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "dine_in",
        table_id: TABLE_ID,
      });

      expect(result.success).toBe(true);
    });

    it("rechaza dine_in sin mesa", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "dine_in",
        table_id: null,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("table_id");
    });

    it("acepta delivery con dirección", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "delivery",
        delivery_address: "Av. Principal, Casa 12",
      });

      expect(result.success).toBe(true);
    });

    it("rechaza delivery sin dirección", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "delivery",
        delivery_address: "",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("delivery_address");
    });

    it("rechaza un tipo de entrega desconocido", () => {
      const result = checkoutFulfillmentSchema.safeParse({
        fulfillment_type: "teleport",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("checkoutContactSchema", () => {
    it("acepta cliente invitado con sus datos", () => {
      const result = checkoutContactSchema.safeParse({
        customer_type: "guest",
        guest_customer: {
          full_name: "Juan Pérez",
          phone: "+584123456789",
          address: null,
        },
      });

      expect(result.success).toBe(true);
    });

    it("acepta cliente autenticado con profile_id", () => {
      const result = checkoutContactSchema.safeParse({
        customer_type: "authenticated",
        profile_id: PROFILE_ID,
      });

      expect(result.success).toBe(true);
    });

    it("rechaza autenticado sin profile_id", () => {
      const result = checkoutContactSchema.safeParse({
        customer_type: "authenticated",
      });

      expect(result.success).toBe(false);
    });

    it("rechaza un customer_type desconocido", () => {
      const result = checkoutContactSchema.safeParse({
        customer_type: "vip",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("checkoutPaymentSchema", () => {
    it("acepta un uuid de método de pago", () => {
      const result = checkoutPaymentSchema.safeParse({
        payment_method_id: PAYMENT_ID,
      });

      expect(result.success).toBe(true);
    });

    it("rechaza cuando no se selecciona método", () => {
      const result = checkoutPaymentSchema.safeParse({
        payment_method_id: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("cartItemSchema", () => {
    it("acepta un item de producto con extras", () => {
      const result = cartItemSchema.safeParse({
        id: `${PRODUCT_ID}-1700000000000`,
        type: "product",
        product: {
          id: PRODUCT_ID,
          name: { es: "Hamburguesa", en: "Burger" },
          price_ves: 100,
          price_usd: 5,
          image_url: null,
        },
        quantity: 2,
        extras: [
          {
            extra: {
              id: EXTRA_ID,
              name: { es: "Queso" },
              price_ves: 20,
              price_usd: 1,
            },
            quantity: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("aplica extras y cantidad por defecto en items de producto", () => {
      const result = cartItemSchema.safeParse({
        id: `${PRODUCT_ID}-1700000000000`,
        type: "product",
        product: {
          id: PRODUCT_ID,
          name: { es: "Hamburguesa" },
          price_ves: 100,
          price_usd: 5,
        },
        quantity: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.extras).toEqual([]);
    });

    it("rechaza cantidad menor a 1", () => {
      const result = cartItemSchema.safeParse({
        id: `${PRODUCT_ID}-1700000000000`,
        type: "product",
        product: {
          id: PRODUCT_ID,
          name: { es: "Hamburguesa" },
          price_ves: 100,
          price_usd: 5,
        },
        quantity: 0,
      });

      expect(result.success).toBe(false);
    });

    it("acepta un item de combo con combo_items opcionales", () => {
      const result = cartItemSchema.safeParse({
        id: `${COMBO_ID}-1700000000000`,
        type: "combo",
        combo: {
          id: COMBO_ID,
          name: { es: "Combo Familiar" },
          price_ves: 500,
          price_usd: 25,
          combo_items: [
            {
              id: "linea-1",
              quantity: 2,
              product: {
                id: PRODUCT_ID,
                name: { es: "Hamburguesa" },
                price_ves: 100,
                price_usd: 5,
              },
            },
          ],
        },
        quantity: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("checkoutDraftSchema", () => {
    const baseCartItems = [
      {
        id: `${PRODUCT_ID}-1700000000000`,
        type: "product",
        product: {
          id: PRODUCT_ID,
          name: { es: "Hamburguesa" },
          price_ves: 100,
          price_usd: 5,
        },
        quantity: 2,
        extras: [],
      },
    ];

    function buildDraft(overrides = {}) {
      return {
        fulfillment_type: "pickup",
        table_id: null,
        delivery_address: null,
        currency: "VES",
        exchange_rate: 1,
        subtotal_ves: 200,
        subtotal_usd: 10,
        total_ves: 200,
        total_usd: 10,
        customer_type: "guest",
        profile_id: null,
        guest_customer: {
          full_name: "Juan Pérez",
          phone: "+584123456789",
          address: null,
        },
        payment_method_id: PAYMENT_ID,
        cart_items: baseCartItems,
        ...overrides,
      };
    }

    it("acepta un draft válido de pickup con cliente invitado", () => {
      const result = checkoutDraftSchema.safeParse(buildDraft());

      expect(result.success).toBe(true);
    });

    it("aplica defaults de moneda y tasa de cambio", () => {
      const draft = buildDraft();
      delete draft.currency;
      delete draft.exchange_rate;

      const result = checkoutDraftSchema.safeParse(draft);

      expect(result.success).toBe(true);
      expect(result.data.currency).toBe("VES");
      expect(result.data.exchange_rate).toBe(1);
    });

    it("rechaza carrito vacío", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({ cart_items: [] })
      );

      expect(result.success).toBe(false);
    });

    it("rechaza dine_in sin mesa", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({ fulfillment_type: "dine_in", table_id: null })
      );

      expect(result.success).toBe(false);
    });

    it("acepta dine_in con mesa", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({ fulfillment_type: "dine_in", table_id: TABLE_ID })
      );

      expect(result.success).toBe(true);
    });

    it("rechaza cliente autenticado sin profile_id", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({ customer_type: "authenticated", profile_id: null })
      );

      expect(result.success).toBe(false);
    });

    it("rechaza invitado con delivery sin dirección en guest_customer", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({
          fulfillment_type: "delivery",
          delivery_address: "Av. Principal",
          guest_customer: {
            full_name: "Juan Pérez",
            phone: "+584123456789",
            address: null,
          },
        })
      );

      expect(result.success).toBe(false);
    });

    it("acepta invitado con delivery y dirección completa", () => {
      const result = checkoutDraftSchema.safeParse(
        buildDraft({
          fulfillment_type: "delivery",
          delivery_address: "Av. Principal, Casa 12",
          guest_customer: {
            full_name: "Juan Pérez",
            phone: "+584123456789",
            address: "Av. Principal, Casa 12",
          },
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe("guestCheckoutFormSchema", () => {
    it("acepta el formulario plano de invitado", () => {
      const result = guestCheckoutFormSchema.safeParse({
        full_name: "Juan Pérez",
        phone: "+584123456789",
        address: "",
      });

      expect(result.success).toBe(true);
    });

    it("rechaza sin nombre o teléfono", () => {
      expect(
        guestCheckoutFormSchema.safeParse({ full_name: "", phone: "123" })
          .success
      ).toBe(false);
      expect(
        guestCheckoutFormSchema.safeParse({ full_name: "Juan", phone: "" })
          .success
      ).toBe(false);
    });
  });

  describe("paymentProofSchema (comprobantes)", () => {
    const makeReceipt = (options = {}) =>
      new File(["comprobante"], options.name || "comprobante.png", {
        type: options.type || "image/png",
      });

    const validPagoMovil = {
      provider_code: "pago_movil",
      reference_number: "123456789",
      payer_phone: "04121234567",
      payer_id_number: "V12345678",
      receipt_file: makeReceipt(),
    };

    it("acepta un comprobante de pago móvil completo", () => {
      const result = paymentProofSchema.safeParse(validPagoMovil);

      expect(result.success).toBe(true);
    });

    it("acepta cédula con prefijo separado por guion", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        payer_id_number: "V-12345678",
      });

      expect(result.success).toBe(true);
    });

    it("rechaza pago móvil con teléfono inválido", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        payer_phone: "02125551234",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("payer_phone");
    });

    it("rechaza pago móvil con teléfono de operador no venezolano", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        payer_phone: "04991234567",
      });

      expect(result.success).toBe(false);
    });

    it("rechaza pago móvil con cédula inválida", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        payer_id_number: "12345",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("payer_id_number");
    });

    it("rechaza cuando falta el número de operación", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        reference_number: "123",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("reference_number");
    });

    it("rechaza cuando falta la foto del comprobante", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        receipt_file: null,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("receipt_file");
    });

    it("rechaza archivos que no son imágenes", () => {
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        receipt_file: makeReceipt({ name: "nota.pdf", type: "application/pdf" }),
      });

      expect(result.success).toBe(false);
    });

    it("rechaza imágenes mayores a 5MB", () => {
      const bigFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        "grande.png",
        { type: "image/png" }
      );
      const result = paymentProofSchema.safeParse({
        ...validPagoMovil,
        receipt_file: bigFile,
      });

      expect(result.success).toBe(false);
    });

    it("acepta Binance con número de operación y foto", () => {
      const result = paymentProofSchema.safeParse({
        provider_code: "binance",
        reference_number: "BIN-987654321",
        receipt_file: makeReceipt(),
      });

      expect(result.success).toBe(true);
    });

    it("rechaza Binance sin foto del comprobante", () => {
      const result = paymentProofSchema.safeParse({
        provider_code: "binance",
        reference_number: "BIN-987654321",
        receipt_file: null,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("receipt_file");
    });

    it("rechaza Zelle con número de operación demasiado corto", () => {
      const result = paymentProofSchema.safeParse({
        provider_code: "zelle",
        reference_number: "12",
        receipt_file: makeReceipt(),
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("reference_number");
    });

    it("acepta Zelle con datos completos", () => {
      const result = paymentProofSchema.safeParse({
        provider_code: "zelle",
        reference_number: "ZELLE-000111",
        receipt_file: makeReceipt(),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("requiresPaymentProof", () => {
    it("exige comprobante para los tres métodos digitales", () => {
      expect(requiresPaymentProof("pago_movil")).toBe(true);
      expect(requiresPaymentProof("binance")).toBe(true);
      expect(requiresPaymentProof("zelle")).toBe(true);
    });

    it("no exige comprobante para efectivo o métodos sin código", () => {
      expect(requiresPaymentProof(null)).toBe(false);
      expect(requiresPaymentProof(undefined)).toBe(false);
      expect(requiresPaymentProof("cash")).toBe(false);
    });
  });

  describe("buildPaymentFormSchema", () => {
    const makeReceipt = () =>
      new File(["comprobante"], "comprobante.png", { type: "image/png" });

    it("para efectivo solo exige el método de pago", () => {
      const schema = buildPaymentFormSchema(null);

      expect(schema.safeParse({ payment_method_id: PAYMENT_ID }).success).toBe(
        true
      );
    });

    it("para pago móvil exige teléfono y cédula además del método", () => {
      const schema = buildPaymentFormSchema("pago_movil");

      const sinTelefono = schema.safeParse({
        payment_method_id: PAYMENT_ID,
        reference_number: "123456789",
        payer_phone: "",
        payer_id_number: "V12345678",
        receipt_file: makeReceipt(),
      });
      expect(sinTelefono.success).toBe(false);

      const completo = schema.safeParse({
        payment_method_id: PAYMENT_ID,
        reference_number: "123456789",
        payer_phone: "04141234567",
        payer_id_number: "V12345678",
        receipt_file: makeReceipt(),
      });
      expect(completo.success).toBe(true);
    });

    it("para Binance exige referencia y foto pero no teléfono ni cédula", () => {
      const schema = buildPaymentFormSchema("binance");

      const incompleto = schema.safeParse({
        payment_method_id: PAYMENT_ID,
        receipt_file: makeReceipt(),
      });
      expect(incompleto.success).toBe(false);
      expect(incompleto.error.issues[0].path).toContain("reference_number");

      const completo = schema.safeParse({
        payment_method_id: PAYMENT_ID,
        reference_number: "BIN-987654321",
        receipt_file: makeReceipt(),
      });
      expect(completo.success).toBe(true);
    });
  });
});
