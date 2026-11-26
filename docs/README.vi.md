# Tài liệu

[English](README.md) | **Tiếng Việt**

| Tài liệu | Nội dung |
| --- | --- |
| [Hướng dẫn tích hợp](vi/INTEGRATION.md) | Cài đặt, thiết lập, cấu hình, kiểm thử, xử lý sự cố |
| [Giao diện tùy chỉnh](vi/CUSTOM-UI.md) | Slot, quy ước của slot, ví dụ cho các bộ UI phổ biến |
| [Kiến trúc](vi/ARCHITECTURE.md) | Ranh giới route, trình tự mở và đóng, chuyển giao (hand-off), đặc thù trên web |
| [Hiệu năng](vi/PERFORMANCE.md) | Các tối ưu, phương pháp đo, kết quả kiểm thử |

## Sơ đồ

Các sơ đồ được tạo từ một layout duy nhất với nhãn bằng cả hai ngôn ngữ.

| Trang | Sơ đồ | SVG |
| --- | --- | --- |
| 1 | Kiến trúc | [en](diagrams/svg/en/1-architecture.svg), [vi](diagrams/svg/vi/1-architecture.svg) |
| 2 | Trình tự mở | [en](diagrams/svg/en/2-opening.svg), [vi](diagrams/svg/vi/2-opening.svg) |
| 3 | Trình tự đóng | [en](diagrams/svg/en/3-closing.svg), [vi](diagrams/svg/vi/3-closing.svg) |
| 4 | Máy trạng thái (`handoff`, chế độ menu) | [en](diagrams/svg/en/4-states.svg), [vi](diagrams/svg/vi/4-states.svg) |
| 5 | Container toàn màn hình: các lớp và dòng thời gian | [en](diagrams/svg/en/5-shell.svg), [vi](diagrams/svg/vi/5-shell.svg) |
| 6 | Giao diện tùy chỉnh: slot và quy ước | [en](diagrams/svg/en/6-slots.svg), [vi](diagrams/svg/vi/6-slots.svg) |
| 7 | Tổng quan (dùng ở đầu README) | [en](diagrams/svg/en/0-overview.svg), [vi](diagrams/svg/vi/0-overview.svg) |

Mã nguồn: [`diagrams/expo-morph-menu.en.drawio`](diagrams/expo-morph-menu.en.drawio) và [`diagrams/expo-morph-menu.vi.drawio`](diagrams/expo-morph-menu.vi.drawio). Có thể mở chúng bằng [app.diagrams.net](https://app.diagrams.net), draw.io desktop hoặc extension "Draw.io Integration" cho VS Code.

### Chỉnh sửa sơ đồ

Các file `.drawio` được tạo tự động. Chỉnh sửa [`diagrams/build.mjs`](diagrams/build.mjs), sau đó tạo lại:

```bash
node docs/diagrams/build.mjs            # ghi expo-morph-menu.{en,vi}.drawio
node docs/diagrams/preview.mjs en       # bản xem trước HTML gần đúng, không cần draw.io

# xuất SVG, cần draw.io desktop
DRAWIO_BIN="/path/to/draw.io" node docs/diagrams/export-svg.mjs   # ghi diagrams/svg/{en,vi}/*.svg
```

Các file SVG được xuất có nhúng mã nguồn sơ đồ, nên có thể mở và chỉnh sửa chúng trong draw.io. Chúng dùng nền trắng, giúp sơ đồ dễ đọc trong cả theme sáng và theme tối của GitHub.

draw.io desktop: <https://github.com/jgraph/drawio-desktop/releases>
