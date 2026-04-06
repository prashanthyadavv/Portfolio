import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Secure Authorization check
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized Access. Invalid Password.' });
  }

  const { filename, base64Data } = req.body;
  if (!filename || !base64Data) return res.status(400).json({ error: 'Missing image payload' });
  
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_PAT;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ error: 'Vercel Environment Variables missing for GitHub API.' });
  }

  // 🔴 Security Fix: Validate Base64 payload and MIME type
  const b64Parts = base64Data.split(',');
  if (b64Parts.length !== 2) {
    return res.status(400).json({ error: 'Malformed base64 payload' });
  }

  const mimeMatch = b64Parts[0].match(/data:(image\/(png|jpeg|jpg|webp));base64/i);
  if (!mimeMatch) {
    return res.status(400).json({ error: 'Invalid or unsupported image type. Only PNG, JPG, and WEBP are allowed.' });
  }

  // 🔴 Security Fix: Restrict to safe extensions
  const originalExt = path.extname(filename).toLowerCase();
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  
  if (!allowedExtensions.includes(originalExt)) {
    return res.status(400).json({ error: 'Invalid file extension. Only PNG, JPG, and WEBP are allowed.' });
  }

  const baseFilename = path.basename(filename, originalExt).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const timestamp = Date.now();
  const safeFilename = `${baseFilename}${originalExt}`;
  const filePath = `images/uploads/${timestamp}-${safeFilename}`;

  try {
    // Extract clean binary string
    const b64String = b64Parts[1];

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CMS-Proxy'
      },
      body: JSON.stringify({
        message: `CMS: Uploaded Image ${safeFilename}`,
        content: b64String,
        branch
      })
    });

    if (!putRes.ok) throw new Error(await putRes.text());
    
    // Return relative path to be inserted into JSON 
    res.status(200).json({ success: true, path: filePath });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
