'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import GoogleAd from '@/components/GoogleAd';
import Script from 'next/script';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

interface Community {
  _id: string;
  name: string;
  imageLink?: string;
  promotionalText?: string;
  promotionalDescription?: string;
  description?: string;
  tags?: string[];
  membersCount?: number;
  subscription?: {
    plan?: string;
    active?: boolean;
  };
  isActive?: boolean;
}

interface User {
  id: string;
  username?: string;
  email?: string;
  lastAccessedCommunity?: {
    communityID?: string;
  };
  subscription?: {
    plan?: string;
    active?: boolean;
  };
}

function encodeCommunityId(communityId: string): string {
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Loading Spinner Component
const LoadingSpinner = ({ size = "md", text = "Loading..." }: { size?: string; text?: string }) => {
  const sizeClasses: Record<string, string> = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-700 border-t-blue-500`}></div>
      <p className="text-gray-400 mt-4 text-lg">{text}</p>
    </div>
  );
};

// Community Card Component
const CommunityCard = ({ 
  community, 
  isActive, 
  actionText, 
  onAction 
}: { 
  community: Community; 
  isActive?: boolean; 
  actionText: string; 
  onAction: (community: Community) => void;
}) => (
  <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 overflow-hidden flex flex-col h-full">
    {/* Image Container */}
    <div className="relative h-48 overflow-hidden">
      <img
        src={community?.imageLink || "/static/images/default-logo.png"}
        alt={community?.name}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>

      {/* Subscription Badge */}
      {(community?.subscription?.active === true && ["elite", "premium", "standard", "basic"].includes(community?.subscription?.plan || '')) || community?.promotionalText ? (
        <div className="absolute top-3 left-3">
          {(() => {
            const plan = community?.subscription?.plan;
            if (plan === "elite") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-crown mr-1"></i>
                  ELITE
                </span>
              );
            } else if (plan === "premium") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-star mr-1"></i>
                  PREMIUM
                </span>
              );
            } else if (plan === "standard") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-check-circle mr-1"></i>
                  STANDARD
                </span>
              );
            } else if (plan === "basic") {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-green-400 to-teal-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-user mr-1"></i>
                  BASIC
                </span>
              );
            } else if (community?.promotionalText) {
              return (
                <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  <i className="fa fa-crown mr-1"></i>
                  ELITE
                </span>
              );
            }
            return null;
          })()}
        </div>
      ) : null}

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
            <i className="fa fa-circle mr-1 text-xs"></i>
            Active
          </span>
        </div>
      )}

      {/* Member Count Badge */}
      <div className="absolute bottom-3 left-3">
        <div className="flex items-center bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <div className="flex items-center text-gray-400">
            <i className="fa fa-users mr-1"></i>
            <span className="text-sm">{community?.membersCount || 0} Members</span>
          </div>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="p-6 flex flex-col flex-grow">
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
          {community?.name}
        </h3>

        {/* Tags */}
        {community?.tags && community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {community.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
            {community.tags.length > 2 && (
              <span className="inline-block bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">
                +{community.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Promotional Text */}
        {community?.promotionalText && (
          <p className="text-blue-300 text-sm font-medium mb-2">
            <i className="fa fa-star mr-1 text-yellow-400"></i>
            {community.promotionalText}
          </p>
        )}

        {/* Description */}
        {community?.promotionalDescription && (
          <p className="text-gray-400 text-sm line-clamp-2">
            {community.promotionalDescription}
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onAction(community)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mt-4"
      >
        <i className="fa fa-arrow-right mr-2"></i>
        {actionText}
      </button>
    </div>
  </div>
);

// Sidebar Navigation Component (Desktop)
const SidebarNav = ({ 
  sections, 
  activeSection, 
  onSectionChange 
}: { 
  sections: Array<{ id: string; label: string; icon: string }>; 
  activeSection: string; 
  onSectionChange: (id: string) => void;
}) => {
  const socialLinks = [
    { name: 'Discord', href: 'https://discord.gg/UQw2TvcE', icon: 'fa-brands fa-discord' },
    { name: 'X (Twitter)', href: 'https://twitter.com/LinesPoliceCAD', icon: 'fa-brands fa-x-twitter' },
    { name: 'Patreon', href: 'https://www.patreon.com/linespolicecad', icon: 'fa-brands fa-patreon' },
    { name: 'GitHub', href: 'https://github.com/linesmerrill/police-cad', icon: 'fa-brands fa-github' },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-700 min-h-[calc(100vh-60px)] sticky top-[60px]">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <i className={`fa ${section.icon} text-lg`}></i>
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Social Media Icons at Bottom */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-center gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-all"
              aria-label={link.name}
            >
              <i className={`${link.icon} text-lg`}></i>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Horizontal Tabs Component (Mobile)
const HorizontalTabs = ({ 
  sections, 
  activeSection, 
  onSectionChange 
}: { 
  sections: Array<{ id: string; label: string; icon: string }>; 
  activeSection: string; 
  onSectionChange: (id: string) => void;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to active tab on mobile
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector(`[data-section-id="${activeSection}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);

  return (
    <div className="lg:hidden sticky top-[60px] z-30 bg-gray-900 border-b border-gray-700 shadow-lg">
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            data-section-id={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeSection === section.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <i className={`fa ${section.icon} text-sm`}></i>
            <span className="text-sm font-medium">{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Search Bar Component
const SearchBar = ({ onCreateCommunity, onSearch }: { onCreateCommunity: () => void; onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState<Community[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const escapedQuery = searchQuery.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const encodedQuery = encodeURIComponent(escapedQuery);
      const response = await fetch(
        `${API_URL}/api/v1/search/communities?q=${encodedQuery}&limit=10&page=1`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const communities = (data.data || []).map((item: any) => {
          if (!item || !item._id) return null;
          const c = item.community || item;
          return {
            id: item._id,
            _id: item._id,
            name: c.name || 'Unnamed Community',
            imageLink: c.imageLink && !c.imageLink.includes("file:///") && c.imageLink.trim() !== ''
              ? c.imageLink
              : "/static/images/default-logo.png",
            description: c.promotionalText || c.promotionalDescription || c.description || "",
            subscription: c.subscription || null,
            promotionalText: c.promotionalText || null,
            tags: c.tags || [],
          };
        }).filter(Boolean);
        setResults(communities);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/communities/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-3 sm:py-4 w-full">
      {/* Logo */}
      <Link href="/" className="flex-shrink-0 flex items-center gap-2">
        <img
          src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
          alt="Lines Police CAD"
          className="h-8 sm:h-10 w-auto"
        />
        <span className="text-white font-semibold text-base sm:text-lg hidden sm:block">
          Lines Police CAD
        </span>
      </Link>
      <div className="relative flex-1 min-w-0">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i className="fa fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
              placeholder="Search for communities..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Search Results Modal */}
        {showModal && (query || results.length > 0) && (
          <>
            <div className="absolute z-50 left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-400">
                  <i className="fa fa-spinner fa-spin mr-2"></i>
                  Searching...
                </div>
              ) : query.trim() ? (
                <div className="p-2">
                  {/* Header */}
                  <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                    Search results for &quot;{query}&quot;
                  </div>
                  
                  {/* Search page option */}
                  <Link
                    href={`/communities/search?q=${encodeURIComponent(query)}`}
                    onClick={() => setShowModal(false)}
                    className="block p-3 hover:bg-gray-700 rounded-lg transition-colors bg-gray-750"
                  >
                    <div className="flex items-center gap-3">
                      <i className="fa fa-search text-blue-400"></i>
                      <span className="text-white font-medium">Search &quot;{query}&quot;</span>
                    </div>
                  </Link>
                  
                  {/* Community results */}
                  {results.length > 0 && (
                    <>
                      {results.map((community) => {
                        // Determine badge type
                        const hasElite = (community.subscription?.active === true && community.subscription?.plan === 'elite') || community.promotionalText;
                        const hasPremium = community.subscription?.active === true && community.subscription?.plan === 'premium';
                        const hasStandard = community.subscription?.active === true && community.subscription?.plan === 'standard';
                        const hasBasic = community.subscription?.active === true && community.subscription?.plan === 'basic';
                        
                        return (
                          <Link
                            key={community._id}
                            href={`/community/${encodeCommunityId(community._id)}`}
                            onClick={() => setShowModal(false)}
                            className="block p-3 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {/* Community Image */}
                              <div className="flex-shrink-0 relative">
                                <img
                                  src={community.imageLink || "/static/images/default-logo.png"}
                                  alt={community.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                {/* Badge overlay */}
                                {(hasElite || hasPremium || hasStandard || hasBasic) && (
                                  <div className="absolute -top-1 -right-1">
                                    {hasElite && (
                                      <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg">
                                        <i className="fa fa-crown text-[10px]"></i>
                                      </span>
                                    )}
                                    {hasPremium && !hasElite && (
                                      <span className="inline-flex items-center bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg">
                                        <i className="fa fa-star text-[10px]"></i>
                                      </span>
                                    )}
                                    {hasStandard && !hasElite && !hasPremium && (
                                      <span className="inline-flex items-center bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg">
                                        <i className="fa fa-check-circle text-[10px]"></i>
                                      </span>
                                    )}
                                    {hasBasic && !hasElite && !hasPremium && !hasStandard && (
                                      <span className="inline-flex items-center bg-gradient-to-r from-green-400 to-teal-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg">
                                        <i className="fa fa-user text-[10px]"></i>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate">{community.name}</h4>
                                {community.description && (
                                  <p className="text-gray-400 text-sm line-clamp-1 truncate mt-1">{community.description}</p>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowModal(false)}
            ></div>
          </>
        )}
      </div>
      <button
        onClick={onCreateCommunity}
        className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
      >
        <i className="fa fa-plus mr-2"></i>
        Create
      </button>
    </div>
  );
};

// Pagination Controls Component
const PaginationControls = ({
  currentPage,
  totalCount,
  itemsPerPage,
  onPageChange,
  isLoading = false,
}: {
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNext = currentPage < totalPages - 1;
  const hasPrev = currentPage > 0;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev || isLoading}
        className={`px-4 py-2 rounded-lg transition-all ${
          !hasPrev || isLoading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        <i className="fa fa-chevron-left mr-2"></i>
        Previous
      </button>
      <span className="text-gray-400">
        Page {currentPage + 1} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext || isLoading}
        className={`px-4 py-2 rounded-lg transition-all ${
          !hasNext || isLoading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        Next
        <i className="fa fa-chevron-right ml-2"></i>
      </button>
    </div>
  );
};

// Filter Tabs Component (wiseoldman.net style)
const FilterTabs = ({
  filters,
  activeFilter,
  onFilterChange,
  countsLoaded = false,
}: {
  filters: Array<{ id: string; label: string; count?: number }>;
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  countsLoaded?: boolean;
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-t-lg transition-all font-medium ${
            activeFilter === filter.id
              ? 'bg-gray-800 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {filter.label}
          {countsLoaded && filter.count !== undefined && (
            <span className="ml-2 text-sm opacity-75">({filter.count})</span>
          )}
        </button>
      ))}
    </div>
  );
};

// Community Section Component
const CommunitySection = ({
  title,
  communities,
  actionText,
  onAction,
  isLoading = false,
  emptyMessage,
  emptyIcon,
  showPagination = false,
  paginationProps,
  filterTabs,
  emptyActions,
  userPlan,
  subscriptionActive,
  userSubscriptionChecked = false,
}: {
  title: string;
  communities: Community[];
  actionText: string;
  onAction: (community: Community) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  showPagination?: boolean;
  paginationProps?: {
    currentPage: number;
    totalCount: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  filterTabs?: React.ReactNode;
  emptyActions?: React.ReactNode;
  userPlan?: string;
  subscriptionActive?: boolean;
  userSubscriptionChecked?: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner text={`Loading ${title}...`} />
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="py-4 sm:py-8 w-full">
        {title && <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6">{title}</h2>}
        {filterTabs}
        <div className="py-12 text-center">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            {emptyIcon && <i className={`${emptyIcon} text-4xl text-gray-500 mb-4`}></i>}
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400">{emptyMessage || 'No communities found'}</p>
            {emptyActions}
          </div>
        </div>
      </div>
    );
  }

  // Helper function to generate random ad positions based on subscription tier
  const generateAdPositions = (totalCards: number, userPlan?: string, subscriptionActive?: boolean, sectionSeed: string = ''): Set<number> => {
    const positions = new Set<number>();
    
    // Premium Plus: No ads
    if (subscriptionActive && userPlan === 'premium_plus') {
      return positions;
    }
    
    // Premium: 50% fewer ads (every 6-10 cards instead of 3-5)
    const isPremium = subscriptionActive && userPlan === 'premium';
    const minCardsBetweenAds = isPremium ? 6 : 3;
    const maxCardsBetweenAds = isPremium ? 10 : 5;
    
    // Always place first ad after the first card (position 1) - unless Premium Plus
    if (totalCards >= 1) {
      positions.add(1);
    }
    
    // Then place ads every N cards after the first ad
    // Use a seeded random function based on section name to ensure different patterns per section
    let randomSeed = 0;
    for (let i = 0; i < sectionSeed.length; i++) {
      randomSeed += sectionSeed.charCodeAt(i);
    }
    randomSeed += totalCards; // Also include totalCards in seed
    
    let currentPosition = 1; // Start after first card
    let iteration = 0;
    while (currentPosition < totalCards - 2) {
      // Use a combination of Math.random() and the seed to ensure different patterns
      // but also ensure it's different per section
      const randomValue = Math.random() * (randomSeed + iteration + Date.now() % 1000);
      const cardsUntilAd = Math.floor((randomValue % (maxCardsBetweenAds - minCardsBetweenAds + 1)) + minCardsBetweenAds);
      currentPosition += cardsUntilAd;
      iteration++;
      
      if (currentPosition < totalCards) {
        positions.add(currentPosition);
      }
    }
    
    return positions;
  };

  // Helper function to insert ads between cards
  const renderCardsWithAds = (userPlan?: string, subscriptionActive?: boolean, sectionName?: string) => {
    const items: React.ReactNode[] = [];
    // Use section name + communities length as part of the seed to ensure different patterns per section
    const adPositions = generateAdPositions(communities.length, userPlan, subscriptionActive, sectionName || 'default');
    
    communities.forEach((community, index) => {
      // Always push the card first
      items.push(
        <CommunityCard
          key={community._id}
          community={community}
          isActive={community.isActive}
          actionText={actionText}
          onAction={onAction}
        />
      );
      
      // Insert ad AFTER the card if this position should have an ad
      // Position 1 means after the first card (index 0)
      if (adPositions.has(index + 1)) {
        items.push(
          <GoogleAd 
            key={`ad-${index}`}
            adSlot="1673838381" 
            className="my-4"
            matchCardHeight={true}
          />
        );
      }
    });
    return items;
  };

  return (
    <div className="py-4 sm:py-8 w-full">
      {title && <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6">{title}</h2>}
      {filterTabs}
      {/* Top Ad - Only show after checking subscription, and hide for Premium and Premium Plus */}
      {communities.length > 0 && userSubscriptionChecked && !(subscriptionActive && (userPlan === 'premium' || userPlan === 'premium_plus')) && (
        <div className="mb-6">
          <GoogleAd adSlot="1760139308" matchCardHeight={false} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start">
        {renderCardsWithAds(userPlan, subscriptionActive, title)}
      </div>
      {showPagination && paginationProps && (
        <PaginationControls
          currentPage={paginationProps.currentPage}
          totalCount={paginationProps.totalCount}
          itemsPerPage={paginationProps.itemsPerPage}
          onPageChange={paginationProps.onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

function CommunitiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userSubscriptionChecked, setUserSubscriptionChecked] = useState(false);
  
  // Cache for filter counts only (user communities no longer cached)
  const filterCountsCache = useRef<{ data: { approved: number; pending: number; owned: number }; timestamp: number } | null>(null);
  // Cache for elite, recommended, and browse (first page only)
  const eliteCache = useRef<{ data: Community[]; totalCount: number; timestamp: number } | null>(null);
  const recommendedCache = useRef<{ data: Community[]; totalCount: number; timestamp: number } | null>(null);
  const browseCache = useRef<Map<string, { data: Community[]; totalCount: number; timestamp: number }>>(new Map());
  
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for filter counts
  const STATIC_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for elite/recommended/browse (they change less)
  const fetchingRef = useRef<Set<string>>(new Set()); // Track ongoing fetches to prevent duplicates
  
  // Get initial section from query param or default to 'elite'
  const getInitialSection = () => {
    const pageParam = searchParams.get('page');
    const validSections = ['elite', 'your-communities', 'recommended', 'browse', 'join-code'];
    if (pageParam && validSections.includes(pageParam)) {
      return pageParam;
    }
    return 'elite';
  };
  
  const [activeSection, setActiveSection] = useState(getInitialSection);
  
  // Function to invalidate filter counts cache (call this after creating a community)
  const invalidateCommunitiesCache = () => {
    filterCountsCache.current = null;
    // Force filter counts to reload
    setUserFilterCountsLoaded(false);
  };
  
  // Function to invalidate all caches (including elite, recommended, browse)
  const invalidateAllCaches = () => {
    filterCountsCache.current = null;
    eliteCache.current = null;
    recommendedCache.current = null;
    browseCache.current.clear();
  };
  
  // Expose cache invalidation to window for external use (e.g., after creating community)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).invalidateCommunitiesCache = invalidateCommunitiesCache;
      (window as any).invalidateAllCaches = invalidateAllCaches;
    }
  }, []);
  
  // Refresh filter counts when page becomes visible (e.g., user returns from mobile app)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeSection === 'your-communities') {
        // Invalidate filter counts cache when page becomes visible to refresh counts
        // User communities are always fetched fresh, so no need to invalidate them
        invalidateCommunitiesCache();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSection]);
  
  // Helper function to get hash from URL
  const getHashFromUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.hash.slice(1); // Remove the #
    }
    return '';
  };
  
  // Helper function to set hash in URL
  const setHashInUrl = (hash: string) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`);
    }
  };
  
  // Map filter IDs to hash format
  const filterToHash: Record<string, string> = {
    'approved': 'approved',
    'pending': 'pending',
    'owned': 'owned-by-you',
    'all': 'all',
    'PC': 'pc',
    'Xbox': 'xbox',
    'PlayStation': 'playstation',
  };
  
  // Map hash format to filter IDs
  const hashToFilter: Record<string, string> = {
    'approved': 'approved',
    'pending': 'pending',
    'owned-by-you': 'owned',
    'all': 'all',
    'pc': 'PC',
    'xbox': 'Xbox',
    'playstation': 'PlayStation',
  };
  
  // Community data states
  const [eliteCommunities, setEliteCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  
  // Loading states - only set to true for the initial active section
  const [isEliteLoading, setIsEliteLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(false);
  const [isAllLoading, setIsAllLoading] = useState(false);
  
  // Pagination states
  const [elitePage, setElitePage] = useState(0);
  const [eliteTotalCount, setEliteTotalCount] = useState(0);
  const eliteItemsPerPage = 9;
  const [userPage, setUserPage] = useState(0);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const userItemsPerPage = 9;
  const [userFilter, setUserFilter] = useState<'approved' | 'pending' | 'owned'>('approved');
  const [userFilterCounts, setUserFilterCounts] = useState({
    approved: 0,
    pending: 0,
    owned: 0,
  });
  const [userFilterCountsLoaded, setUserFilterCountsLoaded] = useState(false);
  const [recommendedTotalCount, setRecommendedTotalCount] = useState(0);
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [allTotalCount, setAllTotalCount] = useState(0);
  const [allPage, setAllPage] = useState(0);
  const [currentTag, setCurrentTag] = useState("all");
  const [browseFilterCounts, setBrowseFilterCounts] = useState({
    all: 0,
    PC: 0,
    Xbox: 0,
    PlayStation: 0,
  });
  const [browseFilterCountsLoaded, setBrowseFilterCountsLoaded] = useState(false);
  
  // Join via code state
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const sections = [
    { id: 'elite', label: 'Elite', icon: 'fa-crown' },
    { id: 'your-communities', label: 'Your Communities', icon: 'fa-users' },
    { id: 'recommended', label: 'Recommended', icon: 'fa-compass' },
    { id: 'browse', label: 'Browse All', icon: 'fa-globe' },
    { id: 'join-code', label: 'Join via Code', icon: 'fa-key' },
  ];

  // Update URL when section changes
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    // Invalidate cache when switching to "Your Communities" to ensure fresh data
    if (sectionId === 'your-communities') {
      invalidateCommunitiesCache();
    }
    const newUrl = sectionId === 'elite' 
      ? '/communities' 
      : `/communities?page=${sectionId}`;
    router.replace(newUrl, { scroll: false });
  };

  // Check for success parameter and invalidate cache if present
  useEffect(() => {
    const successParam = searchParams.get('success');
    if (successParam && activeSection === 'your-communities') {
      // User just joined/created a community - invalidate cache to show fresh data
      invalidateCommunitiesCache();
      // Remove the success parameter from URL
      router.replace('/communities?page=your-communities', { scroll: false });
    }
  }, [searchParams, activeSection]);

  // Sync with URL query param on mount and when searchParams change
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const validSections = ['elite', 'your-communities', 'recommended', 'browse'];
    if (pageParam && validSections.includes(pageParam) && pageParam !== activeSection) {
      setActiveSection(pageParam);
    } else if (!pageParam && activeSection !== 'elite') {
      // If no param and not on elite, default to elite
      setActiveSection('elite');
    }
  }, [searchParams]);
  
  // Sync filter with hash on mount and when section/hash changes
  useEffect(() => {
    const hash = getHashFromUrl();
    if (hash && activeSection === 'your-communities') {
      const filterId = hashToFilter[hash];
      if (filterId && ['approved', 'pending', 'owned'].includes(filterId)) {
        setUserFilter(filterId as 'approved' | 'pending' | 'owned');
      }
    } else if (hash && activeSection === 'browse') {
      const filterId = hashToFilter[hash];
      if (filterId && ['all', 'PC', 'Xbox', 'PlayStation'].includes(filterId)) {
        setCurrentTag(filterId);
      }
    }
  }, [activeSection]);
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = getHashFromUrl();
      if (hash && activeSection === 'your-communities') {
        const filterId = hashToFilter[hash];
        if (filterId && ['approved', 'pending', 'owned'].includes(filterId)) {
          setUserFilter(filterId as 'approved' | 'pending' | 'owned');
        }
      } else if (hash && activeSection === 'browse') {
        const filterId = hashToFilter[hash];
        if (filterId && ['all', 'PC', 'Xbox', 'PlayStation'].includes(filterId)) {
          setCurrentTag(filterId);
        }
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeSection]);

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      setUserSubscriptionChecked(false);
      try {
        const response = await fetch('/api/user/current', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.id) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setUserSubscriptionChecked(true);
      }
    };
    checkUser();
  }, []);

  // Fetch filter counts for Your Communities (with caching)
  useEffect(() => {
    if (!user?.id || activeSection !== 'your-communities') {
      setUserFilterCountsLoaded(false);
      return;
    }

    const fetchFilterCounts = async () => {
      // Check cache first - show immediately if available
      const cacheKey = `filterCounts_${user.id}`;
      const hasCachedData = filterCountsCache.current && 
          Date.now() - filterCountsCache.current.timestamp < CACHE_DURATION;
      
      if (hasCachedData && filterCountsCache.current) {
        // Show cached counts immediately
        setUserFilterCounts(filterCountsCache.current.data);
        setUserFilterCountsLoaded(true);
        
        // Fetch fresh data in background to check for updates
        // Don't set loading state - we already have data to show
      } else {
        // No cache - show loading state
        setUserFilterCountsLoaded(false);
      }

      // Check if already fetching
      if (fetchingRef.current.has(cacheKey)) {
        return;
      }
      fetchingRef.current.add(cacheKey);
      
      try {
        // Fetch all counts - handle each independently so one failure doesn't block others
        let approvedCount = 0;
        let pendingCount = 0;
        let ownedCount = 0;

        // Fetch approved count
        try {
          const approvedResponse = await fetch(
            `/api/user/communities?userId=${user.id}&page=1&filter=${encodeURIComponent('status:approved')}&limit=1`,
            { credentials: 'include' }
          );
          if (approvedResponse.ok) {
            const approvedData = await approvedResponse.json();
            approvedCount = approvedData.totalCount || 0;
          } else {
            // 500 or other error - means no approved communities, use 0
            approvedCount = 0;
          }
        } catch (error) {
          // Network error - use 0
          approvedCount = 0;
        }

        // Fetch pending count
        try {
          const pendingResponse = await fetch(
            `/api/user/communities?userId=${user.id}&page=1&filter=${encodeURIComponent('status:pending')}&limit=1`,
            { credentials: 'include' }
          );
          if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            pendingCount = pendingData.totalCount || 0;
          } else {
            // Error response - means no pending communities, use 0
            pendingCount = 0;
          }
        } catch (error) {
          // Network error - use 0
          pendingCount = 0;
        }

        // Fetch owned count
        try {
          const ownedResponse = await fetch(
            `/api/user/owned-communities?userId=${user.id}&page=1&limit=1000`,
            { credentials: 'include' }
          );
          if (ownedResponse.ok) {
            const ownedData = await ownedResponse.json();
            ownedCount = ownedData.totalCount !== undefined ? ownedData.totalCount : (ownedData.data || []).length;
          } else {
            // 500 or other error - means no owned communities, use 0
            ownedCount = 0;
          }
        } catch (error) {
          // Network error - use 0
          ownedCount = 0;
        }

        const counts = {
          approved: approvedCount,
          pending: pendingCount,
          owned: ownedCount,
        };
        
        // Compare with cached data to see if anything changed
        const cachedCounts = filterCountsCache.current?.data;
        const hasChanged = !cachedCounts ||
          counts.approved !== (cachedCounts.approved || 0) ||
          counts.pending !== (cachedCounts.pending || 0) ||
          counts.owned !== (cachedCounts.owned || 0);
        
        // Always update cache with fresh data
        filterCountsCache.current = {
          data: counts,
          timestamp: Date.now(),
        };
        
        // Only update UI if data changed (or if we didn't have cache)
        if (hasChanged || !cachedCounts) {
          setUserFilterCounts(counts);
        }
        setUserFilterCountsLoaded(true);
      } catch (error) {
        console.error('Error fetching filter counts:', error);
        setUserFilterCountsLoaded(true); // Set to true even on error so we don't show loading state forever
      } finally {
        fetchingRef.current.delete(cacheKey);
      }
    };
    
    fetchFilterCounts();
  }, [user?.id, activeSection]);

  // Invalidate filter counts cache when switching to "Your Communities" to ensure fresh counts
  useEffect(() => {
    if (activeSection === 'your-communities') {
      filterCountsCache.current = null;
      setUserFilterCountsLoaded(false);
    }
  }, [activeSection]);

  // Fetch elite communities (with caching for first page only)
  useEffect(() => {
    const fetchElite = async () => {
      // Only cache first page to save memory
      const isFirstPage = elitePage === 0;
      const cacheKey = 'elite_communities';
      
      // Check cache for first page only
      if (isFirstPage && eliteCache.current && 
          Date.now() - eliteCache.current.timestamp < STATIC_CACHE_DURATION) {
        setEliteCommunities(eliteCache.current.data);
        setEliteTotalCount(eliteCache.current.totalCount);
        setIsEliteLoading(false);
        return;
      }
      
      // Check if already fetching
      if (fetchingRef.current.has(cacheKey)) {
        return;
      }
      fetchingRef.current.add(cacheKey);
      setIsEliteLoading(true);
      
      try {
        const response = await fetch(`${API_URL}/api/v2/communities/elite?limit=${eliteItemsPerPage}&page=${elitePage}`);
        if (response.ok) {
          const data = await response.json();
          const communities = (data.data || []).map((item: any) => ({
            _id: item._id,
            name: item.name,
            promotionalText: item.promotionalText,
            promotionalDescription: item.promotionalDescription,
            tags: item.tags || [],
            imageLink: item.imageLink && !item.imageLink.includes("file:///")
              ? item.imageLink
              : "/static/images/default-logo.png",
            membersCount: item.membersCount,
            code: item._id,
            subscription: item.subscription,
          })).sort((a: Community, b: Community) => a.name.localeCompare(b.name));
          
          // Cache first page only
          if (isFirstPage) {
            eliteCache.current = {
              data: communities,
              totalCount: data.totalCount || 0,
              timestamp: Date.now(),
            };
          }
          
          setEliteCommunities(communities);
          setEliteTotalCount(data.totalCount || 0);
        }
      } catch (error) {
        setEliteCommunities([]);
        setEliteTotalCount(0);
      } finally {
        setIsEliteLoading(false);
        fetchingRef.current.delete(cacheKey);
      }
    };
    if (activeSection === 'elite') {
      fetchElite();
    }
  }, [elitePage, activeSection, eliteItemsPerPage]);

  // Fetch user communities
  useEffect(() => {
    // Only fetch if we're on the your-communities section
    if (activeSection !== 'your-communities') {
      return;
    }

    // If no user, set loading to false and return
    if (!user?.id) {
      setIsUserLoading(false);
      setUserCommunities([]);
      setUserTotalCount(0);
      return;
    }

    const fetchUserCommunities = async () => {
      // Create cache key for duplicate request prevention only
      const cacheKey = `communities_${user.id}_${userFilter}_${userPage}`;
      
      // Check if already fetching this exact request
      if (fetchingRef.current.has(cacheKey)) {
        return;
      }
      fetchingRef.current.add(cacheKey);
      
      setIsUserLoading(true);
      
      try {
        let url: string;
        
        if (userFilter === 'owned') {
          // Use different endpoint for owned communities - API expects 1-indexed page
          const page = userPage + 1;
          url = `/api/user/owned-communities?userId=${user.id}&page=${page}&limit=${userItemsPerPage}`;
        } else {
          // Use 1-indexed page - API expects page=1, page=2, etc.
          const page = userPage + 1;
          // Build filter based on selected filter
          const filter = userFilter === 'pending' ? 'status:pending' : 'status:approved';
          const encodedFilter = encodeURIComponent(filter);
          url = `/api/user/communities?userId=${user.id}&page=${page}&filter=${encodedFilter}&limit=${userItemsPerPage}`;
        }
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const communities = (data.data || []).map((item: any) => ({
            _id: item._id,
            name: item.name || 'Unnamed Community',
            membersCount: item.membersCount || 0,
            isActive: false, // We'll need to fetch this separately if needed
            code: item._id,
            imageLink: item.imageLink && !item.imageLink.includes("file:///") && item.imageLink.trim() !== ''
              ? item.imageLink
              : "/static/images/default-logo.png",
            tags: item.tags || [],
            promotionalText: item.promotionalText || '',
            promotionalDescription: item.promotionalDescription || '',
            subscription: item.subscription ? { active: true } : { active: false },
          }));
          
          setUserCommunities(communities);
          setUserTotalCount(data.totalCount || 0);
        } else {
          // Error response - means no communities for this filter, show empty
          setUserCommunities([]);
          setUserTotalCount(0);
        }
      } catch (error) {
        console.error('[fetchUserCommunities] Exception:', { userFilter, error });
        setUserCommunities([]);
        setUserTotalCount(0);
      } finally {
        setIsUserLoading(false);
        fetchingRef.current.delete(cacheKey);
      }
    };
    
    fetchUserCommunities();
  }, [user?.id, userPage, activeSection, userItemsPerPage, userFilter]);

  // Fetch recommended communities (with caching for first page only)
  useEffect(() => {
    if (!user?.id || activeSection !== 'recommended') {
      setIsRecommendedLoading(false);
      return;
    }

    const fetchRecommended = async () => {
      // Only cache first page to save memory
      const isFirstPage = recommendedPage === 0;
      const cacheKey = `recommended_${user.id}`;
      
      // Check cache for first page only
      if (isFirstPage && recommendedCache.current && 
          Date.now() - recommendedCache.current.timestamp < STATIC_CACHE_DURATION) {
        setRecommendedCommunities(recommendedCache.current.data);
        setRecommendedTotalCount(recommendedCache.current.totalCount);
        setIsRecommendedLoading(false);
        return;
      }
      
      // Check if already fetching
      if (fetchingRef.current.has(cacheKey)) {
        return;
      }
      fetchingRef.current.add(cacheKey);
      setIsRecommendedLoading(true);
      
      try {
        const url = `/api/user/recommended-communities?userId=${user.id}&limit=3&page=${recommendedPage}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const communities = (data.data || []).map((item: any) => ({
            _id: item._id,
            name: item.name || 'Unnamed Community',
            promotionalText: item.promotionalText || '',
            promotionalDescription: item.promotionalDescription || '',
            tags: item.tags || [],
            imageLink: item.imageLink && !item.imageLink.includes("file:///") && item.imageLink.trim() !== ''
              ? item.imageLink
              : "/static/images/default-logo.png",
            membersCount: item.membersCount || 0,
            code: item._id,
            subscription: item.subscription ? { active: true } : { active: false },
          }));
          
          // Cache first page only
          if (isFirstPage) {
            recommendedCache.current = {
              data: communities,
              totalCount: data.totalCount || 0,
              timestamp: Date.now(),
            };
          }
          
          setRecommendedCommunities(communities);
          setRecommendedTotalCount(data.totalCount || 0);
        } else {
          setRecommendedCommunities([]);
          setRecommendedTotalCount(0);
        }
      } catch (error) {
        setRecommendedCommunities([]);
        setRecommendedTotalCount(0);
      } finally {
        setIsRecommendedLoading(false);
        fetchingRef.current.delete(cacheKey);
      }
    };
    fetchRecommended();
  }, [user?.id, recommendedPage, activeSection]);

  // Fetch filter counts for Browse All
  useEffect(() => {
    if (activeSection !== 'browse') {
      setBrowseFilterCountsLoaded(false);
      return;
    }

    const fetchBrowseFilterCounts = async () => {
      setBrowseFilterCountsLoaded(false);
      try {
        const tags = ["all", "PC", "Xbox", "PlayStation"];
        const countPromises = tags.map(async (tag) => {
          try {
            const response = await fetch(
              `/api/communities/browse?tag=${tag}&limit=1&page=0`,
              { credentials: 'include' }
            );
            const data = response.ok ? await response.json() : { totalCount: 0 };
            return { tag, count: data.totalCount || 0 };
          } catch (error) {
            return { tag, count: 0 };
          }
        });

        const results = await Promise.all(countPromises);
        const counts: Record<string, number> = {};
        results.forEach(({ tag, count }) => {
          counts[tag] = count;
        });

        setBrowseFilterCounts({
          all: counts.all || 0,
          PC: counts.PC || 0,
          Xbox: counts.Xbox || 0,
          PlayStation: counts.PlayStation || 0,
        });
        setBrowseFilterCountsLoaded(true);
      } catch (error) {
        setBrowseFilterCountsLoaded(true); // Set to true even on error so we don't show loading state forever
      }
    };

    fetchBrowseFilterCounts();
  }, [activeSection]);

  // Fetch all communities (with caching for first page only)
  useEffect(() => {
    if (activeSection !== 'browse') {
      setIsAllLoading(false);
      return;
    }

    const fetchAll = async () => {
      // Only cache first page to save memory
      const isFirstPage = allPage === 0;
      const cacheKey = `browse_${currentTag}`;
      
      // Check cache for first page only
      if (isFirstPage) {
        const cached = browseCache.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < STATIC_CACHE_DURATION) {
          setAllCommunities(cached.data);
          setAllTotalCount(cached.totalCount);
          setIsAllLoading(false);
          return;
        }
      }
      
      // Check if already fetching
      if (fetchingRef.current.has(cacheKey)) {
        return;
      }
      fetchingRef.current.add(cacheKey);
      setIsAllLoading(true);
      
      try {
        const url = `/api/communities/browse?tag=${currentTag}&limit=6&page=${allPage}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const communities = (data.data || []).map((item: any) => ({
            _id: item._id,
            name: item.name || 'Unnamed Community',
            promotionalText: item.promotionalText || '',
            promotionalDescription: item.promotionalDescription || '',
            tags: item.tags || [],
            imageLink: item.imageLink && !item.imageLink.includes("file:///") && item.imageLink.trim() !== ''
              ? item.imageLink
              : "/static/images/default-logo.png",
            membersCount: item.membersCount || 0,
            code: item._id,
            subscription: item.subscription ? { active: true } : { active: false },
          }));
          
          // Cache first page only
          if (isFirstPage) {
            browseCache.current.set(cacheKey, {
              data: communities,
              totalCount: data.totalCount || 0,
              timestamp: Date.now(),
            });
          }
          
          setAllCommunities(communities);
          setAllTotalCount(data.totalCount || 0);
        } else {
          setAllCommunities([]);
          setAllTotalCount(0);
        }
      } catch (error) {
        setAllCommunities([]);
        setAllTotalCount(0);
      } finally {
        setIsAllLoading(false);
        fetchingRef.current.delete(cacheKey);
      }
    };
    fetchAll();
  }, [currentTag, allPage, activeSection]);

  const handleCommunityClick = (community: Community) => {
    router.push(`/community/${encodeCommunityId(community._id)}`);
  };

  const handleJoinViaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(false);
    
    if (!inviteCode.trim()) {
      setJoinError('Please enter an invite code');
      return;
    }

    if (!user?.id) {
      setJoinError('You must be logged in to join a community');
      return;
    }

    setIsJoining(true);
    
    try {
      const response = await fetch('/community/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoinSuccess(true);
        setInviteCode('');
        // Invalidate cache to refresh communities list
        invalidateCommunitiesCache();
        
        // Redirect to community page if we have communityId
        if (data.communityId) {
          setTimeout(() => {
            router.push(`/community/${data.communityId}`);
          }, 1500);
        } else {
          // Otherwise redirect to Your Communities after a delay
          setTimeout(() => {
            setActiveSection('your-communities');
            router.push('/communities?page=your-communities');
          }, 1500);
        }
      } else {
        // Handle error response
        const errorMessage = data.message || data.error || 'Failed to join community. Please check the invite code and try again.';
        setJoinError(errorMessage);
      }
    } catch (error) {
      console.error('Error joining community:', error);
      setJoinError('An error occurred while joining the community. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };


  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'elite':
        return (
          <div className="py-4 sm:py-8 w-full">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Elite Communities</h2>
              <div className="flex items-center gap-2 text-gray-400 mb-6">
                <i className="fa fa-crown"></i>
                <p className="text-sm md:text-base">
                  These are promoted communities. If you want to learn more about how to promote your community, you can head over to the mobile app and click on promote inside your community to learn more.
                </p>
              </div>
            </div>
            {isEliteLoading ? (
              <div className="py-8">
                <LoadingSpinner text="Loading elite communities..." />
              </div>
            ) : eliteCommunities.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                  <i className="fa fa-crown text-4xl text-gray-500 mb-4"></i>
                  <h3 className="text-xl font-semibold text-white mb-2">No elite communities found</h3>
                  <p className="text-gray-400">Check back later for promoted communities</p>
                </div>
              </div>
            ) : (
              <>
                {/* Top Ad for Elite - Only show after checking subscription, and hide for Premium and Premium Plus */}
                {eliteCommunities.length > 0 && userSubscriptionChecked && !(user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus')) && (
                  <div className="mb-6">
                    <GoogleAd adSlot="1760139308" matchCardHeight={false} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start">
                  {(() => {
                    // Generate positions based on subscription tier
                    const generateAdPositions = (totalCards: number, userPlan?: string, subscriptionActive?: boolean): Set<number> => {
                      const positions = new Set<number>();
                      
                      // Premium Plus: No ads
                      if (subscriptionActive && userPlan === 'premium_plus') {
                        return positions;
                      }
                      
                      // Premium: 50% fewer ads (every 6-10 cards instead of 3-5)
                      const isPremium = subscriptionActive && userPlan === 'premium';
                      const minCardsBetweenAds = isPremium ? 6 : 3;
                      const maxCardsBetweenAds = isPremium ? 10 : 5;
                      
                      // Always place first ad after the first card (position 1) - unless Premium Plus
                      if (totalCards >= 1) {
                        positions.add(1);
                      }
                      
                      // Then place ads every N cards after the first ad
                      // Use a seeded random function based on section name to ensure different patterns per section
                      let randomSeed = 0;
                      const sectionSeed = 'elite';
                      for (let i = 0; i < sectionSeed.length; i++) {
                        randomSeed += sectionSeed.charCodeAt(i);
                      }
                      randomSeed += totalCards; // Also include totalCards in seed
                      
                      let currentPosition = 1; // Start after first card
                      let iteration = 0;
                      while (currentPosition < totalCards - 2) {
                        // Use a combination of Math.random() and the seed to ensure different patterns
                        const randomValue = Math.random() * (randomSeed + iteration + Date.now() % 1000);
                        const cardsUntilAd = Math.floor((randomValue % (maxCardsBetweenAds - minCardsBetweenAds + 1)) + minCardsBetweenAds);
                        currentPosition += cardsUntilAd;
                        iteration++;
                        
                        if (currentPosition < totalCards) {
                          positions.add(currentPosition);
                        }
                      }
                      
                      return positions;
                    };
                    
                    const adPositions = generateAdPositions(
                      eliteCommunities.length,
                      user?.subscription?.plan,
                      user?.subscription?.active
                    );
                    
                    const items: React.ReactNode[] = [];
                    eliteCommunities.forEach((community, index) => {
                      // Always add the card first
                      items.push(
                        <CommunityCard
                          key={community._id}
                          community={community}
                          isActive={community.isActive}
                          actionText="Explore"
                          onAction={handleCommunityClick}
                        />
                      );
                      
                      // Insert ad AFTER the card if this position should have an ad
                      // Position 1 means after the first card (index 0)
                      if (adPositions.has(index + 1)) {
                        items.push(
                          <GoogleAd 
                            key={`ad-elite-${index}`}
                            adSlot="1673838381" 
                            className="my-4"
                            matchCardHeight={true}
                          />
                        );
                      }
                    });
                    
                    return items;
                  })()}
                </div>
                {eliteTotalCount > eliteItemsPerPage && (
                  <PaginationControls
                    currentPage={elitePage}
                    totalCount={eliteTotalCount}
                    itemsPerPage={eliteItemsPerPage}
                    onPageChange={(page) => {
                      setElitePage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    isLoading={isEliteLoading}
                  />
                )}
              </>
            )}
          </div>
        );
      
      case 'your-communities':
        // If user is not loaded yet, show loading state
        // Since users can only access this page if logged in, we just show loading
        if (!user) {
          return (
            <div className="py-8">
              <LoadingSpinner text="Loading your communities..." />
            </div>
          );
        }
        const userFilters = [
          { id: 'approved', label: 'Approved', count: userFilterCounts.approved },
          { id: 'pending', label: 'Pending', count: userFilterCounts.pending },
          { id: 'owned', label: 'Owned by You', count: userFilterCounts.owned },
        ];
        
        return (
          <CommunitySection
            title="Your Communities"
            communities={userCommunities}
            actionText="Jump In"
            onAction={handleCommunityClick}
            isLoading={isUserLoading}
            emptyMessage="You haven't joined any communities yet. You can create one or search for a community to join."
            emptyIcon="fa-users"
            userPlan={user?.subscription?.plan}
            subscriptionActive={user?.subscription?.active}
            userSubscriptionChecked={userSubscriptionChecked}
            emptyActions={
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <button
                  onClick={() => {
                    setActiveSection('browse');
                    router.replace('/communities?page=browse');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fa fa-globe mr-2"></i>
                  Browse Communities
                </button>
                <button
                  onClick={() => {
                    router.push('/communities/search');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fa fa-search mr-2"></i>
                  Search Communities
                </button>
                <button
                  onClick={() => {
                    router.push('/communities/create-new');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fa fa-plus mr-2"></i>
                  Create Community
                </button>
              </div>
            }
            showPagination={userTotalCount > userItemsPerPage}
            paginationProps={{
              currentPage: userPage,
              totalCount: userTotalCount,
              itemsPerPage: userItemsPerPage,
              onPageChange: (page) => {
                setUserPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            }}
            filterTabs={
              <FilterTabs
                filters={userFilters}
                activeFilter={userFilter}
                onFilterChange={(filterId) => {
                  const newFilter = filterId as 'approved' | 'pending' | 'owned';
                  // Clear communities immediately when filter changes to avoid showing stale data
                  setUserCommunities([]);
                  setUserTotalCount(0);
                  setUserFilter(newFilter);
                  setUserPage(0); // Reset to first page when filter changes
                  // Update hash in URL
                  const hash = filterToHash[filterId] || filterId;
                  setHashInUrl(hash);
                }}
                countsLoaded={userFilterCountsLoaded}
              />
            }
          />
        );
      
      case 'recommended':
        if (!user) {
          return (
            <div className="py-12 text-center">
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                <i className="fa fa-compass text-4xl text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">Sign In for Personalized Recommendations</h3>
                <p className="text-gray-400 mb-4">Get community recommendations based on your interests</p>
                <Link
                  href="/login-civ?redirect=/communities"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fa fa-sign-in-alt mr-2"></i>
                  Sign In
                </Link>
              </div>
            </div>
          );
        }
        return (
          <CommunitySection
            title="Recommended for You"
            communities={recommendedCommunities}
            actionText="Explore"
            userPlan={user?.subscription?.plan}
            subscriptionActive={user?.subscription?.active}
            userSubscriptionChecked={userSubscriptionChecked}
            onAction={handleCommunityClick}
            isLoading={isRecommendedLoading}
            emptyMessage="No recommendations available"
            emptyIcon="fa-compass"
          />
        );
      
      case 'browse':
        const browseFilters = [
          { id: 'all', label: 'All', count: browseFilterCounts.all },
          { id: 'PC', label: 'PC', count: browseFilterCounts.PC },
          { id: 'Xbox', label: 'Xbox', count: browseFilterCounts.Xbox },
          { id: 'PlayStation', label: 'PlayStation', count: browseFilterCounts.PlayStation },
        ];
        
        return (
          <div className="py-4 sm:py-8 w-full">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Browse All Communities</h2>
              <div className="flex items-center gap-2 text-gray-400 mb-4 sm:mb-6">
                <i className="fa fa-globe"></i>
                <p className="text-xs sm:text-sm md:text-base">
                  These are all the public communities. Any private communities will not show here.
                </p>
              </div>
            </div>
            <FilterTabs
              filters={browseFilters}
              activeFilter={currentTag}
              onFilterChange={(tag) => {
                setCurrentTag(tag);
                setAllPage(0); // Reset to first page when filter changes
                // Update hash in URL
                const hash = filterToHash[tag] || tag.toLowerCase();
                setHashInUrl(hash);
              }}
              countsLoaded={browseFilterCountsLoaded}
            />
            {isAllLoading ? (
              <div className="py-8">
                <LoadingSpinner text="Loading communities..." />
              </div>
            ) : allCommunities.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                  <i className="fa fa-globe text-4xl text-gray-500 mb-4"></i>
                  <h3 className="text-xl font-semibold text-white mb-2">No communities found</h3>
                  <p className="text-gray-400">Try selecting a different filter</p>
                </div>
              </div>
            ) : (
              <>
                {/* Top Ad for Browse - Only show after checking subscription, and hide for Premium and Premium Plus */}
                {allCommunities.length > 0 && userSubscriptionChecked && !(user?.subscription?.active && (user.subscription.plan === 'premium' || user.subscription.plan === 'premium_plus')) && (
                  <div className="mb-6">
                    <GoogleAd adSlot="1760139308" matchCardHeight={false} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start">
                  {(() => {
                    // Generate positions based on subscription tier
                    const generateAdPositions = (totalCards: number, userPlan?: string, subscriptionActive?: boolean): Set<number> => {
                      const positions = new Set<number>();
                      
                      // Premium Plus: No ads
                      if (subscriptionActive && userPlan === 'premium_plus') {
                        return positions;
                      }
                      
                      // Premium: 50% fewer ads (every 6-10 cards instead of 3-5)
                      const isPremium = subscriptionActive && userPlan === 'premium';
                      const minCardsBetweenAds = isPremium ? 6 : 3;
                      const maxCardsBetweenAds = isPremium ? 10 : 5;
                      
                      // Always place first ad after the first card (position 1) - unless Premium Plus
                      if (totalCards >= 1) {
                        positions.add(1);
                      }
                      
                      // Then place ads every N cards after the first ad
                      let currentPosition = 1; // Start after first card
                      while (currentPosition < totalCards - 2) {
                        // Random number between min and max cards after the previous ad
                        const cardsUntilAd = Math.floor(Math.random() * (maxCardsBetweenAds - minCardsBetweenAds + 1)) + minCardsBetweenAds;
                        currentPosition += cardsUntilAd;
                        
                        if (currentPosition < totalCards) {
                          positions.add(currentPosition);
                        }
                      }
                      
                      return positions;
                    };
                    
                    const adPositions = generateAdPositions(
                      allCommunities.length,
                      user?.subscription?.plan,
                      user?.subscription?.active
                    );
                    
                    const items: React.ReactNode[] = [];
                    allCommunities.forEach((community, index) => {
                      // Always add the card first
                      items.push(
                        <CommunityCard
                          key={community._id}
                          community={community}
                          isActive={community.isActive}
                          actionText="View"
                          onAction={handleCommunityClick}
                        />
                      );
                      
                      // Insert ad AFTER the card if this position should have an ad
                      // Position 1 means after the first card (index 0)
                      if (adPositions.has(index + 1)) {
                        items.push(
                          <GoogleAd 
                            key={`ad-browse-${index}`}
                            adSlot="1673838381" 
                            className="my-4"
                            matchCardHeight={true}
                          />
                        );
                      }
                    });
                    
                    return items;
                  })()}
                </div>
                {allTotalCount > 6 && (
                  <PaginationControls
                    currentPage={allPage}
                    totalCount={allTotalCount}
                    itemsPerPage={6}
                    onPageChange={(page) => {
                      setAllPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    isLoading={isAllLoading}
                  />
                )}
              </>
            )}
          </div>
        );
      
      case 'join-code':
        return (
          <div className="py-4 sm:py-8 w-full max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6">
              <i className="fa fa-key mr-2"></i>
              Join via Code
            </h2>
            
            {!user ? (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <i className="fa fa-sign-in-alt text-4xl text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-gray-400 mb-4">You must be logged in to join a community via invite code</p>
                <Link
                  href="/login-civ?redirect=/communities?page=join-code"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fa fa-sign-in-alt mr-2"></i>
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
                {joinSuccess ? (
                  <div className="text-center">
                    <i className="fa fa-check-circle text-5xl text-green-500 mb-4"></i>
                    <h3 className="text-xl font-semibold text-white mb-2">Successfully Joined!</h3>
                    <p className="text-gray-400">Redirecting you to the community...</p>
                  </div>
                ) : (
                  <form onSubmit={handleJoinViaCode} className="space-y-6">
                    <div>
                      <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-300 mb-2">
                        Invite Code
                      </label>
                      <input
                        type="text"
                        id="inviteCode"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          setJoinError(null);
                        }}
                        placeholder="Enter invite code"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isJoining}
                        autoFocus
                      />
                      <p className="mt-2 text-sm text-gray-400">
                        Enter the invite code you received to join a community
                      </p>
                    </div>

                    {joinError && (
                      <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <i className="fa fa-exclamation-circle text-red-400 mr-2"></i>
                          <p className="text-red-300 text-sm">{joinError}</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isJoining || !inviteCode.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isJoining ? (
                        <>
                          <i className="fa fa-spinner fa-spin mr-2"></i>
                          Joining...
                        </>
                      ) : (
                        <>
                          <i className="fa fa-sign-in-alt mr-2"></i>
                          Join Community
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Google Analytics - already in layout.tsx */}
      {/* Google AdSense Script - load once */}
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3842696805773142"
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      <Navbar />
      
          {/* Search Bar */}
          <div className="bg-gray-900 border-b border-gray-700">
            <SearchBar 
              onCreateCommunity={() => router.push('/communities/create-new')}
              onSearch={(query) => router.push(`/communities/search?q=${encodeURIComponent(query)}`)}
            />
          </div>

      <div className="flex flex-col lg:flex-row w-full">
        {/* Sidebar Navigation (Desktop) */}
        <SidebarNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Horizontal Tabs (Mobile) */}
        <HorizontalTabs
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full overflow-x-hidden">
          <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function CommunitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
          <LoadingSpinner text="Loading communities..." />
        </div>
      </div>
    }>
      <CommunitiesPageContent />
    </Suspense>
  );
}
