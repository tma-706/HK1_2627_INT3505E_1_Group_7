INSERT INTO public.posts (
    post_id, type, title, description, category_id, area_id, occurred_at, published_at,
    status, visibility, author_display_name, share_url, custody
) VALUES
    ('fixture-found-keys', 'found', 'Chìa khóa ở thư viện', 'Tìm thấy chùm chìa khóa gần thư viện.', 'keys', 'library',
     '2026-11-26T07:00:00Z', '2026-11-26T08:00:00Z', 'open', 'visible', 'Minh',
     'https://example.test/posts/fixture-found-keys', 'heldByFinder'),
    ('fixture-lost-wallet', 'lost', 'Ví vải màu xanh', 'Thất lạc ví vải màu xanh gần nhà thi đấu.', 'wallets', 'gym',
     '2026-11-25T07:00:00Z', '2026-11-25T08:00:00Z', 'open', 'visible', 'Lan',
     'https://example.test/posts/fixture-lost-wallet', NULL),
    ('fixture-hidden-keys', 'found', 'Chìa khóa chờ kiểm duyệt', 'Bài mẫu này đã bị ẩn khỏi bảng tin.', 'keys', 'library',
     '2026-11-27T07:00:00Z', '2026-11-27T08:00:00Z', 'open', 'hidden', 'Minh',
     'https://example.test/posts/fixture-hidden-keys', 'heldByFinder')
ON CONFLICT (post_id) DO NOTHING;
