#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: NEON_DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

// Database schema
const createTablesSQL = `
-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255),
    main_category VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    excerpt TEXT,
    time_to_read INTEGER,
    external_id VARCHAR(255),
    tags JSONB DEFAULT '[]',
    uuid VARCHAR(255) UNIQUE,
    featured BOOLEAN DEFAULT false,
    translation_id VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    cover_image VARCHAR(500),
    plain_content TEXT,
    comment_count INTEGER DEFAULT 0,
    language VARCHAR(10) DEFAULT 'en',
    published_date TIMESTAMP,
    pinned BOOLEAN DEFAULT false,
    categories JSONB DEFAULT '[]',
    rich_content JSONB,
    post_page_url VARCHAR(500),
    cover_image_displayed BOOLEAN DEFAULT false,
    title VARCHAR(500) NOT NULL,
    last_published_date TIMESTAMP,
    internal_id VARCHAR(255),
    related_posts JSONB DEFAULT '[]',
    hashtags JSONB DEFAULT '[]',
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts(published_date);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured);
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
`;

// Helper function to parse CSV data
function parseCsvValue(value, fieldName) {
    if (!value || value.trim() === '') {
        // Return appropriate defaults for different field types
        if (['tags', 'categories', 'related_posts', 'hashtags'].includes(fieldName.toLowerCase())) {
            return [];
        }
        if (['view_count', 'comment_count', 'like_count', 'time_to_read'].includes(fieldName.toLowerCase())) {
            return 0;
        }
        if (['featured', 'pinned', 'cover_image_displayed'].includes(fieldName.toLowerCase())) {
            return false;
        }
        return null;
    }

    // Handle JSON fields
    if (['tags', 'categories', 'related_posts', 'hashtags'].includes(fieldName.toLowerCase())) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    // Handle rich content JSON
    if (fieldName.toLowerCase() === 'rich_content') {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }

    // Handle boolean fields
    if (['featured', 'pinned', 'cover_image_displayed'].includes(fieldName.toLowerCase())) {
        return value.toLowerCase() === 'true';
    }

    // Handle integer fields
    if (['view_count', 'comment_count', 'like_count', 'time_to_read'].includes(fieldName.toLowerCase())) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Handle date fields
    if (['published_date', 'last_published_date'].includes(fieldName.toLowerCase())) {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
    }

    return value;
}

// Main migration function
async function migrate() {
    try {
        console.log('🚀 Starting migration to Neon database...');
        
        // Create tables
        console.log('📦 Creating database tables...');
        
        // Create posts table
        await sql`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                author VARCHAR(255),
                main_category VARCHAR(255),
                view_count INTEGER DEFAULT 0,
                excerpt TEXT,
                time_to_read INTEGER,
                external_id VARCHAR(255),
                tags JSONB DEFAULT '[]',
                uuid VARCHAR(255) UNIQUE,
                featured BOOLEAN DEFAULT false,
                translation_id VARCHAR(255),
                slug VARCHAR(255) UNIQUE NOT NULL,
                cover_image VARCHAR(500),
                plain_content TEXT,
                comment_count INTEGER DEFAULT 0,
                language VARCHAR(10) DEFAULT 'en',
                published_date TIMESTAMP,
                pinned BOOLEAN DEFAULT false,
                categories JSONB DEFAULT '[]',
                rich_content JSONB,
                post_page_url VARCHAR(500),
                cover_image_displayed BOOLEAN DEFAULT false,
                title VARCHAR(500) NOT NULL,
                last_published_date TIMESTAMP,
                internal_id VARCHAR(255),
                related_posts JSONB DEFAULT '[]',
                hashtags JSONB DEFAULT '[]',
                like_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts(published_date)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language)`;
        
        console.log('✅ Tables created successfully');

        // Read and process CSV files
        const csvFiles = ['Posts.csv', 'Posts_prev.csv'];
        
        for (const csvFile of csvFiles) {
            if (!fs.existsSync(csvFile)) {
                console.log(`⚠️ Warning: ${csvFile} not found, skipping...`);
                continue;
            }

            console.log(`📖 Processing ${csvFile}...`);
            const posts = [];

            await new Promise((resolve, reject) => {
                fs.createReadStream(csvFile)
                    .pipe(csv())
                    .on('data', (row) => {
                        // Convert CSV row to database format
                        const post = {
                            author: parseCsvValue(row.Author, 'author'),
                            main_category: parseCsvValue(row['Main Category'], 'main_category'),
                            view_count: parseCsvValue(row['View Count'], 'view_count'),
                            excerpt: parseCsvValue(row.Excerpt, 'excerpt'),
                            time_to_read: parseCsvValue(row['Time To Read'], 'time_to_read'),
                            external_id: parseCsvValue(row.ID, 'external_id'),
                            tags: parseCsvValue(row.Tags, 'tags'),
                            uuid: parseCsvValue(row.UUID, 'uuid'),
                            featured: parseCsvValue(row.Featured, 'featured'),
                            translation_id: parseCsvValue(row['Translation ID'], 'translation_id'),
                            slug: parseCsvValue(row.Slug, 'slug'),
                            cover_image: parseCsvValue(row['Cover Image'], 'cover_image'),
                            plain_content: parseCsvValue(row['Plain Content'], 'plain_content'),
                            comment_count: parseCsvValue(row['Comment Count'], 'comment_count'),
                            language: parseCsvValue(row.Language, 'language') || 'en',
                            published_date: parseCsvValue(row['Published Date'], 'published_date'),
                            pinned: parseCsvValue(row.Pinned, 'pinned'),
                            categories: parseCsvValue(row.Categories, 'categories'),
                            rich_content: parseCsvValue(row['Rich Content'], 'rich_content'),
                            post_page_url: parseCsvValue(row['Post Page URL'], 'post_page_url'),
                            cover_image_displayed: parseCsvValue(row['Cover Image Displayed'], 'cover_image_displayed'),
                            title: parseCsvValue(row.Title, 'title'),
                            last_published_date: parseCsvValue(row['Last Published Date'], 'last_published_date'),
                            internal_id: parseCsvValue(row['Internal ID'], 'internal_id'),
                            related_posts: parseCsvValue(row['Related Posts'], 'related_posts'),
                            hashtags: parseCsvValue(row.Hashtags, 'hashtags'),
                            like_count: parseCsvValue(row['Like Count'], 'like_count')
                        };

                        // Only add posts with valid slug and title
                        if (post.slug && post.title) {
                            posts.push(post);
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            console.log(`📊 Found ${posts.length} posts in ${csvFile}`);

            // Insert posts into database
            if (posts.length > 0) {
                for (const post of posts) {
                    try {
                        await sql`
                            INSERT INTO posts (
                                author, main_category, view_count, excerpt, time_to_read,
                                external_id, tags, uuid, featured, translation_id, slug,
                                cover_image, plain_content, comment_count, language,
                                published_date, pinned, categories, rich_content,
                                post_page_url, cover_image_displayed, title,
                                last_published_date, internal_id, related_posts,
                                hashtags, like_count
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
                                ${JSON.stringify(post.hashtags)}, ${post.like_count}
                            )
                            ON CONFLICT (slug) DO UPDATE SET
                                author = EXCLUDED.author,
                                main_category = EXCLUDED.main_category,
                                view_count = EXCLUDED.view_count,
                                excerpt = EXCLUDED.excerpt,
                                time_to_read = EXCLUDED.time_to_read,
                                external_id = EXCLUDED.external_id,
                                tags = EXCLUDED.tags,
                                uuid = EXCLUDED.uuid,
                                featured = EXCLUDED.featured,
                                translation_id = EXCLUDED.translation_id,
                                cover_image = EXCLUDED.cover_image,
                                plain_content = EXCLUDED.plain_content,
                                comment_count = EXCLUDED.comment_count,
                                language = EXCLUDED.language,
                                published_date = EXCLUDED.published_date,
                                pinned = EXCLUDED.pinned,
                                categories = EXCLUDED.categories,
                                rich_content = EXCLUDED.rich_content,
                                post_page_url = EXCLUDED.post_page_url,
                                cover_image_displayed = EXCLUDED.cover_image_displayed,
                                title = EXCLUDED.title,
                                last_published_date = EXCLUDED.last_published_date,
                                internal_id = EXCLUDED.internal_id,
                                related_posts = EXCLUDED.related_posts,
                                hashtags = EXCLUDED.hashtags,
                                like_count = EXCLUDED.like_count,
                                updated_at = CURRENT_TIMESTAMP
                        `;
                    } catch (error) {
                        console.error(`❌ Error inserting post "${post.title}":`, error.message);
                    }
                }
                console.log(`✅ Imported ${posts.length} posts from ${csvFile}`);
            }
        }

        // Verify migration
        const result = await sql`SELECT COUNT(*) as count FROM posts`;
        console.log(`🎉 Migration completed! Total posts in database: ${result[0].count}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrate(); 