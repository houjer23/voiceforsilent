import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

/**
 * Transform database row to match original CSV structure
 */
function transformPostFromDb(dbPost) {
    return {
        'Author': dbPost.author,
        'Main Category': dbPost.main_category,
        'View Count': dbPost.view_count,
        'Excerpt': dbPost.excerpt,
        'Time To Read': dbPost.time_to_read,
        'ID': dbPost.external_id,
        'Tags': dbPost.tags || [],
        'UUID': dbPost.uuid,
        'Featured': dbPost.featured,
        'Translation ID': dbPost.translation_id,
        'Slug': dbPost.slug,
        'Cover Image': dbPost.cover_image,
        'Plain Content': dbPost.plain_content,
        'Comment Count': dbPost.comment_count,
        'Language': dbPost.language,
        'Published Date': dbPost.published_date,
        'Pinned': dbPost.pinned,
        'Categories': dbPost.categories || [],
        'Rich Content': dbPost.rich_content || {},
        'Post Page URL': dbPost.post_page_url,
        'Cover Image Displayed': dbPost.cover_image_displayed,
        'Title': dbPost.title,
        'Last Published Date': dbPost.last_published_date,
        'Internal ID': dbPost.internal_id,
        'Related Posts': dbPost.related_posts || [],
        'Hashtags': dbPost.hashtags || [],
        'Like Count': dbPost.like_count
    };
}

export const handler = async (event, context) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    try {
        const { httpMethod, path, queryStringParameters } = event;
        const pathParts = path.split('/').filter(Boolean);

        // GET /posts - Get all posts or search
        if (httpMethod === 'GET' && pathParts[pathParts.length - 1] === 'posts') {
            const {
                limit = '50',
                offset = '0',
                search,
                category,
                tag,
                featured,
                language = 'en'
            } = queryStringParameters || {};

            let query = `
                SELECT 
                    id, author, main_category, view_count, excerpt, time_to_read,
                    external_id, tags, uuid, featured, translation_id, slug,
                    cover_image, plain_content, comment_count, language,
                    published_date, pinned, categories, rich_content,
                    post_page_url, cover_image_displayed, title,
                    last_published_date, internal_id, related_posts,
                    hashtags, like_count
                FROM posts
                WHERE language = $1
            `;

            const params = [language];
            let paramCount = 1;

            // Add search filter
            if (search) {
                paramCount++;
                query += ` AND (
                    title ILIKE $${paramCount} OR
                    excerpt ILIKE $${paramCount} OR
                    plain_content ILIKE $${paramCount}
                )`;
                params.push(`%${search}%`);
            }

            // Add category filter
            if (category) {
                paramCount++;
                query += ` AND (
                    main_category = $${paramCount} OR
                    categories::text ILIKE $${paramCount + 1}
                )`;
                params.push(category, `%${category}%`);
                paramCount++;
            }

            // Add tag filter
            if (tag) {
                paramCount++;
                query += ` AND tags::text ILIKE $${paramCount}`;
                params.push(`%${tag}%`);
            }

            // Add featured filter
            if (featured !== undefined) {
                paramCount++;
                query += ` AND featured = $${paramCount}`;
                params.push(featured === 'true');
            }

            // Add sorting and pagination
            query += ` ORDER BY published_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(parseInt(limit), parseInt(offset));

            const result = await sql(query, params);
            const posts = result.map(transformPostFromDb);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    posts,
                    count: posts.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                })
            };
        }

        // GET /posts/{slug} - Get single post
        if (httpMethod === 'GET' && pathParts.length >= 2) {
            const slug = pathParts[pathParts.length - 1];

            const result = await sql`
                SELECT 
                    id, author, main_category, view_count, excerpt, time_to_read,
                    external_id, tags, uuid, featured, translation_id, slug,
                    cover_image, plain_content, comment_count, language,
                    published_date, pinned, categories, rich_content,
                    post_page_url, cover_image_displayed, title,
                    last_published_date, internal_id, related_posts,
                    hashtags, like_count
                FROM posts 
                WHERE slug = ${slug}
            `;

            if (result.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Post not found' })
                };
            }

            // Increment view count
            await sql`
                UPDATE posts 
                SET view_count = view_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE slug = ${slug}
            `;

            const post = transformPostFromDb(result[0]);
            post['View Count'] = (post['View Count'] || 0) + 1; // Update the returned post

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ post })
            };
        }

        // If no route matches
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
}; 