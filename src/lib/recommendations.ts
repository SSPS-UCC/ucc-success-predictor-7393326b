import type { PredictionResult, Inputs } from "./model";
import { nextClassUp } from "./model";

export type Advice = {
  title: string;
  body: string;
  tone: "focus" | "good" | "watch";
};

/**
 * Dynamic academic coaching. Everything below reacts to what the student
 * actually entered, the UCC 40% continuous assessment / 60% examination split,
 * and how far they are from the next degree class.
 */
export function buildRecommendations(inputs: Inputs, result: PredictionResult): Advice[] {
  const out: Advice[] = [];
  const g = result.gpa;
  const next = nextClassUp(g);
  const num = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : null);

  // 1. Where they stand and the gap to the next class
  if (next) {
    const gap = +(next.min - g).toFixed(2);
    out.push({
      title: `You are ${gap.toFixed(2)} GPA points away from ${next.name}`,
      body:
        gap <= 0.15
          ? `${next.name} is realistically within reach this year. A consistent lift of about ${Math.ceil(gap * 25)}% in your weakest assessment area across all credit hours should carry you over the line — do not drop a single quiz.`
          : `Closing a ${gap.toFixed(2)} gap needs a deliberate plan: target grade A (80+) in the courses carrying the highest credit hours, because CGPA is credit-weighted, and protect your existing scores in the rest.`,
      tone: gap <= 0.3 ? "focus" : "watch",
    });
  } else {
    out.push({
      title: "You are tracking First Class - protect it",
      body: "At this level the risk is complacency in a single high-credit course. One C in a 3-credit course can pull a First Class down. Keep every continuous assessment above 80 and revise examinable topics weekly.",
      tone: "good",
    });
  }

  // 2. The 40% continuous assessment breakdown
  const ca = [
    { key: "quiz1_score", label: "Quiz 1", v: num(inputs.quiz1_score) },
    { key: "quiz2_score", label: "Quiz 2", v: num(inputs.quiz2_score) },
    { key: "assignment_score", label: "Assignment", v: num(inputs.assignment_score) },
    { key: "presentation_score", label: "Presentation", v: num(inputs.presentation_score) },
    { key: "practical_score", label: "Practical / Lab", v: num(inputs.practical_score) },
    { key: "participation_score", label: "Participation", v: num(inputs.participation_score) },
  ].filter((c) => c.v !== null) as { key: string; label: string; v: number }[];

  if (ca.length) {
    const weak = ca.filter((c) => c.v < 70).sort((a, b) => a.v - b.v);
    const avg = ca.reduce((s, c) => s + c.v, 0) / ca.length;
    const caContribution = (avg / 100) * 40;
    if (weak.length) {
      out.push({
        title: `Master these first: ${weak.map((w) => w.label).join(", ")}`,
        body: `Your weakest component is ${weak[0]!.label} at ${weak[0]!.v}%. Continuous assessment is 40 marks of the course — right now your CA average of ${avg.toFixed(1)}% is worth about ${caContribution.toFixed(1)} of those 40 marks. These are the cheapest marks on the course because they are earned before the examination hall. Submit every assignment early, rehearse presentations aloud, and treat each quiz as a mini-exam.`,
        tone: "focus",
      });
    } else {
      out.push({
        title: `Your 40% continuous assessment is strong (${avg.toFixed(1)}%)`,
        body: `That converts to roughly ${caContribution.toFixed(1)} of the 40 CA marks, so you enter the examination hall already ahead. Now the 60% examination decides your class — build past-question practice into every study week.`,
        tone: "good",
      });
    }
    const needExam = Math.max(0, (70 - caContribution) / 0.6);
    out.push({
      title: `Examination target: about ${Math.min(100, Math.round(needExam))}% in the 60% paper`,
      body: `To finish that course around a B/A range you need roughly ${Math.min(100, Math.round(needExam))}% in the final examination, given the CA marks you already have. Work backwards from that number: past questions, timed essays, and the lecturer's emphasised topics.`,
      tone: "watch",
    });
  } else {
    out.push({
      title: "Enter your quiz, assignment and presentation scores",
      body: "The 40% continuous assessment (quizzes, assignments, presentations, practicals, participation) is where most CoDE students silently lose their class. Supply those scores and the system will tell you exactly what you must score in the 60% examination.",
      tone: "watch",
    });
  }

  // 3. Attendance / study habits
  const att = num(inputs.attendance_pct);
  if (att !== null) {
    out.push({
      title: att < 75 ? `Attendance at ${att}% is a red flag` : `Attendance of ${att}% is working for you`,
      body:
        att < 75
          ? "CoDE face-to-face sessions carry the tutor's examination emphasis. Below 75% attendance you are guessing at what will be examined. Fix attendance before you buy another textbook."
          : "Keep it up, and convert attendance into value by asking one clarifying question per session and writing a 5-line summary after each meeting.",
      tone: att < 75 ? "focus" : "good",
    });
  }

  const hrs = num(inputs.study_hours_per_week);
  if (hrs !== null) {
    out.push({
      title: hrs < 6 ? `${hrs} study hours a week is thin` : `${hrs} study hours a week is a solid base`,
      body:
        hrs < 6
          ? `As a non-residential student your study time is the variable you fully control. Moving from ${hrs} to about 8 focused hours a week (four 2-hour blocks) is, in this model, worth roughly ${(0.011325 * (8 - hrs)).toFixed(2)} GPA points on its own.`
          : "Protect the routine. Quality beats quantity: active recall and past questions, not re-reading notes.",
      tone: hrs < 6 ? "focus" : "good",
    });
  }

  // 4. Credit-hour strategy
  const credits = num(inputs.course_credits);
  out.push({
    title: "Play the credit hours, not just the courses",
    body: credits
      ? `You are carrying ${credits} credit hours. CGPA = total grade points / total credit hours, so a grade in a 3-credit course moves your CGPA three times more than the same grade in a 1-credit course. Rank your courses by credit hours and give the heaviest ones your first study block each week.`
      : "CGPA is credit-weighted: a grade in a 3-credit course counts three times as much as a 1-credit course. Rank your courses by credit hours and give the heaviest ones your best study time.",
    tone: "watch",
  });

  // 5. Biggest single lever from the model
  const lever = result.drivers.find((d) => d.provided && d.contribution < -0.02);
  if (lever) {
    out.push({
      title: `Biggest single lever: ${lever.label}`,
      body: `Compared with the average CoDE student in the training data, ${lever.label} is pulling your predicted CGPA down by about ${Math.abs(lever.contribution).toFixed(2)} points. Raising it to the class average alone would recover most of that.`,
      tone: "focus",
    });
  }

  if (result.passFail === "Fail") {
    out.push({
      title: "Immediate action required",
      body: "The projection is below the 1.00 pass threshold. Meet your CoDE study centre coordinator this week about resit strategy and course load before the next semester registration closes.",
      tone: "focus",
    });
  }

  return out;
}
