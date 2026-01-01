'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface Community {
  _id: string;
  name: string;
  imageLink?: string;
  promotionalText?: string;
  promotionalDescription?: string;
  description?: string;
  membersCount?: number;
  tags?: string[];
  subscription?: {
    active: boolean;
    plan?: string;
  };
}

function encodeCommunityId(id: string): string {
  return id.replace(/\//g, '_');
}

function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <i className="fa fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
        <p className="text-gray-400">{text}</p>
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: Community }) {
  const router = useRouter();
  const isVerified = community.subscription?.active && 
    ['elite', 'premium', 'standard'].includes(community.subscription?.plan || '');
  
  // Determine badge type
  const hasElite = (community.subscription?.active === true && community.subscription?.plan === 'elite') || community.promotionalText;
  const hasPremium = community.subscription?.active === true && community.subscription?.plan === 'premium';
  const hasStandard = community.subscription?.active === true && community.subscription?.plan === 'standard';
  const hasBasic = community.subscription?.active === true && community.subscription?.plan === 'basic';

  return (
    <div
      onClick={() => router.push(`/community/${encodeCommunityId(community._id)}`)}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all cursor-pointer transform hover:scale-[1.02]"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 relative">
          <img
            src={community.imageLink && !community.imageLink.includes("file:///") && community.imageLink.trim() !== ''
              ? community.imageLink
              : "/static/images/default-logo.png"}
            alt={community.name}
            className="w-16 h-16 rounded-lg object-cover"
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
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white truncate">{community.name}</h3>
            {isVerified && (
              <i className="fa fa-check-circle text-blue-500 flex-shrink-0" title="Verified Community"></i>
            )}
          </div>
          {(community.promotionalText || community.promotionalDescription || community.description) && (
            <p className="text-gray-400 text-sm line-clamp-2 mb-2">
              {community.promotionalText || community.promotionalDescription || community.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {community.membersCount !== undefined && (
              <span>
                <i className="fa fa-users mr-1"></i>
                {community.membersCount} {community.membersCount === 1 ? 'member' : 'members'}
              </span>
            )}
            {community.tags && community.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <i className="fa fa-tag mr-1"></i>
                {community.tags.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
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
}) {
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
}

function CommunitiesSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;

  // Fetch search results - debounced search as user types
  useEffect(() => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setResults([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    // Debounce the search
    const timer = setTimeout(() => {
      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const page = currentPage + 1; // API uses 1-indexed pages
          const response = await fetch(
            `/api/communities/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${itemsPerPage}`,
            {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const communities = (data.data || []).map((item: any) => {
              if (!item || !item._id) return null;
              const c = item.community || item;
              return {
                _id: item._id,
                name: c.name || 'Unnamed Community',
                imageLink: c.imageLink && !c.imageLink.includes("file:///") && c.imageLink.trim() !== ''
                  ? c.imageLink
                  : "/static/images/default-logo.png",
                promotionalText: c.promotionalText || '',
                promotionalDescription: c.promotionalDescription || '',
                description: c.description || '',
                membersCount: c.membersCount || 0,
                tags: c.tags || [],
                subscription: c.subscription ? {
                  active: c.subscription.active || false,
                  plan: c.subscription.plan || '',
                } : { active: false },
              };
            }).filter(Boolean);
            setResults(communities);
            setTotalCount(data.totalCount || data.total || communities.length);
          } else {
            setResults([]);
            setTotalCount(0);
          }
        } catch (error) {
          setResults([]);
          setTotalCount(0);
        } finally {
          setIsLoading(false);
        }
      };

      fetchResults();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, currentPage]);
  
  // Update URL when query changes (but don't trigger navigation)
  useEffect(() => {
    if (query.trim()) {
      const newUrl = `/communities/search?q=${encodeURIComponent(query.trim())}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already happening as user types, so just reset to first page
    setCurrentPage(0);
  };

  const searchQuery = query.trim() || searchParams.get('q') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      {/* Header Bar with Back Button */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <i className="fa fa-arrow-left"></i>
            <span className="font-medium">Back to Communities</span>
          </Link>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fa fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for communities..."
                className="w-full pl-12 pr-20 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-semibold"
              >
                <i className="fa fa-search mr-1"></i>
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!searchQuery.trim() ? (
          <div className="py-12 text-center">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <i className="fa fa-search text-4xl text-gray-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-white mb-2">Search Communities</h3>
              <p className="text-gray-400">Enter a search query to find communities</p>
            </div>
          </div>
        ) : isLoading ? (
          <LoadingSpinner text="Searching communities..." />
        ) : results.length === 0 ? (
          <div className="py-12 text-center">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <i className="fa fa-search text-4xl text-gray-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
              <p className="text-gray-400 mb-4">
                No communities found for &quot;{searchQuery}&quot;
              </p>
              <Link
                href="/communities"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                <i className="fa fa-arrow-left mr-2"></i>
                Back to Communities
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Search Results
              </h2>
              <p className="text-gray-400">
                Found {totalCount} {totalCount === 1 ? 'community' : 'communities'} for &quot;{searchQuery}&quot;
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((community) => (
                <CommunityCard key={community._id} community={community} />
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function CommunitiesSearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading search page..." />}>
      <CommunitiesSearchContent />
    </Suspense>
  );
}

