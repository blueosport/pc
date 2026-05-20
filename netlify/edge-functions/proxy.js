// Netlify Edge Function: Web proxy for Void Browser iframe embedding.
// Fetches external URLs server-side, strips X-Frame-Options and CSP
// frame-ancestors restrictions, and returns embeddable HTML with
// rewritten navigation links that keep browsing inside the proxy.

export default async function handler(req, context) {
  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new Response("Only http/https URLs are supported", { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
      redirect: "follow",
    });

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type") || "text/html";
    responseHeaders.set("Content-Type", contentType);

    // Intentionally NOT forwarding X-Frame-Options or Content-Security-Policy
    // so the proxied content can be displayed inside an iframe.
    responseHeaders.set(
      "Content-Security-Policy",
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; media-src * blob: data:; frame-src *;"
    );

    const ct = contentType.toLowerCase();

    if (ct.includes("text/html")) {
      let body = await upstream.text();

      // Determine base URL so that relative assets (CSS, JS, images) still load.
      const baseOrigin = target.origin;
      const basePath = target.pathname.endsWith("/")
        ? target.pathname
        : target.pathname.split("/").slice(0, -1).join("/") + "/";
      const baseHref = `${baseOrigin}${basePath}`;

      // Inject <base> tag so relative assets resolve correctly.
      if (/<head[\s>]/i.test(body)) {
        body = body.replace(/<head[\s>][^>]*>/i, (m) => m + `<base href="${baseHref}">`);
      } else {
        body = `<base href="${baseHref}">` + body;
      }

      // Rewrite absolute <a href> links to route through this proxy.
      body = body.replace(
        /(<a\b[^>]*?\s)href="(https?:\/\/[^"]+)"/gi,
        (_, before, href) => `${before}href="/proxy?url=${encodeURIComponent(href)}"`
      );
      body = body.replace(
        /(<a\b[^>]*?\s)href='(https?:\/\/[^']+)'/gi,
        (_, before, href) => `${before}href='/proxy?url=${encodeURIComponent(href)}'`
      );

      // Rewrite absolute <form action> to proxy.
      body = body.replace(
        /(<form\b[^>]*?\s)action="(https?:\/\/[^"]+)"/gi,
        (_, before, action) => `${before}action="/proxy?url=${encodeURIComponent(action)}"`
      );

      // Inject a small script that intercepts remaining relative-link navigation
      // (resolved via the <base> tag) and routes it through the proxy.
      const interceptScript = `<script>
(function(){
  var origin=location.origin;
  function toProxy(url){
    if(!url||/^(javascript:|#|mailto:|tel:|data:)/.test(url)) return url;
    try{
      var abs=new URL(url,document.baseURI||location.href).href;
      if(/^https?:\/\//.test(abs)&&abs.indexOf(origin+'/proxy?url=')<0)
        return origin+'/proxy?url='+encodeURIComponent(abs);
    }catch(e){}
    return url;
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(a&&a.href&&a.target!=='_blank'){
      var p=toProxy(a.href);
      if(p&&p!==a.href){e.preventDefault();location.href=p;}
    }
  },true);
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(f&&f.action){var p=toProxy(f.action);if(p!==f.action)f.action=p;}
  },true);
})();
</script>`;

      if (body.includes("</body>")) {
        body = body.replace("</body>", interceptScript + "</body>");
      } else {
        body += interceptScript;
      }

      return new Response(body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // Pass through non-HTML content (CSS, JS, images, video, fonts, etc.)
    const cl = upstream.headers.get("content-length");
    if (cl) responseHeaders.set("Content-Length", cl);
    const ce = upstream.headers.get("content-encoding");
    if (ce) responseHeaders.set("Content-Encoding", ce);
    const acc = upstream.headers.get("accept-ranges");
    if (acc) responseHeaders.set("Accept-Ranges", acc);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const errHtml = `<!DOCTYPE html>
<html>
<head><style>
  body{font-family:monospace;background:#06090f;color:#94a3b8;padding:24px;margin:0;}
  h2{color:#f87171;margin-bottom:12px;}
  .url{color:#60a5fa;word-break:break-all;}
  .hint{color:#475569;font-size:11px;margin-top:16px;border-top:1px solid #1e2a40;padding-top:12px;}
</style></head>
<body>
  <h2>&#9888; Unable to Load Page</h2>
  <p>Could not fetch: <span class="url">${esc(targetUrl)}</span></p>
  <p>Error: ${esc(String(err))}</p>
  <div class="hint">This site may block proxy access or require JavaScript to detect bots.
  Use the &#10187; button in the toolbar to open it directly in a new tab.</div>
</body>
</html>`;
    return new Response(errHtml, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const config = { path: "/proxy" };
