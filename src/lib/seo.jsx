import { useEffect } from "react";

const SITE = "https://onion-setu.vercel.app";
const DEFAULT_IMAGE = `${SITE}/og-image.svg`;

export function useSeo({ title, description, canonical, image = DEFAULT_IMAGE, noindex = false }){
  useEffect(()=>{
    const fullTitle = title ? `${title} — OnionSetu` : "OnionSetu — Onion Quality Assessment";
    document.title = fullTitle;

    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setLink("canonical", canonical ? `${SITE}${canonical}` : SITE + window.location.pathname);

    // OG
    setMetaProperty("og:title", fullTitle);
    setMetaProperty("og:description", description || "");
    setMetaProperty("og:url", canonical ? `${SITE}${canonical}` : SITE + window.location.pathname);
    setMetaProperty("og:image", image);
    setMetaProperty("og:type", "website");
    // Twitter
    setMetaName("twitter:title", fullTitle);
    setMetaName("twitter:description", description || "");
    setMetaName("twitter:image", image);
    setMetaName("twitter:card", "summary_large_image");
  },[title, description, canonical, image, noindex]);
}

function setMeta(name, content){
  if(!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if(!el){ el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setMetaProperty(prop, content){
  if(!content) return;
  let el = document.querySelector(`meta[property="${prop}"]`);
  if(!el){ el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setMetaName(name, content){
  if(!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if(!el){ el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setLink(rel, href){
  let el = document.querySelector(`link[rel="${rel}"]`);
  if(!el){ el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

export function Breadcrumbs({ items }){
  // items: [{label, href}]
  const jsonLd = {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement": items.map((it,i)=>({
      "@type":"ListItem", position:i+1, name:it.label, item: `https://onion-setu.vercel.app${it.href}`
    }))
  };
  return (
    <>
      <nav aria-label="Breadcrumb" style={{fontSize:12, color:"#8a7a74", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
        {items.map((it,i)=>(
          <span key={it.href} style={{display:"flex", gap:6, alignItems:"center"}}>
            {i>0 && <span aria-hidden="true">›</span>}
            {i < items.length-1 ? <a href={it.href} style={{color:"#7A263A", fontWeight:600, textDecoration:"underline", textDecorationColor:"#EDE3DC", textUnderlineOffset:3}}>{it.label}</a> : <span aria-current="page" style={{fontWeight:700, color:"#17110F"}}>{it.label}</span>}
          </span>
        ))}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
    </>
  );
}
