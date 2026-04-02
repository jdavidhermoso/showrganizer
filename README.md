# Showrganizer

A web app for standup comedians to write, organize, and manage jokes and shows.

**Features:**
- Write and manage jokes with category, tags, rating, and status
- Show editor with drag-and-drop joke blocks and free text blocks
- Import jokes from `.docx` or `.txt` files
- Export shows to PDF
- Multi-user: each account gets its own isolated data
- Light/dark mode
- Available in English, Spanish, and German

**Stack:** PHP 7.4+, MySQL, vanilla JS — no external dependencies

---

## Requirements

- PHP 7.4 or higher with extensions: `pdo`, `pdo_mysql`, `zip`, `json`, `session`
- MySQL 5.7+ or MariaDB 10.3+
- A web server with `mod_rewrite` enabled (Apache / cPanel / Ionos)

---

## Setup

### 1. Upload the code

Upload all files to your server's public directory (e.g. `public_html/`).

---

### 2. Create the database

In phpMyAdmin (or your hosting panel), create a new database and user, then import `schema.sql`:

```
phpMyAdmin → select your database → Import → schema.sql
```

---

### 3. Configure the app

Copy the example config and fill in your database credentials:

```bash
cp includes/config.example.php includes/config.php
```

Edit `includes/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_user');
define('DB_PASS', 'your_password');
```

If the app lives in a subdirectory (e.g. `yourdomain.com/showrganizer/`), also set:

```php
define('BASE_URL', '/showrganizer');
```

---

### 4. Done

Visit your domain, go to `/register.php` to create your account, and start adding jokes.

---

## Data storage

All data is stored in your own MySQL database. Tables: `users`, `chistes`, `shows`, `bloques`, `categorias`, `tags`.

The `includes/config.php` file is excluded from version control via `.gitignore` — never commit it.

---

## License

MIT
