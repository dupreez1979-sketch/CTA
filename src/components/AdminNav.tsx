"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import Image from "next/image";

/**
 * A brief spinner shown on the tab being navigated to, so a slow page
 * load is visibly "loading" rather than feeling stuck. useLinkStatus
 * reads the nearest parent Link's pending state.
 */
function NavSpinner() {
  const { pending } = useLinkStatus();
  return pending ? <span className="nav-spinner" aria-hidden="true" /> : null;
}

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
      <p className="admin-app-name">Newsletter Admin</p>
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
        {tabs
          .filter((t) => t.id !== "settings")
          .map((t) => (
            <Link
              prefetch={false}
              key={t.id}
              href={`/admin?tab=${t.id}`}
              className="admin-nav-link"
              aria-current={active === t.id}
              onClick={() => setOpen(false)}
            >
              {t.label}
              <NavSpinner />
            </Link>
          ))}
        {/* Settings and Log out as icons: the text menu stays compact. */}
        <Link
          prefetch={false}
          href="/admin?tab=settings"
          className="admin-nav-link admin-nav-icon"
          aria-current={active === "settings"}
          aria-label="Settings"
          title="Settings"
          onClick={() => setOpen(false)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
          </svg>
          <span className="admin-nav-icon-label">Settings</span>
          <NavSpinner />
        </Link>
        <form action="/api/admin-logout" method="post">
          <button
            type="submit"
            className="admin-nav-link admin-nav-icon"
            aria-label="Log out"
            title="Log out"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="admin-nav-icon-label">Log out</span>
          </button>
        </form>
      </nav>
    </header>
  );
}
