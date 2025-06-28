document.addEventListener('DOMContentLoaded', async () => {
    // Add loading class to body to hide footer initially
    document.body.classList.add('content-loading');

    try {
        console.log('Fetching posts from database...');
        
        // Fetch posts from the API endpoint - get recent posts instead of featured
        const response = await fetch('/.netlify/functions/posts?limit=3');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const posts = data.posts || [];
        
        console.log('Found', posts.length, 'posts');

        // Sort posts by published date in descending order (newest first)
        const sortedPosts = posts.sort((a, b) => {
            const dateA = a['Published Date'] ? new Date(a['Published Date']) : new Date(0);
            const dateB = b['Published Date'] ? new Date(b['Published Date']) : new Date(0);
            return dateB - dateA;
        });
        
        // Get the top 3 posts
        const topPosts = sortedPosts.slice(0, 3);
        
        // Get the blog posts container
        const blogPostsSection = document.querySelector('.blog-section .blog-posts');
        
        if (!blogPostsSection) {
            console.error('Blog posts container not found');
            return;
        }
        
        // Clear existing content
        blogPostsSection.innerHTML = '';
        
        // Render each post
        topPosts.forEach(post => {
            const postElement = createPostElement(post);
            blogPostsSection.appendChild(postElement);
        });
        
        console.log('Top posts rendered successfully');

        // Add click event for the entire card
        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Don't navigate if clicking on like button or its children
                if (e.target.closest('.like-button')) {
                    return;
                }
                // If the click wasn't on the Read More link itself (to avoid double navigation)
                if (!e.target.classList.contains('post-card-link') && 
                    !e.target.closest('.post-card-link')) {
                    // Get the slug from the link element inside this card
                    const link = this.querySelector('.post-card-link');
                    if (link && link.href) {
                        window.location.href = link.href;
                    }
                }
            });
            // Add pointer cursor to indicate clickable
            card.style.cursor = 'pointer';
        });

        // Initialize like buttons for homepage
        initializeLikeButtons();

        // Show footer after posts are loaded and rendered
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');

    } catch (err) {
        console.error('Error loading posts:', err);
        
        // Fallback to CSV if API fails (for development/transition period)
        try {
            console.log('Falling back to CSV...');
            const csv = await (await fetch('Posts.csv')).text();
            const posts = parseCSV(csv);
            
            // Same logic as above for rendering posts
            const sortedPosts = posts.sort((a, b) => {
                const dateA = a['Published Date'] ? new Date(a['Published Date']) : new Date(0);
                const dateB = b['Published Date'] ? new Date(b['Published Date']) : new Date(0);
                return dateB - dateA;
            });
            
            const topPosts = sortedPosts.slice(0, 3);
            const blogPostsSection = document.querySelector('.blog-section .blog-posts');
            
            if (blogPostsSection) {
                blogPostsSection.innerHTML = '';
                topPosts.forEach(post => {
                    const postElement = createPostElement(post);
                    blogPostsSection.appendChild(postElement);
                });
                
                // Initialize like buttons for fallback CSV data too
                initializeLikeButtons();
            }
            
            console.log('Fallback to CSV successful');
        } catch (csvErr) {
            console.error('CSV fallback also failed:', csvErr);
            const blogPostsSection = document.querySelector('.blog-section .blog-posts');
            if (blogPostsSection) {
                blogPostsSection.innerHTML = '<div class="error-message">Unable to load posts. Please try again later.</div>';
            }
        }
        
        // Show footer even if posts failed to load
        document.body.classList.remove('content-loading');
        document.body.classList.add('content-loaded');
    }
});

// Create a post element
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';
  
    /* ── top: title + meta info ──────────────────── */
    const header = document.createElement('header');
    header.className = 'post-card-header';
  
    const title = document.createElement('h3');
    title.className = 'post-card-title';
    title.textContent = post.Title || 'Untitled';
  
    // Post metadata section
    const metaDiv = document.createElement('div');
    metaDiv.className = 'post-meta';
    
    // Author
    const author = post.Author || 'Anonymous';
    const authorSpan = document.createElement('span');
    authorSpan.className = 'author';
    authorSpan.innerHTML = `<i class="fas fa-user"></i> ${author}`;
    
    // Date
    const date = document.createElement('time');
    date.className = 'date';
    const dateText = post['Published Date']
        ? new Date(post['Published Date']).toLocaleDateString(undefined,
          { year:'numeric', month:'short', day:'numeric' })
        : 'Unknown';
    date.innerHTML = `<i class="far fa-calendar"></i> ${dateText}`;
    
    // Read time (if available)
    if (post['Time To Read']) {
        const readTime = document.createElement('span');
        readTime.className = 'read-time';
        readTime.innerHTML = `<i class="far fa-clock"></i> ${post['Time To Read']} min read`;
        metaDiv.append(authorSpan, date, readTime);
    } else {
        metaDiv.append(authorSpan, date);
    }
  
    header.append(title, metaDiv);
    article.appendChild(header);
  
    /* ── middle: excerpt ────────────────────── */
    const excerpt = document.createElement('p');
    excerpt.className = 'post-card-excerpt';
    excerpt.textContent =
        post.Excerpt ||
        (post['Plain Content']?.slice(0, 160) + '…') ||
        '';
    article.appendChild(excerpt);
  
    /* ── footer: tags + stats + read-more button ────── */
    const footer = document.createElement('footer');
    footer.className = 'post-card-footer';
  
    // Tags section
    if (Array.isArray(post.Tags) && post.Tags.length) {
      const tagWrap = document.createElement('ul');
      tagWrap.className = 'post-card-tags';
      post.Tags.slice(0, 3).forEach(tagTxt => {
        const li = document.createElement('li');
        li.textContent = tagTxt;
        tagWrap.appendChild(li);
      });
      footer.appendChild(tagWrap);
    }
    
    // Stats section (views and likes)
    const statsDiv = document.createElement('div');
    statsDiv.className = 'post-stats';
    
    // View count
    const viewCount = post['View Count'] || 0;
    const viewsSpan = document.createElement('span');
    viewsSpan.className = 'views';
    viewsSpan.innerHTML = `<i class="far fa-eye"></i> ${viewCount} views`;
    
    // Like button
    const likeCount = post['Like Count'] || 0;
    const isLiked = isPostLiked(post.Slug);
    const heartClass = isLiked ? 'fas fa-heart liked' : 'far fa-heart';
    
    const likeButton = document.createElement('button');
    likeButton.className = `like-button ${isLiked ? 'liked' : ''}`;
    likeButton.dataset.slug = post.Slug;
    likeButton.innerHTML = `<i class="${heartClass}"></i> <span class="like-count">${likeCount}</span>`;
    
    statsDiv.append(viewsSpan, likeButton);
    footer.appendChild(statsDiv);
    
    // Read more link
    const readMore = document.createElement('a');
    readMore.className = 'post-card-link';
    readMore.href = `post.html?slug=${post.Slug}`;
    readMore.textContent = 'Read More';
    footer.appendChild(readMore);
  
    article.appendChild(footer);
  
    return article;
}  

/* ----------------------------------------------------------- */
/*  CSV Parser - Keep for fallback                             */
/* ----------------------------------------------------------- */

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

/* ----------------------------------------------------------- */
/*  Like functionality - copied from blog.js                  */
/* ----------------------------------------------------------- */

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