'use client';

import { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, LinkIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

// Helper to generate URL-friendly slug from question text
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// Link style for FAQ answers
const linkStyle = {
  color: '#3b82f6',
  textDecoration: 'underline',
  fontWeight: '600' as const
};

// FAQ Categories and Questions
const faqData = [
  {
    category: 'Getting Started',
    icon: 'fa-rocket',
    color: '#3b82f6',
    questions: [
      {
        question: 'What is Lines Police CAD?',
        answer: 'Lines Police CAD (LPC) is the world\'s leading free-to-use Computer Aided Dispatch tool for role-play communities. It provides comprehensive dashboards for civilians, police officers, dispatch, and EMS personnel to enhance your role-play experience.'
      },
      {
        question: 'Is Lines Police CAD free to use?',
        answer: 'Yes! LPC is completely free to use. We offer optional premium tiers for users who want additional features or wish to support the development, but the core functionality is available to everyone at no cost.'
      },
      {
        question: 'How do I create an account?',
        answer: (<>Click the &quot;Login&quot; button in the top navigation, then select <a href="/signup-civ" style={linkStyle}>Sign Up</a> to create a new account. You&apos;ll need to register with your email address. After creating your account, you can link it to Discord to use our <a href="/discord-bot" style={linkStyle}>Discord bot</a> features.</>)
      },
      {
        question: 'How do I join a community?',
        answer: (<>After logging in, visit the <a href="/communities" style={linkStyle}>Communities page</a> where you can browse available communities, search by name, or use an invite code. Once you find a community you&apos;re interested in, click &quot;Request to Join&quot; and wait for approval from the community administrators.</>)
      },
      {
        question: 'Where do I enter an invite code?',
        answer: (<>Go to the <a href="/invite-code" style={linkStyle}>Invite Code page</a> or click the &quot;Invite Code&quot; button on the <a href="/communities" style={linkStyle}>Communities page</a>. Enter your code and you&apos;ll be taken directly to that community where you can request to join.</>)
      }
    ]
  },
  {
    category: 'Account Management',
    icon: 'fa-user-gear',
    color: '#8b5cf6',
    questions: [
      {
        question: 'How do I reset my password?',
        answer: (<>Go to the <a href="/forgot-password" style={linkStyle}>Forgot Password page</a> and enter your email address. We&apos;ll send you a password reset link. Check your spam folder if you don&apos;t see the email within a few minutes.</>)
      },
      {
        question: 'How do I reactivate my deactivated account?',
        answer: (<>If your account has been deactivated, you&apos;ll see an error message when attempting to log in. To restore your account, <a href="/contact-us" style={linkStyle}>contact us</a> through Discord by opening an Assistance Ticket. Please note that per our <a href="/terms-and-conditions" style={linkStyle}>Terms of Service</a>, deactivated accounts may be permanently deleted after 30 days.</>)
      },
      {
        question: 'How do I change my username or profile information?',
        answer: (<>Log into your account and navigate to your <a href="/profile" style={linkStyle}>Profile page</a>. From there, you can update your username, profile picture, and other account details.</>)
      },
      {
        question: 'How do I delete/deactivate my account?',
        answer: (<>To deactivate your account, log in and go to your <a href="/profile" style={linkStyle}>Profile page</a>. At the bottom, click &quot;Deactivate Account&quot; and confirm that you want to start the deletion process. Your account will be deactivated for 30 days, during which time you can <a href="/contact-us" style={linkStyle}>contact us</a> through Discord to restore it. After 30 days, your account may be permanently deleted per our <a href="/terms-and-conditions" style={linkStyle}>Terms of Service</a>.</>)
      }
    ]
  },
  {
    category: 'Communities',
    icon: 'fa-users',
    color: '#10b981',
    questions: [
      {
        question: 'How do I create my own community?',
        answer: (<>On the <a href="/communities" style={linkStyle}>Communities page</a>, click the &quot;Create&quot; button next to the search bar. Fill in your community name, description, and choose your settings. Your first community is free to create, and you can invite friends once it&apos;s set up. To create additional communities, you may need to upgrade your account.</>)
      },
      {
        question: 'How do I upgrade my account to create more communities?',
        answer: (<>You can upgrade your account through our mobile app while we set up web access for purchases. The subscription tiers are:
          <ul style={{ marginTop: '0.75rem', marginBottom: '0.5rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.25rem' }}><strong>Free</strong> — 1 community</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Base</strong> — Up to 5 communities</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Premium</strong> — Up to 10 communities, verified checkmark, 50% fewer ads</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Premium+</strong> — Unlimited communities, verified checkmark, custom departments, no ads</li>
          </ul>
        </>)
      },
      {
        question: 'What\'s the difference between public and private communities?',
        answer: 'Public communities are visible to everyone and anyone can request to join. Private communities are hidden from search results and require an invite code to find and join.'
      },
      {
        question: 'How do I manage my community members?',
        answer: 'As a community owner or administrator, go to your community\'s dashboard and navigate to the Members section. From there, you can approve/deny join requests, assign roles, and manage member permissions.'
      },
      {
        question: 'Can I transfer ownership of my community?',
        answer: (<>Yes, community ownership can be transferred. <a href="/contact-us" style={linkStyle}>Contact us</a> through Discord with the details of the current and new owner, and we&apos;ll help facilitate the transfer.</>)
      },
      {
        question: 'What are Elite communities?',
        answer: 'Elite communities are featured communities that have opted for our premium promotion tier. They receive additional visibility, special badges, featured placement on the home page, and enhanced features to help grow their community.'
      },
      {
        question: 'How do I promote my community or make it Elite?',
        answer: (<>Currently, community promotions are available through our mobile app. From your community settings, tap the &quot;Promote&quot; button to choose a promotion tier. The available tiers are:
          <ul style={{ marginTop: '0.75rem', marginBottom: '0.5rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.25rem' }}><strong>Basic</strong> — Promotional text in search results</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Standard</strong> — Promotional text + verified community badge</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Premium</strong> — All Standard features + boost on Discover Communities page</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Elite</strong> — All Premium features + featured on Home Page + extended description (200 characters)</li>
          </ul>
          Promotions are available in 1-month, 3-month, and 6-month durations with discounts for longer commitments.
        </>)
      }
    ]
  },
  {
    category: 'Mobile & Apps',
    icon: 'fa-mobile-screen',
    color: '#f59e0b',
    questions: [
      {
        question: 'Where can I find the mobile app?',
        answer: (<>We have native mobile apps available for both iOS and Android:
          <ul style={{ marginTop: '0.75rem', marginBottom: '0.5rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.25rem' }}><strong>iOS</strong> — <a href="https://apps.apple.com/us/app/lpc-app/id6503307483" target="_blank" rel="noopener noreferrer" style={linkStyle}>Download on the App Store</a></li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Android</strong> — <a href="https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp" target="_blank" rel="noopener noreferrer" style={linkStyle}>Get it on Google Play</a></li>
          </ul>
          You can also access our web application on any mobile browser - it&apos;s fully responsive and works great on all devices.
        </>)
      },
      {
        question: 'Is there an iOS or Android app?',
        answer: (<>Yes! We have native apps for both platforms. Download the <a href="https://apps.apple.com/us/app/lpc-app/id6503307483" target="_blank" rel="noopener noreferrer" style={linkStyle}>iOS app from the App Store</a> or the <a href="https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp" target="_blank" rel="noopener noreferrer" style={linkStyle}>Android app from Google Play</a>. The mobile apps include features like account upgrades and community promotions that are currently only available on mobile.</>)
      },
      {
        question: 'Why isn\'t the site working on my phone?',
        answer: 'Make sure you\'re using an updated browser (Chrome, Safari, Firefox, or Edge). Clear your browser cache if you\'re experiencing issues. If problems persist, try accessing the site in incognito/private browsing mode or contact support.'
      }
    ]
  },
  {
    category: 'Dashboards & Features',
    icon: 'fa-gauge-high',
    color: '#ec4899',
    questions: [
      {
        question: 'What dashboards are available?',
        answer: 'LPC offers four main dashboards: Civilian (for managing your characters, vehicles, and licenses), Police (for law enforcement activities), Dispatch (for managing calls and units), and EMS (for emergency medical services). Each community may have different dashboards enabled.'
      },
      {
        question: 'How do I switch between dashboards?',
        answer: 'Once you\'re in a community, use the navigation menu to switch between available dashboards. The dashboards available to you depend on your role within the community.'
      },
      {
        question: 'How do I create a civilian character?',
        answer: 'In the Civilian dashboard, click "Create Character" or the plus button. Fill in the character details including name, date of birth, and other information. Your character will be saved and available for role-play.'
      },
      {
        question: 'How do I register a vehicle?',
        answer: 'In the Civilian dashboard, select your character and navigate to Vehicles. Click "Register Vehicle" and enter the vehicle details including make, model, color, and license plate.'
      }
    ]
  },
  {
    category: 'Technical Issues',
    icon: 'fa-wrench',
    color: '#ef4444',
    questions: [
      {
        question: 'The site is loading slowly, what can I do?',
        answer: 'Try clearing your browser cache, disabling browser extensions, or using a different browser. If the issue persists, it may be a temporary server issue - wait a few minutes and try again.'
      },
      {
        question: 'I\'m getting an error message, what should I do?',
        answer: (<>Take a screenshot of the error message and try refreshing the page. If the error continues, <a href="https://github.com/Linesmerrill/police-cad/issues/new?assignees=&labels=&template=bug_report.md&title=" target="_blank" rel="noopener noreferrer" style={linkStyle}>report it on GitHub</a> or <a href="/contact-us" style={linkStyle}>contact us</a> through Discord. Include the error message, what you were trying to do, and your browser information.</>)
      },
      {
        question: 'My data isn\'t saving, what\'s wrong?',
        answer: (<>Ensure you have a stable internet connection. Try logging out and back in. If your data still isn&apos;t saving, clear your browser cache and cookies. <a href="/contact-us" style={linkStyle}>Contact support</a> if the issue persists.</>)
      },
      {
        question: 'How do I report a bug?',
        answer: (<>Visit our <a href="/contact-us" style={linkStyle}>Contact Us page</a> and click &quot;Report Bug&quot; to submit a bug report on GitHub. Include as much detail as possible: what you were doing, what you expected to happen, and what actually happened.</>)
      }
    ]
  },
  {
    category: 'Support & Contact',
    icon: 'fa-headset',
    color: '#6366f1',
    questions: [
      {
        question: 'How do I contact support?',
        answer: (<>The best way to reach us is through our <a href="https://discord.gg/3ECFhqe" target="_blank" rel="noopener noreferrer" style={linkStyle}>Discord server</a>. Open an Assistance Ticket and our team will respond as soon as possible. You can also submit feature requests or bug reports through our <a href="https://github.com/linesmerrill/police-cad" target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub page</a>.</>)
      },
      {
        question: 'How long does it take to get a response?',
        answer: 'We aim to respond to support tickets within 24-48 hours. Response times may vary depending on the complexity of your issue and current ticket volume.'
      },
      {
        question: 'Can I request new features?',
        answer: (<>Absolutely! We love hearing from our users. Visit our <a href="/contact-us" style={linkStyle}>Contact Us page</a> and click &quot;Request Feature&quot; to submit your idea on GitHub. We review all feature requests and implement popular ones.</>)
      },
      {
        question: 'How can I contribute to Lines Police CAD?',
        answer: (<>There are several ways to contribute: use the service and provide feedback, contribute code on our <a href="https://github.com/linesmerrill/police-cad" target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub repository</a>, support us on <a href="https://www.patreon.com/linespolicecad" target="_blank" rel="noopener noreferrer" style={linkStyle}>Patreon</a>, or help other users in our <a href="https://discord.gg/3ECFhqe" target="_blank" rel="noopener noreferrer" style={linkStyle}>Discord community</a>.</>)
      }
    ]
  },
  {
    category: 'Content Creator Program',
    icon: 'fa-video',
    color: '#fbbf24',
    questions: [
      {
        question: 'What is the Content Creator Program?',
        answer: (<>The Content Creator Program is designed for streamers, YouTubers, and content creators who feature Lines Police CAD in their content. Accepted creators receive exclusive benefits including a free Base Plan subscription and a featured profile on our <a href="/content-creators" style={linkStyle}>Content Creators directory</a>.</>)
      },
      {
        question: 'What are the benefits of joining the Content Creator Program?',
        answer: (<>As a content creator, you&apos;ll receive:
          <ul style={{ marginTop: '0.75rem', marginBottom: '0.5rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.25rem' }}><strong>Free Base Plan</strong> — A personal Base Plan subscription for your account</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Community Base Plan</strong> — Apply a free Base Plan to one of your communities</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Featured Profile</strong> — Your own profile page in our Content Creators directory</li>
            <li style={{ marginBottom: '0.25rem' }}><strong>Prestige</strong> — Recognition in our community and Discord</li>
          </ul>
        </>)
      },
      {
        question: 'How do I apply to the Content Creator Program?',
        answer: (<>Visit our <a href="/content-creators/apply" style={linkStyle}>Content Creator Application page</a> and fill out the application form. You&apos;ll need to provide information about your content platforms, follower counts, and a description of your content. Applications are reviewed by our team and you&apos;ll receive an email notification about the decision.</>)
      },
      {
        question: 'What are the requirements to join?',
        answer: 'We look for creators who actively produce content featuring Lines Police CAD. While there\'s no strict minimum follower count, we consider the quality and consistency of your content, your engagement with the community, and your platform presence when reviewing applications.'
      },
      {
        question: 'How long does it take to get approved?',
        answer: 'Applications typically require two admin approvals and are usually reviewed within a few days. You\'ll receive an email notification once a decision has been made on your application.'
      },
      {
        question: 'Can I apply the community benefit to any community?',
        answer: 'You can apply your free community Base Plan to any community that you own. Note that this is a one-time choice and cannot be changed later, so choose carefully! Communities with existing paid subscriptions are not eligible for this benefit.'
      },
      {
        question: 'Where can I see all the content creators?',
        answer: (<>Visit our <a href="/content-creators" style={linkStyle}>Content Creators directory</a> to browse all approved content creators in the program. Each creator has their own profile page showcasing their platforms and content.</>)
      }
    ]
  }
];

// FAQ Item Component
const FAQItem = ({ question, answer, isOpen, onToggle, slug }: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  slug: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/faq#${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={slug}
      style={{
        backgroundColor: 'rgba(15, 15, 20, 0.6)',
        border: `1px solid ${isOpen ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.2)'}`,
        borderRadius: '0.75rem',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginBottom: '0.75rem',
        scrollMarginTop: '100px'
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: isOpen ? '#fbbf24' : 'rgba(255, 255, 255, 0.9)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          paddingRight: '1rem',
          transition: 'color 0.3s',
          flex: 1
        }}>
          {question}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span
            onClick={handleCopyLink}
            title="Copy link to this question"
            style={{
              padding: '0.25rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              opacity: copied ? 1 : 0.5,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!copied) e.currentTarget.style.opacity = '0.5'; }}
          >
            <LinkIcon style={{ width: '16px', height: '16px', color: copied ? '#10b981' : 'rgba(255, 255, 255, 0.5)' }} />
          </span>
          {isOpen ? (
            <ChevronUpIcon style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
          ) : (
            <ChevronDownIcon style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.5)' }} />
          )}
        </div>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 1.25rem 1.25rem 1.25rem',
          borderTop: '1px solid rgba(59, 130, 246, 0.1)'
        }}>
          <p style={{
            fontSize: '0.9375rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.7',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            margin: '1rem 0 0 0'
          }}>
            {answer}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper to extract text from React nodes for searching
const getTextFromNode = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getTextFromNode).join('');
  if (typeof node === 'object' && 'props' in node) {
    return getTextFromNode((node as React.ReactElement).props.children);
  }
  return '';
};

// Category Section Component
const CategorySection = ({ category, icon, color, questions, searchQuery, openItems, onToggle }: {
  category: string;
  icon: string;
  color: string;
  questions: { question: string; answer: React.ReactNode }[];
  searchQuery: string;
  openItems: Set<string>;
  onToggle: (key: string) => void;
}) => {
  const filteredQuestions = questions.filter(q => {
    const answerText = getTextFromNode(q.answer);
    return q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      answerText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredQuestions.length === 0) return null;

  return (
    <div style={{ marginBottom: '3rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '0.75rem',
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 0 15px ${color}40`
        }}>
          <i className={`fa ${icon}`} style={{ color: '#ffffff', fontSize: '1rem' }}></i>
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#fbbf24',
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {category}
        </h2>
      </div>
      <div>
        {filteredQuestions.map((q) => {
          const slug = generateSlug(q.question);
          return (
            <FAQItem
              key={slug}
              question={q.question}
              answer={q.answer}
              isOpen={openItems.has(slug)}
              onToggle={() => onToggle(slug)}
              slug={slug}
            />
          );
        })}
      </div>
    </div>
  );
};

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Handle hash in URL on page load - auto-scroll and open the item
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (hash) {
      // Open the item
      setOpenItems(new Set([hash]));
      // Scroll to the element after a brief delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const handleToggle = (key: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allSlugs = new Set<string>();
    faqData.forEach(category => {
      category.questions.forEach((q) => {
        allSlugs.add(generateSlug(q.question));
      });
    });
    setOpenItems(allSlugs);
  };

  const collapseAll = () => {
    setOpenItems(new Set());
  };

  // Count total matching questions
  const matchingCount = useMemo(() => {
    if (!searchQuery) return null;
    let count = 0;
    faqData.forEach(category => {
      category.questions.forEach(q => {
        const answerText = getTextFromNode(q.answer);
        if (q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            answerText.toLowerCase().includes(searchQuery.toLowerCase())) {
          count++;
        }
      });
    });
    return count;
  }, [searchQuery]);

  // Check if any results exist
  const hasResults = useMemo(() => {
    if (!searchQuery) return true;
    return faqData.some(category =>
      category.questions.some(q => {
        const answerText = getTextFromNode(q.answer);
        return q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          answerText.toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [searchQuery]);

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/static/static/images/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />

      {/* Dark Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.85) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.85) 100%)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />

        <div style={{
          paddingTop: '2rem',
          paddingBottom: '4rem',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <div style={{
            maxWidth: 'min(100%, 56rem)',
            margin: '0 auto',
            padding: '0 clamp(1rem, 4vw, 1.5rem)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '3rem',
              paddingTop: '2rem'
            }}>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                fontWeight: '700',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                position: 'relative',
                display: 'inline-block'
              }}>
                {/* Glow behind text */}
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  color: '#fbbf24',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)',
                  filter: 'blur(2px)',
                  zIndex: 0
                }}>
                  FAQ
                </span>
                {/* Shimmer text */}
                <span style={{
                  position: 'relative',
                  zIndex: 1,
                  background: 'linear-gradient(90deg, #fbbf24 0%, #ffffff 30%, #ffffff 70%, #fbbf24 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 12s linear infinite',
                  display: 'inline-block'
                }}>
                  FAQ
                </span>
              </h1>
              <p style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '600px',
                margin: '0 auto',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: '1.6'
              }}>
                Frequently Asked Questions - Find answers to common questions about Lines Police CAD
              </p>
            </div>

            {/* Search Bar */}
            <div style={{
              marginBottom: '2rem'
            }}>
              <div style={{
                position: 'relative',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                <MagnifyingGlassIcon style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.4)'
                }} />
                <input
                  type="text"
                  placeholder="Search for questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 3rem',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(15, 15, 20, 0.8)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    outline: 'none',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {searchQuery && (
                <p style={{
                  textAlign: 'center',
                  marginTop: '0.75rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  {matchingCount === 0
                    ? 'No results found'
                    : `Found ${matchingCount} result${matchingCount === 1 ? '' : 's'}`
                  }
                </p>
              )}
            </div>

            {/* Expand/Collapse Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <button
                onClick={expandAll}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '0.5rem',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                }}
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                Collapse All
              </button>
            </div>

            {/* FAQ Categories */}
            {hasResults ? (
              faqData.map((category) => (
                <CategorySection
                  key={category.category}
                  category={category.category}
                  icon={category.icon}
                  color={category.color}
                  questions={category.questions}
                  searchQuery={searchQuery}
                  openItems={openItems}
                  onToggle={handleToggle}
                />
              ))
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'rgba(15, 15, 20, 0.6)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '1rem'
              }}>
                <i className="fa fa-search" style={{
                  fontSize: '3rem',
                  color: 'rgba(255, 255, 255, 0.3)',
                  marginBottom: '1rem',
                  display: 'block'
                }}></i>
                <h3 style={{
                  fontSize: '1.25rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '0.5rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  No matching questions found
                </h3>
                <p style={{
                  fontSize: '0.9375rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Try different keywords or browse the categories below
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '0.5rem',
                    color: '#fbbf24',
                    cursor: 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontWeight: '500'
                  }}
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Still Need Help Section */}
            <div style={{
              marginTop: '4rem',
              backgroundColor: 'rgba(15, 15, 20, 0.6)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fbbf24',
                marginBottom: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Still have questions?
              </h3>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Can&apos;t find what you&apos;re looking for? Our support team is here to help!
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <Link
                  href="/contact-us"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '0.5rem',
                    color: '#fbbf24',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    transition: 'all 0.2s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fa fa-envelope"></i>
                  Contact Us
                </Link>
                <a
                  href="https://discord.gg/3ECFhqe"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'rgba(88, 101, 242, 0.2)',
                    border: '1px solid rgba(88, 101, 242, 0.4)',
                    borderRadius: '0.5rem',
                    color: '#5865F2',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    transition: 'all 0.2s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fab fa-discord"></i>
                  Join Discord
                </a>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
