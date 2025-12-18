import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../public/uploads/videos');
const avatarsDir = path.join(__dirname, '../public/uploads/avatars');
const documentsDir = path.join(__dirname, '../public/uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// POST /api/upload/video - Upload a video file
router.post('/video', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    // For Bun, we handle multipart/form-data manually
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse the boundary from content-type header
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found in multipart request' });
    }

    // Collect body chunks
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const boundary = '--' + boundaryMatch[1];

    // Find the file content
    const bodyStr = body.toString('latin1');
    const parts = bodyStr.split(boundary);

    for (const part of parts) {
      if (part.includes('filename=')) {
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;

        const originalFilename = filenameMatch[1];
        const ext = path.extname(originalFilename).toLowerCase();

        // Validate extension
        const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'Invalid file type. Allowed: mp4, webm, mov, avi, mkv'
          });
        }

        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(uploadsDir, uniqueFilename);

        // Extract file content (after the double CRLF)
        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;

        const fileContentStart = headerEndIndex + 4;
        const fileContent = part.slice(fileContentStart).replace(/\r\n--$/, '');

        // Write file
        fs.writeFileSync(filepath, Buffer.from(fileContent, 'latin1'));

        // Return URL
        const videoUrl = `/uploads/videos/${uniqueFilename}`;
        return res.json({
          success: true,
          url: `http://localhost:3001${videoUrl}`,
          filename: uniqueFilename
        });
      }
    }

    res.status(400).json({ error: 'No video file found in request' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// POST /api/upload/avatar - Upload a profile photo
router.post('/avatar', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found in multipart request' });
    }

    // Collect body chunks
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const boundary = '--' + boundaryMatch[1];

    // Find the file content
    const bodyStr = body.toString('latin1');
    const parts = bodyStr.split(boundary);

    for (const part of parts) {
      if (part.includes('filename=')) {
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;

        const originalFilename = filenameMatch[1];
        const ext = path.extname(originalFilename).toLowerCase();

        // Validate extension (images only)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp'
          });
        }

        // Generate unique filename with user ID
        const userId = req.user?.userId;
        const uniqueFilename = `${userId}-${Date.now()}${ext}`;
        const filepath = path.join(avatarsDir, uniqueFilename);

        // Extract file content
        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;

        const fileContentStart = headerEndIndex + 4;
        const fileContent = part.slice(fileContentStart).replace(/\r\n--$/, '');

        // Delete old avatar if exists
        const user = await User.findById(userId);
        if (user?.avatarUrl) {
          const oldFilename = user.avatarUrl.split('/').pop();
          if (oldFilename) {
            const oldFilepath = path.join(avatarsDir, oldFilename);
            if (fs.existsSync(oldFilepath)) {
              fs.unlinkSync(oldFilepath);
            }
          }
        }

        // Write file
        fs.writeFileSync(filepath, Buffer.from(fileContent, 'latin1'));

        // Update user's avatarUrl
        const avatarUrl = `http://localhost:3001/uploads/avatars/${uniqueFilename}`;
        await User.findByIdAndUpdate(userId, { avatarUrl });

        return res.json({
          success: true,
          url: avatarUrl,
          filename: uniqueFilename
        });
      }
    }

    res.status(400).json({ error: 'No image file found in request' });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// POST /api/upload/document - Upload a PDF/document file
router.post('/document', authenticateToken, requireRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found in multipart request' });
    }

    // Collect body chunks
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const boundary = '--' + boundaryMatch[1];

    // Find the file content
    const bodyStr = body.toString('latin1');
    const parts = bodyStr.split(boundary);

    for (const part of parts) {
      if (part.includes('filename=')) {
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;

        const originalFilename = filenameMatch[1];
        const ext = path.extname(originalFilename).toLowerCase();

        // Validate extension (documents only)
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'Invalid file type. Allowed: pdf, doc, docx, ppt, pptx, xls, xlsx'
          });
        }

        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(documentsDir, uniqueFilename);

        // Extract file content
        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;

        const fileContentStart = headerEndIndex + 4;
        const fileContent = part.slice(fileContentStart).replace(/\r\n--$/, '');

        // Write file
        fs.writeFileSync(filepath, Buffer.from(fileContent, 'latin1'));

        // Return URL
        const documentUrl = `http://localhost:3001/uploads/documents/${uniqueFilename}`;
        return res.json({
          success: true,
          url: documentUrl,
          filename: uniqueFilename,
          originalName: originalFilename,
          type: ext.replace('.', '').toUpperCase()
        });
      }
    }

    res.status(400).json({ error: 'No document file found in request' });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

export default router;


