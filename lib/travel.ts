// 機票 + 住宿：粗估成本與快速搜尋連結（純函式，前端可用）
//
// 定位：簡單、快速 —— 不串接付費 API。估算僅供抓預算用，實際價格請點搜尋連結。

import type { TierKey } from "./types";
import { getCurrency } from "./currency";

// 各級距的美元基準（會再依地區係數調整）
const FLIGHT_USD: Record<TierKey, number> = { low: 220, mid: 420, high: 780 }; // 來回 / 每人
const HOTEL_USD: Record<TierKey, number> = { low: 45, mid: 95, high: 200 }; // 每晚 / 每房

type Region = "asia" | "europe" | "americas" | "oceania" | "mideast" | "other";

function regionOf(destination: string): Region {
  const d = (destination || "").toLowerCase();
  if (/日本|韓|韩|泰|曼谷|首爾|首尔|東京|大阪|京都|香港|澳門|澳门|新加坡|馬來|马来|吉隆坡|越南|胡志明|峇里|巴里|印尼|菲律|宿霧|上海|中國|中国|台|japan|korea|thai|bangkok|seoul|tokyo|osaka|hong\s*kong|macau|singapore|malaysia|vietnam|bali|indonesia|philippin|shanghai|china/.test(d))
    return "asia";
  if (/法|巴黎|義|羅馬|罗马|西班牙|巴塞|英|倫敦|伦敦|瑞士|蘇黎世|苏黎世|德|柏林|歐|paris|rome|italy|spain|barcelona|london|swiss|zurich|german|berlin|europe/.test(d))
    return "europe";
  if (/美國|美国|紐約|纽约|加拿大|溫哥華|温哥华|墨西|巴西|new\s*york|usa|america|canada|vancouver|mexico|brazil/.test(d))
    return "americas";
  if (/澳洲|雪梨|悉尼|紐西蘭|新西兰|奧克蘭|奥克兰|australia|sydney|new\s*zealand|auckland/.test(d))
    return "oceania";
  if (/杜拜|阿聯|阿联|沙烏地|沙特|土耳其|伊斯坦堡|伊斯坦布尔|埃及|dubai|uae|saudi|turkey|istanbul|egypt/.test(d))
    return "mideast";
  return "other";
}

const FLIGHT_FACTOR: Record<Region, number> = {
  asia: 0.65, europe: 1.4, americas: 1.55, oceania: 1.6, mideast: 1.2, other: 1.0,
};
const HOTEL_FACTOR: Record<Region, number> = {
  asia: 0.95, europe: 1.2, americas: 1.3, oceania: 1.25, mideast: 1.15, other: 1.0,
};

function niceRound(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v);
  return Math.max(1, Math.round(v));
}

export interface TravelEstimate {
  flightPerPersonHome: number;
  flightTotalHome: number;
  nights: number;
  rooms: number;
  hotelPerNightSpending: number;
  hotelTotalSpending: number;
  hotelTotalHome: number;
  travelTotalHome: number; // 機票 + 住宿（本國幣別）
}

/**
 * 粗估機票與住宿成本。
 * @param rate 今日匯率（1 spending = ? home）
 */
export function estimateTravel(p: {
  destination: string;
  tier: TierKey;
  spendingCurrency: string;
  homeCurrency: string;
  nights: number;
  headcount: number;
  rate: number;
}): TravelEstimate {
  const region = regionOf(p.destination);
  const homeUsd = getCurrency(p.homeCurrency).usdPerUnit;
  const spendUsd = getCurrency(p.spendingCurrency).usdPerUnit;
  const rate = p.rate > 0 ? p.rate : spendUsd / homeUsd;

  const nights = Math.max(0, p.nights);
  const headcount = Math.max(1, p.headcount);
  const rooms = Math.max(1, Math.ceil(headcount / 2));

  const flightUsd = FLIGHT_USD[p.tier] * FLIGHT_FACTOR[region];
  const hotelUsd = HOTEL_USD[p.tier] * HOTEL_FACTOR[region];

  const flightPerPersonHome = niceRound(flightUsd / homeUsd);
  const flightTotalHome = flightPerPersonHome * headcount;

  const hotelPerNightSpending = niceRound(hotelUsd / spendUsd);
  const hotelTotalSpending = hotelPerNightSpending * nights * rooms;
  const hotelTotalHome = Math.round(hotelTotalSpending * rate);

  return {
    flightPerPersonHome,
    flightTotalHome,
    nights,
    rooms,
    hotelPerNightSpending,
    hotelTotalSpending,
    hotelTotalHome,
    travelTotalHome: flightTotalHome + hotelTotalHome,
  };
}

// --- 快速搜尋連結 ---

export interface BookingLink {
  label: string;
  emoji: string;
  url: string;
  kind: "flight" | "hotel";
}

/** 由「日本・關西」這類字串取出可搜尋的地名（關西）。 */
export function placeName(destination: string): string {
  const parts = (destination || "").split(/[・·]/);
  return (parts[parts.length - 1] || destination || "").trim();
}

export function bookingLinks(
  destination: string,
  startDate: string,
  endDate: string,
  headcount: number
): BookingLink[] {
  const place = placeName(destination);
  const p = encodeURIComponent(place);
  const adults = Math.max(1, headcount || 1);
  const flightQ = encodeURIComponent(`Flights to ${place} ${startDate} to ${endDate}`);

  return [
    {
      label: "Google Flights",
      emoji: "✈️",
      kind: "flight",
      url: `https://www.google.com/travel/flights?q=${flightQ}`,
    },
    {
      label: "Skyscanner",
      emoji: "✈️",
      kind: "flight",
      url: `https://www.skyscanner.com/transport/flights/?destination=${p}`,
    },
    {
      label: "Booking.com",
      emoji: "🏨",
      kind: "hotel",
      url: `https://www.booking.com/searchresults.html?ss=${p}&checkin=${startDate}&checkout=${endDate}&group_adults=${adults}`,
    },
    {
      label: "Agoda",
      emoji: "🏨",
      kind: "hotel",
      url: `https://www.agoda.com/search?q=${p}`,
    },
  ];
}
