# Bolman Register Instructions + Initial Seed Data

## 1. ملفات الحزمة

- `AI_AGENT_ADD_PASSENGER_REGISTER_INSTRUCTIONS.md`  
  تعليمات واضحة لوكيل الذكاء الصنعي لتعديل تطبيق Flutter وإضافة إنشاء حساب للراكب.

- `bolman_initial_professional_seed.sql`  
  بيانات اختبار احترافية لسوبابيز تشمل حسابات Auth، شركات، سائقين، باصات، مقاعد، رحلات، حجوزات، QR، إشعارات.

## 2. طريقة تشغيل Seed

1. شغّل أولًا ملف الباك النهائي:
   `bolman_supabase_auth_rls_complete.sql`

2. افتح:
   Supabase Dashboard → SQL Editor → New Query

3. الصق محتوى:
   `bolman_initial_professional_seed.sql`

4. Run.

## 3. أهم حساب للدخول

System Admin:

- Email: `admin@bolman.test`
- Password: `Bolman@Admin2026!`

## 4. حسابات تجريبية أخرى

- System Staff: `system.staff@bolman.test` / `Bolman@Test2026!`
- Sham Owner: `owner.sham@bolman.test` / `Bolman@Test2026!`
- Sham Staff: `staff.sham@bolman.test` / `Bolman@Test2026!`
- Driver Khaled: `driver.khaled@bolman.test` / `Bolman@Test2026!`
- Passenger Ahmad: `ahmad.passenger@bolman.test` / `Bolman@Test2026!`

## ملاحظة مهمة

إنشاء مستخدمي Supabase Auth عبر SQL مناسب للتجريب والتطوير. في الإنتاج أو الإدارة الحقيقية، الأفضل إنشاء المستخدمين الإداريين عبر Supabase Admin API أو Edge Function آمنة.
