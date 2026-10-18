# Interface design decisions

The October 2026 UI review informed the shared material system in `apps/web/src/materials.css` and the navigation/footer in `components/SiteChrome.tsx`.

## Adopted

- Replace the competing charcoal/lime and navy/mint palettes with one dark/light token source.
- Name navigation, card, typing-well and chip materials. Existing panel/surface aliases point to these materials so screens share the same palette.
- Reserve backdrop blur and saturation for the header. Cards, controls, heatmaps and animated game elements use inexpensive translucent fills, borders and highlights.
- Give the practice stage a larger outer frame and a quiet inset typing well. Compact statistic and activity cards have smaller radii and lower elevation.
- Apply the material vocabulary to inputs, keyboard guides, achievements, tables and game stages.
- Strengthen light-theme color fields and contrast, and update browser theme-color when the selected theme changes.
- Consolidate the former header and explore chips into one header with primary navigation and compact workspace links. Mobile navigation supports Escape, focus restoration and dismissal after link selection.
- Replace the sparse footer with a practice invitation, grouped links, privacy context, source/license links and Ankit Pandey's author credit.
- Make the passage the only visible typing surface. Clicking or tabbing into it focuses a visually hidden native textarea for keyboard/IME capture; typing starts on the first keystroke. No separate empty input is shown.

## Deliberately retained or adjusted

- CSS font weight 750 is valid; a non-variable installed font may map it to an available weight. Arbitrarily limiting all weights to 650 would not improve hierarchy.
- Local system sans and monospace fonts preserve offline availability and avoid another font download. A remote display font is not required for a coherent interface.
- Transparency is tuned per theme and surface rather than applying a universal 12–35% alpha. The header is denser for navigation clarity, and light-mode cards need more fill for readability.
- Nested controls do not each need backdrop blur. A shared translucent material is sufficient and avoids adding compositing work during typing.
- The footer uses a translucent fill without live blur. Native select options retain an opaque background for legibility.
- Reduced motion, reduced transparency, visible focus and textual game metrics remain supported. These decisions do not constitute a formal accessibility certification or measured frame-rate improvement.
