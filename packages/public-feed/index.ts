import type { operations } from './openapi.generated';

type PublicPostPage = operations['listPublicPosts']['responses'][200]['content']['application/json'];
export type PublicPost = PublicPostPage['items'][number];

export async function loadPublicPosts(gatewayUrl: string | undefined, signal: AbortSignal) {
  const origin = gatewayUrl?.trim().replace(/\/+$/, '');
  if (!origin || !/^https:\/\/[^/?#@]+$/i.test(origin)) {
    throw new Error('Cấu hình địa chỉ HTTPS của Gateway trước khi tải bảng tin.');
  }

  const response = await fetch(`${origin}/api/v1/posts`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Gateway trả về HTTP ${response.status}.`);
  }

  const page: PublicPostPage = await response.json();
  if (!Array.isArray(page?.items)) {
    throw new Error('Gateway trả về dữ liệu bảng tin không hợp lệ.');
  }
  return page.items;
}
