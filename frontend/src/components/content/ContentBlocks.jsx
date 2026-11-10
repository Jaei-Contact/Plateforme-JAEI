import { Fragment } from 'react';
import { Link } from 'react-router-dom';

// ============================================================
// ContentBlocks — affiche le contenu des statuts du journal (src/content/*.js)
//
// Un contenu est une liste de blocs :
//   { t:'h', l:3..6, text }            titre (niveaux 3 à 6)
//   { t:'p', text }                    paragraphe
//   { t:'ul', items:[{text, sub?}] }   liste à puces (sous-puces facultatives)
//   { t:'ref', text }                  exemple de référence / de citation
//   { t:'example', lines:[…] }         exemple de numérotation
//   { t:'types', rows:[[type, exigences]] } tableau des types d'articles
//   { t:'note', text }                 remarque encadrée
// Balisage dans les textes : ***gras italique***, **gras**, *italique*,
// {{libellé|/chemin}} = lien interne.
// `theme` : 'guide' (pages Author Guidelines) ou 'about' (page About).
// ============================================================

const TOKEN = /(\{\{[^|}]+\|[^}]+\}\}|\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)/g;

export const Inline = ({ text }) => {
  const parts = String(text).split(TOKEN).filter((p) => p !== '');
  return parts.map((p, i) => {
    let m = /^\{\{([^|}]+)\|([^}]+)\}\}$/.exec(p);
    if (m) {
      return (
        <Link key={i} to={m[2]} className="font-medium no-underline hover:underline" style={{ color: '#1E88C8' }}>
          {m[1]}
        </Link>
      );
    }
    m = /^\*\*\*(.+)\*\*\*$/.exec(p);
    if (m) return <strong key={i}><em>{m[1]}</em></strong>;
    m = /^\*\*(.+)\*\*$/.exec(p);
    if (m) return <strong key={i}>{m[1]}</strong>;
    m = /^\*(.+)\*$/.exec(p);
    if (m) return <em key={i}>{m[1]}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
};

const THEMES = {
  guide: {
    text:  { color: '#374151', lineHeight: '1.7' },
    h: {
      3: { className: 'text-sm font-bold mt-7 mb-3',      style: { color: '#1B4427' } },
      4: { className: 'text-sm font-semibold mt-5 mb-2',  style: { color: '#111827' } },
      5: { className: 'text-sm font-semibold italic mt-4 mb-2', style: { color: '#374151' } },
      6: { className: 'text-sm font-medium mt-3 mb-1',     style: { color: '#374151' } },
    },
  },
  about: {
    text:  { color: '#404040', lineHeight: '1.7' },
    h: {
      3: { className: 'text-sm font-bold mt-6 mb-3 pb-1', style: { color: '#1B4427', borderBottom: '1px solid #E5E7EB' } },
      4: { className: 'text-sm font-semibold mt-5 mb-2',  style: { color: '#262626' } },
      5: { className: 'text-sm font-semibold italic mt-4 mb-2', style: { color: '#404040' } },
      6: { className: 'text-sm font-medium mt-3 mb-1',     style: { color: '#404040' } },
    },
  },
};

const Dot = ({ small }) => (
  <span className={`${small ? 'w-1 h-1 mt-2' : 'w-1.5 h-1.5 mt-2'} rounded-full flex-shrink-0`} style={{ background: '#1B4427' }} />
);

const List = ({ items, textStyle }) => (
  <ul className="space-y-2 text-sm mb-4" style={textStyle}>
    {items.map((it, i) => (
      <li key={i} className="flex items-start gap-2">
        <Dot />
        <div className="min-w-0">
          <Inline text={it.text} />
          {it.sub && (
            <ul className="mt-2 space-y-1.5">
              {it.sub.map((s, j) => (
                <li key={j} className="flex items-start gap-2">
                  <Dot small />
                  <div className="min-w-0"><Inline text={s} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </li>
    ))}
  </ul>
);

const TypesTable = ({ rows }) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: '#1B4427' }}>
          <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Article type</th>
          <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>Requirements</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, req], i) => (
          <tr key={name} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <td className="px-4 py-2.5 font-semibold align-top" style={{ color: '#111827' }}>{name}</td>
            <td className="px-4 py-2.5" style={{ color: '#374151' }}>{req}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function ContentBlocks({ blocks, theme = 'guide' }) {
  const th = THEMES[theme] || THEMES.guide;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const H = `h${b.l}`;
            const s = th.h[b.l] || th.h[6];
            return <H key={i} className={s.className} style={s.style}><Inline text={b.text} /></H>;
          }
          case 'p':
            return <p key={i} className="text-sm mb-3" style={th.text}><Inline text={b.text} /></p>;
          case 'ul':
            return <List key={i} items={b.items} textStyle={th.text} />;
          case 'ref':
            return (
              <div key={i} className="px-3 py-2.5 rounded-sm mb-2 text-sm"
                   style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', ...th.text, lineHeight: '1.6' }}>
                <Inline text={b.text} />
              </div>
            );
          case 'example':
            return (
              <div key={i} className="pl-4 mb-3 text-sm" style={{ borderLeft: '3px solid #D1D5DB', ...th.text }}>
                {b.lines.map((l, j) => <div key={j}><Inline text={l} /></div>)}
              </div>
            );
          case 'types':
            return <TypesTable key={i} rows={b.rows} />;
          case 'note':
            return (
              <div key={i} className="px-3 py-2.5 rounded-sm mb-4 text-xs"
                   style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', lineHeight: '1.6' }}>
                <Inline text={b.text} />
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
