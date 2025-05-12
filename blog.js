async function loadPosts() {
    try {
        const response = await fetch('Posts.csv');
        const csvText = await response.text();
        const posts   = parseCSV(csvText);
        
        // Sort posts by date, most recent first
        posts.sort((a, b) => new Date(b['Published Date']) - new Date(a['Published Date']));
        
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="error-message">Error loading posts. Please try again later.</div>';
    }
}

/* ------------------------------------------------------------------ */
/* 1.  Split the entire CSV into rows, honouring quoted sections       */
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

/* ------------------------------------------------------------------ */
/* 2.  Parse rows into post objects                                    */
/* ------------------------------------------------------------------ */
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
/* 3.  Your original displayPosts() stays untouched                    */
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
            <div class="post-footer">
                <!-- Stats section removed -->
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

// Load posts when the page is ready
document.addEventListener('DOMContentLoaded', loadPosts);
