# AGENTS.md — AI agentlar uchun qoidalar

Bu loyiha: Oʻzbekistondagi oʻquv markazlari uchun SaaS platforma (CRM + akademik boshqaruv + moliya + LMS + ota-ona Telegram Mini App).

## Ish boshlashdan oldin oʻqing (shu tartibda)

1. **Shu fayl** — qoidalar va joriy holat.
2. `docs/TEXNIK_TOPSHIRIQ.md` — QANDAY qurish: stek, tuzilma, maʼlumotlar bazasi, biznes qoidalari, API.
3. `docs/TALIM_PLATFORMASI_QOLLANMA.md` — NIMA qurish: bosqichlar, funksiyalar, tayyorlik mezonlari.

Fayllar ziddiyatga kelsa: `TEXNIK_TOPSHIRIQ.md` ustun. Hujjatda javob yoʻq boʻlsa — **taxmin qilmang**, savol bering yoki taxminni aniq yozib, hujjatga qoʻshishni taklif qiling.

## Qatʼiy qoidalar

1. **Stekni oʻzgartirmang.** TypeScript, Next.js, Prisma, PostgreSQL, BullMQ, grammY, Tailwind + shadcn/ui. Yangi kutubxona qoʻshishdan oldin sababini yozing.
2. **Biznes logika faqat `packages/core` da.** API route va UI'da hisob-kitob yozilmaydi.
3. **Pul — faqat butun son (soʻm).** `float` taqiqlangan. Pul harakati faqat `LedgerEntry` orqali. Moliyaviy yozuvlar oʻchirilmaydi va tahrirlanmaydi — faqat storno.
4. **Har bir soʻrov tenant bilan cheklangan.** `tenantId` siz maʼlumot olish yoʻq. Har bir yangi endpoint uchun "boshqa tenant" testi.
5. **Har bir API handler:** `requirePermission()` → Zod validatsiya → `core` funksiya → javob. Xato formati texnik topshiriqdagidek.
6. **Matnlar kodda yozilmaydi** — `messages/{uz,uz-Cyrl,ru}.json`. Uch tilda ham kalit qoʻshing (tarjima noaniq boʻlsa `TODO:` belgisi bilan).
7. **Integratsiya protokollarini xotiradan yozmang.** Rasmiy hujjat berilmagan boʻlsa, adapter interfeysi + mock yozing va hujjat soʻrang.
8. **Sxema oʻzgarsa** — avval `docs/TEXNIK_TOPSHIRIQ.md` 4-boʻlimi, keyin `schema.prisma` va migratsiya.
9. **Testsiz biznes logika qabul qilinmaydi.** Texnik topshiriq 6-boʻlimidagi misollar testlarga aynan koʻchiriladi.
10. **Kichik qadamlar.** Bitta vazifa = bitta modul. Soʻralmagan modulni qurmang.

## Vazifani tugatish tartibi

1. `pnpm lint && pnpm typecheck && pnpm test` oʻtadi.
2. Qoʻllanmadagi tegishli chek-list bandlari bajarilganini tekshiring.
3. Quyidagi **Holat** boʻlimini yangilang.
4. Commit xabari: `feat(<modul>): ...`, `fix(<modul>): ...`, `docs: ...`.

## Buyruqlar

```bash
pnpm install
docker compose up -d        # postgres, redis, minio
pnpm db:migrate             # prisma migrate dev
pnpm db:seed
pnpm dev                    # web + worker
pnpm test                   # vitest
pnpm e2e                    # playwright
pnpm lint && pnpm typecheck
```

## Atamalar lugʻati

| Oʻzbekcha | Kodda |
| --- | --- |
| Markaz | `Tenant` |
| Filial | `Branch` |
| Oʻquvchi | `Student` |
| Ota-ona | `Person` + `StudentParent` |
| Guruh | `Group` |
| Guruhga aʼzolik | `Enrollment` |
| Dars | `Lesson` |
| Davomat | `Attendance` |
| Hisob (toʻlanishi kerak) | `Invoice` |
| Toʻlov | `Payment` |
| Balans harakati | `LedgerEntry` |
| Lid | `Lead` |
| Maosh | `Payroll`, `SalaryRule` |

## Holat

> Har bir vazifadan keyin yangilanadi. Raqamlar `docs/TEXNIK_TOPSHIRIQ.md` 11-boʻlimidagi vazifalarga mos.

- **Joriy bosqich:** 1-bosqich
- **Bajarilgan vazifalar:** —
- **Keyingi vazifa:** 1. Monorepo, Docker Compose, lint, CI
- **Ochiq savollar:** —
- **Hujjatdan chetga chiqilgan qarorlar:** —
