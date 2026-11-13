// Pastille « article dont je suis auteur » dans les listes de l'équipe éditoriale (retour client du 13/11/2026) :
// l'article reste visible mais en lecture seule — un autre éditeur le traite.
const OwnArticleTag = ({ relation }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold whitespace-nowrap"
        style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}
        title="You are an author of this article, so another editor handles it. You can follow it here, in read-only mode.">
    {relation === 'co_author' ? 'Co-author — read only' : 'Your article — read only'}
  </span>
);

export default OwnArticleTag;
