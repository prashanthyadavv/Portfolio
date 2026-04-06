import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. Secure Authentication via ENV
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized Access. Invalid Password.' });
  }

  // 2. Validate Payload
  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content payload' });

  const githubToken = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !owner || !repo) {
    return res.status(500).json({ error: 'Vercel Environment Variables missing for GitHub API.' });
  }

  try {
    // 🔴 Security Fix: Prevent Path Traversal by stripping directory paths
    const safeFilename = path.basename(filename);
    const filePath = `content/${safeFilename}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    // Check if file exists to get current SHA (required by GitHub API for updates)
    const getRes = await fetch(`${url}?ref=${branch}`, {
      headers: { 'Authorization': `Bearer ${githubToken}`, 'User-Agent': 'CMS-Proxy' }
    });

    let sha = null;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // Push Update to GitHub
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CMS-Proxy'
      },
      body: JSON.stringify({
        message: `CMS Update: ${filename}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        branch,
        sha
      })
    });

    if (!putRes.ok) throw new Error(await putRes.text());
    res.status(200).json({ success: true, message: `Successfully updated ${filename}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
