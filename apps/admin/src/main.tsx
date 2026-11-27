import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadPublicPosts, type PublicPost } from '@lost-found/public-feed';
import './style.css';

function Admin() {
  const [posts, setPosts] = useState<PublicPost[]>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    loadPublicPosts(import.meta.env.VITE_GATEWAY_URL, request.signal)
      .then(setPosts)
      .catch((reason: unknown) => {
        if (!request.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Không thể kết nối Gateway.');
        }
      });
    return () => request.abort();
  }, [attempt]);

  return (
    <>
      <header><div className="shell">Campus Lost &amp; Found <span>Admin</span></div></header>
      <main className="shell">
        <h1>Bảng tin công khai</h1>
        {error ? (
          <section className="notice">
            <p role="alert">Không tải được bảng tin. {error}</p>
            <button type="button" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Thử lại</button>
          </section>
        ) : !posts ? (
          <p role="status">Đang tải bảng tin…</p>
        ) : posts.length === 0 ? (
          <p>Chưa có bài đăng công khai.</p>
        ) : (
          <ul className="posts">
            {posts.map((post) => (
              <li key={post.postId}>
                <article>
                  <div className="type">{post.type === 'found' ? 'Tìm thấy' : 'Thất lạc'}</div>
                  <div>
                    <h2>{post.title}</h2>
                    <p>{post.description}</p>
                  </div>
                  <p className="id">{post.postId}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Admin />);
