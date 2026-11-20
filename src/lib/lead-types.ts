/** Client-side shapes for lead payloads returned by the API. */

export interface LeadContact {
  id: string;
  name: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  source: string;
  tags: string[];
  notes: string | null;
}

export interface LeadPlot {
  id: string;
  title: string;
  status: string;
  priceKes: number | null;
  sizePreset: string;
}

export interface LeadSale {
  id: string;
  titleStatus: string;
  agreedPriceKes: number;
}

export interface LeadActivity {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  stage: string;
  index: number;
  source: string;
  budgetMinKes: number | null;
  budgetMaxKes: number | null;
  lostReason: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  saleId: string | null;
  contact: LeadContact;
  plot?: LeadPlot | null;
  sale?: LeadSale | null;
  activities?: LeadActivity[];
}

export interface PlotOption {
  id: string;
  title: string;
  status: string;
  priceKes: number | null;
}
