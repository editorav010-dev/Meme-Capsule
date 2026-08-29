import { type CatUser } from "./catTypes";

interface CatCompleteProps {
  user: CatUser;
  onLogout: () => void;
  onRestart: () => void;
}

export default function CatComplete({ user, onLogout, onRestart }: CatCompleteProps) {
  return (
    <div className="cat-root cat-login-container">
      <div className="cat-login-card" style={{ maxWidth: "560px", padding: "48px 36px" }}>
        <div style={{ fontSize: "72px", color: "#34C759", fontFamily: "Anton", lineHeight: 1, marginBottom: "8px" }}>
          ✓
        </div>
        <h1 className="cat-font-anton cat-text-gold" style={{ fontSize: "56px", margin: "0 0 8px 0", lineHeight: 1.1 }}>
          ALL DONE!
        </h1>
        <p className="cat-text-muted" style={{ fontSize: "16px", marginBottom: "28px" }}>
          Outstanding work, {user.display_name}. You have reviewed all available memes in the capsule.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            className="cat-btn-primary"
            onClick={onRestart}
            style={{ maxWidth: "220px", background: "#f4c300", color: "#131313", borderColor: "#9b30ff" }}
          >
            REFRESH QUEUE
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{
              maxWidth: "160px",
              background: "#262626",
              color: "#dd0061",
              border: "2px solid #dd0061",
              padding: "12px 18px",
              fontFamily: "Anton",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  );
}
