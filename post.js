/* post.js – render a single article picked via ?slug=…              */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const slug   = params.get('slug');
    const target = document.getElementById('post');
    
    console.log('Loading post with slug:', slug);

    if (!slug) {
        console.log('No slug provided');
        target.innerHTML = '<p>Post not found.</p>';
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
            target.innerHTML = '<p>Post not found.</p>';
            return;
        }

        target.innerHTML = renderPost(post);
        console.log('Post rendered successfully');
    } catch (err) {
        console.error('Error loading post:', err);
        target.innerHTML = '<p>Error loading post.</p>';
    }
});

/* ---- very small renderer for the Rich Content format ---- */
function renderPost(post) {
    const html = [];
    html.push(`<h1 class="post-title">${post.Title || 'Untitled'}</h1>`);

    if (post['Published Date']) {
        const date = new Date(post['Published Date'])
            .toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
        html.push(`<p class="post-date">${date}</p>`);
    }

    /*  ↓―― basic walk of the tiptap‑style JSON (paragraph + bold only). 
          Expand as you meet new node types.                           */
    (post['Rich Content']?.nodes || []).forEach(node => {
        if (node.type === 'PARAGRAPH') {
            const inner = node.nodes?.map(n => n.textData
                ? decorateText(n.textData) : '').join('') || '';
            html.push(`<p>${inner}</p>`);
        }
    });

    return html.join('\n');
}

function decorateText(t) {
    /* look for "BOLD" decoration only; extend for italic, links, etc. */
    if (!t.decorations?.some(d => d.type === 'BOLD')) return t.text;
    return `<strong>${t.text}</strong>`;
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