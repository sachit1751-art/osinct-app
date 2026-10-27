# GSAP Cinematic Motion & UX Enhancement Plan

Upgrade Osinct's search and intelligence workspace with hardware-accelerated GSAP animations, cinematic easing, interactive search input depth parallax, and staggered payload inspection reveals—strictly avoiding AI slop.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core choreography preferences were confirmed during Phase 1:
> - **Motion Choreography**: Smooth cinematic easing with layered depth parallax (`power3.out`, `expo.out`) rather than aggressive spring bounce or abrupt linear transitions.
> - **Priority Focus Areas**: Search input interactive depth states, staggered results and status transitions, and fluid admin/maintenance panel folding.
> - **Anti-Slop Restraint**: Zero decorative status dots, zero fake telemetry tickers, zero comic neon glows. All animations are purposeful, lightweight compositor transforms (`transform`, `opacity`, `filter`).

---

## 1. Overview & Core Concept

- **What It Delivers**: A high-end intelligence workstation experience where every interaction—searching, switching to admin mode, error recovery, and payload inspection—flows with cinematic physics.
- **Target Persona**: Analysts, security researchers, and developers inspecting identifiers and numbers who need a calm, high-precision dark terminal atmosphere.
- **Key Value**: Replaces abrupt DOM pops and static blocks with tactile, fluid state transitions that guide the user's focus effortlessly.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Workspace Entrance**:
   - Initial page load triggers a synchronized staggered entrance timeline: topbar slides gently down from -12px with a smooth fade, followed by the decrypted title and query card with a slight depth scale (`0.98` to `1.0`).
2. **Search Input Micro-Interactions**:
   - Focus state: Subtle 3D tilt / radial spotlight parallax following cursor coordinates across the search wrapper with a soft cobalt bloom (`rgba(59, 130, 246, 0.25)`).
   - Typing & Clearing: Clear button smoothly scales in with an elastic settle; submit button indicates active readiness.
3. **Search Execution & Loading Wave**:
   - On search trigger, the input pulses with a subtle focus compression, the search button reveals a spinning radar glyph, and the results container expands smoothly while old results cross-fade out.
4. **Staggered Results & Payload Reveal**:
   - When API data arrives, the response container does not abruptly appear; instead, GSAP animates the card height dynamically (`flip` / `autoHeight`), followed by a staggered line-by-line or section-by-section reveal with a soft blur fade (`filter: blur(4px)` to `blur(0px)`).
5. **Admin Drawer Transition**:
   - Toggling the Admin panel smoothly unfolds the controls with an accordion-like ease curve (`expo.inOut`), shifting lower elements down with native momentum.

### Visual Identity & Theme

- **Palette**: Deep Obsidian `#070b14` canvas, Midnight Slate `#0d1527` structural cards, `#17233f` hairline borders, and Precision Cobalt `#3b82f6` for primary focus and CTAs.
- **Typography**: Clean display sans paired with tabular monospace numerals for all telemetry and payload data.
- **Motion Parameters**:
  - Durations: Micro-interactions: 150ms–250ms; Panel reveals: 400ms–600ms; Stagger deltas: 35ms–50ms.
  - Easing Curves: `power3.out` (default deceleration), `expo.out` (cinematic entrance), `power2.inOut` (accordion folding).
  - Accessibility: Full fallback to immediate zero-latency transforms when `prefers-reduced-motion: reduce` is detected.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: GSAP Core + React `useGSAP` hook vs CSS Keyframes**
  - *Chosen Approach*: Install lightweight `gsap` with `@gsap/react` for scoped timeline management and automatic garbage collection on component unmount.
  - *Why*: Complex chained choreographies (e.g., smoothly resizing response card height based on payload dimensions before staggering lines) require programmatic timeline control that CSS transitions cannot achieve without layout glitches.
  - *Alternatives Considered*: Pure CSS transitions (limited to fixed heights, lacks coordinate tracking for parallax) or Framer Motion (heavier bundle size in React 19).

- **Decision 2: Compositor-Only Transforms**
  - *Chosen Approach*: Animate only `transform` (x, y, scale) and `opacity`, utilizing `will-change` on animating containers. Height expansion uses GSAP measured dimensions rather than animating CSS `height: auto` directly.
  - *Why*: 60fps/120fps buttery smooth performance without browser paint reflows or CPU spikes.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    OSINCT App Container                      │
│   (DotGridBackground: Deep Obsidian & Blueprint Matrix)       │
└──────────────────────────────┬───────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     ┌────────────────────┐          ┌────────────────────┐
     │ Topbar (Brand,     │          │ Intro Section      │
     │ Nav, Secure Shiny) │          │ (Decrypted Title,  │
     └─────────┬──────────┘          │ Status Meta Strip) │
               │                     └─────────┬──────────┘
               │                               │
               ▼                               ▼
     ┌────────────────────────────────────────────────────┐
     │ Search Control Center (GSAP Cursor Parallax)       │
     │ - Glowing Hairline & Coordinate Spotlighting       │
     │ - Quick Input Clearing & Animated Submit State     │
     └─────────────────────────┬──────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     ┌────────────────────┐          ┌────────────────────┐
     │ Admin Panel Drawer │          │ Results Viewport   │
     │ (GSAP Accordion    │          │ - Height Morphing  │
     │ Slide & Fade)      │          │ - Staggered Lines  │
     └────────────────────┘          │ - Copy & Actions   │
                                     └────────────────────┘
```

### Component & Hook Lifecycle

1. **`useWorkspaceAnimations` Hook**:
   - Encapsulates GSAP timelines for:
     - Header & hero entrance timeline.
     - Search card cursor tilt / spotlight tracking.
     - Results container transition (idle → loading → success/error).
     - Admin drawer open/close smooth collapse.
2. **Interactive Event Mapping**:
   - Mouse move on `.search-panel`: triggers subtle 3D parallax tilt (max 3 degrees) and radial glow repositioning.
   - Form submission: triggers timeline sequence animating button state, status message, and response container.
   - Result delivery: measures target element, tweens height, and staggers text/token rows into view.
