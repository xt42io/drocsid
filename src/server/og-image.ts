import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { InvitePreview } from "../types/invites";

const width = 1200;
const height = 630;
const dmSansFonts = ["regular", "medium", "bold"].map((weight) =>
  [
    resolve(process.cwd(), `public/fonts/dm-sans-${weight}.ttf`),
    resolve(process.cwd(), `dist/client/fonts/dm-sans-${weight}.ttf`),
  ].find(existsSync),
);

if (dmSansFonts.some((font) => !font))
  throw new Error("Drocsid Open Graph font asset was not found.");
const dmSansFontFiles = dmSansFonts as string[];

const tones: Record<string, { background: string; foreground: string }> = {
  peach: { background: "#f2bc95", foreground: "#885130" },
  green: { background: "#d4dfbd", foreground: "#5f713e" },
  yellow: { background: "#eee1bb", foreground: "#8c733e" },
  purple: { background: "#e3dced", foreground: "#79648b" },
  blue: { background: "#d6e4e7", foreground: "#567984" },
};

const assetPromises = new Map<string, Promise<string>>();

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cleanText(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(value: string, maxCharacters: number, maxLines: number) {
  const words = cleanText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxCharacters || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join(" ").length;
  if (lines.length === maxLines && consumed < cleanText(value).length) {
    lines[maxLines - 1] =
      `${lines[maxLines - 1].slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
  }
  return lines.length ? lines : [""];
}

function textLines(lines: string[], x: number, y: number, lineHeight: number) {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

async function assetDataUri(filename: string) {
  let task = assetPromises.get(filename);
  if (!task) {
    task = (async () => {
      const candidates = [
        resolve(process.cwd(), `public/${filename}`),
        resolve(process.cwd(), `dist/client/${filename}`),
      ];
      for (const path of candidates) {
        try {
          const data = await readFile(path);
          return `data:image/png;base64,${data.toString("base64")}`;
        } catch {
          // Try the development or production asset location next.
        }
      }
      throw new Error(`Drocsid image asset ${filename} was not found.`);
    })();
    assetPromises.set(filename, task);
  }
  return task;
}

function render(svg: string) {
  return new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      fontFiles: dmSansFontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "DM Sans",
      sansSerifFamily: "DM Sans",
    },
    imageRendering: 0,
    textRendering: 1,
  })
    .render()
    .asPng();
}

function document(scene: string, content: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="scene-scrim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#080912" stop-opacity=".96"/>
        <stop offset=".5" stop-color="#080912" stop-opacity=".68"/>
        <stop offset="1" stop-color="#080912" stop-opacity=".18"/>
      </linearGradient>
      <linearGradient id="panel-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".10"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity=".01"/>
      </linearGradient>
      <filter id="panel-shadow" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="25" stdDeviation="24" flood-color="#000000" flood-opacity=".55"/>
      </filter>
      <filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="#080912"/>
    <image href="${scene}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${width}" height="${height}" fill="url(#scene-scrim)"/>
    ${content}
  </svg>`;
}

function brand(logo: string) {
  return `<image href="${logo}" x="64" y="48" width="46" height="46"/>
    <text x="123" y="84" fill="#ffffff" font-family="DM Sans" font-size="34" font-weight="700" letter-spacing="-1.5">drocsid<tspan fill="#ff7654">.</tspan></text>`;
}

export async function renderSiteOpenGraphImage() {
  const [logo, scene] = await Promise.all([
    assetDataUri("logo.png"),
    assetDataUri("og-scene.png"),
  ]);
  return render(
    document(
      scene,
      `
      ${brand(logo)}
      <rect x="64" y="119" width="132" height="32" rx="16" fill="#ffffff" fill-opacity=".08" stroke="#ffffff" stroke-opacity=".12"/>
      <circle cx="83" cy="135" r="4" fill="#ff7654"/>
      <text x="96" y="140" fill="#d9d9df" font-family="DM Sans" font-size="13" font-weight="600">OPEN SOURCE</text>
      <text x="64" y="242" fill="#ffffff" font-family="DM Sans" font-size="66" font-weight="700" letter-spacing="-3.5">
        <tspan x="64" y="242">A place for</tspan>
        <tspan x="64" y="310" fill="#ff7654">your people.</tspan>
      </text>
      <text x="68" y="365" fill="#d4d4dc" font-family="DM Sans" font-size="22">
        <tspan x="68" y="365">Thoughtful text chat for communities</tspan>
        <tspan x="68" y="397">that want a place of their own.</tspan>
      </text>
      <g transform="rotate(-2 870 315)" filter="url(#panel-shadow)">
        <rect x="570" y="98" width="570" height="432" rx="25" fill="#15161b" stroke="#ffffff" stroke-opacity=".16" stroke-width="2"/>
        <rect x="570" y="98" width="570" height="44" rx="25" fill="#202127"/>
        <rect x="570" y="125" width="570" height="17" fill="#202127"/>
        <circle cx="592" cy="120" r="5" fill="#ff7654"/>
        <circle cx="609" cy="120" r="5" fill="#e6c66f"/>
        <circle cx="626" cy="120" r="5" fill="#7ec69c"/>
        <text x="658" y="125" fill="#e8e8eb" font-family="DM Sans" font-size="12" font-weight="600">The Common Room</text>
        <rect x="570" y="142" width="54" height="388" fill="#222329"/>
        <image href="${logo}" x="582" y="158" width="30" height="30"/>
        <rect x="581" y="204" width="32" height="32" rx="10" fill="#f2bc95"/>
        <circle cx="597" cy="220" r="7" fill="#885130" opacity=".75"/>
        <rect x="581" y="249" width="32" height="32" rx="10" fill="#e3dced"/>
        <circle cx="597" cy="265" r="7" fill="#79648b" opacity=".75"/>
        <rect x="581" y="294" width="32" height="32" rx="10" fill="#d4dfbd"/>
        <circle cx="597" cy="310" r="7" fill="#5f713e" opacity=".75"/>
        <rect x="624" y="142" width="154" height="388" fill="#1b1c21"/>
        <text x="642" y="176" fill="#ffffff" font-family="DM Sans" font-size="13" font-weight="700">The Common Room</text>
        <text x="642" y="211" fill="#747781" font-family="DM Sans" font-size="9" font-weight="700" letter-spacing="1">CONVERSATIONS</text>
        <rect x="636" y="226" width="130" height="31" rx="8" fill="#ffffff" fill-opacity=".08"/>
        <text x="648" y="246" fill="#ff8a6c" font-family="DM Sans" font-size="12" font-weight="600">#  general</text>
        <text x="648" y="280" fill="#a4a5ad" font-family="DM Sans" font-size="12">#  introductions</text>
        <text x="648" y="311" fill="#a4a5ad" font-family="DM Sans" font-size="12">#  making-things</text>
        <text x="642" y="359" fill="#747781" font-family="DM Sans" font-size="9" font-weight="700" letter-spacing="1">DIRECT MESSAGES</text>
        <circle cx="651" cy="385" r="10" fill="#d4dfbd"/>
        <text x="669" y="389" fill="#a4a5ad" font-family="DM Sans" font-size="11">Amara</text>
        <circle cx="651" cy="417" r="10" fill="#e3dced"/>
        <text x="669" y="421" fill="#a4a5ad" font-family="DM Sans" font-size="11">Milo</text>
        <rect x="778" y="142" width="362" height="388" fill="#121318"/>
        <rect x="778" y="142" width="362" height="55" fill="#17181d"/>
        <text x="799" y="175" fill="#ffffff" font-family="DM Sans" font-size="15" font-weight="700"># general</text>
        <line x1="778" y1="197" x2="1140" y2="197" stroke="#ffffff" stroke-opacity=".07"/>
        <circle cx="806" cy="231" r="15" fill="#f2bc95"/>
        <text x="832" y="225" fill="#ffffff" font-family="DM Sans" font-size="11" font-weight="700">Nia</text>
        <text x="832" y="243" fill="#b9bac2" font-family="DM Sans" font-size="11">Anyone up for a tiny creative sprint?</text>
        <circle cx="806" cy="282" r="15" fill="#e3dced"/>
        <text x="832" y="276" fill="#ffffff" font-family="DM Sans" font-size="11" font-weight="700">Milo</text>
        <text x="832" y="294" fill="#b9bac2" font-family="DM Sans" font-size="11">Yes. Sharing what I’m making now.</text>
        <rect x="832" y="307" width="118" height="54" rx="11" fill="#292a32"/>
        <rect x="844" y="320" width="70" height="6" rx="3" fill="#ff7654" fill-opacity=".75"/>
        <rect x="844" y="334" width="93" height="5" rx="2.5" fill="#797b86" fill-opacity=".5"/>
        <circle cx="806" cy="396" r="15" fill="#d4dfbd"/>
        <text x="832" y="390" fill="#ffffff" font-family="DM Sans" font-size="11" font-weight="700">Amara</text>
        <text x="832" y="408" fill="#b9bac2" font-family="DM Sans" font-size="11">This is exactly what I needed today.</text>
        <rect x="796" y="461" width="326" height="48" rx="12" fill="#202127" stroke="#ffffff" stroke-opacity=".08"/>
        <text x="814" y="490" fill="#71737d" font-family="DM Sans" font-size="11">Message #general</text>
        <circle cx="1098" cy="485" r="13" fill="#ff7654"/>
        <path d="M1093 485l8-4-3 9-2-4z" fill="#2b1611"/>
        <rect x="570" y="98" width="570" height="432" rx="25" fill="url(#panel-sheen)" pointer-events="none"/>
      </g>
      <rect x="64" y="500" width="142" height="42" rx="21" fill="#ff7654"/>
      <text x="135" y="527" text-anchor="middle" fill="#321711" font-family="DM Sans" font-size="15" font-weight="700">drocsid.app</text>
      <text x="64" y="585" fill="#aeb0ba" font-family="DM Sans" font-size="15">Text-first. Open source. Yours to shape.</text>
    `,
    ),
  );
}

export async function renderInviteOpenGraphImage(
  invite: InvitePreview,
  communityIcon?: { data: Uint8Array; contentType: string },
) {
  const [logo, scene] = await Promise.all([
    assetDataUri("logo.png"),
    assetDataUri("og-scene.png"),
  ]);
  const community = invite.community;
  const tone = tones[community.color] ?? tones.peach;
  const nameLines = wrapText(community.name, 20, 2);
  const descriptionLines = wrapText(
    community.description || "A community with room for you.",
    48,
    2,
  );
  const descriptionY = nameLines.length > 1 ? 398 : 348;
  const initial = escapeXml(
    cleanText(community.name).slice(0, 1).toUpperCase() || "D",
  );
  const icon = communityIcon
    ? `<defs><clipPath id="community-icon"><rect x="884" y="202" width="156" height="156" rx="42"/></clipPath></defs>
       <image href="data:${communityIcon.contentType};base64,${Buffer.from(communityIcon.data).toString("base64")}" x="884" y="202" width="156" height="156" preserveAspectRatio="xMidYMid slice" clip-path="url(#community-icon)"/>`
    : `<rect x="884" y="202" width="156" height="156" rx="42" fill="#ffffff" fill-opacity=".62"/>
       <text x="962" y="311" text-anchor="middle" fill="${tone.foreground}" font-family="DM Sans" font-size="78" font-weight="700">${initial}</text>`;

  return render(
    document(
      scene,
      `
      ${brand(logo)}
      <rect x="54" y="127" width="1092" height="420" rx="36" fill="#0d0e16" fill-opacity=".88" stroke="#ffffff" stroke-opacity=".13"/>
      <rect x="54" y="127" width="1092" height="420" rx="36" fill="url(#panel-sheen)"/>
      <rect x="76" y="153" width="179" height="32" rx="16" fill="#ffffff" fill-opacity=".08" stroke="#ffffff" stroke-opacity=".11"/>
      <circle cx="95" cy="169" r="4" fill="#ff7654"/>
      <text x="108" y="174" fill="#d9d9df" font-family="DM Sans" font-size="13" font-weight="600">COMMUNITY INVITE</text>
      <text x="76" y="232" fill="#adafba" font-family="DM Sans" font-size="22">You’re invited to</text>
      <text fill="#ffffff" font-family="DM Sans" font-size="56" font-weight="700" letter-spacing="-2.8">${textLines(nameLines, 74, 292, 59)}</text>
      <text fill="#c6c7ce" font-family="DM Sans" font-size="20">${textLines(descriptionLines, 78, descriptionY, 29)}</text>
      <text x="78" y="505" fill="#8e909b" font-family="DM Sans" font-size="15">drocsid.cc/${escapeXml(invite.code)}</text>
      <circle cx="962" cy="318" r="175" fill="${tone.background}" opacity=".18" filter="url(#soft-glow)"/>
      <rect x="820" y="165" width="284" height="336" rx="36" fill="${tone.background}" filter="url(#panel-shadow)"/>
      ${icon}
      <text x="962" y="401" text-anchor="middle" fill="${tone.foreground}" font-family="DM Sans" font-size="18" font-weight="700">${community.members.toLocaleString("en-US")} ${community.members === 1 ? "member" : "members"}</text>
      <rect x="853" y="432" width="218" height="45" rx="22.5" fill="#ffffff" fill-opacity=".62"/>
      <text x="962" y="460" text-anchor="middle" fill="${tone.foreground}" font-family="DM Sans" font-size="14" font-weight="700">Join the conversation</text>
      <text x="64" y="590" fill="#aeb0ba" font-family="DM Sans" font-size="15">A place for your people.</text>
      <text x="1136" y="590" text-anchor="end" fill="#ffffff" font-family="DM Sans" font-size="15" font-weight="700">Drocsid</text>
    `,
    ),
  );
}
