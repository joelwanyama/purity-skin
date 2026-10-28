import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const db = new PGlite({ extensions: { pgcrypto } })
const ownerId = '11111111-1111-4111-8111-111111111111'
const outsiderId = '22222222-2222-4222-8222-222222222222'

async function scalar(sql, params = []) {
  const result = await db.query(sql, params)
  return result.rows[0] ? Object.values(result.rows[0])[0] : null
}
async function expectDenied(action, label) {
  await assert.rejects(action, undefined, `${label} must be denied`)
  console.log(`✓ denied: ${label}`)
}
async function setSubject(id) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
}

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique);
    create schema storage;
    create table storage.buckets(id text primary key,name text not null,"public" boolean not null,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null);
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select case when pg_catalog.strpos($1,'/')>0 then array[pg_catalog.split_part($1,'/',1)] else array[]::text[] end
    $$;
    grant usage on schema storage to anon, authenticated;
    grant execute on function storage.foldername(text) to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users(id,email) values
      ('${ownerId}','owner@example.test'), ('${outsiderId}','outsider@example.test');
  `)

  const migration = await readFile(new URL('../supabase/migrations/202610280001_core.sql', import.meta.url), 'utf8')
  await db.exec(migration)
  console.log('✓ migration executes on embedded PostgreSQL')

  await db.query(`insert into public.profiles(id,business_name) values ($1,'PURITY SKIN')`, [ownerId])
  await db.query(`insert into public.business_settings(user_id,business_name,whatsapp_number,is_store_owner) values ($1,'PURITY SKIN','256757377624',true)`, [ownerId])

  await db.query('set role authenticated')
  await setSubject(ownerId)
  const created = await db.query(`insert into public.products(user_id,name,price_ugx,cost_ugx,is_published)
    values ($1,'Integration test product',10000,4000,true) returning id`, [ownerId])
  const productId = created.rows[0].id
  const imagePath = 'products/33333333-3333-4333-8333-333333333333.webp'
  await db.query(`insert into storage.objects(bucket_id,name) values ('catalog',$1)`, [imagePath])
  await db.query(`update public.products set image_path=$2 where id=$1`, [productId, imagePath])
  await db.query(`select public.adjust_stock($1,10,'Opening count')`, [productId])
  assert.equal(Number(await scalar('select stock_on_hand from public.products where id=$1', [productId])), 10)
  console.log('✓ owner can add a product, upload a scoped catalog image and adjust stock through the ledger RPC')

  await expectDenied(() => db.query(`update public.products set stock_on_hand=999 where id=$1`, [productId]), 'direct stock update')
  await expectDenied(() => db.query(`insert into public.inventory_movements(user_id,product_id,quantity_delta,reason) values ($1,$2,3,'forged')`, [ownerId, productId]), 'direct inventory-ledger insert')
  await expectDenied(() => db.query(`insert into public.orders(user_id,customer_name,total_ugx) values ($1,'Forged',1)`, [ownerId]), 'direct order insert')
  await expectDenied(() => db.query(`insert into public.business_settings(user_id,is_store_owner) values ($1,true)`, [outsiderId]), 'self-service store-owner claim')
  await expectDenied(() => db.query(`insert into storage.objects(bucket_id,name) values ('catalog',$1)`, ['private/44444444-4444-4444-8444-444444444444.jpg']), 'cross-owner catalog-image upload')

  const orderResult = await db.query(`select public.create_sale_order(null,'Test customer',null,'mobile_money','pending',$1::jsonb) as id`, [JSON.stringify([{ product_id: productId, quantity: 2 }])])
  const orderId = orderResult.rows[0].id
  assert.equal(Number(await scalar('select stock_on_hand from public.products where id=$1', [productId])), 8)
  assert.equal(Number(await scalar('select total_ugx from public.orders where id=$1', [orderId])), 20000)
  console.log('✓ sale records items, total and stock movement transactionally')

  await expectDenied(
    () => db.query(`select public.create_sale_order(null,'Oversell',null,'cash','pending',$1::jsonb)`, [JSON.stringify([{ product_id: productId, quantity: 5 }, { product_id: productId, quantity: 4 }])]),
    'combined duplicate-line oversell'
  )
  assert.equal(Number(await scalar('select stock_on_hand from public.products where id=$1', [productId])), 8)
  assert.equal(Number(await scalar('select count(*) from public.orders')), 1)
  console.log('✓ failed oversell rolls the whole order back')

  await expectDenied(() => db.query(`select public.set_order_status($1,'fulfilled','skip payment')`, [orderId]), 'pending-to-fulfilled transition')
  await db.query(`select public.set_order_status($1,'cancelled','Customer changed their mind')`, [orderId])
  assert.equal(Number(await scalar('select stock_on_hand from public.products where id=$1', [productId])), 10)
  assert.equal(Number(await scalar(`select count(*) from public.order_status_events where order_id=$1`, [orderId])), 2)
  await expectDenied(() => db.query(`select public.set_order_status($1,'cancelled','repeat')`, [orderId]), 'duplicate cancellation')
  const paidResult = await db.query(`select public.create_sale_order(null,'Paid test',null,'cash','paid',$1::jsonb) as id`, [JSON.stringify([{ product_id: productId, quantity: 1 }])])
  const paidOrderId = paidResult.rows[0].id
  await db.query(`select public.set_order_status($1,'fulfilled','Handed to customer')`, [paidOrderId])
  assert.equal(await scalar('select status from public.orders where id=$1', [paidOrderId]), 'fulfilled')
  assert.equal(Number(await scalar('select stock_on_hand from public.products where id=$1', [productId])), 9)
  await expectDenied(() => db.query(`select public.set_order_status($1,'cancelled','after fulfilment')`, [paidOrderId]), 'cancellation after fulfilment')
  console.log('✓ cancellation returns stock once; paid-to-fulfilled works and closed orders cannot be cancelled')

  await setSubject(outsiderId)
  assert.equal(Number(await scalar('select count(*) from public.products')), 0)
  assert.equal(Number(await scalar('select count(*) from public.orders')), 0)
  assert.equal(Number(await scalar('select count(*) from public.customers')), 0)
  await expectDenied(() => db.query(`select public.adjust_stock($1,1,'cross-owner')`, [productId]), 'cross-owner stock adjustment')
  await expectDenied(() => db.query(`insert into storage.objects(bucket_id,name) values ('catalog',$1)`, ['products/55555555-5555-4555-8555-555555555555.jpg']), 'non-owner catalog-image upload')
  console.log('✓ authenticated non-owner cannot read owner rows or adjust owner stock')

  await db.query('reset role')
  await db.query('set role anon')
  await setSubject('')
  const publicRows = await db.query('select id,name,price_ugx from public.public_catalog')
  assert.equal(publicRows.rows.length, 1)
  assert.equal(publicRows.rows[0].name, 'Integration test product')
  assert.equal(Number(await scalar("select count(*) from storage.objects where bucket_id='catalog'")), 1)
  await expectDenied(() => db.query(`insert into storage.objects(bucket_id,name) values ('catalog',$1)`, ['products/66666666-6666-4666-8666-666666666666.png']), 'anonymous catalog-image upload')
  await expectDenied(() => db.query('select cost_ugx from public.products'), 'anonymous product-cost read')
  await expectDenied(() => db.query('select stock_on_hand from public.products'), 'anonymous stock read')
  await expectDenied(() => db.query('select public.adjust_stock($1,1,\'anon\')', [productId]), 'anonymous inventory RPC')
  assert.equal(await scalar("select has_table_privilege('authenticated','public.orders','INSERT')"), false)
  assert.equal(await scalar("select has_column_privilege('authenticated','public.products','stock_on_hand','UPDATE')"), false)
  console.log('✓ anonymous can read only published catalog fields; direct write grants are absent')

  await db.query('reset role')
  console.log('\nDatabase integration contract passed. This is embedded PostgreSQL with a mocked Supabase auth.uid(); it does not replace a live Supabase project test.')
} finally {
  await db.close()
}
