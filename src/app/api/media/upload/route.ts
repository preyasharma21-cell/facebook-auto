import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';
import { mediaProcessor } from '@/lib/ffmpeg';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const folderMappingRaw = formData.get('folderMapping') as string;
    const destinationPageId = formData.get('destinationPageId') as string;
    const defaultCaption = (formData.get('caption') as string) || '';
    const defaultHashtags = (formData.get('hashtags') as string) || '';
    const sourceType = (formData.get('sourceType') as string) || 'LOCAL_UPLOAD';

    let folderMapping: Record<string, string> = {};
    if (folderMappingRaw) {
      try {
        folderMapping = JSON.parse(folderMappingRaw);
      } catch {}
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedAssets = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadDir, safeFilename);

      fs.writeFileSync(filePath, buffer);

      // Determine destination page from folder mapping or fallback
      // file.name may be a relative path if uploaded via webkitdirectory (e.g. "Page-A/clip.mp4")
      const pathParts = file.name.split('/');
      let assignedPageId = destinationPageId;
      if (pathParts.length > 1) {
        const rootFolder = pathParts[0];
        if (folderMapping[rootFolder]) {
          assignedPageId = folderMapping[rootFolder];
        }
      }

      // Generate thumbnail
      const thumbFilename = `thumb_${safeFilename}.jpg`;
      const thumbPath = path.join(uploadDir, thumbFilename);
      let finalThumbUrl = `/api/media/stream?file=${thumbFilename}`;

      const generatedThumb = await mediaProcessor.generateThumbnail(filePath, thumbPath, 1);
      if (!generatedThumb) {
        // High quality fallback thumbnail
        finalThumbUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
      }

      // Auto-extract caption from filename clean text
      const cleanTitle = path.basename(file.name, path.extname(file.name)).replace(/[_-]/g, ' ');
      const caption = defaultCaption ? defaultCaption.replace('{filename}', cleanTitle) : cleanTitle;

      const asset = db.createMediaAsset({
        userId: auth.user.id,
        filename: path.basename(file.name),
        filePath: `uploads/${safeFilename}`,
        thumbnailPath: finalThumbUrl,
        fileSize: file.size,
        duration: 35.0, // default estimate or probe
        resolution: '1080x1920',
        aspectRatio: '9:16',
        fps: 30,
        sourceType: sourceType as any,
        captionDefault: caption,
        hashtagsDefault: defaultHashtags || '#reels #viral #video',
        status: 'READY',
      });

      uploadedAssets.push(asset);

      // If mapped to a page, also add to that page's queue
      if (assignedPageId) {
        const targetPage = db.getPageById(assignedPageId);
        if (targetPage) {
          const now = new Date();
          const scheduledDate = new Date(now.getTime() + (uploadedAssets.length * 3600000));

          db.createPostingJob({
            userId: auth.user.id,
            queueId: `queue-${targetPage.id}`,
            pageId: targetPage.id,
            mediaId: asset.id,
            caption: asset.captionDefault,
            hashtags: asset.hashtagsDefault,
            position: 1,
            scheduledFor: scheduledDate.toISOString(),
            status: 'QUEUED',
            retryCount: 0,
            maxRetries: 3,
            lastError: null,
          });

          logEvent('SUCCESS', 'SCHEDULER', `Auto-queued "${asset.filename}" to Page: "${targetPage.pageName}"`);
        }
      }

      logEvent('SUCCESS', 'UPLOAD', `Uploaded video asset: ${asset.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }

    return NextResponse.json({
      success: true,
      count: uploadedAssets.length,
      assets: uploadedAssets,
    });
  } catch (err: any) {
    logEvent('ERROR', 'UPLOAD', `Upload failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
