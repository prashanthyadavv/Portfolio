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
  const branch = process.env.GITHUB_BRANCH || 'main'; // Change to master if needed

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ error: 'Vercel Environment Variables missing for GitHub API.' });
  }

  // Create unique filename to prevent overwrite
  const timestamp = Date.now();
  const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const filePath = `images/uploads/${timestamp}-${safeFilename}`;

  try {
    // Strip the "data:image/png;base64," URI prefix to upload clean binary
    const b64String = base64Data.split(',')[1];

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
