import os
import re
import requests as req
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
import urllib.request, urllib.parse
from fastapi.middleware.cors import CORSMiddleware
from curl_cffi import requests as cffi_requests
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_HEADERS = {
    'User-Agent': 'okhttp/5.3.2',
    'Accept-Encoding': 'gzip',
}

def proxy_request(url: str, extra_headers: dict = None):
    headers = BASE_HEADERS.copy()
    if extra_headers:
        headers.update(extra_headers)
    try:
        response = req.get(url, headers=headers, timeout=8)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Proxy error for {url}: {e}")
        raise HTTPException(status_code=500, detail="Proxy request failed")

@app.get("/api/kyoto/post")
def kyoto_post(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing ID")
    return proxy_request(
        f"https://app.kyotoplayer.com/api/v4/post?id={id}",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anilab/home")
def anilab_home():
    return proxy_request(
        "https://anilab2.amdapi.click/api/home",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anilab/search")
def anilab_search(keyword: str = None, page: int = 1):
    if not keyword:
        raise HTTPException(status_code=400, detail="Missing keyword")
    return proxy_request(
        f"https://anilab2.amdapi.click/api/search?query={keyword}&page={page}",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anilab/post")
def anilab_post(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    return proxy_request(
        f"https://anilab2.amdapi.click/api/post?id={id}",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anilab/episodes")
def anilab_episodes(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    return proxy_request(
        f"https://play.anidb.app/api/anime/{id}/episodes",
        {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
    )

@app.get("/api/anilab/servers")
def anilab_servers(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    return proxy_request(
        f"https://play.anidb.app/api/episode/{id}/servers",
        {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
    )

@app.get("/api/anilab/iframe")
def anilab_iframe(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    return proxy_request(
        f"https://play.anidb.app/api/episode/{id}/iframe",
        {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
    )

@app.get("/api/anilab/embed")
def anilab_embed(url: str = None):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://play.anidb.app/'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read()
            
            # Create a response with the same HTML
            resp = Response(content=body, media_type="text/html")
            
            # Forward headers except the ones that block iframes
            for k, v in response.getheaders():
                if k.lower() not in ['x-frame-options', 'content-security-policy', 'transfer-encoding', 'content-encoding', 'content-length']:
                    resp.headers[k] = v
                    
            return resp
    except Exception as e:
        print(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/anilab/category")
def anilab_category(id: str = None, page: int = 1):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    return proxy_request(
        f"https://anilab2.amdapi.click/api/category?id={id}&page={page}",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anilab/categories")
def anilab_categories():
    return proxy_request(
        "https://anilab2.amdapi.click/api/categories",
        {
            'Accept': 'application/json',
            'os-version': '33',
            'app-id': 'com.kyotoplayer',
            'app-version': '126'
        }
    )

@app.get("/api/anidb/episodes")
def anidb_episodes(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing ID")
    return proxy_request(f"https://play.anidb.app/api/anime/{id}/episodes")

@app.get("/api/anidb/servers")
def anidb_servers(episodeId: str = None):
    if not episodeId:
        raise HTTPException(status_code=400, detail="Missing episodeId")
    return proxy_request(f"https://play.anidb.app/api/episode/{episodeId}/servers")

@app.get("/api/anidb/iframe")
def anidb_iframe(serverId: str = None):
    if not serverId:
        raise HTTPException(status_code=400, detail="Missing serverId")
    return proxy_request(
        f"https://play.anidb.app/api/episode/{serverId}/iframe",
        {
            'X-Requested-With': 'PLAY',
            'Referer': 'https://play.app/'
        }
    )

@app.get("/api/anidb/stream")
def anidb_stream(embedUrl: str = None):
    if not embedUrl:
        raise HTTPException(status_code=400, detail="Missing embedUrl")
    try:
        r = cffi_requests.get(embedUrl, impersonate='chrome110')
        match = re.search(r'file:\s*["\'](https?://.*?\.m3u8.*?)["\']', r.text, re.IGNORECASE)
        if match:
            return {"streamUrl": match.group(1)}
        else:
            raise HTTPException(status_code=404, detail="Stream URL not found in embed source")
    except Exception as e:
        print(f"Error extracting stream: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract stream link")

@app.get("/watch", response_class=HTMLResponse)
def watch(m3u8: str = None):
    if not m3u8:
        return "Missing m3u8"
    return f"""
        <!DOCTYPE html>
        <html><head>
        <title>Player</title>
        <style>body,html{{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}}</style>
        </head>
        <body>
        <video id="video" controls autoplay style="width:100%;height:100%;"></video>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
        <script>
            var video = document.getElementById('video');
            var source = '{m3u8}';
            if (Hls.isSupported()) {{
                var hls = new Hls();
                hls.loadSource(source);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {{ video.play(); }});
            }} else if (video.canPlayType('application/vnd.apple.mpegurl')) {{
                video.src = source;
                video.addEventListener('loadedmetadata', function() {{ video.play(); }});
            }}
        </script>
        </body></html>
    """

@app.get("/api/anilab/stream")
def anilab_stream(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
        
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    # 1. Get the iframe URL
    import json
    iframe_url = f"https://play.anidb.app/api/episode/{id}/iframe"
    try:
        req1 = urllib.request.Request(iframe_url, headers=headers)
        with urllib.request.urlopen(req1, timeout=10) as r1:
            data = json.loads(r1.read())
            embed_url = data.get("link")
            if not embed_url:
                raise Exception("No embed link found")
                
        # 2. Get the HTML of the embed page
        headers['Referer'] = 'https://play.anidb.app/'
        req2 = urllib.request.Request(embed_url, headers=headers)
        with urllib.request.urlopen(req2, timeout=10) as r2:
            html = r2.read().decode('utf-8')
            
            # 3. Extract the .m3u8 link from the JWPlayer sources array
            import re
            match = re.search(r"sources:\s*\[\s*\{\s*file:\s*'(https?://[^']+\.m3u8)'", html)
            if match:
                return {"url": match.group(1)}
            else:
                raise Exception("Could not find m3u8 source in html")
                
    except Exception as e:
        print(f"Stream error: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/anilab/stream")
def anilab_stream(id: str = None):
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
        
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    # 1. Get the iframe URL
    import json
    iframe_url = f"https://play.anidb.app/api/episode/{id}/iframe"
    try:
        req1 = urllib.request.Request(iframe_url, headers=headers)
        with urllib.request.urlopen(req1, timeout=10) as r1:
            data = json.loads(r1.read())
            embed_url = data.get("link")
            if not embed_url:
                raise Exception("No embed link found")
                
        # 2. Get the HTML of the embed page
        headers['Referer'] = 'https://play.anidb.app/'
        req2 = urllib.request.Request(embed_url, headers=headers)
        with urllib.request.urlopen(req2, timeout=10) as r2:
            html = r2.read().decode('utf-8')
            
            # 3. Extract the .m3u8 link from the JWPlayer sources array
            import re
            match = re.search(r"sources:\s*\[\s*\{\s*file:\s*'(https?://[^']+\.m3u8)'", html)
            if match:
                return {"url": match.group(1)}
            else:
                raise Exception("Could not find m3u8 source in html")
                
    except Exception as e:
        print(f"Stream error: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/anilab/hls_proxy")
def hls_proxy(url: str):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://play.anidb.app/',
        'Origin': 'https://play.anidb.app'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read()
            content_type = r.headers.get('Content-Type', '')
            
            if 'mpegurl' in content_type or url.endswith('.m3u8'):
                text = body.decode('utf-8')
                base_url = url.rsplit('/', 1)[0]
                lines = []
                for line in text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # absolute url
                        if line.startswith('http'):
                            target = line
                        # root relative
                        elif line.startswith('/'):
                            parsed = urllib.parse.urlparse(url)
                            target = f"{parsed.scheme}://{parsed.netloc}{line}"
                        # relative
                        else:
                            target = f"{base_url}/{line}"
                        
                        lines.append(f"/api/anilab/hls_proxy?url={urllib.parse.quote(target)}")
                    else:
                        lines.append(line)
                body = '\n'.join(lines).encode('utf-8')
                
            return Response(content=body, media_type=content_type, headers={'Access-Control-Allow-Origin': '*'})
    except Exception as e:
        print(f"HLS proxy error: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))

# Serve static files from Vite's 'dist' build directory
# Serve static files from Vite's 'dist' build directory
import os
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Allow API routes to pass through (though they should be matched first)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        # Serve index.html for all other routes
        return HTMLResponse(open("dist/index.html", "r", encoding="utf-8").read())
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=3000, reload=True)
