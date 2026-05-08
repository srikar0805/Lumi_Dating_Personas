const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(u) {
  return { id: u._id, name: u.name, email: u.email, city: u.city || '', state: u.state || '' };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, city, state } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, passwordHash,
      city: (city || '').trim(),
      state: (state || '').trim(),
    });
    const token = signToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(user));
};

exports.updateMe = async (req, res) => {
  try {
    const { name, city, state, password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof city === 'string') user.city = city.trim();
    if (typeof state === 'string') user.state = state.trim();

    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
