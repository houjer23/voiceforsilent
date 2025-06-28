const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: NEON_DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixRemainingAuthors() {
    try {
        console.log('🚀 Fixing remaining posts with NULL authors...');
        
        // Update posts 6-11 to have "Elaine Ruan" as author
        // Based on CSV data, these all had UUID "b93b749c-89f0-4fe3-b8fd-5714c12432f8"
        const result = await sql`
            UPDATE posts 
            SET author = 'Elaine Ruan' 
            WHERE id IN (6, 7, 8, 9, 10, 11) AND author IS NULL
        `;
        
        console.log(`✅ Updated ${result.length || result.rowCount || result.count || 'some'} posts`);
        
        // Verify the update
        console.log('\n📊 Checking updated authors...');
        const updatedPosts = await sql`
            SELECT id, title, author 
            FROM posts 
            WHERE id IN (6, 7, 8, 9, 10, 11)
            ORDER BY id
        `;
        
        console.log('Updated posts:');
        updatedPosts.forEach(post => {
            console.log(`  ID ${post.id}: "${post.author}" - ${post.title}`);
        });
        
        // Check final author counts
        console.log('\n📈 Final author distribution:');
        const authorCounts = await sql`
            SELECT author, COUNT(*) as count 
            FROM posts 
            GROUP BY author 
            ORDER BY count DESC
        `;
        
        authorCounts.forEach(row => {
            console.log(`  ${row.author || 'NULL'}: ${row.count} posts`);
        });
        
    } catch (error) {
        console.error('❌ Error updating authors:', error);
        throw error;
    }
}

// Run the update
if (require.main === module) {
    fixRemainingAuthors()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { fixRemainingAuthors }; 