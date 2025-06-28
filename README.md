# VoiceForSilence Blog Platform

A modern blog platform built with vanilla JavaScript, HTML, CSS, and powered by Netlify Functions with a Neon PostgreSQL database.

## 📁 Project Structure

```
VoiceForSilence/
├── src/                          # Source code
│   ├── html/                     # HTML templates
│   │   ├── index.html           # Homepage
│   │   ├── blog.html            # Blog listing page
│   │   ├── post.html            # Individual post page
│   │   └── about.html           # About page
│   ├── css/                      # Stylesheets
│   │   └── styles.css           # Main stylesheet
│   └── js/                       # Client-side JavaScript
│       ├── index.js             # Homepage functionality
│       ├── blog.js              # Blog listing functionality
│       └── post.js              # Individual post functionality
├── scripts/                      # Utility scripts
│   ├── migrate.js               # Database migration script
│   ├── update-authors.js        # Author information updater
│   ├── fix-remaining-authors.js # Author fix script
│   └── build.js                 # Build script for deployment
├── assets/                       # Static assets
│   ├── about.avif              # About page image
│   └── default-avatar.svg       # Default avatar icon
├── data/                         # Data files
│   ├── Posts.csv               # Current posts data
│   └── Posts_prev.csv          # Previous posts backup
├── netlify/                      # Netlify Functions
│   └── functions/
│       └── posts.js            # API endpoints for posts
├── dist/                         # Built files for deployment
└── config files...              # Package.json, netlify.toml, etc.
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Netlify CLI
- Neon PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VoiceForSilence
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   NEON_DATABASE_URL=your_neon_database_url
   NETLIFY_DATABASE_URL_UNPOOLED=your_unpooled_connection_url
   ```

4. **Run database migration** (first time only)
   ```bash
   npm run migrate
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 📝 Available Scripts

- `npm run build` - Build the project for deployment
- `npm run migrate` - Run database migration from CSV
- `npm run update-authors` - Update author information in database
- `npm run dev` - Start local development server
- `npm run deploy` - Build and deploy to Netlify
- `npm start` - Start development server (alias for dev)

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following main table:

### Posts Table
- `id` - Primary key
- `author` - Post author name
- `title` - Post title
- `slug` - URL-friendly identifier
- `excerpt` - Post preview text
- `plain_content` - Full post content
- `published_date` - Publication timestamp
- `view_count` - Number of views
- `featured` - Featured post flag
- `language` - Content language
- And more fields for metadata...

## 🌐 API Endpoints

### GET `/.netlify/functions/posts`
Retrieve all posts with optional pagination and filtering.

Query parameters:
- `limit` - Number of posts to return
- `offset` - Number of posts to skip
- `featured` - Filter by featured status

### GET `/.netlify/functions/posts/{slug}`
Retrieve a specific post by its slug.

## 🎨 Features

- **Responsive Design** - Works on all device sizes
- **Database Backend** - PostgreSQL with Neon serverless
- **Author Management** - Proper author attribution
- **View Tracking** - Post view counts
- **CSV Import** - Migrate from CSV data
- **SEO Friendly** - Proper meta tags and URLs

## 🔧 Development

### Adding New Posts
Posts are managed through the database. You can:
1. Add new entries to the CSV file and run migration
2. Use database tools to add posts directly
3. Implement an admin interface (future feature)

### Modifying Styles
Edit `src/css/styles.css` and run `npm run build` to update the deployed version.

### Adding New Pages
1. Create HTML file in `src/html/`
2. Create corresponding JS file in `src/js/`
3. Update the build script if needed
4. Run `npm run build`

## 🚀 Deployment

The project is configured for Netlify deployment:

1. **Automatic deployment** - Push to main branch
2. **Manual deployment** - Run `npm run deploy`

The build process copies all source files to the `dist/` directory in the structure expected by Netlify.

## 📊 Author Management

Authors are stored with readable names in the database:
- **Ella Jiang** - 1 post
- **Elaine Ruan** - 10 posts

Use the author update scripts in the `scripts/` directory to manage author information.

## 🛠️ Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check your environment variables
   - Ensure Neon database is accessible
   - Try using the unpooled connection string

2. **Build failures**
   - Run `npm install` to ensure dependencies are installed
   - Check file paths in the build script

3. **Deployment issues**
   - Ensure `dist/` directory is properly built
   - Check Netlify function logs for errors

## 📄 License

MIT License - see LICENSE file for details. 