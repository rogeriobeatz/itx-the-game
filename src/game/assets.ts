// Single manifest for swappable art. Replace files here to upgrade visuals.
import francis from "@/assets/portrait-francis.jpg";
import mikey from "@/assets/portrait-mikey.jpg";
import otto from "@/assets/portrait-otto.jpg";
import mumuzinho from "@/assets/portrait-mumuzinho.jpg";
import titleBg from "@/assets/title-bg.jpg";
import logo from "@/assets/intergalaxy-logo.png.asset.json";

export const PORTRAITS: Record<string, string> = { francis, mikey, otto, mumuzinho };
export const TITLE_BG = titleBg;
export const LOGO_URL = logo.url;
