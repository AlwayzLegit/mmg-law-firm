import ReadOnlyForIntake from "@/components/admin/read-only-for-intake";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReadOnlyForIntake>{children}</ReadOnlyForIntake>;
}
