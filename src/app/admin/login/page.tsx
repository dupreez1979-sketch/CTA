import Image from "next/image";

export const dynamic = "force-dynamic";

/**
 * Branded admin login, replacing the browser's Basic auth prompt. Styled
 * like the sign-up popup: cream card, hard shadow, display type.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--cta-cream)",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--cta-cream-warm)",
          border: "3px solid var(--cta-ink)",
          borderRadius: 22,
          boxShadow: "12px 12px 0 var(--cta-ink)",
          padding: "38px 32px 34px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Image
          src="/logo-full.png"
          alt="The Children's Theatre Alliance"
          width={220}
          height={70}
          style={{ height: 70, width: "auto", margin: "0 auto 20px" }}
          priority
        />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            fontSize: 38,
            lineHeight: 0.94,
            margin: "0 0 10px",
            color: "var(--cta-ink)",
          }}
        >
          Newsletter admin
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--text-muted)",
            margin: "0 0 22px",
          }}
        >
          Enter the admin password to manage the Alliance newsletter and The
          Showcase.
        </p>
        {error && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--cta-ink)",
              background: "var(--cta-pink)",
              border: "2px solid var(--cta-ink)",
              borderRadius: 10,
              padding: "9px 14px",
              margin: "0 0 18px",
            }}
          >
            That password isn&#39;t right. Try again.
          </p>
        )}
        <form method="post" action="/api/admin-login">
          <label
            htmlFor="admin-password"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            name="password"
            required
            autoFocus
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              padding: "12px 14px",
              border: "2px solid var(--cta-ink)",
              borderRadius: 12,
              background: "var(--cta-white)",
              width: "100%",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--cta-ink)",
              background: "var(--cta-purple)",
              border: "2px solid var(--cta-ink)",
              borderRadius: 14,
              padding: "13px 20px",
              width: "100%",
              cursor: "pointer",
              boxShadow: "5px 5px 0 var(--cta-ink)",
            }}
          >
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}
