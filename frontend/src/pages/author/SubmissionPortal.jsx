import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ============================================================
// SubmissionPortal — JAEI  (Option A)
// Header JAEI vert (sans sidebar) + tabs EM + 3 colonnes EM
// Route : /author/submit       Wizard : /author/submit/new
// ============================================================

// ── Icônes ───────────────────────────────────────────────────

const IconMenu = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
  </svg>
);
const IconChevron = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
  </svg>
);

// ── Composants stables ───────────────────────────────────────

const SectionHead = ({ title }) => (
  <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 6px', fontFamily: 'Arial, sans-serif' }}>
    {title}
  </p>
);

const Divider = () => (
  <div style={{ borderTop: '1px solid #ccc', margin: '12px 0' }} />
);

const PortalLink = ({ to, children, count, indent }) => (
  <div style={{ padding: indent ? '2px 0 2px 20px' : '3px 0' }}>
    <Link
      to={to}
      style={{ color: '#2E9E68', fontSize: 13, textDecoration: 'none', fontFamily: 'Arial, sans-serif' }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
    >
      {children}
    </Link>
    {count !== undefined && (
      <span style={{ fontSize: 13, color: '#111', fontFamily: 'Arial, sans-serif' }}>&nbsp;({count})</span>
    )}
  </div>
);

const ResLink = ({ to, href, children }) => {
  const style = { color: '#2E9E68', fontSize: 12.5, textDecoration: 'none', fontFamily: 'Arial, sans-serif' };
  const h = {
    onMouseEnter: e => (e.currentTarget.style.textDecoration = 'underline'),
    onMouseLeave: e => (e.currentTarget.style.textDecoration = 'none'),
  };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={style} {...h}>{children}</a>
    : <Link to={to} style={style} {...h}>{children}</Link>;
};

// ── Composant principal ───────────────────────────────────────

export default function SubmissionPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarErr, setAvatarErr]       = useState(false);

  const [counts, setCounts] = useState({
    pending: 0, under_review: 0, revision_needed: 0, accepted: 0, rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/submissions')
      .then(({ data }) => {
        const subs = Array.isArray(data) ? data : (data.submissions || []);
        const c = { pending: 0, under_review: 0, revision_needed: 0, accepted: 0, rejected: 0 };
        subs.forEach(s => { if (s.status in c) c[s.status]++; });
        setCounts(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const c = loading ? { pending: 0, under_review: 0, revision_needed: 0, accepted: 0, rejected: 0 } : counts;

  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean).map(s => s[0].toUpperCase()).join('') || 'U';

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const NAV_TABS = [
    { label: 'Home',                 to: '/author/dashboard' },
    { label: 'Main Menu',            to: '/author/submit',     active: true },
    { label: 'Submit a Manuscript',  to: '/author/submit/new' },
    { label: 'Author Instructions',  to: '/author-instructions' },
    { label: 'Help',                 to: '/guide-submission' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Arial, sans-serif' }}>

      {/* ── Header vert JAEI (identique à DashboardLayout, sans sidebar) ── */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>

          {/* Gauche : logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo-jaei.jpeg" alt="JAEI" style={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '.05em' }}>JAEI</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }}>
              Journal of Agricultural and Environmental Innovation
            </span>
          </Link>

          {/* Droite : cloche + menu utilisateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
              <IconBell />
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 4, color: '#fff' }}
              >
                {user?.avatar_url && !avatarErr ? (
                  <img src={user.avatar_url} alt="Avatar" onError={() => setAvatarErr(true)}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1E88C8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>
                )}
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fullName}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}><IconChevron /></span>
              </button>

              {userMenuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 210, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', zIndex: 100 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{fullName}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{user?.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'block', padding: '10px 16px', fontSize: 13, color: '#374151', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    My profile
                  </Link>
                  <Link to="/author/dashboard" onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'block', padding: '10px 16px', fontSize: 13, color: '#374151', textDecoration: 'none', borderTop: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Onglets EM ─────────────────────────────────────────── */}
      <div style={{ background: '#f0f0f0', borderBottom: '1px solid #bbb', display: 'flex', paddingLeft: 12 }}>
        {NAV_TABS.map((item, i) => (
          <Link
            key={i}
            to={item.to}
            style={{
              display: 'block', padding: '7px 14px', fontSize: 13,
              color: '#333', textDecoration: 'none',
              fontWeight: item.active ? 700 : 400,
              background: 'transparent',
              border: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* ── Corps : 3 colonnes ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 20px', gap: 0, background: '#fff' }}>

        {/* Sidebar gauche */}
        <div style={{ width: 210, flexShrink: 0, paddingRight: 20, borderRight: '1px solid #ddd' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 12px' }}>Author Main Menu</p>
          <div style={{ border: '1px solid #bbb', padding: 10, background: '#f9f9f9', fontSize: 12.5, lineHeight: 1.6 }}>
            <Link to="/author/submissions"
              style={{ color: '#2E9E68', textDecoration: 'none', fontSize: 12.5 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              How can I find out more about the status of my manuscript?
            </Link>
          </div>
        </div>

        {/* Contenu central */}
        <div style={{ width: 440, flexShrink: 0, padding: '0 28px' }}>

          <SectionHead title="New Submissions" />
          <PortalLink to="/author/submit/new">Submit New Manuscript</PortalLink>
          <PortalLink to="/author/submissions" indent count={0}>Submissions Sent Back to Author</PortalLink>
          <PortalLink to="/author/submissions" indent count={c.pending}>Incomplete Submissions</PortalLink>
          <PortalLink to="/author/submissions" indent count={0}>Submissions Waiting for Author's Approval</PortalLink>
          <PortalLink to="/author/submissions?status=under_review" indent count={c.under_review}>Submissions Being Processed</PortalLink>

          <Divider />

          <SectionHead title="Revisions" />
          <PortalLink to="/author/submissions?status=revision_needed" indent count={c.revision_needed}>Submissions Needing Revision</PortalLink>
          <PortalLink to="/author/submissions?status=revision_needed" indent count={0}>Revisions Sent Back to Author</PortalLink>
          <PortalLink to="/author/submissions?status=revision_needed" indent count={0}>Incomplete Submissions Being Revised</PortalLink>
          <PortalLink to="/author/submissions?status=revision_needed" indent count={0}>Revisions Waiting for Author's Approval</PortalLink>
          <PortalLink to="/author/submissions?status=under_review" indent count={0}>Revisions Being Processed</PortalLink>
          <PortalLink to="/author/submissions?status=rejected" indent count={0}>Declined Revisions</PortalLink>

          <Divider />

          <SectionHead title="Completed" />
          <PortalLink to="/author/submissions?status=accepted" indent count={c.accepted}>Submissions with a Decision</PortalLink>
          <PortalLink to="/author/submissions" indent count={0}>Submissions with Production Completed</PortalLink>

        </div>

        {/* Author Resources */}
        <div style={{ width: 290, flexShrink: 0, border: '1px solid #bbb', padding: '14px 16px', fontSize: 12.5, lineHeight: 1.7 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px', color: '#111' }}>Author Resources</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, color: '#111' }}>
            <li>Read the full <ResLink to="/author-instructions">Author Instructions</ResLink> before submitting your manuscript.</li>
            <li>Consult the <ResLink to="/guide-submission">Submission Guide</ResLink> for step-by-step help.</li>
            <li>Information on <ResLink to="/about#acces">Open Access</ResLink>.</li>
          </ul>

          <p style={{ fontWeight: 700, margin: '10px 0 4px', color: '#111' }}>Language Editing Services</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, color: '#111' }}>
            <li>Ensure your manuscript is written in clear, correct English or French before submission.</li>
          </ul>

          <p style={{ fontWeight: 700, margin: '10px 0 4px', color: '#111' }}>Submission checklist</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, color: '#111' }}>
            <li>Manuscript anonymised (author details removed from file)</li>
            <li>4 to 7 keywords — no abbreviations</li>
            <li>Abstract: 250 words maximum, structured</li>
            <li>Figures ≥ 300 dpi (TIFF or PNG)</li>
            <li>References in JAEI author-year style</li>
            <li>AI usage declaration if applicable</li>
          </ul>

          <p style={{ fontWeight: 700, margin: '10px 0 4px', color: '#111' }}>Useful links</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><ResLink to="/author-instructions#references">JAEI reference style guide</ResLink></li>
            <li><ResLink to="/about#editorial">Editorial process &amp; timelines</ResLink></li>
            <li><ResLink to="/about#acces">Article Processing Charge (APC)</ResLink></li>
          </ul>
        </div>

      </div>
    </div>
  );
}
