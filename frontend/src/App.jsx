import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Activity, AudioLines, BarChart3, Disc3, Headphones, Heart, Home, Music2,
  Search, Sparkles, Waves, Zap, Play, SlidersHorizontal, LoaderCircle, RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001').replace(/\/$/, '')
const moods = [
  { name: 'Happy', label: 'Feel-good energy', emoji: '☀️', className: 'sunny' },
  { name: 'Calm', label: 'Slow the world down', emoji: '☁️', className: 'calm' },
  { name: 'Sad', label: 'Sit with the feeling', emoji: '🌧️', className: 'sad' },
  { name: 'Intense', label: 'Turn it all the way up', emoji: '⚡', className: 'intense' },
]
const colors = ['#f6b65c', '#9e8cff', '#63c8df', '#f47eaa']

function App() {
  const [page, setPage] = useState('Discover')
  const [tracks, setTracks] = useState([])
  const [moodData, setMoodData] = useState({ moods: [], genres: [] })
  const [analytics, setAnalytics] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [selectedMood, setSelectedMood] = useState('')
  const [query, setQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [method, setMethod] = useState('cosine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiOnline, setApiOnline] = useState(false)

  async function loadInitial() {
    setLoading(true); setError('')
    try {
      const [t, m, a, c, h] = await Promise.all([
        axios.get(`${API}/api/tracks?limit=100`), axios.get(`${API}/api/moods`),
        axios.get(`${API}/api/analytics`), axios.get(`${API}/api/model-comparison`),
        axios.get(`${API}/api/health`)
      ])
      setTracks(t.data.tracks); setMoodData(m.data); setAnalytics(a.data); setComparison(c.data); setApiOnline(h.data.status === 'ok')
    } catch {
      setError('Can’t reach the Flask API yet. Start the backend in a second terminal, then refresh.')
      setApiOnline(false)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadInitial() }, [])

  const visibleTracks = useMemo(() => tracks.filter(t =>
    (!selectedMood || t.mood === selectedMood) &&
    (!query || `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(query.toLowerCase()))
  ), [tracks, selectedMood, query])

  async function chooseTrack(track) {
    setSelectedTrack(track)
    try {
      const result = await axios.get(`${API}/api/recommendations/${track.track_id}?method=${method}&limit=8`)
      setRecommendations(result.data.recommendations || [])
    } catch { setRecommendations([]) }
  }
  async function changeMethod(next) {
    setMethod(next)
    if (selectedTrack) {
      try {
        const result = await axios.get(`${API}/api/recommendations/${selectedTrack.track_id}?method=${next}&limit=8`)
        setRecommendations(result.data.recommendations || [])
      } catch { setRecommendations([]) }
    }
  }
  const goTo = (p) => { setPage(p); if (p === 'Analytics' && !analytics) return }
  const currentMood = moods.find(m => m.name === selectedMood)

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><AudioLines size={22}/></div><div><strong>moodify<span>AI</span></strong><small>FIND YOUR FREQUENCY</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>
        {[
          ['Discover', Home], ['Mood explorer', Waves], ['Recommendations', Headphones], ['ML lab', Activity], ['Analytics', BarChart3]
        ].map(([name, Icon]) => <button key={name} className={`nav-item ${page.toLowerCase() === name.toLowerCase() || (page === 'Discover' && name === 'Discover') ? 'active' : ''}`} onClick={() => goTo(name === 'Mood explorer' ? 'Mood Explorer' : name === 'Recommendations' ? 'Recommendations' : name === 'ML lab' ? 'ML Lab' : name)}><Icon size={18}/><span>{name}</span>{name === 'Recommendations' && <span className="nav-dot"/>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="status-row"><span className={`status-dot ${apiOnline ? 'online' : ''}`}/><span>{apiOnline ? 'ML engine connected' : 'Waiting for ML engine'}</span></div>
        <div className="mini-note"><Sparkles size={16}/><span>Good music meets the right mood.</span></div>
        <div className="profile"><div className="avatar">M</div><div><strong>Music explorer</strong><small>Personal workspace</small></div><SlidersHorizontal size={16}/></div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>{page}</strong></div>
        <div className="top-actions"><div className="api-pill"><span className={`status-dot ${apiOnline ? 'online' : ''}`}/>{apiOnline ? 'API connected' : 'API offline'}</div><button className="icon-button" aria-label="Refresh data" onClick={loadInitial}><RefreshCw size={17}/></button><div className="top-avatar">M</div></div>
      </header>

      {error && <div className="error-banner"><div><strong>Backend not connected</strong><p>{error}</p></div><button className="button-secondary" onClick={loadInitial}>Retry</button></div>}
      {loading ? <div className="loading-state"><LoaderCircle className="spin" size={28}/><p>Warming up the music engine…</p></div> : <>
        {(page === 'Discover' || page === 'Mood Explorer') && <>
          <section className="hero">
            <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR PERSONAL MUSIC UNIVERSE</div><h1>Every mood has<br/>a <span>soundtrack.</span></h1><p>Explore sounds that match your energy, find your next favorite track, and let the mood lead the way.</p><button className="button-primary" onClick={() => { setPage('Mood Explorer'); document.getElementById('moods')?.scrollIntoView({ behavior: 'smooth' }) }}>Explore moods <span>↗</span></button><div className="hero-meta"><div className="avatar-stack"><span>♫</span><span>♪</span><span>♫</span></div><span><strong>{tracks.length || '—'} tracks</strong> in your discovery space</span></div></div>
            <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="vinyl"><div className="vinyl-grooves"/><div className="vinyl-label"><AudioLines size={35}/><span>moodify</span></div></div><div className="floating-card float-top"><span className="float-icon peach"><Zap size={16}/></span><div><strong>Energy boost</strong><small>High-energy mix</small></div><span className="tiny-bars"><i/><i/><i/><i/><i/></span></div><div className="floating-card float-bottom"><span className="float-icon lilac"><Waves size={16}/></span><div><strong>In your zone</strong><small>Audio-feature matching</small></div><span className="pulse">●</span></div><div className="spark spark-a">✳</div><div className="spark spark-b">✦</div></div>
          </section>
          <section className="section-block" id="moods"><div className="section-heading"><div><div className="eyebrow muted">FOLLOW THE FEELING</div><h2>Explore by mood</h2><p>Pick the vibe. We’ll find the frequency.</p></div><button className="text-button" onClick={() => { setSelectedMood(''); setPage('Mood Explorer') }}>View all moods <span>→</span></button></div>
            <div className="mood-grid">{moods.map((m, i) => <button key={m.name} className={`mood-card ${m.className} ${selectedMood === m.name ? 'chosen' : ''}`} onClick={() => { setSelectedMood(selectedMood === m.name ? '' : m.name); setPage('Mood Explorer') }}><div className="mood-card-top"><span className="mood-emoji">{m.emoji}</span><span className="round-arrow">↗</span></div><div><h3>{m.name}</h3><p>{m.label}</p></div><div className="mood-decoration">{i === 0 ? '✳' : i === 1 ? '〰' : i === 2 ? '◌' : 'ϟ'}</div></button>)}</div>
          </section>
          <section className="section-block"><div className="section-heading"><div><div className="eyebrow muted">HANDPICKED FOR DISCOVERY</div><h2>{selectedMood ? `${selectedMood} tracks` : 'Find your next favorite'}</h2><p>Explore tracks from the current catalogue.</p></div><div className="search-box"><Search size={17}/><input aria-label="Search tracks" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tracks or artists"/></div></div>
            <TrackGrid tracks={visibleTracks.slice(0, 8)} onSelect={chooseTrack} selectedTrack={selectedTrack}/>
          </section>
        </>}

        {page === 'Recommendations' && <section className="page-section"><div className="eyebrow muted">YOUR NEXT OBSESSION</div><h1 className="page-title">Song recommender<span>.</span></h1><p className="page-subtitle">Choose a seed track and compare audio-feature-based recommendations.</p><div className="recommend-layout"><div className="panel track-picker"><h3>Choose a starting track</h3><div className="track-list">{tracks.map(t => <button className={`track-row ${selectedTrack?.track_id === t.track_id ? 'selected' : ''}`} key={t.track_id} onClick={() => chooseTrack(t)}><TrackCover track={t}/><span className="track-text"><strong>{t.title}</strong><small>{t.artist}</small></span><span className="track-mood">{t.mood}</span></button>)}</div></div><div className="panel recommendations-panel"><div className="panel-heading"><div><h3>Similar tracks</h3><p>{selectedTrack ? `Based on ${selectedTrack.title}` : 'Choose a track to get started'}</p></div><select value={method} onChange={e => changeMethod(e.target.value)} aria-label="Recommendation method"><option value="cosine">Cosine similarity</option><option value="knn">KNN</option></select></div>{selectedTrack && <div className="selected-seed"><TrackCover track={selectedTrack}/><div><strong>{selectedTrack.title}</strong><small>{selectedTrack.artist} · {selectedTrack.genre}</small></div><span className="seed-badge">Seed track</span></div>}{recommendations.length ? <TrackGrid tracks={recommendations} onSelect={chooseTrack} selectedTrack={selectedTrack} compact/> : <div className="empty-state"><Headphones size={30}/><p>Select a track to discover similar sounds.</p></div>}</div></div></section>}

        {page === 'ML Lab' && <section className="page-section"><div className="eyebrow muted">BEHIND THE SOUND</div><h1 className="page-title">Model lab<span>.</span></h1><p className="page-subtitle">Compare methods by task. Classification, clustering, and ranking use different metrics.</p>{comparison && <><div className="stats-grid"><Stat label="Mood classes" value={comparison.classification[0].class_names.length} hint="Proxy labels in starter data"/><Stat label="RF macro F1" value={comparison.classification[0].f1_macro.toFixed(3)} hint="Random Forest classification"/><Stat label="K-Means silhouette" value={comparison.clustering[0].silhouette.toFixed(3)} hint="Cluster separation"/><Stat label="Agglomerative" value={comparison.clustering[1].silhouette.toFixed(3)} hint="Silhouette score"/></div><div className="lab-grid"><div className="panel"><div className="panel-heading"><div><h3>Clustering comparison</h3><p>Higher silhouette indicates better-separated clusters.</p></div><Activity size={19}/></div><ResponsiveContainer width="100%" height={260}><BarChart data={comparison.clustering} margin={{top:12,right:10,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#2c263b"/><XAxis dataKey="model" stroke="#aaa2bb"/><YAxis stroke="#aaa2bb"/><Tooltip contentStyle={{background:'#1d1829',border:'1px solid #39314d',borderRadius:12}}/><Bar dataKey="silhouette" fill="#a28bff" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div><div className="panel"><div className="panel-heading"><div><h3>Classification metrics</h3><p>Random Forest · held-out split</p></div><Activity size={19}/></div><div className="metric-list">{[['Accuracy',comparison.classification[0].accuracy],['Macro precision',comparison.classification[0].precision_macro],['Macro recall',comparison.classification[0].recall_macro],['Macro F1',comparison.classification[0].f1_macro]].map(([label,val])=><div className="metric-row" key={label}><div><span>{label}</span><strong>{Number(val).toFixed(3)}</strong></div><div className="metric-track"><span style={{width:`${Math.max(0,Math.min(100,val*100))}%`}}/></div></div>)}</div><p className="footnote">Labels are generated from energy and valence rules; these metrics measure reproduction of those rules, not human-verified emotion recognition.</p></div></div><div className="panel full-panel"><h3>Recommendation evaluation plan</h3><p className="panel-description">The starter UI does not invent ranking scores. Evaluate these methods with a documented held-out relevance protocol.</p><div className="comparison-table"><div className="table-row table-head"><span>Method</span><span>Purpose</span><span>Metrics to report</span></div>{[['Popularity baseline','Baseline ranking','Precision@10, Recall@10, NDCG@10'],['Cosine similarity','Feature similarity','Precision@10, Recall@10, NDCG@10'],['KNN','Nearest-neighbour retrieval','Precision@10, Recall@10, NDCG@10'],['K-Means','Unsupervised grouping','Silhouette score'],['Agglomerative','Hierarchical grouping','Silhouette score'],['Random Forest','Mood proxy classification','Macro F1, confusion matrix']].map(r=><div className="table-row" key={r[0]}>{r.map(x=><span key={x}>{x}</span>)}</div>)}</div></div></>}</section>}

        {page === 'Analytics' && analytics && <section className="page-section"><div className="eyebrow muted">DATA, VISUALIZED</div><h1 className="page-title">Music analytics<span>.</span></h1><p className="page-subtitle">Explore the distribution and audio-feature profile of the current dataset.</p><div className="stats-grid"><Stat label="Tracks" value={analytics.total_tracks} hint="Loaded after cleaning"/><Stat label="Mood groups" value={analytics.mood_counts.length} hint="Mood categories"/><Stat label="Genres" value={analytics.genre_counts.length} hint="Distinct genre labels"/><Stat label="Missing feature values" value={analytics.cleaning.missing_feature_values_after_cleaning} hint="After numeric imputation"/></div><div className="lab-grid"><div className="panel"><div className="panel-heading"><div><h3>Tracks by mood</h3><p>Current catalogue distribution</p></div><BarChart3 size={19}/></div><ResponsiveContainer width="100%" height={270}><BarChart data={analytics.mood_counts}><CartesianGrid strokeDasharray="3 3" stroke="#2c263b"/><XAxis dataKey="name" stroke="#aaa2bb"/><YAxis stroke="#aaa2bb"/><Tooltip contentStyle={{background:'#1d1829',border:'1px solid #39314d',borderRadius:12}}/><Bar dataKey="value" radius={[7,7,0,0]}>{analytics.mood_counts.map((entry,i)=><Cell key={entry.name} fill={colors[i%colors.length]}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="panel"><div className="panel-heading"><div><h3>Energy vs valence</h3><p>Each point represents a track</p></div><Waves size={19}/></div><ResponsiveContainer width="100%" height={270}><ScatterChart margin={{top:10,right:10,bottom:10,left:0}}><CartesianGrid stroke="#2c263b"/><XAxis type="number" dataKey="valence" name="Valence" domain={[0,1]} stroke="#aaa2bb"/><YAxis type="number" dataKey="energy" name="Energy" domain={[0,1]} stroke="#aaa2bb"/><ZAxis range={[45,90]}/><Tooltip cursor={{strokeDasharray:'3 3'}} contentStyle={{background:'#1d1829',border:'1px solid #39314d',borderRadius:12}}/><Scatter data={analytics.scatter}>{analytics.scatter.map((d,i)=><Cell key={i} fill={colors[moods.findIndex(m=>m.name===d.mood)%colors.length]||colors[0]}/>)}</Scatter></ScatterChart></ResponsiveContainer></div></div><div className="panel full-panel"><h3>Feature summary</h3><div className="comparison-table"><div className="table-row table-head"><span>Feature</span><span>Mean</span><span>Standard deviation</span></div>{analytics.features.map(f=><div className="table-row" key={f.feature}><span>{f.feature}</span><span>{f.mean}</span><span>{f.std}</span></div>)}</div></div></section>}

        {page === 'Mood Explorer' && <section className="page-section"><div className="eyebrow muted">FIND YOUR FREQUENCY</div><h1 className="page-title">Mood explorer<span>.</span></h1><p className="page-subtitle">Filter tracks by mood and search the catalogue.</p><div className="filter-row">{moods.map(m=><button key={m.name} className={`filter-chip ${selectedMood===m.name?'selected':''}`} onClick={()=>setSelectedMood(selectedMood===m.name?'':m.name)}>{m.emoji} {m.name}</button>)}<button className="filter-chip clear" onClick={()=>setSelectedMood('')}>Clear filter</button><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tracks or artists"/></div></div><div className="results-caption">{visibleTracks.length} tracks found</div><TrackGrid tracks={visibleTracks} onSelect={chooseTrack} selectedTrack={selectedTrack}/></section>}
      </>}
      <footer className="footer"><span><AudioLines size={16}/> MOODIFY AI</span><span>Built for music discovery · ML mini-project</span><span className="footer-status"><span className={`status-dot ${apiOnline?'online':''}`}/>{apiOnline?'Connected':'Offline'}</span></footer>
    </main>
  </div>
}

function TrackCover({ track }) {
  const moodIndex = Math.max(0, moods.findIndex(m=>m.name===track.mood))
  const symbols = ['✳','〰','◌','ϟ']
  return <div className={`track-cover cover-${moodIndex}`}><span>{symbols[moodIndex]}</span><small>{track.genre?.slice(0,12)}</small></div>
}
function TrackGrid({ tracks, onSelect, selectedTrack, compact=false }) {
  if (!tracks?.length) return <div className="empty-state"><Music2 size={28}/><p>No tracks match those filters.</p></div>
  return <div className={`track-grid ${compact?'compact-grid':''}`}>{tracks.map((t,i)=><button className={`track-card ${selectedTrack?.track_id===t.track_id?'selected':''}`} key={t.track_id} onClick={()=>onSelect(t)}><div className={`album-art art-${i%6}`}><div className="art-orbit"/><span>{['✳','◉','〰','✦','◌','ϟ'][i%6]}</span><small>{t.mood}</small><span className="play-button"><Play size={16} fill="currentColor"/></span></div><div className="track-card-info"><div><strong>{t.title}</strong><small>{t.artist}</small></div><Heart size={16} className="heart-icon"/></div><div className="track-card-meta"><span>{t.genre}</span><span>{Math.round(t.energy*100)}% energy</span></div>{typeof t.similarity==='number'&&<div className="similarity"><span>Similarity</span><strong>{t.similarity.toFixed(2)}</strong></div>}</button>)}</div>
}
function Stat({label,value,hint}) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div> }

export default App
