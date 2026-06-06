# PHÂN TÍCH THIẾT KẾ — USE CASE & ĐẶC TẢ UK

**Dự án:** DATN — Concert Booking System  
**Thành phần:** Backend (Django REST) · Web (React/Vite) · Mobile (Android Kotlin)

---

# PHẦN 1: TOÀN BỘ USE CASE

## 1. Tổng quan

Hệ thống cho phép người dùng **tìm concert → xem chi tiết → chọn ghế → thanh toán → quản lý vé**, đồng thời admin **quản lý dữ liệu nghệ sĩ, địa điểm, concert, ghế, voucher, đơn hàng**.

### 1.1. Tác nhân (Actors)

| Tác nhân | Mô tả |
|----------|--------|
| **Khách (Guest)** | Chưa đăng nhập. Web: duyệt concert, gợi ý. Mobile: bị chuyển sang Login trước khi đặt vé. |
| **Người dùng (User)** | Đã đăng nhập JWT. Đặt vé, yêu thích, hồ sơ, hủy đơn. |
| **Quản trị viên (Admin)** | Kế thừa User + quyền `is_staff`. CRUD qua API và Django Admin. |

**Quan hệ kế thừa (UML):** Admin **generalization** User (quyền mở rộng).

### 1.2. Phạm vi

**Trong phạm vi:** đăng ký/đăng nhập, duyệt concert, yêu thích, chọn ghế, giữ chỗ, checkout, thanh toán mock, xem/hủy đơn, sửa hồ sơ, gợi ý, quản trị CRUD (admin).

**Ngoài phạm vi (hiện tại):** cổng thanh toán thật (MoMo/VNPAY), push notification, UI admin riêng trên web/mobile, iOS, VR seat selection.

---

## 2. Danh sách use case (21 UC chính + bổ sung)

### Nhóm A — Xác thực & tài khoản (UC-AUTH)

| ID | Use case | Actor | Mô tả |
|----|----------|-------|--------|
| UC01 | Đăng ký tài khoản | Guest | Email, mật khẩu, họ tên |
| UC02 | Đăng nhập | Guest | Nhận JWT access + refresh |
| UC03 | Đăng xuất | User | Xóa token phía client |
| UC04 | Cập nhật hồ sơ | User | Sửa họ tên, avatar URL |
| *(bổ sung)* | Làm mới token | User | `POST /api/token/refresh/` |

**Giao diện:** Web `/login`, `/register`, `/profile`, `/profile/edit` · Mobile: màn Login, NotificationsFragment (profile).

### Nhóm B — Duyệt & khám phá concert (UC-CON)

| ID | Use case | Actor | Mô tả |
|----|----------|-------|--------|
| UC05 | Xem danh sách concert | Guest, User | Tìm kiếm, lọc city/genre/date |
| UC06 | Xem chi tiết concert | Guest, User | Thông tin, nghệ sĩ, địa điểm |
| UC07 | Xem sơ đồ ghế | User | Seatmap theo zone |
| UC08 | Xem gợi ý concert | Guest, User | Cá nhân hóa nếu đã login |
| *(bổ sung)* | Xem nghệ sĩ của concert | Guest, User | API: `GET .../concerts/{id}/artists/` |
| *(bổ sung)* | Xem địa điểm của concert | Guest, User | API: `GET .../concerts/{id}/venue/` |
| *(bổ sung)* | Xem danh sách nghệ sĩ | Guest, User | API: `GET /api/artists/artists/` |
| *(bổ sung)* | Xem danh sách địa điểm | Guest, User | API: `GET /api/venues/venues/` |

**Giao diện:** Web `/` (HomePage), `/concerts/:id` · Mobile: HomeFragment, ConcertDetailFragment.

### Nhóm C — Đặt vé & thanh toán (UC-BOOK)

| ID | Use case | Actor | Mô tả |
|----|----------|-------|--------|
| UC09 | Chọn ghế | User | Tối đa 6 ghế (rule client) |
| UC10 | Giữ ghế (Reserve) | User | Trạng thái reserved, TTL 10 phút |
| UC11 | Áp dụng voucher | User | Validate mã giảm giá |
| *(bổ sung)* | Xem danh sách voucher | Guest, User | API: `GET /api/orders/vouchers/` |
| *(bổ sung)* | Chọn tùy chọn checkout | User | Giao vé e_ticket/paper, bảo hiểm, PT thanh toán mock |
| UC12 | Tạo đơn hàng | User | Status `pending` |
| UC13 | Thanh toán | User | Mock pay → `paid`, ghế `sold` |
| UC14 | Xem vé của tôi | User | Danh sách đơn + QR demo |
| UC15 | Hủy đơn | User | Chủ yếu UI cho `pending` |

**Luồng đặt vé chính:**

```
Xem concert → Chọn ghế (≤6) → Reserve (10 phút) → Checkout + voucher → Tạo đơn pending → Thanh toán mock → Xác nhận + QR
```

**Giao diện:** Web `/concerts/:id/seats`, `/checkout`, `/orders/:orderId/success`, `/tickets` · Mobile: SeatSelectionFragment, CheckoutFragment, DashboardFragment.

### Nhóm D — Yêu thích & hành vi (UC-FAV)

| ID | Use case | Actor | Mô tả |
|----|----------|-------|--------|
| UC16 | Thêm/xóa yêu thích | User | Favorite concert |
| UC17 | Xem danh sách yêu thích | User | |
| UC18 | Ghi hành vi | User | view, favorite → recommend |

**Giao diện:** Web `/favorites` + nút trên ConcertDetailPage · Mobile: FavoritesFragment.

### Nhóm E — Quản trị (UC-ADM)

| ID | Use case | Actor | Mô tả |
|----|----------|-------|--------|
| UC19 | Quản lý nghệ sĩ/địa điểm/concert | Admin | CRUD |
| UC20 | Quản lý zone & sinh ghế | Admin | generate-seats |
| UC21 | Quản lý voucher & đơn hàng | Admin | Django Admin |
| *(bổ sung)* | Xem thống kê dashboard | Admin | Tổng user, đơn, doanh thu (API mở rộng) |

**Ghi chú:** Admin **không có UI riêng** trên web/mobile — dùng Django Admin + API với quyền `IsAdminUser`.

### Use case phụ trên Web (thông tin tĩnh)

| Use case | Actor | Mô tả |
|----------|-------|--------|
| Xem chính sách thanh toán | Guest, User | Trang `/info/payment` |
| Xem điều khoản sử dụng | Guest, User | Trang `/info/terms` |

---

## 3. Quy tắc nghiệp vụ

### 3.1. Công thức tính giá

```
Tổng = Tiền ghế + Phí đặt chỗ + Phí giao vé + Bảo hiểm − Giảm voucher
```

| Khoản mục | Giá trị |
|-----------|---------|
| Phí đặt chỗ | 20.000 ₫ / đơn |
| Vé giấy (`paper`) | +30.000 ₫ |
| Bảo hiểm | +50.000 ₫ × số ghế |
| Voucher | `%` trên `seat_subtotal` (VD: DATN10, CONCERT20) |
| Tổng tối thiểu | ≥ 0 |

### 3.2. Trạng thái ghế

```
available → reserved (TTL 10 phút) → sold (thanh toán OK)
reserved → available (hết hạn / hủy đơn)
```

**Ràng buộc:**
- Reserve chỉ áp dụng ghế `available`.
- Thời gian giữ: **10 phút** (`reserved_until`).
- Tạo đơn yêu cầu ghế đang `reserved`.
- Thanh toán: `reserved` → `sold`.
- Hủy đơn: ghế trả về `available`.

### 3.3. Trạng thái đơn hàng

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Đã tạo, chưa thanh toán |
| `paid` | Thanh toán mock thành công |
| `cancelled` | Đã hủy |

---

## 4. Ánh xạ Use case ↔ Giao diện ↔ API

| Use case | Web (FE) | Mobile | API chính |
|----------|----------|--------|-----------|
| UC01–UC02 | `/register`, `/login` | Login | `/auth/register`, `/auth/login` |
| UC04 | `/profile`, `/profile/edit` | NotificationsFragment | GET/PUT `/users/me/` |
| UC05–UC06 | `/`, `/concerts/:id` | Home, Detail | GET `/api/concerts/concerts/` |
| UC07–UC10 | `/concerts/:id/seats` | SeatSelectionFragment | GET seatmap, POST reserve |
| UC11–UC13 | `/concerts/:id/checkout`, `/orders/:orderId/success` | CheckoutFragment | validate, create, pay |
| UC14–UC15 | `/tickets` | DashboardFragment | GET orders, POST cancel |
| UC16–UC17 | Detail + `/favorites` | FavoritesFragment | favorites CRUD |
| UC08, UC18 | HomePage | Home | recommend, behaviors |
| UC19–UC21 | — | — | CRUD + Django Admin |

---

## 5. Khác biệt Web vs Mobile

| Hành vi | Web | Mobile |
|---------|-----|--------|
| Duyệt concert khi chưa login | ✅ | ❌ (bắt login) |
| Gợi ý concert | ✅ (cả guest) | ✅ |
| Đặt vé | ✅ | ✅ |
| Protected routes | React `ProtectedRoute` | Nav graph yêu cầu auth |

---

## 6. Tóm tắt số lượng

- **21 use case chính** (UC01–UC21)
- **~8 use case bổ sung** (refresh token, xem artist/venue, voucher list, tùy chọn checkout, trang info, v.v.)
- **3 actor:** Guest, User, Admin
- **5 nhóm nghiệp vụ:** Auth, Concert, Booking, Favorites/Behavior, Admin

---

# PHẦN 2: ĐẶC TẢ USE CASE (UK)

> Format: Description · Actor · Trigger · Pre-conditions · Post-conditions · Main Flow · Alternative Flow

---

## UC-01: Register Account

**Description:** Khách truy cập đăng ký tài khoản mới bằng email để sử dụng các chức năng đặt vé.

**Actor:** Guest

**Trigger:** Khách chọn "Đăng ký" trên web hoặc mobile.

**Pre-conditions:**
- Email chưa tồn tại trong hệ thống.
- Client có kết nối tới backend API.

**Post-conditions:**
- Tài khoản mới được tạo với `role = user`.
- Khách có thể chuyển sang màn đăng nhập.

**Main Flow:**
1. Khách nhập email, mật khẩu, xác nhận mật khẩu và họ tên.
2. Khách nhấn "Đăng ký".
3. Frontend gọi `POST /api/users/auth/register/`.
4. BE validate dữ liệu, hash mật khẩu, lưu User vào PostgreSQL.
5. BE trả về `201 Created` kèm thông tin user (id, email, full_name, role).
6. Frontend hiển thị thông báo thành công và chuyển sang màn Login.

**Alternative Flow:**
1. **Email trùng / dữ liệu không hợp lệ:** BE trả lỗi `400`; frontend hiển thị message lỗi, giữ nguyên form.
2. **Mật khẩu không khớp:** Validation phía client hoặc BE từ chối trước khi tạo user.

---

## UC-02: Login

**Description:** Khách đăng nhập bằng email/mật khẩu để nhận JWT và truy cập chức năng bảo vệ.

**Actor:** Guest

**Trigger:** Khách chọn "Đăng nhập" hoặc bị redirect khi truy cập route yêu cầu auth.

**Pre-conditions:** Tài khoản đã tồn tại.

**Post-conditions:**
- Client lưu `access` và `refresh` token.
- User được coi là đã đăng nhập trên toàn hệ thống.

**Main Flow:**
1. Khách nhập email và mật khẩu.
2. Khách nhấn "Đăng nhập".
3. Frontend gọi `POST /api/users/auth/login/`.
4. BE xác thực credentials.
5. BE tạo JWT (`access`, `refresh`) và trả user profile.
6. Frontend lưu token, cập nhật AuthContext, redirect về trang trước hoặc Home.

**Alternative Flow:**
1. **Sai email/mật khẩu:** BE trả `401`; frontend hiển thị "Invalid credentials".
2. **Access token hết hạn (sau này):** Client gọi `POST /api/token/refresh/` với refresh token để lấy access mới.

---

## UC-03: Logout

**Description:** User đăng xuất khỏi ứng dụng bằng cách xóa token phía client.

**Actor:** User

**Trigger:** User chọn "Đăng xuất" trên menu/profile.

**Pre-conditions:** User đang đăng nhập (có token trong localStorage).

**Post-conditions:**
- Token bị xóa khỏi client.
- User không thể truy cập route bảo vệ cho đến khi login lại.

**Main Flow:**
1. User nhấn "Đăng xuất".
2. Frontend xóa `access` và `refresh` token khỏi localStorage.
3. AuthContext cập nhật `isAuthenticated = false`.
4. Frontend redirect về Home hoặc Login.

**Alternative Flow:**
1. Không có API logout phía server — session JWT vẫn hợp lệ đến khi hết hạn (stateless).

---

## UC-04: Update Profile

**Description:** User xem và cập nhật thông tin cá nhân (họ tên, avatar URL).

**Actor:** User

**Trigger:** User mở trang Profile hoặc Edit Profile.

**Pre-conditions:** User đã đăng nhập.

**Post-conditions:** Thông tin profile được cập nhật trên CSDL.

**Main Flow:**
1. User mở `/profile` hoặc `/profile/edit`.
2. Frontend gọi `GET /api/users/me/` để lấy thông tin hiện tại.
3. User sửa `full_name`, `avatar_url`.
4. User nhấn "Lưu".
5. Frontend gọi `PUT /api/users/me/`.
6. BE cập nhật User, trả dữ liệu mới.
7. Frontend hiển thị thông báo thành công.

**Alternative Flow:**
1. **Dữ liệu không hợp lệ:** BE trả `400`; frontend hiển thị lỗi validation.

---

## UC-05: Browse Concert List

**Description:** Người dùng xem danh sách concert với tìm kiếm và bộ lọc.

**Actor:** Guest, User

**Trigger:** Người dùng mở trang chủ hoặc màn Home trên mobile.

**Pre-conditions:** Backend có ít nhất một concert trong CSDL (hoặc hiển thị empty state).

**Post-conditions:** Danh sách concert được hiển thị theo bộ lọc hiện tại.

**Main Flow:**
1. Người dùng mở Home.
2. Frontend gọi `GET /api/concerts/concerts/` (kèm query: `search`, `genre`, `city`, `date`, `ordering`).
3. BE trả danh sách phân trang (count, results).
4. Frontend render ConcertCard cho từng item.
5. (Tuỳ chọn) Frontend gọi `GET /api/behaviors/recommend/` để hiển thị block gợi ý.

**Alternative Flow:**
1. **Không có kết quả:** Frontend hiển thị "Không tìm thấy concert".
2. **Lỗi mạng/API:** Hiển thị thông báo lỗi và nút thử lại.

---

## UC-06: View Concert Detail

**Description:** Người dùng xem thông tin chi tiết một concert (mô tả, thời gian, nghệ sĩ, địa điểm).

**Actor:** Guest, User

**Trigger:** Người dùng chọn một concert từ danh sách hoặc gợi ý.

**Pre-conditions:** Concert tồn tại (`id` hợp lệ).

**Post-conditions:** Thông tin concert được hiển thị đầy đủ; user đã login có thể thêm yêu thích hoặc "Chọn ghế".

**Main Flow:**
1. Người dùng mở `/concerts/:id`.
2. Frontend gọi `GET /api/concerts/concerts/{id}/`.
3. BE trả concert kèm venue, artists, banner.
4. Frontend render chi tiết.
5. Nếu User đã login: frontend gọi `POST /api/behaviors/behaviors/` với `action: "view"`.

**Alternative Flow:**
1. **Concert không tồn tại:** BE trả `404`; frontend redirect hoặc hiển thị lỗi.
2. **Chưa login khi bấm "Chọn ghế" (mobile):** Redirect sang Login.

---

## UC-07: View Seat Map

**Description:** User xem sơ đồ ghế theo zone, giá và trạng thái real-time trước khi đặt vé.

**Actor:** User

**Trigger:** User chọn "Chọn ghế" từ trang chi tiết concert.

**Pre-conditions:**
- User đã đăng nhập.
- Concert có seatmap đã được admin cấu hình (zones + seats + ConcertSeat).

**Post-conditions:** Sơ đồ ghế hiển thị với trạng thái `available`, `reserved`, `sold`.

**Main Flow:**
1. User mở `/concerts/:id/seats`.
2. Frontend gọi `GET /api/concerts/concerts/{id}/seatmap/`.
3. BE trả cấu trúc `zones[]` → mỗi zone có `price`, `color`, `seats[]` (row, number, status, pos_x, pos_y).
4. Frontend render seatmap 2D; ghế `sold`/`reserved` không cho chọn.
5. User chọn ghế (tối đa 6 theo rule client).

**Alternative Flow:**
1. **Chưa login:** `ProtectedRoute` redirect `/login`.
2. **Seatmap rỗng:** Hiển thị thông báo "Chưa có ghế cho concert này".

---

## UC-08: Get Recommendations

**Description:** Hệ thống gợi ý concert liên quan hoặc cá nhân hóa theo hành vi người dùng.

**Actor:** Guest, User

**Trigger:** Home load hoặc user xem chi tiết concert.

**Pre-conditions:** Có dữ liệu concert trong CSDL.

**Post-conditions:** Client nhận `recommendedConcerts` (và có thể `recommendedZone`).

**Main Flow:**
1. Frontend gọi `GET /api/behaviors/recommend/` (tuỳ chọn `?concert_id=`).
2. **Có concert_id:** BE gợi ý concert cùng venue/artist.
3. **Không có concert_id + User login:** BE lấy genre từ UserBehavior → lọc concert cùng genre.
4. **Guest / không đủ behavior:** BE trả top concert sắp diễn.
5. Frontend render section "Gợi ý cho bạn".

**Alternative Flow:**
1. **Không có gợi ý phù hợp:** Trả mảng rỗng hoặc fallback top 5.

---

## UC-09: Select Seats

**Description:** User chọn ghế trống trên seatmap trước khi giữ chỗ.

**Actor:** User

**Trigger:** User click/tap ghế có trạng thái `available` trên seatmap.

**Pre-conditions:** User đã login; seatmap đã load.

**Post-conditions:** Danh sách ghế được chọn hiển thị trên UI (tối đa 6).

**Main Flow:**
1. User chọn từng ghế `available` trên seatmap.
2. Frontend cập nhật state ghế đã chọn và tổng tiền tạm tính.
3. User nhấn "Tiếp tục" khi đã chọn đủ ghế.

**Alternative Flow:**
1. **Chọn quá 6 ghế:** Client chặn, hiển thị cảnh báo.
2. **Chọn ghế sold/reserved:** Ghế không clickable hoặc bị từ chối.

---

## UC-10: Reserve Seats

**Description:** User giữ tạm ghế đã chọn trong 10 phút trước khi checkout.

**Actor:** User

**Trigger:** User xác nhận danh sách ghế đã chọn và chuyển sang checkout.

**Pre-conditions:**
- User đã login.
- Các ghế đang ở trạng thái `available`.
- Số ghế ≤ 6.

**Post-conditions:**
- Ghế chuyển `reserved`, có `reserved_until = now + 10 phút`.
- User được phép tạo đơn trong thời hạn giữ chỗ.

**Main Flow:**
1. User chọn ghế trên seatmap và nhấn "Tiếp tục".
2. Frontend gọi `POST /api/seats/booking/reserve/` với `{ concert_id, seat_ids[] }`.
3. BE kiểm tra atomic: ghế phải `available`.
4. BE cập nhật `ConcertSeat.status = reserved`, set `reserved_until`.
5. BE trả `{ message, reserved_until }`.
6. Frontend chuyển sang `/concerts/:id/checkout`, hiển thị countdown (nếu có).

**Alternative Flow:**
1. **Ghế đã bị người khác giữ/bán:** BE trả lỗi; frontend báo "Ghế không còn trống", reload seatmap.
2. **Hết 10 phút:** Ghế tự về `available` (logic BE/timeout); checkout thất bại khi tạo đơn.

---

## UC-11: Apply Voucher

**Description:** User nhập mã giảm giá để giảm tiền ghế trước khi tạo đơn.

**Actor:** User

**Trigger:** User nhập mã voucher trên màn Checkout.

**Pre-conditions:**
- User đã login, đã reserve ghế.
- `seat_subtotal` đã được tính từ giá các ghế.

**Post-conditions:**
- Nếu hợp lệ: `discount_amount` được áp dụng vào tổng đơn.
- Nếu không hợp lệ: tổng tiền không đổi, hiển thị lỗi.

**Main Flow:**
1. User nhập mã (vd. `DATN10`) trên Checkout.
2. User nhấn "Áp dụng".
3. Frontend gọi `POST /api/orders/vouchers/validate/` với `{ code, seat_subtotal }`.
4. BE tra `Voucher` (`is_active = true`), tính `%` discount trên `seat_subtotal`.
5. BE trả `{ valid: true, code, discount_percent, discount_amount, description }`.
6. Frontend cập nhật breakdown giá (booking fee, delivery, insurance, discount, total).

**Alternative Flow:**
1. **Mã không tồn tại / inactive:** BE trả `400` `{ valid: false, error: "..." }`; frontend hiển thị lỗi.
2. **User bỏ voucher:** Frontend xóa discount, tính lại tổng local hoặc validate lại với code rỗng.

---

## UC-12: Create Order

**Description:** User tạo đơn hàng `pending` từ ghế đã reserve, kèm tùy chọn giao vé, bảo hiểm và voucher.

**Actor:** User

**Trigger:** User hoàn tất cấu hình checkout và nhấn "Thanh toán" / "Tạo đơn".

**Pre-conditions:**
- User đã login.
- Ghế đang `reserved` của user/concert và còn trong TTL 10 phút.
- Checkout đã tính giá (subtotal + phí − voucher).

**Post-conditions:**
- `Order` được tạo với `status = pending`.
- `OrderItem` lưu từng ghế và giá snapshot.
- Ghế vẫn `reserved` cho đến khi thanh toán hoặc hủy/hết hạn.

**Main Flow:**
1. User cấu hình checkout: voucher (tuỳ chọn), `delivery_method` (`e_ticket` / `paper`), `has_insurance`, `payment_method`.
2. User nhấn "Thanh toán".
3. Frontend gọi `POST /api/orders/orders/` với `{ concert_id, seat_ids[], voucher_code?, delivery_method, has_insurance, payment_method }`.
4. BE validate ghế `reserved`, tính pricing qua `calculate_order_pricing()`:
   - `seat_subtotal` + `booking_fee` (20.000₫) + `delivery_fee` + `insurance_fee` − `discount_amount`.
5. BE tạo `Order` + `OrderItem` trong transaction PostgreSQL.
6. BE trả `201 Created` kèm order details (`status: pending`, breakdown giá, items).
7. Frontend chuyển sang bước thanh toán mock (UC-13) hoặc gọi pay ngay.

**Alternative Flow:**
1. **Voucher không hợp lệ lúc tạo đơn:** BE từ chối hoặc bỏ discount; frontend hiển thị lỗi, user sửa mã.
2. **Ghế hết hạn reserve:** BE trả lỗi; user quay lại seatmap chọn ghế mới.
3. **Reserve chưa thực hiện:** BE từ chối tạo đơn vì ghế không ở trạng thái `reserved`.

---

## UC-13: Mock Payment

**Description:** User xác nhận thanh toán giả lập; đơn chuyển `paid`, ghế chuyển `sold`.

**Actor:** User

**Trigger:** User xác nhận thanh toán sau khi order `pending` được tạo.

**Pre-conditions:**
- Order thuộc user hiện tại, `status = pending`.
- Ghế liên quan vẫn `reserved`.

**Post-conditions:**
- Order `status = paid`.
- Ghế `status = sold`.
- User thấy màn xác nhận + QR demo.

**Main Flow:**
1. Frontend gọi `POST /api/orders/orders/{order_id}/pay/`.
2. BE kiểm tra ownership và trạng thái order.
3. BE cập nhật order → `paid`, concert seats → `sold` (transaction).
4. BE trả `{ message: "Payment successful", order: {...} }`.
5. Frontend redirect `/orders/:orderId/success` (ConfirmationPage).

**Alternative Flow:**
1. **Order không còn pending:** BE trả lỗi; hiển thị trạng thái hiện tại.
2. **Thanh toán thất bại (mock error):** Order giữ `pending`; user có thể thử lại hoặc hủy (UC-15).

---

## UC-14: View My Tickets

**Description:** User xem lịch sử đơn hàng và vé đã mua.

**Actor:** User

**Trigger:** User mở "Vé của tôi" / Dashboard.

**Pre-conditions:** User đã login.

**Post-conditions:** Danh sách đơn hiển thị theo thời gian mới nhất.

**Main Flow:**
1. User mở `/tickets`.
2. Frontend gọi `GET /api/users/me/orders/`.
3. BE trả danh sách order (concert_title, total_price, status, created_at, …).
4. Frontend hiển thị list; đơn `paid` có thể show QR demo.

**Alternative Flow:**
1. **Chưa có đơn:** Empty state "Bạn chưa có vé nào".
2. **Lỗi API:** Thông báo lỗi + retry.

---

## UC-15: Cancel Order

**Description:** User hủy đơn `pending` (và theo backend có thể hủy `paid`), trả ghế về `available`.

**Actor:** User

**Trigger:** User chọn "Hủy đơn" trên màn Vé của tôi.

**Pre-conditions:**
- User sở hữu order.
- Order ở trạng thái cho phép hủy (`pending` trên UI chính).

**Post-conditions:**
- Order `status = cancelled`.
- Ghế liên quan trở về `available`.

**Main Flow:**
1. User mở chi tiết đơn `pending`.
2. User xác nhận hủy.
3. Frontend gọi `POST /api/orders/orders/{id}/cancel/`.
4. BE set order → `cancelled`, release seats.
5. BE trả `{ message: "Order cancelled" }`.
6. Frontend cập nhật UI.

**Alternative Flow:**
1. **User từ chối hủy:** Luồng kết thúc, không gọi API.
2. **Hủy thất bại (order đã paid/xử lý):** BE trả lỗi; frontend thông báo.

---

## UC-16: Manage Favorites

**Description:** User thêm hoặc xóa concert khỏi danh sách yêu thích.

**Actor:** User

**Trigger:** User bấm icon "Yêu thích" trên trang chi tiết concert.

**Pre-conditions:** User đã login; concert tồn tại.

**Post-conditions:** Trạng thái favorite được cập nhật; có thể ghi behavior `favorite`.

**Main Flow (Thêm):**
1. User bấm "Thêm yêu thích".
2. Frontend gọi `POST /api/users/me/favorites/` `{ concert_id }`.
3. BE tạo bản ghi Favorite (unique user + concert).
4. Frontend gọi `POST /api/behaviors/behaviors/` `action: "favorite"`.
5. UI cập nhật icon active.

**Alternative Flow (Xóa):**
1. User bấm lại icon khi đã yêu thích.
2. Frontend gọi `DELETE /api/users/me/favorites/{concert_id}/`.
3. BE xóa Favorite; UI cập nhật.

---

## UC-17: View Favorites List

**Description:** User xem danh sách concert đã đánh dấu yêu thích.

**Actor:** User

**Trigger:** User mở trang `/favorites`.

**Pre-conditions:** User đã login.

**Post-conditions:** Danh sách favorite concerts hiển thị.

**Main Flow:**
1. User mở `/favorites`.
2. Frontend gọi `GET /api/users/me/favorites/`.
3. BE trả danh sách concert (id, title, start_time, banner_url, …).
4. Frontend render danh sách; user có thể chọn concert để xem chi tiết.

**Alternative Flow:**
1. **Chưa có yêu thích:** Empty state.
2. **Lỗi API:** Thông báo lỗi + retry.

---

## UC-18: Log User Behavior

**Description:** Hệ thống ghi nhận hành vi người dùng để phục vụ gợi ý cá nhân hóa.

**Actor:** User

**Trigger:** User xem chi tiết concert, click hoặc thêm yêu thích.

**Pre-conditions:** User đã login; concert tồn tại.

**Post-conditions:** Bản ghi UserBehavior được lưu với action tương ứng.

**Main Flow:**
1. Frontend phát hiện sự kiện (view, click, favorite).
2. Frontend gọi `POST /api/behaviors/behaviors/` `{ concert_id, action }`.
3. BE tạo UserBehavior trong PostgreSQL.
4. BE trả `201 Created`.

**Alternative Flow:**
1. **Concert không tồn tại:** BE trả `404`.
2. **Chưa login:** Không ghi behavior (chỉ guest xem, không log).

---

## UC-19: Manage Concert Data (Admin CRUD)

**Description:** Admin quản lý nghệ sĩ, địa điểm và concert qua API hoặc Django Admin.

**Actor:** Admin

**Trigger:** Admin cần thêm/sửa/xóa dữ liệu master trước khi mở bán vé.

**Pre-conditions:** Admin đã login với quyền `IsAdminUser` / `is_staff`.

**Post-conditions:** Dữ liệu Artist, Venue, Concert được cập nhật trên PostgreSQL.

**Main Flow:**
1. Admin tạo Venue: `POST /api/venues/venues/`.
2. Admin tạo Artist: `POST /api/artists/artists/`.
3. Admin tạo Concert: `POST /api/concerts/concerts/` (title, times, venue_id, artists[], banner).
4. BE lưu Concert + ConcertArtist links.
5. Admin xác nhận concert xuất hiện trên API list.

**Alternative Flow:**
1. **Thiếu quyền:** BE trả `403 Forbidden`.
2. **Cập nhật/Xóa:** `PUT/PATCH/DELETE` trên resource `{id}`; validate ràng buộc FK (concert đang có order).

---

## UC-20: Generate Seat Map (Admin)

**Description:** Admin tạo zone ghế và sinh ghế tự động cho venue.

**Actor:** Admin

**Trigger:** Admin chuẩn bị seatmap cho concert mới tại một venue.

**Pre-conditions:** Venue đã tồn tại.

**Post-conditions:** SeatZone + Seat records được tạo; concert có thể map ConcertSeat.

**Main Flow:**
1. Admin tạo zone: `POST /api/seats/zones/` `{ venue_id, name, price, color }`.
2. Admin gọi `POST /api/seats/zones/{zone_id}/generate-seats/` `{ rows: ["A","B",...], seats_per_row: 20 }`.
3. BE sinh ghế với `row_label`, `seat_number`, `pos_x`, `pos_y`.
4. BE trả `{ message, count }` (vd. "Generated 80 seats").
5. Khi tạo concert, hệ thống khởi tạo ConcertSeat `available` cho từng ghế.

**Alternative Flow:**
1. **Zone trùng tên trong cùng venue:** BE trả lỗi unique constraint.
2. **Generate lại:** Cần xử lý conflict nếu ghế đã có order (admin phải xóa/thao tác thủ công qua Django Admin).

---

## UC-21: Manage Vouchers & Orders (Admin)

**Description:** Admin quản lý mã giảm giá và đơn hàng qua Django Admin.

**Actor:** Admin

**Trigger:** Admin cần tạo voucher mới hoặc tra cứu/xử lý đơn hàng.

**Pre-conditions:** Admin đã login Django Admin (`/admin/`).

**Post-conditions:** Voucher/Order được cập nhật trên CSDL.

**Main Flow:**
1. Admin đăng nhập `/admin/`.
2. Admin tạo/sửa Voucher (code, discount_percent, is_active).
3. Admin xem danh sách Order, OrderItem.
4. Admin có thể cập nhật trạng thái đơn thủ công nếu cần.

**Alternative Flow:**
1. **Voucher code trùng:** Unique constraint error.
2. **Không có quyền staff:** Không truy cập được Django Admin.

---

## Tài liệu tham chiếu

- Backend API: `be/API_DOCUMENTATION.md`, Swagger `/api/docs/`
- Phân tích thiết kế gốc: `docs/PHAN_TICH_THIET_KE.md`
- Pricing: `be/app/orders/pricing.py`
- Web routes: `FE/src/App.tsx`
- Mobile nav: `mobile_app_concert/.../nav_graph.xml`
