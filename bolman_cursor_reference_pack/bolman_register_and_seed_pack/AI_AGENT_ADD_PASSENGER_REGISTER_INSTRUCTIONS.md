# تعليمات لوكيل الذكاء الصنعي لتعديل تطبيق Flutter: إضافة إنشاء حساب للراكب

هذا الملف موجّه لأداة التطوير داخل Cursor / AI Agent لتعديل سورس كود تطبيق Bolman Mobile.

## الهدف

إضافة شاشة **إنشاء حساب جديد للراكب فقط** داخل تطبيق الموبايل.

الموقع/الداشبورد لا يحتوي إنشاء حساب عام.  
السائق وموظف الشركة وموظف النظام وصاحب الشركة يتم إنشاؤهم من الداشبورد حسب الصلاحيات، وليس من صفحة عامة.

---

## القاعدة المعتمدة

- تطبيق الموبايل يحتوي Register للراكب فقط.
- بعد إنشاء الحساب يجب أن يكون:
  - `role = passenger`
  - `status = active`
- لا تطلب الرقم الوطني في إنشاء الحساب.
- الرقم الوطني مطلوب فقط عند الحجز داخل:
  - `booking_passengers.national_id`

---

## المطلوب تعديله

### 1. إضافة شاشة Register

أنشئ شاشة:

```text
features/auth/screens/passenger_register_screen.dart
```

الحقول:

- الاسم الكامل `full_name`
- رقم الهاتف `phone`
- البريد الإلكتروني `email`
- كلمة المرور `password`
- تأكيد كلمة المرور `confirm_password`

لا تضف:
- national_id

---

### 2. تحديث Login Screen

في شاشة تسجيل الدخول أضف رابطًا:

```text
ليس لديك حساب؟ إنشاء حساب جديد
```

عند الضغط عليه ينتقل إلى شاشة التسجيل.

---

### 3. AuthCubit

أضف function:

```dart
Future<void> registerPassenger({
  required String fullName,
  required String phone,
  required String email,
  required String password,
})
```

يجب أن تستدعي Repository ولا تستدعي Supabase مباشرة من UI.

---

### 4. AuthRepository

أضف function:

```dart
Future<void> registerPassenger({
  required String fullName,
  required String phone,
  required String email,
  required String password,
})
```

وتستخدم Supabase Auth:

```dart
supabase.auth.signUp(
  email: email,
  password: password,
  data: {
    'full_name': fullName,
    'phone': phone,
    'role': 'passenger',
  },
);
```

ملاحظة:
ملف الباك يحتوي trigger على `auth.users` ينشئ صفًا تلقائيًا في `public.users`.
إذا لم يتم إنشاء الصف تلقائيًا لأي سبب، أضف fallback بعد signUp للتحقق من وجود profile، لكن لا تكرر إذا موجود.

---

### 5. التوجيه بعد التسجيل

بعد نجاح التسجيل:

- إذا كان Email Confirmation مفعّلًا:
  - اعرض رسالة: "تم إنشاء الحساب، تحقق من بريدك الإلكتروني لتفعيل الحساب."
- إذا لم يكن مفعّلًا:
  - انتقل إلى واجهة الراكب مباشرة بعد تحميل profile.

---

### 6. التحقق Validation

استخدم قواعد واضحة:

- full_name مطلوب ولا يقل عن حرفين.
- phone مطلوب.
- email بصيغة بريد صحيحة.
- password لا يقل عن 8 أحرف.
- confirm_password يجب أن يساوي password.

اعرض الأخطاء بالعربي والإنكليزي حسب اللغة الحالية.

---

### 7. الترجمة

أضف مفاتيح عربية وإنكليزية، مثل:

```json
{
  "auth.createAccount": "إنشاء حساب",
  "auth.fullName": "الاسم الكامل",
  "auth.phone": "رقم الهاتف",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.confirmPassword": "تأكيد كلمة المرور",
  "auth.alreadyHaveAccount": "لديك حساب بالفعل؟ تسجيل الدخول",
  "auth.accountCreated": "تم إنشاء الحساب بنجاح"
}
```

---

### 8. الواجهة

- استخدم الثيم البنفسجي + mint.
- ادعم Light/Dark.
- ادعم RTL/LTR.
- حافظ على تجربة استخدام بسيطة:
  - Header واضح.
  - Card يحتوي الحقول.
  - زر رئيسي.
  - Loading state.
  - Error message.
  - Success message.

---

## ممنوع

- ممنوع إضافة Register للداشبورد.
- ممنوع تسجيل السائق من التطبيق.
- ممنوع إدخال national_id في users.
- ممنوع إنشاء role مختلف عن passenger من شاشة التسجيل العامة.
- ممنوع تخزين كلمة المرور في public.users.

---

## اختبار القبول

بعد التعديل يجب أن يعمل السيناريو التالي:

1. المستخدم يفتح تطبيق الموبايل.
2. يضغط إنشاء حساب.
3. يدخل الاسم والهاتف والبريد وكلمة المرور.
4. يتم إنشاء حساب في Supabase Auth.
5. يتم إنشاء صف في `public.users` بدور `passenger`.
6. يتم إنشاء محفظة تلقائيًا برصيد 0.
7. يستطيع المستخدم تسجيل الدخول.
8. يستطيع البحث عن رحلة.
