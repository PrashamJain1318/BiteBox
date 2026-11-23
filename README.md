# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
# BiteBox


## Restaurant-first Home (updated)

The Home page now displays 20 demo restaurants. Click a restaurant card to open its menu at `/restaurant/:restaurantId`. Each restaurant menu includes 8 items across burgers, pizza, sandwiches, and beverages. Menu item IDs are unique per restaurant so the cart can distinguish identical dishes ordered from different restaurants.

### Run locally

```bash
npm install
npm run dev
```

### Main files changed

- `src/data/restaurants.js` — 20 restaurant demo records and generated restaurant-specific menus
- `src/componets/Home.jsx` — restaurant listing, search, and cuisine filters
- `src/componets/RestaurantDetails.jsx` — restaurant detail and menu page
- `src/App.jsx` — added restaurant detail route
- `src/style.css` — restaurant cards, listing, filters, and detail page styles

**Demo data note:** Restaurant names, ratings, delivery times, and starting prices are sample values, not live restaurant listings or delivery estimates. Menu photos reuse the project's existing Pexels product images.
