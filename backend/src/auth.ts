import { Router } from 'express'
import { getSupabaseAdmin } from './supabase'
import { pool } from './db'

const router = Router()

router.post('/signup', async (req, res) => {
  const { email, password, name, is_clinician } = req.body

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }

  const supabase = getSupabaseAdmin()

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for simplicity
    })

    if (authError) {
      res.status(400).json({ error: authError.message })
      return
    }

    if (!authData.user) {
      res.status(500).json({ error: 'Failed to create user' })
      return
    }

    // Insert into users table
    await pool.query(
      'INSERT INTO users (id, email, name, is_clinician) VALUES ($1, $2, $3, $4)',
      [authData.user.id, email, name, is_clinician ?? false]
    )

    res.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'An unexpected error occurred' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const supabase = getSupabaseAdmin()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      res.status(401).json({ error: error.message })
      return
    }

    // Get user data from users table
    const userResult = await pool.query(
      'SELECT id, email, name, is_clinician FROM users WHERE id = $1',
      [data.user.id]
    )

    const userData = userResult.rows[0]

    res.json({
      message: 'Login successful',
      user: userData,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'An unexpected error occurred' })
  }
})

router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.split(' ')[1]
  const supabase = getSupabaseAdmin()

  try {
    // Sign out the user by invalidating their session
    await supabase.auth.admin.signOut(token)
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'An unexpected error occurred' })
  }
})

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.split(' ')[1]
  const supabase = getSupabaseAdmin()

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const userResult = await pool.query(
      'SELECT id, email, name, is_clinician FROM users WHERE id = $1',
      [user.id]
    )

    const userData = userResult.rows[0]
    
    if (!userData) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ user: userData })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'An unexpected error occurred' })
  }
})

export default router
