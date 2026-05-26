const { useState, useEffect, useRef, useCallback } = React;

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function encodeCommunityId(communityId) {
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Turn raw text into a mix of strings and clickable <a> tags. Catches
// http(s) URLs, discord.gg invites, and bare www.* hosts. Trailing
// sentence punctuation gets stripped from the href and link text so
// "join https://discord.gg/abc." doesn't render the period as part of
// the link. URLs without a protocol get prefixed with https:// for the
// href; the visible text stays as the user wrote it.
function linkifyText(text) {
  if (!text || typeof text !== "string") return text;
  const urlRegex = /(https?:\/\/\S+|discord\.gg\/\S+|www\.\S+)/gi;
  const result = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    let url = match[0];
    const trailing = url.match(/[.,;:!?)\]}>]+$/);
    let trail = "";
    if (trailing) {
      trail = trailing[0];
      url = url.slice(0, -trail.length);
    }
    const href = /^https?:\/\//i.test(url) ? url : "https://" + url;
    result.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors hover:text-amber-300"
        style={{ color: "#fbbf24" }}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    if (trail) result.push(trail);
    lastIndex = match.index + url.length + trail.length;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-3`} style={{ borderColor: 'rgba(255, 255, 255, 0.1)', borderTopColor: '#fbbf24' }}></div>
      {text && <p className="text-slate-400 mt-4 text-sm font-medium">{text}</p>}
    </div>
  );
};

const CommunityCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden animate-pulse" style={{
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  }}>
    <div className="aspect-[4/3]" style={{ background: 'rgba(255, 255, 255, 0.03)' }}></div>
    <div className="p-4">
      <div className="h-5 rounded-lg mb-3 w-3/4" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 rounded-full w-14" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        <div className="h-5 rounded-full w-16" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
      </div>
      <div className="h-4 rounded mb-2" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div className="h-4 rounded w-2/3 mb-4" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div className="h-11 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
    </div>
  </div>
);

const CarouselSkeleton = () => (
  <div className="w-full px-4 py-8">
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl p-6 animate-pulse" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(251, 191, 36, 0.2)'
      }}>
        <div className="aspect-square rounded-2xl mb-4" style={{ background: 'rgba(255, 255, 255, 0.03)' }}></div>
        <div className="h-6 rounded-lg mb-3 mx-auto w-2/3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        <div className="flex justify-center gap-2 mb-3">
          <div className="h-5 rounded-full w-14" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
          <div className="h-5 rounded-full w-16" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        </div>
        <div className="h-4 rounded mb-2" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        <div className="h-4 rounded w-3/4 mx-auto mb-4" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        <div className="h-12 rounded-lg w-40 mx-auto" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
      </div>
    </div>
  </div>
);

// ============================================================================
// UI COMPONENTS
// ============================================================================

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-slate-700/50 text-slate-300 border border-slate-600/30",
    elite: "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 font-bold shadow-lg shadow-amber-500/30",
    premium: "bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold shadow-lg shadow-violet-500/30",
    standard: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/30",
    basic: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30",
    active: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    tag: "bg-blue-500/10 text-blue-400 border border-blue-500/30"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const variants = {
    primary: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30 font-bold",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-blue-500/30 hover:border-blue-400/50",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300",
    purple: "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-lg shadow-indigo-500/30"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Toast = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-cyan-600 border-cyan-500'
  };

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle'
  };

  return (
    <div className="fixed right-4 z-[9999] animate-slide-in" style={{ top: '80px' }}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-white ${styles[type] || styles.info}`}>
        <i className={`fa ${icons[type] || icons.info}`}></i>
        <p className="font-medium text-sm">{message}</p>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
          <i className="fa fa-times"></i>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMMUNITY CARD COMPONENT
// ============================================================================

const CommunityCard = ({ community, isActive, actionText = "View", onAction }) => {
  const getSubscriptionBadge = () => {
    const plan = community?.subscription?.plan;
    const isActive = community?.subscription?.active;

    if (!isActive && !community?.promotionalText) return null;

    if (plan === "elite" || community?.promotionalText) {
      return <Badge variant="elite"><i className="fa fa-crown mr-1"></i>ELITE</Badge>;
    } else if (plan === "premium") {
      return <Badge variant="premium"><i className="fa fa-star mr-1"></i>PREMIUM</Badge>;
    } else if (plan === "standard") {
      return <Badge variant="standard"><i className="fa fa-check-circle mr-1"></i>STANDARD</Badge>;
    } else if (plan === "basic") {
      return <Badge variant="basic"><i className="fa fa-user mr-1"></i>BASIC</Badge>;
    }
    return null;
  };

  return (
    <div className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col h-full" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)' }}>
        <img
          src={community?.imageLink || "/static/images/default-logo.png"}
          alt={community?.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.target.src = "/static/images/default-logo.png"; }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10, 10, 15, 0.9) 0%, transparent 50%)' }}></div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {getSubscriptionBadge()}
        </div>

        {isActive && (
          <div className="absolute top-3 right-3">
            <Badge variant="active"><i className="fa fa-circle mr-1 text-[8px]"></i>Active</Badge>
          </div>
        )}

        {/* Member Count */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <i className="fa fa-users"></i>
            <span>{community?.membersCount || 0} members</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-base font-bold text-white mb-2 line-clamp-2 leading-tight" style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.1)' }}>
          {community?.name}
        </h3>

        {/* Tags */}
        {community?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {community.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="tag">{tag}</Badge>
            ))}
            {community.tags.length > 2 && (
              <Badge variant="default">+{community.tags.length - 2}</Badge>
            )}
          </div>
        )}

        {/* Promotional Text */}
        {community?.promotionalText && (
          <p className="text-xs font-medium mb-2 flex items-start gap-1.5" style={{ color: '#fbbf24' }}>
            <i className="fa fa-star mt-0.5 flex-shrink-0" style={{ color: '#fbbf24' }}></i>
            <span className="line-clamp-1">{community.promotionalText}</span>
          </p>
        )}

        {/* Description */}
        {community?.promotionalDescription && (
          <p className="text-slate-400 text-xs line-clamp-2 mb-4 flex-grow">
            {community.promotionalDescription}
          </p>
        )}

        {/* Action Button */}
        <Button
          onClick={() => onAction(community)}
          className="w-full mt-auto"
          size="md"
        >
          <span>{actionText || "View"}</span>
          <i className="fa fa-arrow-right ml-2 text-xs"></i>
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// ELITE CAROUSEL COMPONENT
// ============================================================================

const EliteCarousel = ({ communities, totalCount, isLoading }) => {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    if (!isLoading && communities.length > 1) {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % communities.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [communities, isLoading, timerKey]);

  const goToSlide = (index) => {
    setCurrent(index);
    setTimerKey((prev) => prev + 1); // Reset the timer
  };

  const goNext = () => goToSlide((current + 1) % communities.length);
  const goPrev = () => goToSlide((current - 1 + communities.length) % communities.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 50) {
      if (distance > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (isLoading) return <CarouselSkeleton />;
  if (!communities.length) return null;

  const community = communities[current];

  return (
    <section className="py-8 px-4 relative">
      {/* Background glow effect */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Section Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3" style={{
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)'
        }}>
          <i className="fa fa-crown" style={{ color: '#fbbf24' }}></i>
          <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>Elite Communities</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>Featured Communities</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">Discover the most active and prestigious communities on our platform</p>
      </div>

      {/* Carousel Card */}
      <div
        className="max-w-sm md:max-w-3xl lg:max-w-4xl mx-auto relative z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative rounded-3xl p-5 md:p-7 shadow-2xl" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(251, 191, 36, 0.1)'
        }}>
          {/* Elite Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge variant="elite" className="px-4 py-1.5 shadow-lg">
              <i className="fa fa-crown mr-1.5"></i>ELITE
            </Badge>
          </div>

          {/* Layout: stack on mobile, image-left + content-right on desktop */}
          <div className="flex flex-col md:flex-row md:items-stretch md:gap-7">

            {/* Image — fixed square, same physical size mobile & desktop */}
            <div className="relative aspect-square rounded-2xl overflow-hidden mt-2 mb-4 md:mb-0 md:mt-0 md:flex-shrink-0 md:w-80 lg:w-[22rem]" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)' }}>
              <img
                src={community.imageLink || "/static/images/default-logo.png"}
                alt={community.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = "/static/images/default-logo.png"; }}
              />
              {/* Purple breathing glow behind image */}
              <div style={{
                position: 'absolute',
                inset: '-20%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                filter: 'blur(30px)',
                animation: 'breathe 5s ease-in-out infinite',
                zIndex: -1,
                pointerEvents: 'none'
              }} />
            </div>

            {/* Content column.
                - Mobile: stacks naturally; everything is center-aligned.
                - Desktop: vertically centered inside the image-height column so
                  short cards (no description) don't leave a giant void.
                - text-align is set explicitly on each text element rather than
                  inherited, because line-clamp's display:-webkit-box breaks
                  text-align inheritance.
                - The platform tag is merged with the member count + status into
                  a single metadata strip under the title, so the bottom of the
                  card isn't a lonely stats row separated from the CTA. */}
            <div className="md:flex-1 md:min-w-0 flex flex-col md:justify-center md:py-2">
              <h3
                className="font-bold text-white text-xl md:text-3xl text-center md:text-left line-clamp-2 mb-2 md:mb-3"
                style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.2)' }}
              >
                {community.name}
              </h3>

              {/* Metadata strip: platform · members · status */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 justify-center md:justify-start mb-3 md:mb-4 text-xs md:text-sm">
                {community.tags?.length > 0 && community.tags.map((tag) => (
                  <Badge key={tag} variant="tag">{tag}</Badge>
                ))}
                {community.tags?.length > 0 && (
                  <span className="text-slate-600 hidden md:inline">·</span>
                )}
                <span className="flex items-center gap-1.5 text-slate-400">
                  <i className="fa fa-users"></i>
                  <span>{community.membersCount || 0} members</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <i className="fa fa-circle text-[6px]"></i>
                  <span>Active</span>
                </span>
              </div>

              {/* Promotional one-liner */}
              {community.promotionalText && (
                <p
                  className="text-sm md:text-base font-medium flex items-start gap-1.5 line-clamp-1 justify-center md:justify-start mb-2 md:mb-3"
                  style={{ color: '#fbbf24' }}
                >
                  <i className="fa fa-star mt-0.5 md:mt-1 flex-shrink-0" style={{ color: '#fbbf24' }}></i>
                  <span className="line-clamp-1">{community.promotionalText}</span>
                </p>
              )}

              {/* Description — left-aligned on desktop for readability; URLs
                  and discord.gg invites become real clickable links. */}
              {community.promotionalDescription && (
                <p className="text-slate-400 text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-3 text-center md:text-left mb-4 md:mb-5">
                  {linkifyText(community.promotionalDescription)}
                </p>
              )}

              {/* CTA */}
              <Button
                onClick={() => window.location.href = `/community/${encodeCommunityId(community._id)}`}
                size="lg"
                className="w-full md:w-auto md:self-start md:px-8"
              >
                <span>Explore Community</span>
                <i className="fa fa-arrow-right ml-2"></i>
              </Button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {communities.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 md:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white rounded-full transition-all duration-300 hover:bg-white/20"
                style={{ background: 'rgba(15, 15, 25, 0.7)', border: '1px solid rgba(251, 191, 36, 0.3)', backdropFilter: 'blur(8px)' }}
                aria-label="Previous"
              >
                <i className="fa fa-chevron-left"></i>
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 md:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white rounded-full transition-all duration-300 hover:bg-white/20"
                style={{ background: 'rgba(15, 15, 25, 0.7)', border: '1px solid rgba(251, 191, 36, 0.3)', backdropFilter: 'blur(8px)' }}
                aria-label="Next"
              >
                <i className="fa fa-chevron-right"></i>
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {communities.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {communities.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300`}
                style={{
                  width: idx === current ? '24px' : '8px',
                  background: idx === current ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 max-w-md md:max-w-3xl lg:max-w-4xl mx-auto relative z-10">
        <div className="rounded-xl p-3 text-center" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="text-lg font-bold text-white">{totalCount || 0}</div>
          <div className="text-xs text-slate-400">Elite</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="text-lg font-bold" style={{ color: '#fbbf24' }}>Premium</div>
          <div className="text-xs text-slate-400">Featured</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="text-lg font-bold text-emerald-400">Verified</div>
          <div className="text-xs text-slate-400">Quality</div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// COMMUNITY SECTION COMPONENT
// ============================================================================

const CommunitySection = ({
  title,
  icon,
  communities,
  actionText,
  onAction,
  onPrevPage,
  onNextPage,
  currentPage,
  totalCount,
  isLoading,
  emptyMessage,
  emptyIcon,
  showLoginPrompt
}) => {
  const itemsPerPage = 6;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (showLoginPrompt) {
    return (
      <section className="py-6 px-4">
        <div className="text-center">
          {icon && <div className="inline-flex items-center gap-2 mb-2" style={{ color: '#fbbf24' }}><i className={icon}></i><span className="font-semibold">{title}</span></div>}
        </div>
        <div className="rounded-2xl p-8 text-center max-w-md mx-auto" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <i className={`${emptyIcon || 'fa fa-sign-in-alt'} text-2xl text-slate-500`}></i>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{emptyMessage || 'Sign in to see more'}</h3>
          <p className="text-slate-400 text-sm mb-4">Join communities and they'll appear here</p>
          <Button
            onClick={() => window.location.href = '/login-civ?redirect=/communities'}
            size="lg"
          >
            <i className="fa fa-sign-in-alt mr-2"></i>
            Sign In
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-4">
      {/* Section Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2" style={{ lineHeight: 1 }}>
            {icon && <i className={icon} style={{ color: '#fbbf24', fontSize: '1.125rem', display: 'flex', alignItems: 'center' }}></i>}
            <h2 className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.2)', margin: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>{title}</h2>
            {totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1
              }}>{totalCount}</span>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CommunityCardSkeleton key={i} />)}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <i className={`${emptyIcon || 'fa fa-users'} text-2xl text-slate-500`}></i>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Communities Found</h3>
          <p className="text-slate-400 text-sm">{emptyMessage || 'Start exploring communities or create your own!'}</p>
        </div>
      ) : (
        <>
          {/* Community Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <CommunityCard
                key={community._id}
                community={community}
                isActive={community.isActive}
                actionText={actionText}
                onAction={onAction || ((c) => window.location.href = `/community/${encodeCommunityId(c._id)}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={onPrevPage}
                disabled={currentPage <= 1}
              >
                <i className="fa fa-chevron-left mr-1"></i>Prev
              </Button>
              <span className="text-sm text-slate-400 px-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
              >
                Next<i className="fa fa-chevron-right ml-1"></i>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

// ============================================================================
// BROWSE COMMUNITIES WITH FILTERS
// ============================================================================

const BrowseCommunities = ({
  communities,
  totalCount,
  currentTag,
  setCurrentTag,
  onPrevPage,
  onNextPage,
  currentPage,
  fetchAllCommunitiesPage,
  isLoading
}) => {
  const tags = ["all", "PC", "Xbox", "PlayStation"];

  const handleTagChange = (tag) => {
    setCurrentTag(tag);
    fetchAllCommunitiesPage(tag, 0);
  };

  return (
    <section className="py-6 px-4">
      {/* Section Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4" style={{ lineHeight: 1 }}>
          <i className="fa fa-globe" style={{ color: '#fbbf24', fontSize: '1.125rem', display: 'flex', alignItems: 'center' }}></i>
          <h2 className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.2)', margin: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>Browse Communities</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
              style={currentTag === tag ? {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
              } : {
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              {tag === "all" ? "All" : tag}
            </button>
          ))}
        </div>
      </div>

      <CommunitySection
        communities={communities}
        actionText="View"
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        currentPage={currentPage + 1}
        totalCount={totalCount}
        isLoading={isLoading}
      />
    </section>
  );
};

// ============================================================================
// YOUR COMMUNITIES WITH FILTERS
// ============================================================================

const YourCommunities = ({
  communities,
  totalCount,
  currentFilter,
  onFilterChange,
  onPrevPage,
  onNextPage,
  currentPage,
  isLoading,
  showLoginPrompt,
  dbUser
}) => {
  const filters = [
    { id: "joined", label: "Joined", icon: "fa-check-circle" },
    { id: "pending", label: "Pending", icon: "fa-clock" },
    { id: "owned", label: "Owned", icon: "fa-crown" }
  ];

  const handleFilterChange = (filter) => {
    onFilterChange(filter, 1);
  };

  const getEmptyMessage = () => {
    switch (currentFilter) {
      case "pending": return "No pending join requests";
      case "owned": return "You haven't created any communities yet";
      default: return "You haven't joined any communities yet";
    }
  };

  const getEmptyIcon = () => {
    switch (currentFilter) {
      case "pending": return "fa fa-clock";
      case "owned": return "fa fa-crown";
      default: return "fa fa-users";
    }
  };

  const getActionText = () => {
    switch (currentFilter) {
      case "pending": return "View";
      case "owned": return "Manage";
      default: return "Jump In";
    }
  };

  if (showLoginPrompt) {
    return (
      <section className="py-6 px-4">
        <div className="flex items-center gap-2 mb-4" style={{ lineHeight: 1 }}>
          <i className="fa fa-users" style={{ color: '#fbbf24', fontSize: '1.125rem', display: 'flex', alignItems: 'center' }}></i>
          <h2 className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.2)', margin: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>Your Communities</h2>
        </div>
        <div className="rounded-2xl p-8 text-center max-w-md mx-auto" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <i className="fa fa-sign-in-alt text-2xl text-slate-500"></i>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Sign in to see your communities</h3>
          <p className="text-slate-400 text-sm mb-4">Join communities and they'll appear here</p>
          <Button
            onClick={() => window.location.href = '/login-civ?redirect=/communities'}
            size="lg"
          >
            <i className="fa fa-sign-in-alt mr-2"></i>
            Sign In
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-4">
      {/* Section Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4" style={{ lineHeight: 1 }}>
          <i className="fa fa-users" style={{ color: '#fbbf24', fontSize: '1.125rem', display: 'flex', alignItems: 'center' }}></i>
          <h2 className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.2)', margin: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>Your Communities</h2>
          {totalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1
            }}>{totalCount}</span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              style={currentFilter === filter.id ? {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
              } : {
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <i className={`fa ${filter.icon}`}></i>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <CommunitySection
        communities={communities}
        actionText={getActionText()}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        currentPage={currentPage}
        totalCount={totalCount}
        isLoading={isLoading}
        emptyMessage={getEmptyMessage()}
        emptyIcon={getEmptyIcon()}
      />
    </section>
  );
};

// ============================================================================
// SEARCH COMPONENTS
// ============================================================================

const CommunitySearchModal = ({ isOpen, onClose, initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsPerPage = 12;
  const inputRef = useRef();
  const debounceTimeout = useRef();

  const fetchSearchResults = async (searchQuery, page = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const escapedQuery = searchQuery.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const encodedQuery = encodeURIComponent(escapedQuery);
      const response = await fetch(
        `${API_URL}/api/v1/search/communities?q=${encodedQuery}&limit=${resultsPerPage}&page=${page}`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const communities = (data.data || []).map((item) => {
        if (!item?._id) return null;
        const c = item.community || item;
        const subscription = c.subscription || {};
        return {
          id: item._id,
          _id: item._id,
          name: c.name || 'Unnamed Community',
          image: c.imageLink || "/static/images/default-logo.png",
          description: c.promotionalText || c.promotionalDescription || "",
          isVerified: ["elite", "premium", "standard"].includes(subscription.plan) && subscription.active
        };
      }).filter(Boolean);

      setResults(communities);
      setTotalCount(data.totalCount || communities.length);
      setTotalPages(Math.ceil((data.totalCount || communities.length) / resultsPerPage));
      setCurrentPage(page);
      setHasSearched(true);
    } catch (error) {
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      if (value.trim()) fetchSearchResults(value.trim(), 1);
      else { setResults([]); setHasSearched(false); }
    }, 300);
  };

  const handleCommunityClick = (community) => {
    if (community?._id) {
      window.location.href = `/community/${encodeCommunityId(community._id)}`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (initialQuery) {
        setQuery(initialQuery);
        fetchSearchResults(initialQuery, 1);
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }

    const handleEscape = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="sticky top-0 p-4 safe-area-top" style={{
        background: 'rgba(10, 10, 15, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="fa fa-times text-xl"></i>
          </button>
          <h2 className="text-lg font-bold text-white">Search Communities</h2>
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-slate-500 focus:outline-none"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
            placeholder="Search for a community..."
            value={query}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && query.trim() && fetchSearchResults(query.trim(), 1)}
          />
          <i className="fa fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"></i>
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', borderTopColor: '#fbbf24' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 safe-area-bottom">
        {loading && !hasSearched ? (
          <LoadingSpinner text="Searching..." />
        ) : hasSearched && results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <i className="fa fa-search text-2xl text-slate-600"></i>
            </div>
            <p className="text-slate-400">No communities found</p>
            <p className="text-slate-600 text-sm mt-1">Try a different search term</p>
          </div>
        ) : hasSearched ? (
          <>
            <p className="text-slate-500 text-sm mb-4">
              Found {totalCount} {totalCount === 1 ? 'community' : 'communities'}
            </p>
            <div className="space-y-2">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleCommunityClick(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    onError={(e) => { e.target.src = "/static/images/default-logo.png"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{item.name}</span>
                      {item.isVerified && (
                        <i className="fa fa-check-circle flex-shrink-0" style={{ color: '#fbbf24' }}></i>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-slate-400 text-sm truncate">{item.description}</p>
                    )}
                  </div>
                  <i className="fa fa-chevron-right text-slate-600"></i>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchSearchResults(query, currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400 px-3">{currentPage} / {totalPages}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchSearchResults(query, currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <i className="fa fa-search text-2xl text-slate-600"></i>
            </div>
            <p className="text-slate-400">Enter a search term</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchBar = ({ onCreateCommunity }) => {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const debounceTimeout = useRef();
  const inputRef = useRef();

  const fetchCommunities = (query) => {
    if (!query) {
      setOptions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    const escapedQuery = query.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    fetch(`${API_URL}/api/v1/search/communities?q=${encodeURIComponent(escapedQuery)}&limit=5&page=1`)
      .then(res => res.json())
      .then(data => {
        const communities = (data.data || []).map(item => {
          const c = item.community || item;
          return {
            id: item._id,
            _id: item._id,
            name: c.name || 'Unnamed',
            image: c.imageLink || "/static/images/default-logo.png",
            description: c.promotionalText || c.promotionalDescription || "",
            isVerified: c.subscription?.active && ["elite", "premium", "standard"].includes(c.subscription?.plan)
          };
        }).filter(Boolean);
        setOptions(communities);
        setShowDropdown(true);
        setLoading(false);
      })
      .catch(() => {
        setOptions([]);
        setShowDropdown(true);
        setLoading(false);
      });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchCommunities(value), 300);
  };

  const handleSelection = (selected) => {
    setShowDropdown(false);
    setInputValue("");
    if (selected?._id) {
      window.location.href = `/community/${encodeCommunityId(selected._id)}`;
    }
  };

  const handleCreateCommunity = () => {
    if (!dbUser?._id) {
      window.location.href = '/login-civ?redirect=' + encodeURIComponent('/communities');
      return;
    }
    onCreateCommunity();
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <div className="sticky top-16 z-30 px-4 py-3 safe-area-top" style={{
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div className="flex gap-2" ref={inputRef}>
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-slate-500 focus:outline-none text-base transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              placeholder="Search communities..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && inputValue.trim() && setShowSearchModal(true)}
              onFocus={() => inputValue && setShowDropdown(true)}
            />
            <i className="fa fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"></i>
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-600 rounded-full animate-spin" style={{ borderTopColor: '#fbbf24' }}></div>
              </div>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-40" style={{
                background: 'rgba(15, 15, 20, 0.98)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                {loading ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
                ) : options.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No communities found</div>
                ) : (
                  <>
                    {options.map((item) => (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 p-3 transition-colors text-left"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => handleSelection(item)}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                          onError={(e) => { e.target.src = "/static/images/default-logo.png"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-white truncate">{item.name}</span>
                            {item.isVerified && <i className="fa fa-check-circle text-xs" style={{ color: '#fbbf24' }}></i>}
                          </div>
                          {item.description && (
                            <p className="text-slate-400 text-xs truncate">{item.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => { setShowSearchModal(true); setShowDropdown(false); }}
                      className="w-full p-3 text-center text-sm font-medium transition-colors"
                      style={{ color: '#fbbf24', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}
                    >
                      <i className="fa fa-search mr-2"></i>View all results
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Create Button */}
          <Button onClick={handleCreateCommunity} className="flex-shrink-0">
            <i className="fa fa-plus"></i>
            <span className="hidden sm:inline ml-2">Create</span>
          </Button>
        </div>
      </div>

      <CommunitySearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        initialQuery={inputValue}
      />
    </>
  );
};

// ============================================================================
// QUICK NAVIGATION
// ============================================================================

const QuickNav = () => {
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItems = [
    { id: 'elite-communities', icon: 'fa-crown', label: 'Elite', bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', textColor: '#000', shadow: 'rgba(251, 191, 36, 0.3)' },
    { id: 'your-communities', icon: 'fa-users', label: 'Yours', bg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', textColor: '#fff', shadow: 'rgba(59, 130, 246, 0.3)' },
    { id: 'discover-communities', icon: 'fa-compass', label: 'Discover', bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', textColor: '#fff', shadow: 'rgba(139, 92, 246, 0.3)' },
    { id: 'browse-communities', icon: 'fa-globe', label: 'Browse', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', textColor: '#fff', shadow: 'rgba(16, 185, 129, 0.3)' }
  ];

  return (
    <div className="px-4 py-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 min-w-max">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 active:scale-95"
            style={{
              background: item.bg,
              color: item.textColor,
              boxShadow: `0 4px 15px ${item.shadow}`
            }}
          >
            <i className={`fa ${item.icon}`}></i>
            <span>{item.label}</span>
          </button>
        ))}
        <a
          href="/invite-code"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
          }}
        >
          <i className="fa fa-ticket"></i>
          <span>Invite Code</span>
        </a>
        {navItems.slice(2).map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 active:scale-95"
            style={{
              background: item.bg,
              color: item.textColor,
              boxShadow: `0 4px 15px ${item.shadow}`
            }}
          >
            <i className={`fa ${item.icon}`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// WELCOME MODAL (First-time visitor onboarding)
// ============================================================================

const WELCOME_MODAL_STORAGE_KEY_PREFIX = 'lpc_welcome_modal_seen';
function getWelcomeModalStorageKey() {
  const userId = window.dbUser && window.dbUser._id;
  return userId ? `${WELCOME_MODAL_STORAGE_KEY_PREFIX}_${userId}` : WELCOME_MODAL_STORAGE_KEY_PREFIX;
}

const WelcomeModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Lines Police CAD!",
      subtitle: "The world's leading free-to-use service for role-play communities",
      icon: "fa-hand-wave",
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            Ready to dive into role-play? Here's how to get started:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
                <i className="fa fa-crown text-xs text-black"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Elite Communities</strong> - Check out our featured communities looking for new members</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                <i className="fa fa-compass text-xs text-white"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Discover</strong> - Browse trending communities and find your perfect match</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <i className="fa fa-gamepad text-xs text-white"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Filter by Platform</strong> - Find communities for Xbox, PlayStation, PC, and more</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "Join or Create",
      subtitle: "Multiple ways to get into the action",
      icon: "fa-rocket",
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                <i className="fa fa-ticket text-xs text-white"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Have an invite code?</strong> - Enter it to jump straight into a community</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                <i className="fa fa-search text-xs text-white"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Search by name</strong> - Find a specific community and request to join</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                <i className="fa fa-plus text-xs text-white"></i>
              </div>
              <span className="text-slate-300 text-sm"><strong className="text-white">Create your own</strong> - Start a community for FREE and invite your friends</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "Need Help?",
      subtitle: "We're here for you",
      icon: "fa-circle-question",
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            Have questions or need assistance? We've got you covered:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <a href="/faq" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <i className="fa fa-book text-xl text-blue-400"></i>
              <span className="text-white text-sm font-medium">FAQ</span>
              <span className="text-slate-500 text-xs text-center">Common questions</span>
            </a>
            <a href="/contact-us" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <i className="fa fa-envelope text-xl text-green-400"></i>
              <span className="text-white text-sm font-medium">Contact Us</span>
              <span className="text-slate-500 text-xs text-center">Get in touch</span>
            </a>
            <a href="https://discord.gg/3ECFhqe" target="_blank" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <i className="fab fa-discord text-xl text-indigo-400"></i>
              <span className="text-white text-sm font-medium">Discord</span>
              <span className="text-slate-500 text-xs text-center">Join our server</span>
            </a>
            <a href="/about-us" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <i className="fa fa-info-circle text-xl text-amber-400"></i>
              <span className="text-white text-sm font-medium">About</span>
              <span className="text-slate-500 text-xs text-center">Learn more</span>
            </a>
          </div>
        </div>
      )
    }
  ];

  const handleClose = () => {
    localStorage.setItem(getWelcomeModalStorageKey(), 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl relative"
        style={{
          background: 'rgba(15, 15, 20, 0.98)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%' }}
        >
          <i className="fa fa-times text-sm"></i>
        </button>

        {/* Header with Logo */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="relative inline-block mx-auto mb-4">
            {/* Glow effect behind logo */}
            <div style={{
              position: 'absolute',
              top: '-30%',
              left: '-30%',
              right: '-30%',
              bottom: '-30%',
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, rgba(245, 158, 11, 0.3) 40%, transparent 70%)',
              filter: 'blur(20px)',
              borderRadius: '50%'
            }} />
            <img
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
              alt="Lines Police CAD"
              style={{
                height: '60px',
                width: 'auto',
                position: 'relative',
                zIndex: 1
              }}
            />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{currentStepData.title}</h2>
          <p className="text-slate-400 text-sm">{currentStepData.subtitle}</p>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          {currentStepData.content}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: index === currentStep
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                  : 'rgba(255, 255, 255, 0.2)',
                transform: index === currentStep ? 'scale(1.2)' : 'scale(1)'
              }}
            />
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: 'white'
                }}
              >
                <i className="fa fa-arrow-left mr-2"></i>Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#000',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
              }}
            >
              {isLastStep ? "Let's Go!" : "Next"}
              {!isLastStep && <i className="fa fa-arrow-right ml-2"></i>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE COMMUNITY MODAL
// ============================================================================

const CreateCommunityModal = ({ isOpen, onClose, setToast, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "public",
    tags: [],
    imageLink: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ownedCount, setOwnedCount] = useState(0);
  const [userPlan, setUserPlan] = useState("free");

  const PLAN_LIMITS = { base: 5, premium: 10, premium_plus: Infinity };
  const getCommunityLimit = (plan) => PLAN_LIMITS[plan] ?? 1;

  useEffect(() => {
    if (isOpen && dbUser?._id) {
      fetch(`${API_URL}/api/v1/communities/${dbUser._id}`)
        .then(res => res.json())
        .then(data => {
          const newFormatCommunities = (data || []).filter(item => item.community?.visibility);
          setOwnedCount(newFormatCommunities.length);
          setUserPlan(dbUser?.user?.subscription?.plan || "free");
        })
        .catch(() => {
          setOwnedCount(0);
          setUserPlan("free");
        });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setFormData(prev => ({ ...prev, imageLink: 'uploading...' }));
        const imageUrl = await uploadToCloudinary(file, 'communities', `community_${Date.now()}`);
        setFormData(prev => ({ ...prev, imageLink: imageUrl }));
      } catch (error) {
        setFormData(prev => ({ ...prev, imageLink: '' }));
        setToast({ isVisible: true, message: 'Failed to upload image', type: 'error' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { setError("Name is required"); return; }
    if (!formData.description.trim()) { setError("Description is required"); return; }

    const limit = getCommunityLimit(userPlan);
    if (limit !== Infinity && ownedCount >= limit) {
      setError(`Upgrade to create more communities`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/community`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community: {
            ownerID: dbUser._id,
            name: formData.name.trim(),
            description: formData.description.trim(),
            imageLink: formData.imageLink || "/static/images/default-logo.png",
            visibility: formData.visibility,
            tags: formData.tags,
            promotionalText: "",
            promotionalDescription: ""
          }
        })
      });

      if (!response.ok) throw new Error("Failed");

      setToast({ message: `"${formData.name}" created!`, type: "success", isVisible: true });
      setFormData({ name: "", description: "", visibility: "public", tags: [], imageLink: "" });
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      setError("Failed to create community");
      setToast({ message: "Failed to create community", type: "error", isVisible: true });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const limit = getCommunityLimit(userPlan);
  const canCreate = ownedCount < limit;

  return (
    <div
      className="fixed top-16 left-0 right-0 bottom-0 z-50 flex flex-col"
      style={{ background: 'rgba(10, 10, 15, 0.98)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="flex-1 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-full flex items-start justify-center p-4 pt-4 pb-8">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{
            background: 'rgba(15, 15, 20, 0.98)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white">
                <i className="fa fa-arrow-left"></i>
              </button>
              <h2 className="text-lg font-bold text-white">Create Community</h2>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-5">
              {/* Banner Upload */}
              <div className="relative">
                <div className="aspect-[2/1] rounded-xl flex items-center justify-center overflow-hidden" style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '2px dashed rgba(59, 130, 246, 0.3)'
                }}>
                  {formData.imageLink && formData.imageLink !== 'uploading...' ? (
                    <img src={formData.imageLink} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-500">
                      <i className="fa fa-image text-3xl mb-2"></i>
                      <p className="text-sm">{formData.imageLink === 'uploading...' ? 'Uploading...' : 'Add Banner'}</p>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-3 right-3 w-10 h-10 text-slate-900 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all duration-300" style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                }}>
                  <i className="fa fa-camera"></i>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Community Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData(p => ({ ...p, name: e.target.value })); setError(""); }}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                  placeholder="Enter community name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => { setFormData(p => ({ ...p, description: e.target.value })); setError(""); }}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-slate-500 focus:outline-none resize-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                  rows="3"
                  placeholder="Describe your community"
                />
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Privacy</label>
                <div className="flex gap-2">
                  {["public", "private"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, visibility: v }))}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
                      style={formData.visibility === v ? {
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        color: '#000',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Platform Tags <span className="text-slate-500">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {["Xbox", "PlayStation", "PC"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag]
                      }))}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                      style={formData.tags.includes(tag) ? {
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        color: '#fff',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit Info */}
              <div className="rounded-xl p-4" style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p className="text-slate-300 text-sm">
                  <span className="font-bold text-white">{ownedCount}</span> of{" "}
                  <span className="font-bold text-white">{limit === Infinity ? "unlimited" : limit}</span> communities created
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl p-4" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Upgrade prompt */}
              {!canCreate && (
                <div className="rounded-xl p-4 text-center" style={{
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}>
                  <p style={{ color: '#fbbf24' }} className="text-sm mb-3">Upgrade to create more communities</p>
                  <div className="flex gap-2">
                    <a
                      href="https://apps.apple.com/us/app/lpc-app/id6503307483"
                      target="_blank"
                      className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <i className="fa-brands fa-apple mr-1"></i> App Store
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.linesmerrill.policecadapp"
                      target="_blank"
                      className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <i className="fa-brands fa-google-play mr-1"></i> Google Play
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canCreate}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <><i className="fa fa-spinner fa-spin mr-2"></i>Creating...</>
                ) : (
                  "Create Community"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

const Footer = () => (
  <footer className="mt-8" style={{
    background: '#0a0a0f',
    borderTop: '1px solid rgba(59, 130, 246, 0.2)'
  }}>
    <div className="px-4 py-8">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <img src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png" alt="Lines Police CAD" style={{ height: '36px', width: 'auto' }} />
        </div>
        <p className="text-slate-500 text-sm">World's Leading Free-to-use Role-play Facilitator</p>
      </div>

      {/* Social Links */}
      <div className="flex justify-center gap-4 mb-6">
        <a href="https://discord.gg/3ECFhqe" target="_blank" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <i className="fab fa-discord"></i>
        </a>
        <a href="https://x.com/LinesPoliceCAD" target="_blank" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <i className="fa-brands fa-x-twitter"></i>
        </a>
        <a href="https://www.facebook.com/linespoliceserver/" target="_blank" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <i className="fab fa-facebook"></i>
        </a>
        <a href="https://github.com/linesmerrill/police-cad" target="_blank" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <i className="fab fa-github"></i>
        </a>
      </div>

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
        <a href="/faq" className="text-slate-400 hover:text-white transition-colors" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>FAQ</a>
        <a href="/contact-us" className="text-slate-400 hover:text-white transition-colors" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Contact</a>
        <a href="/terms-and-conditions" className="text-slate-400 hover:text-white transition-colors" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Terms</a>
        <a href="/privacy-policy" className="text-slate-400 hover:text-white transition-colors" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Privacy</a>
        <a href="/about-us" className="text-slate-400 hover:text-white transition-colors" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>About</a>
      </div>

      {/* Copyright */}
      <div className="text-center text-slate-600 text-xs">
        &copy; 2020-2026 Lines Police CAD. All rights reserved.
      </div>

      {/* Build Version */}
      <div className="text-center text-slate-700 text-xs mt-2">
        <span
          id="footer-build-version"
          className="cursor-pointer hover:text-slate-500 transition-colors"
          title="Click to copy build version"
          onClick={(e) => {
            const el = e.target;
            const buildVersion = window.buildVersion || 'unknown';
            navigator.clipboard.writeText('Build: ' + buildVersion).then(() => {
              el.textContent = 'Copied!';
              setTimeout(() => { el.textContent = 'Build: ' + buildVersion; }, 1500);
            });
          }}
        >Build: {window.buildVersion || 'unknown'}</span>
      </div>
    </div>
  </footer>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App = () => {
  // State
  const [eliteCommunities, setEliteCommunities] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);

  const [elitePage, setElitePage] = useState(0);
  const [eliteTotalCount, setEliteTotalCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [recommendedTotalCount, setRecommendedTotalCount] = useState(0);
  const [allCommunitiesPage, setAllCommunitiesPage] = useState(0);
  const [allCommunitiesTotalCount, setAllCommunitiesTotalCount] = useState(0);
  const [currentTag, setCurrentTag] = useState("all");
  const [userFilter, setUserFilter] = useState("joined");

  const [isEliteLoading, setIsEliteLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [isAllCommunitiesLoading, setIsAllCommunitiesLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success", isVisible: false });

  // Check if first-time visitor for welcome modal
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(getWelcomeModalStorageKey());
    if (!hasSeenWelcome) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowWelcomeModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch Elite Communities
  useEffect(() => {
    axios.get(`${API_URL}/api/v2/communities/elite?limit=20&page=0`)
      .then(response => {
        const communities = response.data.data.map(item => ({
          _id: item._id,
          name: item.name,
          promotionalText: item.promotionalText,
          promotionalDescription: item.promotionalDescription,
          tags: item.tags || [],
          imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
          membersCount: item.membersCount
        })).sort((a, b) => a.name.localeCompare(b.name));
        setEliteCommunities(communities);
        setEliteTotalCount(response.data.totalCount || 0);
      })
      .catch(() => { setEliteCommunities([]); setEliteTotalCount(0); })
      .finally(() => setIsEliteLoading(false));
  }, []);

  // Fetch User Communities - initial load with "joined" filter
  useEffect(() => {
    if (!dbUser?._id) { setIsUserLoading(false); return; }
    const timer = setTimeout(() => {
      fetchUserPage("joined", 1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Recommended Communities
  useEffect(() => {
    if (!dbUser?._id) { setIsRecommendedLoading(false); return; }
    const timer = setTimeout(() => {
      axios.get(`${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=6&page=0`)
        .then(response => {
          const communities = response.data.data.map(item => ({
            _id: item._id,
            name: item.name,
            promotionalText: item.promotionalText,
            promotionalDescription: item.promotionalDescription,
            tags: item.tags || [],
            imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
            membersCount: item.membersCount,
            subscription: item.subscription
          }));
          setRecommendedCommunities(communities);
          setRecommendedTotalCount(response.data.totalCount || 0);
        })
        .catch(() => { setRecommendedCommunities([]); setRecommendedTotalCount(0); })
        .finally(() => setIsRecommendedLoading(false));
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Fetch All Communities
  useEffect(() => {
    const timer = setTimeout(() => {
      axios.get(`${API_URL}/api/v2/communities/tag/all?limit=6&page=0`)
        .then(response => {
          const communities = response.data.data.map(item => ({
            _id: item._id,
            name: item.name,
            promotionalText: item.promotionalText,
            promotionalDescription: item.promotionalDescription,
            tags: item.tags || [],
            imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
            membersCount: item.membersCount,
            subscription: item.subscription
          }));
          setAllCommunities(communities);
          setAllCommunitiesTotalCount(response.data.totalCount || 0);
        })
        .catch(() => { setAllCommunities([]); setAllCommunitiesTotalCount(0); })
        .finally(() => setIsAllCommunitiesLoading(false));
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  // Listen for modal event
  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener("open-create-community-modal", handler);
    return () => window.removeEventListener("open-create-community-modal", handler);
  }, []);

  // Pagination handlers
  const fetchUserPage = async (filter, page) => {
    setIsUserLoading(true);
    try {
      let response;
      if (filter === "owned") {
        // Fetch communities owned by the user
        // API returns raw array: [{ _id, community: { name, ownerID, imageLink, membersCount, subscription: { active } } }]
        response = await axios.get(`${API_URL}/api/v1/communities/${dbUser._id}?limit=6&page=${page}`);
        const rawData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        const communities = rawData.map(item => ({
          _id: item._id,
          name: item.community?.name || item.name,
          membersCount: item.community?.membersCount || item.membersCount || 0,
          isActive: item._id === dbUser.user.lastAccessedCommunity?.communityID,
          imageLink: (item.community?.imageLink || item.imageLink)?.includes("file:///") ? "/static/images/default-logo.png" : (item.community?.imageLink || item.imageLink || "/static/images/default-logo.png"),
          subscription: item.community?.subscription?.active || item.subscription,
          isOwned: true
        }));
        setUserCommunities(communities);
        setUserTotalCount(communities.length);
      } else {
        // Fetch joined or pending communities
        const statusFilter = filter === "pending" ? "pending" : "approved";
        response = await axios.get(`${API_URL}/api/v2/user/${dbUser._id}/communities?filter=status:${statusFilter}&limit=6&page=${page}`);
        const communities = (response.data.data || []).map(item => ({
          _id: item._id,
          name: item.name,
          membersCount: item.membersCount,
          isActive: item._id === dbUser.user.lastAccessedCommunity?.communityID,
          imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
          subscription: item.subscription,
          isPending: filter === "pending"
        }));
        setUserCommunities(communities);
        setUserTotalCount(response.data.totalCount || 0);
      }
      setUserPage(page);
      setUserFilter(filter);
    } catch (error) {
      setUserCommunities([]);
      setUserTotalCount(0);
    } finally {
      setIsUserLoading(false);
    }
  };

  const fetchRecommendedPage = async (page) => {
    setIsRecommendedLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v2/user/${dbUser._id}/prioritized-communities?limit=6&page=${page}`);
      const communities = response.data.data.map(item => ({
        _id: item._id,
        name: item.name,
        promotionalText: item.promotionalText,
        promotionalDescription: item.promotionalDescription,
        tags: item.tags || [],
        imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
        membersCount: item.membersCount,
        subscription: item.subscription
      }));
      setRecommendedCommunities(communities);
      setRecommendedPage(page);
    } catch (error) {
      setRecommendedCommunities([]);
    } finally {
      setIsRecommendedLoading(false);
    }
  };

  const fetchAllCommunitiesPage = async (tag, page) => {
    setIsAllCommunitiesLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v2/communities/tag/${tag}?limit=6&page=${page}`);
      const communities = response.data.data.map(item => ({
        _id: item._id,
        name: item.name,
        promotionalText: item.promotionalText,
        promotionalDescription: item.promotionalDescription,
        tags: item.tags || [],
        imageLink: item.imageLink?.includes("file:///") ? "/static/images/default-logo.png" : item.imageLink || "/static/images/default-logo.png",
        membersCount: item.membersCount,
        subscription: item.subscription
      }));
      setAllCommunities(communities);
      setAllCommunitiesTotalCount(response.data.totalCount || 0);
      setAllCommunitiesPage(page);
    } catch (error) {
      setAllCommunities([]);
    } finally {
      setIsAllCommunitiesLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ 
      background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
      minHeight: '100vh',
      minHeight: '-webkit-fill-available'
    }}>
      {/* Background particles */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)
        `,
        animation: 'pulse-bg 8s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Glowing grid overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Content */}
      <div className="relative z-10">
      {/* Modals */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        setToast={setToast}
        onSuccess={() => {
          // Refresh user communities list without full page reload
          // Switch to "owned" filter to show the newly created community
          if (dbUser?._id) {
            fetchUserPage("owned", 1);
          }
        }}
      />
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Search Bar */}
      <SearchBar onCreateCommunity={() => setShowCreateModal(true)} />

      {/* Quick Navigation */}
      <QuickNav />

      {/* Elite Communities */}
      <div id="elite-communities">
        <EliteCarousel
          communities={eliteCommunities}
          totalCount={eliteTotalCount}
          isLoading={isEliteLoading}
        />
      </div>

      {/* Divider */}
      <div className="px-4 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
      </div>

      {/* Your Communities */}
      <div id="your-communities">
        <YourCommunities
          communities={userCommunities}
          totalCount={userTotalCount}
          currentFilter={userFilter}
          onFilterChange={(filter, page) => fetchUserPage(filter, page)}
          onPrevPage={() => userPage > 1 && fetchUserPage(userFilter, userPage - 1)}
          onNextPage={() => userPage * 6 < userTotalCount && fetchUserPage(userFilter, userPage + 1)}
          currentPage={userPage}
          isLoading={isUserLoading}
          showLoginPrompt={!dbUser?._id}
          dbUser={dbUser}
        />
      </div>

      {/* Discover Communities */}
      <div id="discover-communities">
        <CommunitySection
          title="Discover"
          icon="fa fa-compass"
          communities={recommendedCommunities}
          actionText="Explore"
          onPrevPage={() => recommendedPage > 0 && fetchRecommendedPage(recommendedPage - 1)}
          onNextPage={() => (recommendedPage + 1) * 6 < recommendedTotalCount && fetchRecommendedPage(recommendedPage + 1)}
          currentPage={recommendedPage + 1}
          totalCount={recommendedTotalCount}
          isLoading={isRecommendedLoading}
          showLoginPrompt={!dbUser?._id}
          emptyMessage="Sign in for personalized recommendations"
          emptyIcon="fa fa-compass"
        />
      </div>

      {/* Browse Communities */}
      <div id="browse-communities">
        <BrowseCommunities
          communities={allCommunities}
          totalCount={allCommunitiesTotalCount}
          currentTag={currentTag}
          setCurrentTag={setCurrentTag}
          onPrevPage={() => allCommunitiesPage > 0 && fetchAllCommunitiesPage(currentTag, allCommunitiesPage - 1)}
          onNextPage={() => (allCommunitiesPage + 1) * 6 < allCommunitiesTotalCount && fetchAllCommunitiesPage(currentTag, allCommunitiesPage + 1)}
          currentPage={allCommunitiesPage}
          fetchAllCommunitiesPage={fetchAllCommunitiesPage}
          isLoading={isAllCommunitiesLoading}
        />
      </div>

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
