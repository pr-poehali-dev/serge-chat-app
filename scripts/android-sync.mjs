import {execFileSync} from "node:child_process";
import {writeFileSync} from "node:fs";

const raw = (process.env.ANDROID_SITE_URL || "").trim().replace(/\/+$/, "");
if (!/^https:\/\/[^\s/]+$/.test(raw)) {
    console.error("Укажите адрес вашего сайта с https:// без пути, например:");
    console.error("  ANDROID_SITE_URL=https://chat.example.ru npm run android:sync");
    process.exit(1);
}

const config = {
    appId: "ru.trindelka.messenger",
    appName: "Трынделка",
    webDir: "android-web",
    android: {allowMixedContent: false},
    server: {url: `${raw}/app`, androidScheme: "https", cleartext: false, allowNavigation: [new URL(raw).host]},
};
writeFileSync("capacitor.config.json", JSON.stringify(config, null, 2) + "\n");
console.log(`Приложение будет открывать ${config.server.url}`);

execFileSync("npx", ["cap", "sync", "android"], {stdio: "inherit"});
