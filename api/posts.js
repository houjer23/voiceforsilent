// Database API for posts using Neon
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use environment variable for database URL
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
}

const sql = neon(DATABASE_URL);

/**
 * Get all posts, optionally with pagination and sorting
 */
export async function getAllPosts(options = {}) {
    const {
        limit = null,
        offset = 0,
        sortBy = 'published_date',
        sortOrder = 'DESC',
        language = null,
        featured = null
    } = options;

    try {
        let query = `
            SELECT 
                id, author, main_category, view_count, excerpt, time_to_read,
                external_id, tags, uuid, featured, translation_id, slug,
                cover_image, plain_content, comment_count, language,
                published_date, pinned, categories, rich_content,
                post_page_url, cover_image_displayed, title,
                last_published_date, internal_id, related_posts,
                hashtags, like_count, created_at, updated_at
            FROM posts
            WHERE 1=1
        `;

        const params = [];

        // Add filters
        if (language) {
            query += ` AND language = $${params.length + 1}`;
            params.push(language);
        }

        if (featured !== null) {
            query += ` AND featured = $${params.length + 1}`;
            params.push(featured);
        }

        // Add sorting
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Add pagination
        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(limit);
        }

        if (offset > 0) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(offset);
        }

        const result = await sql(query, params);
        return result.map(transformPostFromDb);
    } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
    }
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug) {
    try {
        const result = await sql`
            SELECT 
                id, author, main_category, view_count, excerpt, time_to_read,
                external_id, tags, uuid, featured, translation_id, slug,
                cover_image, plain_content, comment_count, language,
                published_date, pinned, categories, rich_content,
                post_page_url, cover_image_displayed, title,
                last_published_date, internal_id, related_posts,
                hashtags, like_count, created_at, updated_at
            FROM posts 
            WHERE slug = ${slug}
        `;

        if (result.length === 0) {
            return null;
        }

        return transformPostFromDb(result[0]);
    } catch (error) {
        console.error('Error fetching post by slug:', error);
        throw error;
    }
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(limit = 3) {
    return getAllPosts({ 
        featured: true, 
        limit,
        sortBy: 'published_date',
        sortOrder: 'DESC'
    });
}

/**
 * Get recent posts
 */
export async function getRecentPosts(limit = 10) {
    return getAllPosts({ 
        limit,
        sortBy: 'published_date',
        sortOrder: 'DESC'
    });
}

/**
 * Search posts by title, excerpt, or content
 */
export async function searchPosts(searchTerm, limit = 20) {
    try {
        const result = await sql`
            SELECT 
                id, author, main_category, view_count, excerpt, time_to_read,
                external_id, tags, uuid, featured, translation_id, slug,
                cover_image, plain_content, comment_count, language,
                published_date, pinned, categories, rich_content,
                post_page_url, cover_image_displayed, title,
                last_published_date, internal_id, related_posts,
                hashtags, like_count, created_at, updated_at
            FROM posts 
            WHERE 
                title ILIKE ${'%' + searchTerm + '%'} OR
                excerpt ILIKE ${'%' + searchTerm + '%'} OR
                plain_content ILIKE ${'%' + searchTerm + '%'}
            ORDER BY published_date DESC
            LIMIT ${limit}
        `;

        return result.map(transformPostFromDb);
    } catch (error) {
        console.error('Error searching posts:', error);
        throw error;
    }
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(category, limit = 20) {
    try {
        const result = await sql`
            SELECT 
                id, author, main_category, view_count, excerpt, time_to_read,
                external_id, tags, uuid, featured, translation_id, slug,
                cover_image, plain_content, comment_count, language,
                published_date, pinned, categories, rich_content,
                post_page_url, cover_image_displayed, title,
                last_published_date, internal_id, related_posts,
                hashtags, like_count, created_at, updated_at
            FROM posts 
            WHERE 
                main_category = ${category} OR
                categories::text ILIKE ${'%' + category + '%'}
            ORDER BY published_date DESC
            LIMIT ${limit}
        `;

        return result.map(transformPostFromDb);
    } catch (error) {
        console.error('Error fetching posts by category:', error);
        throw error;
    }
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tag, limit = 20) {
    try {
        const result = await sql`
            SELECT 
                id, author, main_category, view_count, excerpt, time_to_read,
                external_id, tags, uuid, featured, translation_id, slug,
                cover_image, plain_content, comment_count, language,
                published_date, pinned, categories, rich_content,
                post_page_url, cover_image_displayed, title,
                last_published_date, internal_id, related_posts,
                hashtags, like_count, created_at, updated_at
            FROM posts 
            WHERE tags::text ILIKE ${'%' + tag + '%'}
            ORDER BY published_date DESC
            LIMIT ${limit}
        `;

        return result.map(transformPostFromDb);
    } catch (error) {
        console.error('Error fetching posts by tag:', error);
        throw error;
    }
}

/**
 * Update view count for a post
 */
export async function incrementViewCount(slug) {
    try {
        await sql`
            UPDATE posts 
            SET view_count = view_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE slug = ${slug}
        `;
    } catch (error) {
        console.error('Error incrementing view count:', error);
        throw error;
    }
}

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
        'Like Count': dbPost.like_count,
        // Additional database fields
        'id': dbPost.id,
        'created_at': dbPost.created_at,
        'updated_at': dbPost.updated_at
    };
} 