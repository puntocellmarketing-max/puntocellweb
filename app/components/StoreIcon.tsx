import type { SVGProps } from "react";

export type StoreIconName =
  | "phone"
  | "tv"
  | "washer"
  | "audio"
  | "notebook"
  | "accessory"
  | "truck"
  | "shield"
  | "card"
  | "headset"
  | "search"
  | "menu"
  | "arrow"
  | "home";

type Props = SVGProps<SVGSVGElement> & { name: StoreIconName };

export default function StoreIcon({ name, className = "h-6 w-6", ...props }: Props) {
  const shared = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "phone":
      return <svg {...shared}><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M10 5h4M11 19h2"/></svg>;
    case "tv":
      return <svg {...shared}><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg>;
    case "washer":
      return <svg {...shared}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16"/><circle cx="12" cy="14" r="5"/><path d="M7 4.5h.01M10 4.5h.01"/></svg>;
    case "audio":
      return <svg {...shared}><path d="M4 9v6M20 9v6"/><path d="M4 15a3 3 0 0 0 3 3h1v-7H7a3 3 0 0 0-3 3M20 15a3 3 0 0 1-3 3h-1v-7h1a3 3 0 0 1 3 3M4 10a8 8 0 0 1 16 0"/></svg>;
    case "notebook":
      return <svg {...shared}><rect x="4" y="3" width="16" height="13" rx="2"/><path d="M2 20h20l-2-4H4l-2 4Z"/></svg>;
    case "accessory":
      return <svg {...shared}><path d="M8 7V3M12 7V3M6 7h8v4a4 4 0 0 1-4 4v0a4 4 0 0 1-4-4V7ZM10 15v2a4 4 0 0 0 4 4h1"/><rect x="15" y="16" width="4" height="5" rx="1"/></svg>;
    case "truck":
      return <svg {...shared}><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case "shield":
      return <svg {...shared}><path d="M12 3 4.5 6v5.5c0 4.5 3 7.5 7.5 9.5 4.5-2 7.5-5 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "card":
      return <svg {...shared}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20M6 15h4"/></svg>;
    case "headset":
      return <svg {...shared}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2M20 13v4a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2M16 19c0 2-2 3-4 3"/></svg>;
    case "search":
      return <svg {...shared}><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>;
    case "menu":
      return <svg {...shared}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "arrow":
      return <svg {...shared}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "home":
      return <svg {...shared}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z"/></svg>;
  }
}
