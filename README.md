# CompostMate

CompostMate is a PWA for urban Indian households to track composting activity, verify waste through AI image analysis, and compete with neighbors via society-based leaderboards. It uses a three-role model (resident, society admin, super admin) gated by invite codes, and an XP/badge system to drive engagement.

---

## Techniques

**[Tailwind CSS v4 `@theme` directive](https://tailwindcss.com/docs/theme)** — [`src/index.css`](./src/index.css) defines design tokens directly as CSS custom properties inside `@theme {}`, replacing the v3 `tailwind.config.js` `theme.extend` pattern. The same tokens are mirrored in `:root` for use outside Tailwind utilities.

**[Firebase singleton guard](https://firebase.google.com/docs/web/setup#initialize-sdk)** — [`src/lib/firebase.js`](./src/lib/firebase.js) uses `getApps().length > 0 ? getApp() : initializeApp(config)` to prevent duplicate app initialization during Vite HMR cycles.

**[`onSnapshot` real-time listeners](https://firebase.google.com/docs/firestore/query-data/listen)** — [`src/hooks/useBin.js`](./src/hooks/useBin.js) nests a Firestore `onSnapshot` subscriber inside `onAuthStateChanged`, so the live log stream automatically tears down and re-subscribes when the auth state changes. Both unsubscribers are returned from `useEffect` for clean teardown.

**Groq Vision structured output** — [`src/lib/gemini.js`](./src/lib/gemini.js) sends base64 image data to `llama-3.2-11b-vision-preview` with `response_format: { type: "json_object" }`, enforcing a typed response `{ category, weightEstimate, verified, description }` without post-parse guessing.

**n8n webhook with AI fallback** — The `analyzeCompostImage` function in [`src/lib/gemini.js`](./src/lib/gemini.js) first tries a configurable n8n webhook URL; if that's absent or throws, it falls back to direct Groq Vision. This makes the AI pipeline resilient across environments without branching the call site.

**[`useCallback` for stable context values](https://react.dev/reference/react/useCallback)** — [`src/context/NotificationContext.jsx`](./src/context/NotificationContext.jsx) wraps `showToast` and `showModal` in `useCallback` so consumers don't re-render on every provider render cycle.

**Promise-based modal pattern** — `showModal` in [`NotificationContext.jsx`](./src/context/NotificationContext.jsx) returns a `Promise` that resolves with the user's input value (or `null` on cancel), letting callers `await` modal confirmation inline without callback nesting.

**[`React.forwardRef`](https://react.dev/reference/react/forwardRef) on an inline component** — The `Button` component in [`src/screens/LandingPage.jsx`](./src/screens/LandingPage.jsx) is defined and forwarded in the same file, keeping the component co-located with its only consumer while still supporting ref forwarding.

**Leaflet default icon fix for Vite** — [`src/screens/Leaderboard.jsx`](./src/screens/Leaderboard.jsx) manually deletes `L.Icon.Default.prototype._getIconUrl` and re-merges CDN URLs. This is the standard workaround for Leaflet's broken asset resolution in Vite's module bundler.

**Client-side maturity progress from timestamps** — [`src/hooks/useBin.js`](./src/hooks/useBin.js) calculates `maturityProgress` at read time from the Firestore `timestamp` field using `(daysPassed / 30) * 100`, clamped to `[0, 100]`. No server-side scheduled job needed.

**[CSS custom scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar)** — [`src/index.css`](./src/index.css) styles `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, and `::-webkit-scrollbar-thumb` to match the dark surface theme.

---

## Libraries and Tools

| Library | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [Vite 8](https://vite.dev) | Build tool and dev server |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first CSS — uses the new [`@tailwindcss/vite`](https://github.com/tailwindlabs/tailwindcss/tree/next/packages/%40tailwindcss-vite) plugin, replacing the PostCSS pipeline |
| [Firebase v12 (Modular SDK)](https://firebase.google.com/docs/web/modular-upgrade) | Auth, Firestore, Storage, Cloud Messaging |
| [React Router DOM v7](https://reactrouter.com) | Client-side routing |
| [Leaflet v1.9.4](https://leafletjs.com) + [React Leaflet v5](https://react-leaflet.js.org) | Society heat map with `CircleMarker` and `Popup` |
| [Groq Cloud API](https://console.groq.com/docs/openai) | LLM chat (`llama-3.1-8b-instant`) and vision analysis (`llama-3.2-11b-vision-preview`) via an OpenAI-compatible endpoint |
| [n8n](https://n8n.io) | Self-hosted workflow automation — acts as the primary image verification pipeline before the Groq fallback |
| [OpenWeatherMap API](https://openweathermap.org/api) | City temperature fetch for composting condition context |
| [Poppins](https://fonts.google.com/specimen/Poppins) via Google Fonts | Primary typeface, weights 400–900 |

---

## Project Structure

```
CompostMate/
├── public/
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── lib/
│   └── screens/
├── .firebaserc
├── eslint.config.js
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── gemini.js
├── index.html
├── package.json
├── tailwind.config.js
├── test.js
└── vite.config.js
```

**[`src/lib/`](./src/lib/)** — Core integration layer. [`algorithms.js`](./src/lib/algorithms.js) implements the Carbon:Nitrogen ratio formula used to grade compost maturity. [`gemini.js`](./src/lib/gemini.js) handles both chat and vision calls to Groq. [`firebase.js`](./src/lib/firebase.js) exports named service instances and documents the Firestore schema in JSDoc comments.

**[`src/context/`](./src/context/)** — App-wide state providers. [`NotificationContext.jsx`](./src/context/NotificationContext.jsx) is the most complete — it provides both a toast and a promise-based modal system rendered into fixed overlays.

**[`src/hooks/`](./src/hooks/)** — Stateful data hooks that encapsulate Firebase subscriptions. [`useBin.js`](./src/hooks/useBin.js) is the primary real-time hook, computing derived maturity state from raw Firestore log timestamps.

**[`src/screens/`](./src/screens/)** — Route-level components, one per `react-router-dom` route. [`AdminDashboard.jsx`](./src/screens/AdminDashboard.jsx) and [`Analytics.jsx`](./src/screens/Analytics.jsx) are the most complex, each managing several parallel Firestore queries.

**[`firestore.rules`](./firestore.rules)** — Firestore security rules. Currently scoped to per-user document access; review before production use.

## Contributing
We welcome contributions from the community! Please check out our [Contributing Guide](CONTRIBUTING.md) for more information.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
Thank you to all the contributors and supporters who help make CompostMate a reality!
