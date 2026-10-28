-- PURITY SKIN Core 0.1.0
-- Apply only to a fresh/preview Supabase project after review. This migration has not been
-- executed against the owner's project yet. Never put a service-role key in the browser.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'PURITY SKIN',
  created_at timestamptz not null default now()
);

create table public.business_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'PURITY SKIN',
  whatsapp_number text not null default '256757377624',
  currency text not null default 'UGX' check (currency='UGX'),
  is_store_owner boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index business_settings_one_public_store on public.business_settings(is_store_owner) where is_store_owner=true;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text check (category is null or length(category)<=60),
  description text check (description is null or length(description)<=450),
  price_ugx integer check (price_ugx is null or price_ugx>=0),
  cost_ugx integer check (cost_ugx is null or cost_ugx>=0),
  stock_on_hand integer not null default 0 check (stock_on_hand>=0),
  reorder_level integer not null default 5 check (reorder_level>=0),
  image_path text check (image_path is null or image_path ~ '^products/[0-9a-fA-F-]{36}[.](jpg|png|webp)$'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  phone text check (phone is null or length(phone)<=30),
  notes text check (notes is null or length(notes)<=240),
  marketing_consent boolean not null default false,
  consent_note text,
  consent_recorded_at timestamptz,
  consent_withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not marketing_consent or (consent_recorded_at is not null and consent_note is not null))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default 'Walk-in',
  customer_phone text,
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled')),
  payment_method text not null default 'mobile_money' check (payment_method in ('cash','mobile_money','bank','other')),
  total_ugx bigint not null default 0 check (total_ugx>=0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity>0),
  unit_price_ugx integer not null check (unit_price_ugx>=0),
  unit_cost_ugx integer check (unit_cost_ugx is null or unit_cost_ugx>=0),
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta<>0),
  reason text not null check (length(trim(reason)) between 1 and 120),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('pending','paid','fulfilled','cancelled')),
  reason text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 160),
  amount_ugx integer not null check (amount_ugx>=0),
  category text,
  expense_date date not null default (now() at time zone 'Africa/Kampala')::date,
  created_at timestamptz not null default now()
);

create index products_user_id_idx on public.products(user_id);
create index orders_user_created_idx on public.orders(user_id,created_at desc);
create index orders_user_status_idx on public.orders(user_id,status,created_at desc);
create index customers_user_id_idx on public.customers(user_id);
create index order_items_user_order_idx on public.order_items(user_id,order_id);
create index inventory_user_product_created_idx on public.inventory_movements(user_id,product_id,created_at desc);
create index status_events_user_order_idx on public.order_status_events(user_id,order_id,created_at desc);
create index expenses_user_date_idx on public.expenses(user_id,expense_date desc);

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_status_events enable row level security;
alter table public.expenses enable row level security;

create or replace function private.public_store_owner_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select bs.user_id from public.business_settings bs where bs.is_store_owner=true limit 1
$$;
revoke all on function private.public_store_owner_id() from public,anon,authenticated;
grant execute on function private.public_store_owner_id() to anon,authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at:=pg_catalog.clock_timestamp();
  return new;
end; $$;
revoke all on function private.touch_updated_at() from public,anon,authenticated;
create trigger products_touch_updated_at before update on public.products
  for each row execute function private.touch_updated_at();
create trigger customers_touch_updated_at before update on public.customers
  for each row execute function private.touch_updated_at();
create trigger settings_touch_updated_at before update on public.business_settings
  for each row execute function private.touch_updated_at();

create policy profile_is_private on public.profiles for select to authenticated
  using (id=(select auth.uid()));
create policy settings_owner_read on public.business_settings for select to authenticated
  using (user_id=(select auth.uid()));
create policy settings_public_contact on public.business_settings for select to anon
  using (is_store_owner=true);
create policy product_owner_all on public.products for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy product_public_store_read on public.products for select to anon
  using (is_published=true and user_id=(select private.public_store_owner_id()));
create policy customer_owner_all on public.customers for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy order_owner_read on public.orders for select to authenticated
  using (user_id=(select auth.uid()));
create policy order_item_owner_read on public.order_items for select to authenticated
  using (user_id=(select auth.uid()));
create policy movement_owner_read on public.inventory_movements for select to authenticated
  using (user_id=(select auth.uid()));
create policy status_event_owner_read on public.order_status_events for select to authenticated
  using (user_id=(select auth.uid()));
create policy expense_owner_all on public.expenses for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- Remove inherited broad privileges. The browser receives only what its RLS-scoped screens need.
revoke all on public.profiles,public.business_settings,public.products,public.customers,public.orders,public.order_items,public.inventory_movements,public.order_status_events,public.expenses from anon,authenticated;
grant select on public.profiles,public.business_settings to authenticated;
grant select,insert,update on public.customers to authenticated;
grant select,insert,update on public.expenses to authenticated;
grant select,insert on public.products to authenticated;
grant update (name,category,description,price_ugx,cost_ugx,reorder_level,image_path,is_published) on public.products to authenticated;
grant select on public.orders,public.order_items,public.inventory_movements,public.order_status_events to authenticated;
-- Explicit column allow-list. Anonymous cannot select costs, counts, owners, customers or orders.
grant select (id,name,category,description,price_ugx,image_path,is_published) on public.products to anon;
grant select (business_name,whatsapp_number,is_store_owner) on public.business_settings to anon;

-- Product photos are intentionally public catalog assets; owner upload paths remain owner-scoped.
insert into storage.buckets(id,name,"public",file_size_limit,allowed_mime_types)
  values('catalog','catalog',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant execute on function storage.foldername(text) to anon,authenticated;
revoke all on storage.objects from anon,authenticated;
grant select on storage.objects to anon,authenticated;
grant insert,update,delete on storage.objects to authenticated;
create policy catalog_images_public_read on storage.objects for select to anon,authenticated
  using (bucket_id='catalog');
create policy catalog_images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id='catalog' and (storage.foldername(name))[1]='products' and exists(select 1 from public.business_settings bs where bs.user_id=(select auth.uid()) and bs.is_store_owner=true));
create policy catalog_images_owner_update on storage.objects for update to authenticated
  using (bucket_id='catalog' and (storage.foldername(name))[1]='products' and exists(select 1 from public.business_settings bs where bs.user_id=(select auth.uid()) and bs.is_store_owner=true))
  with check (bucket_id='catalog' and (storage.foldername(name))[1]='products' and exists(select 1 from public.business_settings bs where bs.user_id=(select auth.uid()) and bs.is_store_owner=true));
create policy catalog_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id='catalog' and (storage.foldername(name))[1]='products' and exists(select 1 from public.business_settings bs where bs.user_id=(select auth.uid()) and bs.is_store_owner=true));

create or replace view public.public_catalog with (security_invoker=true,security_barrier=true) as
  select p.id,p.name,p.category,p.description,p.price_ugx,p.image_path
  from public.products p where p.is_published=true and p.price_ugx is not null;
create or replace view public.public_business_profile with (security_invoker=true,security_barrier=true) as
  select business_name,whatsapp_number from public.business_settings where is_store_owner=true;
grant select on public.public_catalog,public.public_business_profile to anon,authenticated;

-- Inventory is a ledger. This private trigger is the only path that mutates product stock.
create or replace function private.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.products p
    set stock_on_hand=p.stock_on_hand+new.quantity_delta,updated_at=pg_catalog.now()
    where p.id=new.product_id and p.user_id=new.user_id and p.stock_on_hand+new.quantity_delta>=0;
  if not found then raise exception 'Stock would become negative or product is not owned by this account'; end if;
  return new;
end; $$;
revoke all on function private.apply_inventory_movement() from public,anon,authenticated;
create trigger inventory_movement_updates_stock after insert on public.inventory_movements
  for each row execute function private.apply_inventory_movement();

create or replace function public.adjust_stock(p_product_id uuid,p_quantity_delta integer,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_quantity_delta is null or p_quantity_delta=0 then raise exception 'Quantity change cannot be zero'; end if;
  insert into public.inventory_movements(user_id,product_id,quantity_delta,reason)
    values(uid,p_product_id,p_quantity_delta,coalesce(nullif(pg_catalog.btrim(p_reason),''),'Stock adjustment'));
end; $$;

create or replace function public.create_sale_order(
  p_customer_id uuid,p_customer_name text,p_customer_phone text,p_payment_method text,p_status text,p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid:=(select auth.uid()); new_order uuid; item jsonb; pid uuid; qty integer; prod public.products%rowtype; total bigint:=0;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if pg_catalog.jsonb_typeof(p_items)<>'array' or pg_catalog.jsonb_array_length(p_items)<1 or pg_catalog.jsonb_array_length(p_items)>10 then raise exception 'Add between one and ten item lines'; end if;
  if pg_catalog.octet_length(p_items::text)>4096 then raise exception 'Order line data is too large'; end if;
  if exists (select 1 from pg_catalog.jsonb_array_elements(p_items) as line(value) where (line.value->>'quantity') is null or (line.value->>'quantity')::numeric<1 or (line.value->>'quantity')::numeric>100000 or (line.value->>'quantity')::numeric<>pg_catalog.trunc((line.value->>'quantity')::numeric)) then raise exception 'Each quantity must be a whole number between 1 and 100000'; end if;
  if p_status not in ('pending','paid') then raise exception 'New orders can only be pending or paid'; end if;
  if p_payment_method not in ('cash','mobile_money','bank','other') then raise exception 'Invalid payment method'; end if;
  if length(coalesce(p_customer_name,''))>120 or length(coalesce(p_customer_phone,''))>30 then raise exception 'Customer details are too long'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers c where c.id=p_customer_id and c.user_id=uid) then raise exception 'Customer record is not available to this account'; end if;
  -- Validate and lock all distinct products in a stable order before writing anything.
  -- Aggregate duplicate cart lines so combined quantities cannot oversell stock.
  for item in
    select pg_catalog.jsonb_build_object('product_id', (element->>'product_id')::uuid, 'quantity', pg_catalog.sum((element->>'quantity')::integer)) as grouped_item
    from pg_catalog.jsonb_array_elements(p_items) as items(element)
    group by (element->>'product_id')::uuid
    order by (element->>'product_id')::uuid
  loop
    pid:=(item->>'product_id')::uuid; qty:=(item->>'quantity')::integer;
    if qty is null or qty<1 or qty>100000 then raise exception 'Quantity must be a whole number between 1 and 100000'; end if;
    select * into prod from public.products p where p.id=pid and p.user_id=uid for update;
    if not found then raise exception 'Product is not available to this account'; end if;
    if prod.price_ugx is null then raise exception 'Set a confirmed price before recording this product'; end if;
    if prod.stock_on_hand<qty then raise exception 'Not enough stock for % (available %)',prod.name,prod.stock_on_hand; end if;
    total:=total+(prod.price_ugx::bigint*qty);
  end loop;
  if total>9223372036854775807 then raise exception 'Order total is too large'; end if;
  insert into public.orders(user_id,customer_id,customer_name,customer_phone,status,payment_method,total_ugx)
    values(uid,p_customer_id,coalesce(nullif(pg_catalog.btrim(p_customer_name),''),'Walk-in'),nullif(pg_catalog.btrim(p_customer_phone),''),p_status,p_payment_method,total)
    returning id into new_order;
  -- The product rows remain locked for this transaction. Preserve each customer's original line item.
  for item in select value from pg_catalog.jsonb_array_elements(p_items) order by (value->>'product_id')::uuid loop
    pid:=(item->>'product_id')::uuid; qty:=(item->>'quantity')::integer;
    select * into prod from public.products p where p.id=pid and p.user_id=uid;
    insert into public.order_items(user_id,order_id,product_id,product_name,quantity,unit_price_ugx,unit_cost_ugx)
      values(uid,new_order,pid,prod.name,qty,prod.price_ugx,prod.cost_ugx);
    insert into public.inventory_movements(user_id,product_id,quantity_delta,reason,order_id)
      values(uid,pid,-qty,'Sale',new_order);
  end loop;
  insert into public.order_status_events(user_id,order_id,from_status,to_status,reason)
    values(uid,new_order,null,p_status,'Order recorded');
  return new_order;
end; $$;

create or replace function public.set_order_status(p_order_id uuid,p_new_status text,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=(select auth.uid()); existing public.orders%rowtype; line record;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_new_status not in ('paid','fulfilled','cancelled') then raise exception 'Invalid status change'; end if;
  select * into existing from public.orders o where o.id=p_order_id and o.user_id=uid for update;
  if not found then raise exception 'Order not found'; end if;
  if existing.status='pending' and p_new_status not in ('paid','cancelled') then raise exception 'A pending order must be paid or cancelled first'; end if;
  if existing.status='paid' and p_new_status not in ('fulfilled','cancelled') then raise exception 'A paid order must be fulfilled or cancelled'; end if;
  if existing.status not in ('pending','paid') then raise exception 'This order is already closed'; end if;
  if p_new_status='cancelled' then
    for line in select oi.product_id,oi.quantity,oi.product_name from public.order_items oi where oi.order_id=p_order_id and oi.user_id=uid and oi.product_id is not null order by oi.product_id loop
      insert into public.inventory_movements(user_id,product_id,quantity_delta,reason,order_id)
        values(uid,line.product_id,line.quantity,'Order cancellation reversal',p_order_id);
    end loop;
  end if;
  update public.orders set status=p_new_status,updated_at=pg_catalog.now() where id=p_order_id and user_id=uid;
  insert into public.order_status_events(user_id,order_id,from_status,to_status,reason)
    values(uid,p_order_id,existing.status,p_new_status,nullif(pg_catalog.btrim(p_reason),''));
end; $$;

revoke all on function public.adjust_stock(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.create_sale_order(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.set_order_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.adjust_stock(uuid,integer,text) to authenticated;
grant execute on function public.create_sale_order(uuid,text,text,text,text,jsonb) to authenticated;
grant execute on function public.set_order_status(uuid,text,text) to authenticated;
