"use client";

import { useId, useState, type ReactNode } from "react";
import type { ToolId } from "@/lib/academy";
import { formatMoney, formatNumber } from "@/lib/format";
import { IconAlert, IconCheckCircle, IconRocket, IconTarget, IconWallet } from "../icons";
import { Card, cn, Field, inputClass, Segmented } from "../ui";

/**
 * Сургалтын тооцоолуурууд. Бүгд зөвхөн браузерт тооцдог (AI, сервер дуудахгүй).
 * Татварын шалгагчийн дүрэм modules-business.ts-ийн "Татвар" модультай таарах ёстой.
 */

export const TOOL_META: Record<ToolId, { title: string; description: string; icon: typeof IconRocket }> = {
  boost: {
    title: "Boost төсвийн тооцоолуур",
    description: "Төсөв, CPM, CTR-ээр хэдэн захиалга ирж, ашигтай эсэхийг урьдчилан тооцоол.",
    icon: IconRocket,
  },
  breakeven: {
    title: "Ашиг ба тэнцэх цэг",
    description: "Нэгжийн ашиг, ашгийн хувь, сард хэдийг зарж байж алдагдалгүй болох вэ.",
    icon: IconTarget,
  },
  tax: {
    title: "Татварын шалгагч",
    description: "НӨАТ төлөгч болох эсэх, орлогын татварын ойролцоо дүн, ямар тайлан гаргах вэ.",
    icon: IconWallet,
  },
};

export function ToolCard({ tool }: { tool: ToolId }) {
  const meta = TOOL_META[tool];
  const Icon = meta.icon;
  return (
    <Card className="@container overflow-hidden text-sm">
      <div className="flex items-start gap-3 border-b border-zinc-900/[0.06] px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
          <Icon className="size-[18px]" />
        </span>
        <div>
          <p className="font-medium text-zinc-900">{meta.title}</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">{meta.description}</p>
        </div>
      </div>
      <div className="p-5">
        {tool === "boost" && <BoostCalculator />}
        {tool === "breakeven" && <BreakEvenCalculator />}
        {tool === "tax" && <TaxChecker />}
      </div>
    </Card>
  );
}

/* ---------------- Талбарууд ---------------- */

const MAX_MONEY = 1e13;

function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">₮</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className={cn(inputClass, "pl-7 tabular-nums")}
          value={value ? formatNumber(value) : ""}
          placeholder="0"
          onChange={(e) => onChange(Math.min(MAX_MONEY, Number(e.target.value.replace(/\D/g, "")) || 0))}
        />
      </div>
    </Field>
  );
}

/** Бутархай тоо (хувь, хоног) — бичиж байх үеийн "1." гэх мэт утгыг алдахгүйн тулд текстээр хадгална */
function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  hint?: string;
  max: number;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className={cn(inputClass, "pr-14 tabular-nums")}
          value={text}
          onChange={(e) => {
            const next = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
            setText(next);
            const n = Number(next);
            if (Number.isFinite(n)) onChange(Math.min(max, n));
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">{suffix}</span>
      </div>
    </Field>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", strong ? "bg-zinc-900 text-zinc-50" : "bg-zinc-900/[0.04]")}>
      <p className={cn("text-[12px]", strong ? "text-zinc-400" : "text-zinc-500")}>{label}</p>
      <p className={cn("mt-0.5 text-[17px] font-semibold tabular-nums tracking-[-0.01em] [overflow-wrap:anywhere]", strong ? "text-zinc-50" : "text-zinc-900")}>
        {value}
      </p>
      {sub && <p className={cn("mt-0.5 text-[11.5px]", strong ? "text-zinc-400" : "text-zinc-500")}>{sub}</p>}
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? IconCheckCircle : IconAlert;
  return (
    <div
      className={cn(
        "mt-4 flex gap-2.5 rounded-xl p-3.5 text-[13.5px] leading-relaxed ring-1 ring-inset",
        ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200/70" : "bg-rose-50 text-rose-900 ring-rose-200/70",
      )}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" />
      <div>{children}</div>
    </div>
  );
}

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits).replace(/\.0+$/, "")}%`;

/* ---------------- Boost ---------------- */

/** Хүрэлтийг харагдалтаас тооцоход таамагласан дундаж давтамж */
const ASSUMED_FREQUENCY = 1.6;

function BoostCalculator() {
  const [daily, setDaily] = useState(20000);
  const [days, setDays] = useState(5);
  const [cpm, setCpm] = useState(5000);
  const [ctr, setCtr] = useState(1);
  const [conv, setConv] = useState(5);
  const [profit, setProfit] = useState(25000);

  const budget = daily * days;
  const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
  const reach = impressions / ASSUMED_FREQUENCY;
  const clicks = impressions * (ctr / 100);
  const orders = clicks * (conv / 100);
  const cpa = orders > 0 ? budget / orders : 0;
  const net = orders * profit - budget;
  // Ашиг 0 гарах хөрвөлтийн хувь
  const breakEvenConv = clicks > 0 && profit > 0 ? budget / profit / clicks : 0;

  return (
    <>
      <p className="mb-3 text-[12px] text-zinc-500">Талбаруудын анхны утга нь жишээ — өөрийн бодит тоогоор солино уу.</p>
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-3">
        <MoneyField label="Өдрийн төсөв" value={daily} onChange={setDaily} />
        <NumberField label="Хэдэн хоног" value={days} onChange={setDays} suffix="хоног" max={90} />
        <MoneyField label="CPM (1,000 харагдалт)" value={cpm} onChange={setCpm} hint="Өмнөх зарынхаа Ads Manager-ээс" />
        <NumberField label="CTR (дарах хувь)" value={ctr} onChange={setCtr} suffix="%" max={100} hint="WordStream 2025: дундаж ~1.7% (АНУ)" />
        <NumberField label="Дарсан хүнээс захиалга" value={conv} onChange={setConv} suffix="%" max={100} />
        <MoneyField label="Нэг захиалгын ашиг" value={profit} onChange={setProfit} hint="Зарын зардлаас өмнө" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 @3xl:grid-cols-4">
        <Stat label="Нийт төсөв" value={formatMoney(budget)} />
        <Stat label="Хүрэлт (ойролцоо)" value={formatNumber(reach)} sub={`${formatNumber(impressions)} харагдалт`} />
        <Stat label="Дарсан" value={formatNumber(clicks)} />
        <Stat label="Захиалга" value={orders >= 10 ? formatNumber(orders) : orders.toFixed(1)} />
        <Stat label="Нэг захиалгын зардал" value={orders > 0 ? formatMoney(cpa) : "—"} strong />
        <Stat
          label="Зарын дараах ашиг"
          value={`${net < 0 ? "−" : ""}${formatMoney(Math.abs(net))}`}
          sub={net >= 0 ? "ашигтай" : "алдагдалтай"}
          strong
        />
        <Stat label="Тэнцэх хөрвөлт" value={breakEvenConv > 0 ? pct(breakEvenConv) : "—"} sub="үүнээс дээш бол ашигтай" />
        <Stat label="ROAS (ашгаар)" value={budget > 0 ? `${((orders * profit) / budget).toFixed(2)}×` : "—"} />
      </div>

      {budget > 0 && cpm > 0 && (
        <Verdict ok={net >= 0}>
          {net >= 0 ? (
            <>
              Энэ тоогоор нэг захиалга <strong>{formatMoney(cpa)}</strong>-д ирж, ашгаас (₮{formatNumber(profit)}) бага байна.
              Бодит үр дүн ижил гарвал төсвөө аажмаар нэмж болно.
            </>
          ) : (
            <>
              Нэг захиалга {orders > 0 ? <strong>{formatMoney(cpa)}</strong> : "тооцогдохгүй"} — ашгаасаа их. Ашигтай болохын тулд
              дарсан хүнээс захиалах хувь <strong>{pct(breakEvenConv)}</strong>-д хүрэх, эсвэл CTR-ээ өсгөх (креатив), нэг
              захиалгын ашгаа нэмэх (багц, үнэ) хэрэгтэй.
            </>
          )}
        </Verdict>
      )}
      <p className="mt-3 text-[12px] text-zinc-400">
        Ойролцоо тооцоо: Meta-ийн бодит үр дүн үзэгч, улирал, креативаас их хамаарна. Хүрэлтийг дундаж давтамж ~
        {ASSUMED_FREQUENCY} гэж тооцов. Анхны boost-ынхоо бодит CPM, CTR-ээр сольж оруулбал илүү оновчтой.
      </p>
    </>
  );
}

/* ---------------- Тэнцэх цэг ---------------- */

function BreakEvenCalculator() {
  const [price, setPrice] = useState(45000);
  const [unitCost, setUnitCost] = useState(20000);
  const [fixed, setFixed] = useState(3000000);
  const [discount, setDiscount] = useState(20);

  const unitProfit = price - unitCost;
  const margin = price > 0 ? unitProfit / price : 0;
  const markup = unitCost > 0 ? unitProfit / unitCost : 0;
  const units = unitProfit > 0 ? Math.ceil(fixed / unitProfit) : 0;
  const discounted = unitProfit - price * (discount / 100);
  const multiplier = discounted > 0 ? unitProfit / discounted : 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4">
        <MoneyField label="Зарах үнэ" value={price} onChange={setPrice} />
        <MoneyField label="Нэгжийн хувьсах зардал" value={unitCost} onChange={setUnitCost} hint="Түүхий эд, сав, хүргэлт" />
        <MoneyField label="Сарын тогтмол зардал" value={fixed} onChange={setFixed} hint="Түрээс, цалин г.м." />
        <NumberField label="Хямдрал хийвэл" value={discount} onChange={setDiscount} suffix="%" max={100} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 @3xl:grid-cols-4">
        <Stat label="Нэгжийн ашиг" value={`${unitProfit < 0 ? "−" : ""}${formatMoney(Math.abs(unitProfit))}`} />
        <Stat label="Ашгийн хувь (margin)" value={price > 0 ? pct(margin) : "—"} sub={unitCost > 0 ? `markup ${pct(markup, 0)}` : undefined} />
        <Stat
          label="Тэнцэх цэг"
          value={units > 0 ? `${formatNumber(units)} ш/сар` : "—"}
          sub={units > 0 ? `≈ ${Math.ceil(units / 30)} ш/өдөр` : undefined}
          strong
        />
        <Stat label="Нэг захиалгын зарын дээд зардал" value={unitProfit > 0 ? formatMoney(unitProfit) : "—"} strong />
      </div>

      {unitProfit <= 0 ? (
        <Verdict ok={false}>Үнэ хувьсах зардлаасаа бага эсвэл тэнцүү байна — зарах тусам алдагдал нэмэгдэнэ. Үнэ эсвэл өртгөө засаарай.</Verdict>
      ) : (
        discount > 0 && (
          <Verdict ok={discounted > 0}>
            {discounted > 0 ? (
              <>
                {discount}% хямдрал хийвэл нэгжийн ашиг <strong>{formatMoney(discounted)}</strong> болж буурна. Ижил ашиг олохын
                тулд <strong>{multiplier.toFixed(1)} дахин</strong> их зарах хэрэгтэй.
              </>
            ) : (
              <>
                {discount}% хямдрал таны ашгийн хувиас ({pct(margin)}) их — бүтээгдэхүүн бүр алдагдалтай зарагдана. Хямдралын оронд
                багц, бэлэг санал болгоорой.
              </>
            )}
          </Verdict>
        )
      )}
    </>
  );
}

/* ---------------- Татвар ---------------- */

type Form = "individual" | "llc";
type Year = "2026" | "2027";

const VAT_THRESHOLD: Record<Year, number> = { "2026": 50e6, "2027": 400e6 };
/** ХХК-ийн хялбаршуулсан журмаар тайлагнах борлуулалтын босго (2027 — мэдээлэгдсэн) */
const SIMPLE_REPORT: Record<Year, number> = { "2026": 50e6, "2027": 400e6 };
/** ХХК: орлогын 1% (хялбаршуулсан) */
const LLC_REVENUE_1PCT = 300e6;
/** ХХК: 90%-ийн хөнгөлөлтийн дээд босго */
const LLC_CREDIT_LIMIT: Record<Year, number> = { "2026": 1.5e9, "2027": 2.5e9 };
const LLC_BRACKETS: Record<Year, [number, number][]> = {
  "2026": [
    [6e9, 0.1],
    [Infinity, 0.25],
  ],
  "2027": [
    [6e9, 0.1],
    [10e9, 0.15],
    [Infinity, 0.25],
  ],
};
/** Хувиараа эрхлэгч: 2027 оноос 1%-ийн горимын борлуулалтын дээд хязгаар */
const INDIVIDUAL_1PCT_LIMIT_2027 = 1e9;

function progressive(income: number, brackets: [number, number][]) {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, limit) - prev) * rate;
    prev = limit;
  }
  return tax;
}

const sayMoney = (n: number) =>
  n >= 1e9
    ? `₮${(n / 1e9).toFixed(1).replace(/\.0$/, "")} тэрбум`
    : n >= 1e6
      ? `₮${formatNumber(n / 1e6)} сая`
      : formatMoney(n);

function TaxChecker() {
  const [form, setForm] = useState<Form>("individual");
  const [year, setYear] = useState<Year>("2026");
  const [revenue, setRevenue] = useState(80_000_000);
  const [profit, setProfit] = useState(20_000_000);

  const vatPayer = revenue >= VAT_THRESHOLD[year];
  let tax = 0;
  let how = "";
  let note = "";

  if (form === "individual") {
    const onePct = revenue * 0.01;
    const tenPct = profit * 0.1;
    const onePctAllowed = year === "2026" || revenue < INDIVIDUAL_1PCT_LIMIT_2027;
    if (onePctAllowed && (onePct <= tenPct || profit <= 0)) {
      tax = onePct;
      how = "Борлуулалтын орлогын 1%";
      note = profit > 0 ? `Ашгийн 10%-иар бол ${formatMoney(tenPct)} — 1% нь хямд.` : "Ашгаа оруулбал 10%-ийн хувилбартай харьцуулна.";
    } else {
      tax = tenPct;
      how = "Ашгийн 10%";
      note = onePctAllowed
        ? `Орлогын 1%-иар бол ${formatMoney(onePct)} — энд ашгийн 10% нь хямд (зардлын баримт бүрэн байх ёстой).`
        : "2027 оноос жилийн борлуулалт ₮1 тэрбум ба түүнээс дээш бол 1%-ийн горимд хамрагдахгүй.";
    }
  } else if (revenue <= LLC_REVENUE_1PCT) {
    tax = revenue * 0.01;
    how = "Орлогын 1% (хялбаршуулсан)";
    note =
      year === "2027"
        ? "2027 оны журмын эцсийн нарийвчлалыг татварын албанаас баталгаажуулаарай."
        : "Зарим үйл ажиллагаа хөнгөлөлтөд хамрагдахгүй байж болзошгүй — хуулиас шалга.";
  } else if (revenue <= LLC_CREDIT_LIMIT[year]) {
    tax = profit * 0.1 * 0.1;
    how = "Ашгийн 10%, үүний 90%-ийг хөнгөлнө";
    note = profit > 0 ? `Хөнгөлөлтгүй бол ${formatMoney(profit * 0.1)} байх байсан.` : "Ашгаа оруулбал тооцно.";
  } else {
    tax = progressive(profit, LLC_BRACKETS[year]);
    how = year === "2026" ? "Ашгаас 10% (₮6 тэрбумаас дээш 25%)" : "Ашгаас 10% / 15% (₮6–10 тэрбум) / 25%";
    note = "Татвар ногдох орлогыг ашгаар ойролцоолов.";
  }

  const reports: string[] = [];
  if (vatPayer) reports.push("НӨАТ — сар бүр, дараа сарын 10-ны дотор");
  if (form === "llc") {
    reports.push(
      revenue <= SIMPLE_REPORT[year]
        ? "ААНОАТ — хялбаршуулсан журмаар (жилд 1–2 удаа)"
        : "ААНОАТ — улирал бүр (дараа сарын 20) + жилийн (2-р сарын 10)",
    );
  } else {
    reports.push("ХХОАТ — жилийн тайлан, дараа оны 2-р сарын 15-ны дотор");
  }
  reports.push("И-баримт — борлуулалт бүрт олгоно");
  reports.push("Ажилтантай бол: НДШ сар бүр, цалингийн ХХОАТ суутгал");

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Segmented<Form>
          value={form}
          onChange={setForm}
          options={[
            { value: "individual", label: "Хувиараа эрхлэгч" },
            { value: "llc", label: "ХХК" },
          ]}
        />
        <Segmented<Year>
          value={year}
          onChange={setYear}
          options={[
            { value: "2026", label: "2026 он" },
            { value: "2027", label: "2027 оноос" },
          ]}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 @lg:grid-cols-2">
        <MoneyField label="Жилийн борлуулалтын орлого" value={revenue} onChange={setRevenue} hint={revenue ? `= ${sayMoney(revenue)}` : undefined} />
        <MoneyField label="Жилийн ашиг (орлого − зардал)" value={profit} onChange={setProfit} hint="Мэдэхгүй бол ойролцоо" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 @2xl:grid-cols-3">
        <Stat
          label="НӨАТ төлөгч болох уу?"
          value={vatPayer ? "Тийм" : "Үгүй"}
          sub={`Босго ${sayMoney(VAT_THRESHOLD[year])}`}
          strong={vatPayer}
        />
        <Stat label="Орлогын татвар (жилд, ойролцоо)" value={formatMoney(tax)} sub={how} strong />
        <Stat label="Сар бүр хойш тавих" value={formatMoney(tax / 12)} sub={vatPayer ? "+ НӨАТ тусад нь" : undefined} />
      </div>

      {note && <p className="mt-3 text-[13px] text-zinc-600">{note}</p>}

      <div className="mt-4 rounded-xl bg-zinc-900/[0.04] p-4">
        <p className="text-[13px] font-medium text-zinc-900">Танд хамаарах тайлан, үүрэг</p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-zinc-700">
          {reports.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[12px] text-zinc-400">
        Ерөнхий ойролцоо тооцоо (2026 оны 11-р сарын байдлаар), татварын зөвлөгөө биш. Салбарын онцлог, хөнгөлөлт, тайлангийн
        яг хугацааг mta.gov.mn, нягтлан бодогчоор баталгаажуулаарай.
      </p>
    </>
  );
}
