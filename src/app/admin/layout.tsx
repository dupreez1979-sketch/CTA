/**
 * Admin shell: a flex column so the footer's ink band always reaches the
 * bottom of the screen, even on short tabs (anything past the footer shows
 * as ink, like the website).
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell">{children}</div>;
}
