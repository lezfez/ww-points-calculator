create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Konfigurierbare UI-Texte fuer App und Admin';
comment on column public.app_settings.key is 'Settings-Key (z.B. header_tagline, premium_price_label)';
comment on column public.app_settings.value is 'Wert der Einstellung';

insert into public.app_settings (key, value)
values
  ('header_tagline', 'Coins · PersonalPoints · SmartPoints · ProPoints'),
  ('premium_price_label', '2,99 €/Monat')
on conflict (key) do nothing;
