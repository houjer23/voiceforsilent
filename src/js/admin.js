document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
});

let parsedPosts = [];
let existingPosts = [];
let newPosts = [];

// Author mappings - same as in posts-bulk.js for consistency
const AUTHOR_MAPPINGS = {
    '9ba85eb5-a880-4bdf-a28e-be1d43cacba5': 'Ella Jiang',
    'b93b749c-89f0-4fe3-b8fd-5714c12432f8': 'Elaine Ruan'
};

// Normalize author names to handle variations
function normalizeAuthor(author) {
    if (!author || author.trim() === '') {
        return 'Anonymous';
    }
    
    // Check if it's a UUID that needs mapping
    if (AUTHOR_MAPPINGS[author]) {
        return AUTHOR_MAPPINGS[author];
    }
    
    // Normalize common variations
    const normalized = author.trim();
    const authorMap = {
        'Ella': 'Ella Jiang',
        'Elaine': 'Elaine Ruan',
        'ella': 'Ella Jiang',
        'elaine': 'Elaine Ruan',
        'Ella J': 'Ella Jiang',
        'Elaine R': 'Elaine Ruan'
    };
    
    return authorMap[normalized] || normalized;
}

function initializeAdmin() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const cancelBtn = document.getElementById('cancelBtn');
    const importBtn = document.getElementById('importBtn');
    const newUploadBtn = document.getElementById('newUploadBtn');

    // File upload handlers
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Button handlers
    cancelBtn.addEventListener('click', resetUpload);
    importBtn.addEventListener('click', importPosts);
    newUploadBtn.addEventListener('click', resetUpload);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please select a CSV file.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('File size must be less than 10MB.');
        return;
    }

    showLoading();

    try {
        const csvText = await readFileAsText(file);
        parsedPosts = parseCSV(csvText);
        
        if (parsedPosts.length === 0) {
            showError('No valid posts found in the CSV file.');
            return;
        }

        // Get existing posts from database
        await loadExistingPosts();
        
        // Compare and categorize posts
        categorizePost();
        
        // Show preview
        showPreview();
        
    } catch (error) {
        console.error('Error processing file:', error);
        showError('Error processing CSV file. Please check the format and try again.');
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function loadExistingPosts() {
    try {
        const response = await fetch('/.netlify/functions/posts?limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        existingPosts = data.posts || [];
        console.log(`Loaded ${existingPosts.length} existing posts`);
    } catch (error) {
        console.error('Error loading existing posts:', error);
        existingPosts = [];
    }
}

function categorizePost() {
    const existingSlugs = new Set(existingPosts.map(post => post.Slug));
    
    newPosts = parsedPosts.filter(post => !existingSlugs.has(post.Slug));
    
    console.log(`Found ${newPosts.length} new posts out of ${parsedPosts.length} total`);
}

function showPreview() {
    hideLoading();
    
    const previewSection = document.getElementById('previewSection');
    const postsContainer = document.getElementById('postsContainer');
    const newCountSpan = document.getElementById('newCount');
    const existingCountSpan = document.getElementById('existingCount');
    const importBtn = document.getElementById('importBtn');
    
    // Update counts
    const existingCount = parsedPosts.length - newPosts.length;
    newCountSpan.textContent = `${newPosts.length} New`;
    existingCountSpan.textContent = `${existingCount} Existing`;
    
    // Check for author normalization warnings
    const authorWarnings = [];
    newPosts.forEach(post => {
        const originalAuthor = post.Author || 'Anonymous';
        const normalizedAuthor = normalizeAuthor(originalAuthor);
        if (originalAuthor !== normalizedAuthor) {
            authorWarnings.push(`"${originalAuthor}" → "${normalizedAuthor}"`);
        }
    });
    
    // Show author warning if any normalizations occurred
    if (authorWarnings.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid #ffeeba;
        `;
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> 
            <strong>Author names will be normalized:</strong><br>
            ${authorWarnings.join('<br>')}
        `;
        
        // Insert warning before the posts container
        const previewHeader = document.querySelector('.preview-header');
        previewHeader.parentNode.insertBefore(warningDiv, previewHeader.nextSibling);
    }
    
    // Enable import button if there are new posts
    importBtn.disabled = newPosts.length === 0;
    
    // Clear container
    postsContainer.innerHTML = '';
    
    // Show new posts first
    newPosts.forEach(post => {
        const postElement = createPostPreview(post, true);
        postsContainer.appendChild(postElement);
    });
    
    // Show existing posts (limited to first 10 for display)
    const existingPostsInCsv = parsedPosts.filter(post => 
        existingPosts.some(existing => existing.Slug === post.Slug)
    );
    
    existingPostsInCsv.slice(0, 10).forEach(post => {
        const postElement = createPostPreview(post, false);
        postsContainer.appendChild(postElement);
    });
    
    if (existingPostsInCsv.length > 10) {
        const moreElement = document.createElement('div');
        moreElement.className = 'post-preview existing';
        moreElement.innerHTML = `
            <div class="post-status status-existing">Existing</div>
            <h3>... and ${existingPostsInCsv.length - 10} more existing posts</h3>
            <p>These posts already exist in the database and will be skipped.</p>
        `;
        postsContainer.appendChild(moreElement);
    }
    
    previewSection.style.display = 'block';
}

function createPostPreview(post, isNew) {
    const div = document.createElement('div');
    div.className = `post-preview ${isNew ? 'new' : 'existing'}`;
    
    const publishedDate = post['Published Date'] 
        ? new Date(post['Published Date']).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : 'No date';
    
    const tags = Array.isArray(post.Tags) ? post.Tags.slice(0, 3) : [];
    const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    // Normalize author for display and show original if different
    const originalAuthor = post.Author || 'Anonymous';
    const normalizedAuthor = normalizeAuthor(originalAuthor);
    const authorDisplay = originalAuthor !== normalizedAuthor 
        ? `${normalizedAuthor} <span style="color: #666; font-size: 0.9em;">(was: ${originalAuthor})</span>`
        : normalizedAuthor;
    
    div.innerHTML = `
        <div class="post-status ${isNew ? 'status-new' : 'status-existing'}">
            ${isNew ? 'New' : 'Existing'}
        </div>
        <h3>${post.Title || 'Untitled'}</h3>
        <p><strong>Author:</strong> ${authorDisplay}</p>
        <p><strong>Date:</strong> ${publishedDate}</p>
        <p><strong>Slug:</strong> ${post.Slug}</p>
        ${tagsHtml ? `<div class="post-tags" style="margin-top: 0.5rem;">${tagsHtml}</div>` : ''}
        <p class="post-excerpt">${post.Excerpt || post['Plain Content']?.slice(0, 100) + '...' || 'No excerpt'}</p>
    `;
    
    return div;
}

async function importPosts() {
    if (newPosts.length === 0) {
        showError('No new posts to import.');
        return;
    }
    
    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
    
    try {
        const response = await fetch('/.netlify/functions/posts-bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                posts: newPosts
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showSuccess(result.imported || newPosts.length);
        
    } catch (error) {
        console.error('Error importing posts:', error);
        showError(`Error importing posts: ${error.message}`);
        
        // Re-enable button
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="fas fa-database"></i> Import New Articles';
    }
}

function showSuccess(importedCount) {
    const previewSection = document.getElementById('previewSection');
    const successSection = document.getElementById('successSection');
    const successMessage = document.getElementById('successMessage');
    
    successMessage.textContent = `Successfully imported ${importedCount} new articles into the database.`;
    
    previewSection.style.display = 'none';
    successSection.classList.remove('hidden');
}

function resetUpload() {
    const uploadSection = document.querySelector('.upload-section');
    const previewSection = document.getElementById('previewSection');
    const successSection = document.getElementById('successSection');
    const fileInput = document.getElementById('fileInput');
    
    // Reset file input
    fileInput.value = '';
    
    // Reset data
    parsedPosts = [];
    existingPosts = [];
    newPosts = [];
    
    // Show upload section, hide others
    uploadSection.style.display = 'block';
    previewSection.style.display = 'none';
    successSection.classList.add('hidden');
    
    hideLoading();
    clearErrors();
}

function showLoading() {
    const uploadSection = document.querySelector('.upload-section');
    const loadingSection = document.getElementById('loadingSection');
    
    uploadSection.style.display = 'none';
    loadingSection.style.display = 'block';
}

function hideLoading() {
    const loadingSection = document.getElementById('loadingSection');
    loadingSection.style.display = 'none';
}

function showError(message) {
    hideLoading();
    
    // Remove any existing error messages
    clearErrors();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    
    const uploadSection = document.querySelector('.upload-section');
    uploadSection.insertBefore(errorDiv, uploadSection.firstChild);
    
    // Show upload section
    uploadSection.style.display = 'block';
}

function clearErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => error.remove());
    
    // Also clear warning messages
    const warningMessages = document.querySelectorAll('.warning-message');
    warningMessages.forEach(warning => warning.remove());
}

/* ------------------------------------------------------------------ */
/* CSV Parser - Same as used in other files                          */
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