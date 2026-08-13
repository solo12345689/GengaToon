# Genga Toon

Genga Toon is a modern, premium anime catalog and streaming platform. Built with React (Vite) on the frontend and Python FastAPI on the backend, it provides a seamless, dynamic, and visually stunning way to discover, search, and watch anime.

## Features

- **Premium UI/UX:** A stunning, modern design system featuring glassmorphism, responsive grids, and subtle micro-animations.
- **Full Catalog Discovery:** Browse trending anime, the latest movies, and series directly on the home page.
- **Categorized Browsing:** Filter and explore anime across dozens of genres (Action, Romance, Isekai, etc.).
- **Live Search:** Fast, debounced live search to quickly find exactly what you want to watch.
- **Built-in Watchlist:** Save anime to your personal Watchlist (persisted locally in your browser).
- **Native HLS Playback:** Uses `hls.js` to play anime episodes smoothly, bypassing cross-origin (CORS) blocks via a custom proxy.

## Tech Stack

- **Frontend:** React, Vite, CSS3
- **Backend:** Python, FastAPI, Uvicorn
- **Video Player:** `hls.js` natively integrated with the `<video>` element.

## Local Development

### Requirements
- Node.js & npm
- Python 3.10+

### Setup

1. **Start the Frontend (Vite Server)**
   ```bash
   npm install
   npm run dev
   ```
   The frontend runs by default on `http://localhost:5173`.

2. **Start the Backend (FastAPI)**
   Ensure you have the required Python packages:
   ```bash
   pip install fastapi uvicorn curl_cffi
   ```
   Start the proxy server:
   ```bash
   python server.py
   ```
   The backend API runs on `http://0.0.0.0:3000`.

## Architecture Note

Genga Toon leverages a robust Python middleware (`server.py`) to scrape metadata and extract `.m3u8` video streams from upstream providers. It proxies the HLS manifest and segments on the fly, seamlessly rewriting relative URLs to bypass strict CORS and Referer restrictions, allowing for direct, native playback in the browser.
