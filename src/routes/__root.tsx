import {useEffect, useState, type ReactNode} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import {initAppearance} from "@/hooks/use-appearance";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import appCss from "@/index.css?url";

const TITLE = "Трынделка — мессенджер";
const DESCRIPTION = "Трынделка — болтай без забот: быстро, просто и по-своему!";
const OG_IMAGE = "https://cdn.poehali.dev/projects/***/files/og-image-1789671153859.jpg";

const APPEARANCE_SCRIPT = `(function () {
  try {
    var a = JSON.parse(localStorage.getItem("trindelka_appearance") || "{}");
    var light = a.theme === "light" || (a.theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    var r = document.documentElement;
    r.classList.add(light ? "light" : "dark");
    r.style.colorScheme = light ? "light" : "dark";
    var m = document.querySelector('meta[name="theme-color"]');
    if (m && light) m.setAttribute("content", "#f6f6fb");
  } catch (e) {}
})();`;

const METRIKA_SCRIPT = `(function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(101026698, "init", {
    trustedDomains: ["poehali.dev"],
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: true
});`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"},
            {name: "apple-mobile-web-app-capable", content: "yes"},
            {name: "mobile-web-app-capable", content: "yes"},
            {name: "apple-mobile-web-app-status-bar-style", content: "black-translucent"},
            {name: "theme-color", content: "#0d0d14"},
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "author", content: "poehali.dev"},
            {property: "og:title", content: TITLE},
            {property: "og:description", content: DESCRIPTION},
            {property: "og:image:width", content: "4800"},
            {property: "og:image:height", content: "2520"},
            {property: "og:image:alt", content: "Поехали! — сервис разработки сайтов с помощью ИИ"},
            {property: "og:image", content: OG_IMAGE},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: appCss},
            {rel: "preconnect", href: "https://fonts.googleapis.com"},
            {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
            {rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;900&display=swap"},
            {rel: "icon", type: "image/svg+xml", href: "/favicon.svg"},
            {rel: "manifest", href: "/manifest.webmanifest"},
            {rel: "apple-touch-icon", href: "/icons/icon-192.png"},
        ],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            {children: APPEARANCE_SCRIPT},
            {children: METRIKA_SCRIPT},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function RootComponent() {
    const [queryClient] = useState(() => new QueryClient());

    useEffect(() => {
        initAppearance();
    }, []);

    return (
        <RootDocument>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <Toaster/>
                    <Sonner/>
                    <Outlet/>
                </TooltipProvider>
            </QueryClientProvider>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru" suppressHydrationWarning>
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <noscript>
            <div><img src="https://mc.yandex.ru/watch/101026698" style={{position: "absolute", left: "-9999px"}} alt=""/></div>
        </noscript>
        <Scripts/>
        </body>
        </html>
    );
}
