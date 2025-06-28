document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Fetching posts from database...');
        
        // Fetch posts from the API endpoint
        const response = await fetch('/.netlify/functions/posts?limit=3&featured=true');
        
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
            }
            
            console.log('Fallback to CSV successful');
        } catch (csvErr) {
            console.error('CSV fallback also failed:', csvErr);
            const blogPostsSection = document.querySelector('.blog-section .blog-posts');
            if (blogPostsSection) {
                blogPostsSection.innerHTML = '<div class="error-message">Unable to load posts. Please try again later.</div>';
            }
        }
    }
});

// Create a post element
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
    // Fallback to "Unknown" if no date
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