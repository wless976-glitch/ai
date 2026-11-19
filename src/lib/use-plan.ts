"use client";

import { useUser } from "@clerk/nextjs";
import { MAX_PLATFORMS, MONTHLY_POSTS, planOf, type Plan } from "./plan";

/**
 * Одоогийн хэрэглэгчийн багц (Clerk-ийн publicMetadata-аас). Нэвтрээгүй бол Үнэгүй.
 * `isLoaded` худал үед түгжээ харуулахгүй — Plus хэрэглэгчид түгжээ анивчихаас сэргийлнэ.
 */
export function usePlan() {
  const { isLoaded, isSignedIn, user } = useUser();
  const plan: Plan = isSignedIn ? planOf(user.publicMetadata) : "free";
  return {
    plan,
    isLoaded,
    isPlus: plan === "plus",
    /** Ачаалж дууссан бөгөөд Үнэгүй багцтай — түгжээ харуулах эсэх */
    locked: isLoaded && plan !== "plus",
    monthlyPosts: MONTHLY_POSTS[plan],
    maxPlatforms: MAX_PLATFORMS[plan],
  };
}
