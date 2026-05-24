import {
  Database,
  Download,
  Edit3,
  ExternalLink,
  ImagePlus,
  Link as LinkIcon,
  ListChecks,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  archiveBackendMeme,
  listBackendMemes,
  saveBackendMeme,
  syncR2ToD1,
  uploadBackendMemeFile
} from "../lib/adminApi";
import {
  AdminMeme,
  detectMediaType,
  emptyAdminMeme,
  normalizeAdminMeme,
  parseTags,
  readAdminCollection,
  serializeTags,
  writeAdminCollection
} from "../lib/adminCollection";
import type { MemeInputMethod, MemeStatus, Rarity } from "../types";
import "./admin.css";

type FormState = Omit<AdminMeme, "tags"> & {
  tags: string;
};

const ADMIN_TOKEN_KEY = "meme-capsule:admin-api-token";

const toFormState = (meme: AdminMeme): FormState => ({
  ...meme,
  tags: serializeTags(meme.tags)
});

const fromFormState = (form: FormState): AdminMeme =>
  normalizeAdminMeme({
    ...form,
    tags: parseTags(form.tags),
    media_type: form.media_type || detectMediaType(form.url)
  });

export default function AdminApp() {
  const [collection, setCollection] = useState<AdminMeme[]>(() => readAdminCollection());
  const [form, setForm] = useState<FormState>(() => toFormState(emptyAdminMeme()));
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState(() => window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [backendMode, setBackendMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState("Admin collection is local draft storage until the Cloudflare backend is connected.");
  const [backendConfig, setBackendConfig] = useState<{ hasR2PublicUrl?: boolean; hasDatabase?: boolean }>({});
  const [backendActiveCount, setBackendActiveCount] = useState<number | null>(null);

  const stats = useMemo(() => {
    const active = collection.filter((meme) => meme.status === "active").length;
    const drafts = collection.filter((meme) => meme.status === "draft").length;
    const archived = collection.filter((meme) => meme.status === "archived").length;
    return { active, drafts, archived, total: collection.length };
  }, [collection]);

  const updateCollection = (nextCollection: AdminMeme[], message: string) => {
    setCollection(nextCollection);
    writeAdminCollection(nextCollection);
    setNotice(message);
  };

  const updateForm = (key: keyof FormState, value: string | number) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const resetForm = () => {
    setForm(toFormState(emptyAdminMeme()));
    setEditingOriginalId(null);
  };

  const handleUrlInput = (inputMethod: MemeInputMethod, value: string) => {
    setForm((current) => ({
      ...current,
      input_method: inputMethod,
      url: value,
      storage_path: "",
      source_link: value,
      media_type: detectMediaType(value)
    }));
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (backendMode && adminToken) {
      setIsSyncing(true);
      try {
        const uploaded = await uploadBackendMemeFile(adminToken, file);
        setForm((current) => ({
          ...current,
          title: current.title || file.name.replace(/\.[^.]+$/, ""),
          url: uploaded.url,
          storage_path: uploaded.storage_path,
          source_link: uploaded.source_link,
          input_method: "upload",
          media_type: uploaded.media_type
        }));
        setNotice("File uploaded to Cloudflare R2. Review details, then save the meme.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Backend upload failed.");
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileUrl = String(reader.result || "");
      setForm((current) => ({
        ...current,
        title: current.title || file.name.replace(/\.[^.]+$/, ""),
        url: fileUrl,
        storage_path: "",
        source_link: file.name,
        input_method: "upload",
        media_type: file.type.startsWith("video/") ? "video" : "image"
      }));
      setNotice("File loaded as a local draft preview. Use Supabase/Cloudinary for production storage.");
    };
    reader.readAsDataURL(file);
  };

  const saveToken = () => {
    window.sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    setNotice("Admin token saved for this browser session.");
  };

  const loadBackend = async () => {
    if (!adminToken.trim()) {
      setNotice("Enter your admin API token before loading the backend.");
      return;
    }

    setIsSyncing(true);
    try {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
      const response = await fetch("/api/admin/memes", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "X-Admin-Token": adminToken
        },
        cache: "no-store"
      });
      
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Request failed with ${response.status}`);
      }

      setCollection((payload.memes || []).map(normalizeAdminMeme));
      setBackendConfig(payload.config || {});
      setBackendMode(true);
      
      const activeCount = (payload.memes || []).filter((m: any) => m.status === "active").length;
      setBackendActiveCount(activeCount);
      
      setNotice(`Backend connected. ${payload.memes?.length || 0} production memes loaded.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load backend collection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const useLocalMode = () => {
    setCollection(readAdminCollection());
    setBackendMode(false);
    setNotice("Switched to local draft mode.");
  };

  const handleSyncR2 = async () => {
    if (!adminToken.trim()) {
      setNotice("Enter your admin API token before syncing.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncR2ToD1(adminToken);
      setNotice(
        `✅ ${result.message} (${result.totalR2Files} total in R2, ${result.alreadyInD1} already tracked)`
      );

      // Auto-reload the collection to show newly synced memes
      if (result.newlySynced > 0) {
        const memes = await listBackendMemes(adminToken);
        setCollection(memes.map(normalizeAdminMeme));
        const activeCount = memes.filter((m) => m.status === "active").length;
        setBackendActiveCount(activeCount);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "R2 sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const meme = fromFormState(form);

    if (!meme.url) {
      setNotice("Add a direct URL, Google Drive link, or uploaded file first.");
      return;
    }

    const idConflict = collection.some(
      (existing) => existing.id === meme.id && existing.id !== editingOriginalId
    );
    if (idConflict) {
      setNotice("That meme ID already exists. Use a unique ID before saving.");
      return;
    }

    if (backendMode) {
      if (!adminToken.trim()) {
        setNotice("Backend mode needs an admin API token.");
        return;
      }

      setIsSyncing(true);
      try {
        const savedMeme = normalizeAdminMeme(
          await saveBackendMeme(adminToken, meme, editingOriginalId)
        );
        const nextCollection = editingOriginalId
          ? collection.map((existing) => (existing.id === editingOriginalId ? savedMeme : existing))
          : [savedMeme, ...collection];
        setCollection(nextCollection);
        
        const nextActiveCount = nextCollection.filter((m) => m.status === "active").length;
        setBackendActiveCount(nextActiveCount);

        setNotice(editingOriginalId ? "Meme saved to Cloudflare D1." : "Meme added to Cloudflare D1.");
        resetForm();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Backend save failed.");
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    const nextCollection = editingOriginalId
      ? collection.map((existing) => (existing.id === editingOriginalId ? meme : existing))
      : [meme, ...collection];

    updateCollection(
      nextCollection,
      editingOriginalId ? "Meme details updated." : "Meme added to collection."
    );
    resetForm();
  };

  const editMeme = (meme: AdminMeme) => {
    setEditingOriginalId(meme.id);
    setForm(toFormState(meme));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMeme = async (id: string) => {
    if (backendMode) {
      if (!adminToken.trim()) {
        setNotice("Backend mode needs an admin API token.");
        return;
      }

      setIsSyncing(true);
      try {
        const archived = normalizeAdminMeme(await archiveBackendMeme(adminToken, id));
        setCollection((current) => current.map((meme) => (meme.id === id ? archived : meme)));
        setNotice("Meme archived in Cloudflare.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Backend archive failed.");
      } finally {
        setIsSyncing(false);
      }
      if (editingOriginalId === id) {
        resetForm();
      }
      return;
    }

    updateCollection(
      collection.filter((meme) => meme.id !== id),
      "Meme deleted from local admin collection."
    );
    if (editingOriginalId === id) {
      resetForm();
    }
  };

  const exportCollection = () => {
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meme-collection.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">Meme Capsule Admin</p>
          <h1>Curate the collection without touching code.</h1>
          <p className="admin-copy">
            Add memes by URL, local upload, or Google Drive link. Mark items active only after review.
          </p>
        </div>
        <div className="admin-actions">
          <a href="#add-meme">
            <ImagePlus size={18} aria-hidden="true" />
            Add Meme to Collection
          </a>
          <a href="#collection">
            <ListChecks size={18} aria-hidden="true" />
            View Meme Collection
          </a>
        </div>
      </section>

      <section className="admin-stats" aria-label="Collection status">
        <div className={`mode-badge ${backendMode ? "is-backend" : "is-local"}`}>
          {backendMode ? "BACKEND MODE" : "LOCAL MODE"}
        </div>
        <span>{stats.total} total</span>
        <span>{stats.active} active</span>
        <span>{stats.drafts} drafts</span>
        <span>{stats.archived} archived</span>
      </section>

      <section className="admin-panel backend-panel" aria-label="Backend connection">
        <div>
            Local mode is for quick testing. Backend mode uses Cloudflare Pages Functions, R2 Storage,
            and the D1 `memes` table.
        </div>

        {backendMode && !backendConfig.hasR2PublicUrl && (
          <div className="admin-warning" style={{ background: "rgba(255, 95, 95, 0.1)", borderLeft: "4px solid #ff5f5f" }}>
            <strong style={{ color: "#ff5f5f" }}>⚠️ Missing R2_PUBLIC_URL</strong>
            <p>
              The backend is missing the public URL for your R2 bucket. Memes uploaded to R2 will not load in the main app until you add <code>R2_PUBLIC_URL</code> to your Cloudflare Pages environment variables.
            </p>
          </div>
        )}

        {backendMode && stats.active === 0 && stats.total > 0 && (
          <div className="admin-warning" style={{ background: "rgba(255, 204, 77, 0.1)", borderLeft: "4px solid #ffcc4d" }}>
            <strong style={{ color: "#ffcc4d" }}>💡 Tip: Activate your memes</strong>
            <p>
              You have {stats.total} memes in the database, but 0 are set to <strong>Active</strong>. The main app only shows memes with "Active" status. Edit your memes below and change their status.
            </p>
          </div>
        )}
        <label>
          <span>Admin API token</span>
          <input
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="Matches ADMIN_API_TOKEN in Cloudflare"
            type="password"
          />
        </label>
        <div className="backend-actions">
          <button type="button" onClick={saveToken} disabled={isSyncing}>
            Save Token
          </button>
          <button type="button" onClick={loadBackend} disabled={isSyncing}>
            Load Backend Collection
          </button>
          {backendMode && (
            <button type="button" onClick={handleSyncR2} disabled={isSyncing}>
              <RefreshCw size={16} aria-hidden="true" />
              {isSyncing ? "Syncing..." : "Sync R2 Files to D1"}
            </button>
          )}
          <button type="button" onClick={useLocalMode} disabled={isSyncing}>
            Use Local Drafts
          </button>
        </div>
      </section>

      <section className="admin-grid">
        <form id="add-meme" className="admin-panel admin-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <Database size={20} aria-hidden="true" />
            <div>
              <h2>{editingOriginalId ? "Edit Meme Details" : "Add Meme to Collection"}</h2>
              <p>{notice}</p>
            </div>
          </div>

          <div className="input-mode-grid">
            <label>
              <span>Direct meme URL</span>
              <input
                value={form.input_method === "url" ? form.url : ""}
                onChange={(event) => handleUrlInput("url", event.target.value)}
                placeholder="https://cdn.example.com/meme.webp"
              />
            </label>
            <label>
              <span>Google Drive link</span>
              <input
                value={form.input_method === "google-drive" ? form.url : ""}
                onChange={(event) => handleUrlInput("google-drive", event.target.value)}
                placeholder="https://drive.google.com/file/d/..."
              />
            </label>
            <label className="file-drop">
              <UploadCloud size={20} aria-hidden="true" />
              <span>Upload image/video draft</span>
              <input accept="image/*,video/*" type="file" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="field-grid">
            <label>
              <span>Meme ID</span>
              <input value={form.id} onChange={(event) => updateForm("id", event.target.value)} />
            </label>
            <label>
              <span>Name / title</span>
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Exam week survival"
              />
            </label>
            <label>
              <span>Category</span>
              <input
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                placeholder="College"
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value as MemeStatus)}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              <span>Rarity</span>
              <select
                value={form.rarity}
                onChange={(event) => updateForm("rarity", event.target.value as Rarity)}
              >
                <option value="Common">Common</option>
                <option value="Rare">Rare</option>
                <option value="Legendary">Legendary</option>
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input
                value={form.tags}
                onChange={(event) => updateForm("tags", event.target.value)}
                placeholder="college, exam, relatable"
              />
            </label>
            <label className="wide-field">
              <span>Storage path</span>
              <input
                value={form.storage_path || ""}
                onChange={(event) => updateForm("storage_path", event.target.value)}
                placeholder="Cloudflare path, filled after backend upload"
              />
            </label>
            <label className="wide-field">
              <span>Share text</span>
              <input
                value={form.share_text}
                onChange={(event) => updateForm("share_text", event.target.value)}
                placeholder="Send this to the group chat"
              />
            </label>
            <label className="wide-field">
              <span>Rights note</span>
              <input
                value={form.rights_note}
                onChange={(event) => updateForm("rights_note", event.target.value)}
                placeholder="original / licensed / permission / reviewed"
              />
            </label>
            <label>
              <span>Likes Count</span>
              <input
                type="number"
                value={form.likes_count ?? 0}
                onChange={(event) => updateForm("likes_count", Number(event.target.value))}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit">
              <Save size={18} aria-hidden="true" />
              {editingOriginalId ? "Save Changes" : backendMode ? "Add Meme to Backend" : "Add Meme to Collection"}
            </button>
            <button type="button" className="ghost-action" onClick={resetForm}>
              {editingOriginalId ? "Cancel Editing" : "Clear Form"}
            </button>
            <button type="button" className="ghost-action" onClick={exportCollection}>
              <Download size={18} aria-hidden="true" />
              Export JSON
            </button>
          </div>
        </form>

        <aside className="admin-panel preview-panel">
          <h2>Preview</h2>
          {form.url ? (
            form.media_type === "video" ? (
              <video controls src={form.url} />
            ) : (
              <img src={form.url} alt={form.title || "Meme preview"} />
            )
          ) : (
            <div className="preview-empty">No meme selected yet.</div>
          )}
        </aside>
      </section>

      <section id="collection" className="admin-panel collection-panel">
        <div className="panel-heading">
          <ListChecks size={20} aria-hidden="true" />
          <div>
            <h2>View Meme Collection</h2>
            <p>Active items are eligible for local app testing. Drafts and archived items stay hidden.</p>
          </div>
        </div>

        <div className="collection-table">
          {collection.length === 0 ? (
            <div className="empty-collection">No admin memes yet. Add one above.</div>
          ) : (
            collection.map((meme) => (
              <article 
                className={`collection-row ${meme.id === editingOriginalId ? "is-editing" : ""}`} 
                key={meme.id} 
                onClick={() => editMeme(meme)}
              >
                <div className="thumb">
                  {meme.media_type === "video" ? (
                    <video src={meme.url} muted />
                  ) : (
                    <img src={meme.url} alt={meme.title} />
                  )}
                </div>
                <div className="collection-meta">
                  <strong>{meme.title}</strong>
                  <span>{meme.id}</span>
                  <span>{meme.category} / {meme.status}</span>
                  <span>Likes: {meme.likes_count ?? 0}</span>
                  <span>{new Date(meme.uploaded_at).toLocaleDateString()}</span>
                  <a href={meme.source_link || meme.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <LinkIcon size={14} aria-hidden="true" />
                    Source link
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={(e) => { e.stopPropagation(); editMeme(meme); }}>
                    <Edit3 size={17} aria-hidden="true" />
                    Edit
                  </button>
                  <button type="button" className="delete-action" onClick={(e) => { e.stopPropagation(); deleteMeme(meme.id); }}>
                    <Trash2 size={17} aria-hidden="true" />
                    {backendMode ? "Archive" : "Delete"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
