# RadVision (AzerDr) - Proje Özet Sənədi
## Yeni Chat Üçün Kontekst

---

## 📌 Proje Haqqında
**RadVision** — çoxlu doktorun eyni anda işləyə bildiyi ICD-10 kodlama platforması.
- 3658 hasta anomali qeydi (Dr.Azərin 10 illik datası) Excel-dən import edilib
- Doktorlar login olub, anomaliyaları ICD-10 kodları ilə kodlayır
- Admin paneldən doktor yaratmaq, statistikaları görmək mümkündür
- Canlı sayt: **https://radvision.live**

---

## 🏗️ Texnoloji Stack
| Komponent | Texnologiya | Harada? |
|-----------|-------------|---------|
| **Frontend** | React 19 + Vite 8 + TailwindCSS 4 | Vercel → radvision.live |
| **Backend** | ASP.NET Core 10 (C#) | Railway → api.radvision.live |
| **Database** | PostgreSQL (Supabase REST API) | Supabase Cloud |
| **Repo** | https://github.com/mutalibAbd/AzerDrData.git | master branch |

---

## 🗄️ Database Arxitekturası

### Production Supabase
- **Project ID:** ujpzllhzpbydvecnomaq
- **URL:** https://ujpzllhzpbydvecnomaq.supabase.co
- **ServiceRoleKey:** appsettings.json-da (sətir 18)
- **Admin:** Username=`Fedai`, Şifrə=`1234`

### Staging Supabase (test üçün, ayrı Google hesabı)
- **Project ID:** bszdccwgoqmepfoqquvb
- **URL:** https://bszdccwgoqmepfoqquvb.supabase.co
- **AnonKey:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzemRjY3dnb3FtZXBmb3FxdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjQ1NzMsImV4cCI6MjA5MTQwMDU3M30.J3zLt90eTd8oWHcmYCqMS26jz6pMhrYye68V2WptJxs
- **ServiceRoleKey:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzemRjY3dnb3FtZXBmb3FxdXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyNDU3MywiZXhwIjoyMDkxNDAwNTczfQ.6s2hu41NfK2N8nfhv4JoFj5znNHDUsiciyBCSJbdSug
- **Admin:** Username=`admin`, Şifrə=`admin123`
- **Test Doktor:** Username=`dr_hekim`, Şifrə=`hekim123`

### DB Cədvəlləri
- `users` — admin və doktor hesabları (BCrypt hash)
- `anomalies` — 3658 hasta anomali qeydi (status: pending/assigned/completed)
- `anomaly_codings` — doktorun ICD-10 kodlaması (rubrika, bashliq, diaqnoz, qeyd, not)
- `error_reports` — yazılış xətası və ICD məntiq xətası bildirişləri
- `doctor_skips` — doktorun keçdiyi anomalilər
- `icd_rubrikas` → `icd_bashliqlar` → `icd_diaqnozlar` → `icd_qeydler` (iyerarxik ICD-10)

### Migration Faylları (supabase/ qovluğunda)
- `migration.sql` — əsas schema (cədvəllər, indekslər, RPC funksiyaları, permissions)
- `migration_v2.sql` — parent_id əlavəsi (iyerarxik qeydlər)
- `migration_v3.sql` — error_reports-a error_type, description əlavəsi + nullable field_name/corrected_text
- `migration_v4.sql` — eyni düzəlişlər (staging üçün hazırlanıb, **HƏR İKİ DB-DƏ İŞLƏDİLMƏLİDİR**)
- `seed.mjs` — admin, ICD hierarchy, anomalies seed (env var override dəstəkləyir: SUPABASE_URL, SUPABASE_KEY)
- `reseed-qeydler.mjs` — iyerarxik qeydlər (⚠️ HARDCODED production credentials!)
- `reset-production.sql` — DB-ni sıfırlayıb tək admin yaradır

---

## 🔧 Backend Arxitekturası

### Dual-Mode Sistem
- `Database.Provider = "supabase"` → SupabaseRestClient + Supabase*Service (REST API)
- `Database.Provider = "local"` → EF Core + AppDbContext (PostgreSQL direct)
- Production və staging hər ikisi "supabase" modundadır

### Environment Switching
- `appsettings.json` → Production Supabase
- `appsettings.Staging.json` → Staging Supabase
- Railway-da env vars override edir: `Supabase__Url`, `Supabase__ServiceRoleKey`, `Jwt__Key`, `CORS_ORIGINS`

### ⚠️ Vacib: launchSettings.json ASPNETCORE_ENVIRONMENT-i override edir!
Staging backend işlətmək üçün MÜTLƏQ:
```powershell
cd C:\projects\AzerDrDbProject\backend\AzerDr.API
$env:ASPNETCORE_ENVIRONMENT = 'Staging'
dotnet run --no-launch-profile --urls "http://localhost:5000"
```

### Əsas RPC Funksiyaları (Supabase)
- `get_next_anomaly(p_doctor_id)` — SKIP LOCKED ilə concurrency-safe növbəti anomali
- `save_coding(...)` — atomic kodlama saxlama
- `skip_anomaly(...)` — anomali keçmə
- `release_assignment(p_doctor_id)` — assignment buraxma
- `cleanup_stale_assignments()` — 30 dəq+ köhnə assignment-ləri təmizləmə

### Əsas Controllerlər
- `AuthController` — login/me
- `AnomalyController` — next/save/skip/release/report-error/my-codings
- `IcdController` — rubrikas/bashliqlar/diaqnozlar/qeydler
- `AdminController` — stats/doctors/CRUD/error-reports

---

## 🎨 Frontend Strukturu

### Səhifələr
- `/` → Login
- `/dashboard` → Statistikalar, Mənim kodlaşdırmalarım, Həkimlərin sıralaması
- `/code` → ICD-10 kodlama interfeysi (əsas iş sahəsi)
- `/admin` → Admin paneli (doktor idarəsi, statistikalar)

### Əsas Komponentlər (frontend/src/components/)
- `Coding/PatientInfo.jsx` — hasta məlumatları + inline SpellingCheck
- `Coding/IcdSelector.jsx` — ICD-10 seçici (çoxsəviyyəli dropdown + checkbox tree)
- `Coding/ErrorReportModal.jsx` — İCD-10 kodu təklif et modal
- `Dashboard/Leaderboard.jsx` — həkimlərin sıralaması (Stethoscope ikonu)
- `Dashboard/MyCodings.jsx` — doktorun kodlamaları (5 per page)

### Multi-Select ICD (Səviyyə 4-5)
- Checkbox tree ilə çox seçim
- Vergüllə ayrılmış format: `"ParentName: Child1, Child2 | Parent2: Child3"`
- State: `checkedQeydler = { [parentId]: { parent: obj, children: [obj, ...] } }`

### ICD-10 Referans Cədvəli
- `frontend/public/ICD10.json` (~142KB) - bütün ICD-10 kodları
- Aşağıdan yuxarı pop-up şəklində açılır (55vh, slide-up animasiya)
- Axtarış ilə filter olunur

### UI Xüsusiyyətləri
- PatientInfo section: amber/orange border + gradient
- IcdSelector section: sky/cyan border + gradient
- "Dr.Azərin anormal tapıntıları" başlığı (belirgin, dikkat çəkici)
- "Saxla & Bitir" butonu — kodladıqdan sonra çıxış
- Dashboard-da teşekkür mesajı banner

---

## 🚀 Deploy Əmrləri

### Frontend (Vercel)
```bash
cd C:\projects\AzerDrDbProject\frontend
npx vercel --prod --yes
```

### Backend (Railway)
```bash
cd C:\projects\AzerDrDbProject
npx @railway/cli up
```

### ⚠️ Git Push
Son commit (`6f213f7`) hələ push edilməyib. `origin/master` = `d1eca80`
```bash
git push origin master
```

---

## 📋 Tamamlanan Sprintlər

### Sprint 1-2 (əsas platform)
- Login/auth sistemi, JWT
- Anomali kodlama axını (get next → code → save → next)
- SKIP LOCKED concurrency (100 doktor eyni anda)
- Admin paneli, doktor CRUD
- ICD-10 iyerarxik seçici (4 səviyyə + qeydlər)

### Sprint 3 (UI/UX təkmilləşdirmələri)
- Həkimlərin sıralaması (leaderboard) - Stethoscope ikonu
- Multi-select ICD (4-5 səviyyə checkbox tree)
- Inline yazılış xətası bildirmə
- ICD məntiq xətası/təklif bildirmə
- "Saxla & Bitir" butonu
- ICD-10 referans popup cədvəli
- MyCodings 5 per page pagination
- Section rəngləri (amber + sky), belirgin başlıqlar

---

## ⚠️ Bilinən Problemlər / TODO

1. **migration_v4.sql HƏR İKİ DB-də işlədilməlidir** — error_reports cədvəlinə error_type, description sütunları əlavə edir. Production-da bu olmadan xəta bildirmək 400 error verir.

2. **reseed-qeydler.mjs HARDCODED production credentials var** — staging üçün istifadə etmək üçün müvəqqəti fayl yaradıb URL dəyişmək lazımdır.

3. **git push edilməyib** — son 6 commit local-dadır, push lazımdır.

4. **Frontend .env.staging yaradılmayıb** — hələlik local dev proxy ilə işləyir.

5. **IPv6 məhdudiyyəti** — bu maşından Supabase-ə birbaşa PostgreSQL bağlantısı yoxdur. Bütün DB əməliyyatları REST API ilə olur, schema dəyişiklikləri Supabase Dashboard SQL Editor-dan edilir.

---

## 📁 Proje Strukturu
```
C:\projects\AzerDrDbProject\
├── backend\AzerDr.API\
│   ├── Controllers\        (Auth, Anomaly, Icd, Admin)
│   ├── Services\Supabase\  (SupabaseRestClient, SupabaseServices)
│   ├── Services\            (AuthService, AdminService — EF Core mode)
│   ├── DTOs\Dtos.cs
│   ├── Models\
│   ├── appsettings.json          (PRODUCTION)
│   ├── appsettings.Staging.json  (STAGING)
│   └── Program.cs
├── frontend\
│   ├── src\pages\           (LoginPage, DashboardPage, CodingPage, AdminPage)
│   ├── src\components\      (Coding/, Dashboard/, Admin/)
│   ├── src\services\api.js  (axios instance)
│   ├── .env                 (dev: /api proxy)
│   ├── .env.production      (VITE_API_URL=https://api.radvision.live/api)
│   └── vite.config.js       (proxy /api → localhost:5000)
├── supabase\
│   ├── migration.sql         (v1 schema)
│   ├── migration_v2.sql      (parent_id for qeydler)
│   ├── migration_v3.sql      (error_type for error_reports)
│   ├── migration_v4.sql      (staging migration - same as v3)
│   ├── seed.mjs              (data seeder)
│   ├── reseed-qeydler.mjs   (hierarchical qeydler)
│   └── reset-production.sql  (DB sıfırlama)
├── data\                     (Excel-dən çıxarılmış JSON-lar, ICD10.json)
├── Dockerfile                (Railway üçün)
├── railway.toml
└── package.json              (root: bcryptjs dependency for seed)
```
