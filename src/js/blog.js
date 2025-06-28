async function loadPosts() {
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