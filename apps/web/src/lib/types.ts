export type ProductType =
  | "door_leaf"
  | "frame"
  | "casing"
  | "extender"
  | "handle"
  | "hinge"
  | "lock"
  | "service";

export type ProductImage = { id: string; url: string; alt: string; sort_order: number };

export type Product = {
  id: string;
  sku: string;
  slug: string;
  type: ProductType;
  name: string;
  series: string | null;
  description: string;
  brand: string | null;
  manufacturer: string | null;
  category: string | null;
  covering: string | null;
  glass_type: string | null;
  style: string | null;
  opening_system: string | null;
  specs: Record<string, string>;
  base_price: number;
  current_price: number;
  old_price: number | null;
  popular: boolean;
  seo_title: string | null;
  seo_description: string | null;
  images: ProductImage[];
};

export type ProductList = {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
};

export type QuoteConfig = {
  product_id: string;
  size: string;
  opening: "left" | "right";
  kit: "leaf_only" | "standard_block" | "block_plus_extenders";
  wall_thickness_mm: number;
  hardware: "none" | "minimal" | "hidden_hinges";
  handle_id?: string | null;
  services: string[];
  quantity: number;
};

export type QuoteLine = {
  sku: string;
  title: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_id: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  total: number;
  config: QuoteConfig;
};

export type Cart = {
  id: string;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    config_json: QuoteConfig;
    quoted_total: number;
    label: string;
  }[];
  total: number;
};

export type SiteInfo = {
  name: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  email: string;
  city: string;
  reviews: { text: string; author: string }[];
  faq: { q: string; a: string }[];
  dadata?: boolean;
};

export type Order = {
  id: string;
  public_number: string;
  status: "new" | "in_progress" | "closed";
  customer_name: string;
  phone: string;
  address?: string;
  comment: string;
  total_snapshot: number;
  created_at: string;
  items: {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    config_json?: Record<string, unknown>;
  }[];
};
