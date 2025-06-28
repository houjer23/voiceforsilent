const { neon } = require('@neondatabase/serverless');

// Get database URL from environment
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

// Author mappings - handle UUIDs and normalize author names
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

console.log('Bulk import - Environment check:', {
    hasNeonUrl: !!process.env.NEON_DATABASE_URL,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasNetlifyDbUrl: !!process.env.NETLIFY_DATABASE_URL,
    hasNetlifyDbUrlUnpooled: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
    usingUrl: DATABASE_URL ? 'found' : 'missing'
});

let sql;
try {
    if (DATABASE_URL) {
        sql = neon(DATABASE_URL);
        console.log('✅ Bulk import - Database connection initialized');
    } else {
        console.error('❌ Bulk import - Cannot initialize database - no connection string available');
    }
} catch (initError) {
    console.error('❌ Bulk import - Failed to initialize database connection:', initError);
}

/**
 * Transform CSV post data to database format
 */
function transformPostForDb(csvPost) {
    return {
        author: normalizeAuthor(csvPost.Author),
        main_category: csvPost['Main Category'] || '',
        view_count: parseInt(csvPost['View Count'], 10) || 0,
        excerpt: csvPost.Excerpt || '',
        time_to_read: parseInt(csvPost['Time To Read'], 10) || 0,
        external_id: csvPost.ID || csvPost.UUID || '',
        tags: Array.isArray(csvPost.Tags) ? csvPost.Tags : [],
        uuid: csvPost.UUID || '',
        featured: csvPost.Featured === true || csvPost.Featured === 'true',
        translation_id: csvPost['Translation ID'] || '',
        slug: csvPost.Slug || '',
        cover_image: csvPost['Cover Image'] || '',
        plain_content: csvPost['Plain Content'] || '',
        comment_count: parseInt(csvPost['Comment Count'], 10) || 0,
        language: csvPost.Language || 'en',
        published_date: csvPost['Published Date'] ? new Date(csvPost['Published Date']) : new Date(),
        pinned: csvPost.Pinned === true || csvPost.Pinned === 'true',
        categories: Array.isArray(csvPost.Categories) ? csvPost.Categories : [],
        rich_content: csvPost['Rich Content'] || {},
        post_page_url: csvPost['Post Page URL'] || '',
        cover_image_displayed: csvPost['Cover Image Displayed'] === true || csvPost['Cover Image Displayed'] === 'true',
        title: csvPost.Title || 'Untitled',
        last_published_date: csvPost['Last Published Date'] ? new Date(csvPost['Last Published Date']) : null,
        internal_id: csvPost['Internal ID'] || '',
        related_posts: Array.isArray(csvPost['Related Posts']) ? csvPost['Related Posts'] : [],
        hashtags: Array.isArray(csvPost.Hashtags) ? csvPost.Hashtags : [],
        like_count: parseInt(csvPost['Like Count'], 10) || 0
    };
}

exports.handler = async (event, context) => {
    console.log('Bulk import function called:', {
        method: event.httpMethod,
        path: event.path
    });

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Check if database is available
    if (!DATABASE_URL || !sql) {
        console.error('❌ Bulk import - Database not available');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database configuration error',
                message: 'Database connection not available'
            })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { posts } = body;

        if (!Array.isArray(posts) || posts.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid request',
                    message: 'Posts array is required and must not be empty'
                })
            };
        }

        console.log(`Processing bulk import of ${posts.length} posts`);

        // Validate posts and transform to database format
        const dbPosts = [];
        const errors = [];

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            
            // Validate required fields
            if (!post.Slug) {
                errors.push(`Post ${i + 1}: Missing slug`);
                continue;
            }
            
            if (!post.Title) {
                errors.push(`Post ${i + 1}: Missing title`);
                continue;
            }

            try {
                const dbPost = transformPostForDb(post);
                dbPosts.push(dbPost);
            } catch (error) {
                errors.push(`Post ${i + 1}: Transformation error - ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.error('Validation errors:', errors);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Validation failed',
                    message: 'Some posts failed validation',
                    errors: errors
                })
            };
        }

        // Insert posts in batches to avoid overwhelming the database
        const batchSize = 10;
        let imported = 0;
        const importErrors = [];

        for (let i = 0; i < dbPosts.length; i += batchSize) {
            const batch = dbPosts.slice(i, i + batchSize);
            
            try {
                console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dbPosts.length / batchSize)} (${batch.length} posts)`);
                
                for (const post of batch) {
                    try {
                        await sql`
                            INSERT INTO posts (
                                author, main_category, view_count, excerpt, time_to_read,
                                external_id, tags, uuid, featured, translation_id, slug,
                                cover_image, plain_content, comment_count, language,
                                published_date, pinned, categories, rich_content,
                                post_page_url, cover_image_displayed, title,
                                last_published_date, internal_id, related_posts,
                                hashtags, like_count, created_at, updated_at
                            ) VALUES (
                                ${post.author}, ${post.main_category}, ${post.view_count}, 
                                ${post.excerpt}, ${post.time_to_read}, ${post.external_id}, 
                                ${JSON.stringify(post.tags)}, ${post.uuid}, ${post.featured}, 
                                ${post.translation_id}, ${post.slug}, ${post.cover_image}, 
                                ${post.plain_content}, ${post.comment_count}, ${post.language}, 
                                ${post.published_date}, ${post.pinned}, ${JSON.stringify(post.categories)}, 
                                ${JSON.stringify(post.rich_content)}, ${post.post_page_url}, 
                                ${post.cover_image_displayed}, ${post.title}, ${post.last_published_date}, 
                                ${post.internal_id}, ${JSON.stringify(post.related_posts)}, 
                                ${JSON.stringify(post.hashtags)}, ${post.like_count}, 
                                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                            )
                        `;
                        imported++;
                    } catch (insertError) {
                        console.error(`Error inserting post "${post.title}":`, insertError);
                        importErrors.push(`Failed to insert "${post.title}": ${insertError.message}`);
                    }
                }
                
            } catch (batchError) {
                console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, batchError);
                importErrors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${batchError.message}`);
            }
        }

        console.log(`✅ Bulk import completed: ${imported}/${dbPosts.length} posts imported`);

        const response = {
            success: true,
            imported: imported,
            total: dbPosts.length,
            message: `Successfully imported ${imported} out of ${dbPosts.length} posts`
        };

        if (importErrors.length > 0) {
            response.warnings = importErrors;
            response.message += `. ${importErrors.length} posts failed to import.`;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('❌ Bulk import error:', error);
        console.error('Error stack:', error.stack);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                details: error.stack
            })
        };
    }
}; 