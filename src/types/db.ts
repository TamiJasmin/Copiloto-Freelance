export type ClientStatus = 'prospecto' | 'activo' | 'inactivo';
export type QuoteStatus =
  | 'borrador'
  | 'enviado'
  | 'aprobado'
  | 'cobrado'
  | 'rechazado'
  | 'anulado';

export type PaymentInfo = {
  tipo?: 'cbu' | 'alias' | 'paypal' | 'mp';
  valor?: string;
  titular?: string;
};

export type QuoteItem = {
  description: string;
  amount: number;
  qty?: number;
};

export type User = {
  id: string;
  email: string;
  business_name: string | null;
  logo_url: string | null;
  payment_info: PaymentInfo;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  client_id: string;
  number: number;
  title: string | null;
  items: QuoteItem[];
  total_amount: number;
  currency: string;
  status: QuoteStatus;
  notes: string | null;
  pdf_url: string | null;
  /** Link de pago propio de este presupuesto, con el monto exacto. */
  payment_link: string | null;
  /** Identificador del link publico. Lo genera la base. */
  share_token: string;
  valid_until: string | null;
  sent_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Fila de la vista `quotes_with_client` — lo que consume el Dashboard. */
export type QuoteWithClient = Quote & {
  client_name: string;
  client_whatsapp: string | null;
};

/** Retorno del RPC `dashboard_summary`. */
export type DashboardSummary = {
  quoted: number;
  collected: number;
  pending: number;
  open_count: number;
};

/** Fila de la vista `clients_overview`: cliente + agregados de sus presupuestos. */
export type ClientOverview = Client & {
  quotes_count: number;
  total_cobrado: number;
  total_pendiente: number;
  morosos: number;
  last_quote_at: string | null;
};
