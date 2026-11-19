import { mnMN } from "@clerk/localizations";

/**
 * Clerk-ийн монгол орчуулгад дутуу (англиар гарч буй) бүртгэл/нэвтрэх хэсгийн бичвэрүүдийг нөхнө.
 * Шинэ англи бичвэр харагдвал энд нэмнэ.
 */
export const clerkLocalization: typeof mnMN = {
  ...mnMN,
  formFieldInputPlaceholder__signUpPassword: "Нууц үгээ үүсгэнэ үү",
  formFieldInput__emailAddress_format: "Жишээ: name@example.com",
  signIn: {
    ...mnMN.signIn,
    start: {
      ...mnMN.signIn?.start,
      titleCombined: "{{applicationName}} руу нэвтрэх",
    },
    passwordPwned: { ...mnMN.signIn?.passwordPwned, title: "Нууц үг аюулгүй бус байна" },
    passwordCompromised: { ...mnMN.signIn?.passwordCompromised, title: "Нууц үг аюулгүй бус байна" },
    protectCheck: {
      ...mnMN.signIn?.protectCheck,
      title: "Хүсэлтийг шалгаж байна",
      subtitle: "Түр хүлээнэ үү.",
      loading: "Ачаалж байна…",
      retryButton: "Дахин оролдох",
    },
  },
  signUp: {
    ...mnMN.signUp,
    start: {
      ...mnMN.signUp?.start,
      actionLink__use_email: "Имэйлээр бүртгүүлэх",
      actionLink__use_phone: "Утсаар бүртгүүлэх",
    },
    protectCheck: {
      ...mnMN.signUp?.protectCheck,
      title: "Хүсэлтийг шалгаж байна",
      subtitle: "Түр хүлээнэ үү.",
      loading: "Ачаалж байна…",
      retryButton: "Дахин оролдох",
    },
  },
};
