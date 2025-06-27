document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Fetching posts from API...');
        
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
        const blogPostsSection = document.querySelector('.blog-section .blog-posts');
        if (blogPostsSection) {
            blogPostsSection.innerHTML = '<div class="error-message">Unable to load posts. Please check your connection and try again.</div>';
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

 