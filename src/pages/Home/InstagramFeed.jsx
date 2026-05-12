import React, { useState, useEffect } from 'react';
import authService from '../../services/auth.service';

const InstagramFeed = ({ 
  instagramHandle = 'hopegive',
  title = 'Follow Our Journey',
  subtitle = 'Stay connected with our latest activities and impact stories through our Instagram feed',
  postsPerRow = { mobile: 1, tablet: 2, desktop: 4, large: 4 },
  maxPosts = 8
}) => {
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  // Fetch Instagram posts
  useEffect(() => {
    const fetchInstagramPosts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Pass the Instagram handle to the API call if your service supports it
        const data = await authService.instagramFeed(instagramHandle);
        // Ensure data exists and has the expected structure
        if (data && Array.isArray(data.data)) {
          const limitedPosts = data.data.slice(0, maxPosts);
          setInstagramPosts(limitedPosts);
        } else if (data && Array.isArray(data)) {
          // Handle case where data is directly an array
          const limitedPosts = data.slice(0, maxPosts);
          setInstagramPosts(limitedPosts);
        } else {
          setInstagramPosts([]);
        }
      } catch (err) {
        console.error('Error fetching Instagram posts:', err);
        setError(err.message || 'Failed to load Instagram posts');
        setInstagramPosts([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstagramPosts();
  }, [maxPosts, instagramHandle]); // Added instagramHandle to dependency array

  const handleRetry = () => {
    window.location.reload();
  };

  const handlePostClick = (post) => {
    // Add safety checks
    if (!post || !post.id) return;

    if (post.media_type === 'VIDEO') {
      // Toggle video playback
      if (playingVideo === post.id) {
        setPlayingVideo(null);
      } else {
        setPlayingVideo(post.id);
      }
    } else {
      // For images and carousels, open Instagram post in new tab
      if (post.permalink) {
        window.open(post.permalink, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback to Instagram URL pattern
        window.open(`https://instagram.com/p/${post.id}`, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Fixed grid classes generation to avoid dynamic class names that might not be in Tailwind
  const getGridClasses = () => {
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6";
  };

  const renderPost = (post) => {
    // Add safety checks for post data
    if (!post || !post.id) {
      return null;
    }

    // Determine the display media URL - prefer thumbnail for videos, media_url for images
    const displayUrl = post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url;
    
    // Fallback placeholder image
    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
    
    return (
      <div 
        key={post.id} 
        className="group cursor-pointer"
        onClick={() => handlePostClick(post)}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-square">
          {post.media_type === 'IMAGE' ? (
            <img
              src={displayUrl || placeholderImage}
              alt="Instagram post"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                e.target.src = placeholderImage;
              }}
            />
          ) : post.media_type === 'VIDEO' ? (
            <div className="w-full h-full relative">
              {playingVideo === post.id ? (
                <video
                  src={post.media_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  controls
                  autoPlay
                  onEnded={() => setPlayingVideo(null)}
                  onError={() => setPlayingVideo(null)}
                />
              ) : (
                <>
                  <img
                    src={displayUrl || placeholderImage}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = placeholderImage;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="bg-white bg-opacity-90 rounded-full p-4 shadow-lg">
                      <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : post.media_type === 'CAROUSEL_ALBUM' ? (
            <>
              <img
                src={displayUrl || placeholderImage}
                alt="Instagram carousel"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.target.src = placeholderImage;
                }}
              />
              {/* Carousel indicator */}
              <div className="absolute top-2 right-2">
                <div className="bg-black bg-opacity-60 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-500 text-sm">Media Content</span>
              </div>
            </div>
          )}
        
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white py-12">
      <div className="mx-auto px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 mb-4 text-lg font-medium">{error}</p>
              <p className="text-gray-500 text-sm mb-6">Please check your internet connection and try again</p>
            </div>
            <button 
              onClick={handleRetry}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Instagram Posts Grid */}
        {!isLoading && !error && instagramPosts.length > 0 && (
          <div className={getGridClasses()}>
            {instagramPosts.map(renderPost).filter(Boolean)}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && instagramPosts.length === 0 && (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No Instagram posts available</p>
            <p className="text-gray-400 text-sm">Check back later for new content</p>
          </div>
        )}

        {/* Show More Button */}
        {!isLoading && !error && instagramPosts.length === maxPosts && (
          <div className="text-center mt-8">
            <a 
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center bg-gray-100 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-200 transition-all duration-300 font-medium mr-4"
            >
              View More Posts
            </a>
          </div>
        )}

        {/* Follow Button */}
        <div className="text-center mt-4">
          <a 
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-medium transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Follow Us on Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

export default InstagramFeed;