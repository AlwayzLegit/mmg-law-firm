import { Eyebrow } from "./primitives/eyebrow";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Kept for call-site compatibility; colour now follows the surface. */
  inverted?: boolean;
};

/** Legacy name → v2 Eyebrow. Surface-aware (gold-deep on paper, gold on ink). */
export function SectionEyebrow({ children, className }: Props) {
  return <Eyebrow className={className}>{children}</Eyebrow>;
}
