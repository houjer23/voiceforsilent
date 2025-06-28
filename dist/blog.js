async function loadPosts() {
    // Add loading class to body to hide footer initially
    document.body.classList.add('content-loading');

    try {
        console.log('Fetching posts from database...');
        
        // Fetch posts from the API endpoint
        const response = await fetch('/.netlify/functions/posts?limit=50');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let posts = data.posts || [];
        
        console.log('Found', posts.length, 'posts from database');
        
        // Sort posts by date, most recent first
        posts.sort((a, b) => new Date(b['Published Date']) - new Date(a['Published Date']));
        
        displayPosts(posts);
        
        // Show footer after posts are loaded and rendered
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
    } catch (error) {
        console.error('Error loading posts from database:', error);
        
        // Fallback to CSV if API fails
        try {
            console.log('Falling back to CSV...');
            const response = await fetch('Posts.csv');
            const csvText = await response.text();
            const posts   = parseCSV(csvText);
            
            // Sort posts by date, most recent first
            posts.sort((a, b) => new Date(b['Published Date']) - new Date(a['Published Date']));
            
            displayPosts(posts);
            console.log('CSV fallback successful');
        } catch (csvError) {
            console.error('CSV fallback also failed:', csvError);
            document.getElementById('posts-container').innerHTML =
                '<div class="error-message">Error loading posts. Please try again later.</div>';
        }
        
        // Show footer even if posts failed to load
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
    }
}

// Search functionality
async function searchPosts(searchTerm) {
    // Hide footer during search
    document.body.classList.add('content-loading');
    document.body.classList.remove('content-loaded');

    try {
        console.log('Searching posts for:', searchTerm);
        
        const response = await fetch(`/.netlify/functions/posts?search=${encodeURIComponent(searchTerm)}&limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let posts = data.posts || [];
        
        console.log('Found', posts.length, 'search results');
        
        displayPosts(posts);
        
        // Update UI to show search results
        const container = document.getElementById('posts-container');
        if (posts.length === 0) {
            container.innerHTML = '<div class="no-results">No posts found for your search.</div>';
        } else {
            const resultsHeader = document.createElement('div');
            resultsHeader.className = 'search-results-header';
            resultsHeader.innerHTML = `<h2>Search Results for "${searchTerm}" (${posts.length} found)</h2>`;
            container.insertBefore(resultsHeader, container.firstChild);
        }
        
        // Show footer after search results are displayed
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
        
    } catch (error) {
        console.error('Error searching posts:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error searching posts. Please try again later.</div>';
        
        // Show footer even if search failed
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
    }
}

// Filter posts by category
async function filterByCategory(category) {
    // Hide footer during filtering
    document.body.classList.add('content-loading');
    document.body.classList.remove('content-loaded');

    try {
        console.log('Filtering posts by category:', category);
        
        const response = await fetch(`/.netlify/functions/posts?category=${encodeURIComponent(category)}&limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let posts = data.posts || [];
        
        console.log('Found', posts.length, 'posts in category:', category);
        
        displayPosts(posts);
        
        // Update UI to show category filter
        const container = document.getElementById('posts-container');
        if (posts.length === 0) {
            container.innerHTML = `<div class="no-results">No posts found in category "${category}".</div>`;
        } else {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `<h2>Posts in "${category}" (${posts.length} found)</h2>`;
            container.insertBefore(categoryHeader, container.firstChild);
        }
        
        // Show footer after filtering is complete
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
        
    } catch (error) {
        console.error('Error filtering posts by category:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error filtering posts. Please try again later.</div>';
        
        // Show footer even if filtering failed
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
    }
}

/* ------------------------------------------------------------------ */
/* CSV Parser - Keep for fallback                                     */
/* ------------------------------------------------------------------ */
function csvToRows(text) {
    const rows = [];
    let field  = '';
    let row    = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            // doubled quote inside a quoted field -> literal "
            if (inQuotes && next === '"') { field += '"'; i++; continue; }
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            // Windows line‑ends: swallow the \n after \r
            if (char === '\r' && next === '\n') i++;
            row.push(field);
            rows.push(row);
            row   = [];
            field = '';
            continue;
        }

        field += char;
    }

    /* push last field / row (file may not end with NL) */
    if (field.length || inQuotes) row.push(field);
    if (row.length) rows.push(row);
    return rows;
}

function parseCSV(csvText) {
    const rows = csvToRows(csvText);
    if (!rows.length) return [];

    const headers = rows.shift().map(h => h.replace(/^"|"$/g, '').trim());
    const posts   = [];

    for (const valuesRaw of rows) {
        // skip blank CSV rows
        if (!valuesRaw.some(v => v.trim())) continue;

        const post = {};

        headers.forEach((header, idx) => {
            let value = valuesRaw[idx] || '';

            // strip surrounding quotes (not the ones we've un‑escaped)
            value = value.replace(/^"|"$/g, '').trim();

            /* ---- field‑specific coercions ---- */
            if (['Tags', 'Categories', 'Related Posts', 'Hashtags'].includes(header)) {
                try { value = JSON.parse(value || '[]'); } catch { value = []; }
            } else if (header === 'Rich Content') {
                try { value = JSON.parse(value || '{}'); } catch { value = {}; }
            } else if (['View Count', 'Comment Count', 'Like Count'].includes(header)) {
                value = parseInt(value, 10) || 0;
            } else if (['Featured', 'Pinned', 'Cover Image Displayed'].includes(header)) {
                value = value.toLowerCase() === 'true';
            }
            post[header] = value;
        });

        /* fallback title if the column is empty */
        if (!post.Title && post['Plain Content'])
            post.Title = post['Plain Content'].slice(0, 60) + '…';

        posts.push(post);
    }
    return posts;
}

/* ------------------------------------------------------------------ */
/* Display posts (unchanged from original)                            */
/* ------------------------------------------------------------------ */
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = ''; // Clear existing content

    // Create grid for all posts
    const postsGrid = document.createElement('div');
    postsGrid.className = 'posts-grid';

    // Display all posts
    posts.forEach(post => {
        const article = document.createElement('article');
        article.className = 'blog-post';
        article.innerHTML = createPostCardHTML(post);
        article.addEventListener('click', (e) => {
            // Don't navigate if clicking on like button or its children
            if (e.target.closest('.like-button')) {
                return;
            }
            window.location.href = `post.html?slug=${encodeURIComponent(post.Slug)}`;
        });
        postsGrid.appendChild(article);
    });

    container.appendChild(postsGrid);
}

function createPostCardHTML(post) {
    const publishedDate = formatDate(post['Published Date']);
    const tags = createTagsHTML(post.Tags);
    
    // Get author, views, and likes with fallback values
    const author = post.Author || 'Anonymous';
    const viewCount = post['View Count'] || 0;
    const likeCount = post['Like Count'] || 0;
    
    // Check if user has liked this post locally (for UI state only)
    const isLiked = isPostLiked(post.Slug);
    const heartClass = isLiked ? 'fas fa-heart liked' : 'far fa-heart';

    return `
        <div class="post-card-content">
            <div class="post-meta">
                <span class="author"><i class="fas fa-user"></i> ${author}</span>
                <span class="date"><i class="far fa-calendar"></i> ${publishedDate}</span>
                <span class="read-time"><i class="far fa-clock"></i> ${post['Time To Read']} min read</span>
            </div>
            <h2 class="post-title">${post.Title || 'Untitled'}</h2>
            ${tags}
            <p class="post-excerpt">${post.Excerpt}</p>
            <div class="post-stats">
                <span class="views"><i class="far fa-eye"></i> ${viewCount} views</span>
                <button class="like-button ${isLiked ? 'liked' : ''}" data-slug="${post.Slug}">
                    <i class="${heartClass}"></i> 
                    <span class="like-count">${likeCount}</span>
                </button>
            </div>
        </div>
    `;
}

function createTagsHTML(tags) {
    if (!tags || !tags.length) return '';
    return `
        <div class="post-tags">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                searchPosts(searchTerm);
            } else {
                loadPosts(); // Load all posts if search is empty
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    searchPosts(searchTerm);
                } else {
                    loadPosts();
                }
            }
        });
    }
}

/* ------------------------------------------------------------------ */
/* Like functionality                                                  */
/* ------------------------------------------------------------------ */

function isPostLiked(slug) {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    return likedPosts.includes(slug);
}

function toggleLike(slug, forceState = null) {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const index = likedPosts.indexOf(slug);
    
    if (forceState !== null) {
        // Force a specific state
        if (forceState && index === -1) {
            likedPosts.push(slug);
        } else if (!forceState && index > -1) {
            likedPosts.splice(index, 1);
        }
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        return forceState;
    } else {
        // Toggle normally
        if (index > -1) {
            // Unlike
            likedPosts.splice(index, 1);
        } else {
            // Like
            likedPosts.push(slug);
        }
        
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        return index === -1; // Returns true if just liked, false if just unliked
    }
}

async function handleLikeToggle(slug, isCurrentlyLiked) {
    try {
        const action = isCurrentlyLiked ? 'unlike' : 'like';
        
        const response = await fetch(`/.netlify/functions/posts/${slug}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            success: true,
            newLikeCount: data.likeCount,
            isLiked: action === 'like'
        };
    } catch (error) {
        console.error('Error toggling like:', error);
        return { success: false, error: error.message };
    }
}

function initializeLikeButtons() {
    document.addEventListener('click', async (e) => {
        // Check if clicked element is a like button or inside one
        const likeButton = e.target.closest('.like-button');
        if (!likeButton) return;
        
        // CRITICAL: Stop all event propagation to prevent navigation
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Prevent multiple clicks while processing
        if (likeButton.disabled) return;
        likeButton.disabled = true;
        
        const slug = likeButton.dataset.slug;
        const heartIcon = likeButton.querySelector('i');
        const likeCountSpan = likeButton.querySelector('.like-count');
        const isCurrentlyLiked = likeButton.classList.contains('liked');
        
        // Add loading state with beautiful animation
        likeButton.classList.add('animating');
        
        try {
            const result = await handleLikeToggle(slug, isCurrentlyLiked);
            
            if (result.success) {
                // Update UI with new count from server
                likeCountSpan.textContent = result.newLikeCount;
                
                if (result.isLiked) {
                    // Light up the heart!
                    heartIcon.className = 'fas fa-heart liked';
                    likeButton.classList.add('liked');
                    // Update local storage for UI consistency
                    toggleLike(slug, true);
                    
                    // Add sparkle effect
                    createSparkleEffect(likeButton);
                } else {
                    // Turn off the heart
                    heartIcon.className = 'far fa-heart';
                    likeButton.classList.remove('liked');
                    // Update local storage for UI consistency
                    toggleLike(slug, false);
                }
            } else {
                // Revert UI on error
                console.error('Failed to update like:', result.error);
                showFeedback('Failed to update like. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error in like button handler:', error);
            showFeedback('Failed to update like. Please try again.', 'error');
        } finally {
            // Remove loading state and re-enable button
            setTimeout(() => {
                likeButton.classList.remove('animating');
                likeButton.disabled = false;
            }, 600);
        }
    });
}

function createSparkleEffect(button) {
    // Create floating sparkles
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('span');
            sparkle.innerHTML = '✨';
            sparkle.style.cssText = `
                position: absolute;
                pointer-events: none;
                font-size: 14px;
                color: #ff1744;
                z-index: 1000;
                animation: floatUp 1s ease-out forwards;
            `;
            
            const rect = button.getBoundingClientRect();
            sparkle.style.left = (rect.left + Math.random() * rect.width) + 'px';
            sparkle.style.top = (rect.top + Math.random() * rect.height) + 'px';
            
            document.body.appendChild(sparkle);
            
            setTimeout(() => sparkle.remove(), 1000);
        }, i * 100);
    }
}

function showFeedback(message, type = 'info') {
    // Simple feedback without alert (less intrusive)
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Add CSS for floating sparkles
if (!document.querySelector('#sparkle-styles')) {
    const style = document.createElement('style');
    style.id = 'sparkle-styles';
    style.textContent = `
        @keyframes floatUp {
            0% {
                transform: translateY(0) scale(0.5);
                opacity: 1;
            }
            100% {
                transform: translateY(-30px) scale(1);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Load posts when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initializeSearch();
    initializeLikeButtons();
}); 