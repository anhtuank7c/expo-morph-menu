# Documentation

**English** | [Tiếng Việt](README.vi.md)

| Document | Contents |
| --- | --- |
| [Integration guide](en/INTEGRATION.md) | Installation, setup, configuration, testing, troubleshooting |
| [Custom UI](en/CUSTOM-UI.md) | Slots, the slot contract, examples for common UI kits |
| [Architecture](en/ARCHITECTURE.md) | Route boundary, opening and closing sequences, hand-off, web specifics |
| [Performance](en/PERFORMANCE.md) | Optimizations, measurement methods, test results |

## Diagrams

The diagrams are generated from a single layout with labels in both languages.

| Page | Diagram | SVG |
| --- | --- | --- |
| 1 | Architecture | [en](diagrams/svg/en/1-architecture.svg), [vi](diagrams/svg/vi/1-architecture.svg) |
| 2 | Opening sequence | [en](diagrams/svg/en/2-opening.svg), [vi](diagrams/svg/vi/2-opening.svg) |
| 3 | Closing sequence | [en](diagrams/svg/en/3-closing.svg), [vi](diagrams/svg/vi/3-closing.svg) |
| 4 | State machines (`handoff`, menu mode) | [en](diagrams/svg/en/4-states.svg), [vi](diagrams/svg/vi/4-states.svg) |
| 5 | Full-screen container: layers and timeline | [en](diagrams/svg/en/5-shell.svg), [vi](diagrams/svg/vi/5-shell.svg) |
| 6 | Custom UI: slots and contract | [en](diagrams/svg/en/6-slots.svg), [vi](diagrams/svg/vi/6-slots.svg) |
| 7 | Overview (used at the top of the README) | [en](diagrams/svg/en/0-overview.svg), [vi](diagrams/svg/vi/0-overview.svg) |

Sources: [`diagrams/expo-morph-menu.en.drawio`](diagrams/expo-morph-menu.en.drawio) and [`diagrams/expo-morph-menu.vi.drawio`](diagrams/expo-morph-menu.vi.drawio). They open in [app.diagrams.net](https://app.diagrams.net), draw.io desktop, or the "Draw.io Integration" extension for VS Code.

### Editing the diagrams

The `.drawio` files are generated. Edit [`diagrams/build.mjs`](diagrams/build.mjs), then regenerate:

```bash
node docs/diagrams/build.mjs            # writes expo-morph-menu.{en,vi}.drawio
node docs/diagrams/preview.mjs en       # approximate HTML preview, no draw.io required

# SVG export, requires draw.io desktop
DRAWIO_BIN="/path/to/draw.io" node docs/diagrams/export-svg.mjs   # writes diagrams/svg/{en,vi}/*.svg
```

The exported SVG files embed the diagram source, so they can be opened and edited in draw.io. They use a white background, which keeps them readable in both the light and dark themes of GitHub.

draw.io desktop: <https://github.com/jgraph/drawio-desktop/releases>
