// Manifest for fictional cast portraits. Avoid personal names/likeness identifiers.
import patriarca from "@/assets/portrait-patriarca.jpg";
import carimbo from "@/assets/portrait-carimbo.jpg";
import fantasma from "@/assets/portrait-fantasma.jpg";
import profetaKpi from "@/assets/portrait-profeta-kpi.jpg";
import titleBg from "@/assets/title-bg.jpg";
import logo from "@/assets/intergalaxy-logo.png.asset.json";

export const PORTRAITS: Record<string, string> = {
  patriarca, carimbo, fantasma, profeta_kpi: profetaKpi,
};
export const TITLE_BG = titleBg;
export const LOGO_URL = logo.url;
