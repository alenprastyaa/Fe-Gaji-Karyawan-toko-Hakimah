const DEFAULT_SEO = {
  title: "Toko Hakimah | Website Resmi dan Aplikasi Administrasi Karyawan",
  description:
    "Toko Hakimah adalah website resmi untuk informasi brand dan akses aplikasi administrasi, bon karyawan, serta operasional internal Toko Hakimah.",
  image: "https://tokohakimah.my.id/og-cover.svg",
  url: "https://tokohakimah.my.id/",
  type: "website",
};

const ensureMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const ensureCanonical = (href) => {
  let link = document.head.querySelector("link[rel='canonical']");

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
};

const ensureJsonLd = (data) => {
  let script = document.head.querySelector("script[data-seo='json-ld']");

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo", "json-ld");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
};

export const applySeo = (route) => {
  const seo = {
    ...DEFAULT_SEO,
    ...(route.meta?.seo ?? {}),
  };

  document.title = seo.title;
  ensureCanonical(seo.url);

  ensureMeta("meta[name='description']", { name: "description", content: seo.description });
  ensureMeta("meta[name='robots']", {
    name: "robots",
    content: route.meta?.robots ?? "index, follow, max-image-preview:large",
  });
  ensureMeta("meta[property='og:title']", { property: "og:title", content: seo.title });
  ensureMeta("meta[property='og:description']", {
    property: "og:description",
    content: seo.description,
  });
  ensureMeta("meta[property='og:type']", { property: "og:type", content: seo.type });
  ensureMeta("meta[property='og:url']", { property: "og:url", content: seo.url });
  ensureMeta("meta[property='og:image']", { property: "og:image", content: seo.image });
  ensureMeta("meta[name='twitter:card']", { name: "twitter:card", content: "summary_large_image" });
  ensureMeta("meta[name='twitter:title']", { name: "twitter:title", content: seo.title });
  ensureMeta("meta[name='twitter:description']", {
    name: "twitter:description",
    content: seo.description,
  });
  ensureMeta("meta[name='twitter:image']", { name: "twitter:image", content: seo.image });

  ensureJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Toko Hakimah",
        url: "https://tokohakimah.my.id/",
        logo: "https://tokohakimah.my.id/favicon.ico",
        sameAs: ["https://tokohakimah.my.id/"],
      },
      {
        "@type": "WebSite",
        name: "Toko Hakimah",
        url: "https://tokohakimah.my.id/",
        description: DEFAULT_SEO.description,
        inLanguage: "id-ID",
      },
      {
        "@type": "WebPage",
        name: seo.title,
        url: seo.url,
        description: seo.description,
      },
    ],
  });
};
