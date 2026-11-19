import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: ReactNode, displayName: string) {
  const Icon = ({ className = "size-5", ...rest }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconDashboard = icon(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>,
  "IconDashboard",
);
export const IconSparkles = icon(
  <>
    <path d="M11 3.5l1.8 4.9 4.9 1.8-4.9 1.8L11 16.9l-1.8-4.9-4.9-1.8 4.9-1.8z" />
    <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </>,
  "IconSparkles",
);
export const IconCheckCircle = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 5-5" />
  </>,
  "IconCheckCircle",
);
export const IconCalendar = icon(
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
    <path d="M16 2.5v4M8 2.5v4M3 10h18" />
  </>,
  "IconCalendar",
);
export const IconChart = icon(
  <>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 6-6" />
  </>,
  "IconChart",
);
export const IconBook = icon(
  <>
    <path d="M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z" />
    <path d="M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z" />
  </>,
  "IconBook",
);
export const IconSliders = icon(
  <>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  </>,
  "IconSliders",
);
export const IconFacebook = icon(
  <path
    d="M15.5 3H14a4 4 0 0 0-4 4v2.5H7.5v3.5H10V21h3.5v-8h2.7l.6-3.5h-3.3V7.4c0-.6.4-.9 1-.9h1.6V3z"
    fill="currentColor"
    stroke="none"
  />,
  "IconFacebook",
);
export const IconInstagram = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
  </>,
  "IconInstagram",
);
export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
  "IconClock",
);
export const IconPencil = icon(<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z" />, "IconPencil");
export const IconX = icon(<path d="M18 6 6 18M6 6l12 12" />, "IconX");
export const IconCheck = icon(<path d="M20 6 9 17l-5-5" />, "IconCheck");
export const IconRocket = icon(
  <>
    <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z" />
    <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
  </>,
  "IconRocket",
);
export const IconTrendingUp = icon(
  <>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </>,
  "IconTrendingUp",
);
export const IconEye = icon(
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
  "IconEye",
);
export const IconHeart = icon(
  <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />,
  "IconHeart",
);
export const IconMessage = icon(<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.1A8.5 8.5 0 1 1 21 12z" />, "IconMessage");
export const IconShare = icon(
  <>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <path d="m16 6-4-4-4 4M12 2v13" />
  </>,
  "IconShare",
);
export const IconSend = icon(
  <>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="M22 2 11 13" />
  </>,
  "IconSend",
);
export const IconBookmark = icon(<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />, "IconBookmark");
export const IconMenu = icon(<path d="M4 6h16M4 12h16M4 18h16" />, "IconMenu");
export const IconChevronLeft = icon(<path d="m15 18-6-6 6-6" />, "IconChevronLeft");
export const IconChevronRight = icon(<path d="m9 18 6-6-6-6" />, "IconChevronRight");
export const IconChevronDown = icon(<path d="m6 9 6 6 6-6" />, "IconChevronDown");
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />, "IconPlus");
export const IconInfo = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
  "IconInfo",
);
export const IconFlask = icon(
  <>
    <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
    <path d="M7 15h10" />
  </>,
  "IconFlask",
);
export const IconArrowRight = icon(<path d="M5 12h14M13 5l7 7-7 7" />, "IconArrowRight");
export const IconUsers = icon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </>,
  "IconUsers",
);
export const IconCursor = icon(
  <>
    <path d="m9 9 5 12 1.8-5.2L21 14z" />
    <path d="M7.2 2.2 8 5.1M5.1 8l-2.9-.8M14 4.1 12 6M6 12l-1.9 2" />
  </>,
  "IconCursor",
);
export const IconRefresh = icon(
  <>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </>,
  "IconRefresh",
);
export const IconFlame = icon(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.4 1.4 1.4 2.8 3.5 2.8z" />,
  "IconFlame",
);
export const IconBulb = icon(
  <>
    <path d="M9 18h6M10 22h4" />
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5A6 6 0 1 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
  </>,
  "IconBulb",
);
export const IconLink = icon(
  <>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </>,
  "IconLink",
);
export const IconTarget = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </>,
  "IconTarget",
);
export const IconWallet = icon(
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>,
  "IconWallet",
);
export const IconAlert = icon(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
  "IconAlert",
);
export const IconUndo = icon(
  <>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
  </>,
  "IconUndo",
);
export const IconGlobe = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>,
  "IconGlobe",
);
export const IconThumb = icon(
  <>
    <path d="M7 10v11H3V10z" />
    <path d="M7 10l4-7a2.5 2.5 0 0 1 3 2.5V9h5.5a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7" />
  </>,
  "IconThumb",
);
export const IconImage = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </>,
  "IconImage",
);
export const IconWand = icon(
  <>
    <path d="m15 4 .8 2.2L18 7l-2.2.8L15 10l-.8-2.2L12 7l2.2-.8z" />
    <path d="M19.5 11.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" />
    <path d="M3 21 13.5 10.5M11 13l2 2" />
  </>,
  "IconWand",
);
export const IconVideo = icon(
  <>
    <rect x="2.5" y="5.5" width="13" height="13" rx="2.5" />
    <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
  </>,
  "IconVideo",
);
export const IconUpload = icon(
  <>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  </>,
  "IconUpload",
);
export const IconDownload = icon(
  <>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  </>,
  "IconDownload",
);
export const IconCopy = icon(
  <>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </>,
  "IconCopy",
);
export const IconText = icon(
  <>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </>,
  "IconText",
);
export const IconSun = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
  "IconSun",
);
export const IconMoon = icon(<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />, "IconMoon");
export const IconMonitor = icon(
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>,
  "IconMonitor",
);
export const IconUser = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
  "IconUser",
);
export const IconShield = icon(
  <>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </>,
  "IconShield",
);
export const IconLogOut = icon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </>,
  "IconLogOut",
);
export const IconLogIn = icon(
  <>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5M15 12H3" />
  </>,
  "IconLogIn",
);
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
  "IconSearch",
);
export const IconChevronsUpDown = icon(<path d="m7 15 5 5 5-5M7 9l5-5 5 5" />, "IconChevronsUpDown");
export const IconLock = icon(
  <>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </>,
  "IconLock",
);
export const IconSidebar = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M9.5 4v16" />
  </>,
  "IconSidebar",
);
export const IconTrash = icon(
  <>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </>,
  "IconTrash",
);
export const IconDice = icon(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth={2.6} />
  </>,
  "IconDice",
);
