# Taʼlim platformasini ishlab chiqish qoʻllanmasi

> Asos: "Oʻzbekistondagi taʼlim platformalari: ERP/CRM tahlili" maʼlumotnomasi (2026-11-17).
> Maqsad: platforma har bir bosqich oxirida **qanday holatda boʻlishi kerakligini** aniq belgilash.
> Har bir bosqich "Tayyorlik mezonlari" (Definition of Done) bajarilmaguncha yopilmaydi.

---

## 0. Asosiy gʻoya

**Mahsulot:** oʻquv markazlari uchun yagona platforma — **CRM + akademik boshqaruv + moliya + LMS + ota-ona/oʻquvchi Telegram mini-app**.

**Nima uchun:** bozorda CRM (ModMe, amoCRM) va LMS (Mohirdev, IT maktablar tizimlari) alohida-alohida yaxshi ishlaydi, lekin bitta tizimda emas. Markazlar bugun 2–4 ta vosita ishlatadi: CRM + Telegram guruh + Google Forms + Excel.

**Raqobat formulasi:**

| Qatlam | Vazifasi | Kimdan oʻrganamiz |
| --- | --- | --- |
| Kirish chiptasi (majburiy) | Lid, guruh, davomat, toʻlov, maosh | ModMe, AlfaCRM |
| Farqlovchi omil | Ota-ona mini-app, LMS, gamifikatsiya | eMaktab, Mohirdev, Mars IT School |
| Kelajakdagi ustunlik | AI, analitika, marketplace | Bozorda hali yoʻq |

**Maqsadli mijoz (1-navbat):** 50–1000 oʻquvchili xususiy oʻquv markazlari (til, IT, abituriyent tayyorlov), 1–10 filial.

---

## 1. Umumiy texnik tamoyillar (barcha bosqichlarda amal qiladi)

1. **Multi-tenant SaaS.** Har bir markaz — alohida tenant; ichida filiallar. Har bir jadvalda `tenant_id`, soʻrovlar darajasida qatʼiy ajratish (Row-Level Security yoki shunga teng mexanizm).
2. **Mobile-first.** Oʻqituvchi va administrator ishining 70%+ qismi telefonda. Har bir ekran 360px kenglikda va sekin 3G internetda ishlashi kerak.
3. **Uch tilli interfeys.** `uz-Latn` (asosiy), `uz-Cyrl`, `ru`. Barcha matnlar i18n kalitlari orqali, kodga yozilmaydi.
4. **Mahalliy formatlar.** Valyuta — soʻm (tiyinsiz butun son sifatida saqlash), telefon — `+998XXXXXXXXX`, sana — `DD.MM.YYYY`, vaqt zonasi — `Asia/Tashkent`.
5. **API-first.** Frontend va mobil ilova faqat ommaviy REST API orqali ishlaydi; keyinchalik shu API tashqi integratorlarga ochiladi. Webhook'lar birinchi kundan.
6. **RBAC + audit.** Har bir amal rol orqali tekshiriladi; moliya va baho bilan bogʻliq har bir oʻzgarish audit jurnaliga yoziladi (kim, qachon, eski qiymat, yangi qiymat).
7. **Maʼlumotlar Oʻzbekistonda.** Shaxsiy maʼlumotlar toʻgʻrisidagi qonun (OʻRQ-547) talabiga koʻra fuqarolar maʼlumotlari Oʻzbekiston hududidagi serverlarda saqlanadi. Hosting mahalliy data-markazda.
8. **Oʻchirmaslik.** Moliyaviy yozuvlar hech qachon jismonan oʻchirilmaydi — faqat bekor qilish (storno) yozuvi bilan.

---

## 2. Asosiy maʼlumotlar modeli

Barcha modullar shu modelga ulanadi. 1-bosqichdan oldin kelishib olinadi.

```
Tenant (markaz)
 └── Branch (filial)
      ├── Room (xona)
      ├── Employee (xodim: admin, menejer, oʻqituvchi, buxgalter)
      └── Group (guruh) ── Course (kurs) ── Level (daraja)
           ├── Schedule (dars kunlari/vaqti)
           ├── Lesson (aniq dars sanasi)
           │    ├── Attendance (davomat)
           │    ├── Grade (baho)
           │    └── Homework (uy vazifasi) ── Submission
           └── Enrollment (oʻquvchining guruhga aʼzoligi)
                 └── Student ── Parent (ota-ona, 1..n)

Lead (lid) ──(konversiya)──► Student
Enrollment ──► Invoice (hisob) ──► Payment (toʻlov) ──► Receipt (fiskal chek)
Employee ──► SalaryRule ──► Payroll (maosh hisoboti)
Student ──► XpTransaction / Coin / Badge (gamifikatsiya)
```

**Muhim qoidalar:**

- `Person` umumiy obyekt: bitta odam ham ota-ona, ham xodim boʻlishi mumkin (telefon raqam orqali bogʻlanadi).
- Narx `Enrollment` darajasida saqlanadi (chegirma, individual narx), `Group`da faqat standart narx.
- Davomat → maosh va qarzdorlik hisobiga avtomatik taʼsir qiladi (sozlamaga qarab).

---

## 3. Bosqichma-bosqich reja

### 1-bosqich (0–3 oy): Operatsion yadro — "ModMe pariteti"

**Maqsad:** markaz kundalik ishini toʻliq platformada yurita oladi va eski tizimdan voz kechadi.

**Platforma bu bosqich oxirida quyidagi holatda boʻlishi kerak:**

#### 1.1 Autentifikatsiya va rollar
- [ ] Telefon raqam + SMS kod orqali kirish (Eskiz.uz yoki Play Mobile).
- [ ] Rollar: Direktor, Filial administratori, Menejer, Oʻqituvchi, Buxgalter.
- [ ] Har bir rol uchun kirish huquqlari matritsasi; filial bilan cheklash.
- [ ] Administratorlar uchun 2FA.

#### 1.2 Lidlar (CRM)
- [ ] Lid kartasi: ism, telefon, manba, qiziqqan kurs, menejer, izohlar tarixi.
- [ ] Kanban voronka: Yangi → Bogʻlanildi → Sinov darsiga yozildi → Sinovga keldi → Toʻladi / Rad etdi.
- [ ] Manbalar: Instagram, Telegram, sayt formasi, qoʻngʻiroq, tavsiya.
- [ ] Sayt uchun lid formasi (embed vidjet).
- [ ] Lidni bir tugma bilan oʻquvchiga aylantirish va guruhga qoʻshish.
- [ ] Menejer uchun vazifalar va eslatmalar ("ertaga qoʻngʻiroq qilish").

#### 1.3 Akademik boshqaruv
- [ ] Kurs → daraja → guruh tuzilmasi.
- [ ] Guruh: oʻqituvchi, xona, dars kunlari, vaqt, boshlanish/tugash sanasi, standart narx.
- [ ] Jadval: oʻqituvchi va xona toʻqnashuvini avtomatik tekshirish.
- [ ] Oʻquvchini guruhga qoʻshish, boshqa guruhga koʻchirish, muzlatish, chiqarish (sababi bilan).
- [ ] **Davomat:** oʻqituvchi telefondan bir bosishda belgilaydi (keldi / kelmadi / sababli / kechikdi).
- [ ] Dars bekor qilish va qoʻshimcha dars qoʻyish.

#### 1.4 Moliya
- [ ] Toʻlov modellari: oylik abonement, dars soni boʻyicha paket, kurs uchun bir martalik.
- [ ] Chegirmalar: foiz, summa, aka-uka/opa-singil chegirmasi, individual narx.
- [ ] Avtomatik oylik hisob (invoice) yaratish.
- [ ] Toʻlov qabul qilish: naqd, terminal (Uzcard/Humo), oʻtkazma, **Click** va **Payme** (onlayn toʻlov havolasi).
- [ ] Qisman toʻlov, oldindan toʻlov (balans), qaytarish (storno).
- [ ] Qarzdorlar roʻyxati: summa, kun soni, filtrlash.
- [ ] Kassa: kunlik tushum, xarajatlar (ijara, kommunal, reklama), kassani yopish.

#### 1.5 Xodimlar va maosh
- [ ] Maosh qoidalari: belgilangan oylik, dars uchun stavka, toʻlovdan foiz, oʻquvchi boshiga.
- [ ] Davomat va toʻlovlar asosida oylik maoshni avtomatik hisoblash.
- [ ] Bonus va jarima qoʻshish; maosh hisobotini eksport qilish.

#### 1.6 Xabarnomalar
- [ ] SMS shablonlari: toʻlov eslatmasi, qarzdorlik, dars bekor qilinishi, kelmaganlik, tugʻilgan kun.
- [ ] Ommaviy SMS (guruh, filial, qarzdorlar boʻyicha).
- [ ] SMS balansi va yuborilganlar tarixi.

#### 1.7 Hisobotlar (asosiy)
- [ ] Daromad (kun / oy / filial / kurs).
- [ ] Qarzdorlik.
- [ ] Lid konversiyasi (manba boʻyicha).
- [ ] Oʻquvchilar soni dinamikasi: qoʻshilgan / ketgan.
- [ ] Excel eksport.

#### 1.8 Migratsiya
- [ ] Excel shablon orqali oʻquvchilar, guruhlar, qarzdorlikni import qilish.
- [ ] ModMe/boshqa CRM'dan eksport qilingan fayllarni qabul qilish.

**Tayyorlik mezonlari (Definition of Done):**
- 5–10 ta pilot markaz kamida 1 oy davomida kundalik ishni **faqat** platformada yuritadi.
- Oʻqituvchi davomatni 10 soniyadan kam vaqtda belgilaydi.
- Oylik hisob va maosh hisoblashda qoʻlda tuzatish 2% dan kam.
- Asosiy ekranlar 3G'da 3 soniyadan tez ochiladi.
- Kunlik zaxira nusxa va tiklash sinovdan oʻtgan.

---

### 2-bosqich (3–6 oy): Ota-ona va oʻquvchi kanali

**Maqsad:** ota-ona va oʻquvchi platformaning faol foydalanuvchisiga aylanadi; SMS xarajati va qoʻngʻiroqlar kamayadi.

**Platforma bu bosqich oxirida quyidagi holatda boʻlishi kerak:**

#### 2.1 Telegram bot + Mini App
- [ ] Telefon raqam orqali ota-ona/oʻquvchini avtomatik aniqlash (Telegram `contact` ulashish).
- [ ] Bir ota-onada bir nechta farzand — almashtirish imkoniyati.
- [ ] **Kundalik lenta:** davomat, baho, oʻqituvchi izohi (eMaktab formatiga oʻxshash — ota-onalar unga oʻrganib qolgan).
- [ ] Dars jadvali va bekor qilingan darslar.
- [ ] Balans, qarzdorlik, toʻlovlar tarixi.
- [ ] Mini-app ichida **toʻlov**: Click, Payme, **Uzum**.
- [ ] Xabarlar: markaz → ota-ona, ota-ona → administrator (chat yoki murojaat).
- [ ] Bildirishnomalar SMS oʻrniga Telegram orqali (SMS — zaxira kanal).

#### 2.2 Xodimlar uchun mobil tajriba
- [ ] Oʻqituvchi kabineti (PWA yoki mobil ilova): bugungi darslar, davomat, baho, izoh.
- [ ] Administrator uchun tezkor amallar: toʻlov qabul qilish, lid qoʻshish.

#### 2.3 Moliya kengaytmasi
- [ ] Fiskal chek (onlayn kassa talablari asosida) — har bir toʻlovga.
- [ ] Avtomatik toʻlov eslatmalari (toʻlov kunidan 3 kun oldin, kuni, 3 kun keyin).
- [ ] 1C uchun eksport.

#### 2.4 Lidlar avtomatlashtirish
- [ ] Instagram va Telegram'dan lidlar avtomatik tushishi.
- [ ] Lid uchun Telegram bot: kurslar, narxlar, sinov darsiga yozilish.

**Tayyorlik mezonlari:**
- Pilot markazlarda ota-onalarning **50%+** qismi mini-app'ga ulangan.
- Onlayn toʻlovlar ulushi umumiy toʻlovlarning **30%+** qismi.
- Markazning SMS xarajati kamida 40% ga kamaygan.

---

### 3-bosqich (6–9 oy): LMS va gamifikatsiya

**Maqsad:** platforma faqat boshqaruv emas, balki oʻqitish vositasiga aylanadi; oʻquvchi motivatsiyasi va qolish darajasi oshadi.

**Platforma bu bosqich oxirida quyidagi holatda boʻlishi kerak:**

#### 3.1 LMS (Mohirdev / IT maktablar tajribasi asosida)
- [ ] Kurs → modul → dars tuzilmasi; guruhga bogʻlangan materiallar.
- [ ] Dars materiallari: video (himoyalangan pleyer), PDF, havola, matn.
- [ ] **Testlar:** bir/koʻp javobli, moslashtirish, ochiq javob; vaqt cheklovi; avtomatik baholash.
- [ ] **Uy vazifasi oqimi:** berish → topshirish (fayl/matn/audio) → tekshirish → baho va izoh → qayta topshirish.
- [ ] Rollar kengaytmasi: **Mentor** va **Assistent** (uy vazifasini tekshiradi, lekin moliyani koʻrmaydi).
- [ ] Oʻquvchi progressi: tugatilgan darslar, test natijalari.
- [ ] Sertifikat: shablon, QR-kod orqali haqiqiyligini tekshirish.

#### 3.2 Gamifikatsiya (Mars IT School tajribasi asosida)
- [ ] **XP** — davomat, oʻz vaqtida topshirilgan uy vazifasi, test natijasi uchun.
- [ ] **Coin** — ichki valyuta; markaz oʻz qoidalarini sozlaydi.
- [ ] **Badge**lar — "30 kun ketma-ket", "100% davomat" va h.k.
- [ ] Reyting: guruh, filial, markaz boʻyicha (oy/hafta).
- [ ] **Sovgʻa doʻkoni:** coin evaziga mukofotlar; administrator tasdiqlaydi.
- [ ] Ota-onaga farzandning yutuqlari haqida bildirishnoma.

#### 3.3 Imtihonga tayyorlov
- [ ] Mock-test moduli: IELTS (Listening/Reading), CEFR, milliy sertifikat, DTM formatlari.
- [ ] Natijalar tarixi va dinamikasi.

**Tayyorlik mezonlari:**
- Pilot markazlarda uy vazifasini topshirish darajasi **60%+**.
- Gamifikatsiya yoqilgan guruhlarda oylik churn kamida 15% past.
- Oʻqituvchi bitta testni 10 daqiqadan kam vaqtda yarata oladi.

---

### 4-bosqich (9–12 oy): Analitika, AI va ekotizim

**Maqsad:** bozorda hali hech kimda yoʻq ustunliklarni yaratish va pullik oʻsishni taʼminlash.

**Platforma bu bosqich oxirida quyidagi holatda boʻlishi kerak:**

#### 4.1 Analitika
- [ ] Direktor dashboardi: daromad, oʻquvchilar, konversiya, churn, filiallar taqqoslash.
- [ ] **Churn xavfi:** davomat pasayishi, qarzdorlik, past baholar asosida "ketish xavfi bor" oʻquvchilar roʻyxati.
- [ ] Oʻqituvchi reytingi: guruhdagi qolish darajasi, natijalar, ota-ona bahosi.
- [ ] Kogort tahlili: oy boʻyicha qoʻshilgan oʻquvchilar qancha vaqt qoladi.

#### 4.2 AI yordamchi
- [ ] Mavzu boʻyicha test va topshiriqlarni generatsiya qilish (oʻqituvchi tasdiqlaydi).
- [ ] IELTS Writing / insho uchun dastlabki baholash va izoh.
- [ ] Lidlarga Telegram'da avtomatik javob (kurs, narx, jadval).
- [ ] Ota-onaga oylik hisobotni oddiy tilda tayyorlash.

#### 4.3 Ekotizim
- [ ] Ochiq REST API + hujjatlar + API kalitlari; webhook'lar.
- [ ] Integratsiyalar: IP-telefoniya (qoʻngʻiroq yozuvi lid kartasida), Google Calendar.
- [ ] **Marketplace / vitrina:** markaz oʻz onlayn kurslarini ommaga sotadi.
- [ ] Oq yorliq (white-label): markaz logotipi va domeni bilan ilova.

**Tayyorlik mezonlari:**
- 100+ pullik markaz.
- Churn xavfi signallarining aniqligi pilotda tasdiqlangan.
- AI funksiyalaridan oʻqituvchilarning 30%+ qismi har hafta foydalanadi.

---

## 4. Integratsiyalar roʻyxati

| Integratsiya | Bosqich | Maqsad |
| --- | --- | --- |
| Eskiz.uz / Play Mobile | 1 | SMS, kirish kodi |
| Click | 1 | Onlayn toʻlov |
| Payme | 1 | Onlayn toʻlov |
| Telegram Bot API + Mini Apps | 2 | Ota-ona/oʻquvchi kanali, lid bot |
| Uzum Bank (Uzum Pay) | 2 | Onlayn toʻlov |
| Fiskal chek (onlayn kassa) | 2 | Soliq talablari |
| 1C | 2 | Buxgalteriya |
| Instagram (Meta API) | 2 | Lidlar |
| IP-telefoniya | 4 | Qoʻngʻiroqlar |
| OneID, HEMIS, eMaktab | Kelajak | Davlat tizimlari, kollej/OTM segmenti |

---

## 5. Qonunchilik va xavfsizlik chek-listi

- [ ] Serverlar va zaxira nusxalar Oʻzbekiston hududida (OʻRQ-547).
- [ ] Shaxsiy maʼlumotlar bazasi qonunchilikka muvofiq roʻyxatdan oʻtkazilgan.
- [ ] Foydalanish shartlari va maxfiylik siyosati (uz, ru).
- [ ] Voyaga yetmaganlar maʼlumotlari uchun ota-ona roziligi; rasm/video uchun alohida rozilik.
- [ ] Transport (TLS) va saqlashda shifrlash.
- [ ] Kunlik zaxira nusxa, oyda bir marta tiklash sinovi.
- [ ] Audit jurnali kamida 3 yil saqlanadi.
- [ ] Toʻlov tizimlari bilan ishlashda karta maʼlumotlari platformada saqlanmaydi.
- [ ] Yurist xulosasi: fiskal chek talablari va nodavlat taʼlim litsenziyasi boʻyicha.

---

## 6. Narx modeli (taklif)

- Oylik obuna, **faol oʻquvchilar soniga** qarab bosqichli tarif (masalan: 100 gacha / 300 gacha / 1000 gacha / cheksiz).
- Bepul sinov muddati: 14–30 kun, migratsiyada yordam.
- Qoʻshimcha paketlar: LMS + gamifikatsiya, AI, white-label.
- SMS — alohida balans.

---

## 7. Har bir bosqichdan oldin tekshiriladigan savollar

1. Pilot markazlar oldingi bosqich funksiyalaridan haqiqatan har kuni foydalanyaptimi?
2. Eng koʻp soʻralgan 3 ta funksiya qaysi va ular rejada bormi?
3. Raqobatchilar (ModMe va boshqalar) oxirgi 3 oyda nima qoʻshdi?
4. Tayyorlik mezonlari raqamlar bilan oʻlchanganmi?

---

## 8. Tasdiqlanishi kerak boʻlgan maʼlumotlar

Ushbu qoʻllanma bozor tahliliga asoslangan, ayrim maʼlumotlar taxminiy. Ishga tushirishdan oldin tasdiqlang:

- [ ] Raqobatchilarning joriy narxlari va funksiyalari (demo orqali).
- [ ] OʻRQ-547 va uning soʻnggi oʻzgarishlari (lex.uz, yurist).
- [ ] Taʼlim xizmatlari uchun fiskal chek talablari.
- [ ] Click, Payme, Uzum merchant shartlari va komissiyalari.
- [ ] 10–15 ta oʻquv markazi bilan intervyu: eng ogʻriqli 3 ta muammo.
