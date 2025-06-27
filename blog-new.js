async function loadPosts() {
    try {
        console.log('Fetching posts from API...');
        
        // Fetch posts from the API endpoint
        const response = await fetch('/.netlify/functions/posts?limit=50');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let posts = data.posts || [];
        
        console.log('Found', posts.length, 'posts from API');
        
        // Sort posts by date, most recent first
        posts.sort((a, b) => new Date(b['Published Date']) - new Date(a['Published Date']));
        
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts from API:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error loading posts. Please check your connection and try again.</div>';
    }
}

// Search functionality
async function searchPosts(searchTerm) {
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
        
    } catch (error) {
        console.error('Error searching posts:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error searching posts. Please try again later.</div>';
    }
}

// Filter posts by category
async function filterByCategory(category) {
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
        
    } catch (error) {
        console.error('Error filtering posts by category:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error filtering posts. Please try again later.</div>';
    }
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
        article.addEventListener('click', () => {
            window.location.href = `post.html?slug=${encodeURIComponent(post.Slug)}`;
        });
        postsGrid.appendChild(article);
    });

    container.appendChild(postsGrid);
}

function createPostCardHTML(post) {
    const publishedDate = formatDate(post['Published Date']);
    const tags = createTagsHTML(post.Tags);

    return `
        <div class="post-card-content">
            <div class="post-meta">
                <span class="date">${publishedDate}</span>
                <span class="read-time">${post['Time To Read']} min read</span>
            </div>
            <h2 class="post-title">${post.Title || 'Untitled'}</h2>
            ${tags}
            <p class="post-excerpt">${post.Excerpt}</p>
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

// Load posts when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initializeSearch();
}); 