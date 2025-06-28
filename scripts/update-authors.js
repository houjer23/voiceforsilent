const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: NEON_DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

// Author mappings - these are the UUIDs that should be in the author field
const AUTHOR_MAPPINGS = {
    '9ba85eb5-a880-4bdf-a28e-be1d43cacba5': 'Ella Jiang',
    'b93b749c-89f0-4fe3-b8fd-5714c12432f8': 'Elaine Ruan'
};

// Based on CSV analysis, we need to re-migrate the author data first
const CSV_AUTHOR_FIXES = [
    { slug: 'how-the-world-rings-in-the-new-year', authorUuid: 'b93b749c-89f0-4fe3-b8fd-5714c12432f8' },
    { slug: 'the-prevalence-of-immigration-and-its-impacts-on-different-countries', authorUuid: 'b93b749c-89f0-4fe3-b8fd-5714c12432f8' },
    { slug: 'a-liam-payne-tribute-the-hidden-struggles-behind-the-curtain-of-fame', authorUuid: 'b93b749c-89f0-4fe3-b8fd-5714c12432f8' },
    { slug: 'us-election', authorUuid: '9ba85eb5-a880-4bdf-a28e-be1d43cacba5' },
    { slug: 'trump-2-0-the-world-bracing-for-round-two-of-his-global-impact', authorUuid: 'b93b749c-89f0-4fe3-b8fd-5714c12432f8' }
];

async function updateAuthors() {
    try {
        console.log('🚀 Starting author update process...');
        
        // First, let's check what authors currently exist
        console.log('📊 Checking current author data...');
        const currentAuthors = await sql`
            SELECT DISTINCT author, COUNT(*) as post_count 
            FROM posts 
            GROUP BY author 
            ORDER BY post_count DESC
        `;
        
        console.log('Current authors in database:');
        currentAuthors.forEach(author => {
            console.log(`  - "${author.author}" (${author.post_count} posts)`);
        });
        
        console.log('\n🔧 Step 1: Fixing missing author UUIDs from CSV data...');
        
        // First, update posts with the correct author UUIDs based on slug matching
        for (const fix of CSV_AUTHOR_FIXES) {
            console.log(`\n🔄 Setting author UUID for "${fix.slug}" to "${fix.authorUuid}"`);
            
            const updateResult = await sql`
                UPDATE posts 
                SET author = ${fix.authorUuid}, updated_at = CURRENT_TIMESTAMP
                WHERE slug = ${fix.slug}
            `;
            
            if (updateResult.count > 0) {
                console.log(`   ✅ Updated ${updateResult.count} post(s)`);
            } else {
                console.log(`   ⚠️ No post found with slug: ${fix.slug}`);
            }
        }
        
        console.log('\n📝 Step 2: Converting author UUIDs to actual names...');
        
        for (const [uuid, authorName] of Object.entries(AUTHOR_MAPPINGS)) {
            console.log(`\n🔄 Updating posts by UUID "${uuid}" to author "${authorName}"`);
            
            // Check if posts with this UUID exist
            const postsToUpdate = await sql`
                SELECT id, title, author 
                FROM posts 
                WHERE author = ${uuid}
            `;
            
            if (postsToUpdate.length === 0) {
                console.log(`   ⚠️ No posts found with author UUID: ${uuid}`);
                continue;
            }
            
            console.log(`   📌 Found ${postsToUpdate.length} posts to update:`);
            postsToUpdate.forEach(post => {
                console.log(`      - "${post.title}" (ID: ${post.id})`);
            });
            
            // Update the author field
            const updateResult = await sql`
                UPDATE posts 
                SET author = ${authorName}, updated_at = CURRENT_TIMESTAMP
                WHERE author = ${uuid}
            `;
            
            console.log(`   ✅ Updated ${updateResult.count || postsToUpdate.length} posts`);
        }
        
        console.log('\n📊 Final author summary:');
        const updatedAuthors = await sql`
            SELECT DISTINCT author, COUNT(*) as post_count 
            FROM posts 
            GROUP BY author 
            ORDER BY post_count DESC
        `;
        
        updatedAuthors.forEach(author => {
            console.log(`  - "${author.author}" (${author.post_count} posts)`);
        });
        
        console.log('\n🎉 Author update completed successfully!');
        
    } catch (error) {
        console.error('❌ Error updating authors:', error);
        throw error;
    }
}

// Run the update
if (require.main === module) {
    updateAuthors()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
} 