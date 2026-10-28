export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Product = {
  id: string; user_id: string; name: string; category: string | null; description: string | null
  price_ugx: number | null; cost_ugx: number | null; stock_on_hand: number
  reorder_level: number; image_path: string | null; is_published: boolean
  created_at: string; updated_at: string
}
export type Customer = {
  id: string; user_id: string; full_name: string; phone: string | null; notes: string | null
  marketing_consent: boolean; consent_note: string | null; consent_recorded_at: string | null; consent_withdrawn_at: string | null
  created_at: string; updated_at: string
}
export type Order = {
  id: string; user_id: string; customer_id: string | null; customer_name: string
  customer_phone: string | null; status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  payment_method: 'cash' | 'mobile_money' | 'bank' | 'other'; total_ugx: number
  notes: string | null; created_at: string
}
type OrderItem = {
  id: string; user_id: string; order_id: string; product_id: string | null; product_name: string
  quantity: number; unit_price_ugx: number; unit_cost_ugx: number | null; created_at: string
}
type Movement = {
  id: string; user_id: string; product_id: string; quantity_delta: number; reason: string
  order_id: string | null; created_at: string
}
type BusinessSettings = {
  user_id: string; business_name: string; whatsapp_number: string
  currency: 'UGX'; is_store_owner: boolean; updated_at: string
}
type Profile = { id: string; business_name: string; created_at: string }
type Expense = { id: string; user_id: string; description: string; amount_ugx: number; category: string | null; expense_date: string; created_at: string }

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Pick<Profile, 'id'> & Partial<Pick<Profile, 'business_name'>>, Partial<Profile>>
      business_settings: Table<BusinessSettings, Pick<BusinessSettings, 'user_id'> & Partial<BusinessSettings>, Partial<BusinessSettings>>
      products: Table<Product, Pick<Product, 'user_id' | 'name'> & Partial<Product>, Partial<Product>>
      customers: Table<Customer, Pick<Customer, 'user_id' | 'full_name'> & Partial<Customer>, Partial<Customer>>
      orders: Table<Order, Pick<Order, 'user_id'> & Partial<Order>, Partial<Order>>
      order_items: Table<OrderItem, Pick<OrderItem, 'user_id' | 'order_id' | 'product_name' | 'quantity' | 'unit_price_ugx'> & Partial<OrderItem>, Partial<OrderItem>>
      inventory_movements: Table<Movement, Pick<Movement, 'user_id' | 'product_id' | 'quantity_delta' | 'reason'> & Partial<Movement>, Partial<Movement>>
      expenses: Table<Expense, Pick<Expense, 'user_id' | 'description' | 'amount_ugx'> & Partial<Expense>, Partial<Expense>>
    }
    Views: {
      public_catalog: { Row: Pick<Product, 'id' | 'name' | 'category' | 'description' | 'price_ugx' | 'image_path'>; Relationships: [] }
      public_business_profile: { Row: Pick<BusinessSettings, 'business_name' | 'whatsapp_number'>; Relationships: [] }
    }
    Functions: {
      adjust_stock: { Args: { p_product_id: string; p_quantity_delta: number; p_reason: string }; Returns: undefined }
      create_sale_order: { Args: { p_customer_id: string | null; p_customer_name: string; p_customer_phone: string | null; p_payment_method: string; p_status: string; p_items: Json }; Returns: string }
      set_order_status: { Args: { p_order_id: string; p_new_status: string; p_reason: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
