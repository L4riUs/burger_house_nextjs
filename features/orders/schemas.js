import { z } from 'zod';
import { isValidTransition } from './state-machine';

export const orderChannelSchema = z.enum(['storefront', 'pos', 'phone']);

export const orderFulfillmentSchema = z.enum(['dine_in', 'pickup', 'delivery']);

export const orderStatusSchema = z.enum([
  'pending', 'confirmed', 'in_kitchen', 'ready',
  'out_for_delivery', 'served', 'completed', 'cancelled'
]);

export const currencySchema = z.enum(['VES', 'USD']);

export const orderItemExtraSchema = z.object({
  extra_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const orderItemProductSchema = z.object({
  type: z.literal('product'),
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  extras: z.array(orderItemExtraSchema).default([]),
});

export const orderItemComboSchema = z.object({
  type: z.literal('combo'),
  combo_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
});

export const orderItemSchema = z.union([orderItemProductSchema, orderItemComboSchema]);

export const guestCustomerSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  address: z.string().optional().nullable(),
});

export const createOrderSchema = z.object({
  fulfillment_type: orderFulfillmentSchema,
  table_id: z.string().uuid().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  currency: currencySchema.default('VES'),
  exchange_rate: z.coerce.number().positive().default(1),
  cart_items: z.array(orderItemSchema).min(1, 'El carrito no puede estar vacío'),
  customer_type: z.enum(['guest', 'authenticated']),
  profile_id: z.string().uuid().optional().nullable(),
  guest_customer: guestCustomerSchema.optional().nullable(),
  payment_method_id: z.string().uuid(),
  payment_proof: z.object({
    provider_code: z.enum(['pago_movil', 'binance', 'zelle']),
    reference_number: z.string().min(1),
    payer_phone: z.string().nullable(),
    payer_id_number: z.string().nullable(),
  }).optional().nullable(),
  channel: orderChannelSchema.default('storefront'),
  taken_by: z.string().uuid().optional().nullable(),
  client_ref: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.fulfillment_type === 'dine_in') {
      return data.table_id !== null && data.table_id !== undefined;
    }
    return true;
  },
  {
    message: 'Debe seleccionar una mesa para dine_in',
    path: ['table_id'],
  }
).refine(
  (data) => {
    if (data.fulfillment_type === 'delivery') {
      if (data.customer_type === 'guest') {
        return data.guest_customer?.address && data.guest_customer.address.trim().length > 0;
      }
      return true;
    }
    return true;
  },
  {
    message: 'La dirección es requerida para delivery',
    path: ['delivery_address'],
  }
).refine(
  (data) => {
    if (data.customer_type === 'authenticated') {
      return data.profile_id !== null && data.profile_id !== undefined;
    }
    return true;
  },
  {
    message: 'profile_id es requerido para clientes autenticados',
    path: ['profile_id'],
  }
).refine(
  (data) => {
    if (data.channel !== 'storefront') {
      return data.taken_by !== null && data.taken_by !== undefined;
    }
    return true;
  },
  {
    message: 'taken_by es requerido para órdenes POS/teléfono',
    path: ['taken_by'],
  }
);

export const advanceOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  new_status: orderStatusSchema,
  current_status: orderStatusSchema,
}).refine(
  (data) => {
    return isValidTransition(data.current_status, data.new_status);
  },
  {
    message: 'Transición de estado no válida',
    path: ['new_status'],
  }
);

export const assignDeliverySchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
});

export const orderFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.array(orderStatusSchema).optional(),
  fulfillment_type: z.array(orderFulfillmentSchema).optional(),
  channel: z.array(orderChannelSchema).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
});

export const posOrderItemSchema = z.object({
  type: z.enum(['product', 'combo']),
  id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  extras: z.array(z.object({
    extra_id: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).default(1),
  })).default([]),
});

export const posCreateOrderSchema = z.object({
  items: z.array(posOrderItemSchema).min(1),
  fulfillment_type: orderFulfillmentSchema,
  table_id: z.string().uuid().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  channel: z.enum(['pos', 'phone']),
  customer_type: z.enum(['guest', 'authenticated', 'existing']),
  profile_id: z.string().uuid().optional().nullable(),
  guest_customer: guestCustomerSchema.optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export function getOrderStatusOptions(currentStatus) {
  const { getValidTransitions } = require('./state-machine');
  return getValidTransitions(currentStatus).map(status => ({
    value: status,
    label: getStatusLabel(status),
  }));
}

export const ORDER_CHANNEL_LABELS = {
  storefront: 'Tienda Online',
  pos: 'Mostrador (POS)',
  phone: 'Teléfono/WhatsApp',
};

export const FULFILLMENT_TYPE_LABELS = {
  dine_in: 'Comer en local',
  pickup: 'Recoger en local',
  delivery: 'Delivery',
};