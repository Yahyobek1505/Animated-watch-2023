# Texnik topshiriq: taʼlim platformasi

> Bu fayl **qanday** qurishni belgilaydi. **Nima** qurishni `docs/TALIM_PLATFORMASI_QOLLANMA.md` belgilaydi.
> AI agent ish boshlashdan oldin `AGENTS.md`, keyin shu faylni, keyin qoʻllanmani oʻqiydi.
> Bu yerda yozilgan qaror oʻzgarsa, avval shu fayl yangilanadi, keyin kod.

---

## 1. Texnologiyalar steki

Tanlov mezoni: tez ishlab chiqish, bitta til (TypeScript), AI modellar eng yaxshi biladigan texnologiyalar, kam infratuzilma.

| Qatlam | Texnologiya | Nega |
| --- | --- | --- |
| Til | **TypeScript** (strict) | Frontend, backend, bot — bitta til |
| Monorepo | **pnpm workspaces + Turborepo** | Umumiy kod va tiplarni ulashish |
| Web ilova (admin panel + API + Mini App) | **Next.js 15 (App Router)** | Bitta loyihada UI va API |
| UI | **Tailwind CSS + shadcn/ui** | Tayyor komponentlar, tez |
| Jadval va formalar | **TanStack Table, React Hook Form + Zod** | Koʻp jadval va forma boʻladi |
| Maʼlumotlar bazasi | **PostgreSQL 16** | Ishonchli, moliya uchun tranzaksiyalar |
| ORM | **Prisma** | Sxema = hujjat, migratsiyalar, AI yaxshi biladi |
| Validatsiya | **Zod** | Bitta sxema: forma, API, tiplar |
| Navbat va fon vazifalari | **BullMQ + Redis** | SMS, invoice yaratish, eslatmalar |
| Telegram bot | **grammY** | Zamonaviy, TypeScript |
| Telegram Mini App | Next.js ichida `/tma` sahifalari + **@telegram-apps/sdk-react** | Alohida loyiha shart emas |
| i18n | **next-intl** | uz-Latn, uz-Cyrl, ru |
| Fayllar | **S3-mos saqlash (MinIO)** | Mahalliy serverda ishlaydi |
| Testlar | **Vitest** (unit/integratsiya), **Playwright** (e2e) | Tez |
| Lint/format | **ESLint + Prettier** | |
| Deploy | **Docker Compose + Caddy** (mahalliy VPS, Oʻzbekiston) | OʻRQ-547 talabi, oddiy |
| Monitoring | **Sentry** (xatolar), **pino** (loglar) | |

**Ishlatilmaydi (soddalik uchun):** mikroservislar, GraphQL, Kubernetes, alohida React Native ilova (1–3-bosqichda PWA va Mini App yetarli).

---

## 2. Loyiha tuzilmasi

```
/
├── AGENTS.md                  # AI agentlar uchun qoidalar
├── CLAUDE.md                  # AGENTS.md ga havola
├── docs/
│   ├── TALIM_PLATFORMASI_QOLLANMA.md   # NIMA quriladi (bosqichlar)
│   └── TEXNIK_TOPSHIRIQ.md             # QANDAY quriladi (shu fayl)
├── apps/
│   ├── web/                   # Next.js: admin panel, /api/v1, /tma (Mini App)
│   │   ├── app/[locale]/(admin)/...   # admin sahifalari
│   │   ├── app/[locale]/tma/...       # Telegram Mini App sahifalari
│   │   ├── app/api/v1/...             # REST API
│   │   ├── app/api/webhooks/...       # Click, Payme, Uzum, Telegram
│   │   └── messages/{uz,uz-Cyrl,ru}.json
│   └── worker/                # BullMQ worker'lar + grammY bot
├── packages/
│   ├── db/                    # prisma/schema.prisma, client, seed
│   ├── core/                  # BIZNES LOGIKA: billing, payroll, attendance (sof funksiyalar)
│   ├── shared/                # Zod sxemalar, tiplar, konstantalar, formatlash
│   └── integrations/          # click, payme, uzum, eskiz, telegram adapterlari
├── docker-compose.yml
└── .env.example
```

**Qoida:** biznes logika (pul, maosh, davomat hisob-kitobi) **faqat `packages/core`** da, UI va API'dan mustaqil, testlar bilan. API route faqat: autentifikatsiya → validatsiya → `core` chaqirish → javob.

---

## 3. Arxitektura qoidalari

### 3.1 Multi-tenancy
- Har bir biznes jadvalida `tenantId` (va kerak boʻlsa `branchId`).
- Soʻrov kontekstida `tenantId` sessiyadan olinadi va `AsyncLocalStorage` ga yoziladi.
- Prisma client extension barcha soʻrovlarga `where: { tenantId }` ni avtomatik qoʻshadi; `tenantId` siz soʻrov xato beradi.
- Har bir yangi endpoint uchun "boshqa tenant maʼlumotini koʻra olmaydi" testi majburiy.

### 3.2 Autentifikatsiya
- **Xodimlar (web):** telefon + SMS OTP (6 xonali, 5 daqiqa, 5 urinish) → `Session` jadvali, `httpOnly` cookie, 30 kun.
- **Ota-ona/oʻquvchi (Mini App):** Telegram `initData` imzosi server tomonda bot token bilan tekshiriladi; `telegramUserId` → `Person` (telefon orqali bogʻlangan).
- **Tashqi API (4-bosqich):** API kalit (`Authorization: Bearer`), xeshlangan holda saqlanadi.

### 3.3 Ruxsatlar (RBAC)
- Rollar: `OWNER`, `BRANCH_ADMIN`, `MANAGER`, `TEACHER`, `ACCOUNTANT`, keyin `MENTOR`, `ASSISTANT`.
- Ruxsatlar kod sifatida: `students.read`, `payments.create`, `payroll.approve` va h.k. — `packages/shared/permissions.ts` da yagona roʻyxat.
- Har bir API handler `requirePermission('...')` bilan boshlanadi.

### 3.4 Pul
- Barcha summalar **butun son, soʻmda** (`Int`). Kasr son (`float`) pul uchun **taqiqlanadi**.
- Pul harakatlari **faqat `LedgerEntry`** orqali; oʻchirish va tahrirlash yoʻq — xato tuzatiladi teskari yozuv (storno) bilan.
- Oʻquvchi balansi = `SUM(LedgerEntry.amount)` (toʻlov +, hisob −). Manfiy balans = qarz.
- Moliyaviy amallar Prisma `$transaction` ichida.

### 3.5 Audit
- `AuditLog`: `actorId`, `action`, `entity`, `entityId`, `before` (JSON), `after` (JSON), `createdAt`.
- Majburiy: toʻlovlar, invoice, chegirma, narx, baho, davomat tahriri, maosh, rollar.

### 3.6 API konvensiyalari
- Yoʻl: `/api/v1/<resurs>`; REST: `GET` roʻyxat/bitta, `POST` yaratish, `PATCH` yangilash, `POST /:id/<amal>` maxsus amallar (`/payments/:id/refund`).
- Roʻyxatlar: `?page=1&pageSize=20&sort=-createdAt&q=...` → `{ data: [], total, page, pageSize }`.
- Xato formati: `{ error: { code: "VALIDATION_ERROR", message: "...", details?: {} } }`; HTTP kodlari: 400, 401, 403, 404, 409, 422, 500.
- Sana/vaqt: API'da ISO 8601 UTC; koʻrsatishda `Asia/Tashkent`.
- Har bir so'rov va javob Zod sxemasi `packages/shared/schemas` da; OpenAPI shu sxemalardan generatsiya qilinadi (`zod-to-openapi`).

### 3.7 Fon vazifalari (BullMQ)
| Vazifa | Jadval | Tavsif |
| --- | --- | --- |
| `generate-lessons` | har kuni 02:00 | `Schedule` asosida 30 kun oldinga `Lesson` yaratadi |
| `generate-invoices` | har kuni 03:00 | billing kuni kelgan enrollmentlar uchun hisob |
| `payment-reminders` | har kuni 10:00 | to'lovdan 3 kun oldin, kuni, 3 kun keyin |
| `send-notification` | navbat | Telegram → muvaffaqiyatsiz bo'lsa SMS |
| `absence-alert` | davomat saqlanganda | kelmaganlik haqida ota-onaga |

Barcha vazifalar **idempotent** (qayta ishga tushsa ikki marta hisob yaratmaydi — unique kalitlar orqali).

---

## 4. Maʼlumotlar bazasi sxemasi (Prisma, 1–2-bosqich)

> Bu boshlangʻich sxema. Yangi model qoʻshilsa, shu boʻlim yangilanadi.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// ---------- Tashkilot ----------
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  settings    Json     // TenantSettings (5-bo'lim)
  createdAt   DateTime @default(now())
  branches    Branch[]
}

model Branch {
  id        String  @id @default(cuid())
  tenantId  String
  name      String
  address   String?
  phone     String?
  isActive  Boolean @default(true)
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  rooms     Room[]
  @@index([tenantId])
}

model Room {
  id        String @id @default(cuid())
  tenantId  String
  branchId  String
  name      String
  capacity  Int?
  branch    Branch @relation(fields: [branchId], references: [id])
  @@index([tenantId])
}

// ---------- Odamlar ----------
model Person {
  id             String    @id @default(cuid())
  tenantId       String
  firstName      String
  lastName       String?
  phone          String    // +998XXXXXXXXX
  birthDate      DateTime?
  gender         Gender?
  telegramUserId BigInt?
  createdAt      DateTime  @default(now())
  employee       Employee?
  student        Student?
  parentLinks    StudentParent[] @relation("ParentLinks")
  @@unique([tenantId, phone])
  @@index([tenantId])
}

model Employee {
  id        String   @id @default(cuid())
  tenantId  String
  personId  String   @unique
  roles     Role[]
  branchIds String[] // bo'sh = barcha filiallar
  isActive  Boolean  @default(true)
  person    Person   @relation(fields: [personId], references: [id])
  salaryRules SalaryRule[]
  @@index([tenantId])
}

model Student {
  id        String   @id @default(cuid())
  tenantId  String
  personId  String   @unique
  branchId  String
  status    StudentStatus @default(ACTIVE)
  source    LeadSource?
  note      String?
  person    Person   @relation(fields: [personId], references: [id])
  parents   StudentParent[]
  enrollments Enrollment[]
  ledger    LedgerEntry[]
  @@index([tenantId, branchId])
}

model StudentParent {
  studentId String
  parentId  String   // Person.id
  relation  String?  // ota, ona, ...
  isPrimary Boolean  @default(false)
  student   Student  @relation(fields: [studentId], references: [id])
  parent    Person   @relation("ParentLinks", fields: [parentId], references: [id])
  @@id([studentId, parentId])
}

// ---------- CRM ----------
model Lead {
  id          String     @id @default(cuid())
  tenantId    String
  branchId    String?
  name        String
  phone       String
  source      LeadSource
  status      LeadStatus @default(NEW)
  courseId    String?
  managerId   String?    // Employee.id
  trialLessonId String?
  lostReason  String?
  studentId   String?    // konversiyadan keyin
  createdAt   DateTime   @default(now())
  activities  LeadActivity[]
  @@index([tenantId, status])
}

model LeadActivity {
  id        String   @id @default(cuid())
  tenantId  String
  leadId    String
  authorId  String
  type      String   // NOTE, CALL, STATUS_CHANGE, TASK
  text      String?
  dueAt     DateTime?
  doneAt    DateTime?
  createdAt DateTime @default(now())
  lead      Lead     @relation(fields: [leadId], references: [id])
  @@index([tenantId, leadId])
}

// ---------- Akademik ----------
model Course {
  id        String  @id @default(cuid())
  tenantId  String
  name      String
  levels    Level[]
  @@index([tenantId])
}

model Level {
  id        String @id @default(cuid())
  tenantId  String
  courseId  String
  name      String
  order     Int
  course    Course @relation(fields: [courseId], references: [id])
}

model Group {
  id            String      @id @default(cuid())
  tenantId      String
  branchId      String
  courseId      String
  levelId       String?
  name          String
  teacherId     String      // Employee.id
  roomId        String?
  billingType   BillingType
  price         Int         // standart narx (oylik / dars / paket)
  packageLessons Int?       // PACKAGE uchun
  startDate     DateTime
  endDate       DateTime?
  status        GroupStatus @default(ACTIVE)
  schedules     Schedule[]
  lessons       Lesson[]
  enrollments   Enrollment[]
  @@index([tenantId, branchId])
}

model Schedule {
  id        String @id @default(cuid())
  tenantId  String
  groupId   String
  weekday   Int    // 1=Dushanba ... 7=Yakshanba
  startTime String // "14:00"
  endTime   String // "15:30"
  group     Group  @relation(fields: [groupId], references: [id])
}

model Lesson {
  id         String       @id @default(cuid())
  tenantId   String
  groupId    String
  date       DateTime     @db.Date
  startTime  String
  endTime    String
  teacherId  String       // almashtirilgan bo'lsa boshqa
  roomId     String?
  status     LessonStatus @default(SCHEDULED)
  topic      String?
  group      Group        @relation(fields: [groupId], references: [id])
  attendance Attendance[]
  @@unique([groupId, date, startTime])
  @@index([tenantId, date])
}

model Enrollment {
  id          String           @id @default(cuid())
  tenantId    String
  studentId   String
  groupId     String
  status      EnrollmentStatus @default(ACTIVE)
  startDate   DateTime         @db.Date
  endDate     DateTime?        @db.Date
  customPrice Int?             // individual narx (chegirmadan ustun)
  discountPercent Int?         // 0..100
  discountAmount  Int?         // soʻm
  lessonsLeft Int?             // PACKAGE uchun
  frozenFrom  DateTime?        @db.Date
  frozenUntil DateTime?        @db.Date
  leaveReason String?
  student     Student          @relation(fields: [studentId], references: [id])
  group       Group            @relation(fields: [groupId], references: [id])
  @@index([tenantId, groupId])
  @@index([tenantId, studentId])
}

model Attendance {
  id        String           @id @default(cuid())
  tenantId  String
  lessonId  String
  studentId String
  status    AttendanceStatus
  grade     Int?             // 1..5 yoki 0..100 (tenant sozlamasi)
  comment   String?
  markedBy  String
  markedAt  DateTime         @default(now())
  lesson    Lesson           @relation(fields: [lessonId], references: [id])
  @@unique([lessonId, studentId])
}

// ---------- Moliya ----------
model Invoice {
  id           String        @id @default(cuid())
  tenantId     String
  studentId    String
  enrollmentId String
  periodStart  DateTime      @db.Date
  periodEnd    DateTime      @db.Date
  baseAmount   Int
  discount     Int           @default(0)
  amount       Int           // baseAmount - discount
  status       InvoiceStatus @default(OPEN)
  createdAt    DateTime      @default(now())
  @@unique([enrollmentId, periodStart]) // idempotentlik
  @@index([tenantId, studentId])
}

model Payment {
  id          String        @id @default(cuid())
  tenantId    String
  branchId    String
  studentId   String
  amount      Int           // har doim musbat
  method      PaymentMethod
  status      PaymentStatus @default(COMPLETED)
  provider    String?       // click | payme | uzum
  providerTxId String?
  refundOfId  String?       // qaytarish bo'lsa asl to'lov
  receivedBy  String?       // Employee.id (naqd/terminal)
  fiscalReceiptUrl String?
  note        String?
  createdAt   DateTime      @default(now())
  @@unique([provider, providerTxId])
  @@index([tenantId, studentId])
}

model LedgerEntry {
  id         String     @id @default(cuid())
  tenantId   String
  studentId  String
  amount     Int        // + to'lov, − hisob
  type       LedgerType
  invoiceId  String?
  paymentId  String?
  reason     String?
  createdBy  String?
  createdAt  DateTime   @default(now())
  student    Student    @relation(fields: [studentId], references: [id])
  @@index([tenantId, studentId])
}

model Expense {
  id        String   @id @default(cuid())
  tenantId  String
  branchId  String
  category  String   // ijara, kommunal, reklama, ...
  amount    Int
  date      DateTime @db.Date
  note      String?
  createdBy String
  @@index([tenantId, branchId, date])
}

// ---------- Maosh ----------
model SalaryRule {
  id         String         @id @default(cuid())
  tenantId   String
  employeeId String
  type       SalaryRuleType
  value      Int            // FIXED: so'm/oy, PER_LESSON: so'm, PERCENT: foiz*100 (25% = 2500), PER_STUDENT: so'm
  groupId    String?        // faqat shu guruh uchun (bo'sh = hammasi)
  validFrom  DateTime       @db.Date
  validTo    DateTime?      @db.Date
  employee   Employee       @relation(fields: [employeeId], references: [id])
}

model Payroll {
  id         String        @id @default(cuid())
  tenantId   String
  employeeId String
  month      String        // "2026-11"
  lines      Json          // hisob tafsiloti (qoida -> summa)
  bonus      Int           @default(0)
  penalty    Int           @default(0)
  total      Int
  status     PayrollStatus @default(DRAFT)
  approvedBy String?
  paidAt     DateTime?
  @@unique([employeeId, month])
}

// ---------- Xabarlar, tizim ----------
model Notification {
  id        String   @id @default(cuid())
  tenantId  String
  personId  String
  channel   Channel
  template  String
  payload   Json
  status    String   // QUEUED, SENT, FAILED
  error     String?
  createdAt DateTime @default(now())
  @@index([tenantId, createdAt])
}

model OtpCode {
  id        String   @id @default(cuid())
  phone     String
  codeHash  String
  attempts  Int      @default(0)
  expiresAt DateTime
}

model Session {
  id         String   @id @default(cuid())
  employeeId String
  tenantId   String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String
  actorId   String?
  action    String
  entity    String
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())
  @@index([tenantId, entity, entityId])
}

// ---------- Enum'lar ----------
enum Gender { MALE FEMALE }
enum Role { OWNER BRANCH_ADMIN MANAGER TEACHER ACCOUNTANT MENTOR ASSISTANT }
enum StudentStatus { ACTIVE INACTIVE ARCHIVED }
enum LeadSource { INSTAGRAM TELEGRAM WEBSITE CALL REFERRAL WALK_IN OTHER }
enum LeadStatus { NEW CONTACTED TRIAL_BOOKED TRIAL_ATTENDED WON LOST }
enum BillingType { MONTHLY PER_LESSON PACKAGE ONE_TIME }
enum GroupStatus { PLANNED ACTIVE FINISHED ARCHIVED }
enum LessonStatus { SCHEDULED DONE CANCELLED }
enum EnrollmentStatus { TRIAL ACTIVE FROZEN LEFT FINISHED }
enum AttendanceStatus { PRESENT ABSENT EXCUSED LATE }
enum InvoiceStatus { OPEN PAID PARTIAL CANCELLED }
enum PaymentMethod { CASH CARD_TERMINAL TRANSFER CLICK PAYME UZUM }
enum PaymentStatus { PENDING COMPLETED CANCELLED REFUNDED }
enum LedgerType { CHARGE PAYMENT REFUND ADJUSTMENT CANCEL_CHARGE }
enum SalaryRuleType { FIXED PER_LESSON PERCENT_OF_PAYMENTS PER_STUDENT }
enum PayrollStatus { DRAFT APPROVED PAID }
enum Channel { TELEGRAM SMS }
```

**3-bosqichda qoʻshiladigan modellar:** `CourseModule`, `CourseLesson`, `Material`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `Homework`, `Submission`, `Certificate`, `XpTransaction`, `CoinTransaction`, `Badge`, `StudentBadge`, `RewardItem`, `RewardOrder`. Ularni qoʻshishdan oldin shu boʻlimga sxemasini yozing.

---

## 5. Tenant sozlamalari (`Tenant.settings`)

```ts
// packages/shared/tenant-settings.ts
export const TenantSettings = z.object({
  locale: z.enum(['uz', 'uz-Cyrl', 'ru']).default('uz'),
  billingDay: z.union([z.literal('ENROLLMENT_DAY'), z.number().int().min(1).max(28)]).default(1),
  prorateFirstMonth: z.boolean().default(true),
  chargeAbsentLessons: z.boolean().default(true),     // PER_LESSON/PACKAGE: kelmagan dars hisoblanadimi
  chargeExcusedLessons: z.boolean().default(false),
  maxFreezeDaysPerMonth: z.number().int().default(14),
  gradeScale: z.enum(['FIVE', 'HUNDRED']).default('FIVE'),
  reminderDaysBefore: z.number().int().default(3),
  siblingDiscountPercent: z.number().int().min(0).max(100).default(0),
});
```

---

## 6. Biznes qoidalari (eng muhim boʻlim)

Har bir qoida `packages/core` da funksiya va Vitest testi bilan amalga oshiriladi. Misollar testlarga aynan koʻchiriladi.

### 6.1 Narxni aniqlash (`core/billing/resolvePrice.ts`)
1. `enrollment.customPrice` boʻlsa — shu narx, chegirmalar qoʻllanmaydi.
2. Aks holda `group.price` dan boshlanadi.
3. `discountPercent` qoʻllanadi, keyin `discountAmount` ayiriladi.
4. Aka-uka chegirmasi (`siblingDiscountPercent`) — faqat foiz chegirmasi boʻlmasa.
5. Natija `Math.round` bilan butun soʻmga, 0 dan kam boʻlmaydi.

> Misol: narx 500 000, chegirma 10% va 20 000 → 500 000 × 0.9 − 20 000 = **430 000**.

### 6.2 Oylik hisob (MONTHLY)
- Davr: billing kunidan keyingi billing kunigacha.
- Birinchi oy (`prorateFirstMonth = true`): `narx × (qoʻshilgan kundan davr oxirigacha rejalashtirilgan darslar) / (davrdagi jami rejalashtirilgan darslar)`.
- Muzlatilgan kunlardagi darslar hisobdan chiqariladi (xuddi shu proporsiya bilan).
- Bekor qilingan (`CANCELLED`) darslar hisobdan chiqariladi.
- Guruhdan chiqqanda (`LEFT`) joriy davr qayta hisoblanadi: oʻtilmagan darslar uchun `CANCEL_CHARGE` (+) yozuvi.

> Misol: narx 600 000, oyda 12 dars, oʻquvchi 4-darsdan keyin qoʻshildi (8 dars qoldi) → 600 000 × 8 / 12 = **400 000**.

### 6.3 Dars boʻyicha (PER_LESSON)
- Hisob har bir dars davomati saqlanganda yaratiladi (`CHARGE`).
- `PRESENT`, `LATE` → har doim hisoblanadi; `ABSENT` → `chargeAbsentLessons`; `EXCUSED` → `chargeExcusedLessons`.
- Davomat oʻzgartirilsa, eski yozuvga teskari yozuv va yangisi yaratiladi.

### 6.4 Paket (PACKAGE)
- Toʻlov qilinganda `lessonsLeft += packageLessons`; hisob paket sotib olinganda bir martalik.
- Har bir hisoblanadigan davomat (6.3 qoidalari) `lessonsLeft -= 1`.
- `lessonsLeft <= 2` boʻlsa ota-onaga eslatma; `0` boʻlsa yangi paket hisobi.

### 6.5 Toʻlov va balans
- Toʻlov → `Payment` + `LedgerEntry(+amount, PAYMENT)`.
- Toʻlov eng eski ochiq hisoblardan boshlab yopadi (FIFO); qoldiq balansda qoladi (oldindan toʻlov).
- Qaytarish → yangi `Payment(refundOfId)` + `LedgerEntry(−amount, REFUND)`; asl toʻlov `REFUNDED`.
- Qarzdor: balans < 0. "Qarz kunlari" = eng eski yopilmagan hisob sanasidan beri.

### 6.6 Maosh (`core/payroll/calculate.ts`)
Oy uchun har bir qoida alohida qator (`Payroll.lines`):
- `FIXED`: oylik summa (oy toʻliq ishlanmagan boʻlsa — ish kunlari proporsiyasi).
- `PER_LESSON`: `DONE` holatidagi va shu xodim oʻtgan darslar soni × qiymat.
- `PERCENT_OF_PAYMENTS`: shu oy shu xodim guruhlaridagi oʻquvchilardan tushgan toʻlovlar (qaytarishlar ayirilgan) × foiz. Toʻlov guruhga hisob (`Invoice.enrollmentId`) orqali bogʻlanadi.
- `PER_STUDENT`: oy davomida kamida bitta `PRESENT` davomati boʻlgan noyob oʻquvchilar × qiymat.
- `total = SUM(lines) + bonus − penalty`.
- `APPROVED` dan keyin oʻzgartirib boʻlmaydi; tuzatish keyingi oyga `bonus/penalty` sifatida.

> Misol: 30% foiz, guruhlardan 10 000 000 tushum, 500 000 qaytarish → (10 000 000 − 500 000) × 0.30 = **2 850 000**.

### 6.7 Davomat
- Faqat darsning oʻqituvchisi yoki `BRANCH_ADMIN`/`OWNER` belgilaydi.
- Oʻqituvchi dars kuni va keyingi 2 kun ichida tahrir qila oladi; keyin faqat admin (audit bilan).
- Davomat saqlanganda dars `DONE` boʻladi.
- `ABSENT` → ota-onaga xabar (`absence-alert`).

### 6.8 Lid
- Holat oʻzgarishi har doim `LeadActivity(STATUS_CHANGE)` yozadi.
- `WON` → `Person` (telefon boʻyicha mavjud boʻlsa qayta ishlatiladi) + `Student` + `Enrollment`.
- `LOST` uchun `lostReason` majburiy.
- Bir xil telefon bilan ochiq lid boʻlsa — yangi lid yaratilmaydi, mavjudiga faoliyat qoʻshiladi.

### 6.9 Jadval toʻqnashuvi
- Bir oʻqituvchi yoki bir xona bir vaqtda ikki darsda boʻla olmaydi (vaqt oraliqlari kesishsa — `409 CONFLICT`).

### 6.10 Gamifikatsiya (3-bosqich, standart qiymatlar, tenant sozlaydi)
| Hodisa | XP | Coin |
| --- | --- | --- |
| Darsga keldi | 10 | 1 |
| Kechikdi | 5 | 0 |
| Uy vazifasi oʻz vaqtida | 20 | 2 |
| Test ≥ 90% | 30 | 3 |
| Oy davomida 100% davomat | 100 | 10 |

---

## 7. API endpointlari (1–2-bosqich)

| Resurs | Endpointlar |
| --- | --- |
| Auth | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/logout`, `GET /auth/me` |
| Filiallar, xonalar | `GET/POST /branches`, `PATCH /branches/:id`, `GET/POST /rooms` |
| Xodimlar | `GET/POST /employees`, `PATCH /employees/:id`, `GET/POST /employees/:id/salary-rules` |
| Lidlar | `GET/POST /leads`, `PATCH /leads/:id`, `POST /leads/:id/status`, `POST /leads/:id/activities`, `POST /leads/:id/convert` |
| Kurslar | `GET/POST /courses`, `POST /courses/:id/levels` |
| Guruhlar | `GET/POST /groups`, `PATCH /groups/:id`, `PUT /groups/:id/schedules`, `GET /groups/:id/lessons` |
| Darslar | `GET /lessons?date=&teacherId=`, `POST /lessons/:id/cancel`, `PUT /lessons/:id/attendance` |
| Oʻquvchilar | `GET/POST /students`, `GET/PATCH /students/:id`, `GET /students/:id/balance`, `GET /students/:id/ledger` |
| Enrollment | `POST /enrollments`, `POST /enrollments/:id/transfer`, `/freeze`, `/unfreeze`, `/leave` |
| Moliya | `GET /invoices`, `POST /payments`, `POST /payments/:id/refund`, `POST /payments/online-link`, `GET/POST /expenses`, `GET /cash/daily` |
| Maosh | `POST /payroll/calculate?month=`, `GET /payroll`, `POST /payroll/:id/approve`, `POST /payroll/:id/pay` |
| Xabarlar | `GET/POST /sms-templates`, `POST /notifications/broadcast`, `GET /notifications` |
| Hisobotlar | `GET /reports/revenue`, `/debtors`, `/lead-conversion`, `/students-flow`, `?format=xlsx` |
| Import | `POST /import/students` (xlsx), `GET /import/template` |
| Mini App | `POST /tma/auth`, `GET /tma/children`, `GET /tma/children/:id/feed`, `/schedule`, `/balance`, `POST /tma/pay` |
| Webhooklar | `POST /webhooks/payme`, `POST /webhooks/click/prepare`, `POST /webhooks/click/complete`, `POST /webhooks/uzum`, `POST /webhooks/telegram` |

Barcha yoʻllar `/api/v1` ostida.

---

## 8. Integratsiyalar

> **Muhim:** AI xotirasidan protokol yozmasin. Har bir integratsiya uchun rasmiy hujjat havolasi yoki matni beriladi; quyidagilar faqat yoʻnalish.

| Servis | Model | Eslatma |
| --- | --- | --- |
| **Payme** (Merchant API) | JSON-RPC webhook: `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement` | Basic auth bilan tekshirish, summa tiyinda keladi (×100), fiskal maʼlumot (MXIK kodi) talab qilinishi mumkin |
| **Click** (SHOP API) | `prepare` va `complete` webhook'lari, `sign_string` MD5 imzosi | Imzo tekshiruvi majburiy |
| **Uzum** | Rasmiy merchant hujjati boʻyicha | Hujjat olinganda shu qatorni yangilash |
| **Eskiz.uz** | REST, token orqali | SMS shablonlarini oldindan tasdiqlatish kerak boʻlishi mumkin |
| **Telegram** | grammY (bot), Mini App `initData` HMAC tekshiruvi | Bot webhook rejimida |

**Umumiy qoidalar:**
- Har bir adapter `packages/integrations/<servis>` da, interfeys: `createPaymentLink()`, `handleWebhook()`, `verifySignature()`.
- Webhook qayta kelsa ikki marta toʻlov yozilmaydi (`@@unique([provider, providerTxId])`).
- Barcha kiruvchi webhook'lar xom holatda loglanadi (maxfiy maydonlarsiz).
- Lokal ishlab chiqishda adapterlarning `mock` versiyasi.

---

## 9. UI qoidalari

- Admin panel: chap menyu (Dashboard, Lidlar, Oʻquvchilar, Guruhlar, Jadval, Davomat, Moliya, Maosh, Hisobotlar, Sozlamalar), yuqorida filial tanlash.
- Har bir roʻyxat sahifasi: qidiruv, filtrlar, jadval, sahifalash, Excel eksport.
- Oʻqituvchi ekrani (mobil): "Bugungi darslar" → dars → oʻquvchilar roʻyxati, har birida 4 tugma (Keldi / Kelmadi / Sababli / Kechikdi) → "Saqlash". Maqsad: 10 soniya.
- Summalar formati: `1 250 000 soʻm` (boʻshliq bilan guruhlash).
- Barcha matnlar `messages/*.json` da; kodda matn yozilmaydi.
- Boʻsh holat, yuklanish va xato holatlari har bir sahifada boʻladi.

---

## 10. Sifat talablari

- TypeScript `strict`, `any` taqiqlangan.
- `packages/core` uchun test qamrovi ≥ 90%; 6-boʻlimdagi har bir misol test sifatida mavjud.
- Har bir API endpoint uchun: muvaffaqiyatli holat, validatsiya xatosi, ruxsat yoʻq, boshqa tenant testlari.
- Asosiy e2e oqimlar (Playwright): kirish → lid yaratish → oʻquvchiga aylantirish → guruhga qoʻshish → davomat → toʻlov → balans.
- CI: `pnpm lint && pnpm typecheck && pnpm test` har bir commit'da.
- Seed: `pnpm db:seed` — 1 tenant, 2 filial, 5 oʻqituvchi, 10 guruh, 150 oʻquvchi, 3 oylik tarix.

---

## 11. Ishlab chiqish tartibi (vazifalar ketma-ketligi)

Har bir vazifa alohida AI sessiyasida bajariladi. Har biri tugagach: testlar oʻtadi, `AGENTS.md` dagi "Holat" boʻlimi yangilanadi, commit.

**1-bosqich:**
1. Monorepo, Docker Compose (Postgres, Redis, MinIO), lint, CI, `.env.example`.
2. Prisma sxema (4-boʻlim), migratsiya, tenant-scoped Prisma extension, seed.
3. Auth (OTP + sessiya), RBAC, admin panel karkasi, i18n.
4. Filiallar, xonalar, xodimlar.
5. Kurslar, guruhlar, jadval, `generate-lessons` vazifasi, toʻqnashuv tekshiruvi.
6. Oʻquvchilar, ota-onalar, enrollment (koʻchirish, muzlatish, chiqish).
7. Davomat (oʻqituvchining mobil ekrani).
8. `core/billing` (6.1–6.5) + testlar.
9. Hisoblar, toʻlovlar, balans, qarzdorlar, kassa, xarajatlar.
10. Click va Payme integratsiyasi.
11. Lidlar (Kanban, faoliyatlar, konversiya, sayt vidjeti).
12. `core/payroll` (6.6) + maosh sahifalari.
13. SMS (Eskiz), shablonlar, eslatmalar navbati.
14. Hisobotlar va Excel eksport.
15. Excel import.

**2-bosqich:** Telegram bot → Mini App auth → kundalik lenta → Mini App toʻlov → Uzum → fiskal chek → Instagram/Telegram lidlar → 1C eksport.

**3–4-bosqich:** qoʻllanmadagi tartibda; har biridan oldin 4-boʻlimga sxema va 6-boʻlimga qoidalar qoʻshiladi.
