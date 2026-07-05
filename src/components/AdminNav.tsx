"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

/**
 * Admin top navigation, styled like the Alliance website: logo, the app's
 * name so it isn't confused with the website, then plain text links with
 * the active page underlined. On narrow screens the links collapse behind
 * a burger that opens a full-screen mint overlay; selecting an item closes
 * it (links navigate client-side, so the overlay must close itself).
 */
export default function AdminNav({
  tabs,
  active,
}: {
  tabs: ReadonlyArray<{ id: string; label: string }>;
  active: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="admin-nav">
      <Image
        src="/logo-full.png"
        alt="The Children's Theatre Alliance"
        width={139}
        height={44}
        className="admin-nav-logo"
        priority
      />
      <h1 className="admin-app-name">Newsletter Admin</h1>
      <button
        type="button"
        className="admin-menu-button"
        aria-label="Open the menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav
        className={`admin-nav-links${open ? " admin-nav-links-open" : ""}`}
      >
        <button
          type="button"
          className="admin-menu-close"
          aria-label="Close the menu"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        {tabs.map((t) => (
          <Link
            prefetch={false}
            key={t.id}
            href={`/admin?tab=${t.id}`}
            className="admin-nav-link"
            aria-current={active === t.id}
            onClick={() => setOpen(false)}
          >
            {t.label}
          </Link>
        ))}
        <form action="/api/admin-logout" method="post">
          <button type="submit" className="admin-nav-link">
            Log out
          </button>
        </form>
      </nav>
    </header>
  );
}
