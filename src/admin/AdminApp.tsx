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
import { ChangeEvent, FormEvent, useMemo, useState, useEffect } from "react";
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (adminToken.trim()) {
      loadBackend();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <header className="top-app-bar">
        <div className="title-area">
          <span className="material-symbols-outlined">menu</span>
          <span className="title-text">MEME CAPSULE ADMIN</span>
        </div>
        <div className="header-actions">
          <div className="backend-pill">
            <span>{backendMode ? "BACKEND MODE" : "LOCAL MODE"}</span>
            <div className={`status-dot ${backendMode ? 'active' : ''}`}></div>
          </div>
          <div className="token-input">
            <span className="material-symbols-outlined">key</span>
            <input
              type="password"
              placeholder="API TOKEN..."
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
          </div>
          <button onClick={adminToken ? loadBackend : saveToken} className="icon-btn brutalist-interactive" title="Sync / Load Backend" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">sync</span>
          </button>
        </div>
      </header>

      <div className="main-layout">
        <nav className="nav-drawer">
          <h2>ADMIN CONSOLE</h2>
          <ul>
            <li className="active">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </li>
            <li onClick={useLocalMode}>
              <span className="material-symbols-outlined">inventory_2</span>
              Use Local Drafts
            </li>
            <li onClick={backendMode ? handleSyncR2 : undefined} style={{ opacity: backendMode ? 1 : 0.5 }}>
              <span className="material-symbols-outlined">refresh</span>
              Sync R2 Files
            </li>
          </ul>
          <div className="sys-status">
            <p>SYSTEM UPTIME: 99.9%</p>
            <p>VERSION: 2.4.1-BETA</p>
          </div>
        </nav>

        <div className="content-canvas">
          <section className="top-stats-bar">
            <div className="stat-card brutalist-border brutalist-shadow-black brutalist-interactive">
              <p>Total Memes</p>
              <p className="stat-value total">{stats.total}</p>
            </div>
            <div className="stat-card brutalist-border brutalist-shadow-black brutalist-interactive">
              <p>Active</p>
              <p className="stat-value active">{stats.active}</p>
            </div>
            <div className="stat-card brutalist-border brutalist-shadow-black brutalist-interactive">
              <p>Drafts</p>
              <p className="stat-value drafts">{stats.drafts}</p>
            </div>
            <div className="stat-card brutalist-border brutalist-shadow-black brutalist-interactive">
              <p>Archived</p>
              <p className="stat-value archived">{stats.archived}</p>
            </div>
          </section>

          {notice && (
            <div className="brutalist-border-sm" style={{ padding: '12px', background: 'var(--surface-container-highest)', color: 'var(--primary)', fontFamily: 'monospace' }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>info</span>
              {notice}
            </div>
          )}

          <div className="split-pane">
            {/* LEFT PANE - VAULT */}
            <section className="left-pane">
              <div className="pane-header">
                <h3>Meme Vault</h3>
                <div className="filter-actions">
                  <button className="filter-btn brutalist-border-sm brutalist-interactive">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                  <button className="filter-btn brutalist-border-sm brutalist-interactive">
                    <span className="material-symbols-outlined">sort</span>
                  </button>
                </div>
              </div>
              <div className="collection-list custom-scrollbar">
                {collection.length === 0 && (
                  <div style={{ color: 'var(--outline-variant)', padding: '16px' }}>No admin memes yet.</div>
                )}
                {collection.map((meme) => (
                  <div key={meme.id} className="collection-row brutalist-border brutalist-shadow-black brutalist-interactive" onClick={() => editMeme(meme)}>
                    <div className="thumb brutalist-border-sm">
                      {meme.media_type === 'video' ? (
                        <video src={meme.url} muted />
                      ) : (
                        <img src={meme.url} alt={meme.title} />
                      )}
                      <div className="overlay"></div>
                      {!meme.url && <span className="material-symbols-outlined" style={{ zIndex: 2 }}>image</span>}
                    </div>
                    <div className="collection-meta">
                      <h4 style={{ textDecoration: meme.status === 'archived' ? 'line-through' : 'none' }}>{meme.title || "Untitled Meme"}</h4>
                      <div className="badge-row">
                        <span className={`badge brutalist-border-sm ${meme.status}`}>{meme.status}</span>
                        <span className="likes-count">
                          <span className="material-symbols-outlined">favorite</span> {meme.likes_count ?? 0}
                        </span>
                      </div>
                      <p className="row-id">ID: {meme.id}</p>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="brutalist-border-sm" onClick={(e) => { e.stopPropagation(); editMeme(meme); }}>
                        <span className="material-symbols-outlined">edit</span> Edit
                      </button>
                      <button type="button" className="delete-btn brutalist-border-sm" onClick={(e) => { e.stopPropagation(); deleteMeme(meme.id); }}>
                        <span className="material-symbols-outlined">{backendMode ? "restore" : "delete"}</span> 
                        {backendMode ? "Archv" : "Del"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* RIGHT PANE - EDITOR */}
            <section className="right-pane brutalist-border brutalist-shadow-black-lg">
              {editingOriginalId && <div className="edit-mode-tag brutalist-border-sm">EDIT MODE</div>}
              <h3>{editingOriginalId ? "Edit Meme" : "Add Meme"}</h3>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Media Asset</label>
                  <div className="media-zone">
                    <label className="file-dropzone">
                      <span className="material-symbols-outlined">upload_file</span>
                      <span>DROP FILE HERE</span>
                      <input accept="image/*,video/*" type="file" onChange={handleFileUpload} />
                    </label>
                    <div className="url-zone">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Media URL</label>
                        <input 
                          className="brutalist-input" 
                          style={{ fontFamily: 'monospace' }} 
                          value={form.url} 
                          onChange={(e) => handleUrlInput(e.target.value.includes("drive.google") ? "google-drive" : "url", e.target.value)} 
                          placeholder="https://..." 
                        />
                      </div>
                      {form.url && (
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                          {form.media_type === "video" ? (
                            <video controls src={form.url} style={{ maxHeight: '100px', border: '2px solid var(--outline-variant)' }} />
                          ) : (
                            <img src={form.url} alt="Preview" style={{ maxHeight: '100px', border: '2px solid var(--outline-variant)' }} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="metadata-grid">
                  <div className="form-group col-span-2">
                    <label>Title</label>
                    <input 
                      className="brutalist-input" 
                      style={{ fontFamily: 'var(--font-display)', fontSize: '20px', textTransform: 'uppercase' }} 
                      value={form.title} 
                      onChange={(e) => updateForm("title", e.target.value)} 
                      placeholder="Exam week survival"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input 
                      className="brutalist-input" 
                      style={{ textTransform: 'uppercase', fontWeight: 700 }}
                      value={form.category} 
                      onChange={(e) => updateForm("category", e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      className="brutalist-input" 
                      style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--secondary)' }}
                      value={form.status} 
                      onChange={(e) => updateForm("status", e.target.value as MemeStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rarity</label>
                    <select 
                      className="brutalist-input" 
                      style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--tertiary-container)' }}
                      value={form.rarity} 
                      onChange={(e) => updateForm("rarity", e.target.value as Rarity)}
                    >
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Legendary">Legendary</option>
                      <option value="Mythic">Mythic</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Likes Count</label>
                    <input 
                      type="number"
                      className="brutalist-input" 
                      style={{ fontFamily: 'monospace' }}
                      value={form.likes_count ?? 0} 
                      onChange={(e) => updateForm("likes_count", Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="advanced-toggle">
                  <details className="group cursor-pointer">
                    <summary className="advanced-summary" onClick={(e) => {
                      e.preventDefault();
                      setShowAdvanced(!showAdvanced);
                    }}>
                      <span className="material-symbols-outlined" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>chevron_right</span>
                      Advanced Options
                    </summary>
                    {showAdvanced && (
                      <div className="advanced-content brutalist-border-sm">
                        <div className="form-group">
                          <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Meme ID</label>
                          <input className="brutalist-input" value={form.id} onChange={(e) => updateForm("id", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Tags (Comma separated)</label>
                          <input className="brutalist-input" value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Storage Path</label>
                          <input className="brutalist-input" value={form.storage_path || ""} onChange={(e) => updateForm("storage_path", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Share Text</label>
                          <input className="brutalist-input" value={form.share_text} onChange={(e) => updateForm("share_text", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ color: 'var(--outline)', fontSize: '10px' }}>Rights Note</label>
                          <input className="brutalist-input" value={form.rights_note} onChange={(e) => updateForm("rights_note", e.target.value)} />
                        </div>
                        <button type="button" onClick={exportCollection} className="btn-clear brutalist-border-sm" style={{ padding: '8px', color: 'var(--primary)', borderColor: 'var(--primary)', marginTop: '8px', width: 'fit-content' }}>
                          Export JSON
                        </button>
                      </div>
                    )}
                  </details>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary brutalist-border brutalist-shadow-black brutalist-interactive">
                    {editingOriginalId ? "Save Changes" : "Save Meme"}
                  </button>
                  <button type="button" className="btn-clear brutalist-border-sm" onClick={resetForm}>
                    Clear
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
