import { Router } from 'express'
import { getSupabaseAdmin } from './supabase'
import { pool, createUser, getUserData } from './db'
import { UserId } from './types'

const router = Router()

router.post('/signup', async (req, res) => {
  console.log('Signup request received:', { email: req.body?.email, name: req.body?.name })
  
  const { email, password, name, is_clinician } = req.body

  if (!email || !password || !name) {
    console.log('Missing required fields')
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
    console.log('Supabase admin client created')
  } catch (e) {
    console.error('Failed to create Supabase client:', e)
    res.status(500).json({ error: `Supabase config error: ${e}` })
    return
  }

  try {
    console.log('Creating auth user...')
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for simplicity
    })

    if (authError) {
      console.error('Auth error:', authError)
      res.status(400).json({ error: authError.message })
      return
    }

    if (!authData.user) {
      console.error('No user in authData')
      res.status(500).json({ error: 'Failed to create user' })
      return
    }

    console.log('Auth user created:', authData.user.id)

    // Insert into users table with the same ID as auth user
    console.log('Creating user in database...')
    await createUser(email, name, is_clinician ?? false, authData.user.id)
    console.log('User created in database')

    res.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: String(error) })
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
    const userData = await getUserData(UserId.create(data.user.id))

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
