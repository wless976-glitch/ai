/**
 * ТЕСТ ӨГӨГДӨЛ — AI болон Meta Graph API холбогдоогүй үед UI-г туршихад ашиглана.
 * Бүх нэр, тоо зохиомол.
 */
import { addDays } from "./format";
import type { AutomationSettings, BusinessProfile, Guide, Post, PostStats } from "./types";

export const BUSINESS: BusinessProfile = {
  name: "Сэрүүн Кофе",
  handle: "seruun.coffee",
  industry: "Кофе шоп, кафе",
  location: "Улаанбаатар, Сүхбаатар дүүрэг",
  description:
    "Хотын төвд байрлах жижиг кофе шоп. Гар аргаар шарсан кофе, өдөр бүр шинээр хийсэн амттан, ажиллах тухтай орчин.",
  tone: "friendly",
};

export const SETTINGS: AutomationSettings = {
  postsPerWeek: 4,
  requireApproval: true,
  smartTiming: true,
  weeklyReport: true,
};

export const FOLLOWERS = { facebook: 2340, instagram: 1870 };
export const NEW_FOLLOWERS_7D = { facebook: 58, instagram: 84 };
/** Нэг хүн постыг дунджаар хэдэн удаа харсан (харагдалт ÷ хүрэлт) */
export const IMPRESSIONS_PER_REACH = 1.55;

function stats(
  reach: number,
  reactions: number,
  comments: number,
  shares: number,
  saves: number,
  clicks: number,
): PostStats {
  return { reach, impressions: Math.round(reach * IMPRESSIONS_PER_REACH), reactions, comments, shares, saves, clicks };
}

export const INITIAL_POSTS: Post[] = [
  // ---------- Нийтлэгдсэн ----------
  {
    id: "p1",
    topic: "Намрын шинэ цэс",
    caption:
      "Намар ирлээ 🍂 Бидний намрын шинэ цэсэнд хулуутай латте, шанцайтай капучино нэмэгдлээ.\n\nДулаахан ундаагаа бариад, хотын шуугианаас түр амраарай ☕",
    hashtags: ["#СэрүүнКофе", "#намар", "#латте", "#УлаанбаатарКофе"],
    platforms: ["facebook", "instagram"],
    date: "2026-10-21",
    time: "08:30",
    status: "published",
    visual: { preset: 0, emoji: "🍂", headline: "Намрын шинэ цэс" },
    aiGenerated: true,
    stats: stats(3240, 186, 24, 12, 31, 64),
  },
  {
    id: "p2",
    topic: "Бариста-тай танилц",
    caption:
      "Манай ахлах бариста Тэмүүлэнтэй танилцаарай 👋 5 жилийн туршлагатай, латте арт-ын мастер.\n\nДараагийн удаа ирэхдээ дуртай зургаа захиалаад үзээрэй!",
    hashtags: ["#СэрүүнКофе", "#бариста", "#латтеарт"],
    platforms: ["instagram"],
    date: "2026-10-24",
    time: "19:00",
    status: "published",
    visual: { preset: 1, emoji: "👨‍🍳", headline: "Бариста-тай танилц" },
    aiGenerated: false,
    stats: stats(2110, 214, 38, 6, 22, 18),
  },
  {
    id: "p3",
    topic: "Оюутны хөнгөлөлт",
    caption:
      "Оюутнууд аа, анхаар 📚 Оюутны үнэмлэхээ үзүүлээд бүх ундаанаас 15% хөнгөлөлт аваарай.\n\nДаваа–Баасан, 14:00–17:00 цагт хүчинтэй.",
    hashtags: ["#СэрүүнКофе", "#оюутан", "#хөнгөлөлт"],
    platforms: ["facebook"],
    date: "2026-10-28",
    time: "12:00",
    status: "published",
    visual: { preset: 2, emoji: "📚", headline: "Оюутанд 15% хөнгөлөлт" },
    aiGenerated: true,
    stats: stats(4120, 162, 41, 58, 9, 132),
  },
  {
    id: "p4",
    topic: "Хэллоуины тусгай ундаа",
    caption:
      "Хэллоуин ойртож байна 🎃 Зөвхөн энэ 7 хоногт: хар какаотой \"Шидтэний латте\".\n\nКостюмтэй ирсэн хүнд амттан бэлэг 🍪",
    hashtags: ["#СэрүүнКофе", "#Хэллоуин", "#тусгайцэс"],
    platforms: ["facebook", "instagram"],
    date: "2026-10-31",
    time: "18:00",
    status: "published",
    visual: { preset: 5, emoji: "🎃", headline: "Шидтэний латте" },
    aiGenerated: true,
    stats: stats(2680, 241, 47, 21, 36, 54),
  },
  {
    id: "p5",
    topic: "Өглөөний сет",
    caption:
      "Өглөөгөө зөв эхлүүлье ☀️ Американо + шинэхэн круассан = ₮12,900.\n\nӨдөр бүр 08:00–10:00 цагт.",
    hashtags: ["#СэрүүнКофе", "#өглөөнийцай", "#круассан"],
    platforms: ["instagram"],
    date: "2026-11-03",
    time: "08:00",
    status: "published",
    visual: { preset: 4, emoji: "🥐", headline: "Өглөөний сет ₮12,900" },
    aiGenerated: true,
    stats: stats(1890, 98, 12, 4, 27, 21),
  },
  {
    id: "p6",
    topic: "Хэрэглэгчийн сэтгэгдэл",
    caption:
      "\"Ажиллахад хамгийн тухтай газар. Кофе нь ч гайхалтай!\" — Номин 💛\n\nТа ч гэсэн сэтгэгдлээ коммент хэсэгт үлдээгээрэй.",
    hashtags: ["#СэрүүнКофе", "#сэтгэгдэл"],
    platforms: ["facebook"],
    date: "2026-11-06",
    time: "19:30",
    status: "published",
    visual: { preset: 3, emoji: "💬", headline: "Хэрэглэгчийн сэтгэгдэл" },
    aiGenerated: true,
    stats: stats(1540, 72, 19, 3, 2, 8),
  },
  {
    id: "p7",
    topic: "Кофе шарах процесс",
    caption:
      "Таны аяган дахь кофе хаанаас ирдэг вэ? 🔥 Бид шошоо долоо хоног бүр өөрсдөө шардаг.\n\nВидеогоор шарах процессоо харуулж байна 🎥",
    hashtags: ["#СэрүүнКофе", "#кофешарах", "#specialtycoffee"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-09",
    time: "12:30",
    status: "published",
    visual: { preset: 4, emoji: "🔥", headline: "Бид кофегоо өөрсдөө шардаг" },
    aiGenerated: false,
    stats: stats(5260, 318, 52, 64, 88, 97),
  },
  {
    id: "p8",
    topic: "Шинэ амттан: Чийзкейк",
    caption:
      "Шинэ амттан ирлээ 🍰 Нэрсэн соустай Нью-Йорк чийзкейк.\n\nКофетойгоо хамт амтлаарай!",
    hashtags: ["#СэрүүнКофе", "#чийзкейк", "#амттан"],
    platforms: ["instagram"],
    date: "2026-11-11",
    time: "18:00",
    status: "published",
    visual: { preset: 3, emoji: "🍰", headline: "Нью-Йорк чийзкейк" },
    aiGenerated: true,
    stats: stats(2240, 196, 28, 9, 41, 26),
  },
  {
    id: "p9",
    topic: "Ажлын цаг өөрчлөгдсөн",
    caption:
      "Мэдээлэл 📢 11-р сарын 15-наас эхлэн бид 08:00–21:00 цагт ажиллана.\n\nАмралтын өдрүүдэд 10:00–20:00.",
    hashtags: ["#СэрүүнКофе", "#мэдээлэл"],
    platforms: ["facebook"],
    date: "2026-11-13",
    time: "09:00",
    status: "published",
    visual: { preset: 2, emoji: "📢", headline: "Шинэ ажлын цаг" },
    aiGenerated: true,
    stats: stats(1320, 41, 6, 11, 3, 15),
  },
  {
    id: "p10",
    topic: "Амралтын өдрийн 1+1",
    caption:
      "Амралтын өдрийн урамшуулал 🎉 Бямба, Ням гарагт ямар ч латте авахад 2 дахь нь ҮНЭГҮЙ!\n\nНайзаа дагуулаад ирээрэй 👯",
    hashtags: ["#СэрүүнКофе", "#урамшуулал", "#1плюс1"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-15",
    time: "17:00",
    status: "published",
    visual: { preset: 0, emoji: "🎉", headline: "Латте 1+1" },
    aiGenerated: true,
    stats: stats(2460, 264, 71, 38, 29, 112),
  },

  // ---------- Хуваарьт орсон ----------
  {
    id: "s1",
    topic: "Шинэ кофе шош: Этиоп",
    caption:
      "Шинэ шош ирлээ ✨ Этиопын Иргачеффе — жимс, цэцгийн анхилуун амттай.\n\nЭнэ 7 хоногт пур-овероор амталж үзээрэй ☕",
    hashtags: ["#СэрүүнКофе", "#Этиоп", "#pourover"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-17",
    time: "08:30",
    status: "scheduled",
    visual: { preset: 1, emoji: "🌱", headline: "Этиоп Иргачеффе" },
    aiGenerated: true,
  },
  {
    id: "s2",
    topic: "Ажиллах тухтай орчин",
    caption:
      "Зөөврийн компьютероо аваад ирээрэй 💻 Хурдан Wi-Fi, цэнэглэгч бүхий ширээ, нам гүм булан.\n\nТаны \"оффис\" биш оффис.",
    hashtags: ["#СэрүүнКофе", "#ажиллахгазар", "#remotework"],
    platforms: ["instagram"],
    date: "2026-11-19",
    time: "12:00",
    status: "scheduled",
    visual: { preset: 2, emoji: "💻", headline: "Ажиллах тухтай орчин" },
    aiGenerated: true,
  },
  {
    id: "s3",
    topic: "Бямба гарагийн акустик үдэш",
    caption:
      "Энэ Бямба гарагт 19:00 цагаас акустик үдэш 🎸 Амьд хөгжим, дулаахан ундаа, сайхан хамт олон.\n\nСуудал хязгаартай тул эрт ирээрэй!",
    hashtags: ["#СэрүүнКофе", "#акустик", "#амьдхөгжим"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-21",
    time: "18:00",
    status: "scheduled",
    visual: { preset: 5, emoji: "🎸", headline: "Акустик үдэш · Бя 19:00" },
    aiGenerated: true,
  },
  {
    id: "s4",
    topic: "Хуримтлалын карт",
    caption:
      "Шинэ! Хуримтлалын карт 🎟️ 9 ундаа ав — 10 дахь нь бидний бэлэг.\n\nКартаа кассаас аваарай.",
    hashtags: ["#СэрүүнКофе", "#хуримтлал"],
    platforms: ["facebook"],
    date: "2026-11-25",
    time: "09:00",
    status: "scheduled",
    visual: { preset: 4, emoji: "🎟️", headline: "10 дахь ундаа бэлэг" },
    aiGenerated: false,
  },

  // ---------- AI бэлдсэн, батлах хүлээгдэж буй ----------
  {
    id: "a1",
    topic: "Өвлийн дулаахан ундаа",
    caption:
      "Гадаа −20°C байхад танд юу хэрэгтэй вэ? ❄️ Мэдээж дулаахан ундаа!\n\nЦагаан шоколадтай латте, цуктай цай, халуун какао — бүгд бэлэн. Даарсан гараа бидэн дээр ирж дулаацуулаарай ☕",
    hashtags: ["#СэрүүнКофе", "#өвөл", "#халуунундаа", "#УлаанбаатарКофе"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-18",
    time: "19:00",
    status: "pending",
    visual: { preset: 2, emoji: "❄️", headline: "Өвлийн дулаахан ундаа" },
    aiGenerated: true,
  },
  {
    id: "a2",
    topic: "Өглөө 08:00-аас нээлттэй",
    caption:
      "Ажилдаа явахдаа кофегоо аваад гараарай 🏃 Бид өглөө бүр 08:00 цагаас нээлттэй.\n\nУрьдчилан захиалбал 2 минутад бэлэн болно.",
    hashtags: ["#СэрүүнКофе", "#өглөө", "#takeaway"],
    platforms: ["instagram"],
    date: "2026-11-20",
    time: "08:00",
    status: "pending",
    visual: { preset: 0, emoji: "⏰", headline: "08:00-аас нээлттэй" },
    aiGenerated: true,
  },
  {
    id: "a3",
    topic: "Байгууллагын захиалга",
    caption:
      "Хурал, сургалт, оффисын үдэшлэгт кофе хэрэгтэй юу? 🏢 Бид 10-аас дээш аяга кофе, амттанг хүргэж өгнө.\n\nДэлгэрэнгүйг мессежээр асуугаарай.",
    hashtags: ["#СэрүүнКофе", "#байгууллага", "#кофехүргэлт"],
    platforms: ["facebook"],
    date: "2026-11-23",
    time: "12:30",
    status: "pending",
    visual: { preset: 1, emoji: "🏢", headline: "Байгууллагын захиалга" },
    aiGenerated: true,
  },
  {
    id: "a4",
    topic: "Black Friday хямдрал",
    caption:
      "Black Friday 🖤 Зөвхөн 11-р сарын 27-нд бүх кофе шошноос 20% хямдрал!\n\nГэртээ ч гэсэн Сэрүүн Кофегийн амтыг мэдрээрэй.",
    hashtags: ["#СэрүүнКофе", "#BlackFriday", "#хямдрал"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-27",
    time: "18:00",
    status: "pending",
    visual: { preset: 5, emoji: "🖤", headline: "Black Friday −20%" },
    aiGenerated: true,
  },

  // ---------- Татгалзсан ----------
  {
    id: "r1",
    topic: "Giveaway тэмцээн",
    caption:
      "Тэмцээн зарлаж байна 🎁 Энэ постыг хуваалцаад 3 найзаа тэмдэглээрэй — 5 азтанд 1 сарын үнэгүй кофе!",
    hashtags: ["#СэрүүнКофе", "#giveaway"],
    platforms: ["facebook", "instagram"],
    date: "2026-11-22",
    time: "12:00",
    status: "rejected",
    visual: { preset: 3, emoji: "🎁", headline: "Giveaway" },
    aiGenerated: true,
  },
];

/**
 * Сүүлийн 60 хоногийн өдөр тутмын хүрэлт (FB / IG). Постын өдрүүдэд өсөлттэй.
 * 60 хоног байгаа нь "30 хоног vs өмнөх 30 хоног" харьцуулалт хийхэд хэрэгтэй.
 */
const SERIES_DAYS = 60;
const SERIES_START = "2026-09-18";
export const REACH_SERIES = Array.from({ length: SERIES_DAYS }, (_, i) => {
  const date = addDays(SERIES_START, i);
  let facebook = 220 + 120 * Math.sin(i * 0.7) + i * 9;
  let instagram = 180 + 100 * Math.cos(i * 0.55) + i * 10;
  for (const p of INITIAL_POSTS) {
    if (p.status !== "published" || !p.stats) continue;
    if (p.date === date || p.date === addDays(date, -1)) {
      const share = p.date === date ? 0.42 : 0.18;
      const perPlatform = (p.stats.reach * share) / p.platforms.length;
      if (p.platforms.includes("facebook")) facebook += perPlatform;
      if (p.platforms.includes("instagram")) instagram += perPlatform;
    }
  }
  return { date, facebook: Math.round(facebook), instagram: Math.round(instagram) };
});

/** Дагагчид хамгийн идэвхтэй цаг (0–100). Мөр: Да..Ня, багана: цагийн слот */
export const HEATMAP_SLOTS = ["08:00", "10:00", "12:00", "15:00", "18:00", "21:00"];
export const HEATMAP: number[][] = [
  [55, 30, 62, 28, 78, 60],
  [50, 28, 58, 30, 74, 57],
  [52, 32, 65, 33, 82, 63],
  [48, 30, 60, 35, 80, 66],
  [45, 35, 55, 40, 92, 72],
  [30, 52, 68, 60, 70, 88],
  [25, 48, 62, 58, 66, 80],
];

/** Сүүлийн 8 долоо хоногт нийтэлсэн постын тоо (тогтмол байдлын үзүүлэлт) */
export const WEEKLY_POSTS = [
  { label: "9/21", count: 1 },
  { label: "9/28", count: 0 },
  { label: "10/5", count: 2 },
  { label: "10/12", count: 2 },
  { label: "10/19", count: 3 },
  { label: "10/26", count: 2 },
  { label: "11/2", count: 3 },
  { label: "11/9", count: 4 },
];

export const TIPS = [
  "Баасан гарагийн 18:00 цаг таны дагагчдын хамгийн идэвхтэй үе. Чухал постоо энэ цагт тавиарай.",
  "Асуулт асуусан пост 2 дахин их сэтгэгдэл авдаг. Жишээ: \"Та аль ундаанд дуртай вэ?\"",
  "Видео пост таны хувьд зурагтай постоос 60% илүү хүрэлттэй байна.",
];

export const GUIDES: Guide[] = [
  {
    id: "connect-tugee",
    category: "start",
    title: "Түгээ-д Facebook, Instagram-аа холбох",
    minutes: 2,
    summary: "Нэг удаа холбоход л пост автоматаар нийтлэгдэж, статистик нь орж ирнэ.",
    steps: [
      "Зүүн цэснээс \"Тохиргоо\" → \"Холбогдсон аккаунт\" хэсэгт орно.",
      "\"Facebook-ээр холбох\" товчийг дарж, өөрийн Facebook аккаунтаар нэвтэрнэ.",
      "Удирдах Page-ээ сонгоод, пост нийтлэх, статистик унших зөвшөөрлийг олгоно.",
      "Instagram Business аккаунт тань Page-тэй холбоотой бол автоматаар хамт холбогдоно.",
    ],
    tip: "Тест горимд бодит холболт хийгдэхгүй — товч дарахад зөвхөн төлөв солигдоно.",
  },
  {
    id: "fb-page",
    category: "facebook",
    title: "Facebook Page нээх",
    minutes: 4,
    summary: "Хувийн профайл биш, бизнесийн Page ашиглах нь статистик, boost хийх боломж олгоно.",
    steps: [
      "Facebook-д нэвтэрч, цэснээс \"Pages\" → \"Create new Page\" сонгоно.",
      "Page-ийн нэрэнд бизнесийнхээ нэрийг, ангилалд (жишээ нь \"Coffee Shop\") сонгоно.",
      "Лого-гоо профайл зураг, бизнесийнхээ зургийг cover зураг болгон оруулна.",
      "Утас, хаяг, ажлын цагаа бөглөнө — хэрэглэгчид хамгийн их хайдаг мэдээлэл.",
      "\"Add button\" дээр дарж \"Send message\" товч нэмбэл хэрэглэгч шууд холбогдоно.",
    ],
    tip: "Page-ийн нэрийг Instagram-ийн нэртэйгээ ижил байлгавал хэрэглэгч амархан олно.",
  },
  {
    id: "ig-business",
    category: "instagram",
    title: "Instagram-аа Business аккаунт болгох",
    minutes: 3,
    summary: "Business аккаунт болгосноор статистик харах, автоматаар пост нийтлэх боломжтой болно.",
    steps: [
      "Профайл → баруун дээд ☰ цэс → \"Settings and privacy\" руу орно.",
      "\"Account type and tools\" → \"Switch to professional account\" сонгоно.",
      "\"Business\" төрлийг сонгоод, бизнесийнхээ ангиллыг заана.",
      "Холбоо барих мэдээллээ оруулж, Facebook Page-тэйгээ холбоно.",
    ],
  },
  {
    id: "fb-ig-link",
    category: "start",
    title: "Facebook Page болон Instagram-ийг холбох",
    minutes: 3,
    summary: "Хоёуланг нь Meta Business Suite-д холбосноор нэг дороос удирдана.",
    steps: [
      "business.facebook.com хаягаар Meta Business Suite-д орно.",
      "\"Settings\" → \"Accounts\" → \"Instagram accounts\" хэсгийг нээнэ.",
      "\"Connect\" дарж Instagram аккаунтаараа нэвтэрч зөвшөөрнө.",
      "Холбогдсоны дараа Түгээ хоёр платформд нэг дор пост нийтэлж чадна.",
    ],
  },
  {
    id: "when-to-post",
    category: "content",
    title: "Пост хэзээ, хэр олон оруулах вэ?",
    minutes: 3,
    summary: "Тогтмол байдал нь олон пост оруулахаас илүү чухал.",
    steps: [
      "7 хоногт дор хаяж 3–4 пост тогтмол оруулахыг зорь.",
      "\"Үр дүн\" хэсэг дэх \"Идэвхтэй цаг\" хүснэгтээс өөрийн дагагчдын цагийг хар.",
      "Ерөнхийдөө ажлын өдрүүдийн 12:00–13:00, 18:00–21:00 цаг идэвхтэй байдаг.",
      "Түгээ-ийн \"Ухаалаг цаг\" тохиргоог асаавал AI хамгийн тохиромжтой цагийг сонгоно.",
    ],
  },
  {
    id: "good-post",
    category: "content",
    title: "Сайн пост бичих 5 дүрэм",
    minutes: 3,
    summary: "Хүмүүс эхний 2 секундэд гүйлгэх эсэхээ шийддэг.",
    steps: [
      "Эхний мөрөөрөө анхаарал тат: асуулт, тоо, эсвэл гэнэтийн мэдээ.",
      "Нэг пост — нэг гол санаа. Хэт олон мэдээлэл бүү чихээрэй.",
      "Тод, чанартай зураг эсвэл богино видео ашигла.",
      "Тодорхой уриалгаар төгсгө: \"Мессеж бичээрэй\", \"Одоо захиалаарай\".",
      "Тохирох 3–5 hashtag хангалттай.",
    ],
  },
  {
    id: "media-size",
    category: "content",
    title: "Зураг, видеоны зөв хэмжээ",
    minutes: 2,
    summary: "Буруу хэмжээтэй зураг тайрагдаж, чанар муудна.",
    steps: [
      "Дөрвөлжин пост: 1080 × 1080 px (1:1).",
      "Instagram feed-д хамгийн тохиромжтой: 1080 × 1350 px (4:5).",
      "Story, Reels: 1080 × 1920 px (9:16).",
      "Facebook линк постын зураг: 1200 × 630 px.",
    ],
  },
  {
    id: "boost-basics",
    category: "boost",
    title: "Boost гэж юу вэ, хэзээ хийх вэ?",
    minutes: 4,
    summary: "Boost нь постоо төлбөртэйгөөр илүү олон хүнд хүргэх арга. Зөв постоо сонгох нь гол.",
    steps: [
      "Аль хэдийн сайн идэвх авсан (идэвхийн хувь өндөр) постыг boost хий.",
      "Зорилгоо сонго: илүү олон хүнд хүрэх, мессеж авах, эсвэл дагагч нэмэх.",
      "Үзэгчээ зөв тохируул: байршил (жишээ нь Улаанбаатар), нас, сонирхол.",
      "Эхлээд ₮20,000–30,000 төсвөөр 3–5 хоног туршаад үр дүнг хар.",
      "Үр дүнтэй бол төсвөө нэм, үгүй бол өөр постоор дахин турш.",
    ],
    tip: "Түгээ \"Boost зөвлөмж\" хэсэгт аль постыг boost хийх нь үр ашигтайг автоматаар санал болгоно.",
  },
  {
    id: "read-stats",
    category: "boost",
    title: "Статистикаа ойлгох",
    minutes: 3,
    summary: "Хүрэлт, идэвх, идэвхийн хувь гэсэн 3 тоог л ойлгоход хангалттай.",
    steps: [
      "Хүрэлт (Reach) — постыг харсан хүний тоо.",
      "Идэвх (Engagement) — like, сэтгэгдэл, хуваалцалт, хадгалалтын нийлбэр.",
      "Идэвхийн хувь = Идэвх ÷ Хүрэлт. Ойролцоогоор 3%-аас дээш бол сайн.",
      "Постуудаа хооронд нь харьцуулж, аль төрлийн контент сайн ажилладгийг ол.",
    ],
  },
];

export const GLOSSARY = [
  { term: "Хүрэлт", en: "Reach", text: "Постыг харсан давхардаагүй хүний тоо." },
  { term: "Харагдалт", en: "Impressions", text: "Пост дэлгэцэнд гарсан нийт удаа. Нэг хүн олон удаа харж болно." },
  { term: "Идэвх", en: "Engagement", text: "Like, сэтгэгдэл, хуваалцалт, хадгалалт зэрэг үйлдэл." },
  { term: "Идэвхийн хувь", en: "Engagement rate", text: "Идэвх ÷ Хүрэлт × 100. Контент хэр сонирхолтойг харуулна." },
  { term: "Линк дарсан", en: "Clicks / CTR", text: "Постын линк эсвэл товч дарсан хүний тоо, хувь." },
  { term: "Boost", en: "Boost", text: "Постоо төлбөртэйгөөр илүү олон, зорилтот хүмүүст хүргэх." },
  {
    term: "Дагагч",
    en: "Followers",
    text: "Таны Facebook Page эсвэл Instagram-ийг дагадаг хүмүүс. Шинэ постыг тань хамгийн түрүүнд хардаг.",
  },
  {
    term: "Батлах",
    en: "Approval",
    text: "AI бэлдсэн постыг та уншиж, зөв гэж үзвэл баталдаг. Батлаагүй пост хэзээ ч нийтлэгдэхгүй.",
  },
];

export const PLANS = [
  {
    id: "start",
    name: "Эхлэл",
    price: 49000,
    description: "Дөнгөж сошиал медиа эхлүүлж буй бизнест",
    features: ["1 платформ", "7 хоногт 3 пост", "Үндсэн статистик", "Бүх заавар"],
    weeklyPosts: 3,
    monthlyPosts: 12,
  },
  {
    id: "growth",
    name: "Өсөлт",
    price: 99000,
    description: "Тогтмол өсөлт хүсэж буй бизнест",
    features: ["Facebook + Instagram", "7 хоногт 7 пост", "Пост бүрийн статистик", "Boost зөвлөмж"],
    weeklyPosts: 7,
    monthlyPosts: 30,
    popular: true,
  },
  {
    id: "business",
    name: "Бизнес",
    price: 199000,
    description: "Олон салбартай бизнест",
    features: ["3 хүртэлх брэнд", "Өдөр бүр пост", "Сарын PDF тайлан", "Тусгай зөвлөх"],
    weeklyPosts: 21,
    monthlyPosts: 90,
  },
];

/** Тест хэрэглэгчийн одоогийн багц */
export const CURRENT_PLAN = PLANS[1];

export const AGENCY_PRICE = 1500000;
