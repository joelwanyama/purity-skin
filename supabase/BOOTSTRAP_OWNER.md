# First owner account — manual, one-time provisioning

Owner access is **not self-service**. Do not enable customer or public account creation for the owner workspace.

1. In Supabase **Authentication → Settings / User Signups**, disable public sign-ups. Invite the real business owner from the Supabase dashboard using the owner's correct email. Do not send an owner password to anyone or put one in this repository. Verify access to that mailbox and use the invite/reset-password flow to set a strong password.
2. Review and apply `migrations/202610280001_core.sql` to the intended Supabase project. The migration has not been run against a live project as of this build.
3. In the Supabase SQL editor, replace `REPLACE_WITH_OWNER_EMAIL` below with the exact, verified sign-in email, then run this block. It fails if the user does not exist or another public store is already provisioned.

```sql
do $$
declare
  owner_email text := lower('REPLACE_WITH_OWNER_EMAIL');
  owner_id uuid;
begin
  if owner_email = 'replace_with_owner_email' or owner_email = '' then
    raise exception 'Replace the owner email before running this script';
  end if;

  select u.id into owner_id
  from auth.users u
  where lower(u.email) = owner_email;

  if owner_id is null then
    raise exception 'No Supabase Auth user found for the supplied owner email';
  end if;

  if exists (
    select 1 from public.business_settings bs
    where bs.is_store_owner = true and bs.user_id <> owner_id
  ) then
    raise exception 'A different store owner is already configured; stop and review before proceeding';
  end if;

  insert into public.profiles(id, business_name)
  values (owner_id, 'PURITY SKIN')
  on conflict (id) do update set business_name = excluded.business_name;

  insert into public.business_settings(user_id, business_name, whatsapp_number, currency, is_store_owner)
  values (owner_id, 'PURITY SKIN', '256757377624', 'UGX', true)
  on conflict (user_id) do update
    set business_name = excluded.business_name,
        whatsapp_number = excluded.whatsapp_number,
        currency = excluded.currency,
        is_store_owner = true;
end $$;
```

The WhatsApp number comes from the legacy offline app and public account materials; confirm it is still the business's preferred contact before launch. This bootstrap SQL runs with elevated database privileges in the Supabase SQL editor. Do not expose any service-role key to the browser, commit it, or paste it into chat.

After provisioning, test owner login, password recovery, product RLS, stock adjustment, sale/cancellation transactions and the anonymous catalog using a separate non-owner test account/project. Keep the legacy offline app and its JSON backup untouched until a reviewed migration has been completed and reconciled.
