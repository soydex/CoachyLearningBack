import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// SECURITY: File size limits in bytes
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB  
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

// SECURITY: Magic bytes for file type validation
const MAGIC_BYTES: { [key: string]: number[][] } = {
  // Videos
  '.mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]], // ftyp at offset 4
  '.webm': [[0x1A, 0x45, 0xDF, 0xA3]],
  '.mov': [[0x00, 0x00, 0x00]], // Similar to mp4
  '.avi': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  '.mkv': [[0x1A, 0x45, 0xDF, 0xA3]],
  // Images
  '.jpg': [[0xFF, 0xD8, 0xFF]],
  '.jpeg': [[0xFF, 0xD8, 0xFF]],
  '.png': [[0x89, 0x50, 0x4E, 0x47]],
  '.gif': [[0x47, 0x49, 0x46]],
  '.webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  // Documents
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.doc': [[0xD0, 0xCF, 0x11, 0xE0]],
  '.docx': [[0x50, 0x4B, 0x03, 0x04]], // ZIP
  '.ppt': [[0xD0, 0xCF, 0x11, 0xE0]],
  '.pptx': [[0x50, 0x4B, 0x03, 0x04]], // ZIP
  '.xls': [[0xD0, 0xCF, 0x11, 0xE0]],
  '.xlsx': [[0x50, 0x4B, 0x03, 0x04]], // ZIP
};

// Helper to validate magic bytes
function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext.toLowerCase()];
  if (!signatures) return true; // No signature to check

  for (const sig of signatures) {
    // Check if buffer starts with this signature (allow offset for mp4/mov)
    const isMatch = sig.every((byte, index) => {
      // For mp4/mov, signature is at offset 4
      const offset = (ext === '.mp4' || ext === '.mov') && sig.length === 4 && sig[0] === 0x66 ? 4 : 0;
      return buffer[index + offset] === byte;
    });
    if (isMatch) return true;
  }
  return false;
}

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

    // Collect body chunks with size limit
    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of req as any) {
      totalSize += chunk.length;
      if (totalSize > MAX_VIDEO_SIZE) {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB` });
      }
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

        // SECURITY: Validate magic bytes
        const fileBuffer = Buffer.from(fileContent, 'latin1');
        if (!validateMagicBytes(fileBuffer, ext)) {
          return res.status(400).json({ error: 'File content does not match expected format' });
        }

        // Write file
        fs.writeFileSync(filepath, fileBuffer);

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

    // Collect body chunks with size limit
    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of req as any) {
      totalSize += chunk.length;
      if (totalSize > MAX_AVATAR_SIZE) {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_AVATAR_SIZE / 1024 / 1024}MB` });
      }
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

        // SECURITY: Validate magic bytes
        const fileBuffer = Buffer.from(fileContent, 'latin1');
        if (!validateMagicBytes(fileBuffer, ext)) {
          return res.status(400).json({ error: 'File content does not match expected image format' });
        }

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
        fs.writeFileSync(filepath, fileBuffer);

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

    // Collect body chunks with size limit
    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of req as any) {
      totalSize += chunk.length;
      if (totalSize > MAX_DOCUMENT_SIZE) {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB` });
      }
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

        // SECURITY: Validate magic bytes
        const fileBuffer = Buffer.from(fileContent, 'latin1');
        if (!validateMagicBytes(fileBuffer, ext)) {
          return res.status(400).json({ error: 'File content does not match expected document format' });
        }

        // Write file
        fs.writeFileSync(filepath, fileBuffer);

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


