DOMZOR COMMUNITY FEATURES - SETUP

This package adds:
- customer reviews with 1-5 stars
- before and after photo uploads
- moderation: all submissions start as pending
- public display of approved reviews/projects
- private admin page at /admin.html
- administrator replies
- PWA files

REQUIRED SUPABASE SETUP
1. Create a free Supabase project.
2. Open SQL Editor and run supabase-setup.sql.
3. Go to Project Settings > API and copy the Project URL and anon/public key.
4. Paste them into supabase-config.js.
5. In Authentication > Users, create your administrator login.
6. Copy that user's UUID and run:
   insert into public.admins(user_id) values ('YOUR_USER_UUID');
7. Upload every file in this package to the root of your GitHub repository, preserving the assets folder.
8. Visit /admin.html to approve submissions.

SECURITY
- Photos are limited to JPG, PNG or WebP and 8 MB each.
- Public visitors can only insert pending submissions.
- Only approved submissions appear publicly.
- Only an authenticated account listed in the admins table can approve, reject, reply or delete.

IMPORTANT
The Supabase anon key is designed to be public in browser applications. Security is enforced by Row Level Security policies. Never place a Supabase service-role key in these files.
