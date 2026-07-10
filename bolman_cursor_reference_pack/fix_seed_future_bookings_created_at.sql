-- =========================================================
-- إصلاح لمرة واحدة: حجوزات الـ seed ذات created_at مستقبلي
-- =========================================================
-- المشكلة:
--   bolman_master_seed.sql يحسب created_at للحجز كالتالي:
--     departure_datetime - (1..14 يوم)
--   والرحلات المزروعة تنطلق بتواريخ مستقبلية (مثل 2026/07/24-26)،
--   فحصلت مئات الحجوزات على created_at في المستقبل.
--   قائمة الحجوزات مرتبة created_at desc، لذلك أي حجز حقيقي جديد
--   (تاريخه "الآن") يظهر تحت كل تلك الحجوزات المستقبلية.
--
-- الحل:
--   إرجاع الطوابع المستقبلية إلى الماضي مع الحفاظ على ترتيبها النسبي،
--   بحيث ينتهي أحدثها قبل 24 ساعة من الآن — فيتصدّر أي حجز حقيقي القائمة.
--
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor.
-- ملاحظة: إذا أعدت تنفيذ bolman_master_seed.sql لاحقاً فأعد تنفيذ هذا الملف بعده
-- (أو استخدم نسخة الـ seed المرقّعة التي تقصّ created_at عند now()).

with future_bookings as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as rn,
    count(*) over () as total
  from public.bookings
  where created_at > now()
)
update public.bookings b
set
  created_at = now() - interval '24 hours' - make_interval(mins => (f.total - f.rn)::int),
  updated_at = now() - interval '24 hours' - make_interval(mins => (f.total - f.rn)::int)
from future_bookings f
where b.id = f.id;

-- تحقّق: يجب أن يعيد صفراً
select count(*) as remaining_future_bookings
from public.bookings
where created_at > now();
