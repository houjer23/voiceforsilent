// python3 -m http.server 8000

async function loadPosts() {
    try {
        const response = await fetch('Posts.csv');
        const csvText = await response.text();
        const posts   = parseCSV(csvText);
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('posts-container').innerHTML =
            '<p>Error loading posts. Please try again later.</p>';
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

    posts.forEach(post => {
        const article = document.createElement('a');   // <── anchor instead of <article>
        article.href      = `post.html?slug=${encodeURIComponent(post.Slug)}`;
        article.className = 'blog-post';

        const publishedDate = post['Published Date']
            ? new Date(post['Published Date']).toLocaleDateString('en-US',
              { year: 'numeric', month: 'short', day: 'numeric' })
            : '';

        const tags = post.Tags.length
            ? `<div class="post-tags">${post.Tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
            : '';

        article.innerHTML = `
            <h2 class="blog-title">${post.Title || 'Untitled'}</h2>
            <div class="post-meta">
                <span class="date">${publishedDate}</span>
                <span class="bullet">&nbsp;·&nbsp;</span>
                <span class="read-time">${post['Time To Read']} min read</span>
            </div>
            ${tags}
            <p class="post-excerpt">${post.Excerpt}</p>
            <div class="post-stats">
                <span class="view-count">${post['View Count']} views</span>
                <span class="comment-count">${post['Comment Count']} comments</span>
                <span class="like-count">${post['Like Count']} likes</span>
            </div>`;
        container.appendChild(article);
    });
}

/* load posts on page ready */
document.addEventListener('DOMContentLoaded', loadPosts);
