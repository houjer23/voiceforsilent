// python3 -m http.server 8000

async function loadPosts() {
    try {
        const response = await fetch('Posts.csv');
        const csvText = await response.text();
        const posts = parseCSV(csvText);
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('posts-container').innerHTML = '<p>Error loading posts. Please try again later.</p>';
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const posts = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const post = {};
        
        headers.forEach((header, index) => {
            // Remove quotes from the values
            const value = values[index]?.replace(/^"|"$/g, '').trim() || '';
            post[header.replace(/^"|"$/g, '').trim()] = value;
        });
        
        posts.push(post);
    }

    return posts;
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    
    posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.className = 'blog-post';
        
        postElement.innerHTML = `
            <h2>${post.Title}</h2>
            <p>${post.Excerpt || ''}</p>
            <div class="post-meta">
                <span class="read-time">${post['Time To Read'] || ''} min read</span>
                <span class="view-count">${post['View Count'] || '0'} views</span>
            </div>
        `;
        
        container.appendChild(postElement);
    });
}

// Load posts when the page loads
document.addEventListener('DOMContentLoaded', loadPosts); 