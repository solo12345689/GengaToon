# AniLab2 - Official API & Protocol Documentation

This document outlines the API endpoints, parameters, and flow required to fetch content, metadata, and play video streams from the AniLab2 ecosystem. The architecture relies on specific headers and sequential endpoint requests to bypass restrictions and extract the final HLS stream.

## Core Requirements & Headers

All requests to the upstream AniLab2 APIs **must** include the following headers. Without these, the server will return a 403 Forbidden or 401 Unauthorized response:

```http
Accept: application/json
os-version: 33
app-id: com.kyotoplayer
app-version: 126
```

---

## 1. Content Discovery Endpoints

These endpoints are used to discover anime titles, trending lists, and categories.

### 1.1 Home Dashboard
- **URL**: `https://anilab2.amdapi.click/api/home`
- **Method**: `GET`
- **Description**: Returns the curated home page structure including the "Featured/Hero" anime, and multiple sections (e.g., "Trending", "Recently Updated", "Top Airing").

### 1.2 Categories (Genres)
- **URL**: `https://anilab2.amdapi.click/api/categories`
- **Method**: `GET`
- **Description**: Returns a list of all available genres/categories (e.g., Action, Romance, Isekai) along with their respective Category IDs.

### 1.3 Category Details
- **URL**: `https://anilab2.amdapi.click/api/category?id={id}&page={page}`
- **Method**: `GET`
- **Parameters**:
  - `id`: The Category ID obtained from `/api/categories`
  - `page`: Pagination integer (default: 1)
- **Description**: Returns a paginated list of anime belonging to a specific genre.

### 1.4 Search
- **URL**: `https://anilab2.amdapi.click/api/search?query={keyword}&page={page}`
- **Method**: `GET`
- **Parameters**:
  - `keyword`: URL-encoded search string.
  - `page`: Pagination integer.
- **Description**: Queries the AniLab2 database for matching anime titles.

---

## 2. Anime Metadata & Episode Extraction

Once an anime ID is retrieved from the discovery endpoints, use these endpoints to drill down to the actual playable video.

### 2.1 Anime Details (Post)
- **URL**: `https://anilab2.amdapi.click/api/post?id={anime_id}`
- **Method**: `GET`
- **Description**: Returns full metadata for a specific anime, including synopsis, score, release date, related anime, and season links.

### 2.2 Episode List
- **URL**: `https://anilab2.amdapi.click/api/episodes?id={anime_id}`
- **Method**: `GET`
- **Description**: Returns a list of all available episodes for the given anime ID. Each episode object contains an `id` required for the next step.

### 2.3 Server List (Sources)
- **URL**: `https://anilab2.amdapi.click/api/servers?id={episode_id}`
- **Method**: `GET`
- **Description**: Returns a list of video servers (e.g., "HD-1", "HD-2", "SUB", "DUB") hosting the specific episode. Each server object contains an `id`.

---

## 3. Video Playback Protocol

Extracting the raw `.m3u8` video stream requires a multi-step proxy process, as the raw links are protected behind JWPlayer embeds and CORS restrictions.

### Step 3.1: Get Iframe / Embed Link
- **URL**: `https://play.anidb.app/api/episode/{server_id}/iframe`
- **Method**: `GET`
- **Headers**:
  ```http
  Accept: application/json
  User-Agent: Mozilla/5.0...
  ```
- **Description**: Using the server ID obtained in 2.3, fetch the JSON payload that contains the `link` to the web player embed.

### Step 3.2: Scrape Raw M3U8 from Embed
- **Action**: Perform an HTTP GET request to the `link` obtained in Step 3.1.
- **Headers**:
  - **Crucial**: You must set `Referer: https://play.anidb.app/`
- **Parsing**: The response is an HTML document. Parse the HTML using a regex (e.g., `sources: \[ \{ file: '(https?://[^']+\.m3u8)'`) to extract the master `.m3u8` stream URL from the JWPlayer configuration object.

### Step 3.3: HLS CORS Proxying
Directly playing the `.m3u8` URL in a browser will fail due to strict Cross-Origin Resource Sharing (CORS) policies enforced by the video CDN.
- **Action**: All `.m3u8` and `.ts` (MPEG-TS segment) requests must be routed through a backend proxy (e.g., your local `server.py`).
- **Proxy Responsibilities**:
  1. Forward the request to the CDN with headers `User-Agent: Mozilla/5.0...`, `Referer: https://play.anidb.app/`, and `Origin: https://play.anidb.app`.
  2. Read the returned `.m3u8` manifest file.
  3. Rewrite all internal paths/URLs inside the `.m3u8` manifest to point back to the proxy endpoint, ensuring the browser asks the proxy for the next segment rather than hitting the CDN directly.
  4. Return the manifest or video segment to the client with `Access-Control-Allow-Origin: *`.

### Step 3.4: Playback
Pass the localized proxy URL (e.g., `/api/anilab/hls_proxy?url={encoded_master_url}`) into an HLS-compatible video player like `hls.js`.
