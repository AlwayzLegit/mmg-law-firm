import { DMV_REPORT_CHECKLIST, DMV_REPORT_LINK_TEXT, DMV_REPORT_SOURCE } from "@/lib/data/approved-accident-copy";

/** Link only the approved DMV citation; other checklist text is unchanged. */
export function PracticeChecklistText({ text }: { text: string }) {
  if (text !== DMV_REPORT_CHECKLIST) return <>{text}</>;
  return <>
    {text.slice(0, -DMV_REPORT_LINK_TEXT.length)}
    <a href={DMV_REPORT_SOURCE} className="underline underline-offset-4">{DMV_REPORT_LINK_TEXT}</a>
  </>;
}
