# Showrganizer

A web app for standup comedians to write, organize, and manage jokes and shows.

**Features:**
- Write and manage jokes with category, tags, rating, and status
- Show editor with drag-and-drop joke blocks and free text blocks
- Import jokes from `.docx` or `.txt` files
- Export shows to PDF
- Multi-user: each Google account gets its own isolated data
- Data stored in Google Sheets (no database required)
- Light/dark mode

**Stack:** PHP 7.4+, vanilla JS, Google OAuth 2.0, Google Sheets API v4

---

## Requirements

- PHP 7.4 or higher with extensions: `curl`, `zip`, `json`, `session`
- A web server with `mod_rewrite` enabled (Apache/Ionos/cPanel)
- A Google account to create the OAuth app

---

## Setup

### 1. Upload the code

Upload all files to your server's public directory (e.g. `public_html/`).

Make sure the `data/` directory is writable by the web server:

```bash
chmod 750 data/
```

---

### 2. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "Showrganizer")
3. Go to **APIs & Services → Library** and enable:
   - **Google Sheets API**
   - **Google Drive API**

---

### 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External**
3. Fill in app name, support email, and developer contact email
4. On the **Scopes** step, add:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `openid`
5. Save and continue

> **Note:** While in "Testing" mode only manually added users can log in. To open it to everyone go to **OAuth consent screen → Publish app**. Users will see an "unverified app" warning but can still proceed.

---

### 4. Create OAuth credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Add to **Authorized redirect URIs**:
   ```
   https://yourdomain.com/oauth_callback.php
   ```
4. Add to **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   ```
5. Click **Create** and copy the **Client ID** and **Client Secret**

---

### 5. Configure the app

Copy the example config:

```bash
cp includes/config.example.php includes/config.php
```

Edit `includes/config.php` with your values:

```php
define('GOOGLE_CLIENT_ID',     'YOUR_CLIENT_ID.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'YOUR_CLIENT_SECRET');
define('GOOGLE_REDIRECT_URI',  'https://yourdomain.com/oauth_callback.php');
```

If the app lives in a subdirectory (e.g. `yourdomain.com/showrganizer/`), also set:

```php
define('BASE_URL', '/showrganizer');
```

---

### 6. Done

Visit your domain and log in with Google. On first login the app automatically creates a **Showrganizer** spreadsheet in your Google Drive with all required sheets. Each user gets their own spreadsheet.

---

## Data storage

- `data/users/{hash}/tokens.json` — OAuth tokens (never exposed, protected by `.htaccess`)
- `data/users/{hash}/drive_config.json` — spreadsheet ID per user
- Google Sheets — jokes, shows, categories, and tags

---

## License

MIT
