import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './index.css';

function App() {
  const [homeSections, setHomeSections] = useState([]);
  const [heroAnime, setHeroAnime] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);
  const [animeDetail, setAnimeDetail] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem('watchlist') || '[]'));
  const videoRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (anime, e) => {
    if (e) e.stopPropagation();
    if (watchlist.some(item => item.id === anime.id)) {
      setWatchlist(watchlist.filter(item => item.id !== anime.id));
    } else {
      setWatchlist([...watchlist, { id: anime.id, name: anime.name || anime.title, poster: anime.poster }]);
    }
  };
  
  const inWatchlist = (id) => watchlist.some(item => item.id === id);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current.play().catch(e => console.log('Auto-play prevented'));
        });
        return () => {
          hls.destroy();
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current.play().catch(e => console.log('Auto-play prevented'));
        });
      }
    }
  }, [streamUrl]);

  const openAnimeDetails = (id) => {
    setSelectedAnimeId(id);
    setAnimeDetail(null);
    setShowPlayer(false);
    setEpisodes([]);
    setStreamUrl('');
    setActiveTab('detail');
    fetch(`/api/anilab/post?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setAnimeDetail(data);
      })
      .catch(err => console.error("Error fetching detail:", err));
  };

  const loadEpisodes = () => {
    setShowPlayer(true);
    setEpisodes([]);
    setStreamUrl('');
    fetch(`/api/anilab/episodes?id=${selectedAnimeId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.list) {
          setEpisodes(data.list);
          if (data.list.length > 0) {
            selectEpisode(data.list[0]);
          }
        }
      })
      .catch(err => console.error(err));
  };

  const selectEpisode = (ep) => {
    setActiveEpisode(ep);
    setServers([]);
    setStreamUrl('');
    fetch(`/api/anilab/servers?id=${ep.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.list) {
          setServers(data.list);
          if (data.list.length > 0) {
            selectServer(data.list[0]);
          }
        }
      })
      .catch(err => console.error(err));
  };

  const selectServer = (srv) => {
    setActiveServer(srv);
    setStreamUrl('');
    fetch(`/api/anilab/stream?id=${srv.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.url) {
          // Pass the m3u8 url to our proxy
          setStreamUrl(`/api/anilab/hls_proxy?url=${encodeURIComponent(data.url)}`);
        }
      })
      .catch(err => console.error(err));
  };

  const openCategory = (cat) => {
    setSelectedCategory(cat);
    setCategoryItems([]);
    setActiveTab('category-detail');
    fetch(`/api/anilab/category?id=${cat.id}&page=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.posts) {
          setCategoryItems(data.posts);
        }
      })
      .catch(err => console.error(err));
  };
  
  useEffect(() => {
    fetch('/api/anilab/home')
      .then(res => res.json())
      .then(data => {
        if (data && data.featured) {
          setHeroAnime({
             id: data.featured.id,
             name: data.featured.title,
             poster: data.featured.poster,
             banner: data.featured.poster,
             score: data.featured.score,
             type: data.featured.type,
             genres: data.featured.genres ? data.featured.genres.split(', ') : [],
             synopsis: data.featured.share
          });

          if (data.sections && Array.isArray(data.sections)) {
            setHomeSections(data.sections);
          }
        }
        
        // Fetch categories in parallel
        fetch('/api/anilab/categories')
          .then(res => res.json())
          .then(catData => {
            if (catData && catData.categories) {
              setCategories(catData.categories);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
          
      })
      .catch(err => {
        console.error("Error fetching home data:", err);
        setLoading(false);
      });
  }, []);

  // Real API Search Effect
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/anilab/search?keyword=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.posts) {
            setSearchResults(data.posts.map(post => ({
               id: post.id,
               name: post.title || post.name,
               poster: post.poster
            })));
          } else {
            setSearchResults([]);
          }
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const trendingSection = homeSections.find(s => s.name === 'Trending' || s.name === 'Spotlight') || homeSections[0] || { posts: [] };
  const trendingList = trendingSection.posts || [];

  return (
    <div className="page active" id={`page-${activeTab}`}>
      <nav className="navbar scrolled">
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-icon"><i className="fas fa-play"></i></div>
            Genga Toon
          </div>
          <div className="nav-links">
            <a href="#" className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}>Home</a>
            <a href="#" className={`nav-link ${activeTab === 'movies' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('movies'); }}>Movies</a>
            <a href="#" className={`nav-link ${activeTab === 'series' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('series'); }}>Series</a>
            <a href="#" className={`nav-link ${activeTab === 'categories' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('categories'); }}>Categories</a>
            <a href="#" className={`nav-link ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('watchlist'); }}>Watchlist</a>
            <a href="#" className={`nav-link ${activeTab === 'search' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('search'); }}><i className="fas fa-search"></i> Search</a>
          </div>
        </div>
      </nav>

      <main className="content">
        {loading ? (
          <div className="global-loader"><div className="spinner"></div></div>
        ) : (
          <>
            {activeTab === 'home' && heroAnime && (
              <div className="hero-section fade-in">
                <div className="hero-bg" style={{ backgroundImage: `url(${heroAnime.banner})` }}></div>
                <div className="hero-overlay"></div>
                <div className="hero-content">
                  <div className="hero-badge">Trending #1</div>
                  <h1 className="hero-title">{heroAnime.name}</h1>
                  <div className="hero-meta">
                    <span className="hero-score"><i className="fas fa-star"></i> {heroAnime.score || 'N/A'}</span>
                    <span className="hero-meta-item"><span className="dot">•</span> {heroAnime.type}</span>
                  </div>
                  <div className="hero-genres">
                    {heroAnime.genres.map((genre, idx) => (
                      <span key={idx} className="genre-tag">{genre}</span>
                    ))}
                  </div>
                  <div className="hero-actions">
                    <button className="btn-primary" onClick={() => openAnimeDetails(heroAnime.id)}>
                      <i className="fas fa-play"></i> View Details
                    </button>
                    <button className="btn-secondary" onClick={() => toggleWatchlist(heroAnime)}>
                      <i className={inWatchlist(heroAnime.id) ? "fas fa-check" : "fas fa-bookmark"}></i> {inWatchlist(heroAnime.id) ? "In Watchlist" : "Add to List"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="sections-container" style={{ padding: '0 var(--page-padding)', marginTop: '20px' }}>
              
              {activeTab === 'search' && (
                <div className="content-section fade-in">
                  <div className="search-container" style={{ maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                    <input 
                      type="text" 
                      placeholder="Search for anime..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      style={{ width: '100%', padding: '16px 20px 16px 50px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '1.1rem', outline: 'none' }}
                    />
                  </div>
                  {isSearching ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}><i className="fas fa-circle-notch fa-spin"></i> Searching...</div>
                  ) : searchQuery ? (
                    searchResults.length > 0 ? (
                      <div className="anime-grid stagger">
                        {searchResults.map(anime => (
                          <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                            <div className="anime-card-poster">
                              <img src={anime.poster} alt={anime.name} />
                              <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: inWatchlist(anime.id) ? 'var(--accent)' : 'inherit' }}><i className="fas fa-bookmark"></i></div>
                            </div>
                            <div className="anime-card-title">{anime.name}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>No results found for "{searchQuery}"</div>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>Type to start searching...</div>
                  )}
                </div>
              )}

              {activeTab === 'home' && (
                <div className="content-section">
                  {homeSections.map((section, idx) => (
                    <div key={idx} style={{ marginBottom: '40px' }}>
                      <div className="section-header">
                        <h2 className="section-title">{section.name}</h2>
                      </div>
                      <div className="anime-grid fade-in stagger">
                        {section.posts && section.posts.map(anime => (
                          <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                            <div className="anime-card-poster">
                              <img src={anime.poster} alt={anime.title || anime.name} />
                              <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: inWatchlist(anime.id) ? 'var(--accent)' : 'inherit' }}><i className="fas fa-bookmark"></i></div>
                            </div>
                            <div className="anime-card-title">{anime.title || anime.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'movies' && (
                <div className="content-section fade-in">
                  <div className="section-header">
                    <h2 className="section-title">Latest Movies</h2>
                  </div>
                  <div className="anime-grid stagger">
                    {/* Reusing trendingList as placeholder for movies */}
                    {trendingList.slice().reverse().map(anime => (
                      <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                        <div className="anime-card-poster">
                          <img src={anime.poster} alt={anime.name} />
                          <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: inWatchlist(anime.id) ? 'var(--accent)' : 'inherit' }}><i className="fas fa-bookmark"></i></div>
                        </div>
                        <div className="anime-card-title">{anime.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'series' && (
                <div className="content-section fade-in">
                  <div className="section-header">
                    <h2 className="section-title">Latest Series</h2>
                  </div>
                  <div className="anime-grid stagger">
                    {/* Reusing trendingList as placeholder for series */}
                    {trendingList.map(anime => (
                      <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                        <div className="anime-card-poster">
                          <img src={anime.poster} alt={anime.name} />
                          <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: inWatchlist(anime.id) ? 'var(--accent)' : 'inherit' }}><i className="fas fa-bookmark"></i></div>
                        </div>
                        <div className="anime-card-title">{anime.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="content-section fade-in">
                  <div className="section-header">
                    <h2 className="section-title">All Categories</h2>
                  </div>
                  <div className="categories-grid stagger">
                    {Array.from(new Map(categories.map(c => [c.id, c])).values()).map(category => (
                      <div key={category.id} className="category-card" onClick={() => openCategory(category)}>
                        <h3 className="category-card-name">{category.name}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'category-detail' && (
                <div className="content-section fade-in">
                  <div className="section-header" style={{ marginBottom: '30px' }}>
                    <button className="btn-secondary" onClick={() => setActiveTab('categories')} style={{ padding: '8px 16px', marginRight: '20px' }}>
                      <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <h2 className="section-title" style={{ display: 'inline-block', margin: 0 }}>
                      {selectedCategory ? `${selectedCategory.name} Anime` : 'Category'}
                    </h2>
                  </div>
                  
                  {categoryItems.length > 0 ? (
                    <div className="anime-grid stagger">
                      {categoryItems.map(anime => (
                        <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                          <div className="anime-card-poster">
                            <img src={anime.poster} alt={anime.name || anime.title} />
                            <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: inWatchlist(anime.id) ? 'var(--accent)' : 'inherit' }}><i className="fas fa-bookmark"></i></div>
                          </div>
                          <div className="anime-card-title">{anime.name || anime.title}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10vh 0', textAlign: 'center' }}>
                      <div className="global-loader"><div className="spinner"></div></div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'watchlist' && (
                <div className="content-section fade-in">
                  <div className="section-header">
                    <h2 className="section-title">Your Watchlist</h2>
                  </div>
                  {watchlist.length > 0 ? (
                    <div className="anime-grid stagger">
                      {watchlist.map(anime => (
                        <div key={anime.id} className="anime-card" onClick={() => openAnimeDetails(anime.id)}>
                          <div className="anime-card-poster">
                            <img src={anime.poster} alt={anime.name} />
                            <div className="anime-card-watchlist" onClick={(e) => toggleWatchlist(anime, e)} style={{ color: 'var(--accent)' }}><i className="fas fa-bookmark"></i></div>
                          </div>
                          <div className="anime-card-title">{anime.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="watchlist-empty" style={{ textAlign: 'center', padding: '100px 0' }}>
                      <div className="empty-icon" style={{ fontSize: '4rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        <i className="fas fa-bookmark"></i>
                      </div>
                      <h3>Your Watchlist is Empty</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Anime you add to your list will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'detail' && (
                <div className="detail-page fade-in" style={{ margin: '0 calc(-1 * var(--page-padding))' }}>
                  {animeDetail ? (
                    <>
                      <div className="detail-hero">
                        <div className="detail-bg" style={{ backgroundImage: `url(${animeDetail.poster})` }}></div>
                        <div className="detail-overlay"></div>
                        <div className="detail-content">
                          <div className="detail-poster">
                            <img src={animeDetail.poster} alt={animeDetail.title} />
                          </div>
                          <div className="detail-info">
                            {animeDetail.status && (
                              <div className={`detail-status ${animeDetail.status.toLowerCase().replace(' ', '-')}`}>
                                {animeDetail.status}
                              </div>
                            )}
                            <h1 className="detail-title">{animeDetail.title}</h1>
                            <div className="detail-meta">
                              {animeDetail.score && (
                                <div className="detail-score"><i className="fas fa-star"></i> {animeDetail.score}</div>
                              )}
                              <div className="detail-meta-item"><span className="detail-meta-label">Type:</span> {animeDetail.type || 'TV'}</div>
                              {animeDetail.runtime && (
                                <div className="detail-meta-item"><span className="detail-meta-label">Duration:</span> {animeDetail.runtime}</div>
                              )}
                              {animeDetail.rating && (
                                <div className="detail-meta-item"><span className="detail-meta-label">Rating:</span> {animeDetail.rating}</div>
                              )}
                            </div>
                            {animeDetail.genres && (
                              <div className="hero-genres" style={{ marginBottom: '20px' }}>
                                {animeDetail.genres.split(',').map((genre, idx) => (
                                  <span key={idx} className="genre-tag">{genre.trim()}</span>
                                ))}
                              </div>
                            )}
                            <div className="detail-actions">
                              <button className="btn-primary" onClick={loadEpisodes}>
                                <i className="fas fa-play"></i> Watch Episodes
                              </button>
                              <button className="btn-secondary" onClick={() => toggleWatchlist(animeDetail)}>
                                <i className={inWatchlist(animeDetail.id) ? "fas fa-check" : "fas fa-bookmark"}></i> {inWatchlist(animeDetail.id) ? "In Watchlist" : "Add to List"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="detail-body">
                        {showPlayer && (
                          <div className="detail-section" style={{ background: '#0f0f15', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', lg: { flexDirection: 'row' } }}>
                              
                              <div style={{ flex: 1, backgroundColor: '#000', position: 'relative', aspectRatio: '16/9' }}>
                                {streamUrl ? (
                                  <video 
                                    ref={videoRef}
                                    controls
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  ></video>
                                ) : (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <i className="fas fa-circle-notch fa-spin"></i> &nbsp; Loading Player...
                                  </div>
                                )}
                              </div>

                              <div style={{ width: '100%', maxWidth: '350px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '10px' }}>{activeEpisode ? activeEpisode.name : 'Select Episode'}</h3>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {servers.map((srv, idx) => (
                                      <button 
                                        key={`${srv.id}-${idx}`}
                                        onClick={() => selectServer(srv)}
                                        style={{ 
                                          padding: '4px 10px', 
                                          fontSize: '0.8rem', 
                                          borderRadius: '4px', 
                                          border: 'none', 
                                          cursor: 'pointer',
                                          background: activeServer?.id === srv.id && activeServer?.name === srv.name ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                          color: activeServer?.id === srv.id && activeServer?.name === srv.name ? 'white' : 'var(--text-secondary)'
                                        }}
                                      >
                                        {srv.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', padding: '10px' }}>
                                  {episodes.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Episodes...</div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {episodes.map(ep => (
                                        <div 
                                          key={ep.id}
                                          onClick={() => selectEpisode(ep)}
                                          style={{ 
                                            padding: '12px 16px', 
                                            borderRadius: '8px', 
                                            cursor: 'pointer',
                                            background: activeEpisode?.id === ep.id ? 'rgba(var(--accent-rgb), 0.15)' : 'transparent',
                                            color: activeEpisode?.id === ep.id ? 'var(--accent)' : 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'background 0.2s'
                                          }}
                                          onMouseEnter={(e) => { if (activeEpisode?.id !== ep.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                          onMouseLeave={(e) => { if (activeEpisode?.id !== ep.id) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                          <div style={{ 
                                            width: '28px', height: '28px', 
                                            borderRadius: '50%', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: activeEpisode?.id === ep.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                            color: activeEpisode?.id === ep.id ? 'white' : 'var(--text-muted)',
                                            fontSize: '0.8rem'
                                          }}>
                                            {activeEpisode?.id === ep.id ? <i className="fas fa-play"></i> : ep.number}
                                          </div>
                                          <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {ep.name}
                                          </div>
                                          {ep.filler && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Filler</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="detail-section">
                          <h2 className="detail-section-title">Synopsis</h2>
                          <p className="detail-overview">
                            {animeDetail.overview || "No synopsis available."}
                          </p>
                        </div>

                        {animeDetail.seasons && animeDetail.seasons.length > 0 && (
                          <div className="detail-section">
                            <h2 className="detail-section-title">Seasons</h2>
                            <div className="detail-cards-row">
                              {animeDetail.seasons.map(season => (
                                <div key={season.id} className="season-card" onClick={() => openAnimeDetails(season.id)}>
                                  <img src={season.poster} alt={season.title} />
                                  <div className="season-card-title">{season.title}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {animeDetail.related && animeDetail.related.length > 0 && (
                          <div className="detail-section">
                            <h2 className="detail-section-title">Related</h2>
                            <div className="detail-cards-row">
                              {animeDetail.related.map(related => (
                                <div key={related.id} className="season-card" onClick={() => openAnimeDetails(related.id)}>
                                  <img src={related.poster} alt={related.title || related.name} />
                                  <div className="season-card-title">{related.title || related.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {animeDetail.similar && animeDetail.similar.length > 0 && (
                          <div className="detail-section">
                            <h2 className="detail-section-title">Similar</h2>
                            <div className="detail-cards-row">
                              {animeDetail.similar.map(similar => (
                                <div key={similar.id} className="season-card" onClick={() => openAnimeDetails(similar.id)}>
                                  <img src={similar.poster} alt={similar.title || similar.name || 'Unknown'} />
                                  <div className="season-card-title">{similar.title || similar.name || 'Similar Anime'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20vh 0', textAlign: 'center' }}>
                      <div className="global-loader"><div className="spinner"></div></div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
