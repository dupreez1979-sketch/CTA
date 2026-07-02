import SignupPopup from "@/components/SignupPopup";
import PuzzleShape from "@/components/PuzzleShape";

/**
 * Hosted sign-up page: the popup card sits centred on the cream page with
 * decorative puzzle shapes scattered in the margins (per the brand's
 * cut-paper aesthetic). Shareable at the app root.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 44,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -30, right: 60 }}>
        <PuzzleShape shape="arch" color="teal" size={110} />
      </div>
      <div style={{ position: "absolute", bottom: 60, left: -24 }}>
        <PuzzleShape shape="circle" color="sky" size={90} />
      </div>
      <div
        style={{ position: "absolute", bottom: -28, right: 140 }}
      >
        <PuzzleShape shape="stairs" color="pink" size={96} rotate={6} />
      </div>
      <div style={{ position: "absolute", top: 120, left: 80 }}>
        <PuzzleShape shape="quarter" color="emerald" size={64} rotate={-8} />
      </div>
      <SignupPopup />
    </main>
  );
}
