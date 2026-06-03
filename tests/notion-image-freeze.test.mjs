import test from 'node:test';
import assert from 'node:assert/strict';
import {
  imageManifestKey,
  localImagePathForFile,
  localImagesForPage,
} from '../scripts/notion-image-freeze.mjs';

test('uses page property and file position instead of expiring Notion URLs for image identity', () => {
  const firstUrl = 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/a.jpg?X-Amz-Signature=old';
  const refreshedUrl = 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/a.jpg?X-Amz-Signature=new';

  const first = imageManifestKey({
    pageId: 'page-123',
    propertyName: 'Thumbnail Preview',
    index: 0,
    url: firstUrl,
  });
  const refreshed = imageManifestKey({
    pageId: 'page-123',
    propertyName: 'Thumbnail Preview',
    index: 0,
    url: refreshedUrl,
  });

  assert.equal(first, 'page-123:Thumbnail Preview:0');
  assert.equal(refreshed, first);
});

test('creates stable ASCII local image paths from Notion page identity and content type', () => {
  assert.equal(
    localImagePathForFile({
      pageId: 'Page ABC',
      propertyName: '缩略图预览',
      index: 2,
      contentType: 'image/webp',
    }),
    'images/page_abc-thumbnail_preview-2.webp',
  );
});

test('returns only existing manifest images for a page in file order', () => {
  const manifest = {
    images: {
      'page-1:Thumbnail Preview:1': {
        notionPageId: 'page-1',
        propertyName: 'Thumbnail Preview',
        index: 1,
        localPath: 'images/page-1-thumbnail-1.png',
      },
      'page-1:Thumbnail Preview:0': {
        notionPageId: 'page-1',
        propertyName: 'Thumbnail Preview',
        index: 0,
        localPath: 'images/page-1-thumbnail-0.jpg',
      },
      'page-2:Thumbnail Preview:0': {
        notionPageId: 'page-2',
        propertyName: 'Thumbnail Preview',
        index: 0,
        localPath: 'images/page-2-thumbnail-0.jpg',
      },
    },
  };

  assert.deepEqual(localImagesForPage(manifest, 'page-1', 'Thumbnail Preview'), [
    'images/page-1-thumbnail-0.jpg',
    'images/page-1-thumbnail-1.png',
  ]);
});
