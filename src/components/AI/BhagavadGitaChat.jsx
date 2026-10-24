import React, { useState } from 'react';
import { apiAskBhagavadGita } from '../../api/apiClient';
import { searchGitaVerses } from '../../data/gitaDataset';
import { askGitaWisdom } from '../../utils/gitaAiAssistant';
import { DevotionalCrest } from '../../assets/crest';
import { 
  BookOpen, 
  Send, 
  Sparkles, 
  Scroll, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';

// Format text cleanly into normal human-readable text without raw asterisks
const formatDevotionalText = (rawText) => {
  if (!rawText) return null;
  const lines = String(rawText).split('\n');
  return lines.map((line, idx) => {
    if (!line.trim()) return <div key={idx} style={{ height: '6px' }} />;
    
    // Split on **bold** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#1B4332', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={pIdx} style={{ color: '#8B4513', fontStyle: 'italic' }}>{part.slice(1, -1)}</span>;
      }
      return part.replace(/\*\*/g, '').replace(/\*/g, '');
    });

    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());

    return (
      <div 
        key={idx} 
        style={{ 
          marginBottom: isBullet ? '4px' : '6px',
          paddingLeft: isBullet ? '4px' : '0',
          lineHeight: 1.55
        }}
      >
        {formattedLine}
      </div>
    );
  });
};

export const BhagavadGitaChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hare Krishna! Welcome to the Bhagavad Gita Q&A Assistant. Inquire about the sacred teachings of Lord Sri Krishna. Every response is grounded in authentic scripture verses with chapter and verse citations.',
      verses: [
        {
          ref: 'BG 4.34',
          chapter: 4,
          verse: 34,
          transliteration: "tad viddhi praṇipātena paripraśnena sevayā...",
          translation: "Just try to learn the truth by approaching a spiritual master. Inquire from him submissively and render service unto him. The self-realized souls can impart knowledge unto you because they have seen the truth.",
          theme: "Spiritual Inquiry & Learning"
        }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const suggestedQuestions = [
    "How can students overcome stress and exam anxiety according to the Gita?",
    "Explain Karma Yoga (BG 2.47) and acting without attachment to results.",
    "How can we control the restless and flickering mind according to Chapter 6?",
    "What does Krishna say about offering simple things with love (BG 9.26)?",
    "What are the 35 qualities of a dear devotee described in Chapter 12?"
  ];

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const data = await askGitaWisdom(text);

      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.answer || "Here is the guidance based on authentic scriptural verses.",
        verses: data.sourcedVerses || [],
        modelUsed: data.modelUsed || "Qwen2.5-7B (Inference Engine)",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const localMatches = searchGitaVerses(text, 2);
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: `Hare Krishna! Based on the authentic teachings of the Bhagavad Gita, one should practice steadfast devotion, selfless duty (Karma Yoga), and peaceful control of the mind and senses.`,
        verses: localMatches,
        modelUsed: "Authentic Scripture RAG",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Banner */}
      <div 
        className="devotional-card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 220, 0.95) 100%)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '5px solid #FFD700'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DevotionalCrest size={44} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="heading-gold" style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.4rem)', fontWeight: 800, color: '#1B4332' }}>
                Bhagavad Gita Wisdom Assistant
              </h2>
              <span 
                style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '1px solid #FFD700',
                  color: '#8B4513',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}
              >
                RAG Scriptural Grounding
              </span>
            </div>
            <p style={{ color: '#666', fontSize: '0.88rem', marginTop: '2px' }}>
              Every response quotes authentic Bhagavad Gita verses with chapter and verse references. Zero fabricated citations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#1B4332', background: '#D8F3DC', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            Powered by Qwen3-4B / Qwen2.5
          </span>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div 
        className="devotional-card-cream" 
        style={{ padding: '0.85rem 1.25rem', border: '1px solid rgba(255, 215, 0, 0.4)' }}
      >
        <div style={{ fontSize: '0.78rem', color: '#8B4513', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Sparkles size={14} color="#FF9933" />
          <span>Recommended Student Topics:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              style={{
                background: '#FFF',
                border: '1px solid #E0D4BA',
                borderRadius: '16px',
                padding: '4px 11px',
                fontSize: '0.78rem',
                color: '#1B4332',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#FFD700';
                e.currentTarget.style.background = '#FFF9DB';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E0D4BA';
                e.currentTarget.style.background = '#FFF';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div 
        className="devotional-card"
        style={{
          padding: '1.25rem',
          minHeight: '440px',
          maxHeight: '600px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'rgba(255, 255, 255, 0.98)'
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              {/* Message Bubble */}
              <div 
                style={{
                  maxWidth: '85%',
                  background: isUser 
                    ? 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' 
                    : '#FAF6EE',
                  color: isUser ? '#FFF' : '#303030',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '1rem 1.25rem',
                  border: isUser ? 'none' : '1px solid #E8DCC2',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.06)'
                }}
              >
                {/* Role Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem', opacity: 0.85 }}>
                  <span style={{ fontWeight: 700, color: isUser ? '#FFD700' : '#8B4513' }}>
                    {isUser ? 'Student Inquiry' : 'Sri Gita Wisdom'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div style={{ fontSize: '0.94rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', color: isUser ? '#FFFFFF' : '#1E293B', marginBottom: (!isUser && msg.verses && msg.verses.length > 0) ? '1.25rem' : '0.5rem' }}>
                  {formatDevotionalText(msg.text)}
                </div>

                {/* Sourced Verses Section (Clearly Distinguished Scriptural Authority) */}
                {msg.verses && msg.verses.length > 0 && !isUser && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.85rem', borderTop: '1px dashed #D4AF37', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#8B4513', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Scroll size={14} color="#FF9933" />
                        <span>Scriptural Grounding &amp; Citations:</span>
                      </div>
                      {msg.modelUsed && (
                        <span style={{ fontSize: '0.68rem', color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>

                    {msg.verses.map((verse, vIdx) => (
                      <div 
                        key={vIdx}
                        style={{
                          background: '#FFFDF5',
                          border: '1.5px solid #FFD700',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          fontSize: '0.86rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                          <span 
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              color: '#8B4513',
                              background: '#FEF3C7',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                              border: '1px solid #FCD34D'
                            }}
                          >
                            {verse.ref}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#666', fontStyle: 'italic', fontWeight: 600 }}>
                            {verse.theme}
                          </span>
                        </div>

                        {verse.sanskrit && (
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '1px 6px', borderRadius: '4px', marginBottom: '3px' }}>
                              Original Sanskrit Shloka (संस्कृत श्लोक)
                            </span>
                            <div style={{ fontSize: '0.92rem', color: '#8B4513', fontWeight: 700, fontFamily: 'serif', lineHeight: 1.5 }}>
                              {verse.sanskrit}
                            </div>
                          </div>
                        )}

                        {verse.transliteration && (
                          <div style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic', marginBottom: '6px' }}>
                            {verse.transliteration}
                          </div>
                        )}

                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #F3E8C8' }}>
                          <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', marginBottom: '3px' }}>
                            English Translation
                          </span>
                          <div style={{ color: '#1E293B', fontStyle: 'italic', lineHeight: 1.5, fontWeight: 500 }}>
                            "{verse.translation}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Copy Button */}
                {!isUser && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px'
                      }}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={13} color="#2D6A4F" /> : <Copy size={13} />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B4513', fontSize: '0.88rem', padding: '0.5rem' }}>
            <DevotionalCrest size={22} className="animate-spin" />
            <span>Consulting sacred verses and Qwen3-4B inference...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input 
          type="text"
          className="form-input"
          placeholder="Ask a question about Bhagavad Gita wisdom, shlokas, or student life..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
          style={{ flex: 1, padding: '0.8rem 1rem', fontSize: '0.95rem' }}
        />

        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="btn-gold"
          style={{ padding: '0.8rem 1.4rem' }}
        >
          <Send size={17} />
          <span>Inquire</span>
        </button>
      </form>
    </div>
  );
};
