import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Loader2, Key,
  RotateCcw, Copy, Check, Info, Box, ChevronRight, Search, Bookmark, X
} from 'lucide-react';
import './index.css';
import { fetchProposals, fetchPromptSteps, registerUser, loginUser, fetchBookmarks, addBookmark, removeBookmark } from './api';
import type { ProposalResponse, PromptResponse, Idea, Step } from './api';

type StepType = 1 | 2 | 3;
type ViewType = 'home' | 'mypage';

interface User {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [currentStep, setCurrentStep] = useState<StepType>(1);
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');

  // Naming logic based on locale
  const [appName, setAppName] = useState('Agent Designer');
  useEffect(() => {
    if (navigator.language.startsWith('ja')) {
      setAppName('エージェントデザイナー');
    }
  }, []);

  // Step 2 State
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [proposalData, setProposalData] = useState<ProposalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 3 State
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptData, setPromptData] = useState<PromptResponse | null>(null);
  const [copiedSteps, setCopiedSteps] = useState<{ [key: number]: boolean }>({});

  // Auth & Bookmark State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [bookmarkedIdeas, setBookmarkedIdeas] = useState<Idea[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form states
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Initial load
  useEffect(() => {
    if (user) {
      loadBookmarks(user.id);
    }
  }, [user]);

  const loadBookmarks = async (userId: number) => {
    try {
      const data = await fetchBookmarks(userId);
      setBookmarkedIdeas(data.bookmarks);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSuggestClick = async () => {
    if (!inputText.trim()) return;
    if (!apiKey.trim()) {
      setError("Gemini API Keyを右上の入力欄に設定してください。");
      return;
    }

    setError(null);
    setIsLoadingProposals(true);
    setCurrentStep(2);

    try {
      const data = await fetchProposals(apiKey, inputText);
      setProposalData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "アイデアの生成中にエラーが発生しました。");
      setCurrentStep(1);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleIdeaSelect = async (idea: Idea) => {
    if (!apiKey.trim()) {
      setError("Gemini API Keyを右上の入力欄に設定してください。");
      return;
    }

    setSelectedIdea(idea);
    setError(null);
    setIsLoadingPrompts(true);
    setCurrentStep(3);
    window.scrollTo(0, 0);

    try {
      const data = await fetchPromptSteps(apiKey, idea);
      setPromptData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "プロンプトの生成中にエラーが発生しました。");
      setCurrentStep(2);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const setExample = (text: string) => {
    setInputText(text);
  };



  const handleCopy = (text: string, stepNum: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSteps({ ...copiedSteps, [stepNum]: true });
    setTimeout(() => {
      setCopiedSteps((prev) => ({ ...prev, [stepNum]: false }));
    }, 2000);
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedIdea(null);
    setPromptData(null);
    setError(null);
    window.scrollTo(0, 0);
  };

  const toggleBookmark = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation(); // prevent triggering handleIdeaSelect
    if (!isAuthenticated || !user) {
      setShowAuthModal(true);
      return;
    }

    const isBookmarked = bookmarkedIdeas.some(b => b.title === idea.title);

    try {
      if (isBookmarked) {
        await removeBookmark(user.id, idea.title);
        setBookmarkedIdeas(prev => prev.filter(b => b.title !== idea.title));
      } else {
        await addBookmark(user.id, idea);
        // Optimistic update or fetch again. Let's just add it locally for speed
        setBookmarkedIdeas(prev => [...prev, idea]);
      }
    } catch (err: any) {
      console.error("Failed to toggle bookmark", err);
      // Could show a toast here
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      let res;
      if (authMode === 'signup') {
        res = await registerUser(authName, authEmail, authPassword);
      } else {
        res = await loginUser(authEmail, authPassword);
      }

      setUser(res.user);
      setIsAuthenticated(true);
      setShowAuthModal(false);

      // Clear form
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setBookmarkedIdeas([]);
    setCurrentView('home');
  };

  const isIdeaBookmarked = (title: string) => {
    return bookmarkedIdeas.some(b => b.title === title);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-brand" onClick={() => { setCurrentView('home'); setCurrentStep(1); }} style={{ cursor: 'pointer' }}>
          <div className="app-brand-icon">
            <Box size={20} />
          </div>
          <div className="app-brand-text">
            {appName}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {isAuthenticated && (
            <div className="nav-links" style={{ display: 'flex', gap: '1rem', marginRight: '1rem' }}>
              <button
                onClick={() => setCurrentView('home')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: currentView === 'home' ? 600 : 400,
                  color: currentView === 'home' ? 'var(--black)' : 'var(--gray)'
                }}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentView('mypage')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: currentView === 'mypage' ? 600 : 400,
                  color: currentView === 'mypage' ? 'var(--black)' : 'var(--gray)'
                }}
              >
                My Page
              </button>
            </div>
          )}

          <div className="api-key-input">
            <Key size={16} color="#404040" />
            <input
              type="password"
              placeholder="Gemini API Key (AI Studio)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="auth-status">
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{user?.name}</span>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none', border: 'none', fontSize: '0.8rem',
                    color: 'var(--light-gray)', cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: 'none', border: 'none', fontSize: '0.85rem',
                  color: 'var(--black)', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">

        {currentView === 'mypage' ? (
          <div className="mypage-container" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 500, marginBottom: '2rem' }}>My Blueprints</h2>
            {bookmarkedIdeas.length === 0 ? (
              <div className="empty-state" style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--white)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <Bookmark size={48} color="var(--light-gray)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.5rem' }}>No bookmarks yet</h3>
                <p style={{ color: 'var(--gray)' }}>Ideas you bookmark will appear here.</p>
                <button className="btn-secondary" style={{ marginTop: '1.5rem', margin: '1.5rem auto 0' }} onClick={() => setCurrentView('home')}>
                  Explore Ideas
                </button>
              </div>
            ) : (
              <div className="ideas-grid">
                {bookmarkedIdeas.map((idea, index) => (
                  <div key={index} className="idea-card" onClick={() => { setCurrentView('home'); handleIdeaSelect(idea); }}>
                    <div className="idea-header">
                      <div className="idea-badge">Saved Blueprint</div>
                      <button
                        className="btn-bookmark bookmarked"
                        onClick={(e) => toggleBookmark(e, idea)}
                        title="Remove Bookmark"
                      >
                        <Bookmark size={18} fill="currentColor" />
                      </button>
                    </div>

                    <h4 className="idea-title">{idea.title}</h4>

                    <div className="idea-description">
                      {idea.description}
                    </div>

                    <div className="idea-io">
                      <div className="io-box">
                        <strong>Input</strong>
                        {idea.input}
                      </div>
                      <div className="io-box">
                        <strong>Output</strong>
                        {idea.output}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Minimal Progress Navigation */}
            <div className="minimal-nav">
              <div className={`nav-item ${currentStep === 1 ? 'active' : ''}`}>
                01 Input
              </div>
              <ChevronRight className="nav-arrow" size={16} />
              <div className={`nav-item ${currentStep === 2 ? 'active' : ''}`}>
                02 Agent Design
              </div>
              <ChevronRight className="nav-arrow" size={16} />
              <div className={`nav-item ${currentStep === 3 ? 'active' : ''}`}>
                03 Generate Prompt
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* --- STEP 1 --- */}
            {currentStep === 1 && (
              <div className="step-content">
                <div className="card">
                  <h2 className="card-title">Define the Mission</h2>
                  <p className="card-subtitle">AIに遂行させたい日々の業務やルーチンワークの目的を入力してください。</p>

                  <div className="form-group">
                    <textarea
                      className="textarea-input"
                      placeholder="人材育成の計画策定やフィードバック..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={handleSuggestClick}
                    disabled={!inputText.trim()}
                  >
                    Analyze Workload
                  </button>
                </div>

                <div className="examples-section">
                  <div className="examples-title">
                    Templates
                  </div>
                  <div className="examples-grid">

                    <div
                      className="example-card"
                      onClick={() => setExample("マーケティング担当です。毎週、各広告チャネル（Google Ads、Meta、X）の数値をスプレッドシートに集約し、前週比・目標比を出してレポートを作成しています。チャネルが増えるたびに工数が膨らみ、1回あたり2時間以上かかっています。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        Marketing
                      </div>
                      <div className="example-text">
                        毎週、各広告チャネルの数値をスプレッドシートに集約し、前週比・目標比を出してレポートを作成しています。チャネルが増えるたびに工数が膨らみ、1回あたり2時間以上かかっています。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("システムエンジニアです。障害発生時にログを解析し、原因の切り分けを行い、関係者向けの障害報告書を作成しています。ログが膨大で読み解くのに時間がかかり、報告書のフォーマット整備も含めて1件あたり1〜2時間かかります。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        System Engineer
                      </div>
                      <div className="example-text">
                        障害発生時にログを解析し、原因の切り分けを行い、関係者向けの障害報告書を作成しています。ログが膨大で読み解くのに時間がかかり、1件あたり1〜2時間かかります。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("GTMエンジニアです。マーケティングチームからのタグ設置・変更依頼を受け、GTMコンテナの設定を行い、プレビューで動作確認した後にドキュメントを更新しています。依頼が週に10件以上あり、設定ミスの手戻りも頻発して困っています。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        GTM Engineer
                      </div>
                      <div className="example-text">
                        マーケからのタグ設置・変更依頼を受け、GTMコンテナの設定を行い、プレビューで動作確認した後にドキュメントを更新しています。依頼が週に10件以上あり、手戻りも頻発しています。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("広報部の社員です。毎日、自社や競合に関するニュース・SNSの投稿をモニタリングし、重要な記事をピックアップして社内向けのクリッピングレポートを作成しています。情報量が多く、毎朝1時間半以上かかっています。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        Public Relations
                      </div>
                      <div className="example-text">
                        毎日、自社や競合に関するニュース・SNSの投稿をモニタリングし、重要な記事をピックアップして社内向けのクリッピングレポートを作成しています。情報量が多く、毎朝1時間半以上かかっています。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("財務部の社員です。毎月、各部門から提出される経費精算データを確認し、勘定科目の仕訳を行い、月次決算レポートの下書きを作成しています。確認項目が多く、ミスが許されないため1回あたり丸1日かかることもあります。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        Finance
                      </div>
                      <div className="example-text">
                        毎月、各部門から提出される経費精算データを確認し、勘定科目の仕訳を行い、月次決算レポートの下書きを作成しています。確認項目が多く、1回あたり丸1日かかることもあります。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("トラックドライバーです。毎日の配送ルートを手作業で組み立てており、交通状況・荷物の優先度・時間指定を考慮しながら最適な順番を決めています。経験と勘に頼る部分が大きく、非効率なルートになることも多いです。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        Truck Driver
                      </div>
                      <div className="example-text">
                        毎日の配送ルートを手作業で組み立てており、交通状況・荷物の優先度・時間指定を考慮しながら最適な順番を決めています。経験と勘に頼る部分が大きく、非効率になることも多いです。
                      </div>
                    </div>

                    <div
                      className="example-card"
                      onClick={() => setExample("彫刻家です。作品の制作過程を記録し、展覧会向けのアーティストステートメントやキャプションを書く必要がありますが、文章を書くのが苦手です。また、ギャラリーへの提案書や助成金申請書の作成にも時間を取られています。")}
                    >
                      <div className="example-header">
                        <div className="example-icon"><MessageCircle size={18} /></div>
                        Sculptor
                      </div>
                      <div className="example-text">
                        作品の制作過程を記録し、展覧会向けのアーティストステートメントやキャプションを書く必要がありますが、文章作成が苦手です。ギャラリーへの提案書や助成金申請書の作成にも時間を取られています。
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 2 --- */}
            {currentStep === 2 && isLoadingProposals && (
              <div className="loading-container">
                <Loader2 size={36} className="spinner" />
                <h2>Analyzing workflows...</h2>
                <p style={{ color: '#a3a3a3' }}>Generating potential agent blueprints</p>
              </div>
            )}

            {currentStep === 2 && !isLoadingProposals && proposalData && (
              <div className="step-content">
                <div className="analysis-block">
                  <div className="analysis-icon">
                    <Search size={24} />
                  </div>
                  <div className="analysis-content">
                    <h3>Insights & Hypothesis</h3>
                    <p>{proposalData.analysis}</p>
                  </div>
                </div>

                <div className="ideas-grid">
                  {proposalData.ideas.map((idea, index) => (
                    <div key={index} className="idea-card" onClick={() => handleIdeaSelect(idea)}>
                      <div className="idea-header">
                        <div className="idea-badge">Blueprint {index + 1}</div>
                        <button
                          className={`btn-bookmark ${isIdeaBookmarked(idea.title) ? 'bookmarked' : ''}`}
                          onClick={(e) => toggleBookmark(e, idea)}
                          title="Bookmark"
                        >
                          <Bookmark
                            size={18}
                            fill={isIdeaBookmarked(idea.title) ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      <h4 className="idea-title">{idea.title}</h4>

                      <div className="idea-description">
                        {idea.description}
                      </div>

                      <div className="idea-io">
                        <div className="io-box">
                          <strong>Input</strong>
                          {idea.input}
                        </div>
                        <div className="io-box">
                          <strong>Output</strong>
                          {idea.output}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- STEP 3 --- */}
            {currentStep === 3 && isLoadingPrompts && (
              <div className="loading-container">
                <Loader2 size={36} className="spinner" />
                <h2>Engineering Prompts...</h2>
                <p style={{ color: '#a3a3a3' }}>Synthesizing step-by-step instructions for the agent</p>
              </div>
            )}

            {currentStep === 3 && !isLoadingPrompts && promptData && selectedIdea && (
              <div className="step-content">

                <div className="step3-header">
                  <div className="step3-title-container">
                    <div className="step3-title-icon">
                      <Box size={24} />
                    </div>
                    <div className="step3-title">
                      <h2>{selectedIdea.title}</h2>
                      <p>System Instructions & Strategy</p>
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={handleStartOver}>
                    Start Over <RotateCcw size={16} />
                  </button>
                </div>

                <div className="prompt-steps">
                  {promptData.steps.map((step) => (
                    <div key={step.stepNumber} className="prompt-step-card">
                      <div className="step-label">
                        Phase {step.stepNumber}
                      </div>

                      <div className="prompt-card-content">
                        <div className="prompt-card-header">
                          <div className="prompt-card-title">
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                          </div>
                          <button
                            className={`btn-copy ${copiedSteps[step.stepNumber] ? 'copied' : ''}`}
                            onClick={() => handleCopy(step.prompt, step.stepNumber)}
                          >
                            {copiedSteps[step.stepNumber] ? (
                              <><Check size={16} /> Copied</>
                            ) : (
                              <><Copy size={16} /> Copy</>
                            )}
                          </button>
                        </div>

                        <div className="prompt-box">
                          {step.prompt}
                        </div>

                        {step.nextAction && (
                          <div className="next-action-box">
                            <Info size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <strong>Next Required Context:</strong> {step.nextAction}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuthModal(false)}>
              <X size={24} />
            </button>

            <div className="auth-header">
              <h3>{authMode === 'signin' ? 'Welcome Back' : 'Create Account'}</h3>
              <p>Sign in to save and manage your blueprints.</p>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div style={{ color: '#d32f2f', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                {authError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" placeholder="John Doe" value={authName} onChange={e => setAuthName(e.target.value)} required />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
