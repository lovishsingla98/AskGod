import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  fetchSummaries,
  fetchChapter,
  routeQuery,
} from './services/scriptureEngine';

const QUICK_TAGS = [
  { label: 'Inner Peace 🕊️', query: 'How do I find deep inner peace and calm my mind?' },
  { label: 'Handling Anxiety 🧘', query: 'How do I manage anxiety and fear about the future?' },
  { label: 'Action & Duty (Karma) 🛠️', query: 'What is the right attitude toward work and exams?' },
  { label: 'Purpose of Life 🌌', query: 'What is the true purpose of human life and existence?' },
  { label: 'Dealing with Grief 🌅', query: 'How do I deal with grief, loss, and the death of loved ones?' }
];

function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  
  // 3D Book Animation States: null, 'closed', 'opening', 'flipping', 'opened', 'closing'
  const [bookState, setBookState] = useState(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [translationLang, setTranslationLang] = useState('english');

  // Navigation views: 'home' | 'scriptures'
  const [currentView, setCurrentView] = useState('home');
  const [libraryBooks, setLibraryBooks] = useState([]);

  // References for synchronized scrolling
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const scrollSyncRef = useRef(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await fetchSummaries();
        setLibraryBooks(data);
      } catch (err) {
        console.error('Failed to fetch scriptures library:', err);
      }
    };
    fetchBooks();
  }, []);

  const getBookCover = (bookName) => {
    const name = (bookName || '').toLowerCase();
    if (name.includes('gita') && !name.includes('ashtavakra') && !name.includes('avadhuta')) {
      return '/assets/gita_cover.jpg';
    } else if (name.includes('yoga') || name.includes('sutra')) {
      return '/assets/yoga_sutras_cover.jpg';
    } else if (name.includes('upanishad')) {
      return '/assets/upanishads_cover.jpg';
    } else if (name.includes('ramayana')) {
      return '/assets/ramayana_cover.jpg';
    }
    return '/assets/yoga_sutras_cover.jpg';
  };

  const handleSearch = async (queryToSend) => {
    const activeQuery = queryToSend || question;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setBookState(null);
    setShowScrollIndicator(true);
    setTranslationLang('english'); // Reset translation language for new searches
    setSearchedQuery(activeQuery);

    try {
      let summaries = libraryBooks;
      if (summaries.length === 0) {
        summaries = await fetchSummaries();
        setLibraryBooks(summaries);
      }

      const route = await routeQuery(activeQuery);
      const chapterData = route.chapter;
      const chapterVerses = chapterData.verses;
      
      if (chapterVerses.length === 0) {
        throw new Error(`No verses found in chapter ${route.chapterId} of ${route.bookId}`);
      }

      const bookName = chapterData.bookName || route.bookId;

      const initialResult = {
        bookId: route.bookId,
        bookName,
        chapter: chapterData.parent ? `${chapterData.parent} — ${chapterData.title}` : chapterData.title,
        targetVerseId: route.verseId,
        verses: chapterVerses.map(v => ({
          id: v.id,
          verse: v.number,
          citation: v.citation,
          sanskrit: v.sanskrit,
          translation: v.translation,
          hindi: v.hindi || ''
        })),
        routingReason: route.routingReason,
        attribution: chapterData.attribution
      };

      setResult(initialResult);
      setBookState('closed');
    } catch (err) {
      console.error(err);
      setError({
        title: 'Connection / Query Failed',
        message: err.message || 'Could not resolve the query.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChapter = async (bookId, chapterId) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setBookState(null);
    setShowScrollIndicator(true);
    setTranslationLang('english');
    setSearchedQuery(`Reading ${bookId} — ${chapterId}`);

    try {
      const chapterData = await fetchChapter(bookId, chapterId);
      const chapterVerses = chapterData.verses;
      
      if (chapterVerses.length === 0) {
        throw new Error(`No verses found in chapter ${chapterId} of ${bookId}`);
      }

      const bookName = chapterData.bookName || bookId;

      const initialResult = {
        bookId,
        bookName,
        chapter: chapterData.parent ? `${chapterData.parent} — ${chapterData.title}` : chapterData.title,
        targetVerseId: chapterVerses[0].id,
        verses: chapterVerses.map(v => ({
          id: v.id,
          verse: v.number,
          citation: v.citation,
          sanskrit: v.sanskrit,
          translation: v.translation,
          hindi: v.hindi || ''
        })),
        routingReason: `Reading ${bookName}, ${chapterData.title} cover-to-cover.`,
        attribution: chapterData.attribution
      };

      setResult(initialResult);
      setBookState('closed');
      setCurrentView('home');
    } catch (err) {
      console.error(err);
      setError({
        title: 'Failed to load chapter',
        message: err.message || 'Could not retrieve scripture chapter.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Run the multi-stage book animation when the result lands
  useEffect(() => {
    if (bookState === 'closed') {
      const timer = setTimeout(() => {
        setBookState('opening');
      }, 300);
      return () => clearTimeout(timer);
    }
    if (bookState === 'opening') {
      const timer = setTimeout(() => {
        setBookState('flipping');
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (bookState === 'flipping') {
      const timer = setTimeout(() => {
        setBookState('opened');
      }, 1700);
      return () => clearTimeout(timer);
    }
  }, [bookState]);

  // Immersive "Peek & Return" auto-scrolling sequence
  useEffect(() => {
    if (bookState === 'opened' && result) {
      // 1. First, scroll down to the highlighted target verse
      const scrollDownTimer = setTimeout(() => {
        const targetElements = document.querySelectorAll('.target-verse-highlight');
        targetElements.forEach(el => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        // 2. Wait 1.8 seconds (let user see the highlight), then scroll back to top so they read in sequence
        const returnTimer = setTimeout(() => {
          if (leftRef.current && rightRef.current) {
            leftRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            rightRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 1800);

        return () => clearTimeout(returnTimer);
      }, 600); // Let book open transition settle first

      return () => clearTimeout(scrollDownTimer);
    }
  }, [bookState, result]);

  // Synchronized scrolling handlers (based on scroll percentage height match)
  const handleLeftScroll = () => {
    if (showScrollIndicator) setShowScrollIndicator(false);
    if (scrollSyncRef.current === 'right') return;
    scrollSyncRef.current = 'left';

    if (leftRef.current && rightRef.current) {
      const left = leftRef.current;
      const right = rightRef.current;
      const pct = left.scrollTop / (left.scrollHeight - left.clientHeight);
      right.scrollTop = pct * (right.scrollHeight - right.clientHeight);
    }

    clearTimeout(window.leftScrollTimeout);
    window.leftScrollTimeout = setTimeout(() => {
      scrollSyncRef.current = null;
    }, 150);
  };

  const handleRightScroll = () => {
    if (showScrollIndicator) setShowScrollIndicator(false);
    if (scrollSyncRef.current === 'left') return;
    scrollSyncRef.current = 'right';

    if (leftRef.current && rightRef.current) {
      const left = leftRef.current;
      const right = rightRef.current;
      const pct = right.scrollTop / (right.scrollHeight - right.clientHeight);
      left.scrollTop = pct * (left.scrollHeight - left.clientHeight);
    }

    clearTimeout(window.rightScrollTimeout);
    window.rightScrollTimeout = setTimeout(() => {
      scrollSyncRef.current = null;
    }, 150);
  };

  const handleCloseBook = () => {
    setBookState('closing');
    setTimeout(() => {
      setResult(null);
      setBookState(null);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="app-container">
      {/* Background glowing auras */}
      <div className="aura-glow aura-gold"></div>
      <div className="aura-glow aura-saffron"></div>

      {/* Navigation Header */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-symbol">🕉️</span>
          <h1 className="logo-text">AskGod</h1>
        </div>
        <nav className="header-nav">
          <button 
            className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => { setCurrentView('home'); setResult(null); setBookState(null); }}
          >
            Home
          </button>
          <button 
            className={`nav-link-btn ${currentView === 'scriptures' ? 'active' : ''}`}
            onClick={() => { setCurrentView('scriptures'); setResult(null); setBookState(null); }}
          >
            Scriptures
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Only show Search/Hero if no book is active and in Home view */}
        {!result && !loading && currentView === 'home' && (
          <div className="fade-in">
            {/* Intro Hero Section */}
            <section className="hero-section">
              <h2 className="hero-title">Feeling anxious, stressed, or struggling with financial or relationship problems?</h2>
              <p className="hero-subtitle">
                Ask God and let Him answer through His divine books.
              </p>
              <p className="hero-belief">Solution to all your problems, only if you believe in him.</p>
            </section>

            {/* Search Bar Section */}
            <section className="search-section">
              <div className="search-bar-wrapper">
                <input
                  type="text"
                  className="search-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask the scriptures a question... (e.g., How do I manage stress? Karma)"
                />
                <button 
                  className="search-button" 
                  onClick={() => handleSearch()}
                  disabled={!question.trim()}
                >
                  <svg className="search-icon" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
              </div>

              {/* Quick Start Chips */}
              <div className="quick-tags-container">
                <span className="quick-tags-label">Common Seekings:</span>
                <div className="quick-tags-list">
                  {QUICK_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      className="quick-tag-chip"
                      onClick={() => {
                        setQuestion(tag.query);
                        handleSearch(tag.query);
                      }}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Scriptures library grid */}
        {!result && !loading && currentView === 'scriptures' && (
          <div className="fade-in scriptures-library-container">
            <h2 className="library-title">The Sacred Scripture Library</h2>
            <p className="library-subtitle">Select any book and choose a chapter to read cover-to-cover.</p>
            
            <div className="library-grid">
              {libraryBooks.map((book) => (
                <div key={book.bookId} className="library-card">
                  <div 
                    className="library-card-cover"
                    style={{ backgroundImage: `url(${getBookCover(book.bookName)})` }}
                  >
                    <div className="library-card-cover-overlay">
                      <span className="library-card-badge">{book.chapters.length} Chapters</span>
                    </div>
                  </div>
                  <div className="library-card-info">
                    <h3 className="library-card-title">{book.bookName}</h3>
                    <p className="library-card-desc">{book.description}</p>
                    
                    <div className="chapter-selector-wrapper">
                      <select 
                        className="chapter-select-dropdown"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleOpenChapter(book.bookId, e.target.value);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Choose a chapter...</option>
                        {book.chapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.parent ? `${ch.parent} — ` : ''}{ch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading-state">
            <div className="spinner-glow"></div>
            <div className="spinner"></div>
            <p className="loading-text">Searching the library of scriptures...</p>
            <p className="loading-subtext">Routing query to the exact book, chapter, and page</p>
          </div>
        )}

        {/* Error Card */}
        {error && !loading && (
          <div className="error-card fade-in">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">{error.title}</h3>
            <p className="error-message">{error.message}</p>
            {error.title.includes('API Key') && (
              <div className="setup-tip">
                <strong>How to fix:</strong> Open <code>backend/.env</code>, add your key <code>GEMINI_API_KEY=your_key_here</code>, and then restart the node server.
              </div>
            )}
            <button className="close-book-btn mt-4" onClick={() => setError(null)}>Back</button>
          </div>
        )}

        {/* Immersive 3D Book Experience */}
        {result && bookState && (
          <section className="book-viewer-section">
            <div className="book-stage-header fade-in">
              <h3 className="result-header">
                Scripture solution for: <span className="highlight">"{searchedQuery}"</span>
              </h3>
              <button className="close-book-btn" onClick={handleCloseBook}>
                Close Book
              </button>
            </div>

            {/* The 3D Book Element */}
            <div className={`book-viewport ${bookState}`}>
              <div className="book-3d">
                
                {/* Front Cover (swings left 180deg) */}
                <div 
                  className="book-page front-cover" 
                  style={{ backgroundImage: `url(${getBookCover(result.bookName)})` }}
                >
                  <div className="cover-inner"></div>
                </div>

                {/* Flipping page 1 */}
                <div className="book-page flipping-page page-1">
                  <div className="page-front parchment-bg"></div>
                  <div className="page-back parchment-bg"></div>
                </div>

                {/* Flipping page 2 */}
                <div className="book-page flipping-page page-2">
                  <div className="page-front parchment-bg"></div>
                  <div className="page-back parchment-bg"></div>
                </div>

                {/* Inside Left Page (Static after book opens) */}
                <div className="book-page inside-left parchment-bg">
                  <div 
                    className="parchment-content" 
                    ref={leftRef} 
                    onScroll={handleLeftScroll}
                  >
                    <h4 className="book-title-calligraphy">{result.bookName}</h4>
                    <span className="chapter-reference">{result.chapter} (Sanskrit)</span>
                    <hr className="calligraphy-divider" />
                    
                    <div className="scripture-verses-list">
                      {result?.verses?.map((v, idx) => {
                        const isTarget = v.id === result.targetVerseId;
                        return (
                          <div 
                            key={idx} 
                            className={`verse-item-sanskrit ${isTarget ? 'target-verse-highlight' : ''}`}
                          >
                            <span className="verse-label-number">|| {v.citation} ||</span>
                            <p className="sanskrit-text-flow">{v.sanskrit}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="page-number">L</div>
                </div>

                {/* Inside Right Page (Static after book opens) */}
                <div className="book-page inside-right parchment-bg">
                  <div 
                    className="parchment-content" 
                    ref={rightRef} 
                    onScroll={handleRightScroll}
                  >
                    <div className="routing-reason-overlay">
                      <h4 className="section-title-reason">Selection Context</h4>
                      <p className="guidance-text-reason">💡 {result?.routingReason}</p>
                      {result?.attribution && (
                        <p className="source-attribution">
                          Edition: {result.attribution.edition} · Translation: {result.attribution.translator} ·{' '}
                          <a href={result.attribution.url} target="_blank" rel="noreferrer">Source</a>
                        </p>
                      )}
                    </div>

                    {/* Language Selection Tabs for Translation */}
                    <div className="translation-lang-tabs">
                      <button 
                        className={`lang-tab-btn ${translationLang === 'english' ? 'active' : ''}`}
                        onClick={() => setTranslationLang('english')}
                      >
                        English
                      </button>
                      <button 
                        className={`lang-tab-btn ${translationLang === 'hindi' ? 'active' : ''}`}
                        disabled={!result?.verses?.some(v => v.hindi && v.hindi.trim() !== '')}
                        onClick={() => setTranslationLang('hindi')}
                      >
                        हिन्दी
                      </button>
                    </div>

                    <hr className="calligraphy-divider" />
                    
                    <div className="scripture-verses-list">
                      {result?.verses?.map((v, idx) => {
                        const isTarget = v.id === result.targetVerseId;
                        const displayText = (translationLang === 'hindi' && v.hindi) ? v.hindi : v.translation;
                        return (
                          <div 
                            key={idx} 
                            className={`verse-item-english ${isTarget ? 'target-verse-highlight' : ''}`}
                          >
                            <span className="verse-label-number-eng">{v.citation}.</span>
                            <p className="translation-text-flow">{displayText}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="page-number">R</div>
                </div>

                {/* Back Cover */}
                <div className="book-page back-cover"></div>

              </div>

              {/* Scroll Helper Toast Indicator */}
              {bookState === 'opened' && showScrollIndicator && (
                <div className="scroll-indicator-toast fade-in">
                  <span>Scroll pages to read entire chapter 📜</span>
                  <div className="bounce-arrow">↓</div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Serene Spiritual Footer */}
      <footer className="app-footer">
        <p className="footer-quote">“Lead me from the unreal to the real. Lead me from darkness to light. Lead me from death to immortality.”</p>
        <p className="footer-copyright">© {new Date().getFullYear()} AskGod. Made with devotion and modern AI.</p>
      </footer>
    </div>
  );
}

export default App;
