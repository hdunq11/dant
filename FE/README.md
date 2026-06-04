# Concert Booking — Web (React + Vite)

Website đặt vé concert, tích hợp backend Django tại `d:\datn\be`.

## Cài đặt

```bash
cd FE
npm install
```

## Chạy

**Terminal 1 — Backend:**
```powershell
cd d:\datn\be
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```bash
cd FE
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

Dev mode dùng **proxy Vite** (`/api` → `http://127.0.0.1:8000`), không cần cấu hình CORS thêm.

Production build — set biến môi trường:
```
VITE_API_URL=http://your-server:8000/
```

## Chức năng

- Đăng nhập / đăng ký (JWT)
- Trang chủ: tìm kiếm, lọc thành phố & thể loại, gợi ý
- Chi tiết concert, yêu thích
- Chọn ghế → giữ chỗ → thanh toán (voucher, vé điện tử/giấy, bảo hiểm)
- Vé của tôi, hủy đơn pending
- Hồ sơ cá nhân

## Tech stack

- React 18 + TypeScript
- Vite 6
- React Router 7
- Axios
