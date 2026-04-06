export default async function handler(req, res) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const passwordExists = Boolean(configuredPassword && configuredPassword.trim() !== '');

  if (req.method === 'GET') {
    return res.status(200).json({ passwordExists });
  }

  if (req.method === 'POST') {
    // 🛡️ Security Hardening: Artificial delay (300-800ms) to mitigate brute force timing attacks
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ valid: false, error: 'Missing Authorization header' });
    }

    if (authHeader === `Bearer ${configuredPassword}`) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(401).json({ valid: false, error: 'Unauthorized' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
