import React, { useEffect, useState } from "react";

interface RankingsProps {
  adminToken: string;
  onMemeSelect: (memeId: string) => void;
}

export default function Rankings({ adminToken, onMemeSelect }: RankingsProps) {
  const [data, setData] = useState<any>(null);
  const [sortBy, setSortBy] = useState("engagement");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/rankings?sort_by=${sortBy}&page=${page}&per_page=20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then(res => res.json())
      .then(resData => {
        setData(resData);
      })
      .finally(() => setLoading(false));
  }, [adminToken, sortBy, page]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, textTransform: 'uppercase' }}>Full Rankings</h2>
        <select 
          className="brutalist-input" 
          value={sortBy} 
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          style={{ width: 'auto' }}
        >
          <option value="engagement">Sort by Engagement</option>
          <option value="virality">Sort by Virality</option>
          <option value="retention">Sort by Retention</option>
          <option value="trending">Sort by Trending</option>
          <option value="views">Sort by Views</option>
          <option value="skip_rate">Sort by Skip Rate</option>
        </select>
      </div>

      <div className="brutalist-border brutalist-shadow-black" style={{ overflowX: 'auto', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--outline)', background: 'var(--surface-variant)' }}>
              <th style={{ padding: '12px' }}>Rank</th>
              <th style={{ padding: '12px' }}>Meme</th>
              <th style={{ padding: '12px' }}>Views</th>
              <th style={{ padding: '12px' }}>Engagement</th>
              <th style={{ padding: '12px' }}>Virality</th>
              <th style={{ padding: '12px' }}>Skip Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
            ) : data?.memes?.map((meme: any, idx: number) => (
              <tr 
                key={meme.meme_id} 
                className="brutalist-interactive"
                style={{ borderBottom: '1px solid var(--outline-variant)', cursor: 'pointer' }}
                onClick={() => onMemeSelect(meme.meme_id)}
              >
                <td style={{ padding: '12px', fontWeight: 700 }}>#{ (page - 1) * 20 + idx + 1 }</td>
                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--surface-variant)' }}>
                    {meme.url && <img src={meme.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {meme.title || meme.meme_id}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{meme.view_count}</td>
                <td style={{ padding: '12px' }}>{Number(meme.engagement_score).toFixed(2)}</td>
                <td style={{ padding: '12px' }}>{Number(meme.virality_score).toFixed(2)}</td>
                <td style={{ padding: '12px' }}>{(Number(meme.skip_rate) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data && data.total_pages > 1 && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="brutalist-border-sm brutalist-interactive"
            style={{ padding: '8px 16px', background: 'var(--surface)' }}
          >Prev</button>
          <span style={{ padding: '8px', fontWeight: 700 }}>Page {page} of {data.total_pages}</span>
          <button 
            disabled={page === data.total_pages} 
            onClick={() => setPage(p => p + 1)}
            className="brutalist-border-sm brutalist-interactive"
            style={{ padding: '8px 16px', background: 'var(--surface)' }}
          >Next</button>
        </div>
      )}
    </div>
  );
}
