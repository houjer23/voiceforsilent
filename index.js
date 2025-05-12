document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch and parse the Posts.csv file
        console.log('Fetching Posts.csv...');
        const csv = await (await fetch('Posts.csv')).text();
        const posts = parseCSV(csv);
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
        
        // Clear existing content
        blogPostsSection.innerHTML = '';
        
        // Render each post
        topPosts.forEach(post => {
            const postElement = createPostElement(post);
            blogPostsSection.appendChild(postElement);
        });
        
        console.log('Top posts rendered successfully');
    } catch (err) {
        console.error('Error loading posts:', err);
    }
});

// Create a post element
/* ---------- NEW createPostElement ---------- */
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';
  
    /* ── top: title + date ──────────────────── */
    const header = document.createElement('header');
    header.className = 'post-card-header';
  
    const title = document.createElement('h3');
    title.className = 'post-card-title';
    title.textContent = post.Title || 'Untitled';
  
    const date = document.createElement('time');
    date.className = 'post-card-date';
    // Fallback to “Unknown” if no date
    date.textContent = post['Published Date']
        ? new Date(post['Published Date']).toLocaleDateString(undefined,
          { year:'numeric', month:'short', day:'numeric' })
        : 'Unknown';
  
    header.append(title, date);
    article.appendChild(header);
  
    /* ── middle: excerpt ────────────────────── */
    const excerpt = document.createElement('p');
    excerpt.className = 'post-card-excerpt';
    excerpt.textContent =
        post.Excerpt ||
        (post['Plain Content']?.slice(0, 160) + '…') ||
        '';
    article.appendChild(excerpt);
  
    /* ── footer: tags + read-more button ────── */
    const footer = document.createElement('footer');
    footer.className = 'post-card-footer';
  
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
  
    const readMore = document.createElement('a');
    readMore.className = 'post-card-link';
    readMore.href = `post.html?slug=${post.Slug}`;
    readMore.textContent = 'Read More';
    footer.appendChild(readMore);
  
    article.appendChild(footer);
  
    return article;
  }  

/* ----------------------------------------------------------- */
/*  CSV Parser - Using the same code from post.js              */
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