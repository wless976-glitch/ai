"use client";

import { useState } from "react";
import { PASS_RATE, type Module } from "@/lib/academy";
import { useStore } from "@/lib/store";
import { IconCheck, IconRefresh, IconX } from "../icons";
import { Badge, Button, cn } from "../ui";

/** Модулийн төгсгөлийн шалгалт: хариулаад "Шалгах" дарахад оноо, тайлбар гарна, хамгийн өндөр оноо хадгалагдана */
export function Quiz({ module, onNext }: { module: Module; onNext?: () => void }) {
  const { quizScores, saveQuizScore, notify } = useStore();
  const [answers, setAnswers] = useState<(number | null)[]>(() => module.quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const best = quizScores[module.id];
  const correct = answers.filter((a, i) => a === module.quiz[i].answer).length;
  const score = correct / module.quiz.length;
  const passed = score >= PASS_RATE;
  const allAnswered = answers.every((a) => a !== null);

  function submit() {
    setSubmitted(true);
    saveQuizScore(module.id, score);
    notify(passed ? `Тэнцлээ! ${correct}/${module.quiz.length} зөв 🎉` : `${correct}/${module.quiz.length} зөв — тайлбарыг уншаад дахин оролдоорой`, passed ? "success" : "info");
  }

  function retry() {
    setAnswers(module.quiz.map(() => null));
    setSubmitted(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-zinc-900">Шалгалт: {module.title}</h2>
        {best !== undefined && (
          <Badge tone={best >= PASS_RATE ? "emerald" : "amber"}>Шилдэг оноо {Math.round(best * 100)}%</Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {module.quiz.length} асуулт · {Math.round(PASS_RATE * 100)}%-иас дээш зөв бол тэнцэнэ.
      </p>

      <ol className="mt-6 space-y-5">
        {module.quiz.map((q, qi) => {
          const chosen = answers[qi];
          const isRight = chosen === q.answer;
          return (
            <li key={q.q} className="rounded-2xl bg-surface p-4 ring-1 ring-zinc-900/[0.07] sm:p-5">
              <p className="font-medium text-zinc-900">
                <span className="mr-1.5 text-zinc-400">{qi + 1}.</span>
                {q.q}
              </p>
              <div className="mt-3 grid gap-2" role="radiogroup" aria-label={q.q}>
                {q.options.map((opt, oi) => {
                  const selected = chosen === oi;
                  const showRight = submitted && oi === q.answer;
                  const showWrong = submitted && selected && !isRight;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[14px] ring-1 ring-inset transition disabled:cursor-default",
                        showRight
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
                          : showWrong
                            ? "bg-rose-50 text-rose-900 ring-rose-300"
                            : selected
                              ? "bg-zinc-900 text-zinc-50 ring-zinc-900"
                              : "text-zinc-700 ring-zinc-900/10 hover:bg-zinc-50 hover:ring-zinc-900/20",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                          selected && !submitted ? "bg-lime ring-lime" : "ring-current/30",
                        )}
                      >
                        {showRight && <IconCheck className="size-3.5" />}
                        {showWrong && <IconX className="size-3.5" />}
                        {selected && !submitted && <span className="size-2 rounded-full bg-ink" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className={cn("mt-3 text-[13px] leading-relaxed", isRight ? "text-emerald-700" : "text-zinc-600")}>
                  <strong className="font-semibold">{isRight ? "Зөв. " : "Тайлбар: "}</strong>
                  {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {submitted ? (
          <>
            <p className={cn("text-sm font-medium", passed ? "text-emerald-700" : "text-zinc-700")}>
              {correct}/{module.quiz.length} зөв ({Math.round(score * 100)}%) — {passed ? "Тэнцлээ!" : "Дахин оролдоорой"}
            </p>
            <Button variant="secondary" onClick={retry}>
              <IconRefresh className="size-4" /> Дахин өгөх
            </Button>
            {passed && onNext && <Button onClick={onNext}>Дараагийн модуль</Button>}
          </>
        ) : (
          <Button onClick={submit} disabled={!allAnswered}>
            <IconCheck className="size-4" /> Шалгах
          </Button>
        )}
        {!submitted && !allAnswered && <p className="text-[13px] text-zinc-400">Бүх асуултад хариулна уу</p>}
      </div>
    </div>
  );
}
