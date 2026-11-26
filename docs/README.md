# expo-morph-menu — documentation / tài liệu

| | English | Tiếng Việt |
| --- | --- | --- |
| **Architecture** — how it works and why · **Kiến trúc** — hoạt động ra sao, vì sao | [en/ARCHITECTURE.md](en/ARCHITECTURE.md) | [vi/ARCHITECTURE.md](vi/ARCHITECTURE.md) |
| **Integration guide** — install, set up, configure, test · **Hướng dẫn tích hợp** | [en/INTEGRATION.md](en/INTEGRATION.md) | [vi/INTEGRATION.md](vi/INTEGRATION.md) |
| **Custom UI (slots)** — use your own UI kit · **Tuỳ biến UI (slot)** | [en/CUSTOM-UI.md](en/CUSTOM-UI.md) | [vi/CUSTOM-UI.md](vi/CUSTOM-UI.md) |
| **Diagrams** (draw.io, 7 pages) · **Sơ đồ** (draw.io, 7 trang) | [diagrams/expo-morph-menu.en.drawio](diagrams/expo-morph-menu.en.drawio) | [diagrams/expo-morph-menu.vi.drawio](diagrams/expo-morph-menu.vi.drawio) |
| Performance notes & measurements · Ghi chú hiệu năng & số đo | — | [PERFORMANCE.md](PERFORMANCE.md) |

## Diagrams / Sơ đồ

1. Architecture · Kiến trúc
2. Opening sequence · Luồng mở
3. Closing sequence · Luồng đóng
4. State machines (`handoff`, menu mode) · Máy trạng thái
5. Full-screen shell: layers & timeline · Vỏ full screen: các lớp & dòng thời gian
6. Custom UI: slots & contract · Tuỳ biến UI: slot & hợp đồng

Open the `.drawio` files with [app.diagrams.net](https://app.diagrams.net), draw.io desktop, or the VS Code "Draw.io Integration" extension; export PNG/SVG from there.

Mở file `.drawio` bằng [app.diagrams.net](https://app.diagrams.net), draw.io desktop hoặc extension "Draw.io Integration" của VS Code; xuất PNG/SVG từ đó.

**Editing / Chỉnh sửa:** the diagrams are generated — edit [`diagrams/build.mjs`](diagrams/build.mjs) (one layout, labels in both languages), then run / sơ đồ được sinh tự động — sửa `build.mjs` rồi chạy:

```bash
node docs/diagrams/build.mjs            # → expo-morph-menu.{en,vi}.drawio
node docs/diagrams/preview.mjs vi       # quick HTML preview, no draw.io needed / xem trước nhanh

# SVG for README & docs (needs draw.io desktop) / SVG cho README và tài liệu (cần draw.io desktop)
DRAWIO_BIN="/path/to/draw.io" node docs/diagrams/export-svg.mjs   # → docs/diagrams/svg/{en,vi}/*.svg
```

The SVGs keep an embedded copy of the diagram (open them in draw.io to edit) and render on a white background in GitHub light and dark mode. / SVG có kèm dữ liệu sơ đồ (mở bằng draw.io để sửa) và có nền trắng, đọc rõ ở cả chế độ sáng lẫn tối của GitHub.
