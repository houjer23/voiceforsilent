/* post.js – render a single article picked via ?slug=…              */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const slug   = params.get('slug');
    const target = document.getElementById('post');
    
    console.log('Loading post with slug:', slug);

    if (!slug) {
        console.log('No slug provided');
        target.innerHTML = '<div class="error-message">Post not found.</div>';
        return;
    }

    try {
        console.log('Fetching Posts.csv...');
        const csv   = await (await fetch('Posts.csv')).text();
        const posts = parseCSV(csv);
        console.log('Found', posts.length, 'posts');
        
        const post  = posts.find(p => p.Slug === slug);
        console.log('Found post:', post ? 'yes' : 'no');

        if (!post) {
            target.innerHTML = '<div class="error-message">Post not found.</div>';
            return;
        }

        target.innerHTML = renderPost(post);
        console.log('Post rendered successfully');

        // Add smooth scroll behavior for headings
        document.querySelectorAll('.post-content a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    } catch (err) {
        console.error('Error loading post:', err);
        target.innerHTML = '<div class="error-message">Error loading post.</div>';
    }
});

/* ---- very small renderer for the Rich Content format ---- */
function renderPost(post) {
    const html = [];
    
    // Post header section
    html.push('<article class="post-content">');
    html.push('<header class="post-header">');
    
    // Title
    html.push(`<h1 class="post-title">${post.Title || 'Untitled'}</h1>`);
    
    // Post metadata
    html.push('<div class="post-meta">');
    if (post['Published Date']) {
        const date = new Date(post['Published Date'])
            .toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        html.push(`<span class="post-date"><i class="far fa-calendar"></i> ${date}</span>`);
    }
    if (post['Time To Read']) {
        html.push(`<span class="read-time"><i class="far fa-clock"></i> ${post['Time To Read']} min read</span>`);
    }
    html.push('</div>');

    // Tags
    if (post.Tags && post.Tags.length > 0) {
        html.push('<div class="post-tags">');
        post.Tags.forEach(tag => {
            html.push(`<span class="tag">${tag}</span>`);
        });
        html.push('</div>');
    }
    html.push('</header>');

    // Post body
    html.push('<div class="post-body">');
    if (post['Rich Content']?.nodes) {
        post['Rich Content'].nodes.forEach(node => {
            if (node.type === 'PARAGRAPH') {
                const inner = node.nodes?.map(n => {
                    if (!n.textData) return '';
                    return decorateText(n.textData);
                }).join('') || '';
                
                if (inner.trim()) {
                    html.push(`<p>${inner}</p>`);
                } else {
                    html.push('<br>'); // Empty paragraphs become line breaks
                }
            }
        });
    }
    html.push('</div>');

    // Post footer with stats
    html.push('<footer class="post-footer">');
    // Navigation
    html.push('<div class="post-navigation">');
    html.push('<a href="index.html" class="back-link"><i class="fas fa-home"></i> Back to Home</a>');
    html.push('<a href="blog.html" class="back-link"><i class="fas fa-arrow-left"></i> Back to Blog</a>');
    html.push('</div>');
    html.push('</footer>');
    
    html.push('</article>');
    return html.join('\n');
}

function decorateText(t) {
    let text = t.text;
    if (!t.decorations) return text;
    
    t.decorations.forEach(decoration => {
        switch (decoration.type) {
            case 'BOLD':
                text = `<strong>${text}</strong>`;
                break;
            case 'ITALIC':
                text = `<em>${text}</em>`;
                break;
            case 'UNDERLINE':
                text = `<u>${text}</u>`;
                break;
            case 'COLOR':
                if (decoration.colorData) {
                    const { foreground, background } = decoration.colorData;
                    let style = '';
                    if (foreground && foreground !== 'rgb(0, 0, 0)') {
                        style += `color: ${foreground};`;
                    }
                    if (background && background !== 'transparent') {
                        style += `background-color: ${background};`;
                    }
                    if (style) {
                        text = `<span style="${style}">${text}</span>`;
                    }
                }
                break;
        }
    });
    
    return text;
}

/* ----------------------------------------------------------- */
/*  mini CSV helper – identical to the one already in blog.js  */
/*  (copy‑paste or move into a shared module in real projects)  */
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