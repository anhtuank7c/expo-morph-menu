# Lớp dữ liệu của ví dụ mạng xã hội

[English](DATA-LAYER.md) | **Tiếng Việt**

Ví dụ mạng xã hội tải dữ liệu theo cách một ứng dụng production giao tiếp với REST API: Redux Toolkit, RTK Query, JWT access token và refresh token, thử lại theo exponential backoff. Backend là một bản giả lập chạy bên trong ứng dụng, nên ứng dụng chạy được khi offline và không cần server. Chỉ có hàm `fetch` được thay thế; code phía client giống hệt code bạn dùng với một API thật.

Phần này không thuộc package `expo-morph-menu`. Nó chỉ có mặt để ví dụ thể hiện menu trong một ứng dụng sát với thực tế. Ví dụ cơ bản (`example/`) không dùng phần này. Cấu trúc thư mục của ứng dụng được mô tả trong [README](../README.vi.md#cấu-trúc-code).

## Các file

| File | Nội dung |
| --- | --- |
| `src/core/http/baseQuery.ts` | Base query của RTK Query: bearer token, refresh token, thử lại theo backoff, idempotency key, log request |
| `src/core/http/backoff.ts` | Độ trễ backoff với full jitter, đọc header `Retry-After`, sleep có thể hủy |
| `src/core/http/jwt.ts` | Mã hóa JWT cho mock server (chữ ký không phải mật mã thật) và `decodeJwt` cho client |
| `src/core/http/networkLog.ts` | Slice chứa log các lần gửi HTTP cho màn debug |
| `src/core/session/authSlice.ts` | Trạng thái phiên: status, token, thời điểm hết hạn, số lần refresh, lỗi gần nhất |
| `src/core/api/api.ts` | API slice của RTK Query. Các feature thêm endpoint bằng `injectEndpoints` |
| `src/core/api/dto.ts` | Kiểu request và response của REST API |
| `src/backend/mockServer.ts` | REST backend tổng quát trong bộ nhớ, cung cấp dưới dạng hàm `fetch`: định tuyến, độ trễ, xác thực JWT, idempotency key, giả lập lỗi |
| `src/backend/server.ts`, `seed.ts` | Các route của Murmur và dữ liệu ban đầu |
| `src/features/devtools/ui/NetworkPanel.tsx` | Màn debug: phiên, đếm ngược token, giả lập lỗi, log request |
| `test/api.test.cjs` | Kiểm thử theo kịch bản (`npm run test:api`) |

## Vòng đời của một request

Với mỗi request, base query thực hiện:

1. Thêm `Authorization: Bearer <access token>` lấy từ slice `auth`.
2. Với `POST` và `PATCH`, thêm header `Idempotency-Key`. Key được tạo một lần cho mỗi request logic và dùng lại ở mọi lần thử lại.
3. Nếu access token hết hạn trong vòng 5 giây, refresh token trước khi gửi request (refresh chủ động).
4. Gửi request và ghi lần gửi vào slice `network`.
5. Khi nhận `401` với mã lỗi `token_expired`: refresh token một lần, rồi gửi lại request.
6. Khi gặp lỗi mạng, timeout, hoặc status `408`, `429`, `500`, `502`, `503`, `504`: chờ rồi thử lại, tối đa 3 lần. Thời gian chờ là giá trị `Retry-After` nếu server gửi, nếu không là một giá trị ngẫu nhiên từ 0 đến `min(5000, 300 * 2^n)` ms (full jitter).
7. Các lỗi khác được trả về cho nơi gọi, không thử lại.

Thao tác ghi được thử lại an toàn nhờ idempotency key: nếu server đã ghi xong nhưng response bị mất, lần thử lại nhận về response đã lưu thay vì tạo thêm một bản ghi thứ hai.

## Refresh token

```
request ──> 401 token_expired
              │
              ▼
        đang refresh? ──có──> chờ lần refresh đó ──┐
              │ không                               │
              ▼                                     │
      POST /auth/refresh (rotation)                 │
        │                │                          │
       200              401                         │
        │                │                          │
 tokensRefreshed   sessionExpired ──> đăng xuất     │
        │                                           │
        └──────────────> gửi lại request <──────────┘
```

- Single flight: các request đồng thời cùng nhận `401` dùng chung một lần gọi refresh. Gửi nhiều lần refresh song song còn kích hoạt cơ chế phát hiện dùng lại token của server.
- Rotation: mỗi lần refresh trả về một refresh token mới và vô hiệu hóa token cũ.
- Phát hiện dùng lại: gửi một refresh token đã dùng sẽ thu hồi toàn bộ phiên (mọi token sinh ra từ cùng một lần đăng nhập). Riêng lần thử lại trong vòng 10 giây sau khi mất response của refresh sẽ nhận lại đúng cặp token mới đó.
- Khi refresh bị từ chối, slice `auth` chuyển sang `signedOut` kèm lý do. Một listener trong store của ứng dụng xóa cache của RTK Query, và `Stack.Protected` đưa người dùng về màn đăng nhập.

Access token sống 60 giây, nên việc refresh diễn ra ngay trong lúc dùng ứng dụng.

## Giả lập lỗi

Mock server giả lập các lỗi sau, với xác suất cho mỗi request:

| Lỗi | Low | High | Cách client xử lý |
| --- | --- | --- | --- |
| Lỗi mạng trước khi request tới server | 3% | 8% | Thử lại theo backoff |
| `503 Service Unavailable` | 8% | 20% | Thử lại theo backoff |
| `429 Too Many Requests` kèm `Retry-After: 1` | 3% | 8% | Thử lại sau 1 giây |
| Mất response sau khi thao tác ghi đã được lưu | 4% | 10% | Thử lại với cùng idempotency key, server trả lại response đã lưu |

Mức mặc định là `low`. Đổi mức trên màn Network, hoặc chạy Metro với `EXPO_PUBLIC_API_CHAOS=off|low|high`.

## Màn Network

Màn Network (`src/features/devtools/ui/NetworkPanel.tsx`) hiển thị:

- Trạng thái phiên, id người dùng, đếm ngược access token, số lần refresh, lỗi gần nhất.
- "Expire access token": request kế tiếp nhận `401 token_expired`, log hiển thị lần refresh và request được gửi lại.
- "Revoke session": lần refresh kế tiếp thất bại và phiên kết thúc.
- Mức giả lập lỗi.
- Mỗi lần gửi HTTP là một dòng log, gồm status, số lần thử lại, thời gian và việc client làm tiếp theo.

## Kiểm thử

```bash
npm run test:api
```

Bộ kiểm thử transpile mã nguồn TypeScript, dựng một Redux store thật với RTK Query, rồi chạy các kịch bản sau với mock server:

| Kịch bản | Nội dung kiểm tra |
| --- | --- |
| Đăng nhập và request cần xác thực | Token được lưu, header `Authorization` được chấp nhận |
| Sai mật khẩu | `401 invalid_credentials`, không thử lại |
| Token hết hạn, 5 request song song | Đúng một lần gọi refresh, cả 5 request thành công |
| Token sắp hết hạn | Refresh trước khi gửi request |
| Phiên bị thu hồi | Refresh thất bại, phiên kết thúc với `session_revoked` |
| Dùng lại refresh token | Lần thử lại nhanh được chấp nhận, lần dùng lại sau đó thu hồi phiên |
| Lỗi mạng rồi 503 | 3 lần gửi, lần thứ ba thành công |
| Mất response của POST | Lần thử lại nhận response đã lưu, bản ghi chỉ được tạo một lần |
| 429 | Chờ theo `Retry-After` |
| 404 | Không thử lại |

Lỗi được tạo bằng một nguồn số ngẫu nhiên có kịch bản, nên kết quả kiểm thử luôn giống nhau.

## Dùng với backend thật

- Trong `src/core/api/api.ts`, bỏ `fetchFn: server.fetch` khỏi `createBaseQuery` và đặt `baseUrl` là địa chỉ API của bạn. Sau đó xóa `src/backend/`.
- Lưu refresh token bằng `expo-secure-store` và khôi phục khi ứng dụng khởi động.
- Giữ thời gian sống của access token ngắn, và dùng đúng mã lỗi server của bạn trả về khi token hết hạn (ở đây là `token_expired`).
- Đảm bảo server loại bỏ thao tác ghi trùng theo `Idempotency-Key`, hoặc tắt thử lại cho thao tác ghi bằng `extraOptions: { retry: false }`.
