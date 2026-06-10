# Bolman Web Dashboard

لوحة ويب احترافية لمشروع **بولمان للنقل بين المحافظات** مبنية على:

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + RPC
- TanStack Query لإدارة بيانات السيرفر
- Zustand لإدارة اللغة والثيم وحالة الواجهة
- Firebase FCM placeholder للإشعارات
- عربي/إنكليزي + RTL/LTR
- Light/Dark mode
- هوية بنفسجي + Mint Green

## التشغيل

```bash
npm install
cp .env.example .env
npm run dev
```

ضع قيم Supabase و Firebase داخل `.env`.

## المتطلبات السابقة

1. شغّل ملف قاعدة البيانات المعتمد: `bolman_supabase_auth_rls_complete.sql` في Supabase SQL Editor.
2. أنشئ مستخدمين عبر Supabase Auth أو Edge Function `admin-create-user`.
3. فعّل Edge Functions إن احتجت إنشاء مستخدمين من الداشبورد:
   - `supabase/functions/admin-create-user`
   - `supabase/functions/send-trip-notification`

## ملاحظات مهمة

- لا يتم تخزين كلمة المرور في `public.users`; Supabase Auth هو المصدر الرسمي للحسابات.
- العمليات الحساسة مثل الحجز، المقاعد، QR تعتمد على RPC Functions:
  - `get_seats_status`
  - `lock_seats`
  - `confirm_wallet_booking`
  - `confirm_office_cash_booking`
  - `scan_ticket_qr`
- إنشاء مستخدمين آخرين من الداشبورد يحتاج Edge Function وسيرفس رول، ولا يجب تنفيذ ذلك مباشرة من المتصفح بمفتاح service role.
- هذه النسخة تشمل كل الشاشات الأساسية والربط الرئيسي، ويمكن تطوير التفاصيل الدقيقة حسب متطلبات العرض النهائي.

## بنية المشروع

- `services/`: كل الاتصال مع Supabase و RPC.
- `hooks/`: TanStack Query hooks.
- `features/system`: صفحات داشبورد النظام.
- `features/company`: صفحات داشبورد الشركة.
- `components/ui`: عناصر واجهة مشتركة.
- `stores/useUiStore`: اللغة، الثيم، وحالة القائمة.
