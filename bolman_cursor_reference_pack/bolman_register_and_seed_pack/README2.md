# Bolman Fixed Seed Data

هذا ملف Seed Data معدل لحل خطأ:

`function gen_salt(unknown) does not exist`

## سبب الخطأ
في Supabase تكون دوال `crypt` و `gen_salt` غالبًا ضمن schema اسمها `extensions`، لذلك تم تعديل الملف ليستخدم:

```sql
extensions.crypt(...)
extensions.gen_salt('bf')
```

## طريقة التشغيل

1. تأكد أنك شغّلت ملف الباك النهائي أولًا:
   `bolman_supabase_auth_rls_complete.sql`

2. افتح:
   Supabase Dashboard → SQL Editor → New Query

3. الصق محتوى:
   `bolman_initial_professional_seed_FIXED.sql`

4. Run.

## الحسابات السهلة للتجريب

كل الحسابات كلمة سرها:

```text
12345678
```

الحسابات:

```text
admin@bolman.com
system@bolman.com
owner.sham@bolman.com
owner.baraka@bolman.com
staff.sham@bolman.com
staff.baraka@bolman.com
driver.khaled@bolman.com
driver.samer@bolman.com
driver.mazen@bolman.com
ahmad@bolman.com
rana@bolman.com
laith@bolman.com
nour@bolman.com
```

## ملاحظة
كلمات السر سهلة للتجريب فقط، لا تستخدمها في نسخة الإنتاج.
