const API_URL = ''

interface LoginResponse {
  message: string
  user: {
    id: string
    email: string
    name: string
    is_clinician: boolean
  }
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

interface SignupResponse {
  message: string
  user: {
    id: string
    email: string
  }
}

interface UserResponse {
  user: {
    id: string
    email: string
    name: string
    is_clinician: boolean
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Login failed')
  }

  // Store the token
  localStorage.setItem('access_token', data.session.access_token)
  localStorage.setItem('refresh_token', data.session.refresh_token)
  
  return data
}

export async function signup(
  email: string,
  password: string,
  name: string,
  is_clinician: boolean
): Promise<SignupResponse> {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, is_clinician }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Signup failed')
  }

  return data
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('access_token')
  
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export async function getCurrentUser(): Promise<UserResponse | null> {
  const token = localStorage.getItem('access_token')
  
  if (!token) {
    return null
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function getUserById(userId: string): Promise<{ id: string; name: string; email: string; is_clinician: boolean } | null> {
  try {
    const response = await fetch(`${API_URL}/debug/user?uuid=${encodeURIComponent(userId)}`)

    if (!response.ok) {
      console.error('[getUserById] Failed with status:', response.status)
      return null
    }

    const data = await response.json()
    console.log('[getUserById] Response for', userId, ':', data)
    return data
  } catch (error) {
    console.error('[getUserById] Error:', error)
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}
