import RoleBadge from "../RoleBadge";
import { C, FB, FH, card, sectionLabel, inputStyle, primaryBtn } from "../../styles/theme";
import { FLAG_DEFS } from "../../lib/featureFlags";
import { ROLE_LABELS, ROLE_OPTIONS } from "../../lib/roles";

const IMAGE_STATUS_LABEL = {
  ready:      { icon: "✅", label: "Fertig",       color: "#228B22" },
  generating: { icon: "⏳", label: "Generiert…",   color: "#B45309" },
  failed:     { icon: "✗",  label: "Fehler",        color: "#991B1B" },
  pending:    { icon: "○",  label: "Ausstehend",    color: "#9E9E90" },
};

export default function TabAdmin({
  flags, flagsLoading, flagsError, onReloadFlags,
  flagDraft, onFlagDraftChange, flagSaving, flagMsg, onSaveFlag,
  userQuery, onUserQueryChange, users, userLoading, onSearchUsers,
  roleSaving, roleSelected, onRoleSelected, onApplyRole,
  bootstrapMsg, onBootstrap,
  recipes, imageGenLoading, imageGenPerRecipe, imageGenMsg, onGenerateImage, onGenerateAllImages,
}) {
  return (
    <div className="tab-content">

      <div style={{ ...card, background: C.adminBg, borderColor: C.adminBorder }}>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.adminText, marginBottom: 4 }}>
          Admin-Bereich
        </div>
        <div style={{ fontSize: 13, color: C.adminText, opacity: .7, fontFamily: FB }}>
          Zugriffssteuerung und Benutzerverwaltung
        </div>
      </div>

      {/* Feature Flags */}
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Zugriffssteuerung – Feature Flags</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.6, fontFamily: FB }}>
          Lege fest, welche Rolle für jeden Tab/jede Funktion mindestens erforderlich ist.
          Als Admin siehst du immer alles, unabhängig von diesen Einstellungen.
        </p>

        {flagsLoading ? (
          <div style={{ color: C.muted, fontFamily: FB, fontSize: 13 }}>Lade Flags…</div>
        ) : flagsError ? (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", borderRadius: 10, padding: "12px 14px", fontFamily: FB, fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Feature Flags konnten nicht geladen werden.</div>
            <button onClick={onReloadFlags} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#991B1B", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer" }}>
              Erneut laden
            </button>
          </div>
        ) : flags ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FLAG_DEFS.map(def => {
              const current = flags[def.id] || {};
              const draft = flagDraft[def.id] || {};
              const reqRole = draft.required_role ?? current.required_role ?? "guest";
              const enabled  = draft.enabled      ?? current.enabled      ?? true;
              const isDirty = draft.required_role !== undefined || draft.enabled !== undefined;

              return (
                <div key={def.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", background: isDirty ? "#FFFBF0" : C.surface2, borderRadius: 12, border: `1px solid ${isDirty ? C.premBorder : C.border}` }}>
                  <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{def.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{def.desc}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Mindestrolle</label>
                    <select
                      className="app-select"
                      style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                      value={reqRole}
                      onChange={e => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], required_role: e.target.value } }))}
                    >
                      <option value="guest">Gast (alle)</option>
                      <option value="user">Registriert</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Status</label>
                    <button
                      onClick={() => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], enabled: !(draft.enabled ?? current.enabled ?? true) } }))}
                      style={{ padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${enabled ? C.green : C.border}`, background: enabled ? C.greenPale : C.surface2, color: enabled ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36 }}>
                      {enabled ? "● Aktiv" : "○ Deaktiviert"}
                    </button>
                  </div>

                  <button
                    onClick={() => onSaveFlag(def.id)}
                    disabled={!isDirty || flagSaving}
                    style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: isDirty ? C.green : C.surface2, color: isDirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: isDirty ? "pointer" : "default", minHeight: 36, opacity: flagSaving ? .6 : 1 }}>
                    {flagSaving ? "…" : "Speichern"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {flagMsg && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, background: flagMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: flagMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {flagMsg.type === "ok" ? "✓ " : "✗ "}{flagMsg.text}
          </div>
        )}
      </div>

      {/* Benutzerverwaltung */}
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Benutzerverwaltung</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6, fontFamily: FB }}>
          Suche nach Benutzern und weise ihnen eine Rolle zu.
          Mögliche Rollen: <b>Registriert</b> · <b>Premium</b> · <b>Admin</b>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            className="app-input"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="E-Mail oder Name suchen…"
            value={userQuery}
            onChange={e => onUserQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearchUsers()}
          />
          <button
            onClick={onSearchUsers}
            disabled={userLoading}
            style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", opacity: userLoading ? .7 : 1, minHeight: 44 }}>
            {userLoading ? "…" : "Suchen"}
          </button>
        </div>

        {users.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ flex: "1 1 160px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>
                    {u.firstName} {u.lastName} · ID: {u.id.slice(0, 12)}…
                  </div>
                </div>
                <RoleBadge role={u.role} />
                <select
                  className="app-select"
                  style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                  value={roleSelected[u.id] || u.role}
                  onChange={e => onRoleSelected(p => ({ ...p, [u.id]: e.target.value }))}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button
                  onClick={() => onApplyRole(u.id)}
                  disabled={roleSaving[u.id]}
                  style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", opacity: roleSaving[u.id] ? .6 : 1, minHeight: 36 }}>
                  {roleSaving[u.id] ? "…" : "Speichern"}
                </button>
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && userQuery && !userLoading && (
          <div style={{ color: C.muted, fontFamily: FB, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Keine Benutzer gefunden.</div>
        )}
      </div>

      {/* Rezeptbilder */}
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Rezeptbilder (KI-Generierung)</div>
        {recipes && (() => {
          const total = recipes.length;
          const ready = recipes.filter(r => r.image_status === "ready").length;
          const failed = recipes.filter(r => r.image_status === "failed").length;
          const pending = total - ready - failed - recipes.filter(r => r.image_status === "generating").length;
          return (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 100, background: C.greenPale, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: C.green2, fontFamily: FH }}>{ready}</div>
                  <div style={{ fontSize: 11, color: C.green2, fontFamily: FB }}>von {total} fertig</div>
                </div>
                {failed > 0 && (
                  <div style={{ flex: 1, minWidth: 100, background: "#FEE2E2", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: "#991B1B", fontFamily: FH }}>{failed}</div>
                    <div style={{ fontSize: 11, color: "#991B1B", fontFamily: FB }}>fehlgeschlagen</div>
                  </div>
                )}
                {(pending + failed) > 0 && (
                  <div style={{ flex: 1, minWidth: 100, background: C.surface2, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: C.sub, fontFamily: FH }}>{pending + failed}</div>
                    <div style={{ fontSize: 11, color: C.sub, fontFamily: FB }}>ausstehend</div>
                  </div>
                )}
              </div>

              {ready < total && (
                <button
                  onClick={onGenerateAllImages}
                  disabled={imageGenLoading}
                  style={{ ...primaryBtn(false), marginTop: 0, marginBottom: 16, opacity: imageGenLoading ? .7 : 1 }}>
                  {imageGenLoading ? "⏳ Generiere…" : `🌿 Alle fehlenden Bilder generieren (${total - ready})`}
                </button>
              )}

              {imageGenMsg && (
                <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 9, background: imageGenMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: imageGenMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
                  {imageGenMsg.type === "ok" ? "✓ " : "✗ "}{imageGenMsg.text}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recipes.map(r => {
                  const st = IMAGE_STATUS_LABEL[r.image_status] || IMAGE_STATUS_LABEL.pending;
                  const isLoading = imageGenPerRecipe?.[r.id];
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      {r.image_url
                        ? <img src={r.image_url} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: `1px solid ${C.border}` }} />
                        : <div style={{ width: 48, height: 36, background: C.border, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: C.text, fontFamily: FB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: st.color, fontFamily: FB }}>{st.icon} {st.label}</div>
                      </div>
                      <button
                        onClick={() => onGenerateImage(r.id)}
                        disabled={isLoading || imageGenLoading}
                        title="Bild (neu) generieren"
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.sub, fontSize: 12, fontWeight: 600, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", opacity: (isLoading || imageGenLoading) ? .5 : 1 }}>
                        {isLoading ? "⏳" : "↻"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      {/* Admin Bootstrap */}
      <div style={{ ...card, borderColor: C.adminBorder, background: C.adminBg }}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Admin einrichten</div>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 14, fontFamily: FB, lineHeight: 1.6 }}>
          Klicke hier um dich als Admin einzurichten (funktioniert nur wenn deine E-Mail in der ADMIN_EMAILS Umgebungsvariable steht).
        </p>
        <button onClick={onBootstrap} className="btn-primary"
          style={{ ...primaryBtn(false), marginTop: 0, background: C.adminText }}>
          Als Admin einrichten
        </button>
        {bootstrapMsg && (
          <div style={{ marginTop: 10, fontSize: 13, color: C.sub, fontFamily: FB }}>{bootstrapMsg}</div>
        )}
      </div>

    </div>
  );
}
