# KronoFlow — Hệ thống Quản lý Thời gian & Lộ trình Học tập

Phiên bản nâng cấp toàn diện theo kiến trúc **Full-stack Type-safe**:
- **Framework:** Next.js 15 (App Router) + React 19
- **Ngôn ngữ:** TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Database thật:** PostgreSQL + Drizzle ORM (chạy được trên cả Docker local lẫn Supabase)
- **Kiểm tra dữ liệu:** Zod validation ở mọi API route
- **Bộ đếm giờ:** Web Worker (`public/workers/timer-worker.js`) dựa trên timestamp thực

## Hướng dẫn chạy dự án

1. Cài đặt thư viện:
```bash
npm install
```

2. Khởi tạo PostgreSQL thật (chọn 1 trong 2 cách):
- **Cách 1 (Local Docker):**
```bash
docker compose up -d
cp .env.example .env.local
```
- **Cách 2 (Supabase Cloud):** Copy `.env.example` thành `.env.local` và dán chuỗi `DATABASE_URL` từ Project Settings → Database (Transaction Pooler cổng `6543`).

3. Đồng bộ bảng lên PostgreSQL:
```bash
npm run db:push
```

4. Chạy ứng dụng:
```bash
npm run dev
```
Mở `http://localhost:3000` để sử dụng.
