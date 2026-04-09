# AzerDr ICD-10 Kodlama Platforması

## Layihə haqqında
3658 hasta anomali qeydini ICD-10 kodları ilə kodlamaq üçün çox istifadəçili veb platforması.

## Texnologiyalar
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: ASP.NET Core 10 Web API
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT

## Başlanğıc

### 1. PostgreSQL quraşdırılması
Supabase-dən verilənlər bazası yaradın və bağlantı sətirini aşağıdakı kimi yeniləyin.

### 2. Backend
```bash
cd backend/AzerDr.API
# appsettings.json-da ConnectionStrings:DefaultConnection-ı Supabase bağlantı sətri ilə yeniləyin
dotnet run
```
Backend http://localhost:5000 ünvanında işləyəcək.

İlk işə salma zamanı verilənlər bazası avtomatik olaraq yaradılacaq və JSON verilər seed ediləcək.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend http://localhost:5173 ünvanında işləyəcək.

### 4. Giriş
- **Admin**: istifadəçi: `admin`, şifrə: `admin123`
- **Həkim**: Admin paneldən yaradılır

## API Endpoints

| Metod | URL | Təsvir |
|-------|-----|--------|
| POST | /api/auth/login | Giriş |
| GET | /api/dashboard/stats | Statistikalar |
| GET | /api/dashboard/my-codings | Öz kodlamalarım |
| POST | /api/anomalies/next | Növbəti anomaliya |
| POST | /api/anomalies/{id}/save | Kodlama saxla |
| POST | /api/anomalies/{id}/skip | Keç |
| POST | /api/anomalies/{id}/error-report | Xəta bildir |
| GET | /api/icd/rubrikas | Rubrikalar |
| GET | /api/icd/rubrikas/{id}/bashliqlar | Başlıqlar |
| GET | /api/icd/bashliqlar/{id}/diaqnozlar | Diaqnozlar |
| GET | /api/admin/doctors | Həkim siyahısı |
| POST | /api/admin/doctors | Yeni həkim |
| PUT | /api/admin/doctors/{id} | Həkimi yenilə |
| DELETE | /api/admin/doctors/{id} | Həkimi sil |
| GET | /api/admin/progress | İrəliləyiş |
| GET | /api/admin/error-reports | Xəta bildirişləri |
| PUT | /api/admin/error-reports/{id} | Bildirişi dəyərləndir |

## Eşzamanlılıq
`SELECT FOR UPDATE SKIP LOCKED` ilə atomik atama - 100 həkim eyni anda çalışsa belə toqquşma olmaz.
